import { useState, useEffect, useRef } from 'react'
import { Plus, Trash2, Printer, Check, Save, Send } from 'lucide-react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { useData } from '@/contexts/DataContext'
import { useAuth } from '@/contexts/AuthContext'
import {
  computeTotals, lineDisplay, linesFromInvoice, servicesFromItems,
  taxSettingsFor, invoiceNumberTaken, CARD_FEE_RATE,
} from '@/lib/invoiceLines'

// In-app invoice generator: create a printable invoice from scratch, from a
// repair order, or by reopening a saved invoice or draft. Every line keeps its
// quantity and unit price (labor quantity is hours, price is the rate), so an
// invoice can be reopened and edited without losing anything. The preview is
// rendered as white "paper" so Print / Save as PDF is true to what the
// customer receives.

const emptyItem = { desc: '', type: 'labor', qty: '1', price: '' }
const REVENUE_STAGES = new Set(['Complete', 'Invoiced', 'Paid'])

// Device-local autosave of an unsaved from-scratch invoice
const DRAFT_KEY = 'sc_invoice_draft_v1'
// The last tax settings used, so they are not retyped on every invoice
const TAX_PREF_KEY = 'sc_inv_tax_v1'

function readTaxPref() {
  try {
    const p = JSON.parse(localStorage.getItem(TAX_PREF_KEY) || 'null')
    if (p && p.rate !== undefined) return { rate: String(p.rate), labor: !!p.labor }
  } catch { /* use defaults */ }
  return { rate: '8.25', labor: false }
}
function writeTaxPref(rate, labor) {
  try { localStorage.setItem(TAX_PREF_KEY, JSON.stringify({ rate, labor })) } catch { /* per-viewer convenience */ }
}

function nextInvoiceNumber() {
  return `INV-${new Date().toISOString().slice(2, 10).replace(/-/g, '')}-${Math.floor(100 + Math.random() * 900)}`
}

// Map an RO's services into invoice line items
function itemsFromRO(ro) {
  const items = (ro.services || []).map(s => ({
    desc: s.name, type: 'labor', qty: '1', price: String(s.price ?? ''),
  }))
  return items.length ? items : [{ ...emptyItem }]
}

const fmt = v => `$${(Number(v) || 0).toFixed(2)}`
const n = v => Number(v) || 0

export function InvoiceGeneratorModal({ open, onClose, fromInvoice = null, fromRO = null }) {
  const { shops, repairOrders, addInvoice, invoices } = useData()
  const { session } = useAuth()
  const [savedFlash, setSavedFlash] = useState(false)
  const [savedOnServer, setSavedOnServer] = useState(false)

  const [shopId, setShopId] = useState('')
  const [roId, setRoId] = useState('')
  const [invNumber, setInvNumber] = useState(nextInvoiceNumber)
  const [invDate, setInvDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [status, setStatus] = useState('draft')
  const [customer, setCustomer] = useState('')
  const [vehicle, setVehicle] = useState('')
  const [unitNumber, setUnitNumber] = useState('')
  const [vin, setVin] = useState('')
  const [jobTitle, setJobTitle] = useState('')
  const [diagnostics, setDiagnostics] = useState('')
  const [items, setItems] = useState([{ ...emptyItem }])
  const [taxRate, setTaxRate] = useState(() => readTaxPref().rate)
  const [taxLabor, setTaxLabor] = useState(() => readTaxPref().labor)
  const [cardFee, setCardFee] = useState(false)
  // Categorize lines as labor/part/fee. Some shops bill flat line amounts
  // with no breakdown; remember the choice across sessions.
  const [itemize, setItemize] = useState(() => {
    try { return localStorage.getItem('sc_inv_itemize') !== '0' } catch { return true }
  })
  const toggleItemize = (on) => {
    setItemize(on)
    try { localStorage.setItem('sc_inv_itemize', on ? '1' : '0') } catch { /* per-viewer convenience only */ }
  }
  const changeTaxRate = (v) => { setTaxRate(v); writeTaxPref(v, taxLabor) }
  const changeTaxLabor = (v) => { setTaxLabor(v); writeTaxPref(taxRate, v) }
  const [notes, setNotes] = useState('')

  // Unsaved-changes tracking. The baseline is the form as it looked right after
  // opening (or after the last Save); anything different from it is unsaved.
  const snapshot = JSON.stringify({ shopId, roId, invNumber, invDate, customer, vehicle, unitNumber, vin, jobTitle, diagnostics, items, taxRate, taxLabor, cardFee, notes })
  const [baseline, setBaseline] = useState(null)
  const [initTick, setInitTick] = useState(0)
  const [restored, setRestored] = useState(false)
  const restoredRef = useRef(false)
  useEffect(() => {
    // Runs in the render after the open-time initialization has been applied.
    // A restored draft counts as unsaved until the user presses Save invoice.
    if (initTick > 0) setBaseline(restoredRef.current ? '__restored_draft__' : snapshot)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initTick])
  const dirty = open && baseline !== null && snapshot !== baseline
  const isScratch = !fromInvoice && !fromRO

  // Autosave: keep a copy of an unsaved from-scratch invoice on this computer
  // (not on the server) so closing or reloading never loses the work.
  useEffect(() => {
    if (!open || !dirty || !isScratch) return
    const t = setTimeout(() => {
      try { localStorage.setItem(DRAFT_KEY, snapshot) } catch { /* storage unavailable */ }
    }, 400)
    return () => clearTimeout(t)
  }, [open, dirty, isScratch, snapshot])

  const clearDraft = () => { try { localStorage.removeItem(DRAFT_KEY) } catch { /* ignore */ } }

  const handleClose = () => {
    if (dirty) {
      const msg = isScratch
        ? 'You have unsaved changes. A draft is kept on this computer so you can pick up where you left off, but it is not saved as an invoice yet. Close anyway?'
        : 'You have unsaved changes to this invoice. Close without saving?'
      if (!window.confirm(msg)) return
    }
    onClose()
  }

  // Also warn if the tab or window is closed with unsaved changes
  useEffect(() => {
    if (!dirty) return
    const warn = (e) => { e.preventDefault(); e.returnValue = '' }
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [dirty])

  const billableROs = repairOrders.filter(ro => REVENUE_STAGES.has(ro.stage))

  const applyRO = (ro) => {
    if (!ro) return
    setRoId(ro.id)
    setShopId(String(ro.shopId ?? ''))
    setCustomer(ro.customerName || '')
    setVehicle(ro.vehicle || '')
    setVin(ro.vin || '')
    setItems(itemsFromRO(ro))
  }

  const resetBlank = () => {
    const pref = readTaxPref()
    setRoId('')
    setCustomer(''); setVehicle(''); setUnitNumber(''); setVin('')
    setJobTitle(''); setDiagnostics(''); setNotes('')
    setItems([{ ...emptyItem }])
    setTaxRate(pref.rate); setTaxLabor(pref.labor); setCardFee(false)
  }

  // Initialize when opened
  useEffect(() => {
    if (!open) return
    setInvNumber(fromInvoice?.id || nextInvoiceNumber())
    setInvDate((fromInvoice?.created || new Date().toISOString()).slice(0, 10))
    setStatus(fromInvoice?.status || 'draft')
    if (fromInvoice) {
      const lines = linesFromInvoice(fromInvoice)
      const tax = taxSettingsFor(fromInvoice, Number(readTaxPref().rate) || 8.25)
      setRoId(fromInvoice.roId || '')
      setShopId(String(fromInvoice.shopId ?? ''))
      setCustomer(fromInvoice.customerName || '')
      setVehicle(fromInvoice.vehicle || '')
      setUnitNumber(fromInvoice.unitNumber || '')
      setVin(fromInvoice.vin || '')
      setJobTitle(fromInvoice.jobTitle || '')
      setDiagnostics(fromInvoice.diagnostics || '')
      setNotes(fromInvoice.notes || '')
      setItems(lines.length ? lines : [{ ...emptyItem }])
      setTaxRate(tax.taxRate)
      setTaxLabor(tax.taxLabor)
      setCardFee(!!fromInvoice.cardFee)
      if (typeof fromInvoice.itemize === 'boolean') setItemize(fromInvoice.itemize)
    } else if (fromRO) {
      resetBlank()
      applyRO(fromRO)
    } else {
      resetBlank()
      setShopId(String(session?.shopId ?? shops[0]?.id ?? ''))
    }
    setSavedFlash(false)

    // Restore an autosaved from-scratch draft, if there is one
    restoredRef.current = false
    setRestored(false)
    if (!fromInvoice && !fromRO) {
      try {
        const raw = localStorage.getItem(DRAFT_KEY)
        const d = raw ? JSON.parse(raw) : null
        if (d && Array.isArray(d.items)) {
          setShopId(String(d.shopId ?? ''))
          setRoId(d.roId || '')
          setInvNumber(d.invNumber || nextInvoiceNumber())
          setInvDate(d.invDate || new Date().toISOString().slice(0, 10))
          setCustomer(d.customer || '')
          setVehicle(d.vehicle || '')
          setUnitNumber(d.unitNumber || '')
          setVin(d.vin || '')
          setJobTitle(d.jobTitle || '')
          setDiagnostics(d.diagnostics || '')
          setItems(d.items.length ? d.items : [{ ...emptyItem }])
          setTaxRate(String(d.taxRate ?? readTaxPref().rate))
          setTaxLabor(!!d.taxLabor)
          setCardFee(!!d.cardFee)
          setNotes(d.notes || '')
          restoredRef.current = true
          setRestored(true)
        }
      } catch { /* ignore a corrupt draft */ }
    }
    setInitTick(t => t + 1)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  const shop = shops.find(s => String(s.id) === String(shopId))

  // Two invoices can never share a number: saving over an existing number used
  // to silently replace the earlier invoice.
  const numberTaken = invoiceNumberTaken(invoices, invNumber, fromInvoice?.id)
  const useNextFreeNumber = () => {
    let next = nextInvoiceNumber()
    for (let i = 0; i < 20 && invoiceNumberTaken(invoices, next, fromInvoice?.id); i++) next = nextInvoiceNumber()
    setInvNumber(next)
  }

  const totals = computeTotals({ items, itemize, taxRate, taxLabor, cardFee })
  const shown = items.filter(it => it.desc || n(it.price) > 0)
  const setItem = (idx, patch) => setItems(prev => prev.map((it, i) => i === idx ? { ...it, ...patch } : it))

  const save = async (nextStatus) => {
    if (numberTaken || !invNumber.trim()) return
    setBaseline(snapshot)
    restoredRef.current = false
    setRestored(false)
    clearDraft()
    const ro = repairOrders.find(r => String(r.id) === String(roId))
    const sentStatus = nextStatus || status
    const entry = await addInvoice({
      id: invNumber,
      roId: roId || null,
      shopId: shop?.id ?? null,
      customerId: ro?.customerId ?? fromInvoice?.customerId ?? null,
      customerName: customer,
      customerEmail: fromInvoice?.customerEmail ?? ro?.customerEmail ?? null,
      vehicle, unitNumber, vin, jobTitle, diagnostics, notes,
      status: sentStatus,
      created: `${invDate}T12:00:00`,
      paidAt: fromInvoice?.paidAt ?? null,
      paymentMethod: fromInvoice?.paymentMethod ?? null,
      // Quantity and unit price are kept on every line; `services` (one amount
      // per line) is kept for the list, export and older screens.
      lines: shown.map(it => ({ desc: it.desc || 'Item', type: it.type, qty: n(it.qty), price: n(it.price) })),
      services: servicesFromItems(items),
      taxRate: n(taxRate), taxLabor, itemize, cardFee,
      cardFeeAmount: totals.fee,
      subtotal: totals.subtotal,
      tax: totals.tax,
      total: totals.total,
    })
    setStatus(sentStatus)
    // Only invoices linked to a repair order reach the server; be honest about
    // where this one actually went.
    setSavedOnServer(!!entry?.dbId)
    setSavedFlash(true)
    setTimeout(() => setSavedFlash(false), 3500)
  }

  const field = 'w-full h-8 px-2.5 rounded-md bg-background border border-border text-xs text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-1 focus:ring-orange/40'
  const label = 'text-2xs font-semibold text-text-muted uppercase tracking-wider'

  return (
    <Modal open={open} onClose={handleClose} title="Invoice Generator" subtitle="Build, print, or save as PDF" size="full">
      <style>{`
        @media print {
          body * { visibility: hidden !important; }
          #sc-invoice-paper, #sc-invoice-paper * { visibility: visible !important; }
          #sc-invoice-paper { position: fixed !important; inset: 0 !important; width: 100% !important; border: none !important; border-radius: 0 !important; box-shadow: none !important; }
        }
      `}</style>
      <div className="p-5 grid lg:grid-cols-[380px_1fr] gap-6 items-start">
        {/* Controls */}
        <div className="space-y-4">
          {billableROs.length > 0 && (
            <div>
              <label className={label}>Fill from repair order</label>
              <select
                className={`${field} mt-1`}
                value={roId}
                onChange={e => {
                  const ro = billableROs.find(r => String(r.id) === e.target.value)
                  if (ro) applyRO(ro)
                  else setRoId('')
                }}
              >
                <option value="">Start blank…</option>
                {billableROs.map(ro => (
                  <option key={ro.id} value={ro.id}>
                    {ro.roNumber || ro.id} · {ro.customerName} · {ro.vehicle}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={label}>Shop</label>
              <select className={`${field} mt-1`} value={shopId} onChange={e => setShopId(e.target.value)}>
                {shops.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <div>
              <label className={label}>Invoice #</label>
              <input className={`${field} mt-1 ${numberTaken ? 'border-status-red' : ''}`} value={invNumber} onChange={e => setInvNumber(e.target.value)} />
              {numberTaken && (
                <p className="mt-1 text-2xs text-status-red">
                  That number is already used by another invoice.{' '}
                  <button type="button" onClick={useNextFreeNumber} className="font-semibold underline">Use a free number</button>
                </p>
              )}
            </div>
            <div>
              <label className={label}>Date</label>
              <input type="date" className={`${field} mt-1`} value={invDate} onChange={e => setInvDate(e.target.value)} />
            </div>
            <div>
              <label className={label}>Sales tax %</label>
              <input className={`${field} mt-1`} inputMode="decimal" value={taxRate} onChange={e => changeTaxRate(e.target.value)} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={label}>Customer</label>
              <input className={`${field} mt-1`} placeholder="Customer or company" value={customer} onChange={e => setCustomer(e.target.value)} />
            </div>
            <div>
              <label className={label}>Vehicle</label>
              <input className={`${field} mt-1`} placeholder="2019 Freightliner Cascadia" value={vehicle} onChange={e => setVehicle(e.target.value)} />
            </div>
            <div>
              <label className={label}>Truck #</label>
              <input className={`${field} mt-1`} placeholder="Unit or truck number" value={unitNumber} onChange={e => setUnitNumber(e.target.value)} />
            </div>
            <div>
              <label className={label}>VIN</label>
              <input className={`${field} mt-1 font-mono`} placeholder="17 characters" maxLength={17} value={vin} onChange={e => setVin(e.target.value.toUpperCase().replace(/\s/g, ''))} />
            </div>
          </div>

          <div>
            <label className={label}>What was the repair?</label>
            <input className={`${field} mt-1`} placeholder="e.g. Brake job, front axle" maxLength={120} value={jobTitle} onChange={e => setJobTitle(e.target.value)} />
          </div>

          <div>
            <label className={label}>Diagnostics</label>
            <textarea className={`${field} mt-1 h-16 py-2`} placeholder="What was found. Prints on the invoice." value={diagnostics} onChange={e => setDiagnostics(e.target.value)} />
          </div>

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
              {cardFee ? `Card fee ${Math.round(CARD_FEE_RATE * 100)}% added (${fmt(totals.fee)}). Click to remove` : `Add card fee ${Math.round(CARD_FEE_RATE * 100)}%`}
            </button>
            <p className="text-2xs text-text-muted">For customers paying by card. It is {Math.round(CARD_FEE_RATE * 100)}% of the total including tax and prints as its own line. Check your state's card surcharge rules.</p>
          </div>

          <div>
            <label className={label}>Notes / payment terms</label>
            <textarea className={`${field} mt-1 h-16 py-2`} value={notes} onChange={e => setNotes(e.target.value)} placeholder="e.g. Due on receipt. 12-month / 12,000-mile warranty." />
          </div>

          {restored && (
            <div className="flex items-center justify-between gap-3 rounded-lg border border-orange/20 bg-orange/[0.05] px-3 py-2 text-xs text-text-secondary">
              <span>We restored the draft you were working on. It is not saved as an invoice yet.</span>
              <button
                onClick={() => {
                  clearDraft()
                  restoredRef.current = false
                  setRestored(false)
                  resetBlank()
                  setInvNumber(nextInvoiceNumber())
                  setInitTick(t => t + 1)
                }}
                className="font-semibold text-orange hover:underline whitespace-nowrap"
              >
                Start fresh
              </button>
            </div>
          )}
          {dirty && (
            <p className="text-xs font-medium text-status-yellow">
              You have unsaved changes. Press Save invoice to keep them.
            </p>
          )}

          <div className="flex gap-2">
            <Button
              variant="secondary"
              className="flex-1"
              disabled={numberTaken || !invNumber.trim()}
              onClick={() => save()}
            >
              {savedFlash
                ? <><Check size={14} className="text-status-green" /> {savedOnServer ? 'Saved' : 'Saved on this computer'}</>
                : <><Save size={14} /> Save invoice</>}
            </Button>
            <Button className="flex-1" onClick={() => window.print()}>
              <Printer size={14} /> Print / PDF
            </Button>
          </div>
          {status === 'draft' && (
            <Button variant="secondary" className="w-full" disabled={numberTaken || !invNumber.trim()} onClick={() => save('sent')}>
              <Send size={14} /> Save and mark as sent
            </Button>
          )}
          {!roId && (
            <p className="text-xs text-text-muted">
              Invoices made from scratch are saved on this computer only for now, so keep using the same browser and press Export on the Invoices page now and then to keep a copy.
            </p>
          )}
          <p className="text-2xs text-text-muted">
            Print / PDF prints the paper preview on the right. In the print window, choose Save as PDF to get a PDF file.
          </p>
        </div>

        {/* Paper preview: always light, print-faithful */}
        <div id="sc-invoice-paper" className="rounded-xl border border-border bg-white text-slate-900 p-7 shadow-sm min-h-[480px]">
          <div className="flex items-start justify-between gap-4 pb-4 border-b border-slate-200">
            <div>
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
                <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-0.5">Truck #</div>
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
              <div className="flex justify-between text-slate-600"><span>Card fee {Math.round(CARD_FEE_RATE * 100)}%</span><span className="tabular-nums">{fmt(totals.fee)}</span></div>
            )}
            <div className="flex justify-between pt-1.5 border-t border-slate-200 text-base font-bold"><span>Total due</span><span className="tabular-nums">{fmt(totals.total)}</span></div>
          </div>

          {notes && <div className="mt-4 pt-3 border-t border-slate-100 text-xs text-slate-500 whitespace-pre-wrap">{notes}</div>}
        </div>
      </div>
    </Modal>
  )
}
