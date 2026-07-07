import Stripe from 'stripe'
import { logger } from './logger.js'

// Per-shop subscription billing.
//
// Subscriptions are structured as two items so shop count changes are a
// quantity update, not a new checkout:
//   - founding_base:            $100/mo, quantity 1 (first shop)
//   - founding_additional_shop:  $50/mo, quantity = shops - 1
//
// Prices are provisioned lazily in Stripe and found via lookup_key, so no
// dashboard setup or env vars are needed.

const BASE_LOOKUP = 'founding_base'
const ADDITIONAL_LOOKUP = 'founding_additional_shop'
const BASE_AMOUNT = 10000      // $100 in cents
const ADDITIONAL_AMOUNT = 5000 // $50 in cents

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)

async function findOrCreatePrice(lookupKey, productName, unitAmount) {
  const existing = await stripe.prices.list({ lookup_keys: [lookupKey], limit: 1 })
  if (existing.data[0]) return existing.data[0]
  const product = await stripe.products.create({ name: productName })
  return stripe.prices.create({
    product: product.id,
    currency: 'usd',
    unit_amount: unitAmount,
    recurring: { interval: 'month' },
    lookup_key: lookupKey,
  })
}

export async function getFoundingPrices() {
  const [base, additional] = await Promise.all([
    findOrCreatePrice(BASE_LOOKUP, 'ShopCommand Founding Member — First Shop', BASE_AMOUNT),
    findOrCreatePrice(ADDITIONAL_LOOKUP, 'ShopCommand Founding Member — Additional Shop', ADDITIONAL_AMOUNT),
  ])
  return { base, additional }
}

/**
 * Sync the org's Stripe subscription to its current shop count.
 * Called after a shop is added or removed.
 *
 * - adding a shop  → prorated charge now (create_prorations)
 * - removing a shop → amount just drops at next renewal (none); no refund
 *   mechanics, no gaming by removing/re-adding mid-cycle
 * - trialing subs update quantity without charging (sets post-trial amount)
 * - legacy single-lump-sum subscriptions are migrated to the two-item
 *   structure on first sync
 *
 * Never throws — billing drift is logged and surfaced, but a shop owner's
 * operations are never blocked on a Stripe hiccup.
 *
 * @returns {Promise<{monthlyTotal:number, shopCount:number}|null>}
 *   null when the org has no active subscription (e.g. still in pilot).
 */
export async function syncShopBilling(sql, orgId, { adding = true } = {}) {
  try {
    const [org] = await sql`
      SELECT stripe_subscription_id FROM organizations WHERE id = ${orgId}
    `
    if (!org?.stripe_subscription_id) return null

    const [{ count: shopCount }] = await sql`
      SELECT GREATEST(COUNT(*), 1)::int AS count FROM shops WHERE org_id = ${orgId}
    `
    const targetQty = shopCount - 1
    const proration = adding ? 'create_prorations' : 'none'

    const sub = await stripe.subscriptions.retrieve(org.stripe_subscription_id)
    if (!['active', 'trialing', 'past_due'].includes(sub.status)) return null

    const { base, additional } = await getFoundingPrices()
    const baseItem = sub.items.data.find(i => i.price.lookup_key === BASE_LOOKUP)
    const addlItem = sub.items.data.find(i => i.price.lookup_key === ADDITIONAL_LOOKUP)

    if (!baseItem) {
      // Legacy lump-sum subscription — replace its single item with the
      // two-item structure in one update (keeps the sub, no new checkout).
      const legacyItem = sub.items.data[0]
      await stripe.subscriptions.update(sub.id, {
        items: [
          { id: legacyItem.id, deleted: true },
          { price: base.id, quantity: 1 },
          ...(targetQty > 0 ? [{ price: additional.id, quantity: targetQty }] : []),
        ],
        proration_behavior: proration,
      })
    } else if (addlItem) {
      if (targetQty === 0) {
        await stripe.subscriptionItems.del(addlItem.id, { proration_behavior: proration })
      } else if (addlItem.quantity !== targetQty) {
        await stripe.subscriptionItems.update(addlItem.id, {
          quantity: targetQty,
          proration_behavior: proration,
        })
      }
    } else if (targetQty > 0) {
      await stripe.subscriptionItems.create({
        subscription: sub.id,
        price: additional.id,
        quantity: targetQty,
        proration_behavior: proration,
      })
    }

    return {
      monthlyTotal: (BASE_AMOUNT + targetQty * ADDITIONAL_AMOUNT) / 100,
      shopCount,
    }
  } catch (err) {
    logger.error('Shop billing sync failed', { orgId, error: err.message })
    return { error: true }
  }
}
