import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { shops } from '@/data/mock'
import { formatCurrency } from '@/lib/utils'
import { Printer } from 'lucide-react'

const TAX_RATE = 0.085

const METHOD_LABELS = {
  'text-to-pay': 'Text-to-pay',
  'cash': 'Cash',
  'card': 'Card',
  'check': 'Check',
}

const STATUS_DOT = {
  green:  'bg-green-500',
  yellow: 'bg-yellow-400',
  red:    'bg-red-500',
}
const STATUS_DOT_HEX = {
  green:  '#22c55e',
  yellow: '#facc15',
  red:    '#ef4444',
}

function fmt(dateStr, opts) {
  return new Date(dateStr).toLocaleDateString('en-US', opts)
}
function fmtTime(dateStr) {
  return new Date(dateStr).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
}
function groupBy(arr, key) {
  return arr.reduce((acc, item) => {
    const g = item[key]
    if (!acc[g]) acc[g] = []
    acc[g].push(item)
    return acc
  }, {})
}
function chunk(arr, size) {
  const out = []
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size))
  return out
}

export function PrintPacketModal({ open, onClose, ro, payment }) {
  if (!ro) return null

  const shop = shops.find(s => s.id === ro.shopId) || {}
  const subtotal = ro.total
  const taxAmount = Math.round(subtotal * TAX_RATE * 100) / 100
  const grandTotal = subtotal + taxAmount
  const roDate = fmt(ro.updated, { month: 'long', day: 'numeric', year: 'numeric' })
  const paidDate = payment?.paidAt ? fmt(payment.paidAt, { month: 'long', day: 'numeric', year: 'numeric' }) : ''
  const paidTime = payment?.paidAt ? fmtTime(payment.paidAt) : ''
  const mpiGroups = ro.mpi ? Object.entries(groupBy(ro.mpi.items, 'category')) : []

  const handlePrint = () => {
    const w = window.open('', '_blank', 'width=780,height=1100')
    w.document.write(buildHTML({ ro, shop, subtotal, taxAmount, grandTotal, roDate, paidDate, paidTime, payment, mpiGroups }))
    w.document.close()
    w.focus()
    setTimeout(() => { w.print(); w.close() }, 250)
  }

  // ── Preview ───────────────────────────────────────────────────────────────
  return (
    <Modal open={open} onClose={onClose} title="Service Packet" subtitle={`${ro.id} · ${ro.customerName}`} size="lg">
      <div className="p-5 space-y-4">

        {/* White document preview */}
        <div className="bg-white rounded-lg border border-slate-200 p-6 text-slate-900 text-sm font-sans space-y-5">

          {/* Header */}
          <div className="flex justify-between items-start pb-4 border-b-2 border-slate-900">
            <div>
              <div className="text-lg font-bold text-slate-900">{shop.name}</div>
              <div className="text-xs text-slate-500 mt-1 leading-relaxed">
                {shop.address}<br />
                {shop.phone}
              </div>
            </div>
            <div className="text-right">
              <div className="text-xl font-bold text-orange-500">{ro.id}</div>
              <div className="text-xs text-slate-500 mt-0.5">{roDate}</div>
            </div>
          </div>

          {/* Customer + Vehicle + Tech */}
          <div className="grid grid-cols-3 gap-4">
            <div>
              <div className="text-[10px] font-semibold uppercase tracking-widest text-slate-400 mb-1">Customer</div>
              <div className="font-semibold text-slate-900">{ro.customerName}</div>
              <div className="text-xs text-slate-500 mt-0.5">{ro.customerPhone}</div>
            </div>
            <div>
              <div className="text-[10px] font-semibold uppercase tracking-widest text-slate-400 mb-1">Vehicle</div>
              <div className="font-semibold text-slate-900">{ro.vehicle}</div>
            </div>
            <div>
              <div className="text-[10px] font-semibold uppercase tracking-widest text-slate-400 mb-1">Technician</div>
              <div className="font-semibold text-slate-900">{ro.techName}</div>
            </div>
          </div>

          {/* VIN + Odometer */}
          <div className="grid grid-cols-2 gap-4 pt-1 border-t border-slate-100">
            <div>
              <div className="text-[10px] font-semibold uppercase tracking-widest text-slate-400 mb-1">VIN</div>
              <div className="font-mono text-xs text-slate-700 tracking-wide">{ro.vin || '—'}</div>
            </div>
            <div>
              <div className="text-[10px] font-semibold uppercase tracking-widest text-slate-400 mb-1">Odometer</div>
              <div className="text-xs text-slate-700">
                {ro.odometerIn != null && <span>In: <span className="font-semibold">{ro.odometerIn.toLocaleString()} mi</span></span>}
                {ro.odometerOut != null && <span className="ml-3">Out: <span className="font-semibold">{ro.odometerOut.toLocaleString()} mi</span></span>}
                {ro.odometerIn == null && '—'}
              </div>
            </div>
          </div>

          {/* Customer Concern */}
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-widest text-slate-400 mb-1.5">Customer Concern</div>
            <p className="text-slate-700 leading-relaxed">{ro.complaint}</p>
          </div>

          {/* Services */}
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-widest text-slate-400 mb-2">Services Performed</div>
            <div className="divide-y divide-slate-100">
              {ro.services.map((svc, i) => (
                <div key={i} className="flex justify-between items-center py-1.5">
                  <div className="flex items-center gap-2">
                    <span className="text-green-500 font-bold text-base leading-none">✓</span>
                    <span className="text-slate-800">{svc.name}</span>
                  </div>
                  <span className="font-semibold text-slate-900 tabular-nums">{formatCurrency(svc.price)}</span>
                </div>
              ))}
            </div>
            {/* Totals */}
            <div className="mt-3 pt-3 border-t border-slate-200 space-y-1">
              <div className="flex justify-between text-xs text-slate-500">
                <span>Subtotal</span>
                <span className="tabular-nums">{formatCurrency(subtotal)}</span>
              </div>
              <div className="flex justify-between text-xs text-slate-500">
                <span>Tax (8.5%)</span>
                <span className="tabular-nums">{formatCurrency(taxAmount)}</span>
              </div>
              <div className="flex justify-between items-baseline pt-2 border-t-2 border-slate-900 mt-2">
                <span className="font-bold text-slate-900 text-sm">Total</span>
                <span className="font-bold text-orange-500 text-lg tabular-nums">{formatCurrency(grandTotal)}</span>
              </div>
            </div>
          </div>

          {/* Payment */}
          {payment && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-3 flex items-center gap-3">
              <span className="text-green-600 text-lg font-bold">✓</span>
              <div>
                <div className="font-semibold text-green-800 text-sm">Paid — {formatCurrency(grandTotal)}</div>
                <div className="text-xs text-green-700 mt-0.5">
                  {METHOD_LABELS[payment.method]} · {paidDate} at {paidTime}
                </div>
              </div>
            </div>
          )}

          {/* Multi-Point Inspection */}
          {mpiGroups.length > 0 && (
            <div>
              <div className="text-[10px] font-semibold uppercase tracking-widest text-slate-400 mb-3">
                Vehicle Inspection
              </div>
              <div className="space-y-3">
                {mpiGroups.map(([category, items]) => (
                  <div key={category}>
                    <div className="text-[10px] font-semibold uppercase text-slate-400 mb-1.5">{category}</div>
                    <div className="grid grid-cols-2 gap-x-6 gap-y-1">
                      {items.map((item, i) => (
                        <div key={i} className="flex items-center gap-2">
                          <span className={`w-2 h-2 rounded-full flex-shrink-0 ${STATUS_DOT[item.status] || 'bg-slate-300'}`} />
                          <span className="text-xs text-slate-700">{item.label}</span>
                          {item.detail && (
                            <span className="text-[10px] text-slate-400 ml-auto whitespace-nowrap">{item.detail}</span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
              {/* Legend */}
              <div className="mt-3 flex gap-4 text-[10px] text-slate-400">
                {[['green', 'Good'], ['yellow', 'Monitor'], ['red', 'Urgent']].map(([s, label]) => (
                  <span key={s} className="flex items-center gap-1.5">
                    <span className={`w-2 h-2 rounded-full ${STATUS_DOT[s]}`} />
                    {label}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Recommendations */}
          {ro.nextServiceDue && (
            <div>
              <div className="text-[10px] font-semibold uppercase tracking-widest text-slate-400 mb-2">We Recommend</div>
              <div className="flex items-start gap-2 bg-orange-50 border border-orange-200 rounded-lg p-3">
                <span className="text-orange-500 font-bold mt-0.5">›</span>
                <div>
                  <div className="text-sm font-medium text-slate-800">
                    {ro.nextServiceDue.service} in ~{ro.nextServiceDue.miles.toLocaleString()} miles
                  </div>
                  <div className="text-xs text-slate-500 mt-0.5">
                    Call us or book online to schedule your next visit.
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Footer */}
          <div className="pt-4 border-t border-slate-200 text-center text-xs text-slate-400 leading-relaxed">
            Thank you for choosing <span className="font-semibold text-slate-600">{shop.name}</span>.<br />
            Call {shop.phone} to schedule your next service appointment.<br />
            <span className="text-[10px] mt-1 block">All parts and labor warranted for 12 months / 12,000 miles.</span>
          </div>

        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <Button variant="secondary" className="flex-1" onClick={onClose}>Close</Button>
          <Button className="flex-1" onClick={handlePrint}>
            <Printer size={14} />
            Print packet
          </Button>
        </div>

      </div>
    </Modal>
  )
}

// ── Print HTML ────────────────────────────────────────────────────────────────
function buildHTML({ ro, shop, subtotal, taxAmount, grandTotal, roDate, paidDate, paidTime, payment, mpiGroups }) {
  const serviceRows = ro.services.map(svc => `
    <tr>
      <td style="padding:8px 0;border-bottom:1px solid #f1f5f9;color:#0f172a;">
        <span style="color:#22c55e;margin-right:8px;font-weight:700;">✓</span>${svc.name}
      </td>
      <td style="padding:8px 0;border-bottom:1px solid #f1f5f9;text-align:right;font-weight:600;color:#0f172a;">${formatCurrency(svc.price)}</td>
    </tr>
  `).join('')

  const mpiSection = mpiGroups.length > 0 ? `
    <div class="section">
      <div class="section-label">Vehicle Inspection</div>
      ${mpiGroups.map(([category, items]) => `
        <div style="margin-bottom:14px;">
          <div style="font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;color:#94a3b8;border-bottom:1px solid #f1f5f9;padding-bottom:4px;margin-bottom:6px;">${category}</div>
          <table style="width:100%;border-collapse:collapse;">
            ${chunk(items, 2).map(pair => `
              <tr>
                ${pair.map(item => `
                  <td style="width:50%;padding:3px 16px 3px 0;font-size:12px;color:#334155;vertical-align:middle;">
                    <span style="color:${STATUS_DOT_HEX[item.status] || '#94a3b8'};font-size:11px;margin-right:5px;">&#9679;</span>${item.label}${item.detail ? `<span style="font-size:10px;color:#94a3b8;"> &mdash; ${item.detail}</span>` : ''}
                  </td>
                `).join('')}
                ${pair.length === 1 ? '<td style="width:50%;"></td>' : ''}
              </tr>
            `).join('')}
          </table>
        </div>
      `).join('')}
      <div style="margin-top:10px;padding-top:8px;border-top:1px solid #f1f5f9;font-size:10px;color:#94a3b8;">
        <span style="margin-right:14px;"><span style="color:#22c55e;">&#9679;</span> Good</span>
        <span style="margin-right:14px;"><span style="color:#facc15;">&#9679;</span> Monitor</span>
        <span><span style="color:#ef4444;">&#9679;</span> Urgent</span>
      </div>
    </div>
  ` : ''

  const recommendSection = ro.nextServiceDue ? `
    <div class="section">
      <div class="section-label">We Recommend</div>
      <div style="background:#fff7ed;border:1px solid #fed7aa;border-radius:8px;padding:12px 14px;display:flex;gap:10px;align-items:flex-start;">
        <span style="color:#f97316;font-weight:700;font-size:16px;line-height:1;">›</span>
        <div>
          <div style="font-size:13px;font-weight:600;color:#0f172a;">${ro.nextServiceDue.service} in ~${ro.nextServiceDue.miles.toLocaleString()} miles</div>
          <div style="font-size:11px;color:#64748b;margin-top:3px;">Call us or book online to schedule your next visit.</div>
        </div>
      </div>
    </div>
  ` : ''

  const paymentSection = payment ? `
    <div class="section">
      <div class="section-label">Payment</div>
      <div style="background:#f0fdf4;border:1px solid #86efac;border-radius:8px;padding:12px 14px;display:flex;gap:10px;align-items:center;">
        <span style="color:#16a34a;font-size:18px;font-weight:700;">✓</span>
        <div>
          <div style="font-size:13px;font-weight:700;color:#15803d;">Paid — ${formatCurrency(grandTotal)}</div>
          <div style="font-size:11px;color:#64748b;margin-top:2px;">${METHOD_LABELS[payment.method]} · ${paidDate} at ${paidTime}</div>
        </div>
      </div>
    </div>
  ` : ''

  const vinOdoRow = (ro.vin || ro.odometerIn != null) ? `
    <div class="meta-grid" style="grid-template-columns:1fr 1fr;margin-bottom:22px;padding-top:12px;border-top:1px solid #f1f5f9;">
      ${ro.vin ? `
        <div>
          <div class="meta-label">VIN</div>
          <div style="font-size:12px;font-family:monospace;letter-spacing:0.05em;color:#334155;">${ro.vin}</div>
        </div>
      ` : ''}
      ${ro.odometerIn != null ? `
        <div>
          <div class="meta-label">Odometer</div>
          <div class="meta-value" style="font-size:12px;">
            In: ${ro.odometerIn.toLocaleString()} mi
            ${ro.odometerOut != null ? `&nbsp;&nbsp;Out: ${ro.odometerOut.toLocaleString()} mi` : ''}
          </div>
        </div>
      ` : ''}
    </div>
  ` : ''

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>${ro.id} — Service Packet</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: -apple-system, 'Helvetica Neue', Arial, sans-serif; color: #0f172a; background: #fff; padding: 44px; max-width: 720px; margin: 0 auto; font-size: 13px; }
    .header { display: flex; justify-content: space-between; align-items: flex-start; padding-bottom: 18px; margin-bottom: 24px; border-bottom: 2px solid #0f172a; }
    .shop-name { font-size: 20px; font-weight: 700; color: #0f172a; }
    .shop-sub { font-size: 11px; color: #64748b; margin-top: 5px; line-height: 1.7; }
    .ro-number { font-size: 22px; font-weight: 700; color: #f97316; text-align: right; }
    .ro-date { font-size: 11px; color: #64748b; text-align: right; margin-top: 3px; }
    .section { margin-bottom: 22px; }
    .section-label { font-size: 9px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; color: #94a3b8; margin-bottom: 10px; padding-bottom: 6px; border-bottom: 1px solid #e2e8f0; }
    .meta-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 20px; margin-bottom: 22px; }
    .meta-label { font-size: 9px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; color: #94a3b8; margin-bottom: 4px; }
    .meta-value { font-size: 13px; font-weight: 600; color: #0f172a; }
    .meta-sub { font-size: 11px; color: #64748b; margin-top: 2px; }
    .concern { font-size: 13px; color: #334155; line-height: 1.6; }
    table { width: 100%; border-collapse: collapse; }
    .totals-row { display: flex; justify-content: space-between; font-size: 12px; color: #64748b; padding: 3px 0; }
    .total-final { display: flex; justify-content: space-between; align-items: baseline; font-size: 15px; font-weight: 700; padding: 10px 0 0; margin-top: 8px; border-top: 2px solid #0f172a; }
    .total-amount { font-size: 20px; color: #f97316; }
    .footer { margin-top: 32px; padding-top: 16px; border-top: 1px solid #e2e8f0; text-align: center; font-size: 11px; color: #94a3b8; line-height: 1.8; }
    .footer strong { color: #475569; }
    .warranty { font-size: 10px; color: #94a3b8; margin-top: 6px; }
    @media print { body { padding: 24px; } }
  </style>
</head>
<body>

  <div class="header">
    <div>
      <div class="shop-name">${shop.name || 'ShopCommand'}</div>
      <div class="shop-sub">${shop.address || ''}<br>${shop.phone || ''}</div>
    </div>
    <div>
      <div class="ro-number">${ro.id}</div>
      <div class="ro-date">${roDate}</div>
    </div>
  </div>

  <div class="meta-grid">
    <div>
      <div class="meta-label">Customer</div>
      <div class="meta-value">${ro.customerName}</div>
      <div class="meta-sub">${ro.customerPhone || ''}</div>
    </div>
    <div>
      <div class="meta-label">Vehicle</div>
      <div class="meta-value">${ro.vehicle}</div>
    </div>
    <div>
      <div class="meta-label">Technician</div>
      <div class="meta-value">${ro.techName}</div>
    </div>
  </div>

  ${vinOdoRow}

  <div class="section">
    <div class="section-label">Customer Concern</div>
    <p class="concern">${ro.complaint}</p>
  </div>

  <div class="section">
    <div class="section-label">Services Performed</div>
    <table>
      <tbody>${serviceRows}</tbody>
    </table>
    <div style="margin-top:12px;">
      <div class="totals-row"><span>Subtotal</span><span>${formatCurrency(subtotal)}</span></div>
      <div class="totals-row"><span>Tax (8.5%)</span><span>${formatCurrency(taxAmount)}</span></div>
      <div class="total-final"><span>Total</span><span class="total-amount">${formatCurrency(grandTotal)}</span></div>
    </div>
  </div>

  ${paymentSection}
  ${mpiSection}
  ${recommendSection}

  <div class="footer">
    Thank you for choosing <strong>${shop.name || 'our shop'}</strong>.<br>
    Call <strong>${shop.phone || ''}</strong> to schedule your next service appointment.<br>
    <div class="warranty">All parts and labor warranted for 12 months / 12,000 miles.</div>
  </div>

</body>
</html>`
}
