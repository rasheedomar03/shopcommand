import Stripe from 'stripe'
import { neon } from '@neondatabase/serverless'
import { logger } from './_lib/logger.js'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)
const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET

export const config = {
  api: { bodyParser: false },
}

async function buffer(readable) {
  const chunks = []
  for await (const chunk of readable) {
    chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk)
  }
  return Buffer.concat(chunks)
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const buf = await buffer(req)
  const sig = req.headers['stripe-signature']

  let event
  try {
    if (endpointSecret) {
      event = stripe.webhooks.constructEvent(buf, sig, endpointSecret)
    } else {
      // In development without webhook secret, parse directly
      event = JSON.parse(buf.toString())
    }
  } catch (err) {
    logger.warn('Stripe webhook signature verification failed', { error: err.message })
    return res.status(400).json({ error: 'Invalid signature' })
  }

  const sql = neon(process.env.DATABASE_URL)

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object
        const orgId = session.metadata?.orgId
        const customerId = session.customer
        const subscriptionId = session.subscription

        if (orgId) {
          await sql`
            UPDATE organizations
            SET plan = 'founding',
                stripe_customer_id = ${customerId},
                stripe_subscription_id = ${subscriptionId},
                updated_at = now()
            WHERE id = ${orgId}
          `
          logger.info('Subscription activated', { orgId, subscriptionId })
        }
        break
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object
        const orgId = subscription.metadata?.orgId

        if (orgId) {
          await sql`
            UPDATE organizations
            SET plan = 'cancelled',
                stripe_subscription_id = NULL,
                updated_at = now()
            WHERE id = ${orgId}
          `
          logger.info('Subscription cancelled', { orgId })
        }
        break
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object
        const subscriptionId = invoice.subscription
        logger.warn('Payment failed', { subscriptionId, customerId: invoice.customer })
        break
      }

      default:
        break
    }
  } catch (err) {
    logger.error('Webhook processing error', { type: event.type, error: err.message })
    return res.status(500).json({ error: 'Webhook processing failed' })
  }

  return res.json({ received: true })
}
