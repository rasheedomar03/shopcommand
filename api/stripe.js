import Stripe from 'stripe'
import { neon } from '@neondatabase/serverless'
import { authenticate, setRlsContext } from './_lib/auth.js'
import { rateLimit } from './_lib/rate-limit.js'
import { logger } from './_lib/logger.js'
import { getFoundingPrices } from './_lib/billing.js'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)
const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET

// Pricing lives in _lib/billing.js: $100/mo first shop + $50/mo per additional

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
  if (user.role !== 'owner') {
    return res.status(403).json({ error: 'Only shop owners can manage billing' })
  }

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

    // Price by shop count: $100/mo first shop + $50/mo each additional.
    // Two subscription items (base + additional) so adding/removing shops
    // later is a quantity update in _lib/billing.js, not a new checkout.
    const sql = neon(process.env.DATABASE_URL)
    const [{ count: shopCount }] = await sql`
      SELECT GREATEST(COUNT(*), 1)::int AS count FROM shops WHERE org_id = ${user.orgId}
    `
    const { base, additional } = await getFoundingPrices()

    // The app trial starts at signup, so Stripe's card trial only covers
    // whatever remains of it. Expired or legacy-exempt trials get a short
    // grace so checkout never charges with zero warning mid-flow.
    let trialDays = 14
    if (user.trialEndsAt) {
      const remainingMs = new Date(user.trialEndsAt).getTime() - Date.now()
      trialDays = Math.max(0, Math.ceil(remainingMs / 86_400_000))
    }

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [
        { price: base.id, quantity: 1 },
        ...(shopCount > 1 ? [{ price: additional.id, quantity: shopCount - 1 }] : []),
      ],
      subscription_data: {
        ...(trialDays > 0 ? { trial_period_days: trialDays } : {}),
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
  if (user.role !== 'owner') {
    return res.status(403).json({ error: 'Only shop owners can view billing' })
  }

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

  const [{ count: shopCount }] = await sql`
    SELECT COUNT(*)::int AS count FROM shops WHERE org_id = ${user.orgId}
  `

  try {
    const sub = await stripe.subscriptions.retrieve(org.stripe_subscription_id)
    return res.json({
      plan: org.plan,
      status: sub.status,
      currentPeriodEnd: sub.current_period_end,
      cancelAtPeriodEnd: sub.cancel_at_period_end,
      shopCount,
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

// ── Billing portal: POST /api/stripe?action=portal ──────────────────────────

async function handlePortal(req, res, user) {
  if (user.role !== 'owner') {
    return res.status(403).json({ error: 'Only shop owners can manage billing' })
  }

  const sql = neon(process.env.DATABASE_URL)
  const [org] = await sql`
    SELECT stripe_customer_id FROM organizations WHERE id = ${user.orgId}
  `
  if (!org?.stripe_customer_id) {
    return res.status(404).json({ error: 'No billing account found for this organization. Complete checkout first.' })
  }

  try {
    const session = await stripe.billingPortal.sessions.create({
      customer: org.stripe_customer_id,
      return_url: req.body?.returnUrl || 'https://shopcommand.net/settings',
    })
    return res.json({ url: session.url })
  } catch (err) {
    logger.error('Billing portal session failed', { error: err.message })
    return res.status(500).json({ error: 'Failed to create billing portal session' })
  }
}

// ── Webhook: POST /api/stripe?action=webhook ────────────────────────────────

async function handleWebhook(req, res) {
  const buf = await buffer(req)
  const sig = req.headers['stripe-signature']

  // Hard-fail if the webhook secret isn't configured — never accept unsigned
  // events, or anyone could forge subscription changes for any org.
  if (!endpointSecret) {
    logger.error('STRIPE_WEBHOOK_SECRET is not set — rejecting webhook')
    return res.status(500).json({ error: 'Webhook not configured' })
  }

  let event
  try {
    event = stripe.webhooks.constructEvent(buf, sig, endpointSecret)
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
      case 'customer.subscription.updated': {
        // Keep the stored subscription id fresh and surface status changes
        // (past_due, cancel-at-period-end) in the logs
        const sub = event.data.object
        const orgId = sub.metadata?.orgId
        if (orgId) {
          await sql`
            UPDATE organizations
            SET stripe_subscription_id = ${sub.id}, updated_at = now()
            WHERE id = ${orgId}
          `
        }
        if (sub.status === 'past_due' || sub.status === 'unpaid') {
          logger.warn('Subscription past due', { orgId, subscriptionId: sub.id, status: sub.status })
        }
        if (sub.cancel_at_period_end) {
          logger.warn('Subscription set to cancel at period end', { orgId, subscriptionId: sub.id })
        }
        break
      }
      case 'invoice.paid': {
        const inv = event.data.object
        logger.info('Subscription payment succeeded', {
          amountPaid: inv.amount_paid,
          customer: inv.customer,
          subscriptionId: inv.subscription,
        })
        break
      }
      case 'customer.subscription.trial_will_end': {
        // Fires ~3 days before a trial ends: give the owner a heads-up email
        const sub = event.data.object
        const orgId = sub.metadata?.orgId
        if (!orgId || !process.env.RESEND_API_KEY) break
        try {
          const [owner] = await sql`
            SELECT name, email FROM users WHERE org_id = ${orgId} AND role = 'owner' AND email IS NOT NULL LIMIT 1
          `
          if (!owner?.email) break
          const endsAt = sub.trial_end
            ? new Date(sub.trial_end * 1000).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })
            : 'in a few days'
          const firstName = (owner.name || '').split(' ')[0] || 'there'
          await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              from: 'Rasheed at ShopCommand <hello@shopcommand.net>',
              to: owner.email,
              reply_to: 'rasheed@shopcommand.net',
              subject: 'Your ShopCommand trial wraps up soon',
              text: `Hey ${firstName},\n\nQuick heads up: your ShopCommand trial ends ${endsAt}. After that your founding rate kicks in automatically, $100/mo for your first shop and $50/mo for each additional location, locked for life.\n\nNothing to do if you're happy. If anything isn't working the way your shop needs, reply to this email and I'll fix it before you pay a dollar.\n\nRasheed\nShopCommand`,
            }),
          })
          logger.info('Trial ending email sent', { orgId })
        } catch (err) {
          logger.warn('Trial ending email failed', { orgId, error: err.message })
        }
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

  if (action === 'portal' && req.method === 'POST') {
    return handlePortal(req, res, user)
  }

  if (action === 'billing' && req.method === 'GET') {
    return handleBilling(req, res, user)
  }

  // Lightweight trial/plan state, readable by every role (techs need to
  // know the org is locked too). No Stripe API call involved.
  if (action === 'trial-status' && req.method === 'GET') {
    const active = user.plan === 'founding'
      || !user.trialEndsAt
      || new Date(user.trialEndsAt).getTime() > Date.now()
    const daysLeft = user.trialEndsAt
      ? Math.max(0, Math.ceil((new Date(user.trialEndsAt).getTime() - Date.now()) / 86_400_000))
      : null
    return res.json({
      plan: user.plan || 'trial',
      trialEndsAt: user.trialEndsAt,
      daysLeft,
      active,
      paid: user.plan === 'founding',
    })
  }

  return res.status(400).json({ error: 'Invalid action. Use ?action=checkout, portal, billing, or webhook' })
}
