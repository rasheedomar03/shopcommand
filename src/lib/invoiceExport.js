// The invoice Export (CSV). Names and descriptions can contain commas, quotes and
// line breaks, so every text cell is quoted; without that a comma in a customer
// name shifts every column after it. Text that starts with = + - @ is prefixed so
// a spreadsheet never runs it as a formula. Numbers are written plain.

const money = v => (Number.isFinite(Number(v)) ? Number(v).toFixed(2) : '0.00')

/** One quoted, formula-safe text cell. */
export function csvText(value) {
  let s = String(value ?? '').replace(/\r?\n/g, ' ')
  if (/^[=+\-@\t]/.test(s)) s = `'${s}`
  return `"${s.replace(/"/g, '""')}"`
}

export const EXPORT_HEADERS = [
  'Invoice', 'Date', 'Customer', 'Vehicle', 'Truck #', 'VIN', 'Job', 'Status',
  'Subtotal', 'Tax', 'Card fee', 'Total', 'Paid', 'Balance',
]

/** The whole file as text (rows are the invoices as the screens hold them). */
export function invoicesToCsv(invoices) {
  const rows = (invoices || []).map(i => {
    const total = Number(i.total) || 0
    const paid = i.status === 'paid' ? total : Number(i.amountPaid) || 0
    return [
      csvText(i.id),
      csvText(String(i.created || '').slice(0, 10)),
      csvText(i.customerName),
      csvText(i.vehicle),
      csvText(i.unitNumber),
      csvText(i.vin),
      csvText(i.jobTitle),
      csvText(i.status),
      money(i.subtotal ?? total),
      money(i.tax),
      money(i.cardFeeAmount),
      money(total),
      money(paid),
      money(Math.round((total - paid) * 100) / 100),
    ].join(',')
  })
  return [EXPORT_HEADERS.map(csvText).join(','), ...rows].join('\r\n')
}
