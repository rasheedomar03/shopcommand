import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createMockReq, createMockRes, MOCK_OWNER, MOCK_ADVISOR } from './helpers.js'

// Onboarding and invites: who-am-I lookup, joining with an invite code (the
// invite decides the role), email-bound invites, and invite creation.

const state = vi.hoisted(() => ({
  user: null, ownerOrg: null, invite: null, queries: [], inserted: null,
  clerkEmails: null, orgInsert: null, privateMetadata: null, shopInsert: null,
}))

const mockSql = vi.hoisted(() => vi.fn())
const founderAlert = vi.hoisted(() => vi.fn())
const updateUserMetadata = vi.hoisted(() => vi.fn())

vi.mock('@neondatabase/serverless', () => ({ neon: vi.fn(() => mockSql) }))
vi.mock('../api/_lib/founder-alert.js', () => ({ sendFounderAlert: founderAlert }))
vi.mock('@clerk/backend', () => ({
  verifyToken: vi.fn(() => Promise.resolve({ sub: 'clerk_1' })),
  createClerkClient: vi.fn(() => ({
    users: {
      getUser: vi.fn(() => Promise.resolve({
        firstName: 'Ann', lastName: 'Lee',
        emailAddresses: state.clerkEmails ?? [{ emailAddress: 'ann@example.com', verification: { status: 'verified' } }],
        privateMetadata: state.privateMetadata ?? {},
      })),
      updateUser: vi.fn(() => Promise.resolve({})),
      updateUserMetadata,
    },
  })),
}))
vi.mock('../api/_lib/auth.js', () => ({
  authenticate: vi.fn(() => Promise.resolve(null)),
  setRlsContext: vi.fn(() => Promise.resolve()),
}))
vi.mock('../api/_lib/rate-limit.js', () => ({ rateLimit: vi.fn(() => true) }))

const { authenticate } = await import('../api/_lib/auth.js')
const { default: handler } = await import('../api/onboard.js')

const future = () => new Date(Date.now() + 86_400_000).toISOString()
const past = () => new Date(Date.now() - 1000).toISOString()

beforeEach(() => {
  vi.clearAllMocks()
  Object.assign(state, { user: null, ownerOrg: null, invite: null, queries: [], inserted: null, clerkEmails: null, orgInsert: null, privateMetadata: null, shopInsert: null })
  founderAlert.mockReset()
  founderAlert.mockResolvedValue(true)
  updateUserMetadata.mockReset()
  updateUserMetadata.mockResolvedValue({})
  mockSql.mockReset()
  mockSql.mockImplementation((strings, ...vals) => {
    const q = strings.join('?').replace(/\s+/g, ' ')
    state.queries.push(q)
    if (/INSERT INTO invites/.test(q)) {
      state.inserted = vals
      return Promise.resolve([{ id: 'inv-1', code: 'GENCODE1', role: vals[2], expires_at: 'x' }])
    }
    if (/FROM users WHERE clerk_id/.test(q)) return Promise.resolve(state.user ? [state.user] : [])
    if (/FROM organizations o LEFT JOIN shops/.test(q)) return Promise.resolve(state.ownerOrg ? [state.ownerOrg] : [])
    if (/FROM invites WHERE lower\(email\)/.test(q)) return Promise.resolve([])
    if (/FROM invites WHERE code/.test(q)) return Promise.resolve(state.invite ? [state.invite] : [])
    if (/INSERT INTO users/.test(q)) return Promise.resolve([{ id: 'new-user-id' }])
    if (/INSERT INTO organizations/.test(q)) {
      state.orgInsert = q
      return Promise.resolve([{ id: 'new-org' }])
    }
    if (/INSERT INTO shops/.test(q)) {
      state.shopInsert = vals
      return Promise.resolve([{ id: 'new-shop' }])
    }
    return Promise.resolve([])
  })
})

function call({ method = 'GET', query = {}, body } = {}) {
  const req = createMockReq({ method, query, body, headers: { authorization: 'Bearer t' } })
  const res = createMockRes()
  return handler(req, res).then(() => res)
}

const asOwner = () => authenticate.mockResolvedValueOnce({ ...MOCK_OWNER, orgId: 'o1' })
const createInvite = (body) => call({ method: 'POST', query: { action: 'create-invite' }, body })
const invite = (over = {}) => ({ id: 'i1', org_id: 'o1', shop_id: 's1', role: 'advisor', email: null, expires_at: future(), ...over })

// ── who am I ───────────────────────────────────────────────────────────────

describe('GET ?action=check', () => {
  it('recognizes an existing tech and returns their techId', async () => {
    state.user = { id: 'u-tech', org_id: 'o1', shop_id: 's1', role: 'tech' }
    const res = await call({ query: { action: 'check' } })
    expect(res._body).toEqual({ exists: true, role: 'tech', orgId: 'o1', shopId: 's1', techId: 'u-tech' })
  })
  it('recognizes an advisor with no techId', async () => {
    state.user = { id: 'u-adv', org_id: 'o1', shop_id: 's1', role: 'advisor' }
    const res = await call({ query: { action: 'check' } })
    expect(res._body.role).toBe('advisor')
    expect(res._body.techId).toBeNull()
  })
  it('still finds older owners that have an organization but no users row', async () => {
    state.ownerOrg = { org_id: 'o9', shop_id: 's9' }
    const res = await call({ query: { action: 'check' } })
    expect(res._body).toEqual({ exists: true, role: 'owner', orgId: 'o9', shopId: 's9' })
  })
  it('reports an unknown person as not existing', async () => {
    const res = await call({ query: { action: 'check' } })
    expect(res._body).toEqual({ exists: false })
  })
})

// ── founder alerts: signup started / shop created / joined ────────────────

describe('founder alerts', () => {
  it('alerts the founder once when a new account first reaches onboarding', async () => {
    const res = await call({ query: { action: 'check' } })
    expect(res._body).toEqual({ exists: false })
    expect(founderAlert).toHaveBeenCalledTimes(1)
    const arg = founderAlert.mock.calls[0][0]
    expect(arg.subject).toMatch(/signup started onboarding: Ann Lee/)
    expect(arg.lines.join('\n')).toMatch(/ann@example\.com/)
    expect(updateUserMetadata).toHaveBeenCalledWith('clerk_1', { privateMetadata: { signupAlerted: true } })
  })
  it('does not alert again for an account already flagged', async () => {
    state.privateMetadata = { signupAlerted: true }
    await call({ query: { action: 'check' } })
    expect(founderAlert).not.toHaveBeenCalled()
    expect(updateUserMetadata).not.toHaveBeenCalled()
  })
  it('does not alert for people who already have an account', async () => {
    state.user = { id: 'u-adv', org_id: 'o1', shop_id: 's1', role: 'advisor' }
    await call({ query: { action: 'check' } })
    expect(founderAlert).not.toHaveBeenCalled()
  })
  it('keeps the account unflagged when the email fails, so it is retried, and still answers normally', async () => {
    founderAlert.mockResolvedValueOnce(false)
    const res = await call({ query: { action: 'check' } })
    expect(res.statusCode).toBe(200)
    expect(res._body).toEqual({ exists: false })
    expect(updateUserMetadata).not.toHaveBeenCalled()
  })
  it('an alert that throws can never break the check', async () => {
    founderAlert.mockRejectedValueOnce(new Error('resend down'))
    const res = await call({ query: { action: 'check' } })
    expect(res.statusCode).toBe(200)
    expect(res._body).toEqual({ exists: false })
  })
  it('alerts the founder when a new shop is created', async () => {
    const res = await call({ method: 'POST', body: { role: 'owner', shopName: 'Main Street Auto' } })
    expect(res.statusCode).toBe(201)
    expect(founderAlert).toHaveBeenCalledTimes(1)
    expect(founderAlert.mock.calls[0][0].subject).toBe('New shop created: Main Street Auto')
  })
  it('alerts the founder when someone joins with an invite code', async () => {
    state.invite = invite({ role: 'tech' })
    const res = await call({ method: 'POST', body: { inviteCode: 'abcd2345' } })
    expect(res.statusCode).toBe(201)
    expect(founderAlert).toHaveBeenCalledTimes(1)
    expect(founderAlert.mock.calls[0][0].subject).toMatch(/Team member joined a shop: Ann Lee/)
  })
})

// ── joining with an invite code ────────────────────────────────────────────

describe('POST join with invite code', () => {
  it('the invite decides the role when none is sent (advisor, then tech with techId)', async () => {
    state.invite = invite({ role: 'advisor' })
    let res = await call({ method: 'POST', body: { inviteCode: 'abcd2345' } })
    expect(res.statusCode).toBe(201)
    expect(res._body.role).toBe('advisor')
    expect(res._body.techId).toBeNull()

    state.invite = invite({ role: 'tech' })
    res = await call({ method: 'POST', body: { inviteCode: 'ABCD2345' } })
    expect(res._body.role).toBe('tech')
    expect(res._body.techId).toBe('new-user-id')
  })

  it('older clients that still send a role keep working, and a wrong role is still rejected', async () => {
    state.invite = invite({ role: 'tech' })
    expect((await call({ method: 'POST', body: { role: 'tech', inviteCode: 'ABCD2345' } })).statusCode).toBe(201)
    state.invite = invite({ role: 'advisor' })
    const wrong = await call({ method: 'POST', body: { role: 'tech', inviteCode: 'ABCD2345' } })
    expect(wrong.statusCode).toBe(400)
    expect(wrong._body.error).toMatch(/invite is for a advisor, not a tech/)
  })

  it('rejects expired, unknown, missing, and invalid input', async () => {
    state.invite = invite({ expires_at: past() })
    expect((await call({ method: 'POST', body: { inviteCode: 'ABCD2345' } })).statusCode).toBe(410)
    state.invite = null
    expect((await call({ method: 'POST', body: { inviteCode: 'ZZZZ9999' } })).statusCode).toBe(404)
    expect((await call({ method: 'POST', body: {} })).statusCode).toBe(400)
    expect((await call({ method: 'POST', body: { role: 'admin', inviteCode: 'ABCD2345' } })).statusCode).toBe(400)
    expect((await call({ method: 'POST', body: { inviteCode: 'ab' } })).statusCode).toBe(400)
  })

  it('an existing account cannot switch roles by joining with a code', async () => {
    state.user = { id: 'u-own', org_id: 'o1', shop_id: 's1', role: 'owner' }
    state.invite = invite({ org_id: 'o2', shop_id: 's2', role: 'advisor' })
    const res = await call({ method: 'POST', body: { inviteCode: 'ABCD2345' } })
    expect(res.statusCode).toBe(403)
    expect(res._body.error).toMatch(/registered as a owner/)
    expect(state.queries.some(q => /INSERT INTO users/.test(q))).toBe(false)
  })
})

// ── invites tied to an email ───────────────────────────────────────────────

describe('invite bound to an email', () => {
  const verified = e => ({ emailAddress: e, verification: { status: 'verified' } })

  it('joins when a verified address matches, ignoring case', async () => {
    state.invite = invite({ email: 'Ann@Example.com' })
    state.clerkEmails = [verified('ann@example.COM')]
    expect((await call({ method: 'POST', body: { inviteCode: 'ABCD2345' } })).statusCode).toBe(201)
  })
  it('any verified address on the account can match', async () => {
    state.invite = invite({ email: 'work@shop.com' })
    state.clerkEmails = [verified('personal@gmail.com'), verified('work@shop.com')]
    expect((await call({ method: 'POST', body: { inviteCode: 'ABCD2345' } })).statusCode).toBe(201)
  })
  it('refuses a different email, creates nothing, consumes nothing, and does not reveal the address', async () => {
    state.invite = invite({ email: 'someone@else.com' })
    state.clerkEmails = [verified('ann@example.com')]
    const res = await call({ method: 'POST', body: { inviteCode: 'ABCD2345' } })
    expect(res.statusCode).toBe(403)
    expect(res._body.error).toMatch(/different email address/)
    expect(JSON.stringify(res._body)).not.toContain('someone@else.com')
    expect(state.queries.some(q => /INSERT INTO users/.test(q))).toBe(false)
    expect(state.queries.some(q => /UPDATE invites/.test(q))).toBe(false)
  })
  it('an unverified matching address does not count', async () => {
    state.invite = invite({ email: 'victim@example.com' })
    state.clerkEmails = [verified('attacker@example.com'), { emailAddress: 'victim@example.com', verification: { status: 'unverified' } }]
    expect((await call({ method: 'POST', body: { inviteCode: 'ABCD2345' } })).statusCode).toBe(403)
  })
  it('an invite with no email stays open to the code holder', async () => {
    state.invite = invite({ email: null })
    expect((await call({ method: 'POST', body: { inviteCode: 'ABCD2345' } })).statusCode).toBe(201)
  })
})

// ── creating invites ───────────────────────────────────────────────────────
// INSERT values, in order: org_id, shop_id, role, email, code, created_by

describe('POST ?action=create-invite', () => {
  it('stores a trimmed, lowercased email', async () => {
    asOwner()
    const res = await createInvite({ role: 'tech', shopId: 's1', email: '  Ann@Example.COM ' })
    expect(res.statusCode).toBe(201)
    expect(state.inserted[3]).toBe('ann@example.com')
  })
  it('stores null for a missing or blank email', async () => {
    asOwner()
    await createInvite({ role: 'advisor', shopId: 's1' })
    expect(state.inserted[3]).toBeNull()
    asOwner()
    await createInvite({ role: 'advisor', shopId: 's1', email: '   ' })
    expect(state.inserted[3]).toBeNull()
  })
  it('rejects a malformed email and inserts nothing', async () => {
    for (const bad of ['not-an-email', 'a@b', 'two words@x.com', 'a@@b.com', `${'x'.repeat(200)}@b.com`]) {
      asOwner()
      state.inserted = null
      const res = await createInvite({ role: 'tech', shopId: 's1', email: bad })
      expect(res.statusCode, bad).toBe(400)
      expect(state.inserted, bad).toBeNull()
    }
  })
  it('only owners can create invites, and only for advisor or tech', async () => {
    authenticate.mockResolvedValueOnce({ ...MOCK_ADVISOR, orgId: 'o1' })
    expect((await createInvite({ role: 'tech', shopId: 's1' })).statusCode).toBe(403)
    asOwner()
    expect((await createInvite({ role: 'owner', shopId: 's1' })).statusCode).toBe(400)
    asOwner()
    expect((await createInvite({ role: 'tech' })).statusCode).toBe(400)
  })
  it('an email stored by create-invite is enforced when the invitee joins', async () => {
    asOwner()
    await createInvite({ role: 'tech', shopId: 's1', email: 'Pat@Shop.com' })
    state.invite = invite({ role: 'tech', email: state.inserted[3] })
    state.clerkEmails = [{ emailAddress: 'PAT@shop.com', verification: { status: 'verified' } }]
    expect((await call({ method: 'POST', body: { inviteCode: 'ABCD2345' } })).statusCode).toBe(201)
  })
})

// ── owner path is unchanged ────────────────────────────────────────────────

describe('owner onboarding (unchanged behavior)', () => {
  it('an owner with an existing org gets it back', async () => {
    state.user = { id: 'u-own', org_id: 'o1', shop_id: 's1', role: 'owner' }
    state.ownerOrg = { org_id: 'o1', shop_id: 's1' }
    const res = await call({ method: 'POST', body: { role: 'owner', shopName: 'Main Street Auto' } })
    expect(res.statusCode).toBe(200)
    expect(res._body).toEqual({ orgId: 'o1', shopId: 's1' })
  })
  it('a new owner starts on the trial plan, never founding (paid)', async () => {
    const res = await call({ method: 'POST', body: { role: 'owner', shopName: 'Main Street Auto' } })
    expect(res.statusCode).toBe(201)
    expect(state.orgInsert).toMatch(/INSERT INTO organizations \(name, owner_clerk_id, plan, trial_ends_at\)/)
    expect(state.orgInsert).toMatch(/'trial'/)
    expect(state.orgInsert).not.toMatch(/founding/)
    expect(state.orgInsert).toMatch(/interval '14 days'/)
  })
  it('saves the optional shop address and phone, trimmed', async () => {
    const res = await call({ method: 'POST', body: { role: 'owner', shopName: 'Main Street Auto', address: '  6301 W 101st St  ', phone: ' 708-522-2999 ' } })
    expect(res.statusCode).toBe(201)
    // INSERT values: org id, name, address, phone
    expect(state.shopInsert).toEqual(['new-org', 'Main Street Auto', '6301 W 101st St', '708-522-2999'])
  })
  it('leaves address and phone empty when not given, blank, or not text', async () => {
    await call({ method: 'POST', body: { role: 'owner', shopName: 'Main Street Auto' } })
    expect(state.shopInsert).toEqual(['new-org', 'Main Street Auto', null, null])
    await call({ method: 'POST', body: { role: 'owner', shopName: 'Main Street Auto', address: '   ', phone: { x: 1 } } })
    expect(state.shopInsert).toEqual(['new-org', 'Main Street Auto', null, null])
  })
  it('an existing advisor cannot register as an owner', async () => {
    state.user = { id: 'u-adv', org_id: 'o1', shop_id: 's1', role: 'advisor' }
    const res = await call({ method: 'POST', body: { role: 'owner', shopName: 'Main Street Auto' } })
    expect(res.statusCode).toBe(403)
  })
})
