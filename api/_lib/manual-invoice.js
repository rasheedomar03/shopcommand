// Invoices made from scratch (no repair order): validation, server-side totals
// and the mapping used by the one-time import of browser-only invoices.
//
// The totals rules mirror src/lib/invoiceLines.js computeTotals (tests/manual-invoice.test.js
// checks they agree): tax applies to parts, and to labor only when taxLabor is on;
// fee lines are never taxed; the card fee is cardFeeRate% of subtotal + tax.

const round2 = v => Math.round((Number(v) + Number.EPSILON) * 100) / 100
const num = v => { const x = Number(v); return Number.isFinite(x) ? x : 0 }

export const LINE_TYPES = ['labor', 'part', 'fee']
export const MAX_LINES = 100
const MAX_QTY = 100000
const MAX_PRICE = 10_000_000
const MAX_TOTAL = 10_000_000

export function computeManualTotals({ lines = [], itemize = true, taxRate = 0, taxLabor = false, cardFee = false, cardFeeRate = 3 } = {}) {
  const lt = l => num(l.qty) * num(l.price)
  const sum = pred => round2(lines.filter(pred).reduce((s, l) => s + lt(l), 0))
  const labor = sum(l => l.type === 'labor')
  const fees = sum(l => l.type === 'fee')
  const parts = sum(l => l.type !== 'labor' && l.type !== 'fee')
  const subtotal = round2(labor + parts + fees)
  const taxable = itemize ? parts + (taxLabor ? labor : 0) : subtotal
  const tax = round2(taxable * (num(taxRate) / 100))
  const fee = cardFee ? round2((subtotal + tax) * (num(cardFeeRate) / 100)) : 0
  const total = round2(subtotal + tax + fee)
  return { labor, parts, fees, subtotal, tax, fee, total }
}

const text = (v, max) => {
  if (v === undefined || v === null) return null
  const s = String(v).trim()
  return s ? s.slice(0, max) : null
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/

/**
 * Validate and normalize a from-scratch invoice body. Returns { error } or
 * { value } where value holds the cleaned fields plus server-computed totals.
 * Client-sent subtotal, tax and total are ignored on purpose.
 */
export function cleanManualInvoice(body) {
  const b = body || {}

  const customerName = text(b.customer_name, 120)
  if (!customerName) return { error: 'Customer name is required' }

  if (!Array.isArray(b.lines)) return { error: 'lines must be a list' }
  if (b.lines.length > MAX_LINES) return { error: `An invoice can have at most ${MAX_LINES} lines` }
  const lines = []
  for (const l of b.lines) {
    const qty = num(l?.qty)
    const price = num(l?.price)
    const desc = text(l?.desc, 200) || 'Item'
    if (qty < 0 || qty > MAX_QTY) return { error: 'Line quantity is out of range' }
    if (Math.abs(price) > MAX_PRICE) return { error: 'Line price is out of range' }
    // Negative prices are allowed on purpose (credits and discounts on a line)
    lines.push({ desc, type: LINE_TYPES.includes(l?.type) ? l.type : 'labor', qty, price })
  }

  const taxRate = b.tax_rate === undefined || b.tax_rate === null || b.tax_rate === '' ? 0 : Number(b.tax_rate)
  if (!Number.isFinite(taxRate) || taxRate < 0 || taxRate > 30) return { error: 'Tax rate must be between 0 and 30' }
  const cardFee = !!b.card_fee
  const cardFeeRate = b.card_fee_rate === undefined || b.card_fee_rate === null || b.card_fee_rate === '' ? 3 : Number(b.card_fee_rate)
  if (!Number.isFinite(cardFeeRate) || cardFeeRate < 0 || cardFeeRate > 15) return { error: 'Card fee rate must be between 0 and 15' }

  const email = text(b.customer_email, 200)
  if (email && !EMAIL_RE.test(email)) return { error: 'Customer email is not valid' }

  const vin = text(b.vin, 40)
  const mileage = b.mileage === undefined || b.mileage === null || b.mileage === '' ? null : Math.round(Number(b.mileage))
  if (mileage !== null && (!Number.isFinite(mileage) || mileage < 0 || mileage > 10_000_000)) return { error: 'Mileage is not valid' }

  for (const k of ['shop_id', 'customer_id', 'vehicle_id']) {
    if (b[k] !== undefined && b[k] !== null && b[k] !== '' && !UUID_RE.test(b[k])) return { error: `${k} is not valid` }
  }

  let invoiceDate = null
  if (b.invoice_date !== undefined && b.invoice_date !== null && b.invoice_date !== '') {
    if (!DATE_RE.test(String(b.invoice_date)) || Number.isNaN(Date.parse(b.invoice_date))) return { error: 'invoice_date must be YYYY-MM-DD' }
    invoiceDate = String(b.invoice_date)
  }

  const number = b.number === undefined || b.number === null || b.number === '' ? null : String(b.number).trim()
  if (number !== null && (number.length < 1 || number.length > 30)) return { error: 'Invoice number must be 1-30 characters' }

  const itemize = b.itemize === undefined ? true : !!b.itemize
  const taxLabor = !!b.tax_labor
  const totals = computeManualTotals({ lines, itemize, taxRate, taxLabor, cardFee, cardFeeRate })
  if (Math.abs(totals.total) > MAX_TOTAL) return { error: 'Invoice total is out of range' }
  if (totals.total < 0) return { error: 'Invoice total cannot be negative' }

  return {
    value: {
      number,
      invoice_date: invoiceDate,
      shop_id: b.shop_id || null,
      customer_id: b.customer_id || null,
      vehicle_id: b.vehicle_id || null,
      customer_name: customerName,
      customer_email: email,
      customer_phone: text(b.customer_phone, 40),
      company_name: text(b.company_name, 120),
      vehicle_text: text(b.vehicle_text, 160),
      vehicle_year: b.vehicle_year ? Math.round(Number(b.vehicle_year)) || null : null,
      vehicle_make: text(b.vehicle_make, 60),
      vehicle_model: text(b.vehicle_model, 60),
      unit_number: text(b.unit_number, 40),
      vin,
      mileage,
      job_title: text(b.job_title, 200),
      diagnostics: text(b.diagnostics, 4000),
      notes: text(b.notes, 4000),
      is_internal: !!b.is_internal,
      lines,
      itemize,
      tax_rate: taxRate,
      tax_labor: taxLabor,
      card_fee_rate: cardFee ? cardFeeRate : null,
      card_fee_amount: totals.fee,
      subtotal: totals.subtotal,
      tax: totals.tax,
      amount: totals.total,
      totals,
    },
  }
}

/** A readable default number, INV-YYMMDD-NNN, with a random suffix so retries differ. */
export function generateInvoiceNumber(date = new Date()) {
  const y = String(date.getFullYear()).slice(2)
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  const n = String(Math.floor(Math.random() * 1000)).padStart(3, '0')
  return `INV-${y}${m}${d}-${n}`
}

const PAYMENT_METHODS = ['visa', 'mastercard', 'amex', 'cash', 'check', 'financing', 'credit', 'other']

/** Map the free-text browser payment label ("Visa ending 4821", "Cash") to an allowed method. */
export function paymentMethodFromLabel(label) {
  const s = String(label || '').toLowerCase()
  if (s.includes('visa')) return 'visa'
  if (s.includes('master')) return 'mastercard'
  if (s.includes('amex') || s.includes('american')) return 'amex'
  if (s.includes('cash')) return 'cash'
  if (s.includes('check') || s.includes('cheque')) return 'check'
  if (s.includes('financ')) return 'financing'
  return PAYMENT_METHODS.includes(s) ? s : 'other'
}

const isoDay = v => {
  const s = String(v || '').slice(0, 10)
  return DATE_RE.test(s) && !Number.isNaN(Date.parse(s)) ? s : null
}

/**
 * Convert one browser-only invoice (the localStorage shape) into a database row.
 * Stored subtotal, tax and total are kept EXACTLY as the browser had them, not
 * recomputed: the import must never change what a customer was already shown.
 * Returns { error } or { row, payment }.
 */
export function rowFromLocalInvoice(inv) {
  const number = text(inv?.id, 30)
  if (!number) return { error: 'missing invoice number' }
  const total = round2(inv?.total)
  if (!Number.isFinite(total) || total < 0 || total > MAX_TOTAL) return { error: 'invalid total' }
  if (Array.isArray(inv?.lines) && inv.lines.length > MAX_LINES) return { error: 'too many lines' }

  // Prefer the stored lines (quantity and unit price); older invoices only kept
  // one amount per service, so turn each service into quantity-1 lines.
  let lines = []
  if (Array.isArray(inv?.lines) && inv.lines.length) {
    lines = inv.lines.map(l => ({
      desc: text(l?.desc, 200) || 'Item',
      type: LINE_TYPES.includes(l?.type) ? l.type : 'labor',
      qty: num(l?.qty ?? 1), price: num(l?.price),
    }))
  } else {
    for (const s of Array.isArray(inv?.services) ? inv.services : []) {
      const labor = num(s?.labor), parts = num(s?.parts)
      const both = labor > 0 && parts > 0
      const name = text(s?.name, 190) || 'Item'
      if (labor > 0) lines.push({ desc: both ? `${name} (labor)` : name, type: 'labor', qty: 1, price: labor })
      if (parts > 0) lines.push({ desc: both ? `${name} (parts)` : name, type: 'part', qty: 1, price: parts })
    }
  }

  const status = inv?.status === 'paid' ? 'paid' : inv?.status === 'draft' ? 'draft' : 'unpaid'
  const amountPaid = status === 'paid' ? total : Math.min(total, Math.max(0, round2(inv?.amountPaid)))
  const created = isoDay(inv?.created) || isoDay(new Date().toISOString())

  return {
    row: {
      number,
      status,
      invoice_date: created,
      created_at: inv?.created && !Number.isNaN(Date.parse(inv.created)) ? new Date(inv.created).toISOString() : null,
      paid_at: status === 'paid' ? (inv?.paidAt && !Number.isNaN(Date.parse(inv.paidAt)) ? new Date(inv.paidAt).toISOString() : null) : null,
      customer_name: text(inv?.customerName, 120) || 'Customer',
      customer_email: text(inv?.customerEmail, 200),
      vehicle_text: text(inv?.vehicle, 160),
      unit_number: text(inv?.unitNumber, 40),
      vin: text(inv?.vin, 40),
      job_title: text(inv?.jobTitle, 200),
      diagnostics: text(inv?.diagnostics, 4000),
      notes: text(inv?.notes, 4000),
      lines,
      itemize: inv?.itemize === undefined ? null : !!inv.itemize,
      tax_rate: inv?.taxRate === undefined || inv?.taxRate === null || inv?.taxRate === '' ? null : num(inv.taxRate),
      tax_labor: inv?.taxLabor === undefined ? null : !!inv.taxLabor,
      card_fee_rate: inv?.cardFee ? num(inv.cardFeeRate) || 3 : null,
      card_fee_amount: round2(inv?.cardFeeAmount),
      subtotal: inv?.subtotal === undefined || inv?.subtotal === null ? null : round2(inv.subtotal),
      tax: inv?.tax === undefined || inv?.tax === null ? null : round2(inv.tax),
      amount: total,
    },
    payment: amountPaid > 0
      ? { amount: amountPaid, method: paymentMethodFromLabel(inv?.paymentMethod), paid_at: status === 'paid' ? (inv?.paidAt || null) : null }
      : null,
  }
}
