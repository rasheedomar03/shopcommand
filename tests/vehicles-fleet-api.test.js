import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createMockReq, createMockRes, MOCK_OWNER, MOCK_ADVISOR, VALID_UUID } from './helpers.js'

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
const { default: vehicles } = await import('../api/vehicles.js')
const { default: customers } = await import('../api/customers.js')

const state = { calls: [], customerOwned: true, deleteError: null }

beforeEach(() => {
  vi.clearAllMocks()
  Object.assign(state, { calls: [], customerOwned: true, deleteError: null })
  mockSql.mockReset()
  mockSql.mockImplementation((strings, ...values) => {
    const q = strings.join('?').replace(/\s+/g, ' ')
    state.calls.push({ q, values })
    if (/SELECT id FROM customers WHERE id/.test(q)) return Promise.resolve(state.customerOwned ? [{ id: VALID_UUID }] : [])
    if (/DELETE FROM vehicles/.test(q)) return state.deleteError ? Promise.reject(state.deleteError) : Promise.resolve([{ id: VALID_UUID }])
    if (/INSERT INTO vehicles/.test(q)) return Promise.resolve([{ id: 'v-new' }])
    if (/UPDATE vehicles/.test(q)) return Promise.resolve([{ id: VALID_UUID }])
    if (/INSERT INTO customers/.test(q)) return Promise.resolve([{ id: 'c-new', is_fleet: true }])
    if (/UPDATE customers/.test(q)) return Promise.resolve([{ id: VALID_UUID }])
    return Promise.resolve([])
  })
})

const call = (re) => state.calls.find(c => re.test(c.q))
async function run(handler, { method = 'GET', query = {}, body = null, user = MOCK_OWNER } = {}) {
  authenticate.mockResolvedValueOnce(user)
  const res = createMockRes()
  await handler(createMockReq({ method, query, body }), res)
  return res
}

describe('GET /api/vehicles?fleet=1', () => {
  it('lists the trucks of fleet customers, scoped to the organization', async () => {
    const res = await run(vehicles, { query: { fleet: '1' } })
    expect(res.statusCode).toBe(200)
    const q = call(/FROM vehicles v JOIN customers c/)
    expect(q.q).toMatch(/c\.is_fleet = true/)
    expect(q.values).toContain(MOCK_OWNER.orgId)
  })
  it('still needs a customer id for the normal list', async () => {
    expect((await run(vehicles, { query: {} })).statusCode).toBe(400)
  })
})

describe('POST /api/vehicles', () => {
  const good = { customer_id: VALID_UUID, year: 2019, make: 'Freightliner', model: 'Cascadia', unit_number: ' 5500 ', trim: 'Sleeper', last_mileage: 412000 }

  it('saves the truck number, trim and mileage', async () => {
    const res = await run(vehicles, { method: 'POST', body: good })
    expect(res.statusCode).toBe(201)
    const ins = call(/INSERT INTO vehicles/)
    expect(ins.q).toMatch(/unit_number, trim, last_mileage/)
    expect(ins.values).toContain('5500') // trimmed
    expect(ins.values).toContain('Sleeper')
    expect(ins.values).toContain(412000)
    expect(ins.values).toContain(MOCK_OWNER.orgId)
  })

  it('refuses a customer from another organization', async () => {
    state.customerOwned = false
    const res = await run(vehicles, { method: 'POST', body: good })
    expect(res.statusCode).toBe(404)
    expect(call(/INSERT INTO vehicles/)).toBeUndefined()
    expect(call(/SELECT id FROM customers WHERE id/).values).toContain(MOCK_OWNER.orgId)
  })

  it('validates the new fields', async () => {
    for (const bad of [{ unit_number: 'x'.repeat(41) }, { trim: 'x'.repeat(61) }, { last_mileage: -1 }, { last_mileage: 1.5 }, { last_mileage: 20_000_000 }, { unit_number: 5500 }]) {
      const res = await run(vehicles, { method: 'POST', body: { customer_id: VALID_UUID, ...bad } })
      expect(res.statusCode).toBe(400)
    }
    expect(call(/INSERT INTO vehicles/)).toBeUndefined()
  })

  it('leaves the new fields empty when they are not sent', async () => {
    await run(vehicles, { method: 'POST', body: { customer_id: VALID_UUID, make: 'Mack' } })
    const ins = call(/INSERT INTO vehicles/)
    expect(ins.values.filter(v => v === null).length).toBeGreaterThanOrEqual(3)
  })
})

describe('PUT and DELETE /api/vehicles', () => {
  it('updates the truck fields within the organization', async () => {
    const res = await run(vehicles, { method: 'PUT', query: { id: VALID_UUID }, body: { unit_number: '236', last_mileage: 99 } })
    expect(res.statusCode).toBe(200)
    const upd = call(/UPDATE vehicles/)
    expect(upd.values).toContain('236')
    expect(upd.values).toContain(MOCK_OWNER.orgId)
  })

  // values in the UPDATE, in order: [year?, year, make?, make, model?, model, vin?, vin,
  // license?, license, unit?, unit, trim?, trim, mileage?, mileage, id, org]
  it('a field sent blank is cleared; a field left out is kept', async () => {
    const res = await run(vehicles, { method: 'PUT', query: { id: VALID_UUID }, body: { vin: '', last_mileage: null, unit_number: '5500' } })
    expect(res.statusCode).toBe(200)
    const upd = call(/UPDATE vehicles/)
    expect(upd.q).toContain('vin = CASE WHEN ? THEN ? ELSE vin END')
    const [yearSent, , makeSent, , modelSent, , vinSent, vinVal, licenseSent, , unitSent, unitVal, trimSent, , mileSent, mileVal] = upd.values
    // sent (blank) -> flagged as sent with an empty value, so the column is set to NULL
    expect(vinSent).toBe(true); expect(vinVal).toBeNull()
    expect(mileSent).toBe(true); expect(mileVal).toBeNull()
    expect(unitSent).toBe(true); expect(unitVal).toBe('5500')
    // left out -> not flagged, so the column keeps what it had
    for (const flag of [yearSent, makeSent, modelSent, licenseSent, trimSent]) expect(flag).toBe(false)
  })

  it('still refuses a bad VIN, but accepts a blank one', async () => {
    expect((await run(vehicles, { method: 'PUT', query: { id: VALID_UUID }, body: { vin: 'BAD' } })).statusCode).toBe(400)
    expect((await run(vehicles, { method: 'PUT', query: { id: VALID_UUID }, body: { vin: '' } })).statusCode).toBe(200)
  })

  it('a truck with invoices cannot be deleted (409, not a crash)', async () => {
    state.deleteError = Object.assign(new Error('fk'), { code: '23503' })
    const res = await run(vehicles, { method: 'DELETE', query: { id: VALID_UUID } })
    expect(res.statusCode).toBe(409)
    expect(res._body.code).toBe('has_invoices')
  })

  it('deletes a truck with no invoices', async () => {
    const res = await run(vehicles, { method: 'DELETE', query: { id: VALID_UUID } })
    expect(res.statusCode).toBe(200)
    expect(res._body.deleted).toBe(VALID_UUID)
  })
})

describe('the fleet flag on customers', () => {
  it('an owner can create the fleet customer', async () => {
    const res = await run(customers, { method: 'POST', body: { name: 'Our Fleet', is_fleet: true } })
    expect(res.statusCode).toBe(201)
    const ins = call(/INSERT INTO customers/)
    expect(ins.q).toMatch(/is_fleet/)
    expect(ins.values).toContain(true)
  })

  it('an advisor cannot create or change the fleet', async () => {
    expect((await run(customers, { method: 'POST', body: { name: 'Our Fleet', is_fleet: true }, user: MOCK_ADVISOR })).statusCode).toBe(403)
    expect((await run(customers, { method: 'PUT', query: { id: VALID_UUID }, body: { is_fleet: true }, user: MOCK_ADVISOR })).statusCode).toBe(403)
    expect(call(/INSERT INTO customers/)).toBeUndefined()
    expect(call(/UPDATE customers/)).toBeUndefined()
  })

  it('an ordinary customer is not a fleet customer, and an advisor can still add one', async () => {
    const res = await run(customers, { method: 'POST', body: { name: 'Zain Trucking' }, user: MOCK_ADVISOR })
    expect(res.statusCode).toBe(201)
    expect(call(/INSERT INTO customers/).values).toContain(false)
  })

  it('refuses a flag that is not true or false', async () => {
    expect((await run(customers, { method: 'POST', body: { name: 'Our Fleet', is_fleet: 'yes' } })).statusCode).toBe(400)
  })

  it('an edit that does not mention the flag leaves it alone', async () => {
    await run(customers, { method: 'PUT', query: { id: VALID_UUID }, body: { phone: '555-0100' }, user: MOCK_ADVISOR })
    expect(call(/UPDATE customers/).values).toContain(null) // COALESCE keeps the stored flag
  })

  it('the customer list returns the flag', async () => {
    await run(customers, { method: 'GET' })
    expect(call(/FROM customers c/).q).toMatch(/c\.is_fleet/)
  })
})
