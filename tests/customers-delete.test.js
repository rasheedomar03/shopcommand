import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createMockReq, createMockRes, MOCK_OWNER, MOCK_ADVISOR, VALID_UUID } from './helpers.js'

// Deleting a customer also deletes their repair orders and invoices (database
// cascade), so the API refuses unless the caller confirms with force=true.

const mockSql = vi.hoisted(() => vi.fn())
vi.mock('@neondatabase/serverless', () => ({ neon: vi.fn(() => mockSql) }))
vi.mock('../api/_lib/auth.js', () => ({
  authenticate: vi.fn(() => Promise.resolve(null)),
  setRlsContext: vi.fn(() => Promise.resolve()),
}))
vi.mock('../api/_lib/rate-limit.js', () => ({ rateLimit: vi.fn(() => true) }))
vi.mock('../api/_lib/logger.js', () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() },
}))

const { authenticate } = await import('../api/_lib/auth.js')
const { default: handler } = await import('../api/customers.js')

const state = { customer: null, counts: null, queries: [] }

beforeEach(() => {
  vi.clearAllMocks()
  Object.assign(state, { customer: { id: VALID_UUID, name: 'United Road' }, counts: { repair_orders: 0, invoices: 0, vehicles: 0 }, queries: [] })
  mockSql.mockReset()
  mockSql.mockImplementation((strings) => {
    const q = strings.join('?').replace(/\s+/g, ' ')
    state.queries.push(q)
    if (/SELECT id, name FROM customers/.test(q)) return Promise.resolve(state.customer ? [state.customer] : [])
    if (/AS repair_orders/.test(q)) return Promise.resolve([state.counts])
    if (/DELETE FROM customers/.test(q)) return Promise.resolve([{ id: VALID_UUID }])
    return Promise.resolve([])
  })
})

async function del(query = {}, user = MOCK_OWNER) {
  authenticate.mockResolvedValueOnce(user)
  const req = createMockReq({ method: 'DELETE', query: { id: VALID_UUID, ...query } })
  const res = createMockRes()
  await handler(req, res)
  return res
}
const deleted = () => state.queries.some(q => /DELETE FROM customers/.test(q))

describe('DELETE /api/customers', () => {
  it('deletes a customer with no repair orders or invoices', async () => {
    const res = await del()
    expect(res.statusCode).toBe(200)
    expect(res._body).toEqual({ deleted: VALID_UUID })
    expect(deleted()).toBe(true)
  })

  it('refuses when the customer has repair orders, and says how much', async () => {
    state.counts = { repair_orders: 3, invoices: 0, vehicles: 1 }
    const res = await del()
    expect(res.statusCode).toBe(409)
    expect(res._body).toMatchObject({ code: 'has_history', repairOrders: 3, invoices: 0, vehicles: 1 })
    expect(deleted()).toBe(false)
  })

  it('deletes a customer with repair orders only when force=true', async () => {
    state.counts = { repair_orders: 3, invoices: 0, vehicles: 1 }
    const res = await del({ force: 'true' })
    expect(res.statusCode).toBe(200)
    expect(deleted()).toBe(true)
  })

  it('never deletes a customer who has invoices, even with force=true (invoices are only ever voided)', async () => {
    state.counts = { repair_orders: 3, invoices: 2, vehicles: 1 }
    for (const query of [{}, { force: 'true' }]) {
      const res = await del(query)
      expect(res.statusCode).toBe(409)
      expect(res._body).toMatchObject({ code: 'has_invoices', invoices: 2 })
      expect(res._body.error).toMatch(/void/i)
    }
    expect(deleted()).toBe(false)
  })

  it('does not treat other values of force as confirmation', async () => {
    state.counts = { repair_orders: 1, invoices: 0, vehicles: 0 }
    const res = await del({ force: '1' })
    expect(res.statusCode).toBe(409)
    expect(deleted()).toBe(false)
  })

  it('returns 404 for a customer that is not in this organization', async () => {
    state.customer = null
    const res = await del({ force: 'true' })
    expect(res.statusCode).toBe(404)
    expect(deleted()).toBe(false)
  })

  it('only owners can delete', async () => {
    const res = await del({}, MOCK_ADVISOR)
    expect(res.statusCode).toBe(403)
    expect(state.queries.length).toBe(0)
  })
})
