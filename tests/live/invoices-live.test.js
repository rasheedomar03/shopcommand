import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest'
import { neon } from '@neondatabase/serverless'
import { createMockReq, createMockRes } from '../helpers.js'

// LIVE smoke test for the from-scratch invoice API, run against a real Postgres.
// Skipped unless SMOKE_DB=1. It creates two throwaway organizations, exercises
// the real handler and the real SQL, then deletes everything it made.
// Run it ONLY against a Neon branch copy (never production):
//   $env:DATABASE_URL = "<api-test branch string>"; $env:SMOKE_DB = "1"
//   npx vitest run tests/live/invoices-live.test.js

const live = process.env.SMOKE_DB === '1' && !!process.env.DATABASE_URL

const current = vi.hoisted(() => ({ user: null }))
vi.mock('../../api/_lib/auth.js', () => ({
  authenticate: vi.fn(() => Promise.resolve(current.user)),
  setRlsContext: vi.fn(() => Promise.resolve()),
}))
vi.mock('../../api/_lib/rate-limit.js', () => ({ rateLimit: vi.fn(() => true) }))
vi.mock('../../api/_lib/logger.js', () => ({
  logger: { error: vi.fn((...a) => console.error('API ERROR', ...a)), warn: vi.fn((...a) => console.warn('API WARN', ...a)), info: vi.fn(), debug: vi.fn() },
}))

describe.skipIf(!live)('live invoice API (real SQL)', () => {
  let sql, handler
  const tag = `smoke-${Date.now()}`
  const A = {}, B = {}
  const made = {}

  const as = (ctx, role = 'owner') => ({ userId: null, clerkId: 'x', orgId: ctx.org, shopId: ctx.shop, role, name: 'Smoke', email: 'smoke@example.invalid' })

  async function call({ ctx = A, method = 'POST', query = {}, body = {}, role } = {}) {
    current.user = as(ctx, role)
    const res = createMockRes()
    await handler(createMockReq({ method, query, body }), res)
    return res
  }

  beforeAll(async () => {
    sql = neon(process.env.DATABASE_URL)
    handler = (await import('../../api/invoices.js')).default
    for (const [ctx, label] of [[A, 'A'], [B, 'B']]) {
      const [o] = await sql`INSERT INTO organizations (name, owner_clerk_id) VALUES (${`${tag}-${label}`}, ${`${tag}-${label}`}) RETURNING id`
      ctx.org = o.id
      const [s] = await sql`INSERT INTO shops (org_id, name) VALUES (${o.id}, ${`${tag} shop ${label}`}) RETURNING id`
      ctx.shop = s.id
      const [c] = await sql`INSERT INTO customers (org_id, name) VALUES (${o.id}, ${'Zain Trucking'}) RETURNING id`
      ctx.customer = c.id
    }
  })

  afterAll(async () => {
    if (!sql) return
    for (const ctx of [A, B]) {
      if (!ctx.org) continue
      await sql`DELETE FROM payments WHERE org_id = ${ctx.org}`
      await sql`DELETE FROM customer_credits WHERE org_id = ${ctx.org}`
      await sql`DELETE FROM invoices WHERE org_id = ${ctx.org}`
      await sql`DELETE FROM customers WHERE org_id = ${ctx.org}`
      await sql`DELETE FROM shops WHERE org_id = ${ctx.org}`
      await sql`DELETE FROM organizations WHERE id = ${ctx.org}`
    }
  })

  const body = (extra = {}) => ({
    manual: true, shop_id: A.shop, customer_id: A.customer, customer_name: 'Zain Trucking', unit_number: '236', vin: '1FUJGLDR5CLBP8834',
    tax_rate: 8.25, card_fee: true, card_fee_rate: 3, number: `${tag}-001`,
    lines: [{ desc: 'Air line', type: 'part', qty: 3, price: 20 }, { desc: 'Diagnostics', type: 'labor', qty: 1.5, price: 100 }],
    ...extra,
  })

  it('creates an invoice with server-computed totals', async () => {
    const res = await call({ body: body({ total: 1, amount: 1 }) })
    expect(res.statusCode).toBe(201)
    // parts 60 + labor 150 = 210; tax 8.25% of 60 = 4.95; fee 3% of 214.95 = 6.45; total 221.40
    expect(Number(res._body.amount)).toBe(221.4)
    expect(Number(res._body.subtotal)).toBe(210)
    expect(Number(res._body.tax)).toBe(4.95)
    expect(Number(res._body.card_fee_amount)).toBe(6.45)
    expect(res._body.source).toBe('manual')
    expect(res._body.ro_id).toBeNull()
    expect(res._body.lines).toHaveLength(2)
    made.id = res._body.id
  })

  it('rejects a duplicate number with 409', async () => {
    const res = await call({ body: body() })
    expect(res.statusCode).toBe(409)
    expect(res._body.code).toBe('number_taken')
  })

  it('creates with a generated number when none is given', async () => {
    const res = await call({ body: body({ number: undefined, draft: true }) })
    expect(res.statusCode).toBe(201)
    expect(res._body.number).toMatch(/^INV-\d{6}-\d{3}$/)
    expect(res._body.status).toBe('draft')
    made.draftId = res._body.id
  })

  it('lists and reads it back with the customer and truck', async () => {
    const list = await call({ method: 'GET' })
    expect(list.statusCode).toBe(200)
    const row = list._body.find(r => r.id === made.id)
    expect(row.customer_name).toBe('Zain Trucking')
    expect(row.unit_number).toBe('236')
    expect(Number(row.amount_paid)).toBe(0)
    const one = await call({ method: 'GET', query: { id: made.id } })
    expect(one.statusCode).toBe(200)
    expect(one._body.vin).toBe('1FUJGLDR5CLBP8834')
  })

  it('edits it and recomputes', async () => {
    const res = await call({ method: 'PUT', query: { id: made.id }, body: body({ lines: [{ desc: 'Air line', type: 'part', qty: 1, price: 100 }], card_fee: false, number: `${tag}-001` }) })
    expect(res.statusCode).toBe(200)
    expect(Number(res._body.amount)).toBe(108.25)
    expect(res._body.card_fee_rate).toBeNull()
  })

  it('refuses to edit into another invoice\'s number', async () => {
    const res = await call({ method: 'PUT', query: { id: made.draftId }, body: body({ number: `${tag}-001` }) })
    expect(res.statusCode).toBe(409)
  })

  it('marks a draft as sent, and a sent invoice back to draft', async () => {
    let res = await call({ method: 'PUT', query: { id: made.draftId }, body: { status: 'unpaid' } })
    expect(res.statusCode).toBe(200)
    expect(res._body.status).toBe('unpaid')
    res = await call({ method: 'PUT', query: { id: made.draftId }, body: { status: 'draft' } })
    expect(res._body.status).toBe('draft')
  })

  it('takes a part payment, then the rest, and marks it paid', async () => {
    let res = await call({ query: { action: 'pay' }, body: { invoice_id: made.id, method: 'cash', amount: 50 } })
    expect(res.statusCode).toBe(201)
    expect(res._body.invoice_paid).toBe(false)
    res = await call({ query: { action: 'pay' }, body: { invoice_id: made.id, method: 'visa', last4: '4821' } })
    expect(res.statusCode).toBe(201)
    expect(res._body.invoice_paid).toBe(true)
    const one = await call({ method: 'GET', query: { id: made.id } })
    expect(one._body.status).toBe('paid')
    expect(Number(one._body.amount_paid)).toBe(108.25)
  })

  it('refuses to edit a paid invoice, undoes the payments, then allows edits again', async () => {
    expect((await call({ method: 'PUT', query: { id: made.id }, body: body() })).statusCode).toBe(409)
    const undo = await call({ method: 'PUT', query: { id: made.id }, body: { status: 'unpaid' } })
    expect(undo.statusCode).toBe(200)
    const one = await call({ method: 'GET', query: { id: made.id } })
    expect(one._body.status).toBe('unpaid')
    expect(Number(one._body.amount_paid)).toBe(0)
  })

  it('refuses payment on a draft', async () => {
    const res = await call({ query: { action: 'pay' }, body: { invoice_id: made.draftId, method: 'cash' } })
    expect(res.statusCode).toBe(409)
  })

  it('voids an invoice', async () => {
    const res = await call({ method: 'PUT', query: { id: made.draftId }, body: { status: 'void' } })
    expect(res.statusCode).toBe(200)
    expect(res._body.status).toBe('void')
  })

  it('isolates organizations: B cannot see, edit or pay A, and cannot use A\'s shop or customer', async () => {
    expect((await call({ ctx: B, method: 'GET', query: { id: made.id } })).statusCode).toBe(404)
    expect((await call({ ctx: B, method: 'GET' }))._body.some(r => r.id === made.id)).toBe(false)
    expect((await call({ ctx: B, method: 'PUT', query: { id: made.id }, body: { status: 'void' } })).statusCode).toBe(404)
    expect((await call({ ctx: B, query: { action: 'pay' }, body: { invoice_id: made.id, method: 'cash' } })).statusCode).toBe(404)
    expect((await call({ ctx: B, body: body({ number: `${tag}-b1` }) })).statusCode).toBe(404) // A's shop and customer
  })

  it('refuses a technician', async () => {
    expect((await call({ role: 'tech', body: body({ number: `${tag}-t1` }) })).statusCode).toBe(403)
  })

  it('imports browser invoices, keeps stored amounts, links the customer, and is idempotent', async () => {
    const list = [
      { id: `${tag}-i1`, customerName: 'zain TRUCKING', status: 'paid', created: '2026-10-02T12:00:00', paidAt: '2026-10-05T15:00:00', paymentMethod: 'Visa ending 4821', unitNumber: '236', lines: [{ desc: 'Air line', type: 'part', qty: 3, price: 20 }], subtotal: 60, tax: 4.95, total: 70.01, cardFeeAmount: 5.06 },
      { id: `${tag}-i2`, customerName: 'Someone New', status: 'sent', created: '2026-10-03T12:00:00', services: [{ name: 'Brake job', labor: 200, parts: 100 }], total: 300 },
      { id: `${tag}-i3`, customerName: 'Draftee', status: 'draft', created: '2026-10-04T12:00:00', total: 50, services: [{ name: 'Wash', labor: 50, parts: 0 }] },
      { id: `${tag}-i4`, customerName: 'Part Payer', status: 'partial', amountPaid: 40, created: '2026-10-04T12:00:00', total: 90, services: [{ name: 'Tune', labor: 90, parts: 0 }] },
      { customerName: 'No number', total: 5 },
    ]
    const first = await call({ query: { action: 'import' }, body: { invoices: list } })
    expect(first.statusCode).toBe(200)
    console.log('IMPORT RESULT', JSON.stringify(first._body))
    expect(first._body.imported).toBe(4)
    expect(first._body.failed).toHaveLength(1)
    expect(first._body.importedTotal).toBe(510.01)

    const again = await call({ query: { action: 'import' }, body: { invoices: list } })
    expect(again._body.imported).toBe(0)
    expect(again._body.skipped).toHaveLength(4)

    const rows = await sql`SELECT * FROM invoices WHERE org_id = ${A.org} AND source = 'import' ORDER BY number`
    expect(rows).toHaveLength(4)
    const i1 = rows.find(r => r.number === `${tag}-i1`)
    expect(Number(i1.amount)).toBe(70.01) // kept exactly, not recomputed
    expect(i1.status).toBe('paid')
    expect(i1.customer_id).toBe(A.customer) // linked by name, case-insensitive
    // the driver hands a DATE column back as a JS Date (local midnight)
    const d = new Date(i1.invoice_date)
    expect([d.getFullYear(), d.getMonth() + 1, d.getDate()]).toEqual([2026, 10, 2])
    expect(rows.find(r => r.number === `${tag}-i3`).status).toBe('draft')
    // a missing card fee is stored as 0, never NaN
    for (const r of rows) expect(Number(r.card_fee_amount)).not.toBeNaN()
    expect(Number(rows.find(r => r.number === `${tag}-i2`).card_fee_amount)).toBe(0)

    const pays = await sql`SELECT p.amount, p.method, i.number FROM payments p JOIN invoices i ON i.id = p.invoice_id WHERE p.org_id = ${A.org} AND i.source = 'import' ORDER BY i.number`
    expect(pays.map(p => [p.number, Number(p.amount), p.method])).toEqual([
      [`${tag}-i1`, 70.01, 'visa'],
      [`${tag}-i4`, 40, 'other'],
    ])
  })

  it('an imported part-paid invoice shows its balance in the list', async () => {
    const list = await call({ method: 'GET' })
    const row = list._body.find(r => r.number === `${tag}-i4`)
    expect(Number(row.amount_paid)).toBe(40)
    expect(row.status).toBe('unpaid')
  })

  it('the unique number index holds at the database level', async () => {
    await expect(sql`INSERT INTO invoices (org_id, amount, number, source) VALUES (${A.org}, 1, ${`${tag}-I1`}, 'manual')`).rejects.toMatchObject({ code: '23505' })
  })

  it('a customer or truck with invoices cannot be deleted (RESTRICT)', async () => {
    await expect(sql`DELETE FROM customers WHERE id = ${A.customer}`).rejects.toBeTruthy()
  })

  it('the credits ledger enforces its sign rules', async () => {
    await expect(sql`INSERT INTO customer_credits (org_id, customer_id, kind, amount) VALUES (${A.org}, ${A.customer}, 'deposit', -5)`).rejects.toBeTruthy()
    await expect(sql`INSERT INTO customer_credits (org_id, customer_id, kind, amount) VALUES (${A.org}, ${A.customer}, 'applied', 5)`).rejects.toBeTruthy()
    await sql`INSERT INTO customer_credits (org_id, customer_id, kind, amount) VALUES (${A.org}, ${A.customer}, 'deposit', 1600)`
    await sql`INSERT INTO customer_credits (org_id, customer_id, kind, amount) VALUES (${A.org}, ${A.customer}, 'applied', -250.5)`
    const [{ balance }] = await sql`SELECT SUM(amount) AS balance FROM customer_credits WHERE org_id = ${A.org} AND customer_id = ${A.customer}`
    expect(Number(balance)).toBe(1349.5)
  })
})
