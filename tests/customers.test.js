import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createMockReq, createMockRes, MOCK_OWNER, MOCK_ADVISOR, MOCK_TECH, VALID_UUID } from './helpers.js'

const mockSql = vi.fn(() => Promise.resolve([]))

vi.mock('@neondatabase/serverless', () => ({
  neon: vi.fn(() => mockSql),
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

const { authenticate } = await import('../api/_lib/auth.js')
const { default: handler } = await import('../api/customers.js')

beforeEach(() => { vi.clearAllMocks() })

describe('GET /api/customers', () => {
  it('returns customer list', async () => {
    authenticate.mockResolvedValueOnce(MOCK_OWNER)
    const customers = [{ id: VALID_UUID, name: 'John Doe', email: 'john@test.com' }]
    mockSql.mockResolvedValueOnce(customers)

    const req = createMockReq({ method: 'GET' })
    const res = createMockRes()
    await handler(req, res)

    expect(res.json).toHaveBeenCalledWith(customers)
  })

  it('supports search filter', async () => {
    authenticate.mockResolvedValueOnce(MOCK_OWNER)
    mockSql.mockResolvedValueOnce([])

    const req = createMockReq({ method: 'GET', query: { search: 'john' } })
    const res = createMockRes()
    await handler(req, res)

    expect(res.json).toHaveBeenCalledWith([])
  })
})

describe('POST /api/customers', () => {
  it('validates name is required', async () => {
    authenticate.mockResolvedValueOnce(MOCK_OWNER)

    const req = createMockReq({ method: 'POST', body: { email: 'test@test.com' } })
    const res = createMockRes()
    await handler(req, res)

    expect(res.status).toHaveBeenCalledWith(400)
    expect(res._body.error).toContain('name')
  })

  it('validates email format', async () => {
    authenticate.mockResolvedValueOnce(MOCK_OWNER)

    const req = createMockReq({ method: 'POST', body: { name: 'John Doe', email: 'not-an-email' } })
    const res = createMockRes()
    await handler(req, res)

    expect(res.status).toHaveBeenCalledWith(400)
    expect(res._body.error).toContain('email')
  })

  it('creates customer with valid data', async () => {
    authenticate.mockResolvedValueOnce(MOCK_ADVISOR)
    const newCustomer = { id: VALID_UUID, name: 'Jane Doe', email: 'jane@test.com' }
    mockSql.mockResolvedValueOnce([newCustomer])

    const req = createMockReq({ method: 'POST', body: { name: 'Jane Doe', email: 'jane@test.com' } })
    const res = createMockRes()
    await handler(req, res)

    expect(res.status).toHaveBeenCalledWith(201)
    expect(res._body).toEqual(newCustomer)
  })

  it('validates notes length', async () => {
    authenticate.mockResolvedValueOnce(MOCK_OWNER)

    const req = createMockReq({ method: 'POST', body: { name: 'John', notes: 'x'.repeat(2001) } })
    const res = createMockRes()
    await handler(req, res)

    expect(res.status).toHaveBeenCalledWith(400)
    expect(res._body.error).toContain('Notes')
  })
})

describe('DELETE /api/customers', () => {
  it('only allows owners to delete', async () => {
    authenticate.mockResolvedValueOnce(MOCK_TECH)

    const req = createMockReq({ method: 'DELETE', query: { id: VALID_UUID } })
    const res = createMockRes()
    await handler(req, res)

    expect(res.status).toHaveBeenCalledWith(403)
  })

  it('requires id parameter', async () => {
    authenticate.mockResolvedValueOnce(MOCK_OWNER)

    const req = createMockReq({ method: 'DELETE' })
    const res = createMockRes()
    await handler(req, res)

    expect(res.status).toHaveBeenCalledWith(400)
  })
})
