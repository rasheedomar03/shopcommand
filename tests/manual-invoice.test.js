import { describe, it, expect } from 'vitest'
import { computeTotals } from '../src/lib/invoiceLines.js'
import {
  computeManualTotals, cleanManualInvoice, rowFromLocalInvoice, paymentMethodFromLabel, generateInvoiceNumber,
} from '../api/_lib/manual-invoice.js'

const base = { customer_name: 'J2M Fleet', lines: [{ desc: 'Brake job', type: 'labor', qty: 2, price: 120 }] }

describe('server totals match the generator', () => {
  const cases = [
    { items: [{ type: 'labor', qty: 2.5, price: 125 }, { type: 'part', qty: 4, price: 33.33 }, { type: 'fee', qty: 1, price: 25 }], itemize: true, taxRate: 8.25, taxLabor: false, cardFee: true, cardFeeRate: 3 },
    { items: [{ type: 'labor', qty: 1, price: 400 }, { type: 'part', qty: 1, price: 99.99 }], itemize: true, taxRate: 8.25, taxLabor: true, cardFee: false },
    { items: [{ type: 'labor', qty: 3, price: 95 }, { type: 'part', qty: 2, price: 10.05 }], itemize: false, taxRate: 0, taxLabor: false, cardFee: true, cardFeeRate: 3.5 },
    { items: [{ type: 'part', qty: 7, price: 19.99 }], itemize: true, taxRate: 7.75, taxLabor: false, cardFee: false },
  ]
  for (const [i, c] of cases.entries()) {
    it(`case ${i + 1}`, () => {
      const a = computeTotals(c)
      const b = computeManualTotals({ lines: c.items, itemize: c.itemize, taxRate: c.taxRate, taxLabor: c.taxLabor, cardFee: c.cardFee, cardFeeRate: c.cardFeeRate ?? 3 })
      expect(b).toEqual(a)
    })
  }
})

describe('cleanManualInvoice', () => {
  it('computes totals itself and ignores totals sent by the browser', () => {
    const { value } = cleanManualInvoice({ ...base, subtotal: 1, tax: 1, total: 1, amount: 1, tax_rate: 10 })
    expect(value.subtotal).toBe(240)
    expect(value.amount).toBe(240)
    expect(value.tax).toBe(0) // labor is not taxed by default
  })

  it('taxes parts and applies the card fee on subtotal plus tax', () => {
    const { value } = cleanManualInvoice({
      customer_name: 'X', tax_rate: 10, card_fee: true, card_fee_rate: 3,
      lines: [{ desc: 'Pads', type: 'part', qty: 2, price: 50 }],
    })
    expect(value.tax).toBe(10)
    expect(value.card_fee_amount).toBe(3.3)
    expect(value.amount).toBe(113.3)
  })

  it('requires a customer name and a lines list', () => {
    expect(cleanManualInvoice({ lines: [] }).error).toMatch(/customer/i)
    expect(cleanManualInvoice({ customer_name: 'A' }).error).toMatch(/lines/i)
  })

  it('bounds quantity, price, tax, fee, lines and total', () => {
    const l = (o) => ({ customer_name: 'A', lines: [{ desc: 'x', type: 'part', qty: 1, price: 1, ...o }] })
    expect(cleanManualInvoice(l({ qty: -1 })).error).toMatch(/quantity/i)
    expect(cleanManualInvoice(l({ qty: 1e9 })).error).toMatch(/quantity/i)
    expect(cleanManualInvoice(l({ price: 1e9 })).error).toMatch(/price/i)
    expect(cleanManualInvoice({ ...l({}), tax_rate: 50 }).error).toMatch(/tax/i)
    expect(cleanManualInvoice({ ...l({}), card_fee: true, card_fee_rate: 99 }).error).toMatch(/fee/i)
    expect(cleanManualInvoice({ customer_name: 'A', lines: Array(101).fill({ desc: 'x', qty: 1, price: 1 }) }).error).toMatch(/at most/i)
    expect(cleanManualInvoice({ customer_name: 'A', lines: [{ desc: 'x', qty: 1, price: -50, type: 'part' }] }).error).toMatch(/negative/i)
  })

  it('validates email, dates, ids and number length', () => {
    expect(cleanManualInvoice({ ...base, customer_email: 'nope' }).error).toMatch(/email/i)
    expect(cleanManualInvoice({ ...base, invoice_date: '11/20/2026' }).error).toMatch(/YYYY-MM-DD/)
    expect(cleanManualInvoice({ ...base, shop_id: 'not-a-uuid' }).error).toMatch(/shop_id/)
    expect(cleanManualInvoice({ ...base, number: 'x'.repeat(31) }).error).toMatch(/1-30/)
    expect(cleanManualInvoice({ ...base, mileage: -5 }).error).toMatch(/mileage/i)
  })

  it('keeps a negative-priced line when the invoice total stays positive (a discount)', () => {
    const { value, error } = cleanManualInvoice({
      customer_name: 'A',
      lines: [{ desc: 'Brakes', type: 'labor', qty: 1, price: 500 }, { desc: 'Discount', type: 'fee', qty: 1, price: -50 }],
    })
    expect(error).toBeUndefined()
    expect(value.amount).toBe(450)
  })

  it('trims text, defaults unknown line types to labor and keeps truck number and VIN', () => {
    const { value } = cleanManualInvoice({
      customer_name: '  Maher  ', unit_number: ' 5500 ', vin: '1FUJGLDR5CLBP8834',
      lines: [{ desc: '', type: 'weird', qty: 1, price: 10 }],
    })
    expect(value.customer_name).toBe('Maher')
    expect(value.unit_number).toBe('5500')
    expect(value.vin).toBe('1FUJGLDR5CLBP8834')
    expect(value.lines[0]).toEqual({ desc: 'Item', type: 'labor', qty: 1, price: 10 })
  })
})

describe('rowFromLocalInvoice (browser import)', () => {
  const local = {
    id: '032', customerName: 'Zain Trucking', vehicle: '2019 Freightliner', unitNumber: '236', status: 'paid',
    created: '2026-10-02T12:00:00', paidAt: '2026-10-05T15:00:00', paymentMethod: 'Visa ending 4821',
    lines: [{ desc: 'Air line', type: 'part', qty: 3, price: 20 }],
    taxRate: 8.25, taxLabor: false, itemize: true, cardFee: true, cardFeeRate: 3, cardFeeAmount: 2.12,
    subtotal: 60, tax: 4.95, total: 67.07,
  }

  it('keeps the stored total, tax and subtotal exactly (no recomputing)', () => {
    const { row } = rowFromLocalInvoice({ ...local, total: 70.01, tax: 9.99, subtotal: 50 })
    expect(row.amount).toBe(70.01)
    expect(row.tax).toBe(9.99)
    expect(row.subtotal).toBe(50)
  })

  it('keeps the number, quantity lines and truck number', () => {
    const { row } = rowFromLocalInvoice(local)
    expect(row.number).toBe('032')
    expect(row.lines).toEqual([{ desc: 'Air line', type: 'part', qty: 3, price: 20 }])
    expect(row.unit_number).toBe('236')
    expect(row.invoice_date).toBe('2026-10-02')
  })

  it('maps a paid invoice to a paid row with a matching payment', () => {
    const { row, payment } = rowFromLocalInvoice(local)
    expect(row.status).toBe('paid')
    expect(payment).toMatchObject({ amount: 67.07, method: 'visa' })
  })

  it('maps draft to draft, and sent or overdue to unpaid with no payment', () => {
    expect(rowFromLocalInvoice({ ...local, status: 'draft', paidAt: null }).row.status).toBe('draft')
    for (const s of ['sent', 'overdue']) {
      const r = rowFromLocalInvoice({ ...local, status: s, paidAt: null })
      expect(r.row.status).toBe('unpaid')
      expect(r.payment).toBeNull()
    }
  })

  it('keeps a part payment on a partial invoice, capped at the total', () => {
    const r = rowFromLocalInvoice({ ...local, status: 'partial', paidAt: null, amountPaid: 20 })
    expect(r.row.status).toBe('unpaid')
    expect(r.payment.amount).toBe(20)
    expect(rowFromLocalInvoice({ ...local, status: 'partial', paidAt: null, amountPaid: 9999 }).payment.amount).toBe(67.07)
  })

  it('turns older services into quantity-1 lines', () => {
    const { row } = rowFromLocalInvoice({
      id: '020', customerName: 'A', total: 300, status: 'sent',
      services: [{ name: 'Brake job', labor: 200, parts: 100 }, { name: 'Wash', labor: 0, parts: 0 }],
    })
    expect(row.lines).toEqual([
      { desc: 'Brake job (labor)', type: 'labor', qty: 1, price: 200 },
      { desc: 'Brake job (parts)', type: 'part', qty: 1, price: 100 },
    ])
  })

  it('rejects an invoice with no number, a bad total or too many lines', () => {
    expect(rowFromLocalInvoice({ customerName: 'A', total: 5 }).error).toBeTruthy()
    expect(rowFromLocalInvoice({ id: '1', total: -5 }).error).toBeTruthy()
    expect(rowFromLocalInvoice({ id: '1', total: 5, lines: Array(101).fill({}) }).error).toBeTruthy()
  })

  it('never produces NaN: missing fee, subtotal, tax or amountPaid become 0 or null', () => {
    const { row, payment } = rowFromLocalInvoice({ id: '1', total: 50, status: 'sent', customerName: 'A', services: [{ name: 'x', labor: 50, parts: 0 }] })
    expect(row.card_fee_amount).toBe(0)
    expect(row.subtotal).toBeNull()
    expect(row.tax).toBeNull()
    expect(payment).toBeNull()
    for (const v of Object.values(row)) if (typeof v === 'number') expect(Number.isNaN(v)).toBe(false)
    for (const l of row.lines) { expect(Number.isNaN(l.qty)).toBe(false); expect(Number.isNaN(l.price)).toBe(false) }
  })

  it('refuses a missing or non-numeric total instead of importing it as $0', () => {
    expect(rowFromLocalInvoice({ id: '1', customerName: 'A' }).error).toBeTruthy()
    expect(rowFromLocalInvoice({ id: '1', customerName: 'A', total: 'abc' }).error).toBeTruthy()
    expect(rowFromLocalInvoice({ id: '1', customerName: 'A', total: null }).error).toBeTruthy()
    expect(rowFromLocalInvoice({ id: '1', customerName: 'A', total: '' }).error).toBeTruthy()
    expect(rowFromLocalInvoice({ id: '1', customerName: 'A', total: 0 }).row.amount).toBe(0)
  })

  it('falls back to a placeholder customer name instead of failing', () => {
    expect(rowFromLocalInvoice({ id: '9', total: 10 }).row.customer_name).toBe('Customer')
  })
})

describe('helpers', () => {
  it('maps payment labels to allowed methods', () => {
    expect(paymentMethodFromLabel('Visa ending 4821')).toBe('visa')
    expect(paymentMethodFromLabel('Mastercard ending 7733')).toBe('mastercard')
    expect(paymentMethodFromLabel('Cash')).toBe('cash')
    expect(paymentMethodFromLabel('Check #1042')).toBe('check')
    expect(paymentMethodFromLabel('Recorded manually')).toBe('other')
    expect(paymentMethodFromLabel(null)).toBe('other')
  })

  it('generates numbers in the INV-YYMMDD-NNN form', () => {
    expect(generateInvoiceNumber(new Date(2026, 10, 20))).toMatch(/^INV-261120-\d{3}$/)
  })
})
