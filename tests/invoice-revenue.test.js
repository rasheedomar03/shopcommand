import { describe, it, expect } from 'vitest'
import { isCountedInvoice, revenueDay, sumOnDay, sumInMonth, sumSince, invoiceRevenueTotals } from '../src/lib/invoiceRevenue.js'

const inv = (over = {}) => ({ id: 'A', status: 'paid', shopId: 's1', total: 100, created: '2026-11-05T12:00:00', paidAt: null, ...over })

describe('isCountedInvoice', () => {
  it('counts a paid invoice made from scratch', () => {
    expect(isCountedInvoice(inv())).toBe(true)
  })
  it('leaves out invoices that are not paid', () => {
    for (const status of ['draft', 'sent', 'partial', 'overdue', 'void']) expect(isCountedInvoice(inv({ status }))).toBe(false)
  })
  it('leaves out invoices from a repair order or saved on the server (already counted through the repair order)', () => {
    expect(isCountedInvoice(inv({ roId: 'RO-1' }))).toBe(false)
    expect(isCountedInvoice(inv({ dbId: 'uuid' }))).toBe(false)
  })
  it('leaves out internal (own fleet) invoices', () => {
    expect(isCountedInvoice(inv({ internal: true }))).toBe(false)
  })
  it('does not crash on missing data', () => {
    expect(isCountedInvoice(null)).toBe(false)
    expect(isCountedInvoice(undefined)).toBe(false)
  })
})

describe('revenueDay', () => {
  it('uses the paid date when there is one, else the invoice date', () => {
    expect(revenueDay(inv({ paidAt: '2026-11-18T15:00:00.000Z' }))).toBe('2026-11-18')
    expect(revenueDay(inv())).toBe('2026-11-05')
    expect(revenueDay({})).toBe('')
  })
})

describe('sums', () => {
  const list = [
    inv({ id: '1', total: 100, paidAt: '2026-11-20T10:00:00.000Z' }),
    inv({ id: '2', total: 250.5, created: '2026-11-05T12:00:00' }), // no paid date: invoice date
    inv({ id: '3', total: 40, shopId: 's2', paidAt: '2026-11-20T11:00:00.000Z' }),
    inv({ id: '4', total: 999, status: 'sent' }), // not paid
    inv({ id: '5', total: 999, roId: 'RO-9', paidAt: '2026-11-20T11:00:00.000Z' }), // from a repair order
    inv({ id: '6', total: 70, created: '2025-12-30T12:00:00' }), // last year
  ]
  it('adds up a day, a month and a year, across shops or for one shop', () => {
    expect(sumOnDay(list, '2026-11-20')).toBe(140)
    expect(sumOnDay(list, '2026-11-20', 's1')).toBe(100)
    expect(sumInMonth(list, '2026-11')).toBe(390.5)
    expect(sumInMonth(list, '2026-11', 's2')).toBe(40)
    expect(invoiceRevenueTotals(list, '2026-11-20')).toEqual({ today: 140, mtd: 390.5, ytd: 390.5 })
  })
  it('adds up from a day onward (for the week)', () => {
    expect(sumSince(list, '2026-11-16')).toBe(140)
    expect(sumSince(list, '2026-11-01')).toBe(390.5)
  })
  it('ignores a bad total and an empty list', () => {
    expect(sumOnDay([inv({ total: 'abc', paidAt: '2026-11-20T10:00:00.000Z' })], '2026-11-20')).toBe(0)
    expect(sumInMonth([], '2026-11')).toBe(0)
    expect(sumInMonth(undefined, '2026-11')).toBe(0)
  })
})
