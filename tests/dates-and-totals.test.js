import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createMockReq, createMockRes, MOCK_OWNER, VALID_UUID } from './helpers.js'
import { localYmd, formatDate } from '../src/lib/utils.js'
import { roTotalFromData } from '../api/_lib/ro-total.js'

// The shop's own day (not UTC), a repair order that was never saved by hand still
// invoices for what its lines add up to, and a new order can start at a chosen stage.

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
vi.mock('resend', () => ({ Resend: vi.fn(() => ({ emails: { send: vi.fn() } })) }))

const { authenticate } = await import('../api/_lib/auth.js')
const { default: invoices } = await import('../api/invoices.js')
const { default: repairOrders } = await import('../api/repair-orders.js')

const state = { ro: null, calls: [] }

beforeEach(() => {
  vi.clearAllMocks()
  Object.assign(state, { ro: null, calls: [] })
  mockSql.mockReset()
  mockSql.mockImplementation((strings, ...values) => {
    const q = strings.join('?').replace(/\s+/g, ' ')
    state.calls.push({ q, values })
    if (/SELECT \* FROM repair_orders WHERE id/.test(q)) return Promise.resolve(state.ro ? [state.ro] : [])
    if (/SELECT id FROM invoices WHERE ro_id/.test(q)) return Promise.resolve([])
    if (/INSERT INTO invoices \(org_id, ro_id, amount\)/.test(q)) return Promise.resolve([{ id: 'inv1', amount: values[2] }])
    if (/SELECT COUNT\(\*\) AS cnt FROM repair_orders/.test(q)) return Promise.resolve([{ cnt: 2 }])
    if (/INSERT INTO repair_orders/.test(q)) return Promise.resolve([{ id: VALID_UUID, ro_number: values[6], stage: values[9] }])
    return Promise.resolve([])
  })
})

const ran = (re) => state.calls.filter(c => re.test(c.q))

describe('the shop\'s own day', () => {
  it('an evening in the US is still today (UTC would already say tomorrow)', () => {
    // 9:30 PM on Nov 21, in whatever zone this machine uses
    expect(localYmd(new Date(2026, 10, 21, 21, 30))).toBe('2026-11-21')
    expect(localYmd(new Date(2026, 0, 1, 0, 5))).toBe('2026-01-01')
  })
  it('a plain day passes through, and nonsense gives an empty string', () => {
    expect(localYmd('2026-11-22')).toBe('2026-11-22')
    expect(localYmd('not a date')).toBe('')
    expect(localYmd('')).toBe('')
  })
  it('no argument is today, but a missing date is NOT today', () => {
    expect(localYmd()).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    expect(localYmd(undefined)).toBe('')
    expect(localYmd(null)).toBe('')
  })
  it('a plain day shows as that day, not the day before', () => {
    expect(formatDate('2026-11-22')).toBe('Nov 22, 2026')
  })
})

describe('roTotalFromData', () => {
  it('adds services and parts (price x quantity) and 8.5% tax', () => {
    const total = roTotalFromData({
      services: [{ name: 'Oil change', price: 89.99 }],
      partsUsed: [{ name: 'Pads', price: 65, qty: 1 }],
    })
    expect(total).toBe(168.16)
  })
  it('handles blanks, text prices and no data', () => {
    expect(roTotalFromData(null)).toBe(0)
    expect(roTotalFromData({})).toBe(0)
    expect(roTotalFromData({ services: [{ name: 'x', price: '' }], partsUsed: [{ price: '10', qty: '2' }] })).toBe(21.7)
  })
})

describe('invoicing a repair order that was never saved by hand', () => {
  async function invoice() {
    authenticate.mockResolvedValueOnce(MOCK_OWNER)
    const res = createMockRes()
    await invoices(createMockReq({ method: 'POST', body: { ro_id: VALID_UUID } }), res)
    return res
  }

  it('uses what the lines add up to instead of a $0 invoice, and stores it on the order', async () => {
    state.ro = { id: VALID_UUID, stage: 'Complete', total: '0.00', data: { services: [{ name: 'Oil change', price: 89.99 }], partsUsed: [{ price: 65, qty: 1 }] } }
    const res = await invoice()
    expect(res.statusCode).toBe(201)
    expect(ran(/INSERT INTO invoices/)[0].values[2]).toBe(168.16)
    expect(ran(/UPDATE repair_orders SET total/)[0].values[0]).toBe(168.16)
  })

  it('keeps a total that was saved', async () => {
    state.ro = { id: VALID_UUID, stage: 'Complete', total: '141.04', data: { services: [{ price: 1 }] } }
    await invoice()
    expect(ran(/INSERT INTO invoices/)[0].values[2]).toBe(141.04)
    expect(ran(/UPDATE repair_orders SET total/)).toHaveLength(0)
  })

  it('a job with nothing priced stays $0 (a free inspection is allowed)', async () => {
    state.ro = { id: VALID_UUID, stage: 'Complete', total: '0.00', data: {} }
    await invoice()
    expect(ran(/INSERT INTO invoices/)[0].values[2]).toBe(0)
  })
})

describe('creating a repair order', () => {
  async function create(body) {
    authenticate.mockResolvedValueOnce(MOCK_OWNER)
    const res = createMockRes()
    await repairOrders(createMockReq({ method: 'POST', body: { shop_id: VALID_UUID, customer_id: VALID_UUID, ...body } }), res)
    return res
  }
  const utcDay = () => new Date().toISOString().slice(0, 10).replace(/-/g, '')

  it('starts at the stage you chose', async () => {
    const res = await create({ stage: 'In Progress' })
    expect(res.statusCode).toBe(201)
    expect(ran(/INSERT INTO repair_orders/)[0].values[9]).toBe('In Progress')
  })

  it('starts at Estimate when no stage is sent', async () => {
    await create({})
    expect(ran(/INSERT INTO repair_orders/)[0].values[9]).toBe('Estimate')
  })

  it('refuses Invoiced and Paid as a starting stage (they come from invoicing and paying)', async () => {
    for (const stage of ['Invoiced', 'Paid', 'Nonsense']) {
      const res = await create({ stage })
      expect(res.statusCode).toBe(400)
    }
    expect(ran(/INSERT INTO repair_orders/)).toHaveLength(0)
  })

  it('uses the shop\'s own day in the number when it is within a day of the server\'s', async () => {
    const d = new Date(); d.setUTCDate(d.getUTCDate() - 1)
    const yesterday = d.toISOString().slice(0, 10).replace(/-/g, '')
    await create({ local_date: yesterday })
    expect(ran(/INSERT INTO repair_orders/)[0].values[6]).toBe(`RO-${yesterday}-0003`)
  })

  it('ignores a date that is far off or not a date', async () => {
    await create({ local_date: '19990101' })
    expect(ran(/INSERT INTO repair_orders/)[0].values[6]).toBe(`RO-${utcDay()}-0003`)
    state.calls.length = 0
    await create({ local_date: 'abc' })
    expect(ran(/INSERT INTO repair_orders/)[0].values[6]).toBe(`RO-${utcDay()}-0003`)
  })
})
