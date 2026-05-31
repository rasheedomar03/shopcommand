import { neon } from '@neondatabase/serverless'
import { logger } from './logger.js'

const CLERK_PEM_URL = 'https://api.clerk.com/v1/jwks'
let cachedJwks = null
let jwksFetchedAt = 0
const JWKS_CACHE_MS = 60 * 60_000

async function getJwks() {
  if (cachedJwks && Date.now() - jwksFetchedAt < JWKS_CACHE_MS) return cachedJwks
  const res = await fetch(CLERK_PEM_URL, {
    headers: { Authorization: `Bearer ${process.env.CLERK_SECRET_KEY}` },
  })
  if (!res.ok) throw new Error('Failed to fetch Clerk JWKS')
  cachedJwks = await res.json()
  jwksFetchedAt = Date.now()
  return cachedJwks
}

function base64UrlDecode(str) {
  const padded = str.replace(/-/g, '+').replace(/_/g, '/')
  return Uint8Array.from(atob(padded), c => c.charCodeAt(0))
}

async function verifyClerkToken(token) {
  const [headerB64, payloadB64] = token.split('.')
  const header = JSON.parse(new TextDecoder().decode(base64UrlDecode(headerB64)))
  const payload = JSON.parse(new TextDecoder().decode(base64UrlDecode(payloadB64)))

  if (payload.exp && payload.exp < Date.now() / 1000) {
    throw new Error('Token expired')
  }

  const jwks = await getJwks()
  const key = jwks.keys.find(k => k.kid === header.kid)
  if (!key) throw new Error('Unknown signing key')

  const cryptoKey = await crypto.subtle.importKey(
    'jwk', key, { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['verify']
  )

  const data = new TextEncoder().encode(`${headerB64}.${payloadB64}`)
  const signature = base64UrlDecode(token.split('.')[2])
  const valid = await crypto.subtle.verify('RSASSA-PKCS1-v1_5', cryptoKey, signature, data)

  if (!valid) throw new Error('Invalid signature')
  return payload
}

export async function authenticate(req) {
  const authHeader = req.headers.authorization
  if (!authHeader?.startsWith('Bearer ')) return null

  try {
    const token = authHeader.slice(7)
    const claims = await verifyClerkToken(token)

    const sql = neon(process.env.DATABASE_URL)
    const [user] = await sql`SELECT id, org_id, shop_id, role, name, email FROM users WHERE clerk_id = ${claims.sub}`

    if (!user) return null

    return {
      clerkId: claims.sub,
      userId: user.id,
      orgId: user.org_id,
      shopId: user.shop_id,
      role: user.role,
      name: user.name,
      email: user.email,
    }
  } catch (err) {
    logger.warn('Auth failed', { error: err.message })
    return null
  }
}

export function setRlsContext(sql, user) {
  return sql`
    SELECT
      set_config('app.current_org_id', ${user.orgId}, true),
      set_config('app.current_user_role', ${user.role}, true),
      set_config('app.current_shop_id', ${user.shopId || ''}, true),
      set_config('app.current_user_id', ${user.userId}, true),
      set_config('app.current_clerk_id', ${user.clerkId}, true)
  `
}
