import { describe, it, expect } from 'vitest'
import { sumLines, dbTaxFactor, priceInvoiceEdit, invoiceBreakdown, DEFAULT_TAX_FACTOR } from '../src/lib/invoiceEdit.js'

// A database invoice: amount includes tax, line items are before tax.
// 90.00 of lines at 8.5% = 97.65.
const dbInvoice = (over = {}) => ({
  dbId: 'inv-1',
  total: 97.65,
  services: [{ name: 'Brakes', parts: 40, labor: 50 }],
  ...over,
})
const lines = (...amounts) => amounts.map((a, i) => ({ name: `Line ${i + 1}`, parts: 0, labor: a }))

describe('priceInvoiceEdit: the amount must not move unless the lines change', () => {
  it('number or contact only edit: amount and tax are preserved', () => {
    const r = priceInvoiceEdit(dbInvoice(), [{ name: 'Brakes', parts: 40, labor: 50 }])
    expect(r.changed).toBe(false)
    expect(r.total).toBe(97.65)
    expect(r.subtotal).toBe(90)
    expect(r.tax).toBe(7.65)
  })

  it('regression: the old behavior saved the sum of the lines, dropping the tax', () => {
    const r = priceInvoiceEdit(dbInvoice(), [{ name: 'Brakes', parts: 40, labor: 50 }])
    expect(r.total).not.toBe(90)
  })

  it("changing a line re-prices at the invoice's own tax basis", () => {
    const r = priceInvoiceEdit(dbInvoice(), lines(100))
    expect(r.changed).toBe(true)
    expect(r.subtotal).toBe(100)
    expect(r.total).toBe(108.5)
    expect(r.tax).toBe(8.5)
  })

  it('keeps a non-default tax basis (about 10.25%)', () => {
    const inv = dbInvoice({ total: 99.23, services: [{ name: 'Job', parts: 0, labor: 90 }] })
    expect(dbTaxFactor(inv)).toBeCloseTo(1.1026, 3)
    const r = priceInvoiceEdit(inv, lines(200))
    expect(r.total).toBeCloseTo(220.5, 0)
  })

  it('adding or removing a line changes the total proportionally', () => {
    expect(priceInvoiceEdit(dbInvoice(), [...lines(90), ...lines(10)]).total).toBe(108.5)
    expect(priceInvoiceEdit(dbInvoice({ services: lines(50, 40), total: 97.65 }), lines(50)).total).toBe(54.25)
  })

  it('falls back to the repair order default when the basis looks wrong', () => {
    expect(dbTaxFactor(dbInvoice({ total: 50 }))).toBe(DEFAULT_TAX_FACTOR)
    expect(dbTaxFactor(dbInvoice({ total: 500 }))).toBe(DEFAULT_TAX_FACTOR)
    expect(dbTaxFactor(dbInvoice({ services: [] }))).toBe(DEFAULT_TAX_FACTOR)
    expect(dbTaxFactor(dbInvoice({ services: undefined }))).toBe(DEFAULT_TAX_FACTOR)
  })

  it('an invoice with no tax in it stays tax-free when lines change', () => {
    const r = priceInvoiceEdit(dbInvoice({ total: 90 }), lines(120))
    expect(r.total).toBe(120)
    expect(r.tax).toBe(0)
  })

  it('tiny float noise in the lines is not treated as a change', () => {
    const r = priceInvoiceEdit(dbInvoice(), [{ name: 'Brakes', parts: 40.001, labor: 50 }])
    expect(r.changed).toBe(false)
    expect(r.total).toBe(97.65)
  })
})

describe('invoiceBreakdown', () => {
  it('database invoice: subtotal is the lines, tax is the rest of the amount', () => {
    expect(invoiceBreakdown(dbInvoice())).toEqual({ subtotal: 90, tax: 7.65, total: 97.65 })
  })
  it('database invoice with no line detail shows the amount as is', () => {
    expect(invoiceBreakdown(dbInvoice({ services: [] }))).toEqual({ subtotal: 97.65, tax: 0, total: 97.65 })
  })
  it('never shows negative tax when the amount is below the lines', () => {
    const b = invoiceBreakdown(dbInvoice({ total: 80 }))
    expect(b.tax).toBe(0)
    expect(b.total).toBe(80)
  })
  it('local (device-only) invoices use their stored values', () => {
    expect(invoiceBreakdown({ subtotal: 100, tax: 8.25, total: 108.25 })).toEqual({ subtotal: 100, tax: 8.25, total: 108.25 })
  })
})

describe('sumLines', () => {
  it('adds parts and labor, tolerating missing values', () => {
    expect(sumLines([{ parts: 10, labor: 5.5 }, { labor: 4.5 }, {}])).toBe(20)
    expect(sumLines(undefined)).toBe(0)
  })
})
