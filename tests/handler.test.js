import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createMockReq, createMockRes } from './helpers.js'

vi.mock('@neondatabase/serverless', () => ({
  neon: vi.fn(() => vi.fn(() => Promise.resolve([]))),
}))

vi.mock('../api/_lib/auth.js', () => ({
  authenticate: vi.fn(() => Promise.resolve(null)),
  setRlsContext: vi.fn(() => Promise.resolve()),
}))

vi.mock('../api/_lib/rate-limit.js', () => ({
  rateLimit: vi.fn(() => true),
}))

vi.mock('../api/_lib/logger.js', () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() },
}))

const { createHandler } = await import('../api/_lib/handler.js')
const { authenticate } = await import('../api/_lib/auth.js')
const { rateLimit } = await import('../api/_lib/rate-limit.js')

beforeEach(() => { vi.clearAllMocks() })

describe('createHandler', () => {
  it('rejects disallowed HTTP methods with 405', async () => {
    const handler = createHandler({ methods: ['GET'] }, vi.fn())
    const req = createMockReq({ method: 'DELETE' })
    const res = createMockRes()

    await handler(req, res)

    expect(res.status).toHaveBeenCalledWith(405)
    expect(res._body.error).toBe('Method not allowed')
    expect(res._headers.Allow).toBe('GET')
  })

  it('returns 429 when rate limited', async () => {
    rateLimit.mockReturnValueOnce(false)
    const handler = createHandler({ methods: ['GET'] }, vi.fn())
    const req = createMockReq()
    const res = createMockRes()

    await handler(req, res)

    expect(res.status).toHaveBeenCalledWith(429)
  })

  it('returns 401 when requireAuth is true and no user', async () => {
    authenticate.mockResolvedValueOnce(null)
    const handler = createHandler({ methods: ['GET'], requireAuth: true }, vi.fn())
    const req = createMockReq()
    const res = createMockRes()

    await handler(req, res)

    expect(res.status).toHaveBeenCalledWith(401)
  })

  it('skips auth when requireAuth is false', async () => {
    const routeFn = vi.fn(({ res }) => res.json({ ok: true }))
    const handler = createHandler({ methods: ['GET'], requireAuth: false }, routeFn)
    const req = createMockReq()
    const res = createMockRes()

    await handler(req, res)

    expect(routeFn).toHaveBeenCalled()
    expect(res._body).toEqual({ ok: true })
  })

  it('calls route handler with sql, user, and requestId', async () => {
    const user = { userId: '1', orgId: '2', shopId: '3', role: 'owner', clerkId: 'c1' }
    authenticate.mockResolvedValueOnce(user)

    const routeFn = vi.fn(({ res, user: u, requestId }) => {
      expect(u).toEqual(user)
      expect(requestId).toBeDefined()
      return res.json({ ok: true })
    })

    const handler = createHandler({ methods: ['GET'] }, routeFn)
    const req = createMockReq()
    const res = createMockRes()

    await handler(req, res)

    expect(routeFn).toHaveBeenCalled()
  })

  it('returns 500 on unhandled route errors', async () => {
    authenticate.mockResolvedValueOnce({ userId: '1', orgId: '2', role: 'owner', clerkId: 'c' })
    const handler = createHandler({ methods: ['GET'] }, () => { throw new Error('boom') })
    const req = createMockReq()
    const res = createMockRes()

    await handler(req, res)

    expect(res.status).toHaveBeenCalledWith(500)
    expect(res._body.error).toBe('Internal server error')
  })

  it('sets X-Request-Id header', async () => {
    authenticate.mockResolvedValueOnce(null)
    const handler = createHandler({ methods: ['GET'] }, vi.fn())
    const req = createMockReq()
    const res = createMockRes()

    await handler(req, res)

    expect(res.setHeader).toHaveBeenCalledWith('X-Request-Id', expect.any(String))
  })
})
