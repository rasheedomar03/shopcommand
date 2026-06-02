import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createMockReq, createMockRes, MOCK_OWNER } from './helpers.js'

const mockCheckoutCreate = vi.fn()
const mockCustomersList = vi.fn(() => Promise.resolve({ data: [] }))
const mockCustomersCreate = vi.fn(() => Promise.resolve({ id: 'cus_123' }))
const mockSubRetrieve = vi.fn()

vi.mock('stripe', () => {
  function MockStripe() {
    this.checkout = { sessions: { create: mockCheckoutCreate } }
    this.customers = { list: mockCustomersList, create: mockCustomersCreate }
    this.subscriptions = { retrieve: mockSubRetrieve }
    this.webhooks = { constructEvent: vi.fn() }
  }
  return { default: MockStripe }
})

vi.mock('@neondatabase/serverless', () => ({
  neon: vi.fn(() => vi.fn(() => Promise.resolve([]))),
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

const { authenticate } = await import('../api/_lib/auth.js')
const { default: handler } = await import('../api/stripe.js')

beforeEach(() => { vi.clearAllMocks() })

describe('POST /api/stripe?action=checkout', () => {
  it('returns 401 without auth', async () => {
    authenticate.mockResolvedValueOnce(null)

    const req = createMockReq({ method: 'POST', query: { action: 'checkout' } })
    const res = createMockRes()
    await handler(req, res)

    expect(res.status).toHaveBeenCalledWith(401)
  })

  it('validates required URLs', async () => {
    authenticate.mockResolvedValueOnce(MOCK_OWNER)

    const req = createMockReq({
      method: 'POST',
      query: { action: 'checkout' },
      body: {},
    })
    const res = createMockRes()
    await handler(req, res)

    expect(res.status).toHaveBeenCalledWith(400)
    expect(res._body.error).toContain('successUrl')
  })

  it('creates checkout session with valid data', async () => {
    authenticate.mockResolvedValueOnce(MOCK_OWNER)
    mockCheckoutCreate.mockResolvedValueOnce({ url: 'https://checkout.stripe.com/session_123' })

    const req = createMockReq({
      method: 'POST',
      query: { action: 'checkout' },
      body: {
        successUrl: 'https://shopcommand.net/settings?success=true',
        cancelUrl: 'https://shopcommand.net/settings',
      },
    })
    const res = createMockRes()
    await handler(req, res)

    expect(res._body.url).toBe('https://checkout.stripe.com/session_123')
    expect(mockCheckoutCreate).toHaveBeenCalled()
  })
})

describe('POST /api/stripe?action=webhook', () => {
  it('rejects non-POST methods', async () => {
    const req = createMockReq({ method: 'GET', query: { action: 'webhook' } })
    const res = createMockRes()
    await handler(req, res)

    expect(res.status).toHaveBeenCalledWith(405)
  })
})

describe('invalid action', () => {
  it('returns 400 for unknown action', async () => {
    authenticate.mockResolvedValueOnce(MOCK_OWNER)

    const req = createMockReq({ method: 'GET', query: { action: 'nonexistent' } })
    const res = createMockRes()
    await handler(req, res)

    expect(res.status).toHaveBeenCalledWith(400)
    expect(res._body.error).toContain('Invalid action')
  })
})
