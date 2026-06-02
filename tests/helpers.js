import { vi } from 'vitest'

// ── Mock SQL tagged template ─────────────────────────────────────────────────

export function createMockSql(rows = []) {
  const sql = vi.fn(() => Promise.resolve(rows))
  sql.mockRows = (newRows) => { sql.mockResolvedValueOnce(newRows) }
  sql.mockError = (err) => { sql.mockRejectedValueOnce(err) }
  return sql
}

// ── Mock Vercel request/response ─────────────────────────────────────────────

export function createMockReq({ method = 'GET', query = {}, body = null, headers = {} } = {}) {
  return {
    method,
    query,
    body,
    url: '/api/test',
    headers: {
      'x-forwarded-for': '127.0.0.1',
      ...headers,
    },
    socket: { remoteAddress: '127.0.0.1' },
  }
}

export function createMockRes() {
  const res = {
    statusCode: 200,
    _headers: {},
    _body: null,
  }

  res.status = vi.fn((code) => { res.statusCode = code; return res })
  res.json = vi.fn((data) => { res._body = data; return res })
  res.setHeader = vi.fn((key, value) => { res._headers[key] = value })

  return res
}

// ── Mock user objects ────────────────────────────────────────────────────────

export const MOCK_OWNER = {
  clerkId: 'user_owner123',
  userId: '00000000-0000-0000-0000-000000000001',
  orgId: '00000000-0000-0000-0000-000000000010',
  shopId: '00000000-0000-0000-0000-000000000100',
  role: 'owner',
  name: 'Test Owner',
  email: 'owner@test.com',
}

export const MOCK_ADVISOR = {
  clerkId: 'user_advisor123',
  userId: '00000000-0000-0000-0000-000000000002',
  orgId: '00000000-0000-0000-0000-000000000010',
  shopId: '00000000-0000-0000-0000-000000000100',
  role: 'advisor',
  name: 'Test Advisor',
  email: 'advisor@test.com',
}

export const MOCK_TECH = {
  clerkId: 'user_tech123',
  userId: '00000000-0000-0000-0000-000000000003',
  orgId: '00000000-0000-0000-0000-000000000010',
  shopId: '00000000-0000-0000-0000-000000000100',
  role: 'tech',
  name: 'Test Tech',
  email: 'tech@test.com',
}

export const VALID_UUID = '00000000-0000-0000-0000-000000000100'
