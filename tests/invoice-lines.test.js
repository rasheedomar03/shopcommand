import { describe, it, expect } from 'vitest'
import { computeTotals, lineDisplay, linesFromInvoice, servicesFromItems, taxSettingsFor, CARD_FEE_RATE } from '../src/lib/invoiceLines.js'

const item = (over = {}) => ({ desc: 'Battery', type: 'part', qty: '4', price: '130', ...over })

describe('computeTotals', () => {
  it('multiplies quantity by unit price (4 batteries at $130 is $520)', () => {
    const t = computeTotals({ items: [item()], taxRate: 0 })
    expect(t.parts).toBe(520)
    expect(t.total).toBe(520)
  })
  it('taxes parts only by default, and labor too when asked', () => {
    const items = [item({ qty: '1', price: '100' }), item({ type: 'labor', desc: 'Install', qty: '1', price: '50' })]
    expect(computeTotals({ items, taxRate: 10 }).tax).toBe(10)
    expect(computeTotals({ items, taxRate: 10, taxLabor: true }).tax).toBe(15)
  })
  it('taxes the whole subtotal when lines are not categorized', () => {
    const items = [item({ type: 'labor', qty: '1', price: '200' })]
    expect(computeTotals({ items, itemize: false, taxRate: 10 }).tax).toBe(20)
  })
  it('the card fee is 3% of subtotal plus tax, and off by default', () => {
    const items = [item({ qty: '1', price: '100' })]
    expect(computeTotals({ items, taxRate: 10 }).fee).toBe(0)
    const t = computeTotals({ items, taxRate: 10, cardFee: true })
    expect(CARD_FEE_RATE).toBe(0.03)
    expect(t.tax).toBe(10)
    expect(t.fee).toBe(3.3)
    expect(t.total).toBe(113.3)
  })
  it('rounds to cents so the lines always add up to the total', () => {
    const t = computeTotals({ items: [item({ qty: '3', price: '19.99' })], taxRate: 8.25, cardFee: true })
    expect(t.subtotal).toBe(59.97)
    expect(t.tax).toBe(4.95)
    expect(Math.round((t.subtotal + t.tax + t.fee) * 100) / 100).toBe(t.total)
  })
  it('ignores blank or non-numeric amounts', () => {
    const t = computeTotals({ items: [item({ qty: '', price: 'abc' })], taxRate: 'x' })
    expect(t.total).toBe(0)
  })
})

describe('lineDisplay', () => {
  it('shows one amount when the quantity is 1', () => {
    expect(lineDisplay({ qty: '1', price: '450' })).toEqual({ qty: 1, unit: 450, total: 450, showUnit: false })
  })
  it('shows unit price and line total when the quantity is more than 1', () => {
    expect(lineDisplay({ qty: '4', price: '130' })).toEqual({ qty: 4, unit: 130, total: 520, showUnit: true })
  })
  it('also shows the unit price for fractional quantities like 1.5 hours', () => {
    expect(lineDisplay({ qty: '1.5', price: '100' }).showUnit).toBe(true)
  })
})

describe('linesFromInvoice', () => {
  it('uses the stored lines, keeping quantity and unit price', () => {
    const lines = linesFromInvoice({ lines: [{ desc: 'Battery', type: 'part', qty: 4, price: 130 }], services: [{ name: 'Battery', parts: 520, labor: 0 }] })
    expect(lines).toEqual([{ desc: 'Battery', type: 'part', qty: '4', price: '130' }])
  })
  it('falls back to services for older invoices (quantity 1, no suffix unless both amounts)', () => {
    const lines = linesFromInvoice({ services: [{ name: 'Battery', parts: 520, labor: 0 }, { name: 'Brakes', parts: 80, labor: 120 }] })
    expect(lines).toEqual([
      { desc: 'Battery', type: 'part', qty: '1', price: '520' },
      { desc: 'Brakes (labor)', type: 'labor', qty: '1', price: '120' },
      { desc: 'Brakes (parts)', type: 'part', qty: '1', price: '80' },
    ])
  })
  it('repairs an unknown line type and returns nothing when there is nothing', () => {
    expect(linesFromInvoice({ lines: [{ desc: 'x', type: 'weird', qty: 1, price: 5 }] })[0].type).toBe('labor')
    expect(linesFromInvoice({})).toEqual([])
  })
})

describe('servicesFromItems', () => {
  it('collapses each line to one amount, skipping empty lines', () => {
    const services = servicesFromItems([item(), { desc: '', type: 'labor', qty: '1', price: '' }, item({ desc: 'Oil', type: 'labor', qty: '1', price: '60' })])
    expect(services).toEqual([
      { name: 'Battery', parts: 520, labor: 0 },
      { name: 'Oil', parts: 0, labor: 60 },
    ])
  })
})

describe('taxSettingsFor', () => {
  it('uses the settings stored on a new invoice', () => {
    expect(taxSettingsFor({ taxRate: 9.5, taxLabor: true })).toEqual({ taxRate: '9.5', taxLabor: true })
  })
  it('works out an older invoice so reopening does not change its total', () => {
    // tax 8.25% on parts only
    expect(taxSettingsFor({ tax: 8.25, services: [{ name: 'a', parts: 100, labor: 100 }] })).toEqual({ taxRate: '8.25', taxLabor: false })
    // tax 8.25% on parts and labor
    expect(taxSettingsFor({ tax: 16.5, services: [{ name: 'a', parts: 100, labor: 100 }] })).toEqual({ taxRate: '8.25', taxLabor: true })
  })
  it('uses the fallback when there was no tax or it cannot be worked out', () => {
    expect(taxSettingsFor({ tax: 0, services: [] })).toEqual({ taxRate: '8.25', taxLabor: false })
    expect(taxSettingsFor({ tax: 5, services: [] }, 9)).toEqual({ taxRate: '9', taxLabor: false })
  })
})
