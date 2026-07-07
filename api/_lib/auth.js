import { neon } from '@neondatabase/serverless'
import { verifyToken } from '@clerk/backend'
import { logger } from './logger.js'

// ═════════════════════════════════════════════════════════════════════════════
// TENANT ISOLATION — READ THIS BEFORE TOUCHING ANY QUERY
//
// db/schema.sql defines Row Level Security policies keyed off
// current_setting('app.current_org_id'), but they are NOT an active safety
// net in this deployment:
//
//   1. The Neon HTTP driver (@neondatabase/serverless `neon()`) sends each
//      sql`...` call as its own stateless HTTP request in its own implicit
//      transaction. `set_config(..., true)` (transaction-local) — and even
//      session-local settings — do NOT persist to subsequent queries.
//   2. The app connects as the database owner role, which bypasses RLS.
//      (If RLS were actually enforced, current_org_id() would resolve to the
//      zero UUID and every query would return nothing.)
//
// Therefore the ONLY tenancy enforcement layer is the explicit
// `WHERE org_id = ${user.orgId}` filter in EVERY query in the api/ handlers.
// A query without an org_id filter is a cross-tenant data leak. Review every
// new query with that in mind — there is no second line of defense.
//
// To make RLS real, queries would need to run inside sql.transaction([...])
// batches (or a session-based driver/Pool) with set_config as the first
// statement, using a non-owner role. That is a deliberate future migration,
// not something to toggle casually.
// ═════════════════════════════════════════════════════════════════════════════

/**
 * Verify a Clerk session JWT and load the corresponding app user.
 * Returns the user context object, or null if unauthenticated.
 *
 * Token verification is delegated to @clerk/backend's verifyToken, which
 * checks signature (via Clerk JWKS), exp, nbf, iat, and (when configured)
 * authorized parties — replacing the previous hand-rolled JWKS verification
 * that skipped nbf/issuer/azp checks.
 */
export async function authenticate(req) {
  const authHeader = req.headers.authorization
  if (!authHeader?.startsWith('Bearer ')) return null

  try {
    const token = authHeader.slice(7)
    const claims = await verifyToken(token, {
      secretKey: process.env.CLERK_SECRET_KEY,
      // Optional CSRF hardening: comma-separated list of allowed origins for
      // the azp claim, e.g. "https://app.example.com". Unset = azp not checked.
      authorizedParties: process.env.CLERK_AUTHORIZED_PARTIES
        ? process.env.CLERK_AUTHORIZED_PARTIES.split(',').map(s => s.trim()).filter(Boolean)
        : undefined,
    })

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

/**
 * @deprecated NO-OP. See the tenant-isolation comment at the top of this file.
 *
 * This used to run set_config('app.current_org_id', ..., true) — but over the
 * Neon HTTP driver that setting died with its own single-statement transaction
 * and never applied to any subsequent query, and the owner role bypasses RLS
 * anyway. It has been converted to a no-op (saving a DB round-trip per
 * request) and kept only so existing imports don't break.
 *
 * Tenancy is enforced by explicit org_id filters in every query. Do not rely
 * on this function for isolation.
 */
export function setRlsContext(_sql, _user) {
  return Promise.resolve()
}
