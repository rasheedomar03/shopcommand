import { verifyToken, createClerkClient } from '@clerk/backend'
import { neon } from '@neondatabase/serverless'
import { rateLimit } from './_lib/rate-limit.js'
import { authenticate, setRlsContext } from './_lib/auth.js'
import { sendFounderAlert } from './_lib/founder-alert.js'

const clerk = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY })

// Tell the founder when someone first reaches onboarding (once per account,
// remembered in Clerk private metadata). If the matching "shop created" email
// never follows, that signup probably got stuck. Never blocks or fails the
// request.
async function alertSignupStarted(clerkId) {
  try {
    const cu = await clerk.users.getUser(clerkId)
    if (cu.privateMetadata?.signupAlerted) return
    const name = [cu.firstName, cu.lastName].filter(Boolean).join(' ') || '(no name)'
    const email = cu.emailAddresses?.[0]?.emailAddress || '(no email)'
    const sent = await sendFounderAlert({
      subject: `New signup started onboarding: ${name}`,
      lines: [
        `${name} (${email}) just created an account and reached onboarding.`,
        '',
        'If you do not get a "New shop created" or "joined" email for them within a day or two, they probably got stuck. A short, friendly note asking what stopped them is worth sending.',
      ],
    })
    if (sent) await clerk.users.updateUserMetadata(clerkId, { privateMetadata: { signupAlerted: true } })
  } catch { /* alerts are best effort */ }
}

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

    // Optional. When present, the invite only works for this email (checked
    // when the invitee joins), so it must look like a real address.
    let inviteEmail = null
    if (email !== undefined && email !== null && String(email).trim() !== '') {
      inviteEmail = String(email).trim().toLowerCase()
      if (inviteEmail.length > 200 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(inviteEmail)) {
        return res.status(400).json({ error: 'Enter a valid email address, or leave it blank' })
      }
    }

    const sql = neon(process.env.DATABASE_URL)
    await setRlsContext(sql, user)

    const code = generateCode()
    const [invite] = await sql`
      INSERT INTO invites (org_id, shop_id, role, email, code, created_by)
      VALUES (${user.orgId}, ${shopId}, ${role}, ${inviteEmail}, ${code}, ${user.userId})
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

  // ── Who am I: GET /api/onboard?action=check ─────────────────────────────
  // Lets the onboarding page forward people who already have an account (any
  // role) instead of asking them to onboard again. Read-only, so it uses the
  // general rate limit: several staff may sign up from one shop network.
  if (action === 'check' && req.method === 'GET') {
    if (!rateLimit(req, res)) return res.status(429).json({ error: 'Too many requests' })

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

    // Any existing user: owner, advisor, or tech
    const [member] = await sql`
      SELECT id, org_id, shop_id, role FROM users WHERE clerk_id = ${clerkId} LIMIT 1
    `
    if (member) {
      return res.json({
        exists: true,
        role: member.role,
        orgId: member.org_id,
        shopId: member.shop_id,
        techId: member.role === 'tech' ? member.id : null,
      })
    }

    // Older owner accounts that have an organization but no users row
    const existing = await sql`
      SELECT o.id AS org_id, s.id AS shop_id
      FROM organizations o
      LEFT JOIN shops s ON s.org_id = o.id
      WHERE o.owner_clerk_id = ${clerkId}
      LIMIT 1
    `

    if (existing.length > 0) {
      return res.json({ exists: true, role: 'owner', orgId: existing[0].org_id, shopId: existing[0].shop_id })
    }

    // New account reaching onboarding for the first time
    await alertSignupStarted(clerkId)
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

  const { role, shopName, inviteCode, address, phone } = req.body || {}

  // `role` is optional when joining with an invite code: the invite decides
  // it. Older clients still send it, and it is checked against the invite.
  if (role && !['owner', 'advisor', 'tech'].includes(role)) {
    return res.status(400).json({ error: 'Invalid role' })
  }
  if (!role && !inviteCode) {
    return res.status(400).json({ error: 'Invalid role' })
  }

  const sql = neon(process.env.DATABASE_URL)

  // ── Block role mismatch for existing users ────────────────────────────
  const [existingUser] = await sql`SELECT id, role FROM users WHERE clerk_id = ${clerkId} LIMIT 1`
  if (role && existingUser && existingUser.role !== role) {
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
        WHERE lower(email) = lower(${userEmail}) AND used_by IS NULL AND expires_at > NOW()
        LIMIT 1
      `
      if (pendingInvite) {
        return res.status(403).json({
          error: `Your email has a pending invite to join a shop as a ${pendingInvite.role}. Go back, choose "I have an invite code", and enter your code. If you believe this is a mistake, contact your shop owner.`
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

      // New orgs start a 14-day free trial from signup (plan 'trial'); the plan
      // only becomes 'founding' when Stripe checkout completes. Legacy orgs
      // (trial_ends_at NULL) are exempt from trial enforcement.
      await sql`ALTER TABLE organizations ADD COLUMN IF NOT EXISTS trial_ends_at TIMESTAMPTZ`
      const [org] = await sql`
        INSERT INTO organizations (name, owner_clerk_id, plan, trial_ends_at)
        VALUES (${name}, ${clerkId}, 'trial', now() + interval '14 days')
        RETURNING id
      `

      // Optional contact details: they print on invoices and appear in customer
      // emails. Anything blank or not text is simply left out.
      const cleanText = (v, max) => (typeof v === 'string' && v.trim() ? v.trim().slice(0, max) : null)
      const [shop] = await sql`
        INSERT INTO shops (org_id, name, address, phone)
        VALUES (${org.id}, ${name}, ${cleanText(address, 200)}, ${cleanText(phone, 30)})
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

      await sendFounderAlert({
        subject: `New shop created: ${name}`,
        lines: [
          `${userName} (${userEmail || 'no email'}) created the shop "${name}".`,
          'Their 14-day free trial starts now (no card needed).',
        ],
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
      SELECT id, org_id, shop_id, role, email, expires_at
      FROM invites
      WHERE code = ${code} AND used_by IS NULL
    `

    if (!invite) {
      return res.status(404).json({ error: 'Invalid or expired invite code' })
    }

    if (new Date(invite.expires_at) < new Date()) {
      return res.status(410).json({ error: 'This invite has expired. Ask your shop owner for a new one.' })
    }

    // Older clients send the role they picked; it must match the invite.
    if (role && invite.role !== role) {
      return res.status(400).json({ error: `This invite is for a ${invite.role}, not a ${role}` })
    }

    // The invite decides the role. An existing account cannot switch roles
    // by joining with a code.
    if (existingUser && existingUser.role !== invite.role) {
      return res.status(403).json({ error: `You are registered as a ${existingUser.role}. Contact your shop owner to change your role.` })
    }

    const clerkUser = await clerk.users.getUser(clerkId)
    const userName = [clerkUser.firstName, clerkUser.lastName].filter(Boolean).join(' ') || 'User'
    const userEmail = clerkUser.emailAddresses?.[0]?.emailAddress || ''

    // An invite made out to a specific email only works for that email. Only
    // verified addresses count, so adding someone else's address to an account
    // without verifying it cannot unlock their invite. Invites with no email
    // stay open to anyone holding the code.
    if (invite.email) {
      const invited = String(invite.email).trim().toLowerCase()
      const verified = (clerkUser.emailAddresses || [])
        .filter(ea => ea.verification?.status === 'verified')
        .map(ea => String(ea.emailAddress || '').trim().toLowerCase())
      if (!verified.includes(invited)) {
        return res.status(403).json({
          error: 'This invite was made out to a different email address. Sign in with the email your shop owner invited, or ask them for a new code.',
        })
      }
    }

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

    await sendFounderAlert({
      subject: `Team member joined a shop: ${userName}`,
      lines: [`${userName} (${userEmail || 'no email'}) joined an existing shop as a ${invite.role} with an invite code.`],
    })

    return res.status(201).json({
      orgId: invite.org_id,
      shopId: invite.shop_id,
      role: invite.role,
      // Client must carry this into its own metadata update, or the
      // server-side value gets clobbered (invited techs lose their identity)
      techId: invite.role === 'tech' ? newUser.id : null,
    })
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ error: 'You already have an account in this organization' })
    }
    return res.status(500).json({ error: 'Failed to join organization' })
  }
}
