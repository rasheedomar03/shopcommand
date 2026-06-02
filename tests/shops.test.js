import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createMockReq, createMockRes, MOCK_OWNER, MOCK_TECH, VALID_UUID } from './helpers.js'

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
const { default: handler } = await import('../api/shops.js')

beforeEach(() => { vi.clearAllMocks() })

describe('GET /api/shops', () => {
  it('returns shop list', async () => {
    authenticate.mockResolvedValueOnce(MOCK_OWNER)
    const shops = [{ id: VALID_UUID, name: 'Main Shop' }]
    mockSql.mockResolvedValueOnce(shops)

    const req = createMockReq({ method: 'GET' })
    const res = createMockRes()
    await handler(req, res)

    expect(res.json).toHaveBeenCalledWith(shops)
  })
})

describe('POST /api/shops', () => {
  it('rejects non-owners', async () => {
    authenticate.mockResolvedValueOnce(MOCK_TECH)

    const req = createMockReq({ method: 'POST', body: { name: 'New Shop' } })
    const res = createMockRes()
    await handler(req, res)

    expect(res.status).toHaveBeenCalledWith(403)
  })

  it('validates name is required', async () => {
    authenticate.mockResolvedValueOnce(MOCK_OWNER)

    const req = createMockReq({ method: 'POST', body: {} })
    const res = createMockRes()
    await handler(req, res)

    expect(res.status).toHaveBeenCalledWith(400)
    expect(res._body.error).toContain('Name')
  })

  it('validates name length minimum', async () => {
    authenticate.mockResolvedValueOnce(MOCK_OWNER)

    const req = createMockReq({ method: 'POST', body: { name: 'A' } })
    const res = createMockRes()
    await handler(req, res)

    expect(res.status).toHaveBeenCalledWith(400)
  })

  it('creates shop for owners with valid data', async () => {
    authenticate.mockResolvedValueOnce(MOCK_OWNER)
    const newShop = { id: VALID_UUID, name: 'New Shop', org_id: MOCK_OWNER.orgId }
    mockSql.mockResolvedValueOnce([newShop])

    const req = createMockReq({ method: 'POST', body: { name: 'New Shop', address: '123 Main St' } })
    const res = createMockRes()
    await handler(req, res)

    expect(res.status).toHaveBeenCalledWith(201)
    expect(res._body).toEqual(newShop)
  })
})

describe('PUT /api/shops', () => {
  it('requires id parameter', async () => {
    authenticate.mockResolvedValueOnce(MOCK_OWNER)

    const req = createMockReq({ method: 'PUT', body: { name: 'Updated' } })
    const res = createMockRes()
    await handler(req, res)

    expect(res.status).toHaveBeenCalledWith(400)
    expect(res._body.error).toContain('id')
  })

  it('returns 404 for missing shop', async () => {
    authenticate.mockResolvedValueOnce(MOCK_OWNER)
    mockSql.mockResolvedValueOnce([])

    const req = createMockReq({ method: 'PUT', query: { id: VALID_UUID }, body: { name: 'Updated' } })
    const res = createMockRes()
    await handler(req, res)

    expect(res.status).toHaveBeenCalledWith(404)
  })
})

describe('DELETE /api/shops', () => {
  it('rejects non-owners', async () => {
    authenticate.mockResolvedValueOnce(MOCK_TECH)

    const req = createMockReq({ method: 'DELETE', query: { id: VALID_UUID } })
    const res = createMockRes()
    await handler(req, res)

    expect(res.status).toHaveBeenCalledWith(403)
  })

  it('returns 404 for missing shop', async () => {
    authenticate.mockResolvedValueOnce(MOCK_OWNER)
    mockSql.mockResolvedValueOnce([])

    const req = createMockReq({ method: 'DELETE', query: { id: VALID_UUID } })
    const res = createMockRes()
    await handler(req, res)

    expect(res.status).toHaveBeenCalledWith(404)
  })
})
