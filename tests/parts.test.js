import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createMockReq, createMockRes, MOCK_OWNER, VALID_UUID } from './helpers.js'

// Parts: the minimum quantity defaults to 2 but an explicit 0 must stay 0.

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
const { default: handler } = await import('../api/health.js')

let insertedVals

beforeEach(() => {
  vi.clearAllMocks()
  insertedVals = null
  mockSql.mockReset()
  mockSql.mockImplementation((strings, ...vals) => {
    const q = strings.join('?').replace(/\s+/g, ' ')
    if (/INSERT INTO parts/.test(q)) {
      insertedVals = vals
      return Promise.resolve([{ id: VALID_UUID }])
    }
    return Promise.resolve([])
  })
})

// INSERT values, in order: org_id, shop_id, name, sku, category, vendor, qty, min_qty, cost, price
const MIN_QTY_INDEX = 7

async function addPart(body) {
  authenticate.mockResolvedValueOnce(MOCK_OWNER)
  const req = createMockReq({ method: 'POST', query: { action: 'add-part' }, body: { shop_id: VALID_UUID, name: 'Heater hose', ...body } })
  const res = createMockRes()
  await handler(req, res)
  return res
}

describe('POST add-part minimum quantity', () => {
  it('keeps an explicit minimum of 0', async () => {
    const res = await addPart({ min_qty: 0 })
    expect(res.statusCode).toBe(201)
    expect(insertedVals[MIN_QTY_INDEX]).toBe(0)
  })
  it('keeps a typed minimum', async () => {
    await addPart({ min_qty: 5 })
    expect(insertedVals[MIN_QTY_INDEX]).toBe(5)
  })
  it('defaults to 2 when no minimum is sent', async () => {
    await addPart({})
    expect(insertedVals[MIN_QTY_INDEX]).toBe(2)
  })
  it('defaults to 2 for a blank or non-numeric minimum', async () => {
    await addPart({ min_qty: '' })
    expect(insertedVals[MIN_QTY_INDEX]).toBe(2)
    await addPart({ min_qty: 'abc' })
    expect(insertedVals[MIN_QTY_INDEX]).toBe(2)
  })
  it('never stores a negative minimum', async () => {
    await addPart({ min_qty: -3 })
    expect(insertedVals[MIN_QTY_INDEX]).toBe(0)
  })
})
