// Invoice line items for from-scratch invoices: quantity and unit price are kept
// on every line so an invoice can be reopened and edited without losing them,
// and totals (tax, card fee) are calculated in one place.

/**
 * True when another invoice already uses this number (ignoring case and
 * spaces). `selfId` is the invoice being edited, which may keep its own number.
 */
export function invoiceNumberTaken(invoices, number, selfId = null) {
  const wanted = String(number ?? '').trim().toLowerCase()
  if (!wanted) return false
  return (invoices || []).some(i =>
    String(i?.id ?? '').trim().toLowerCase() === wanted && String(i?.id ?? '') !== String(selfId ?? '')
  )
}

/** Card processing fee passed on to the customer. Always 3%. */
export const CARD_FEE_RATE = 0.03

const round2 = v => Math.round((Number(v) + Number.EPSILON) * 100) / 100
const num = v => { const x = Number(v); return Number.isFinite(x) ? x : 0 }
const TYPES = ['labor', 'part', 'fee']

/**
 * @param {{items:Array, itemize?:boolean, taxRate?:number|string, taxLabor?:boolean, cardFee?:boolean}} p
 * Tax applies to parts (and to labor when taxLabor is on). Without itemizing
 * there is no labor/parts split, so the whole subtotal is taxed. The card fee
 * is 3% of subtotal plus tax.
 */
export function computeTotals({ items = [], itemize = true, taxRate = 0, taxLabor = false, cardFee = false } = {}) {
  const lineTotal = it => num(it.qty) * num(it.price)
  const sum = type => round2(items.filter(i => i.type === type).reduce((s, i) => s + lineTotal(i), 0))
  const labor = sum('labor')
  const fees = sum('fee') // core charges, shop supplies and the like: never taxed here
  const parts = round2(items.filter(i => i.type !== 'labor' && i.type !== 'fee').reduce((s, i) => s + lineTotal(i), 0))
  const subtotal = round2(labor + parts + fees)
  const taxable = itemize ? parts + (taxLabor ? labor : 0) : subtotal
  const tax = round2(taxable * (num(taxRate) / 100))
  const fee = cardFee ? round2((subtotal + tax) * CARD_FEE_RATE) : 0
  const total = round2(subtotal + tax + fee)
  return { labor, parts, fees, subtotal, tax, fee, total }
}

/**
 * What to show for one line. With a quantity of 1 only one amount is shown
 * (the total); with any other quantity, the unit price and the line total.
 */
export function lineDisplay(it) {
  const qty = num(it.qty)
  const unit = num(it.price)
  return { qty, unit, total: round2(qty * unit), showUnit: qty !== 1 }
}

/** Line items for the generator from a saved invoice (new format, or older services). */
export function linesFromInvoice(inv) {
  if (Array.isArray(inv?.lines) && inv.lines.length) {
    return inv.lines.map(l => ({
      desc: String(l.desc ?? ''),
      type: TYPES.includes(l.type) ? l.type : 'labor',
      qty: String(l.qty ?? 1),
      price: String(l.price ?? ''),
    }))
  }
  // Older invoices only kept one amount per service (quantity was lost)
  const items = []
  for (const s of inv?.services || []) {
    const both = num(s.labor) > 0 && num(s.parts) > 0
    if (num(s.labor) > 0) items.push({ desc: both ? `${s.name} (labor)` : s.name, type: 'labor', qty: '1', price: String(s.labor) })
    if (num(s.parts) > 0) items.push({ desc: both ? `${s.name} (parts)` : s.name, type: 'part', qty: '1', price: String(s.parts) })
  }
  return items
}

/** The older services shape (one amount per line) kept for lists, exports and the detail view. */
export function servicesFromItems(items) {
  return items
    .filter(it => it.desc || num(it.price) > 0)
    .map(it => {
      const total = round2(num(it.qty) * num(it.price))
      return { name: it.desc || 'Item', parts: it.type === 'labor' ? 0 : total, labor: it.type === 'labor' ? total : 0 }
    })
}

/**
 * Tax settings for an invoice. New invoices store them; for older ones, work
 * out the rate (and whether labor was taxed) from the saved tax amount so that
 * reopening a draft does not change its total.
 */
export function taxSettingsFor(inv, fallbackRate = 8.25) {
  if (inv?.taxRate !== undefined && inv?.taxRate !== null && inv?.taxRate !== '') {
    return { taxRate: String(inv.taxRate), taxLabor: !!inv.taxLabor }
  }
  const tax = num(inv?.tax)
  const parts = (inv?.services || []).reduce((s, x) => s + num(x.parts), 0)
  const labor = (inv?.services || []).reduce((s, x) => s + num(x.labor), 0)
  if (tax <= 0) return { taxRate: String(fallbackRate), taxLabor: false }
  const candidates = []
  if (parts > 0) candidates.push({ rate: (tax / parts) * 100, taxLabor: false })
  if (labor > 0) candidates.push({ rate: (tax / (parts + labor)) * 100, taxLabor: true })
  if (!candidates.length) return { taxRate: String(fallbackRate), taxLabor: false }
  candidates.sort((a, b) => Math.abs(a.rate - fallbackRate) - Math.abs(b.rate - fallbackRate))
  return { taxRate: String(round2(candidates[0].rate)), taxLabor: candidates[0].taxLabor }
}
