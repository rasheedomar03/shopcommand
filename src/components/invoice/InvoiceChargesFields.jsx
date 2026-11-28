import { Plus, Trash2 } from 'lucide-react'
import { emptyItem, fmt, field, label } from '@/lib/invoiceForm'

/** What is charged: line items, tax and fee choices, notes. */
export function InvoiceChargesFields({
  items, setItems, setItem, itemize, toggleItemize, taxLabor, changeTaxLabor, cardFee, setCardFee,
  feeLabel, totals, cardFeeRate, changeCardFeeRate, notes, setNotes,
}) {
  return (
    <>
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <label className={label}>Line items</label>
          <button
            onClick={() => setItems(prev => [...prev, { ...emptyItem }])}
            className="flex items-center gap-1 text-2xs font-medium text-orange hover:text-orange/80 transition-colors"
          >
            <Plus size={11} /> Add line
          </button>
        </div>
        <div className="space-y-1.5">
          {items.map((it, i) => (
            <div key={i} className={itemize ? 'grid grid-cols-[1fr_68px_44px_64px_24px] gap-1.5 items-center' : 'grid grid-cols-[1fr_44px_64px_24px] gap-1.5 items-center'}>
              <input className={field} placeholder="Description" value={it.desc} onChange={e => setItem(i, { desc: e.target.value })} />
              {itemize && (
                <select className={field} value={it.type} onChange={e => setItem(i, { type: e.target.value })}>
                  <option value="labor">Labor</option>
                  <option value="part">Part</option>
                  <option value="fee">Fee</option>
                </select>
              )}
              <input className={field} inputMode="decimal" placeholder={it.type === 'labor' ? 'Hrs' : 'Qty'} value={it.qty} onChange={e => setItem(i, { qty: e.target.value })} />
              <input className={field} inputMode="decimal" placeholder="$ each" value={it.price} onChange={e => setItem(i, { price: e.target.value })} />
              <button
                onClick={() => setItems(prev => prev.length > 1 ? prev.filter((_, x) => x !== i) : prev)}
                aria-label="Remove line"
                className="p-1 rounded text-text-muted hover:text-status-red transition-colors"
              >
                <Trash2 size={12} />
              </button>
            </div>
          ))}
        </div>
        <p className="mt-1.5 text-2xs text-text-muted">Quantity times price each. For labor, enter hours and your hourly rate. Use Fee for core charges and shop supplies; fees are not taxed.</p>
      </div>

      <label className="flex items-center gap-2 cursor-pointer">
        <input type="checkbox" checked={itemize} onChange={e => toggleItemize(e.target.checked)} className="w-3.5 h-3.5 accent-orange-500" />
        <span className="text-xs text-text-secondary">Categorize lines as labor / part / fee <span className="text-text-muted">(off = plain line amounts)</span></span>
      </label>

      {itemize && (
        <label className="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" checked={taxLabor} onChange={e => changeTaxLabor(e.target.checked)} className="w-3.5 h-3.5 accent-orange-500" />
          <span className="text-xs text-text-secondary">Apply tax to labor <span className="text-text-muted">(varies by state)</span></span>
        </label>
      )}

      <div className="rounded-lg border border-border p-3 space-y-1.5">
        <button
          type="button"
          onClick={() => setCardFee(v => !v)}
          className={`w-full h-8 rounded-md text-xs font-semibold transition-colors ${cardFee ? 'bg-orange text-white hover:bg-orange/90' : 'border border-orange/40 text-orange hover:bg-orange/10'}`}
        >
          {cardFee ? `${feeLabel} added (${fmt(totals.fee)}). Click to remove` : `Add ${feeLabel.toLowerCase()}`}
        </button>
        <div className="flex items-center gap-2 text-2xs text-text-muted">
          <label htmlFor="sc-card-fee-rate">Fee percent</label>
          <input
            id="sc-card-fee-rate"
            className="w-16 h-7 px-2 rounded-md bg-background border border-border text-xs text-text-primary focus:outline-none focus:ring-1 focus:ring-orange/40"
            inputMode="decimal"
            value={cardFeeRate}
            onChange={e => changeCardFeeRate(e.target.value)}
          />
          <span>Remembered for next time.</span>
        </div>
        <p className="text-2xs text-text-muted">For customers paying by card. It is a percent of the total including tax and prints as its own line. Check your state's card surcharge rules.</p>
      </div>

      <div>
        <label className={label}>Notes / payment terms</label>
        <textarea className={`${field} mt-1 h-16 py-2`} value={notes} onChange={e => setNotes(e.target.value)} placeholder="e.g. Due on receipt. 12-month / 12,000-mile warranty." />
      </div>
    </>
  )
}
