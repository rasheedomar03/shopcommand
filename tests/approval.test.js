import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createMockReq, createMockRes, MOCK_OWNER, MOCK_ADVISOR, MOCK_TECH } from './helpers.js'

// Customer estimate approval links: helpers, emails, the public routes in
// api/health.js, and link creation in api/repair-orders.js.

const mockSql = vi.fn(() => Promise.resolve([]))
const sendMock = vi.hoisted(() => vi.fn(() => Promise.resolve({ data: { id: 'msg_1' }, error: null })))

vi.mock('@neondatabase/serverless', () => ({ neon: vi.fn(() => mockSql) }))
vi.mock('../api/_lib/auth.js', () => ({
  authenticate: vi.fn(() => Promise.resolve(null)),
  setRlsContext: vi.fn(() => Promise.resolve()),
}))
vi.mock('../api/_lib/rate-limit.js', () => ({ rateLimit: vi.fn(() => true) }))
vi.mock('../api/_lib/logger.js', () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() },
}))
// A regular function, not an arrow: the handler calls it with `new`
vi.mock('resend', () => ({ Resend: vi.fn(function () { this.emails = { send: sendMock } }) }))

const { authenticate } = await import('../api/_lib/auth.js')
const approval = await import('../api/_lib/approval.js')
const emails = await import('../api/_lib/approval-email.js')
const { default: healthHandler } = await import('../api/health.js')
const { default: roHandler } = await import('../api/repair-orders.js')

const { newToken, hashToken, isTokenFormat, tokenMatches, estimateTotals, approvalState, cleanName } = approval
const { customerEstimateEmail, shopResponseEmail, firstName, headerSafe, esc } = emails

const RO_ID = '8113e72b-a9c3-456e-8754-4c03dbb9862b'
const future = () => new Date(Date.now() + 5 * 86_400_000).toISOString()
const past = () => new Date(Date.now() - 86_400_000).toISOString()

beforeEach(() => {
  vi.clearAllMocks()
  mockSql.mockReset()
  mockSql.mockImplementation(() => Promise.resolve([]))
  sendMock.mockResolvedValue({ data: { id: 'msg_1' }, error: null })
})

// ── helpers ────────────────────────────────────────────────────────────────

describe('tokens', () => {
  it('generates 43-char url-safe tokens and matches only the right one', () => {
    const t = newToken()
    expect(t).toHaveLength(43)
    expect(isTokenFormat(t)).toBe(true)
    const stored = { tokenHash: hashToken(t) }
    expect(tokenMatches(t, stored)).toBe(true)
    expect(tokenMatches(newToken(), stored)).toBe(false)
    expect(tokenMatches(t, {})).toBe(false)
    expect(tokenMatches(t, undefined)).toBe(false)
    expect(tokenMatches('short', stored)).toBe(false)
    expect(tokenMatches(null, stored)).toBe(false)
  })
  it('never stores the raw token', () => {
    const t = newToken()
    expect(hashToken(t)).not.toContain(t)
    expect(hashToken(t)).toHaveLength(64)
  })
})

describe('estimateTotals', () => {
  it('mirrors the shop modal: services + parts x qty, then 8.5% tax', () => {
    const t = estimateTotals({
      services: [{ name: 'Brakes', price: 300 }],
      partsUsed: [{ name: 'Pads', price: 50, qty: 2 }],
    })
    expect(t.subtotal).toBe(400)
    expect(t.tax).toBe(34)
    expect(t.total).toBe(434)
  })
  it('survives missing, null, or malformed data', () => {
    expect(estimateTotals(undefined).total).toBe(0)
    expect(estimateTotals(null).total).toBe(0)
    expect(estimateTotals({}).total).toBe(0)
    expect(estimateTotals({ services: 'nope', partsUsed: 5 }).total).toBe(0)
    expect(estimateTotals({ services: [null, 'x', 7, {}], partsUsed: [null] }).total).toBe(0)
  })
  it('handles string prices, zero qty, and blank-named lines like the modal', () => {
    const t = estimateTotals({
      services: [{ name: '', price: '0' }, { name: 'Oil', price: '45.50' }],
      partsUsed: [{ name: 'Filter', price: '10', qty: 0 }],
    })
    expect(t.services).toHaveLength(1)
    expect(t.parts[0].qty).toBe(1) // modal treats qty 0 as 1
    expect(t.subtotal).toBe(55.5)
  })
})

describe('approvalState', () => {
  const ro = (stage, data) => ({ stage, data })
  it('covers every state', () => {
    expect(approvalState(ro('Estimate', { approval: { expiresAt: future() } }))).toBe('pending')
    expect(approvalState(ro('Estimate', { approval: { expiresAt: past() } }))).toBe('expired')
    expect(approvalState(ro('Estimate', { approval: { expiresAt: future(), declinedAt: past() } }))).toBe('declined')
    expect(approvalState(ro('Approved', { approval: { expiresAt: future() } }))).toBe('approved')
    expect(approvalState(ro('Estimate', { authorized: true, approval: { expiresAt: future() } }))).toBe('approved')
    expect(approvalState(ro('In Progress', { approval: { expiresAt: future() } }))).toBe('closed')
    expect(approvalState(ro('Estimate', {}))).toBe('expired')
    expect(approvalState({ stage: 'Estimate', data: null })).toBe('expired')
  })
})

describe('cleanName', () => {
  it('keeps apostrophes and drops control characters and angle brackets', () => {
    expect(cleanName("  Pat O'Brien ")).toBe("Pat O'Brien")
    expect(cleanName('<b>Al</b>\n')).toBe('b Al /b')
    expect(cleanName(null)).toBe('')
    expect(cleanName('x'.repeat(300))).toHaveLength(100)
  })
})

// ── emails ─────────────────────────────────────────────────────────────────

describe('customerEstimateEmail', () => {
  const url = `https://shopcommand.net/approve/${RO_ID}/${'A'.repeat(43)}`
  const totals = estimateTotals({
    services: [{ name: 'Brake job', price: 300 }, { name: 'Flush', price: 90 }, { name: 'Diag', price: 120 }],
    partsUsed: [{ name: 'Pads', qty: 2, price: 50 }, { name: 'Rotor', qty: 2, price: 95.5 }, { name: 'Bolt kit', qty: 1, price: 12 }],
  })
  const base = {
    customerName: 'Rasheed Omar', shopName: "Omar's Auto", vehicle: '2019 Ford F150',
    roNumber: 'RO-20261117-0001', url, totals, expiresAt: new Date(Date.now() + 14 * 86_400_000).toISOString(),
  }

  it('uses first name, summary, expiry, contact and a safety line', () => {
    const e = customerEstimateEmail({ ...base, shopPhone: '(713) 555-0100', shopAddress: '123 Main St' })
    expect(e.subject).toBe("Your estimate from Omar's Auto is ready")
    expect(e.text).toMatch(/^Hi Rasheed,/)
    expect(e.text).toMatch(/Call Omar's Auto at \(713\) 555-0100/)
    expect(e.text).toMatch(/and 1 more item\b/)
    expect(e.text).toMatch(/Total \(includes tax\): \$/)
    expect(e.text).toMatch(/This link works until [A-Z][a-z]+ \d{1,2}, \d{4}\./)
    expect(e.text).toMatch(/not expecting this estimate/)
    expect(e.html).toContain('Review your estimate')
    expect(e.html).toContain(`href="${url}"`)
    expect(e.text).toContain(url)
  })

  it('works for a shop with no phone, address, or name, and a customer with no name or vehicle', () => {
    const e = customerEstimateEmail({ ...base, customerName: null, shopName: 'Your repair shop', vehicle: '', shopPhone: null, shopAddress: undefined })
    expect(e.text).toMatch(/^Hi there,/)
    expect(e.text).not.toMatch(/Call the shop/i)
    expect(e.text).not.toMatch(/ at \./)
    expect(e.text).toMatch(/Questions\? Reply to this email\./)
    expect(e.text).toMatch(/your vehicle/)
    expect(e.html).not.toMatch(/undefined|null/)
  })

  it('escapes hostile values and keeps headers clean', () => {
    const e = customerEstimateEmail({
      ...base,
      customerName: '<img src=x onerror=alert(1)> Bob',
      shopName: 'Evil"<script>alert(1)</script>\r\nBcc: x@y.com',
      vehicle: '<b>Truck</b>',
      totals: estimateTotals({ services: [{ name: '<script>x</script>', price: 10 }] }),
      shopPhone: '"><script>', shopAddress: '<i>addr</i>',
    })
    expect(e.html).not.toMatch(/<script>/i)
    expect(e.html).not.toMatch(/<img /i)
    expect(e.subject).not.toMatch(/[\r\n<>"]/)
  })

  it('has no em or en dashes in customer-facing copy', () => {
    const e = customerEstimateEmail({ ...base, shopPhone: '1', shopAddress: 'x' })
    expect(e.text + e.html).not.toMatch(/[—–]/)
  })

  it('formats thousands and cents', () => {
    const e = customerEstimateEmail({ ...base, totals: estimateTotals({ services: [{ name: 'Engine', price: 3500 }] }) })
    expect(e.text).toMatch(/\$3,500\.00/)
  })
})

describe('shopResponseEmail', () => {
  const full = { signer: "Pat O'Brien", customerName: 'Pat OBrien', customerPhone: '(713) 555-0199', shopName: "Omar's Auto", vehicle: '2019 Ford F150', roNumber: 'RO-1', total: 97.64, roId: RO_ID }
  it('approve: names shop, customer phone, and deep-links the RO', () => {
    const n = shopResponseEmail({ ...full, decision: 'approve' })
    expect(n.subject).toBe('Estimate approved: Pat OBrien, 2019 Ford F150 (RO-1)')
    expect(n.text).toMatch(/Shop: Omar's Auto/)
    expect(n.text).toMatch(/Customer: Pat OBrien, \(713\) 555-0199/)
    expect(n.text).toMatch(/moved to Approved\./)
    expect(n.text).not.toMatch(/ready to start/)
    expect(n.text).toContain(`https://shopcommand.net/repair-orders?ro=${RO_ID}`)
  })
  it('decline: tells the shop to call, with or without a phone', () => {
    expect(shopResponseEmail({ ...full, decision: 'decline' }).text).toMatch(/call Pat OBrien at \(713\) 555-0199/)
    const bare = shopResponseEmail({ ...full, decision: 'decline', customerName: null, customerPhone: null, shopName: null, vehicle: '' })
    expect(bare.text).toMatch(/call the customer\./)
    expect(bare.text).toMatch(/Shop: Not set/)
    expect(bare.subject).toMatch(/^Estimate declined: customer, a vehicle/)
  })
})

describe('small helpers', () => {
  it('firstName, headerSafe, esc', () => {
    expect(firstName("  Pat   O'Brien ")).toBe('Pat')
    expect(firstName('')).toBe('there')
    expect(firstName(null)).toBe('there')
    expect(headerSafe('Shop\r\nBcc: x@y.com')).toBe('Shop Bcc: x@y.com')
    expect(headerSafe('a\\b"c<d>')).toBe('a b c d')
    expect(headerSafe('x'.repeat(500))).toHaveLength(100)
    expect(esc(`a&b<c>"d'`)).toBe('a&amp;b&lt;c&gt;&quot;d&#39;')
  })
})

// ── public routes (api/health.js) ──────────────────────────────────────────

describe('public approval routes', () => {
  const token = newToken()
  const mkRO = (over = {}) => ({
    id: RO_ID, org_id: 'o1', stage: 'Estimate', ro_number: 'RO-20261117-0001', advisor_id: 'adv1',
    customer_name: 'Pat OBrien', customer_phone: '(713) 555-0199',
    vehicle_year: 2019, vehicle_make: 'Ford', vehicle_model: 'F150',
    shop_name: "Omar's Auto", shop_address: '123 Main St', shop_phone: '(713) 555-0100',
    data: { services: [{ name: 'Brake job', price: 80 }], partsUsed: [], approval: { tokenHash: hashToken(token), expiresAt: future() } },
    ...over,
  })

  function route({ ro, recipients = ['owner@shop.com', 'adv@shop.com'], updated = true } = {}) {
    const updates = []
    mockSql.mockImplementation((strings) => {
      const q = strings.join('?').replace(/\s+/g, ' ')
      if (/FROM repair_orders ro LEFT JOIN customers/.test(q)) return Promise.resolve(ro ? [ro] : [])
      if (/UPDATE repair_orders/.test(q)) { updates.push(q); return Promise.resolve(updated ? [{ id: RO_ID }] : []) }
      if (/FROM users/.test(q)) return Promise.resolve(recipients.map(email => ({ email })))
      return Promise.resolve([])
    })
    return updates
  }

  const post = (body) => {
    const res = createMockRes()
    return healthHandler(createMockReq({ method: 'POST', query: { action: 'approval-respond' }, body }), res).then(() => res)
  }
  const view = (q = {}) => {
    const res = createMockRes()
    return healthHandler(createMockReq({ method: 'GET', query: { action: 'approval', roId: RO_ID, token, ...q } }), res).then(() => res)
  }

  beforeEach(() => {
    process.env.RESEND_API_KEY = 'test-key'
    vi.stubGlobal('fetch', vi.fn(() => Promise.resolve(new Response('{}', { status: 200 }))))
  })

  it('view: returns line items and never the customer phone, email, or token hash', async () => {
    route({ ro: mkRO() })
    const res = await view()
    expect(res.statusCode).toBe(200)
    expect(res._body.state).toBe('pending')
    expect(res._body.total).toBe(86.8)
    const json = JSON.stringify(res._body)
    expect(json).not.toContain('555-0199')
    expect(json).not.toContain('tokenHash')
  })

  it('view: bad ids, bad token, or unknown RO all look the same (404)', async () => {
    route({ ro: mkRO() })
    expect((await view({ roId: 'nope' })).statusCode).toBe(404)
    expect((await view({ token: 'short' })).statusCode).toBe(404)
    expect((await view({ token: newToken() })).statusCode).toBe(404)
    route({ ro: null })
    expect((await view()).statusCode).toBe(404)
  })

  it('view: expired and closed links reveal no estimate lines', async () => {
    route({ ro: mkRO({ data: { approval: { tokenHash: hashToken(token), expiresAt: past() } } }) })
    const expired = await view()
    expect(expired._body.state).toBe('expired')
    expect(expired._body.services).toBeUndefined()
    route({ ro: mkRO({ stage: 'In Progress' }) })
    expect((await view())._body.state).toBe('closed')
  })

  it('view: a shop with no name, phone, or address and no vehicle still works', async () => {
    route({ ro: mkRO({ shop_name: null, shop_phone: null, shop_address: null, vehicle_year: null, vehicle_make: null, vehicle_model: null, customer_name: null }) })
    const res = await view()
    expect(res.statusCode).toBe(200)
    expect(res._body.vehicle).toBe('')
    expect(res._body.shopName).toBeNull()
  })

  it('approve: records it and emails the shop with phone, shop name, and deep link', async () => {
    const updates = route({ ro: mkRO() })
    const res = await post({ roId: RO_ID, token, decision: 'approve', name: "Pat O'Brien", total: 86.8 })
    expect(res._body).toEqual({ ok: true, state: 'approved' })
    expect(updates).toHaveLength(1)
    const sent = JSON.parse(fetch.mock.calls[0][1].body)
    expect(sent.to).toEqual(['owner@shop.com', 'adv@shop.com'])
    expect(sent.subject).toBe('Estimate approved: Pat OBrien, 2019 Ford F150 (RO-20261117-0001)')
    expect(sent.text).toMatch(/Customer: Pat OBrien, \(713\) 555-0199/)
    expect(sent.text).toContain(`?ro=${RO_ID}`)
  })

  it('approve: requires a typed name and the exact total shown', async () => {
    const updates = route({ ro: mkRO() })
    expect((await post({ roId: RO_ID, token, decision: 'approve', name: 'x', total: 86.8 })).statusCode).toBe(400)
    const stale = await post({ roId: RO_ID, token, decision: 'approve', name: 'Pat', total: 50 })
    expect(stale.statusCode).toBe(409)
    expect(stale._body.code).toBe('estimate_changed')
    expect((await post({ roId: RO_ID, token, decision: 'approve', name: 'Pat', total: 'abc' })).statusCode).toBe(409)
    expect(updates).toHaveLength(0)
    expect(fetch).not.toHaveBeenCalled()
  })

  it('decline: records it without needing a name and tells the shop to call', async () => {
    route({ ro: mkRO() })
    const res = await post({ roId: RO_ID, token, decision: 'decline' })
    expect(res._body).toEqual({ ok: true, state: 'declined' })
    expect(JSON.parse(fetch.mock.calls[0][1].body).text).toMatch(/call Pat OBrien at/)
  })

  it('refuses a wrong token, an invalid decision, and a second response', async () => {
    route({ ro: mkRO() })
    expect((await post({ roId: RO_ID, token: newToken(), decision: 'approve', name: 'Pat', total: 86.8 })).statusCode).toBe(404)
    expect((await post({ roId: RO_ID, token, decision: 'maybe' })).statusCode).toBe(400)
    route({ ro: mkRO({ stage: 'Approved' }) })
    const again = await post({ roId: RO_ID, token, decision: 'approve', name: 'Pat', total: 86.8 })
    expect(again.statusCode).toBe(409)
    expect(again._body.code).toBe('approved')
  })

  it('a lost race (RO moved on between check and update) is a 409, not a success', async () => {
    route({ ro: mkRO(), updated: false })
    const res = await post({ roId: RO_ID, token, decision: 'approve', name: 'Pat', total: 86.8 })
    expect(res.statusCode).toBe(409)
    expect(fetch).not.toHaveBeenCalled()
  })

  it('still succeeds for the customer when there is nobody to notify, no advisor, or no email key', async () => {
    route({ ro: mkRO({ advisor_id: null }), recipients: [] })
    expect((await post({ roId: RO_ID, token, decision: 'approve', name: 'Pat', total: 86.8 })).statusCode).toBe(200)
    expect(fetch).not.toHaveBeenCalled()
    delete process.env.RESEND_API_KEY
    route({ ro: mkRO() })
    expect((await post({ roId: RO_ID, token, decision: 'approve', name: 'Pat', total: 86.8 })).statusCode).toBe(200)
  })

  it('a failing email provider never fails the customer', async () => {
    route({ ro: mkRO() })
    fetch.mockRejectedValueOnce(new Error('down'))
    expect((await post({ roId: RO_ID, token, decision: 'approve', name: 'Pat', total: 86.8 })).statusCode).toBe(200)
  })
})

// ── link creation (api/repair-orders.js) ───────────────────────────────────

describe('POST /api/repair-orders?action=approval-link', () => {
  const dbRO = (over = {}) => ({
    id: RO_ID, stage: 'Estimate', ro_number: 'RO-20261117-0001',
    data: { services: [{ name: 'Brake job', price: 80 }], partsUsed: [] },
    customer_name: 'Pat OBrien', customer_email: 'pat@example.com',
    vehicle_year: 2019, vehicle_make: 'Ford', vehicle_model: 'F150',
    shop_name: "Omar's Auto", shop_phone: '(713) 555-0100', shop_address: '123 Main St',
    ...over,
  })
  const call = (user, body) => {
    authenticate.mockResolvedValueOnce(user)
    const res = createMockRes()
    return roHandler(createMockReq({ method: 'POST', query: { action: 'approval-link' }, body }), res).then(() => res)
  }
  beforeEach(() => { process.env.RESEND_API_KEY = 'test-key' })

  it('owners and advisors can create a link; techs cannot', async () => {
    mockSql.mockResolvedValueOnce([dbRO()])
    const ok = await call(MOCK_OWNER, { ro_id: RO_ID })
    expect(ok.statusCode).toBe(200)
    expect(ok._body.url).toMatch(new RegExp(`^https://shopcommand\\.net/approve/${RO_ID}/[A-Za-z0-9_-]{43}$`))
    expect(ok._body.emailed).toBe(false)
    mockSql.mockResolvedValueOnce([dbRO()])
    expect((await call(MOCK_ADVISOR, { ro_id: RO_ID })).statusCode).toBe(200)
    expect((await call(MOCK_TECH, { ro_id: RO_ID })).statusCode).toBe(403)
  })

  it('rejects bad ids, unknown ROs, non-estimates, and empty estimates', async () => {
    expect((await call(MOCK_OWNER, { ro_id: 'nope' })).statusCode).toBe(400)
    mockSql.mockResolvedValueOnce([])
    expect((await call(MOCK_OWNER, { ro_id: RO_ID })).statusCode).toBe(404)
    mockSql.mockResolvedValueOnce([dbRO({ stage: 'In Progress' })])
    expect((await call(MOCK_OWNER, { ro_id: RO_ID })).statusCode).toBe(400)
    mockSql.mockResolvedValueOnce([dbRO({ data: {} })])
    expect((await call(MOCK_OWNER, { ro_id: RO_ID })).statusCode).toBe(400)
    mockSql.mockResolvedValueOnce([dbRO({ data: null })])
    expect((await call(MOCK_OWNER, { ro_id: RO_ID })).statusCode).toBe(400)
  })

  it('emails the customer with a quoted sender, reply-to, html and text', async () => {
    mockSql.mockResolvedValueOnce([dbRO({ shop_name: 'Smith & Sons Auto, Inc.' })])
    const res = await call(MOCK_OWNER, { ro_id: RO_ID, send_email: true })
    expect(res._body.emailed).toBe(true)
    const msg = sendMock.mock.calls[0][0]
    expect(msg.from).toBe('"Smith & Sons Auto, Inc. via ShopCommand" <notifications@shopcommand.net>')
    expect(msg.to).toBe('pat@example.com')
    expect(msg.replyTo).toBe(MOCK_OWNER.email)
    expect(msg.subject).toBe('Your estimate from Smith & Sons Auto, Inc. is ready')
    expect(msg.html).toContain('Review your estimate')
    expect(msg.text).toContain('/approve/')
  })

  it('a shop name with quotes, angle brackets, or newlines cannot break the sender', async () => {
    mockSql.mockResolvedValueOnce([dbRO({ shop_name: 'Bad"<x>\r\nBcc: a@b.com' })])
    await call(MOCK_OWNER, { ro_id: RO_ID, send_email: true })
    const from = sendMock.mock.calls[0][0].from
    expect(from).not.toMatch(/[\r\n]/)
    expect(from.match(/"/g)).toHaveLength(2)
    expect(from).toMatch(/<notifications@shopcommand\.net>$/)
  })

  it('works for a shop with no name, phone, or address', async () => {
    mockSql.mockResolvedValueOnce([dbRO({ shop_name: null, shop_phone: null, shop_address: null, customer_name: null })])
    const res = await call(MOCK_OWNER, { ro_id: RO_ID, send_email: true })
    expect(res._body.emailed).toBe(true)
    expect(sendMock.mock.calls[0][0].from).toBe('"Your repair shop via ShopCommand" <notifications@shopcommand.net>')
  })

  it('reports a missing customer email, a provider error, and a thrown error honestly', async () => {
    mockSql.mockResolvedValueOnce([dbRO({ customer_email: null })])
    expect((await call(MOCK_OWNER, { ro_id: RO_ID, send_email: true }))._body.emailError).toMatch(/no email/i)
    mockSql.mockResolvedValueOnce([dbRO()])
    sendMock.mockResolvedValueOnce({ data: null, error: { message: 'domain not verified' } })
    const rejected = await call(MOCK_OWNER, { ro_id: RO_ID, send_email: true })
    expect(rejected._body.emailed).toBe(false)
    expect(rejected._body.emailError).toBe('Failed to send email')
    mockSql.mockResolvedValueOnce([dbRO()])
    sendMock.mockRejectedValueOnce(new Error('network'))
    expect((await call(MOCK_OWNER, { ro_id: RO_ID, send_email: true }))._body.emailed).toBe(false)
  })

  it('reuses the current link when given its token, so a shared link is not invalidated', async () => {
    const t = newToken()
    const existing = { tokenHash: hashToken(t), expiresAt: future() }
    mockSql.mockResolvedValueOnce([dbRO({ data: { services: [{ name: 'Job', price: 80 }], approval: existing } })])
    const res = await call(MOCK_OWNER, { ro_id: RO_ID, token: t })
    expect(res._body.url.endsWith(`/${t}`)).toBe(true)
    // only the SELECT ran: no UPDATE that would replace the stored hash
    expect(mockSql).toHaveBeenCalledTimes(1)
  })

  it('does not reuse a declined or expired link', async () => {
    const t = newToken()
    mockSql.mockResolvedValueOnce([dbRO({ data: { services: [{ name: 'Job', price: 80 }], approval: { tokenHash: hashToken(t), expiresAt: future(), declinedAt: past() } } })])
    expect((await call(MOCK_OWNER, { ro_id: RO_ID, token: t }))._body.url.endsWith(`/${t}`)).toBe(false)
    mockSql.mockResolvedValueOnce([dbRO({ data: { services: [{ name: 'Job', price: 80 }], approval: { tokenHash: hashToken(t), expiresAt: past() } } })])
    expect((await call(MOCK_OWNER, { ro_id: RO_ID, token: t }))._body.url.endsWith(`/${t}`)).toBe(false)
  })
})
