// In-memory rate limiter for Vercel serverless functions.
// Each function instance has its own map — this is sufficient for
// per-instance throttling. For distributed rate limiting at scale,
// swap this for Redis (Vercel KV) later.

const windows = new Map()

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

// Periodic cleanup to prevent memory leaks
setInterval(() => {
  const now = Date.now()
  for (const [key, record] of windows) {
    if (now - record.start > 30 * 60_000) windows.delete(key)
  }
}, 60_000)
