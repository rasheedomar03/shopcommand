import { randomBytes, createHash, timingSafeEqual } from 'node:crypto'

// Customer estimate approval links.
//
// A link looks like /approve/{roId}/{token}. The token is 32 random bytes
// (base64url, 43 chars). Only its SHA-256 hash is stored, inside the repair
// order's JSONB data under `approval`, so reading the database never reveals a
// usable link. Generating a new link replaces the old one.
//
// No database migration is needed: everything lives in repair_orders.data.

export const TAX_RATE = 0.085
export const APPROVAL_TTL_MS = 14 * 24 * 60 * 60 * 1000 // 14 days
// Customer-facing links always use the canonical host (vercel.json redirects
// www to this), never a preview URL.
export const APP_BASE_URL = 'https://shopcommand.net'

const TOKEN_RE = /^[A-Za-z0-9_-]{43}$/

export function newToken() {
  return randomBytes(32).toString('base64url')
}

export function hashToken(token) {
  return createHash('sha256').update(token).digest('hex')
}

export function isTokenFormat(token) {
  return typeof token === 'string' && TOKEN_RE.test(token)
}

/** Constant-time comparison of a presented token against the stored hash. */
export function tokenMatches(token, approval) {
  if (!isTokenFormat(token) || !approval?.tokenHash) return false
  const a = Buffer.from(hashToken(token), 'hex')
  const b = Buffer.from(String(approval.tokenHash), 'hex')
  return a.length === b.length && timingSafeEqual(a, b)
}

/**
 * Estimate lines and totals, computed exactly like the shop-side modal
 * (RODetailModal): labor/service lines + parts x qty, then 8.5% tax.
 */
export function estimateTotals(data) {
  const services = (Array.isArray(data?.services) ? data.services : [])
    .filter(s => s && (s.name || Number(s.price) > 0))
    .map(s => ({ name: String(s.name || 'Service').slice(0, 200), price: Number(s.price) || 0 }))
  const parts = (Array.isArray(data?.partsUsed) ? data.partsUsed : [])
    .filter(p => p && (p.name || Number(p.price) > 0))
    .map(p => ({
      name: String(p.name || 'Part').slice(0, 200),
      qty: Number(p.qty) || 1,
      price: Number(p.price) || 0,
    }))
  const servicesSubtotal = services.reduce((sum, s) => sum + s.price, 0)
  const partsSubtotal = parts.reduce((sum, p) => sum + p.price * p.qty, 0)
  const subtotal = servicesSubtotal + partsSubtotal
  const tax = Math.round(subtotal * TAX_RATE * 100) / 100
  const total = Math.round((subtotal + tax) * 100) / 100
  return { services, parts, subtotal: Math.round(subtotal * 100) / 100, tax, total }
}

/**
 * Where an approval link currently stands.
 *   pending  : customer can still approve or decline
 *   approved : already authorized (by link or by the shop)
 *   declined : customer declined via the link
 *   expired  : link older than the TTL
 *   closed   : the RO moved on without an approval (e.g. shop advanced it)
 */
export function approvalState(ro, now = Date.now()) {
  const data = ro.data || {}
  const approval = data.approval || {}
  if (data.authorized || ro.stage === 'Approved') return 'approved'
  if (ro.stage !== 'Estimate') return 'closed'
  if (approval.declinedAt) return 'declined'
  if (!approval.expiresAt || new Date(approval.expiresAt).getTime() < now) return 'expired'
  return 'pending'
}

/** Typed names: drop control characters and angle brackets, keep apostrophes. */
export function cleanName(s) {
  // eslint-disable-next-line no-control-regex
  return String(s ?? '').replace(/[\u0000-\u001f\u007f<>]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 100)
}
