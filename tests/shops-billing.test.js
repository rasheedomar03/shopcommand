import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createMockReq, createMockRes, MOCK_OWNER, VALID_UUID } from './helpers.js'

// Adding a location must never leave an owner with an unbilled shop: if the
// Stripe subscription cannot be updated, the new shop is undone.

const mockSql = vi.hoisted(() => vi.fn())
const syncShopBilling = vi.hoisted(() => vi.fn())

vi.mock('@neondatabase/serverless', () => ({ neon: vi.fn(() => mockSql) }))
vi.mock('../api/_lib/billing.js', () => ({ syncShopBilling }))
vi.mock('../api/_lib/auth.js', () => ({
  authenticate: vi.fn(() => Promise.resolve(null)),
  setRlsContext: vi.fn(() => Promise.resolve()),
}))
vi.mock('../api/_lib/rate-limit.js', () => ({ rateLimit: vi.fn(() => true) }))
vi.mock('../api/_lib/logger.js', () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() },
}))

const { authenticate } = await import('../api/_lib/auth.js')
const { default: handler } = await import('../api/shops.js')

const newShop = { id: VALID_UUID, name: 'New Shop', org_id: MOCK_OWNER.orgId }
let queries

beforeEach(() => {
  vi.clearAllMocks()
  queries = []
  mockSql.mockReset()
  mockSql.mockImplementation((strings) => {
    const q = strings.join('?').replace(/\s+/g, ' ')
    queries.push(q)
    if (/INSERT INTO shops/.test(q)) return Promise.resolve([newShop])
    return Promise.resolve([])
  })
})

function addShop() {
  authenticate.mockResolvedValueOnce(MOCK_OWNER)
  const req = createMockReq({ method: 'POST', body: { name: 'New Shop', address: '123 Main St' } })
  const res = createMockRes()
  return handler(req, res).then(() => res)
}

describe('POST /api/shops billing', () => {
  it('keeps the shop and returns the billing summary when Stripe updates', async () => {
    syncShopBilling.mockResolvedValueOnce({ monthlyTotal: 150, shopCount: 2 })
    const res = await addShop()
    expect(res.statusCode).toBe(201)
    expect(res._body.billing).toEqual({ monthlyTotal: 150, shopCount: 2 })
    expect(queries.some(q => /DELETE FROM shops/.test(q))).toBe(false)
  })

  it('undoes the new shop and returns 502 when the Stripe update fails', async () => {
    syncShopBilling.mockResolvedValueOnce({ error: true })
    syncShopBilling.mockResolvedValueOnce({ monthlyTotal: 100, shopCount: 1 })
    const res = await addShop()
    expect(res.statusCode).toBe(502)
    expect(res._body.code).toBe('billing_failed')
    expect(res._body.error).toMatch(/not added/i)
    expect(queries.some(q => /DELETE FROM shops WHERE id = \? AND org_id = \?/.test(q))).toBe(true)
    // Stripe is realigned to the restored shop count.
    expect(syncShopBilling).toHaveBeenCalledTimes(2)
    expect(syncShopBilling.mock.calls[1][2]).toEqual({ adding: false })
  })

  it('keeps the shop when the org has no subscription yet (trial)', async () => {
    syncShopBilling.mockResolvedValueOnce(null)
    const res = await addShop()
    expect(res.statusCode).toBe(201)
    expect(queries.some(q => /DELETE FROM shops/.test(q))).toBe(false)
  })
})
