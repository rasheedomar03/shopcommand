import { createClerkClient } from '@clerk/backend'
import { neon } from '@neondatabase/serverless'

const clerk = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY })
const sql = neon(process.env.DATABASE_URL)

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const token = req.headers.authorization?.split(' ')[1]
  if (!token) {
    return res.status(401).json({ error: 'Missing token' })
  }

  let clerkId
  try {
    const payload = await clerk.verifyToken(token)
    clerkId = payload.sub
  } catch {
    return res.status(401).json({ error: 'Invalid token' })
  }

  const { role, shopName } = req.body || {}

  if (!role || !['owner', 'advisor', 'tech'].includes(role)) {
    return res.status(400).json({ error: 'Invalid role' })
  }

  if (role === 'owner') {
    if (!shopName || typeof shopName !== 'string' || shopName.trim().length < 2) {
      return res.status(400).json({ error: 'Shop name is required (min 2 characters)' })
    }

    const name = shopName.trim().slice(0, 100)

    try {
      const existing = await sql`SELECT id FROM organizations WHERE owner_clerk_id = ${clerkId}`
      if (existing.length > 0) {
        return res.status(409).json({ error: 'Organization already exists for this account' })
      }

      const clerkUser = await clerk.users.getUser(clerkId)
      const userName = [clerkUser.firstName, clerkUser.lastName].filter(Boolean).join(' ') || 'Owner'
      const userEmail = clerkUser.emailAddresses?.[0]?.emailAddress || ''

      const [org] = await sql`
        INSERT INTO organizations (name, owner_clerk_id)
        VALUES (${name}, ${clerkId})
        RETURNING id
      `

      const [shop] = await sql`
        INSERT INTO shops (org_id, name)
        VALUES (${org.id}, ${name})
        RETURNING id
      `

      await sql`
        INSERT INTO users (clerk_id, org_id, shop_id, role, name, email)
        VALUES (${clerkId}, ${org.id}, ${shop.id}, 'owner', ${userName}, ${userEmail})
      `

      await clerk.users.updateUser(clerkId, {
        unsafeMetadata: {
          role: 'owner',
          onboarded: true,
          orgId: org.id,
          shopId: shop.id,
        },
      })

      return res.status(201).json({ orgId: org.id, shopId: shop.id })
    } catch (err) {
      if (err.code === '23505') {
        return res.status(409).json({ error: 'Organization already exists' })
      }
      return res.status(500).json({ error: 'Failed to create organization' })
    }
  }

  return res.status(400).json({
    error: 'Advisors and technicians must be invited by a shop owner',
  })
}
