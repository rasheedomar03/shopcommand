import Stripe from 'stripe'
import { neon } from '@neondatabase/serverless'
import { authenticate, setRlsContext } from './_lib/auth.js'
import { rateLimit } from './_lib/rate-limit.js'
import { logger } from './_lib/logger.js'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)
const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET

const FOUNDING_PRICE_AMOUNT = 10000 // $100 in cents (first shop — additional shops are $50/mo = 5000 cents each)
const FOUNDING_ADDITIONAL_SHOP = 5000 // $50 in cents per additional shop
const PRODUCT_NAME = 'ShopCommand Founding Member'

// ── Helpers ─────────────────────────────────────────────────────────────────

async function buffer(readable) {
  const chunks = []
  for await (const chunk of readable) {
    chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk)
  }
  return Buffer.concat(chunks)
}

// ── Checkout: POST /api/stripe?action=checkout ──────────────────────────────

async function handleCheckout(req, res, user) {
  const { successUrl, cancelUrl } = req.body || {}
  if (!successUrl || !cancelUrl) {
    return res.status(400).json({ error: 'successUrl and cancelUrl are required' })
  }

  try {
    const existing = await stripe.customers.list({ email: user.email, limit: 1 })
    let customerId
    if (existing.data.length > 0) {
      customerId = existing.data[0].id
    } else {
      const customer = await stripe.customers.create({
        email: user.email,
        name: user.name,
        metadata: { clerkId: user.clerkId, orgId: user.orgId },
      })
      customerId = customer.id
    }

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [{
        price_data: {
          currency: 'usd',
          product_data: {
            name: PRODUCT_NAME,
            description: '$100/mo first shop + $50/mo per additional shop. No per-seat fees — unlimited users. All features included. Founding rate locked forever.',
          },
          unit_amount: FOUNDING_PRICE_AMOUNT,
          recurring: { interval: 'month' },
        },
        quantity: 1,
      }],
      subscription_data: {
        trial_period_days: 14,
        metadata: { clerkId: user.clerkId, orgId: user.orgId, plan: 'founding' },
      },
      allow_promotion_codes: true,
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: { clerkId: user.clerkId, orgId: user.orgId },
    })

    return res.json({ url: session.url })
  } catch (err) {
    logger.error('Checkout session failed', { error: err.message })
    return res.status(500).json({ error: 'Failed to create checkout session' })
  }
}

// ── Billing status: GET /api/stripe?action=billing ──────────────────────────

async function handleBilling(req, res, user) {
  const sql = neon(process.env.DATABASE_URL)
  await setRlsContext(sql, user)

  const [org] = await sql`
    SELECT stripe_customer_id, stripe_subscription_id, plan
    FROM organizations WHERE id = ${user.orgId}
  `
  if (!org) return res.status(404).json({ error: 'Organization not found' })

  if (!org.stripe_subscription_id) {
    return res.json({ plan: org.plan || 'founding', status: 'no_subscription', subscription: null })
  }

  try {
    const sub = await stripe.subscriptions.retrieve(org.stripe_subscription_id)
    return res.json({
      plan: org.plan,
      status: sub.status,
      currentPeriodEnd: sub.current_period_end,
      cancelAtPeriodEnd: sub.cancel_at_period_end,
      subscription: {
        id: sub.id,
        status: sub.status,
        amount: sub.items.data[0]?.price?.unit_amount,
        interval: sub.items.data[0]?.price?.recurring?.interval,
      },
    })
  } catch {
    return res.json({ plan: org.plan, status: 'error', subscription: null })
  }
}

// ── Webhook: POST /api/stripe?action=webhook ────────────────────────────────

async function handleWebhook(req, res) {
  const buf = await buffer(req)
  const sig = req.headers['stripe-signature']

  let event
  try {
    event = endpointSecret
      ? stripe.webhooks.constructEvent(buf, sig, endpointSecret)
      : JSON.parse(buf.toString())
  } catch (err) {
    logger.warn('Stripe webhook signature failed', { error: err.message })
    return res.status(400).json({ error: 'Invalid signature' })
  }

  const sql = neon(process.env.DATABASE_URL)

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object
        const orgId = session.metadata?.orgId
        if (orgId) {
          await sql`
            UPDATE organizations
            SET plan = 'founding', stripe_customer_id = ${session.customer},
                stripe_subscription_id = ${session.subscription}, updated_at = now()
            WHERE id = ${orgId}
          `
          logger.info('Subscription activated', { orgId })
        }
        break
      }
      case 'customer.subscription.deleted': {
        const orgId = event.data.object.metadata?.orgId
        if (orgId) {
          await sql`
            UPDATE organizations
            SET plan = 'cancelled', stripe_subscription_id = NULL, updated_at = now()
            WHERE id = ${orgId}
          `
          logger.info('Subscription cancelled', { orgId })
        }
        break
      }
      case 'invoice.payment_failed': {
        logger.warn('Payment failed', { subscriptionId: event.data.object.subscription })
        break
      }
    }
  } catch (err) {
    logger.error('Webhook processing error', { type: event.type, error: err.message })
    return res.status(500).json({ error: 'Webhook processing failed' })
  }

  return res.json({ received: true })
}

// ── Router ──────────────────────────────────────────────────────────────────

export default async function handler(req, res) {
  const action = req.query?.action

  // Webhook doesn't need auth or rate limiting (Stripe calls it directly)
  if (action === 'webhook') {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })
    return handleWebhook(req, res)
  }

  // All other actions need rate limiting and auth
  if (!rateLimit(req, res)) {
    return res.status(429).json({ error: 'Too many requests' })
  }

  const user = await authenticate(req)
  if (!user) return res.status(401).json({ error: 'Unauthorized' })

  if (action === 'checkout' && req.method === 'POST') {
    return handleCheckout(req, res, user)
  }

  if (action === 'billing' && req.method === 'GET') {
    return handleBilling(req, res, user)
  }

  return res.status(400).json({ error: 'Invalid action. Use ?action=checkout, billing, or webhook' })
}
