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

        // Trial enforcement: orgs created after the trial system shipped get
        // trial_ends_at = signup + 14 days. Once it passes without a paid
        // plan, writes are refused (reads stay open so data is never held
        // hostage). Legacy orgs have trial_ends_at NULL and are exempt;
        // paying orgs have plan = 'founding'.
        const isWrite = req.method !== 'GET'
        const trialExpired = user.plan !== 'founding'
          && user.trialEndsAt
          && new Date(user.trialEndsAt).getTime() < Date.now()
        if (isWrite && trialExpired) {
          return res.status(402).json({
            error: 'Your free trial has ended. Start your plan in Settings to keep working.',
            code: 'subscription_required',
          })
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
