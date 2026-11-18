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
let updatedVals

beforeEach(() => {
  vi.clearAllMocks()
  insertedVals = null
  updatedVals = null
  mockSql.mockReset()
  mockSql.mockImplementation((strings, ...vals) => {
    const q = strings.join('?').replace(/\s+/g, ' ')
    if (/INSERT INTO parts/.test(q)) {
      insertedVals = vals
      return Promise.resolve([{ id: VALID_UUID }])
    }
    if (/UPDATE parts SET/.test(q)) {
      updatedVals = vals
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

// UPDATE values, in order: name, sku, category, vendor, qty, min_qty, cost, price, last_ordered, id, org_id
async function updatePart(body) {
  authenticate.mockResolvedValueOnce(MOCK_OWNER)
  const req = createMockReq({ method: 'PUT', query: { action: 'update-part', id: VALID_UUID }, body })
  const res = createMockRes()
  await handler(req, res)
  return res
}

describe('PUT update-part SKU and vendor', () => {
  it('lets the SKU and vendor be cleared to blank', async () => {
    const res = await updatePart({ name: 'Heater hose', sku: '', vendor: '   ' })
    expect(res.statusCode).toBe(200)
    expect(updatedVals[1]).toBe('')
    expect(updatedVals[3]).toBe('')
  })
  it('trims a new SKU and vendor', async () => {
    await updatePart({ sku: '  HH-34  ', vendor: ' NAPA ' })
    expect(updatedVals[1]).toBe('HH-34')
    expect(updatedVals[3]).toBe('NAPA')
  })
  it('leaves SKU and vendor alone when they are not sent (e.g. a quantity-only edit)', async () => {
    await updatePart({ qty: 4 })
    expect(updatedVals[1]).toBeNull()
    expect(updatedVals[3]).toBeNull()
  })
})

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
