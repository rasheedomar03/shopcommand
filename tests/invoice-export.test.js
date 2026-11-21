import { describe, it, expect } from 'vitest'
import { csvText, invoicesToCsv, EXPORT_HEADERS } from '../src/lib/invoiceExport.js'

// Minimal CSV reader for the tests: honours quotes, commas and "" escapes
function parse(csv) {
  const rows = []
  let row = [], cell = '', q = false
  for (let i = 0; i < csv.length; i++) {
    const c = csv[i]
    if (q) {
      if (c === '"' && csv[i + 1] === '"') { cell += '"'; i++ }
      else if (c === '"') { q = false }
      else { cell += c }
    } else if (c === '"') q = true
    else if (c === ',') { row.push(cell); cell = '' }
    else if (c === '\r') { /* skip */ }
    else if (c === '\n') { row.push(cell); rows.push(row); row = []; cell = '' }
    else cell += c
  }
  row.push(cell); rows.push(row)
  return rows
}

describe('csvText', () => {
  it('quotes a cell and doubles quotes inside it', () => {
    expect(csvText('He said "hi"')).toBe('"He said ""hi"""')
  })
  it('keeps a comma inside the cell', () => {
    expect(csvText('Smith, John')).toBe('"Smith, John"')
  })
  it('turns line breaks into spaces so a row stays on one line', () => {
    expect(csvText('a\nb\r\nc')).toBe('"a b c"')
  })
  it('stops a spreadsheet running text as a formula', () => {
    for (const s of ['=SUM(A1)', '+1', '-1', '@x']) expect(csvText(s)).toBe(`"'${s}"`)
  })
  it('handles empty and missing values', () => {
    expect(csvText(null)).toBe('""')
    expect(csvText(undefined)).toBe('""')
    expect(csvText('')).toBe('""')
  })
})

describe('invoicesToCsv', () => {
  const inv = (o = {}) => ({
    id: '032', created: '2026-10-02T12:00:00', customerName: 'Zain Trucking', vehicle: '2019 Freightliner', unitNumber: '236',
    vin: '1FUJGLDR5CLBP8834', jobTitle: 'Brakes', status: 'sent', subtotal: 200, tax: 0, cardFeeAmount: 6, total: 206, amountPaid: 0, ...o,
  })

  it('has the header row first, with Truck # and VIN', () => {
    const rows = parse(invoicesToCsv([inv()]))
    expect(rows[0]).toEqual(EXPORT_HEADERS)
    expect(rows[0]).toContain('Truck #')
    expect(rows[0]).toContain('VIN')
  })

  it('writes one row per invoice with every column in place', () => {
    const [, r] = parse(invoicesToCsv([inv()]))
    expect(r).toEqual(['032', '2026-10-02', 'Zain Trucking', '2019 Freightliner', '236', '1FUJGLDR5CLBP8834', 'Brakes', 'sent', '200.00', '0.00', '6.00', '206.00', '0.00', '206.00'])
  })

  it('a comma or quote in a name does not shift the columns', () => {
    const rows = parse(invoicesToCsv([inv({ customerName: 'Smith, "Bud" & Sons, LLC', jobTitle: 'Line 1\nLine 2' })]))
    expect(rows[1]).toHaveLength(EXPORT_HEADERS.length)
    expect(rows[1][2]).toBe('Smith, "Bud" & Sons, LLC')
    expect(rows[1][6]).toBe('Line 1 Line 2')
    expect(rows[1][4]).toBe('236') // still lines up after the awkward name
  })

  it('shows paid and balance: part paid, paid in full, and a credit', () => {
    const rows = parse(invoicesToCsv([
      inv({ id: 'a', status: 'partial', total: 100, amountPaid: 40 }),
      inv({ id: 'b', status: 'paid', total: 80.5, amountPaid: 0 }),
      inv({ id: 'c', status: 'paid', total: -250, subtotal: -250, tax: 0, cardFeeAmount: 0 }),
    ]))
    expect(rows[1].slice(11)).toEqual(['100.00', '40.00', '60.00'])
    expect(rows[2].slice(11)).toEqual(['80.50', '80.50', '0.00'])
    expect(rows[3].slice(11)).toEqual(['-250.00', '-250.00', '0.00'])
  })

  it('uses the total as the subtotal when none was stored, and never writes NaN', () => {
    const [, r] = parse(invoicesToCsv([inv({ subtotal: undefined, tax: undefined, cardFeeAmount: 'x', total: 50 })]))
    expect(r.slice(8, 12)).toEqual(['50.00', '0.00', '0.00', '50.00'])
    expect(r.join(',')).not.toMatch(/NaN/)
  })

  it('copes with missing fields and an empty list', () => {
    const [, r] = parse(invoicesToCsv([{ id: '1', total: 5 }]))
    expect(r).toHaveLength(EXPORT_HEADERS.length)
    expect(parse(invoicesToCsv([])).length).toBe(1) // header only
    expect(parse(invoicesToCsv(null)).length).toBe(1)
  })

  it('does not let text run as a formula', () => {
    const [, r] = parse(invoicesToCsv([inv({ customerName: '=HYPERLINK("http://x")' })]))
    expect(r[2].startsWith("'=")).toBe(true)
  })
})
