import Stripe from 'stripe'
import { createHandler } from './_lib/handler.js'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)

// Founding member price: $100/mo (normally $175)
const FOUNDING_PRICE_AMOUNT = 10000 // cents
const PRODUCT_NAME = 'ShopCommand Founding Member'

export default createHandler(
  { methods: ['POST'] },
  async ({ req, res, user }) => {
    const { successUrl, cancelUrl } = req.body || {}

    if (!successUrl || !cancelUrl) {
      return res.status(400).json({ error: 'successUrl and cancelUrl are required' })
    }

    try {
      // Check if customer already exists in Stripe
      const existingCustomers = await stripe.customers.list({
        email: user.email,
        limit: 1,
      })

      let customerId
      if (existingCustomers.data.length > 0) {
        customerId = existingCustomers.data[0].id
      } else {
        const customer = await stripe.customers.create({
          email: user.email,
          name: user.name,
          metadata: {
            clerkId: user.clerkId,
            orgId: user.orgId,
          },
        })
        customerId = customer.id
      }

      // Create checkout session with a recurring price
      const session = await stripe.checkout.sessions.create({
        customer: customerId,
        mode: 'subscription',
        payment_method_types: ['card'],
        line_items: [
          {
            price_data: {
              currency: 'usd',
              product_data: {
                name: PRODUCT_NAME,
                description: 'Unlimited locations, unlimited users, all features. Founding rate locked forever.',
              },
              unit_amount: FOUNDING_PRICE_AMOUNT,
              recurring: { interval: 'month' },
            },
            quantity: 1,
          },
        ],
        subscription_data: {
          metadata: {
            clerkId: user.clerkId,
            orgId: user.orgId,
            plan: 'founding',
          },
        },
        success_url: successUrl,
        cancel_url: cancelUrl,
        metadata: {
          clerkId: user.clerkId,
          orgId: user.orgId,
        },
      })

      return res.json({ url: session.url })
    } catch (err) {
      return res.status(500).json({ error: 'Failed to create checkout session' })
    }
  }
)
