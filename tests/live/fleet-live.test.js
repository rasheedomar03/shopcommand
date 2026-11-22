import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest'
import { neon } from '@neondatabase/serverless'
import { createMockReq, createMockRes } from '../helpers.js'

// LIVE test of the truck and fleet SQL against a real Postgres. Skipped unless
// SMOKE_DB=1 and DATABASE_URL are set. It creates two throwaway organizations,
// runs the real handlers, then deletes everything it made. Run it ONLY against
// a Neon branch copy (never production):
//   $env:DATABASE_URL = "<branch string>"; $env:SMOKE_DB = "1"
//   npx vitest run tests/live/fleet-live.test.js

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

describe.skipIf(!live)('live truck and fleet API (real SQL)', () => {
  let sql, vehicles, customers, invoices
  const tag = `fleet-${Date.now()}`
  const A = {}, B = {}
  const made = {}

  const as = (ctx, role = 'owner') => ({ userId: null, clerkId: 'x', orgId: ctx.org, shopId: ctx.shop, role, name: 'Smoke', email: 'smoke@example.invalid' })

  async function call(handler, { ctx = A, method = 'GET', query = {}, body = null, role } = {}) {
    current.user = as(ctx, role)
    const res = createMockRes()
    await handler(createMockReq({ method, query, body }), res)
    return res
  }

  beforeAll(async () => {
    sql = neon(process.env.DATABASE_URL)
    vehicles = (await import('../../api/vehicles.js')).default
    customers = (await import('../../api/customers.js')).default
    invoices = (await import('../../api/invoices.js')).default
    for (const [ctx, label] of [[A, 'A'], [B, 'B']]) {
      const [o] = await sql`INSERT INTO organizations (name, owner_clerk_id) VALUES (${`${tag}-${label}`}, ${`${tag}-${label}`}) RETURNING id`
      ctx.org = o.id
      const [s] = await sql`INSERT INTO shops (org_id, name) VALUES (${o.id}, ${`${tag} shop ${label}`}) RETURNING id`
      ctx.shop = s.id
      const [c] = await sql`INSERT INTO customers (org_id, name) VALUES (${o.id}, ${'Ordinary Customer'}) RETURNING id`
      ctx.customer = c.id
    }
  })

  afterAll(async () => {
    if (!sql) return
    for (const ctx of [A, B]) {
      if (!ctx.org) continue
      await sql`DELETE FROM payments WHERE org_id = ${ctx.org}`
      await sql`DELETE FROM invoices WHERE org_id = ${ctx.org}`
      await sql`DELETE FROM vehicles WHERE org_id = ${ctx.org}`
      await sql`DELETE FROM customers WHERE org_id = ${ctx.org}`
      await sql`DELETE FROM shops WHERE org_id = ${ctx.org}`
      await sql`DELETE FROM organizations WHERE id = ${ctx.org}`
    }
  })

  it('an owner creates the fleet customer', async () => {
    const res = await call(customers, { method: 'POST', body: { name: 'Our Fleet', is_fleet: true } })
    expect(res.statusCode).toBe(201)
    expect(res._body.is_fleet).toBe(true)
    made.fleet = res._body.id
  })

  it('an advisor cannot create or change the fleet', async () => {
    expect((await call(customers, { method: 'POST', body: { name: 'Sneaky Fleet', is_fleet: true }, role: 'advisor' })).statusCode).toBe(403)
    expect((await call(customers, { method: 'PUT', query: { id: A.customer }, body: { is_fleet: true }, role: 'advisor' })).statusCode).toBe(403)
    const [{ n }] = await sql`SELECT COUNT(*)::int AS n FROM customers WHERE org_id = ${A.org} AND is_fleet`
    expect(n).toBe(1)
  })

  it('the customer list carries the fleet flag', async () => {
    const res = await call(customers)
    expect(res.statusCode).toBe(200)
    expect(res._body.find(c => c.id === made.fleet).is_fleet).toBe(true)
    expect(res._body.find(c => c.id === A.customer).is_fleet).toBe(false)
  })

  it('saves a truck with its number, trim and mileage', async () => {
    const res = await call(vehicles, { method: 'POST', body: { customer_id: made.fleet, year: 2019, make: 'Freightliner', model: 'Cascadia', vin: '1FUJGLDR5CLBP8834', unit_number: ' 5500 ', trim: 'Sleeper', last_mileage: 412000 } })
    expect(res.statusCode).toBe(201)
    expect(res._body.unit_number).toBe('5500')
    expect(res._body.trim).toBe('Sleeper')
    expect(res._body.last_mileage).toBe(412000)
    made.truck = res._body.id
  })

  it('refuses a bad VIN, a long truck number and a bad mileage', async () => {
    for (const bad of [{ vin: 'TOOSHORT' }, { unit_number: 'x'.repeat(41) }, { last_mileage: -5 }]) {
      expect((await call(vehicles, { method: 'POST', body: { customer_id: made.fleet, ...bad } })).statusCode).toBe(400)
    }
  })

  it('lists only the fleet trucks, with the customer name, and never another organization\'s', async () => {
    await call(vehicles, { method: 'POST', body: { customer_id: A.customer, make: 'Ordinary', unit_number: 'NOT-FLEET' } }) // an ordinary customer's vehicle
    const res = await call(vehicles, { query: { fleet: '1' } })
    expect(res.statusCode).toBe(200)
    expect(res._body.map(v => v.unit_number)).toEqual(['5500'])
    expect(res._body[0].customer_name).toBe('Our Fleet')
    const other = await call(vehicles, { ctx: B, query: { fleet: '1' } })
    expect(other._body).toEqual([])
  })

  it('lists one customer\'s trucks, scoped to the organization', async () => {
    expect((await call(vehicles, { query: { customer_id: made.fleet } }))._body).toHaveLength(1)
    expect((await call(vehicles, { ctx: B, query: { customer_id: made.fleet } }))._body).toEqual([])
  })

  it('refuses to add a truck to a customer from another organization', async () => {
    const res = await call(vehicles, { ctx: B, method: 'POST', body: { customer_id: made.fleet, unit_number: 'STOLEN' } })
    expect(res.statusCode).toBe(404)
    const [{ n }] = await sql`SELECT COUNT(*)::int AS n FROM vehicles WHERE unit_number = 'STOLEN'`
    expect(n).toBe(0)
  })

  it('edits a truck and keeps the fields that were not sent', async () => {
    const res = await call(vehicles, { method: 'PUT', query: { id: made.truck }, body: { unit_number: '5501', last_mileage: 415500 } })
    expect(res.statusCode).toBe(200)
    expect(res._body.unit_number).toBe('5501')
    expect(res._body.last_mileage).toBe(415500)
    expect(res._body.vin).toBe('1FUJGLDR5CLBP8834') // untouched
    expect(res._body.trim).toBe('Sleeper')
    // another organization cannot edit it
    expect((await call(vehicles, { ctx: B, method: 'PUT', query: { id: made.truck }, body: { unit_number: 'HIJACK' } })).statusCode).toBe(404)
  })

  it('an invoice is saved for a truck and as an internal (fleet) invoice', async () => {
    const res = await call(invoices, { method: 'POST', body: {
      manual: true, shop_id: A.shop, customer_id: made.fleet, vehicle_id: made.truck, is_internal: true, number: `${tag}-001`,
      customer_name: 'Our Fleet', unit_number: '5501', lines: [{ desc: 'Brake inspection', type: 'labor', qty: 1, price: 85 }],
    } })
    expect(res.statusCode).toBe(201)
    expect(res._body.vehicle_id).toBe(made.truck)
    expect(res._body.is_internal).toBe(true)
    made.invoice = res._body.id
    const list = await call(invoices)
    expect(list._body.find(i => i.id === made.invoice).vehicle_id).toBe(made.truck)
  })

  it('refuses an invoice for another organization\'s truck', async () => {
    const res = await call(invoices, { ctx: B, method: 'POST', body: {
      manual: true, shop_id: B.shop, vehicle_id: made.truck, number: `${tag}-b1`, customer_name: 'B Customer', lines: [{ desc: 'x', type: 'labor', qty: 1, price: 1 }],
    } })
    expect(res.statusCode).toBe(404)
  })

  it('a truck with invoices cannot be deleted (the database refuses, the API says 409)', async () => {
    const res = await call(vehicles, { method: 'DELETE', query: { id: made.truck } })
    expect(res.statusCode).toBe(409)
    expect(res._body.code).toBe('has_invoices')
    const [{ n }] = await sql`SELECT COUNT(*)::int AS n FROM vehicles WHERE id = ${made.truck}`
    expect(n).toBe(1)
  })

  it('a truck with no invoices can be deleted, and not by another organization', async () => {
    const spare = await call(vehicles, { method: 'POST', body: { customer_id: made.fleet, unit_number: 'SPARE' } })
    expect((await call(vehicles, { ctx: B, method: 'DELETE', query: { id: spare._body.id } })).statusCode).toBe(404)
    const del = await call(vehicles, { method: 'DELETE', query: { id: spare._body.id } })
    expect(del.statusCode).toBe(200)
    expect(del._body.deleted).toBe(spare._body.id)
  })
})
