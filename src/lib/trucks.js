// Trucks: the shop's own fleet and the trucks customers bring in. Pure helpers
// for the truck picker in the invoice generator and the Fleet page.

const num = v => { const x = Number(v); return Number.isFinite(x) ? x : 0 }
const round2 = v => Math.round((num(v) + Number.EPSILON) * 100) / 100

/** A vehicles row from the API in the shape the screens use. */
export function truckFromRow(r) {
  return {
    id: r.id,
    customerId: r.customer_id ?? null,
    customerName: r.customer_name || '',
    year: r.year ?? null,
    make: r.make || '',
    model: r.model || '',
    trim: r.trim || '',
    vin: r.vin || '',
    unitNumber: r.unit_number || '',
    mileage: r.last_mileage ?? null,
    license: r.license || '',
  }
}

/** "2019 Freightliner Cascadia" split into year, make and model (no year is fine). */
export function parseVehicleText(text) {
  const s = String(text ?? '').trim().replace(/\s+/g, ' ')
  if (!s) return { year: null, make: null, model: null }
  const m = s.match(/^(\d{4})\s+(\S+)(?:\s+(.*))?$/)
  if (m && Number(m[1]) >= 1900 && Number(m[1]) <= 2100) {
    return { year: Number(m[1]), make: m[2], model: m[3] || null }
  }
  const [make, ...rest] = s.split(' ')
  return { year: null, make, model: rest.join(' ') || null }
}

/** "2019 Freightliner Cascadia" from a truck. */
export function truckName(t) {
  return [t?.year, t?.make, t?.model, t?.trim].filter(Boolean).join(' ')
}

/** One line to pick a truck by: "Truck 5500 · 2019 Freightliner Cascadia". */
export function truckLabel(t) {
  const name = truckName(t)
  const unit = t?.unitNumber ? `Truck ${t.unitNumber}` : 'Truck'
  return name ? `${unit} · ${name}` : unit
}

/** The same truck number, ignoring case and spaces (so it is not added twice). */
export function sameUnit(a, b) {
  const x = String(a ?? '').trim().toLowerCase()
  const y = String(b ?? '').trim().toLowerCase()
  return x !== '' && x === y
}

const VIN_OK = /^[A-HJ-NPR-Z0-9]{17}$/

/**
 * What to do about the truck typed on an invoice for a known customer:
 *  - none: nothing identifies a truck (no truck number and no valid VIN)
 *  - use: the customer already has it (same truck number, or same VIN): reuse it
 *  - create: add it, with the body to send to the vehicles API
 * A VIN that is not a valid 17-character VIN is kept on the invoice but never sent.
 */
export function planTruck({ trucks, customerId, unitNumber, vin, vehicleText }) {
  const unit = String(unitNumber ?? '').trim()
  const v = String(vin ?? '').trim().toUpperCase()
  const goodVin = VIN_OK.test(v) ? v : ''
  if (!unit && !goodVin) return { action: 'none' }
  const existing = (trucks || []).find(t => (unit && sameUnit(t.unitNumber, unit)) || (goodVin && String(t.vin || '').toUpperCase() === goodVin))
  if (existing) return { action: 'use', id: existing.id }
  const { year, make, model } = parseVehicleText(vehicleText)
  return {
    action: 'create',
    body: {
      customer_id: customerId,
      ...(unit ? { unit_number: unit } : {}),
      ...(goodVin ? { vin: goodVin } : {}),
      ...(year ? { year } : {}),
      ...(make ? { make } : {}),
      ...(model ? { model } : {}),
    },
  }
}

/** Invoices for one truck that count toward what was spent on it: not drafts. */
export function billedForTruck(invoices, truckId) {
  return (invoices || []).filter(i => i && i.vehicleId === truckId && i.status !== 'draft' && i.status !== 'void')
}

/** The calendar year (number) an invoice belongs to, from its date. */
const yearOf = inv => Number(String(inv?.created || '').slice(0, 4)) || null

/**
 * What a truck has cost: total of its invoices (drafts left out) in one year, or
 * all time when year is 'all'; how many; and the date of the latest one.
 */
export function truckStats(truck, invoices, year = 'all') {
  const rows = billedForTruck(invoices, truck?.id).filter(i => year === 'all' || yearOf(i) === Number(year))
  const spent = round2(rows.reduce((s, i) => s + num(i.total), 0))
  const dates = rows.map(i => String(i.created || '').slice(0, 10)).filter(Boolean).sort()
  return { spent, count: rows.length, lastWorked: dates.length ? dates[dates.length - 1] : null }
}

/** Years that have invoices for this truck, newest first (for the year picker). */
export function truckYears(truck, invoices) {
  const ys = new Set(billedForTruck(invoices, truck?.id).map(yearOf).filter(Boolean))
  return [...ys].sort((a, b) => b - a)
}

/**
 * What was done and which parts, for the truck's invoice list. Work is the job
 * title, else the labor and fee lines; parts are the part lines with quantities.
 */
export function describeWork(inv) {
  const lines = Array.isArray(inv?.lines) && inv.lines.length
    ? inv.lines
    : (inv?.services || []).flatMap(s => [
      num(s.labor) > 0 ? { desc: s.name, type: 'labor', qty: 1, price: s.labor } : null,
      num(s.parts) > 0 ? { desc: s.name, type: 'part', qty: 1, price: s.parts } : null,
    ].filter(Boolean))
  const work = lines.filter(l => l.type !== 'part').map(l => l.desc).filter(Boolean)
  const parts = lines.filter(l => l.type === 'part').map(l => (num(l.qty) > 1 ? `${l.desc} (x${num(l.qty)})` : l.desc)).filter(Boolean)
  return { work: inv?.jobTitle || work.join(', '), parts: parts.join(', ') }
}

/** The customers flagged as the shop's own fleet. */
export const fleetCustomers = customers => (customers || []).filter(c => c?.is_fleet === true || c?.isFleet === true)

/** A few trucks for the demo, so the Fleet page has something to show. */
export const DEMO_TRUCKS = [
  { id: 'demo-truck-1', customerId: 'demo-fleet', customerName: 'Our Fleet', year: 2019, make: 'Freightliner', model: 'Cascadia', trim: '', vin: '1FUJGLDR5CLBP8834', unitNumber: '5500', mileage: 412000, license: '' },
  { id: 'demo-truck-2', customerId: 'demo-fleet', customerName: 'Our Fleet', year: 2021, make: 'Kenworth', model: 'T680', trim: '', vin: '1XKYD49X5MJ442517', unitNumber: '236', mileage: 268500, license: '' },
  { id: 'demo-truck-3', customerId: 'demo-fleet', customerName: 'Our Fleet', year: 2017, make: 'Peterbilt', model: '579', trim: '', vin: '', unitNumber: 'AZ4688', mileage: null, license: '' },
]

/**
 * What to call the shop's own number for a vehicle. A truck shop (one that tracks its
 * own fleet, has a fleet customer, or already puts numbers on invoices) calls it
 * "Truck #". A car shop that has never used it sees the neutral "Vehicle ID".
 */
export function unitLabelFor({ shops = [], customers = [], invoices = [] } = {}) {
  const isTruckShop =
    shops.some(s => s?.fleetEnabled) ||
    customers.some(c => c?.is_fleet === true) ||
    invoices.some(i => i?.unitNumber)
  return isTruckShop ? 'Truck #' : 'Vehicle ID'
}
