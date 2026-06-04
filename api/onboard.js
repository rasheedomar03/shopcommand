import { verifyToken, createClerkClient } from '@clerk/backend'
import { neon } from '@neondatabase/serverless'
import { rateLimit } from './_lib/rate-limit.js'
import { authenticate, setRlsContext } from './_lib/auth.js'

const clerk = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY })

function generateCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let code = ''
  for (let i = 0; i < 8; i++) code += chars[Math.floor(Math.random() * chars.length)]
  return code
}

export default async function handler(req, res) {
  const action = req.query?.action

  // ── Create invite (authenticated owner) ─────────────────────────────────
  if (action === 'create-invite' && req.method === 'POST') {
    if (!rateLimit(req, res)) return res.status(429).json({ error: 'Too many requests' })

    const user = await authenticate(req)
    if (!user) return res.status(401).json({ error: 'Unauthorized' })
    if (user.role !== 'owner') return res.status(403).json({ error: 'Only owners can create invites' })

    const { role, shopId, email } = req.body || {}
    if (!role || !['advisor', 'tech'].includes(role)) {
      return res.status(400).json({ error: 'Role must be advisor or tech' })
    }
    if (!shopId) return res.status(400).json({ error: 'shopId is required' })

    const sql = neon(process.env.DATABASE_URL)
    await setRlsContext(sql, user)

    const code = generateCode()
    const [invite] = await sql`
      INSERT INTO invites (org_id, shop_id, role, email, code, created_by)
      VALUES (${user.orgId}, ${shopId}, ${role}, ${email || null}, ${code}, ${user.userId})
      RETURNING id, code, role, expires_at
    `

    return res.status(201).json(invite)
  }

  // ── List invites (authenticated owner) ──────────────────────────────────
  if (action === 'list-invites' && req.method === 'GET') {
    if (!rateLimit(req, res)) return res.status(429).json({ error: 'Too many requests' })

    const user = await authenticate(req)
    if (!user) return res.status(401).json({ error: 'Unauthorized' })
    if (user.role !== 'owner') return res.status(403).json({ error: 'Only owners can view invites' })

    const sql = neon(process.env.DATABASE_URL)
    await setRlsContext(sql, user)

    const invites = await sql`
      SELECT i.id, i.code, i.role, i.email, i.expires_at, i.created_at,
        i.used_by IS NOT NULL AS used, s.name AS shop_name
      FROM invites i
      LEFT JOIN shops s ON s.id = i.shop_id
      WHERE i.org_id = ${user.orgId}
      ORDER BY i.created_at DESC
      LIMIT 50
    `

    return res.json(invites)
  }

  // ── Check if already onboarded: GET /api/onboard?action=check ───────────
  if (action === 'check' && req.method === 'GET') {
    if (!rateLimit(req, res, 'auth')) return res.status(429).json({ error: 'Too many requests' })

    const token = req.headers.authorization?.split(' ')[1]
    if (!token) return res.status(401).json({ error: 'Missing token' })

    let clerkId
    try {
      const payload = await verifyToken(token, { secretKey: process.env.CLERK_SECRET_KEY })
      clerkId = payload.sub
    } catch {
      return res.status(401).json({ error: 'Invalid token' })
    }

    const sql = neon(process.env.DATABASE_URL)
    const existing = await sql`
      SELECT o.id AS org_id, s.id AS shop_id
      FROM organizations o
      LEFT JOIN shops s ON s.org_id = o.id
      WHERE o.owner_clerk_id = ${clerkId}
      LIMIT 1
    `

    if (existing.length > 0) {
      return res.json({ exists: true, orgId: existing[0].org_id, shopId: existing[0].shop_id })
    }
    return res.json({ exists: false })
  }

  // ── Onboard (sign up flow) ──────────────────────────────────────────────
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  if (!rateLimit(req, res, 'auth')) {
    return res.status(429).json({ error: 'Too many requests' })
  }

  const token = req.headers.authorization?.split(' ')[1]
  if (!token) {
    return res.status(401).json({ error: 'Missing token' })
  }

  let clerkId
  try {
    const payload = await verifyToken(token, {
      secretKey: process.env.CLERK_SECRET_KEY,
    })
    clerkId = payload.sub
  } catch (err) {
    return res.status(401).json({ error: 'Invalid token', detail: err.message })
  }

  const { role, shopName, inviteCode } = req.body || {}

  if (!role || !['owner', 'advisor', 'tech'].includes(role)) {
    return res.status(400).json({ error: 'Invalid role' })
  }

  const sql = neon(process.env.DATABASE_URL)

  // ── Block role mismatch for existing users ────────────────────────────
  const [existingUser] = await sql`SELECT id, role FROM users WHERE clerk_id = ${clerkId} LIMIT 1`
  if (existingUser && existingUser.role !== role) {
    return res.status(403).json({ error: `You are registered as a ${existingUser.role}. Contact your shop owner to change your role.` })
  }

  // ── Owner onboarding ──────────────────────────────────────────────────
  if (role === 'owner') {

    if (!shopName || typeof shopName !== 'string' || shopName.trim().length < 2) {
      return res.status(400).json({ error: 'Shop name is required (min 2 characters)' })
    }

    // Block owner signup if this user's email has a pending invite
    const clerkUser = await clerk.users.getUser(clerkId)
    const userEmail = clerkUser.emailAddresses?.[0]?.emailAddress || ''
    if (userEmail) {
      const [pendingInvite] = await sql`
        SELECT id, role FROM invites
        WHERE email = ${userEmail} AND used_by IS NULL AND expires_at > NOW()
        LIMIT 1
      `
      if (pendingInvite) {
        return res.status(403).json({
          error: `Your email has a pending invite as a ${pendingInvite.role}. Please select "${pendingInvite.role}" instead and enter your invite code. If you believe this is a mistake, contact your shop owner.`
        })
      }
    }

    const name = shopName.trim().slice(0, 100)

    try {
      const existing = await sql`SELECT o.id AS org_id, s.id AS shop_id FROM organizations o LEFT JOIN shops s ON s.org_id = o.id WHERE o.owner_clerk_id = ${clerkId} LIMIT 1`
      if (existing.length > 0) {
        await clerk.users.updateUser(clerkId, {
          unsafeMetadata: {
            role: 'owner',
            onboarded: true,
            orgId: existing[0].org_id,
            shopId: existing[0].shop_id,
          },
        })
        return res.status(200).json({ orgId: existing[0].org_id, shopId: existing[0].shop_id })
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

  // ── Advisor/Tech onboarding (requires invite code) ────────────────────
  if (!inviteCode || typeof inviteCode !== 'string' || inviteCode.trim().length < 4) {
    return res.status(400).json({ error: 'Invite code is required' })
  }

  const code = inviteCode.trim().toUpperCase()

  try {
    const [invite] = await sql`
      SELECT id, org_id, shop_id, role, expires_at
      FROM invites
      WHERE code = ${code} AND used_by IS NULL
    `

    if (!invite) {
      return res.status(404).json({ error: 'Invalid or expired invite code' })
    }

    if (new Date(invite.expires_at) < new Date()) {
      return res.status(410).json({ error: 'This invite has expired. Ask your shop owner for a new one.' })
    }

    if (invite.role !== role) {
      return res.status(400).json({ error: `This invite is for a ${invite.role}, not a ${role}` })
    }

    const clerkUser = await clerk.users.getUser(clerkId)
    const userName = [clerkUser.firstName, clerkUser.lastName].filter(Boolean).join(' ') || 'User'
    const userEmail = clerkUser.emailAddresses?.[0]?.emailAddress || ''

    // Create user record
    const [newUser] = await sql`
      INSERT INTO users (clerk_id, org_id, shop_id, role, name, email)
      VALUES (${clerkId}, ${invite.org_id}, ${invite.shop_id}, ${invite.role}, ${userName}, ${userEmail})
      RETURNING id
    `

    // Mark invite as used
    await sql`UPDATE invites SET used_by = ${newUser.id} WHERE id = ${invite.id}`

    // Update Clerk metadata
    await clerk.users.updateUser(clerkId, {
      unsafeMetadata: {
        role: invite.role,
        onboarded: true,
        orgId: invite.org_id,
        shopId: invite.shop_id,
        techId: invite.role === 'tech' ? newUser.id : undefined,
      },
    })

    return res.status(201).json({
      orgId: invite.org_id,
      shopId: invite.shop_id,
      role: invite.role,
    })
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ error: 'You already have an account in this organization' })
    }
    return res.status(500).json({ error: 'Failed to join organization' })
  }
}
