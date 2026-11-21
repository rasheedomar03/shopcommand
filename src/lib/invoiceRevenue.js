// Revenue from paid invoices made from scratch (not tied to a repair order).
//
// The Dashboard and Reports add up repair order totals. A shop that bills with
// the invoice generator has no repair orders, so its revenue read $0. This adds
// paid from-scratch invoices on top. Invoices that come from a repair order are
// left out because their repair order is already counted, and counting both
// would count the same job twice.
//
// An invoice counts on the day it was paid (paidAt), or on the invoice date
// when no paid date was recorded. Internal (own fleet) invoices never count.
// This is a quick fix; revenue from invoices and payments replaces it later.

/**
 * Paid, made from scratch (no repair order), billed to a customer (not a shop's
 * own fleet). Counts whether it is saved on the server or only on this computer.
 */
export function isCountedInvoice(inv) {
  return !!inv && inv.status === 'paid' && !inv.roId && !inv.internal
}

/** YYYY-MM-DD the invoice counts on: the paid date, else the invoice date. */
export function revenueDay(inv) {
  return String(inv?.paidAt || inv?.created || '').slice(0, 10)
}

function sumWhere(invoices, shopId, test) {
  return (invoices || []).reduce((sum, inv) => {
    if (!isCountedInvoice(inv)) return sum
    if (shopId != null && String(inv.shopId) !== String(shopId)) return sum
    return test(revenueDay(inv)) ? sum + (Number(inv.total) || 0) : sum
  }, 0)
}

/** Revenue counted on one day (YYYY-MM-DD). */
export const sumOnDay = (invoices, ymd, shopId = null) => sumWhere(invoices, shopId, d => d === ymd)
/** Revenue counted in one month (YYYY-MM). */
export const sumInMonth = (invoices, ym, shopId = null) => sumWhere(invoices, shopId, d => d.slice(0, 7) === ym)
/** Revenue counted in one year (YYYY). */
export const sumInYear = (invoices, year, shopId = null) => sumWhere(invoices, shopId, d => d.slice(0, 4) === year)
/** Revenue counted on or after a day (YYYY-MM-DD). */
export const sumSince = (invoices, ymd, shopId = null) => sumWhere(invoices, shopId, d => d !== '' && d >= ymd)

/** Today, month-to-date and year-to-date for one shop. `today` is YYYY-MM-DD. */
export function invoiceRevenueTotals(invoices, today, shopId = null) {
  return {
    today: sumOnDay(invoices, today, shopId),
    mtd: sumInMonth(invoices, today.slice(0, 7), shopId),
    ytd: sumInYear(invoices, today.slice(0, 4), shopId),
  }
}
