import { describe, it, expect } from 'vitest'
import {
  truckFromRow, parseVehicleText, truckName, truckLabel, sameUnit, billedForTruck, truckStats, truckYears, describeWork, fleetCustomers, planTruck,
} from '../src/lib/trucks.js'

describe('truckFromRow', () => {
  it('maps an API row and never leaves nulls where the screens expect text', () => {
    expect(truckFromRow({ id: 'v1', customer_id: 'c1', customer_name: 'Our Fleet', year: 2019, make: 'Freightliner', model: 'Cascadia', unit_number: '5500', vin: '1FUJGLDR5CLBP8834', last_mileage: 400000 }))
      .toMatchObject({ id: 'v1', customerId: 'c1', year: 2019, unitNumber: '5500', vin: '1FUJGLDR5CLBP8834', mileage: 400000, trim: '' })
    expect(truckFromRow({ id: 'v2' })).toMatchObject({ make: '', model: '', unitNumber: '', vin: '', year: null, mileage: null })
  })
})

describe('parseVehicleText', () => {
  it('splits year, make and model', () => {
    expect(parseVehicleText('2019 Freightliner Cascadia')).toEqual({ year: 2019, make: 'Freightliner', model: 'Cascadia' })
    expect(parseVehicleText('  2021   Kenworth  T680  Sleeper ')).toEqual({ year: 2021, make: 'Kenworth', model: 'T680 Sleeper' })
  })
  it('works without a year or a model', () => {
    expect(parseVehicleText('Peterbilt 579')).toEqual({ year: null, make: 'Peterbilt', model: '579' })
    expect(parseVehicleText('2020 Volvo')).toEqual({ year: 2020, make: 'Volvo', model: null })
    expect(parseVehicleText('Mack')).toEqual({ year: null, make: 'Mack', model: null })
  })
  it('does not take a number that is not a year', () => {
    expect(parseVehicleText('5500 Freightliner')).toEqual({ year: null, make: '5500', model: 'Freightliner' })
  })
  it('handles empty input', () => {
    expect(parseVehicleText('')).toEqual({ year: null, make: null, model: null })
    expect(parseVehicleText(null)).toEqual({ year: null, make: null, model: null })
  })
})

describe('labels', () => {
  it('names and labels a truck', () => {
    const t = { unitNumber: '5500', year: 2019, make: 'Freightliner', model: 'Cascadia' }
    expect(truckName(t)).toBe('2019 Freightliner Cascadia')
    expect(truckLabel(t)).toBe('Truck 5500 · 2019 Freightliner Cascadia')
    expect(truckLabel({ unitNumber: '9' })).toBe('Truck 9')
    expect(truckLabel({ make: 'Mack' })).toBe('Truck · Mack')
  })
  it('matches the same truck number ignoring case and spaces, never an empty one', () => {
    expect(sameUnit(' az4688 ', 'AZ4688')).toBe(true)
    expect(sameUnit('5500', '5501')).toBe(false)
    expect(sameUnit('', '')).toBe(false)
    expect(sameUnit(null, undefined)).toBe(false)
  })
})

describe('planTruck (find or add the truck typed on an invoice)', () => {
  const have = [
    { id: 't1', unitNumber: '5500', vin: '1FUJGLDR5CLBP8834' },
    { id: 't2', unitNumber: 'AZ4688', vin: '' },
  ]
  const C = '00000000-0000-0000-0000-0000000000c1'

  it('does nothing when no truck number and no valid VIN is typed', () => {
    expect(planTruck({ trucks: have, customerId: C, unitNumber: '', vin: '', vehicleText: '2019 Mack' })).toEqual({ action: 'none' })
    expect(planTruck({ trucks: have, customerId: C, unitNumber: '  ', vin: 'SHORT', vehicleText: '' })).toEqual({ action: 'none' })
  })
  it('reuses a truck with the same number, ignoring case and spaces (never a duplicate)', () => {
    expect(planTruck({ trucks: have, customerId: C, unitNumber: ' az4688 ', vin: '', vehicleText: '' })).toEqual({ action: 'use', id: 't2' })
  })
  it('reuses a truck with the same VIN even if the number differs', () => {
    expect(planTruck({ trucks: have, customerId: C, unitNumber: '9999', vin: '1fujgldr5clbp8834', vehicleText: '' })).toEqual({ action: 'use', id: 't1' })
  })
  it('adds a new truck with its parsed year, make and model', () => {
    expect(planTruck({ trucks: have, customerId: C, unitNumber: '236', vin: '1XKYD49X5MJ442517', vehicleText: '2021 Kenworth T680' })).toEqual({
      action: 'create',
      body: { customer_id: C, unit_number: '236', vin: '1XKYD49X5MJ442517', year: 2021, make: 'Kenworth', model: 'T680' },
    })
  })
  it('keeps a bad VIN off the new truck (it stays on the invoice only)', () => {
    const plan = planTruck({ trucks: [], customerId: C, unitNumber: '77', vin: 'NOTAVIN', vehicleText: '' })
    expect(plan.action).toBe('create')
    expect('vin' in plan.body).toBe(false)
    expect(plan.body.unit_number).toBe('77')
  })
  it('adds a truck from a valid VIN alone', () => {
    expect(planTruck({ trucks: [], customerId: C, unitNumber: '', vin: '1FUJGLDR5CLBP8834', vehicleText: '' }).action).toBe('create')
  })
  it('works with no trucks saved yet', () => {
    expect(planTruck({ trucks: null, customerId: C, unitNumber: '5', vin: '', vehicleText: '' }).action).toBe('create')
  })
})

describe('truck costs', () => {
  const inv = (o) => ({ id: 'i', vehicleId: 't1', status: 'sent', created: '2026-03-10T12:00:00', total: 100, ...o })
  const list = [
    inv({ id: 'a', total: 250.5, created: '2026-03-10T12:00:00' }),
    inv({ id: 'b', total: 100, status: 'paid', created: '2026-09-01T12:00:00' }),
    inv({ id: 'c', total: 999, status: 'draft' }), // drafts are not spent
    inv({ id: 'd', total: 40, created: '2025-12-30T12:00:00' }),
    inv({ id: 'e', total: 500, vehicleId: 't2' }), // another truck
    inv({ id: 'f', total: 77, status: 'void' }),
  ]
  it('leaves out drafts, voids and other trucks', () => {
    expect(billedForTruck(list, 't1').map(i => i.id)).toEqual(['a', 'b', 'd'])
  })
  it('totals one year, with the count and the latest date', () => {
    expect(truckStats({ id: 't1' }, list, 2026)).toEqual({ spent: 350.5, count: 2, lastWorked: '2026-09-01' })
    expect(truckStats({ id: 't1' }, list, 2025)).toEqual({ spent: 40, count: 1, lastWorked: '2025-12-30' })
  })
  it('totals all time', () => {
    expect(truckStats({ id: 't1' }, list, 'all')).toEqual({ spent: 390.5, count: 3, lastWorked: '2026-09-01' })
  })
  it('a truck with no invoices has nothing spent and no last date', () => {
    expect(truckStats({ id: 't9' }, list, 2026)).toEqual({ spent: 0, count: 0, lastWorked: null })
    expect(truckStats({ id: 't1' }, null, 'all')).toEqual({ spent: 0, count: 0, lastWorked: null })
  })
  it('lists the years that have invoices, newest first', () => {
    expect(truckYears({ id: 't1' }, list)).toEqual([2026, 2025])
  })
  it('keeps a negative invoice (a credit) in the total', () => {
    expect(truckStats({ id: 't1' }, [inv({ total: 300 }), inv({ total: -50 })], 'all').spent).toBe(250)
  })
})

describe('describeWork', () => {
  it('uses the job title, and lists parts with quantities', () => {
    const d = describeWork({ jobTitle: 'Brake job', lines: [
      { desc: 'Labor', type: 'labor', qty: 2, price: 100 },
      { desc: 'Brake pads', type: 'part', qty: 4, price: 30 },
      { desc: 'Rotor', type: 'part', qty: 1, price: 90 },
    ] })
    expect(d).toEqual({ work: 'Brake job', parts: 'Brake pads (x4), Rotor' })
  })
  it('without a job title, lists the labor and fee lines', () => {
    expect(describeWork({ lines: [{ desc: 'Diagnostics', type: 'labor', qty: 1, price: 1 }, { desc: 'Shop supplies', type: 'fee', qty: 1, price: 1 }] }).work)
      .toBe('Diagnostics, Shop supplies')
  })
  it('works from older invoices that only kept services', () => {
    expect(describeWork({ services: [{ name: 'Air line', labor: 50, parts: 30 }] })).toEqual({ work: 'Air line', parts: 'Air line' })
  })
  it('copes with an empty invoice', () => {
    expect(describeWork({})).toEqual({ work: '', parts: '' })
    expect(describeWork(null)).toEqual({ work: '', parts: '' })
  })
})

describe('fleetCustomers', () => {
  it('finds the customers flagged as the shop\'s own fleet', () => {
    expect(fleetCustomers([{ id: 1, is_fleet: true }, { id: 2, is_fleet: false }, { id: 3 }, { id: 4, isFleet: true }]).map(c => c.id)).toEqual([1, 4])
    expect(fleetCustomers(null)).toEqual([])
  })
})
