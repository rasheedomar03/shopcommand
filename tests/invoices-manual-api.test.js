import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createMockReq, createMockRes, MOCK_OWNER, MOCK_TECH, VALID_UUID } from './helpers.js'

// From-scratch invoices on the server: create, edit, draft/sent, pay, import.

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

const SHOP = '00000000-0000-0000-0000-0000000000a1'
const state = { queries: [], calls: [], invoice: null, shopOk: true, customerOk: true, recorded: 0, existingNumbers: new Set(), insertErrors: [] }

beforeEach(() => {
  vi.clearAllMocks()
  Object.assign(state, { queries: [], calls: [], invoice: null, shopOk: true, customerOk: true, recorded: 0, existingNumbers: new Set(), insertErrors: [] })
  mockSql.mockReset()
  mockSql.mockImplementation((strings, ...values) => {
    const q = strings.join('?').replace(/\s+/g, ' ')
    state.queries.push(q)
    state.calls.push({ q, values })
    if (/FROM shops WHERE id/.test(q)) return Promise.resolve(state.shopOk ? [{ id: SHOP }] : [])
    if (/FROM shops WHERE org_id/.test(q)) return Promise.resolve([{ id: SHOP }])
    if (/FROM customers WHERE id/.test(q)) return Promise.resolve(state.customerOk ? [{ id: 'c1' }] : [])
    if (/FROM customers WHERE org_id/.test(q)) return Promise.resolve([{ id: 'cust-1', name: 'zain trucking' }])
    if (/SELECT COUNT\(\*\)::int AS n FROM payments/.test(q)) return Promise.resolve([{ n: state.recorded }])
    if (/SELECT \* FROM invoices WHERE id/.test(q)) return Promise.resolve(state.invoice ? [state.invoice] : [])
    if (/SELECT i\.id, i\.ro_id, i\.amount/.test(q)) return Promise.resolve(state.invoice ? [state.invoice] : [])
    if (/SELECT COALESCE\(SUM\(amount\)/.test(q)) return Promise.resolve([{ paid_so_far: 0 }])
    if (/INSERT INTO invoices/.test(q)) {
      if (state.insertErrors.length) return Promise.reject(state.insertErrors.shift())
      const number = values.find(v => typeof v === 'string' && /^(INV-|\d{3}$|J2M)/.test(v))
      if (state.existingNumbers.has(String(number).toLowerCase()) && /ON CONFLICT/.test(q)) return Promise.resolve([])
      return Promise.resolve([{ id: 'new-id', number }])
    }
    if (/UPDATE invoices SET/.test(q)) return Promise.resolve([{ id: VALID_UUID, ...(state.invoice || {}) }])
    if (/INSERT INTO payments/.test(q)) return Promise.resolve([{ id: 'p1' }])
    return Promise.resolve([])
  })
})

const dupErr = () => Object.assign(new Error('duplicate key'), { code: '23505' })
const ran = (re) => state.queries.some(q => re.test(q))
const call = (re) => state.calls.find(c => re.test(c.q))

async function send({ method = 'POST', query = {}, body = {}, user = MOCK_OWNER } = {}) {
  authenticate.mockResolvedValueOnce(user)
  const res = createMockRes()
  await handler(createMockReq({ method, query, body }), res)
  return res
}

const goodBody = (extra = {}) => ({
  manual: true, shop_id: SHOP, customer_name: 'Zain Trucking', unit_number: '236',
  tax_rate: 10, lines: [{ desc: 'Air line', type: 'part', qty: 2, price: 50 }], ...extra,
})

describe('POST manual invoice', () => {
  it('creates an unpaid invoice, computing the total on the server', async () => {
    const res = await send({ body: goodBody({ total: 1, amount: 1, subtotal: 1, tax: 1 }) })
    expect(res.statusCode).toBe(201)
    const insert = call(/INSERT INTO invoices/)
    expect(insert.values).toContain(110) // 100 + 10% tax, not the 1 the browser sent
    expect(insert.values).toContain(MOCK_OWNER.orgId)
    expect(insert.q).toMatch(/'manual'/)
    expect(insert.values).toContain('unpaid')
  })

  it('saves a draft when asked', async () => {
    await send({ body: goodBody({ draft: true }) })
    expect(call(/INSERT INTO invoices/).values).toContain('draft')
  })

  it('refuses technicians', async () => {
    const res = await send({ body: goodBody(), user: MOCK_TECH })
    expect(res.statusCode).toBe(403)
    expect(ran(/INSERT INTO invoices/)).toBe(false)
  })

  it('rejects bad input before touching the database', async () => {
    const res = await send({ body: goodBody({ customer_name: '' }) })
    expect(res.statusCode).toBe(400)
    expect(ran(/INSERT INTO invoices/)).toBe(false)
  })

  it('refuses a shop or customer from another organization', async () => {
    state.shopOk = false
    expect((await send({ body: goodBody() })).statusCode).toBe(404)
    state.shopOk = true
    state.customerOk = false
    const res = await send({ body: goodBody({ customer_id: '00000000-0000-0000-0000-0000000000c1' }) })
    expect(res.statusCode).toBe(404)
    expect(ran(/INSERT INTO invoices/)).toBe(false)
  })

  it('scopes the ownership checks to the organization', async () => {
    await send({ body: goodBody({ customer_id: '00000000-0000-0000-0000-0000000000c1' }) })
    expect(call(/FROM shops WHERE id/).values).toContain(MOCK_OWNER.orgId)
    expect(call(/FROM customers WHERE id/).values).toContain(MOCK_OWNER.orgId)
  })

  it('returns 409 when a supplied number is already used', async () => {
    state.insertErrors = [dupErr()]
    const res = await send({ body: goodBody({ number: '032' }) })
    expect(res.statusCode).toBe(409)
    expect(res._body.code).toBe('number_taken')
  })

  it('retries a generated number that collides', async () => {
    state.insertErrors = [dupErr(), dupErr()]
    const res = await send({ body: goodBody() })
    expect(res.statusCode).toBe(201)
    expect(state.queries.filter(q => /INSERT INTO invoices/.test(q)).length).toBe(3)
  })

  it('still creates repair-order invoices the old way', async () => {
    const res = await send({ body: { ro_id: 'not-a-uuid' } })
    expect(res.statusCode).toBe(400)
    expect(res._body.error).toMatch(/ro_id/)
  })
})

describe('PUT manual invoice content', () => {
  it('recomputes totals and scopes the update to the organization', async () => {
    state.invoice = { id: VALID_UUID, ro_id: null, status: 'draft', number: '032' }
    const res = await send({ method: 'PUT', query: { id: VALID_UUID }, body: goodBody({ total: 5 }) })
    expect(res.statusCode).toBe(200)
    const upd = call(/UPDATE invoices SET amount/)
    expect(upd.values).toContain(110)
    expect(upd.values).toContain(MOCK_OWNER.orgId)
  })

  it('refuses to edit once payments are recorded', async () => {
    state.invoice = { id: VALID_UUID, ro_id: null, status: 'unpaid', number: '032' }
    state.recorded = 1
    const res = await send({ method: 'PUT', query: { id: VALID_UUID }, body: goodBody() })
    expect(res.statusCode).toBe(409)
    expect(ran(/UPDATE invoices SET amount/)).toBe(false)
  })

  it('refuses paid, void and repair-order invoices', async () => {
    for (const inv of [{ ro_id: null, status: 'paid' }, { ro_id: null, status: 'void' }, { ro_id: 'ro-1', status: 'unpaid' }]) {
      state.invoice = { id: VALID_UUID, number: 'x', ...inv }
      expect((await send({ method: 'PUT', query: { id: VALID_UUID }, body: goodBody() })).statusCode).toBe(409)
    }
  })

  it('returns 404 for an invoice in another organization', async () => {
    state.invoice = null
    expect((await send({ method: 'PUT', query: { id: VALID_UUID }, body: goodBody() })).statusCode).toBe(404)
  })

  it('returns 409 when the new number collides', async () => {
    state.invoice = { id: VALID_UUID, ro_id: null, status: 'unpaid', number: '032' }
    mockSql.mockImplementation((strings) => {
      const q = strings.join('?').replace(/\s+/g, ' ')
      if (/SELECT \* FROM invoices WHERE id/.test(q)) return Promise.resolve([state.invoice])
      if (/FROM shops WHERE id/.test(q)) return Promise.resolve([{ id: SHOP }])
      if (/COUNT\(\*\)::int AS n FROM payments/.test(q)) return Promise.resolve([{ n: 0 }])
      if (/UPDATE invoices SET amount/.test(q)) return Promise.reject(dupErr())
      return Promise.resolve([])
    })
    const res = await send({ method: 'PUT', query: { id: VALID_UUID }, body: goodBody({ number: '033' }) })
    expect(res.statusCode).toBe(409)
    expect(res._body.code).toBe('number_taken')
  })
})

describe('draft, sent, void and pay without a repair order', () => {
  it('marks a draft as sent', async () => {
    state.invoice = { id: VALID_UUID, ro_id: null, status: 'draft' }
    const res = await send({ method: 'PUT', query: { id: VALID_UUID }, body: { status: 'unpaid' } })
    expect(res.statusCode).toBe(200)
    expect(call(/UPDATE invoices SET status = 'unpaid'/)).toBeTruthy()
    expect(ran(/UPDATE payments/)).toBe(false)
  })

  it('moves a sent invoice with no payments back to draft', async () => {
    state.invoice = { id: VALID_UUID, ro_id: null, status: 'unpaid' }
    const res = await send({ method: 'PUT', query: { id: VALID_UUID }, body: { status: 'draft' } })
    expect(res.statusCode).toBe(200)
    expect(call(/UPDATE invoices SET status = 'draft'/)).toBeTruthy()
  })

  it('will not draft an invoice that has payments, comes from a repair order, or is paid', async () => {
    state.invoice = { id: VALID_UUID, ro_id: null, status: 'unpaid' }
    state.recorded = 1
    expect((await send({ method: 'PUT', query: { id: VALID_UUID }, body: { status: 'draft' } })).statusCode).toBe(409)
    state.recorded = 0
    state.invoice = { id: VALID_UUID, ro_id: 'ro-1', status: 'unpaid' }
    expect((await send({ method: 'PUT', query: { id: VALID_UUID }, body: { status: 'draft' } })).statusCode).toBe(409)
    state.invoice = { id: VALID_UUID, ro_id: null, status: 'paid' }
    expect((await send({ method: 'PUT', query: { id: VALID_UUID }, body: { status: 'draft' } })).statusCode).toBe(409)
  })

  it('voids a from-scratch invoice without touching repair orders', async () => {
    state.invoice = { id: VALID_UUID, ro_id: null, status: 'unpaid' }
    const res = await send({ method: 'PUT', query: { id: VALID_UUID }, body: { status: 'void' } })
    expect(res.statusCode).toBe(200)
    expect(ran(/UPDATE repair_orders/)).toBe(false)
  })

  it('lets a draft be voided but not marked paid', async () => {
    state.invoice = { id: VALID_UUID, ro_id: null, status: 'draft' }
    expect((await send({ method: 'PUT', query: { id: VALID_UUID }, body: { status: 'void' } })).statusCode).toBe(200)
    expect((await send({ method: 'PUT', query: { id: VALID_UUID }, body: { status: 'paid' } })).statusCode).toBe(409)
  })

  it('records a payment on a from-scratch invoice and marks it paid without touching repair orders', async () => {
    state.invoice = { id: VALID_UUID, ro_id: null, amount: 110, status: 'unpaid', shop_id: SHOP, customer_name: 'Zain' }
    const res = await send({ query: { action: 'pay' }, body: { invoice_id: VALID_UUID, method: 'cash' } })
    expect(res.statusCode).toBe(201)
    expect(res._body.invoice_paid).toBe(true)
    expect(call(/INSERT INTO payments/).values).toContain(SHOP)
    expect(ran(/UPDATE invoices SET status = 'paid'/)).toBe(true)
    expect(ran(/UPDATE repair_orders/)).toBe(false)
  })

  it('refuses payment on a draft or a voided invoice', async () => {
    for (const status of ['draft', 'void']) {
      state.invoice = { id: VALID_UUID, ro_id: null, amount: 110, status }
      const res = await send({ query: { action: 'pay' }, body: { invoice_id: VALID_UUID, method: 'cash' } })
      expect(res.statusCode).toBe(409)
    }
    expect(ran(/INSERT INTO payments/)).toBe(false)
  })
})

describe('POST ?action=import', () => {
  const local = (n, extra = {}) => ({ id: n, customerName: 'Zain Trucking', status: 'sent', total: 100, created: '2026-10-02T12:00:00', lines: [{ desc: 'x', type: 'part', qty: 1, price: 100 }], ...extra })

  it('imports invoices exactly as stored and links the customer by name', async () => {
    const res = await send({ query: { action: 'import' }, body: { invoices: [local('032', { total: 70.01 })] } })
    expect(res.statusCode).toBe(200)
    expect(res._body.imported).toBe(1)
    expect(res._body.importedTotal).toBe(70.01)
    const ins = call(/INSERT INTO invoices/)
    expect(ins.values).toContain(70.01)
    expect(ins.values).toContain('cust-1')
    expect(ins.values).toContain(MOCK_OWNER.orgId)
    expect(ins.q).toMatch(/'import'/)
  })

  it('is idempotent: an existing number is skipped, not duplicated or overwritten', async () => {
    state.existingNumbers.add('032')
    const res = await send({ query: { action: 'import' }, body: { invoices: [local('032'), local('033')] } })
    expect(res._body.skipped).toEqual(['032'])
    expect(res._body.imported).toBe(1)
    expect(ran(/ON CONFLICT \(org_id, lower\(number\)\)/)).toBe(true)
  })

  it('writes a payment for paid invoices and none for sent ones', async () => {
    await send({ query: { action: 'import' }, body: { invoices: [local('040', { status: 'paid', paidAt: '2026-10-05T10:00:00', paymentMethod: 'Cash' }), local('041')] } })
    // the invoice and its payment are ONE statement, so they are saved together or not at all
    const stmts = state.calls.filter(c => /INSERT INTO invoices/.test(c.q) && /INSERT INTO payments/.test(c.q))
    expect(stmts.length).toBe(2)
    const paid = stmts.find(c => c.values.includes('cash'))
    expect(paid.values).toContain(100)
    expect(paid.values).toContain(true) // has a payment
    const sent = stmts.find(c => !c.values.includes('cash'))
    expect(sent.values).toContain(false) // no payment for a sent invoice
    expect(ran(/^INSERT INTO payments/)).toBe(false)
  })

  it('gives a payment the org\'s shop even when the browser invoice has no usable shop', async () => {
    await send({ query: { action: 'import' }, body: { invoices: [local('070', { status: 'paid', paymentMethod: 'Cash', shopId: undefined })] } })
    const stmt = call(/INSERT INTO payments/)
    expect(stmt.values).toContain(SHOP)
  })

  it('reports invalid invoices as failed without stopping the rest', async () => {
    const res = await send({ query: { action: 'import' }, body: { invoices: [{ customerName: 'No number', total: 5 }, local('050')] } })
    expect(res._body.imported).toBe(1)
    expect(res._body.failed.length).toBe(1)
  })

  it('does not link a shop that belongs to another organization', async () => {
    await send({ query: { action: 'import' }, body: { invoices: [local('060', { shopId: 'foreign-shop' })] } })
    const ins = call(/INSERT INTO invoices/)
    expect(ins.values).not.toContain('foreign-shop')
  })

  it('refuses technicians, empty lists and oversized batches', async () => {
    expect((await send({ query: { action: 'import' }, body: { invoices: [local('1')] }, user: MOCK_TECH })).statusCode).toBe(403)
    expect((await send({ query: { action: 'import' }, body: { invoices: [] } })).statusCode).toBe(400)
    expect((await send({ query: { action: 'import' }, body: { invoices: Array(201).fill(local('1')) } })).statusCode).toBe(400)
    expect(ran(/INSERT INTO invoices/)).toBe(false)
  })
})
