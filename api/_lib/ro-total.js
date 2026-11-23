// The total of a repair order worked out from its saved lines: the service prices
// plus the parts used (price x quantity), plus sales tax. This is the same math the
// repair order screen uses (8.5%). It is only a safety net for an old or unsaved
// repair order whose stored total is still 0: without it, invoicing such an order
// made a $0 invoice.

const TAX_RATE = 0.085

const cents = (n) => Math.round((Number(n) || 0) * 100) / 100

export function roTotalFromData(data) {
  const services = Array.isArray(data?.services) ? data.services : []
  const parts = Array.isArray(data?.partsUsed) ? data.partsUsed : []
  const servicesSub = services.reduce((s, x) => s + (Number(x?.price) || 0), 0)
  const partsSub = parts.reduce((s, p) => s + (Number(p?.price) || 0) * (Number(p?.qty) || 1), 0)
  const subtotal = cents(servicesSub + partsSub)
  const tax = cents(subtotal * TAX_RATE)
  return cents(subtotal + tax)
}
