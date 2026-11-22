import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createMockReq, createMockRes, MOCK_OWNER, MOCK_ADVISOR, MOCK_TECH, VALID_UUID } from './helpers.js'
import { cleanAmount, cleanCreditBody } from '../api/_lib/credits.js'

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
const { default: customers } = await import('../api/customers.js')
const { default: invoices } = await import('../api/invoices.js')

const state = { calls: [], customerOwned: true, insertRow: { id: 'cc1', kind: 'deposit', amount: 100 }, balance: 100, apply: null }

beforeEach(() => {
  vi.clearAllMocks()
  Object.assign(state, { calls: [], customerOwned: true, insertRow: { id: 'cc1', kind: 'deposit', amount: 100 }, balance: 100, apply: null })
  mockSql.mockReset()
  mockSql.mockImplementation((strings, ...values) => {
    const q = strings.join('?').replace(/\s+/g, ' ')
    state.calls.push({ q, values })
    if (/^\s*WITH inv AS/.test(q)) return Promise.resolve([state.apply]) // the apply-credit statement (it also mentions the ledger, so it goes first)
    if (/SELECT id FROM customers WHERE id/.test(q)) return Promise.resolve(state.customerOwned ? [{ id: VALID_UUID }] : [])
    if (/INSERT INTO customer_credits/.test(q) && /RETURNING id, kind/.test(q)) return Promise.resolve(state.insertRow ? [state.insertRow] : [])
    if (/AS balance FROM customer_credits WHERE org_id/.test(q)) return Promise.resolve([{ balance: state.balance }])
    if (/FROM customer_credits cc LEFT JOIN invoices/.test(q)) return Promise.resolve([{ id: 'cc1', kind: 'deposit', amount: 100, note: 'Prepaid', invoice_number: null }])
    return Promise.resolve([])
  })
})

const call = (re) => state.calls.find(c => re.test(c.q))
async function run(handler, { method = 'POST', query = {}, body = null, user = MOCK_OWNER } = {}) {
  authenticate.mockResolvedValueOnce(user)
  const res = createMockRes()
  await handler(createMockReq({ method, query, body }), res)
  return res
}

describe('amounts and bodies', () => {
  it('accepts a positive amount with at most two decimals', () => {
    expect(cleanAmount(100)).toEqual({ amount: 100 })
    expect(cleanAmount('588.26')).toEqual({ amount: 588.26 })
    expect(cleanAmount(0.01)).toEqual({ amount: 0.01 })
  })
  it('refuses zero, negative, blank, text, too many decimals and absurd amounts', () => {
    for (const bad of [0, -5, '', null, undefined, 'abc', 10.123, 1e7, NaN, Infinity]) expect(cleanAmount(bad).error).toBeTruthy()
  })
  it('a credit body needs a deposit or refund and a good amount, and trims the note', () => {
    expect(cleanCreditBody({ kind: 'deposit', amount: 1600, note: '  Prepaid, check 118  ' })).toEqual({ value: { kind: 'deposit', amount: 1600, note: 'Prepaid, check 118' } })
    expect(cleanCreditBody({ kind: 'refund', amount: 50 }).value.note).toBeNull()
    expect(cleanCreditBody({ kind: 'adjustment', amount: 5 }).error).toBeTruthy()
    expect(cleanCreditBody({ kind: 'deposit', amount: -5 }).error).toBeTruthy()
    expect(cleanCreditBody(null).error).toBeTruthy()
    expect(cleanCreditBody({ kind: 'deposit', amount: 5, note: 'x'.repeat(500) }).value.note).toHaveLength(200)
  })
})

describe('POST /api/customers?action=credit', () => {
  const body = (o = {}) => ({ customer_id: VALID_UUID, kind: 'deposit', amount: 1600, note: 'Prepaid', ...o })

  it('records a deposit and returns the new balance, scoped to the organization', async () => {
    const res = await run(customers, { query: { action: 'credit' }, body: body() })
    expect(res.statusCode).toBe(201)
    expect(res._body.balance).toBe(100)
    const ins = call(/INSERT INTO customer_credits/)
    expect(ins.values).toContain(MOCK_OWNER.orgId)
    expect(ins.values).toContain(1600)
    expect(call(/SELECT id FROM customers WHERE id/).values).toContain(MOCK_OWNER.orgId)
  })

  it('stores a refund as a negative amount', async () => {
    await run(customers, { query: { action: 'credit' }, body: body({ kind: 'refund', amount: 40 }) })
    expect(call(/INSERT INTO customer_credits/).values).toContain(-40)
  })

  it('says 409 when a refund is more than the credit', async () => {
    state.insertRow = null
    const res = await run(customers, { query: { action: 'credit' }, body: body({ kind: 'refund', amount: 9999 }) })
    expect(res.statusCode).toBe(409)
    expect(res._body.code).toBe('over_balance')
  })

  it('refuses technicians, a customer from another organization, and bad input', async () => {
    expect((await run(customers, { query: { action: 'credit' }, body: body(), user: MOCK_TECH })).statusCode).toBe(403)
    state.customerOwned = false
    expect((await run(customers, { query: { action: 'credit' }, body: body() })).statusCode).toBe(404)
    state.customerOwned = true
    expect((await run(customers, { query: { action: 'credit' }, body: body({ amount: 0 }) })).statusCode).toBe(400)
    expect((await run(customers, { query: { action: 'credit' }, body: body({ kind: 'gift' }) })).statusCode).toBe(400)
    expect((await run(customers, { query: { action: 'credit' }, body: body({ customer_id: 'nope' }) })).statusCode).toBe(400)
    expect(state.calls.filter(c => /INSERT INTO customer_credits/.test(c.q))).toHaveLength(0)
  })

  it('an advisor can add credit', async () => {
    expect((await run(customers, { query: { action: 'credit' }, body: body(), user: MOCK_ADVISOR })).statusCode).toBe(201)
  })
})

describe('GET /api/customers?action=credit', () => {
  it('returns the balance and the history', async () => {
    const res = await run(customers, { method: 'GET', query: { action: 'credit', id: VALID_UUID } })
    expect(res.statusCode).toBe(200)
    expect(res._body.balance).toBe(100)
    expect(res._body.entries).toHaveLength(1)
    expect(call(/FROM customer_credits cc LEFT JOIN invoices/).values).toContain(MOCK_OWNER.orgId)
  })
  it('refuses technicians and another organization\'s customer', async () => {
    expect((await run(customers, { method: 'GET', query: { action: 'credit', id: VALID_UUID }, user: MOCK_TECH })).statusCode).toBe(403)
    state.customerOwned = false
    expect((await run(customers, { method: 'GET', query: { action: 'credit', id: VALID_UUID } })).statusCode).toBe(404)
  })
})

describe('POST /api/invoices?action=apply-credit', () => {
  const body = (o = {}) => ({ invoice_id: VALID_UUID, amount: 250, ...o })
  const row = (o = {}) => ({ new_status: null, found_id: VALID_UUID, status: 'unpaid', customer_id: VALID_UUID, ro_id: null, due: 400, balance: 1000, ...o })

  it('applies credit, reports when the invoice is now paid, and scopes the query to the organization', async () => {
    state.apply = row({ new_status: 'paid', due: 250, balance: 750 })
    const res = await run(invoices, { query: { action: 'apply-credit' }, body: body() })
    expect(res.statusCode).toBe(201)
    expect(res._body).toEqual({ applied: 250, paid: true, balance: 750 })
    const q = call(/WITH inv AS/)
    expect(q.values).toContain(MOCK_OWNER.orgId)
    expect(q.values).toContain(250)
    // it is ONE statement: ledger, payment and invoice change together
    expect(q.q).toMatch(/INSERT INTO customer_credits/)
    expect(q.q).toMatch(/INSERT INTO payments/)
    expect(q.q).toMatch(/UPDATE invoices/)
    expect(q.q).toMatch(/'credit'/)
  })

  it('a part use leaves the invoice open', async () => {
    state.apply = row({ new_status: 'unpaid', due: 400, balance: 750 })
    const res = await run(invoices, { query: { action: 'apply-credit' }, body: body({ amount: 100 }) })
    expect(res._body.paid).toBe(false)
  })

  it('a repair-order invoice paid in full moves its repair order to Paid', async () => {
    state.apply = row({ new_status: 'paid', ro_id: 'ro-1' })
    await run(invoices, { query: { action: 'apply-credit' }, body: body() })
    expect(call(/UPDATE repair_orders SET stage = 'Paid'/).values).toContain('ro-1')
  })

  it('says why nothing was applied', async () => {
    const cases = [
      [row({ found_id: null, status: null, customer_id: null }), 404, 'not_found'],
      [row({ status: 'draft' }), 409, 'draft'],
      [row({ status: 'paid' }), 409, 'not_unpaid'],
      [row({ status: 'void' }), 409, 'not_unpaid'],
      [row({ customer_id: null }), 409, 'no_customer'],
      [row({ due: 100 }), 400, 'over_due'],
      [row({ balance: 10 }), 400, 'over_credit'],
    ]
    for (const [apply, status, code] of cases) {
      state.apply = apply
      const res = await run(invoices, { query: { action: 'apply-credit' }, body: body() })
      expect([res.statusCode, res._body.code]).toEqual([status, code])
    }
    expect(call(/UPDATE repair_orders/)).toBeUndefined()
  })

  it('refuses technicians and bad input before touching the database', async () => {
    expect((await run(invoices, { query: { action: 'apply-credit' }, body: body(), user: MOCK_TECH })).statusCode).toBe(403)
    expect((await run(invoices, { query: { action: 'apply-credit' }, body: body({ amount: 0 }) })).statusCode).toBe(400)
    expect((await run(invoices, { query: { action: 'apply-credit' }, body: body({ amount: 1.234 }) })).statusCode).toBe(400)
    expect((await run(invoices, { query: { action: 'apply-credit' }, body: body({ invoice_id: 'nope' }) })).statusCode).toBe(400)
    expect(call(/WITH inv AS/)).toBeUndefined()
  })
})

describe('credit comes back when an invoice is undone or voided', () => {
  it('undoing payments returns credit before refunding the payments', async () => {
    mockSql.mockImplementation((strings, ...values) => {
      const q = strings.join('?').replace(/\s+/g, ' ')
      state.calls.push({ q, values })
      if (/SELECT \* FROM invoices WHERE id/.test(q)) return Promise.resolve([{ id: VALID_UUID, status: 'paid', ro_id: null }])
      if (/SELECT COUNT\(\*\)::int AS n FROM payments/.test(q)) return Promise.resolve([{ n: 1 }])
      if (/UPDATE invoices SET status = 'unpaid'/.test(q)) return Promise.resolve([{ id: VALID_UUID, status: 'unpaid' }])
      return Promise.resolve([])
    })
    const res = await run(invoices, { method: 'PUT', query: { id: VALID_UUID }, body: { status: 'unpaid' } })
    expect(res.statusCode).toBe(200)
    const order = state.calls.map(c => c.q)
    const returned = order.findIndex(q => /WITH cr AS/.test(q))
    // the plain "refund all completed payments" statement (the credit one has "method = 'credit'" in it)
    const refunded = order.findIndex(q => /UPDATE payments SET status = 'refunded' WHERE invoice_id = \? AND org_id = \? AND status = 'completed'/.test(q))
    expect(returned).toBeGreaterThan(-1)
    expect(refunded).toBeGreaterThan(returned)
    expect(state.calls[returned].q).toMatch(/method = 'credit'/)
    expect(state.calls[returned].values).toContain(MOCK_OWNER.orgId)
  })

  it('voiding an invoice returns its credit', async () => {
    mockSql.mockImplementation((strings, ...values) => {
      const q = strings.join('?').replace(/\s+/g, ' ')
      state.calls.push({ q, values })
      if (/SELECT \* FROM invoices WHERE id/.test(q)) return Promise.resolve([{ id: VALID_UUID, status: 'unpaid', ro_id: null }])
      if (/UPDATE invoices SET status = 'void'/.test(q)) return Promise.resolve([{ id: VALID_UUID, status: 'void' }])
      return Promise.resolve([])
    })
    const res = await run(invoices, { method: 'PUT', query: { id: VALID_UUID }, body: { status: 'void' } })
    expect(res.statusCode).toBe(200)
    const order = state.calls.map(c => c.q)
    expect(order.findIndex(q => /WITH cr AS/.test(q))).toBeGreaterThan(-1)
  })
})
