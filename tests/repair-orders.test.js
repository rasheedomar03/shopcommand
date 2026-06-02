import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createMockReq, createMockRes, MOCK_OWNER, MOCK_TECH, MOCK_ADVISOR, VALID_UUID } from './helpers.js'

const mockSql = vi.fn(() => Promise.resolve([]))

vi.mock('@neondatabase/serverless', () => ({
  neon: vi.fn(() => mockSql),
}))

vi.mock('../api/_lib/auth.js', () => ({
  authenticate: vi.fn(() => Promise.resolve(null)),
  setRlsContext: vi.fn(() => Promise.resolve()),
}))

vi.mock('../api/_lib/rate-limit.js', () => ({
  rateLimit: vi.fn(() => true),
}))

vi.mock('../api/_lib/logger.js', () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() },
}))

vi.mock('resend', () => ({
  Resend: vi.fn(() => ({
    emails: { send: vi.fn(() => Promise.resolve({ id: 'msg_123' })) },
  })),
}))

const { authenticate } = await import('../api/_lib/auth.js')
const { default: handler } = await import('../api/repair-orders.js')

beforeEach(() => { vi.clearAllMocks() })

describe('GET /api/repair-orders', () => {
  it('returns RO list', async () => {
    authenticate.mockResolvedValueOnce(MOCK_OWNER)
    const ros = [{ id: VALID_UUID, ro_number: 'RO-20260602-0001', stage: 'Estimate' }]
    // 3 filter fragment calls (shopFilter, stageFilter, customerFilter) then main query
    mockSql.mockResolvedValue([])
    mockSql.mockResolvedValueOnce([]) // shopFilter
    mockSql.mockResolvedValueOnce([]) // stageFilter
    mockSql.mockResolvedValueOnce([]) // customerFilter
    mockSql.mockResolvedValueOnce(ros) // main query

    const req = createMockReq({ method: 'GET' })
    const res = createMockRes()
    await handler(req, res)

    expect(res.json).toHaveBeenCalledWith(ros)
  })

  it('returns single RO by id', async () => {
    authenticate.mockResolvedValueOnce(MOCK_OWNER)
    const ro = { id: VALID_UUID, ro_number: 'RO-20260602-0001' }
    mockSql.mockResolvedValueOnce([ro])

    const req = createMockReq({ method: 'GET', query: { id: VALID_UUID } })
    const res = createMockRes()
    await handler(req, res)

    expect(res.json).toHaveBeenCalledWith(ro)
  })

  it('returns 404 for missing RO', async () => {
    authenticate.mockResolvedValueOnce(MOCK_OWNER)
    mockSql.mockResolvedValueOnce([])

    const req = createMockReq({ method: 'GET', query: { id: VALID_UUID } })
    const res = createMockRes()
    await handler(req, res)

    expect(res.status).toHaveBeenCalledWith(404)
  })
})

describe('POST /api/repair-orders', () => {
  it('blocks technicians from creating ROs', async () => {
    authenticate.mockResolvedValueOnce(MOCK_TECH)

    const req = createMockReq({
      method: 'POST',
      body: { shop_id: VALID_UUID, customer_id: VALID_UUID },
    })
    const res = createMockRes()
    await handler(req, res)

    expect(res.status).toHaveBeenCalledWith(403)
  })

  it('validates required fields', async () => {
    authenticate.mockResolvedValueOnce(MOCK_ADVISOR)

    const req = createMockReq({ method: 'POST', body: {} })
    const res = createMockRes()
    await handler(req, res)

    expect(res.status).toHaveBeenCalledWith(400)
    expect(res._body.error).toContain('shop_id')
    expect(res._body.error).toContain('customer_id')
  })

  it('validates UUID formats', async () => {
    authenticate.mockResolvedValueOnce(MOCK_OWNER)

    const req = createMockReq({
      method: 'POST',
      body: { shop_id: 'not-a-uuid', customer_id: 'also-bad' },
    })
    const res = createMockRes()
    await handler(req, res)

    expect(res.status).toHaveBeenCalledWith(400)
  })

  it('validates notes length', async () => {
    authenticate.mockResolvedValueOnce(MOCK_OWNER)

    const req = createMockReq({
      method: 'POST',
      body: { shop_id: VALID_UUID, customer_id: VALID_UUID, notes: 'x'.repeat(5001) },
    })
    const res = createMockRes()
    await handler(req, res)

    expect(res.status).toHaveBeenCalledWith(400)
    expect(res._body.error).toContain('Notes')
  })

  it('creates RO with valid data', async () => {
    authenticate.mockResolvedValueOnce(MOCK_OWNER)
    const newRo = { id: VALID_UUID, ro_number: 'RO-20260602-0001', stage: 'Estimate' }
    mockSql.mockResolvedValueOnce([{ cnt: 0 }]) // sequence count
    mockSql.mockResolvedValueOnce([newRo]) // insert

    const req = createMockReq({
      method: 'POST',
      body: { shop_id: VALID_UUID, customer_id: VALID_UUID },
    })
    const res = createMockRes()
    await handler(req, res)

    expect(res.status).toHaveBeenCalledWith(201)
    expect(res._body).toEqual(newRo)
  })
})

describe('PUT /api/repair-orders', () => {
  it('requires id parameter', async () => {
    authenticate.mockResolvedValueOnce(MOCK_OWNER)

    const req = createMockReq({ method: 'PUT', body: { stage: 'Approved' } })
    const res = createMockRes()
    await handler(req, res)

    expect(res.status).toHaveBeenCalledWith(400)
  })

  it('validates stage values', async () => {
    authenticate.mockResolvedValueOnce(MOCK_OWNER)

    const req = createMockReq({
      method: 'PUT',
      query: { id: VALID_UUID },
      body: { stage: 'InvalidStage' },
    })
    const res = createMockRes()
    await handler(req, res)

    expect(res.status).toHaveBeenCalledWith(400)
    expect(res._body.error).toContain('stage')
  })

  it('limits tech stage transitions to In Progress and Complete', async () => {
    authenticate.mockResolvedValueOnce(MOCK_TECH)

    const req = createMockReq({
      method: 'PUT',
      query: { id: VALID_UUID },
      body: { stage: 'Paid' },
    })
    const res = createMockRes()
    await handler(req, res)

    expect(res.status).toHaveBeenCalledWith(403)
    expect(res._body.error).toContain('Technicians')
  })

  it('allows tech to move to In Progress', async () => {
    authenticate.mockResolvedValueOnce(MOCK_TECH)
    const updated = { id: VALID_UUID, stage: 'In Progress' }
    mockSql.mockResolvedValueOnce([updated])

    const req = createMockReq({
      method: 'PUT',
      query: { id: VALID_UUID },
      body: { stage: 'In Progress' },
    })
    const res = createMockRes()
    await handler(req, res)

    expect(res.json).toHaveBeenCalledWith(updated)
  })
})

describe('POST /api/repair-orders?action=notify', () => {
  it('validates ro_id is required', async () => {
    authenticate.mockResolvedValueOnce(MOCK_OWNER)

    const req = createMockReq({
      method: 'POST',
      query: { action: 'notify' },
      body: { type: 'estimate_ready' },
    })
    const res = createMockRes()
    await handler(req, res)

    expect(res.status).toHaveBeenCalledWith(400)
  })

  it('validates notification type', async () => {
    authenticate.mockResolvedValueOnce(MOCK_OWNER)

    const req = createMockReq({
      method: 'POST',
      query: { action: 'notify' },
      body: { ro_id: VALID_UUID, type: 'bad_type' },
    })
    const res = createMockRes()
    await handler(req, res)

    expect(res.status).toHaveBeenCalledWith(400)
    expect(res._body.error).toContain('type')
  })
})
