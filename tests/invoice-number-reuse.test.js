import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createMockReq, createMockRes, MOCK_OWNER, VALID_UUID } from './helpers.js'

// A voided invoice used to keep its number for good, so "37" could never be used again.
// Now a new invoice can take the number: the voided one is renamed "37-VOID" and both
// stay on record. A live invoice's number is never touched.

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
const dupErr = () => Object.assign(new Error('duplicate key'), { code: '23505' })

// A tiny in-memory invoices table that enforces "one number per shop, any case"
// the way the real unique index does.
const table = { rows: [] }
const taken = (n, exceptId) => table.rows.some(r => r.number.toLowerCase() === String(n).toLowerCase() && r.id !== exceptId)

beforeEach(() => {
  vi.clearAllMocks()
  table.rows = []
  mockSql.mockReset()
  mockSql.mockImplementation((strings, ...values) => {
    const q = strings.join('?').replace(/\s+/g, ' ')
    if (/FROM shops WHERE id/.test(q)) return Promise.resolve([{ id: SHOP }])
    if (/SELECT \* FROM invoices WHERE id/.test(q)) {
      const r = table.rows.find(x => x.id === values[0]); return Promise.resolve(r ? [r] : [])
    }
    if (/SELECT COUNT\(\*\)::int AS n FROM payments/.test(q)) return Promise.resolve([{ n: 0 }])
    if (/INSERT INTO invoices/.test(q)) {
      const num = values.find(v => typeof v === 'string' && /^INV-\d+/.test(v))
      if (taken(num)) return Promise.reject(dupErr())
      const row = { id: `new-${table.rows.length}`, number: num, status: 'unpaid' }
      table.rows.push(row); return Promise.resolve([row])
    }
    // the look-up of a voided invoice that holds a number
    if (/SELECT id, number FROM invoices WHERE org_id = \? AND lower\(number\) = lower\(\?\) AND status = 'void'/.test(q)) {
      const r = table.rows.find(x => x.number.toLowerCase() === String(values[1]).toLowerCase() && x.status === 'void')
      return Promise.resolve(r ? [{ id: r.id, number: r.number }] : [])
    }
    // renaming that voided invoice
    if (/UPDATE invoices SET number = \? WHERE id = \? AND org_id = \? AND status = 'void'/.test(q)) {
      const [label, id] = values
      if (taken(label, id)) return Promise.reject(dupErr())
      const r = table.rows.find(x => x.id === id && x.status === 'void')
      if (!r) return Promise.resolve([])
      r.number = label; return Promise.resolve([{ id }])
    }
    // editing an invoice's number (manual edit and the plain number edit)
    if (/UPDATE invoices SET amount = \?, number = \?/.test(q) || /UPDATE invoices SET amount = COALESCE/.test(q)) {
      const num = values.find(v => typeof v === 'string' && /^INV-\d+/.test(v))
      const id = values[values.length - 2]
      if (num && taken(num, id)) return Promise.reject(dupErr())
      const r = table.rows.find(x => x.id === id); if (r && num) r.number = num
      return Promise.resolve([{ ...(r || {}), id }])
    }
    return Promise.resolve([])
  })
})

async function send({ method = 'POST', query = {}, body = {} } = {}) {
  authenticate.mockResolvedValueOnce(MOCK_OWNER)
  const res = createMockRes()
  await handler(createMockReq({ method, query, body }), res)
  return res
}

const newInvoice = (number) => ({
  manual: true, shop_id: SHOP, customer_name: 'Zain Trucking', number,
  lines: [{ desc: 'Brake job', type: 'labor', qty: 1, price: 100 }],
})
const numbers = () => table.rows.map(r => `${r.number}:${r.status}`).sort()

describe('reusing the number of a voided invoice', () => {
  it('a new invoice takes the number and the voided one is renamed, both kept', async () => {
    table.rows = [{ id: 'old', number: 'INV-37', status: 'void' }]
    const res = await send({ body: newInvoice('INV-37') })
    expect(res.statusCode).toBe(201)
    expect(numbers()).toEqual(['INV-37-VOID:void', 'INV-37:unpaid'])
  })

  it('works regardless of letter case', async () => {
    table.rows = [{ id: 'old', number: 'inv-37', status: 'void' }]
    const res = await send({ body: newInvoice('INV-37') })
    expect(res.statusCode).toBe(201)
    expect(numbers()).toEqual(['INV-37:unpaid', 'inv-37-VOID:void'])
  })

  it('a second void of the same number gets -VOID-2', async () => {
    table.rows = [{ id: 'a', number: 'INV-37-VOID', status: 'void' }, { id: 'b', number: 'INV-37', status: 'void' }]
    const res = await send({ body: newInvoice('INV-37') })
    expect(res.statusCode).toBe(201)
    expect(numbers()).toEqual(['INV-37-VOID-2:void', 'INV-37-VOID:void', 'INV-37:unpaid'])
  })

  it('never renames a live invoice: the number stays taken (409)', async () => {
    for (const status of ['unpaid', 'draft', 'paid']) {
      table.rows = [{ id: 'live', number: 'INV-37', status }]
      const res = await send({ body: newInvoice('INV-37') })
      expect(res.statusCode).toBe(409)
      expect(res._body.code).toBe('number_taken')
      expect(numbers()).toEqual([`INV-37:${status}`])
    }
  })

  it('an unused number is created without touching anything', async () => {
    table.rows = [{ id: 'old', number: 'INV-36', status: 'void' }]
    const res = await send({ body: newInvoice('INV-37') })
    expect(res.statusCode).toBe(201)
    expect(numbers()).toEqual(['INV-36:void', 'INV-37:unpaid'])
  })

  it('renumbering an existing invoice to a voided number works too', async () => {
    table.rows = [{ id: VALID_UUID, number: 'INV-50', status: 'unpaid' }, { id: 'old', number: 'INV-37', status: 'void' }]
    const res = await send({ method: 'PUT', query: { id: VALID_UUID }, body: { number: 'INV-37' } })
    expect(res.statusCode).toBe(200)
    expect(numbers()).toEqual(['INV-37-VOID:void', 'INV-37:unpaid'])
  })

  it('renumbering to a live invoice\'s number is still refused', async () => {
    table.rows = [{ id: VALID_UUID, number: 'INV-50', status: 'unpaid' }, { id: 'other', number: 'INV-37', status: 'unpaid' }]
    const res = await send({ method: 'PUT', query: { id: VALID_UUID }, body: { number: 'INV-37' } })
    expect(res.statusCode).toBe(409)
    expect(numbers()).toEqual(['INV-37:unpaid', 'INV-50:unpaid'])
  })
})
