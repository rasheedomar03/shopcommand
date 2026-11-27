import { describe, it, expect } from 'vitest'
import { mergeSavedTrucks, truckBodyFromForm, findSameTruck } from '../src/lib/trucks.js'
import { voidedInvoiceRows } from '../src/lib/serverInvoices.js'
import { returnedCreditEntry, withShopNames, localDateTime } from '../src/lib/demoData.js'

const truck = (over) => ({ id: 't1', year: 2019, make: 'Freightliner', model: 'Cascadia', trim: '', vin: '', unitNumber: '', mileage: null, ...over })

describe('mergeSavedTrucks (customer profile)', () => {
  it('keeps two trucks of the same make and model apart when their numbers differ', () => {
    const out = mergeSavedTrucks([], [truck({ unitNumber: '1' }), truck({ id: 't2', unitNumber: '2' })])
    expect(out.map(v => v.unitNumber)).toEqual(['1', '2'])
  })
  it('keeps them apart when only the VINs differ', () => {
    const out = mergeSavedTrucks([], [truck({ vin: '1FUJGLDR5CLBP8834' }), truck({ id: 't2', vin: '1XKYD49X5MJ442517' })])
    expect(out).toHaveLength(2)
  })
  it('fills in the number on the vehicle a repair order already showed, without changing the input', () => {
    const fromRo = [{ name: '2019 Freightliner Cascadia', roCount: 2, totalSpent: 100, activeWarranties: [] }]
    const out = mergeSavedTrucks(fromRo, [truck({ unitNumber: '5500', mileage: 10 })])
    expect(out).toHaveLength(1)
    expect(out[0]).toMatchObject({ unitNumber: '5500', lastOdometer: 10, roCount: 2 })
    expect(fromRo[0].unitNumber).toBeUndefined()
  })
  it('does not fold a truck known by VIN into one known only by number', () => {
    const fromRo = [{ name: '2019 Freightliner Cascadia', roCount: 1, totalSpent: 0, activeWarranties: [] }]
    const out = mergeSavedTrucks(fromRo, [truck({ id: 't2', unitNumber: '12' }), truck({ vin: '1FUJGLDR5CLBP8834' })])
    expect(out.map(v => [v.unitNumber || '', v.vin || ''])).toEqual([['12', ''], ['', '1FUJGLDR5CLBP8834']])
  })
  it('still folds copies of one vehicle that have nothing to tell them apart', () => {
    // every new repair order saves its own vehicle record
    expect(mergeSavedTrucks([], [truck({}), truck({ id: 't2' })])).toHaveLength(1)
    expect(mergeSavedTrucks([], [truck({ vin: '1FUJGLDR5CLBP8834' }), truck({ id: 't2' })])).toHaveLength(1)
  })
  it('names a truck that only has a number', () => {
    expect(mergeSavedTrucks([], [truck({ year: null, make: '', model: '', unitNumber: '77' })])[0].name).toBe('Truck 77')
  })
})

describe('truckBodyFromForm', () => {
  it('sends only what was filled in', () => {
    expect(truckBodyFromForm({ unitNumber: ' 12 ', vehicle: '2019 Freightliner Cascadia', vin: '', mileage: '' }))
      .toEqual({ unit_number: '12', year: 2019, make: 'Freightliner', model: 'Cascadia' })
    expect(truckBodyFromForm({ unitNumber: '', vehicle: '', vin: '1FUJGLDR5CLBP8834', mileage: '1200' }))
      .toEqual({ unit_number: '', vin: '1FUJGLDR5CLBP8834', last_mileage: 1200 })
  })
})

describe('findSameTruck', () => {
  const trucks = [truck({ unitNumber: 'A1', vin: '1FUJGLDR5CLBP8834' })]
  it('matches by number or VIN, ignoring case', () => {
    expect(findSameTruck(trucks, { unitNumber: 'a1', vin: '' })?.id).toBe('t1')
    expect(findSameTruck(trucks, { unitNumber: '', vin: '1fujgldr5clbp8834' })?.id).toBe('t1')
  })
  it('does not match blanks', () => {
    expect(findSameTruck([truck({})], { unitNumber: '', vin: '' })).toBeUndefined()
  })
})

describe('voidedInvoiceRows', () => {
  const rows = [
    { id: 'a', status: 'paid', number: '1', amount: 5 },
    { id: 'b', status: 'void', number: '37-VOID', amount: '97.64', customer_name: 'Zain', invoice_day: '2026-11-25', shop_id: 's1', vehicle_text: 'Volvo', unit_number: '236' },
    { id: 'abcdef12-0000', status: 'void', number: null, amount: 10, ro_id: 'r1', ro_number: 'RO-20261101-0001', created_at: '2026-11-01T10:00:00Z' },
  ]
  it('returns only voided invoices, in the screen shape', () => {
    const out = voidedInvoiceRows(rows, [{ id: 'r1', shopId: 's2', vehicle: 'Mack' }])
    expect(out).toHaveLength(2)
    expect(out[0]).toMatchObject({ id: '37-VOID', customerName: 'Zain', total: 97.64, shopId: 's1', vehicle: 'Volvo', unitNumber: '236', created: '2026-11-25T12:00:00' })
    expect(out[1]).toMatchObject({ id: 'INV-20261101-0001', shopId: 's2', vehicle: 'Mack', total: 10 })
  })
  it('copes with no rows', () => {
    expect(voidedInvoiceRows(null)).toEqual([])
  })
})

describe('demo helpers', () => {
  it('writes a time that reads back as the same moment, not hours ahead', () => {
    const d = new Date(2026, 10, 26, 18, 5, 9)
    expect(localDateTime(d)).toBe('2026-11-26T18:05:09')
    expect(new Date(localDateTime(d)).getTime()).toBe(d.getTime())
  })
  it('returns the credit an invoice used, and nothing when it used none', () => {
    expect(returnedCreditEntry({ id: 'INV-1', creditApplied: 25 })).toMatchObject({ kind: 'adjustment', amount: 25, invoice_number: 'INV-1' })
    expect(returnedCreditEntry({ id: 'INV-2' })).toBeNull()
  })
  it('names the shop on demo repair orders', () => {
    const out = withShopNames([{ id: 1, shopId: 2 }, { id: 2, shopId: 9 }], [{ id: 2, name: 'Midtown' }])
    expect(out.map(r => r.shopName)).toEqual(['Midtown', ''])
  })
})
