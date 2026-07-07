// In-memory rate limiter for Vercel serverless functions.
//
// SECURITY NOTE: this is per-instance and therefore nearly decorative on
// serverless — Vercel spins up many concurrent instances, each with its own
// empty map, and instances are recycled frequently. An attacker spreading
// requests across instances effectively multiplies the limit. Treat this as
// best-effort throttling of a single hot instance, NOT as real abuse
// protection. Real rate limiting requires an external shared store
// (Upstash Redis / Vercel KV) — swap this module's internals for that when
// abuse protection matters.

const windows = new Map()

// Lazy cleanup: purge stale windows on access instead of a module-level
// setInterval. A setInterval in serverless keeps the event loop pinned /
// leaks a timer per warm instance and never fires on frozen instances.
const CLEANUP_INTERVAL_MS = 60_000
const STALE_AFTER_MS = 30 * 60_000
let lastCleanup = 0

function cleanupStale(now) {
  if (now - lastCleanup < CLEANUP_INTERVAL_MS) return
  lastCleanup = now
  for (const [key, record] of windows) {
    if (now - record.start > STALE_AFTER_MS) windows.delete(key)
  }
}

const DEFAULTS = {
  general: { max: 100, windowMs: 60_000 },
  auth:    { max: 5,   windowMs: 15 * 60_000 },
}

function getClientIp(req) {
  return (
    req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
    req.headers['x-real-ip'] ||
    req.socket?.remoteAddress ||
    'unknown'
  )
}

export function rateLimit(req, res, tier = 'general') {
  const config = DEFAULTS[tier] || DEFAULTS.general
  const ip = getClientIp(req)
  const key = `${tier}:${ip}`
  const now = Date.now()

  cleanupStale(now)

  let record = windows.get(key)
  if (!record || now - record.start > config.windowMs) {
    record = { start: now, count: 0 }
    windows.set(key, record)
  }

  record.count++

  // Set rate limit headers
  res.setHeader('X-RateLimit-Limit', config.max)
  res.setHeader('X-RateLimit-Remaining', Math.max(0, config.max - record.count))
  res.setHeader('X-RateLimit-Reset', new Date(record.start + config.windowMs).toISOString())

  if (record.count > config.max) {
    const retryAfter = Math.ceil((record.start + config.windowMs - now) / 1000)
    res.setHeader('Retry-After', retryAfter)
    return false
  }

  return true
}
