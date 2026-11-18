// Pricing for editing and displaying invoices that live in the database.
//
// A database invoice's amount is copied from its repair order's total, which
// INCLUDES sales tax, while its editable line items are BEFORE tax. Editing
// used to re-save the amount as the sum of the lines, silently dropping the
// tax, even when only the invoice number or customer email changed.
//
// Rules here:
//   - Editing without changing the line items never changes the amount.
//   - Changing the line items re-prices them at the tax basis the invoice
//     already had (amount divided by its line total). If that basis looks
//     wrong (no lines, or outside 0 to 25 percent tax), use the repair order
//     default. A per-shop tax rate will replace this later.

export const DEFAULT_TAX_FACTOR = 1.085 // the repair order flow's 8.5%

const round2 = n => Math.round((Number(n) || 0) * 100) / 100

export function sumLines(lines) {
  return round2((lines || []).reduce((sum, l) => sum + (Number(l.parts) || 0) + (Number(l.labor) || 0), 0))
}

/** Tax multiplier already baked into a database invoice's amount. */
export function dbTaxFactor(invoice) {
  const base = sumLines(invoice.services)
  const total = Number(invoice.total) || 0
  const ratio = base > 0 ? total / base : 0
  return ratio >= 1 && ratio <= 1.25 ? ratio : DEFAULT_TAX_FACTOR
}

/**
 * What saving an edit of a database invoice should do. `lines` are the
 * edited line items ({ name, parts, labor }).
 */
export function priceInvoiceEdit(invoice, lines) {
  const original = sumLines(invoice.services)
  const subtotal = sumLines(lines)
  const total = round2(invoice.total)
  if (Math.abs(subtotal - original) <= 0.005) {
    // Lines untouched: the amount must not move
    return { changed: false, subtotal: original, tax: round2(Math.max(0, total - original)), total }
  }
  const newTotal = round2(subtotal * dbTaxFactor(invoice))
  return { changed: true, subtotal, tax: round2(newTotal - subtotal), total: newTotal }
}

/** Subtotal, tax, and total to display for any invoice. */
export function invoiceBreakdown(invoice) {
  const total = round2(invoice.total)
  if (!invoice.dbId) {
    return { subtotal: round2(invoice.subtotal), tax: round2(invoice.tax), total }
  }
  const subtotal = sumLines(invoice.services)
  if (subtotal <= 0) return { subtotal: total, tax: 0, total }
  return { subtotal, tax: round2(Math.max(0, total - subtotal)), total }
}
