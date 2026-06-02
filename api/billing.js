import Stripe from 'stripe'
import { createHandler } from './_lib/handler.js'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)

export default createHandler(
  { methods: ['GET'] },
  async ({ req, res, sql, user }) => {
    // Get org's Stripe info
    const [org] = await sql`
      SELECT stripe_customer_id, stripe_subscription_id, plan
      FROM organizations
      WHERE id = ${user.orgId}
    `

    if (!org) {
      return res.status(404).json({ error: 'Organization not found' })
    }

    // If no subscription, return basic status
    if (!org.stripe_subscription_id) {
      return res.json({
        plan: org.plan || 'founding',
        status: 'no_subscription',
        subscription: null,
      })
    }

    // Fetch subscription details from Stripe
    try {
      const subscription = await stripe.subscriptions.retrieve(org.stripe_subscription_id)
      return res.json({
        plan: org.plan,
        status: subscription.status,
        currentPeriodEnd: subscription.current_period_end,
        cancelAtPeriodEnd: subscription.cancel_at_period_end,
        subscription: {
          id: subscription.id,
          status: subscription.status,
          amount: subscription.items.data[0]?.price?.unit_amount,
          interval: subscription.items.data[0]?.price?.recurring?.interval,
        },
      })
    } catch {
      return res.json({
        plan: org.plan,
        status: 'error',
        subscription: null,
      })
    }
  }
)
