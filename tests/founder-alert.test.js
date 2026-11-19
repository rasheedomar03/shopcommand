import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { sendFounderAlert } from '../api/_lib/founder-alert.js'

// The founder alert must never throw, never run without a key, and keep header
// values on one line.

const realFetch = globalThis.fetch
const realKey = process.env.RESEND_API_KEY
const realTo = process.env.FOUNDER_ALERT_EMAIL

beforeEach(() => {
  process.env.RESEND_API_KEY = 'test_key'
  delete process.env.FOUNDER_ALERT_EMAIL
  globalThis.fetch = vi.fn(() => Promise.resolve({ ok: true }))
})
afterEach(() => {
  globalThis.fetch = realFetch
  if (realKey === undefined) delete process.env.RESEND_API_KEY; else process.env.RESEND_API_KEY = realKey
  if (realTo === undefined) delete process.env.FOUNDER_ALERT_EMAIL; else process.env.FOUNDER_ALERT_EMAIL = realTo
})

describe('sendFounderAlert', () => {
  it('sends a plain-text email to hello@ by default', async () => {
    const ok = await sendFounderAlert({ subject: 'Hi', lines: ['a', 'b'] })
    expect(ok).toBe(true)
    const [url, opts] = globalThis.fetch.mock.calls[0]
    expect(url).toBe('https://api.resend.com/emails')
    const body = JSON.parse(opts.body)
    expect(body.to).toEqual(['hello@shopcommand.net'])
    expect(body.text).toBe('a\nb')
    expect(body.html).toBeUndefined()
  })
  it('uses FOUNDER_ALERT_EMAIL when set', async () => {
    process.env.FOUNDER_ALERT_EMAIL = 'me@example.com'
    await sendFounderAlert({ subject: 'Hi', lines: [] })
    expect(JSON.parse(globalThis.fetch.mock.calls[0][1].body).to).toEqual(['me@example.com'])
  })
  it('does nothing without an API key', async () => {
    delete process.env.RESEND_API_KEY
    expect(await sendFounderAlert({ subject: 'Hi', lines: [] })).toBe(false)
    expect(globalThis.fetch).not.toHaveBeenCalled()
  })
  it('returns false instead of throwing when Resend fails or the network is down', async () => {
    globalThis.fetch = vi.fn(() => Promise.resolve({ ok: false }))
    expect(await sendFounderAlert({ subject: 'Hi', lines: [] })).toBe(false)
    globalThis.fetch = vi.fn(() => Promise.reject(new Error('offline')))
    expect(await sendFounderAlert({ subject: 'Hi', lines: [] })).toBe(false)
  })
  it('keeps a user-supplied name from breaking the subject line', async () => {
    await sendFounderAlert({ subject: 'New shop: Evil\r\nBcc: x@y.com', lines: [] })
    const body = JSON.parse(globalThis.fetch.mock.calls[0][1].body)
    expect(body.subject).not.toMatch(/[\r\n]/)
  })
})
