import { logoOf } from '@/lib/shopLogo'
import { lineDisplay } from '@/lib/invoiceLines'
import { fmt, n } from '@/lib/invoiceForm'

/** The invoice as the customer sees it: shown as the preview and again as the print copy. */
export function InvoicePaper({
  shop, invNumber, invDate, roId, customer, vehicle, unitLabel, unitNumber, vin, jobTitle,
  diagnostics, shown, itemize, totals, taxRate, taxLabor, cardFee, feeLabel, notes,
}) {
  return (
    <>
      <div className="flex items-start justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          {logoOf(shop) && <img src={logoOf(shop).src} alt="" style={{ width: logoOf(shop).width, maxWidth: '100%', height: 'auto', marginBottom: 6 }} />}
          <div className="text-base font-bold text-slate-900">{shop?.name || 'Shop'}</div>
          {shop?.address && <div className="text-xs text-slate-500 mt-0.5">{shop.address}</div>}
          {shop?.phone && <div className="text-xs text-slate-500 mt-0.5">{shop.phone}</div>}
        </div>
        <div className="text-right shrink-0">
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Invoice</div>
          <div className="text-sm font-semibold">{invNumber}</div>
          <div className="text-xs text-slate-500">{new Date(invDate + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</div>
          {roId && <div className="text-[10px] text-slate-400 mt-0.5">RO {roId}</div>}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-x-4 gap-y-2 py-3 border-b border-slate-200 text-sm">
        <div>
          <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-0.5">Bill to</div>
          <div className="font-medium">{customer || '-'}</div>
        </div>
        <div>
          <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-0.5">Vehicle</div>
          <div className="font-medium">{vehicle || '-'}</div>
        </div>
        {unitNumber && (
          <div>
            <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-0.5">{unitLabel}</div>
            <div className="font-medium">{unitNumber}</div>
          </div>
        )}
        {vin && (
          <div>
            <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-0.5">VIN</div>
            <div className="font-medium font-mono text-xs">{vin}</div>
          </div>
        )}
      </div>

      {jobTitle && <div className="mt-3 text-sm font-semibold">{jobTitle}</div>}
      {diagnostics && (
        <div className="mt-2">
          <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-0.5">Diagnostics</div>
          <div className="text-xs text-slate-600 whitespace-pre-wrap">{diagnostics}</div>
        </div>
      )}

      <table className="w-full text-sm mt-3">
        <thead>
          <tr className="text-[10px] text-slate-400 uppercase tracking-wider">
            <th className="text-left font-semibold pb-1.5">Description</th>
            <th className="text-right font-semibold pb-1.5 w-10">Qty</th>
            <th className="text-right font-semibold pb-1.5 w-20">Price</th>
            <th className="text-right font-semibold pb-1.5 w-20">Total</th>
          </tr>
        </thead>
        <tbody>
          {shown.map((it, i) => {
            const d = lineDisplay(it)
            return (
              <tr key={i} className="border-t border-slate-100">
                <td className="py-1.5">
                  {it.desc || '-'}
                  {itemize && <span className="ml-1.5 text-[9px] uppercase tracking-wider text-slate-400">{it.type}</span>}
                </td>
                <td className="py-1.5 text-right tabular-nums text-slate-600">{d.qty}</td>
                {/* One amount when the quantity is 1; price each and line total otherwise */}
                <td className="py-1.5 text-right tabular-nums text-slate-600">{d.showUnit ? fmt(d.unit) : ''}</td>
                <td className="py-1.5 text-right tabular-nums font-medium">{fmt(d.total)}</td>
              </tr>
            )
          })}
        </tbody>
      </table>

      <div className="mt-3 pt-3 border-t border-slate-200 space-y-1 text-sm">
        {itemize ? (
          <>
            {totals.labor > 0 && <div className="flex justify-between text-slate-600"><span>Labor</span><span className="tabular-nums">{fmt(totals.labor)}</span></div>}
            {totals.parts > 0 && <div className="flex justify-between text-slate-600"><span>Parts</span><span className="tabular-nums">{fmt(totals.parts)}</span></div>}
            {totals.fees > 0 && <div className="flex justify-between text-slate-600"><span>Fees</span><span className="tabular-nums">{fmt(totals.fees)}</span></div>}
          </>
        ) : (
          <div className="flex justify-between text-slate-600"><span>Subtotal</span><span className="tabular-nums">{fmt(totals.subtotal)}</span></div>
        )}
        {n(taxRate) > 0 && (
          <div className="flex justify-between text-slate-600"><span>Sales tax ({n(taxRate)}%{itemize && taxLabor ? ', parts and labor' : itemize ? ', parts' : ''})</span><span className="tabular-nums">{fmt(totals.tax)}</span></div>
        )}
        {cardFee && (
          <div className="flex justify-between text-slate-600"><span>{feeLabel}</span><span className="tabular-nums">{fmt(totals.fee)}</span></div>
        )}
        <div className="flex justify-between pt-1.5 border-t border-slate-200 text-base font-bold"><span>Total due</span><span className="tabular-nums">{fmt(totals.total)}</span></div>
      </div>

      {notes && <div className="mt-4 pt-3 border-t border-slate-100 text-xs text-slate-500 whitespace-pre-wrap">{notes}</div>}
    </>
  )
}
