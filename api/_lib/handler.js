import { rateLimit } from './rate-limit.js'
import { authenticate } from './auth.js'
import { logger } from './logger.js'
import { neon } from '@neondatabase/serverless'

export function createHandler(config, routeHandler) {
  const {
    methods = ['GET'],
    rateTier = 'general',
    requireAuth = true,
  } = config

  return async function handler(req, res) {
    const startTime = Date.now()
    const requestId = crypto.randomUUID()

    res.setHeader('X-Request-Id', requestId)

    try {
      // Method check
      if (!methods.includes(req.method)) {
        res.setHeader('Allow', methods.join(', '))
        return res.status(405).json({ error: 'Method not allowed' })
      }

      // Rate limiting
      if (!rateLimit(req, res, rateTier)) {
        logger.warn('Rate limited', { requestId, ip: req.headers['x-forwarded-for'], path: req.url })
        return res.status(429).json({ error: 'Too many requests. Try again later.' })
      }

      // Auth
      let user = null
      if (requireAuth) {
        user = await authenticate(req)
        if (!user) {
          return res.status(401).json({ error: 'Unauthorized' })
        }
      }

      // Database connection.
      //
      // SECURITY NOTE: there is NO active RLS safety net here. The former
      // setRlsContext call was a no-op over the Neon HTTP driver (each sql``
      // call is its own stateless transaction, so set_config never persisted),
      // and the connection role bypasses RLS anyway. Tenant isolation depends
      // ENTIRELY on every route handler filtering by user.orgId
      // (WHERE org_id = ${user.orgId}). See api/_lib/auth.js for details.
      const sql = neon(process.env.DATABASE_URL)

      // Execute route handler
      const result = await routeHandler({ req, res, sql, user, requestId })

      // Log successful request
      logger.info('Request completed', {
        requestId,
        method: req.method,
        path: req.url,
        userId: user?.userId,
        status: res.statusCode,
        durationMs: Date.now() - startTime,
      })

      return result
    } catch (err) {
      logger.error('Unhandled error', {
        requestId,
        method: req.method,
        path: req.url,
        error: err.message,
        stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
        durationMs: Date.now() - startTime,
      })

      return res.status(500).json({ error: 'Internal server error' })
    }
  }
}
