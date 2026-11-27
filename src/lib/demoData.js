// Small pure helpers for the demo account, which has no server to do these.

/** The ledger entry that gives back the credit an invoice used (undo or void), or null. */
export function returnedCreditEntry(invoice) {
  const amount = Number(invoice?.creditApplied) || 0
  if (!(amount > 0)) return null
  return {
    id: `demo-${Date.now()}-${Math.random()}`,
    kind: 'adjustment',
    amount,
    note: 'Credit returned',
    created_at: new Date().toISOString(),
    invoice_number: invoice.id,
  }
}

/**
 * "2026-11-26T18:05:09" on this computer's clock. A time written without a zone is
 * read back as local, so it must not be written from the UTC clock.
 */
export function localDateTime(d) {
  const p = n => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`
}

/** Demo repair orders carry a shop id but no shop name; fill the name in. */
export function withShopNames(repairOrders, shops) {
  return repairOrders.map(r => ({ ...r, shopName: r.shopName || shops.find(s => s.id === r.shopId)?.name || '' }))
}
