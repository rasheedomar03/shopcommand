import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createMockReq, createMockRes, MOCK_OWNER, VALID_UUID } from './helpers.js'

// Undoing payments: a paid invoice, or one that is only part paid, can go back
// to unpaid. Its recorded payments are marked refunded.

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
const { default: handler } = await import('../api/invoices.js')

const state = { invoice: null, recorded: 0, queries: [] }

beforeEach(() => {
  vi.clearAllMocks()
  Object.assign(state, { invoice: null, recorded: 0, queries: [] })
  mockSql.mockReset()
  mockSql.mockImplementation((strings) => {
    const q = strings.join('?').replace(/\s+/g, ' ')
    state.queries.push(q)
    if (/FROM invoices WHERE id/.test(q)) return Promise.resolve(state.invoice ? [state.invoice] : [])
    if (/SELECT COUNT\(\*\)::int AS n FROM payments/.test(q)) return Promise.resolve([{ n: state.recorded }])
    if (/UPDATE invoices SET status = 'unpaid'/.test(q)) return Promise.resolve([{ id: VALID_UUID, status: 'unpaid' }])
    return Promise.resolve([])
  })
})

async function markUnpaid() {
  authenticate.mockResolvedValueOnce(MOCK_OWNER)
  const req = createMockReq({ method: 'PUT', query: { id: VALID_UUID }, body: { status: 'unpaid' } })
  const res = createMockRes()
  await handler(req, res)
  return res
}

const ran = (re) => state.queries.some(q => re.test(q))

describe('PUT invoice status unpaid', () => {
  it('moves a fully paid invoice back to unpaid, refunds its payments, and reopens the repair order', async () => {
    state.invoice = { id: VALID_UUID, status: 'paid', ro_id: 'ro-1' }
    state.recorded = 1
    const res = await markUnpaid()
    expect(res.statusCode).toBe(200)
    expect(res._body.amount_paid).toBe(0)
    expect(ran(/UPDATE payments SET status = 'refunded'/)).toBe(true)
    expect(ran(/UPDATE repair_orders SET stage = 'Invoiced'/)).toBe(true)
  })

  it('lets a part-paid invoice remove its recorded payments', async () => {
    state.invoice = { id: VALID_UUID, status: 'unpaid', ro_id: 'ro-1' }
    state.recorded = 2
    const res = await markUnpaid()
    expect(res.statusCode).toBe(200)
    expect(ran(/UPDATE payments SET status = 'refunded'/)).toBe(true)
    // it was never fully paid, so the repair order stage is left alone
    expect(ran(/UPDATE repair_orders/)).toBe(false)
  })

  it('refuses when there is nothing to undo', async () => {
    state.invoice = { id: VALID_UUID, status: 'unpaid', ro_id: 'ro-1' }
    state.recorded = 0
    const res = await markUnpaid()
    expect(res.statusCode).toBe(409)
    expect(res._body.error).toMatch(/no payments/i)
    expect(ran(/UPDATE payments/)).toBe(false)
  })

  it('refuses a voided invoice', async () => {
    state.invoice = { id: VALID_UUID, status: 'void', ro_id: 'ro-1' }
    state.recorded = 1
    const res = await markUnpaid()
    expect(res.statusCode).toBe(409)
    expect(ran(/UPDATE payments/)).toBe(false)
  })

  it('returns 404 for an invoice that is not in this organization', async () => {
    state.invoice = null
    const res = await markUnpaid()
    expect(res.statusCode).toBe(404)
  })
})
