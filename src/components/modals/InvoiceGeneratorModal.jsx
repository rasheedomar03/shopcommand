import { useState, useEffect, useRef } from 'react'
import { Plus, Trash2, Printer, Check, Save, Send } from 'lucide-react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { useData } from '@/contexts/DataContext'
import { useAuth } from '@/contexts/AuthContext'
import { logoOf } from '@/lib/shopLogo'
import { PrintPortal } from '@/components/PrintPortal'
import { truckName, truckLabel } from '@/lib/trucks'
import { useCustomerTrucks } from '@/lib/useCustomerTrucks'
import {
  computeTotals, lineDisplay, linesFromInvoice, servicesFromItems,
  taxSettingsFor, invoiceNumberTaken,
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
    if (p && p.rate !== undefined) return { rate: String(p.rate), labor: !!p.labor, fee: String(p.fee ?? '3') }
  } catch { /* use defaults */ }
  return { rate: '8.25', labor: false, fee: '3' }
}
function writeTaxPref(rate, labor, fee) {
  try { localStorage.setItem(TAX_PREF_KEY, JSON.stringify({ rate, labor, fee })) } catch { /* per-viewer convenience */ }
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
  const { shops, repairOrders, addInvoice, invoices, voidInvoice, customers } = useData()
  const { session } = useAuth()
  const [savedFlash, setSavedFlash] = useState(false)
  const [savedOnServer, setSavedOnServer] = useState(false)
  // After the first save the invoice exists on the server: later saves edit it
  // (same id and number) instead of creating a second one
  const [savedDbId, setSavedDbId] = useState(null)
  const [savedNumber, setSavedNumber] = useState(null)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState(null)
  const [confirmVoid, setConfirmVoid] = useState(false)
  const [voiding, setVoiding] = useState(false)

  const [shopId, setShopId] = useState('')
  const [roId, setRoId] = useState('')
  const [invNumber, setInvNumber] = useState(nextInvoiceNumber)
  const [invDate, setInvDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [status, setStatus] = useState('draft')
  const [customer, setCustomer] = useState('')
  // Optional: with an email, the invoice can be emailed to the customer from its page
  const [customerEmail, setCustomerEmail] = useState('')
  // The customer this invoice belongs to, when the name typed is one of the shop's
  // customers. It links the invoice to the customer's profile (and stops that
  // customer from being deleted while they have invoices). null = just a name.
  const [customerId, setCustomerId] = useState(null)
  const changeCustomerName = (name) => {
    setCustomer(name)
    const wanted = name.trim().toLowerCase()
    const match = wanted ? (customers || []).find(c => String(c.name || '').trim().toLowerCase() === wanted) : null
    setCustomerId(match ? match.id : null)
    // Fill the email from the customer, but never overwrite one already typed
    if (match?.email && !customerEmail.trim()) setCustomerEmail(match.email)
  }
  const [vehicle, setVehicle] = useState('')
  const [unitNumber, setUnitNumber] = useState('')
  const [vin, setVin] = useState('')
  // The truck this invoice is for (picked from the customer's saved trucks, or
  // added when the invoice is saved). null = no truck link, just the typed text.
  const [vehicleId, setVehicleId] = useState(null)
  const { trucks, ensureTruck } = useCustomerTrucks(customerId, { demo: !!session?.demo })
  const pickTruck = (id) => {
    const t = trucks.find(x => String(x.id) === String(id))
    if (!t) { setVehicleId(null); return }
    setVehicleId(t.id)
    setVehicle(truckName(t))
    setUnitNumber(t.unitNumber)
    setVin(t.vin)
  }
  // Typing a different truck number or VIN means it is no longer the picked truck
  useEffect(() => {
    if (!vehicleId) return
    const t = trucks.find(x => x.id === vehicleId)
    if (t && (unitNumber.trim() !== t.unitNumber || vin.trim() !== t.vin)) setVehicleId(null)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [unitNumber, vin])
  const [jobTitle, setJobTitle] = useState('')
  const [diagnostics, setDiagnostics] = useState('')
  const [items, setItems] = useState([{ ...emptyItem }])
  const [taxRate, setTaxRate] = useState(() => readTaxPref().rate)
  const [taxLabor, setTaxLabor] = useState(() => readTaxPref().labor)
  const [cardFee, setCardFee] = useState(false)
  const [cardFeeRate, setCardFeeRate] = useState(() => readTaxPref().fee)
  // Categorize lines as labor/part/fee. Some shops bill flat line amounts
  // with no breakdown; remember the choice across sessions.
  const [itemize, setItemize] = useState(() => {
    try { return localStorage.getItem('sc_inv_itemize') !== '0' } catch { return true }
  })
  const toggleItemize = (on) => {
    setItemize(on)
    try { localStorage.setItem('sc_inv_itemize', on ? '1' : '0') } catch { /* per-viewer convenience only */ }
  }
  const changeTaxRate = (v) => { setTaxRate(v); writeTaxPref(v, taxLabor, cardFeeRate) }
  const changeTaxLabor = (v) => { setTaxLabor(v); writeTaxPref(taxRate, v, cardFeeRate) }
  const changeCardFeeRate = (v) => { setCardFeeRate(v); writeTaxPref(taxRate, taxLabor, v) }
  const [notes, setNotes] = useState('')

  // Unsaved-changes tracking. The baseline is the form as it looked right after
  // opening (or after the last Save); anything different from it is unsaved.
  const snapshot = JSON.stringify({ shopId, roId, invNumber, invDate, customer, customerId, vehicleId, customerEmail, vehicle, unitNumber, vin, jobTitle, diagnostics, items, taxRate, taxLabor, cardFee, cardFeeRate, notes })
  const emailInvalid = !!customerEmail.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customerEmail.trim())
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
    setCustomerId(ro.customerId ?? null)
    setCustomerEmail(ro.customerEmail || '')
    setVehicle(ro.vehicle || '')
    setVin(ro.vin || '')
    setVehicleId(ro.vehicleId ?? null)
    setItems(itemsFromRO(ro))
  }

  const resetBlank = () => {
    const pref = readTaxPref()
    setRoId('')
    setCustomer(''); setCustomerId(null); setCustomerEmail(''); setVehicle(''); setUnitNumber(''); setVin(''); setVehicleId(null)
    setJobTitle(''); setDiagnostics(''); setNotes('')
    setItems([{ ...emptyItem }])
    setTaxRate(pref.rate); setTaxLabor(pref.labor); setCardFee(false); setCardFeeRate(pref.fee)
  }

  // Initialize when opened
  useEffect(() => {
    if (!open) return
    setInvNumber(fromInvoice?.id || nextInvoiceNumber())
    setInvDate((fromInvoice?.created || new Date().toISOString()).slice(0, 10))
    setStatus(fromInvoice?.status || 'draft')
    setSavedDbId(fromInvoice?.dbId ?? null)
    setSavedNumber(null)
    setSaveError(null)
    setConfirmVoid(false)
    if (fromInvoice) {
      const lines = linesFromInvoice(fromInvoice)
      const tax = taxSettingsFor(fromInvoice, Number(readTaxPref().rate) || 8.25)
      setRoId(fromInvoice.roId || '')
      setShopId(String(fromInvoice.shopId ?? ''))
      setCustomer(fromInvoice.customerName || '')
      setCustomerId(fromInvoice.customerId ?? null)
      setCustomerEmail(fromInvoice.customerEmail || '')
      setVehicle(fromInvoice.vehicle || '')
      setUnitNumber(fromInvoice.unitNumber || '')
      setVin(fromInvoice.vin || '')
      setVehicleId(fromInvoice.vehicleId ?? null)
      setJobTitle(fromInvoice.jobTitle || '')
      setDiagnostics(fromInvoice.diagnostics || '')
      setNotes(fromInvoice.notes || '')
      setItems(lines.length ? lines : [{ ...emptyItem }])
      setTaxRate(tax.taxRate)
      setTaxLabor(tax.taxLabor)
      setCardFee(!!fromInvoice.cardFee)
      setCardFeeRate(String(fromInvoice.cardFeeRate ?? readTaxPref().fee))
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
          setCustomerId(d.customerId ?? null)
          setCustomerEmail(d.customerEmail || '')
          setVehicle(d.vehicle || '')
          setUnitNumber(d.unitNumber || '')
          setVin(d.vin || '')
          setVehicleId(d.vehicleId ?? null)
          setJobTitle(d.jobTitle || '')
          setDiagnostics(d.diagnostics || '')
          setItems(d.items.length ? d.items : [{ ...emptyItem }])
          setTaxRate(String(d.taxRate ?? readTaxPref().rate))
          setTaxLabor(!!d.taxLabor)
          setCardFee(!!d.cardFee)
          setCardFeeRate(String(d.cardFeeRate ?? readTaxPref().fee))
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
  const selfNumber = savedNumber ?? fromInvoice?.id // this invoice may keep its own number
  const numberTaken = invoiceNumberTaken(invoices, invNumber, selfNumber)
  const useNextFreeNumber = () => {
    let next = nextInvoiceNumber()
    for (let i = 0; i < 20 && invoiceNumberTaken(invoices, next, selfNumber); i++) next = nextInvoiceNumber()
    setInvNumber(next)
  }

  const totals = computeTotals({ items, itemize, taxRate, taxLabor, cardFee, cardFeeRate })
  const feeLabel = `Card fee ${n(cardFeeRate)}%`
  const shown = items.filter(it => it.desc || n(it.price) > 0)
  const setItem = (idx, patch) => setItems(prev => prev.map((it, i) => i === idx ? { ...it, ...patch } : it))

  // A draft that already exists (opened from the list, or saved in this window)
  // can be voided here. Drafts open straight in this window, so without this there
  // was no way to get rid of one. The record is kept for the books, like any void.
  const existingId = savedNumber ?? fromInvoice?.id
  const canVoidDraft = !!existingId && status === 'draft' && !roId
  const discardDraft = async () => {
    setVoiding(true)
    setSaveError(null)
    const r = await voidInvoice(existingId)
    setVoiding(false)
    if (r?.error) {
      setSaveError(r.error)
      setConfirmVoid(false)
      return
    }
    clearDraft()
    onClose() // straight away: the unsaved-changes prompt makes no sense for a voided draft
  }

  const save = async (nextStatus) => {
    if (numberTaken || !invNumber.trim() || saving || emailInvalid) return
    const ro = repairOrders.find(r => String(r.id) === String(roId))
    const sentStatus = nextStatus || status
    setSaving(true)
    setSaveError(null)
    // A truck typed on the invoice for a known customer is found (or added) so it
    // is in their list next time. This never blocks saving the invoice.
    let truckId = vehicleId
    if (!truckId && customerId && !roId) {
      truckId = await ensureTruck({ unitNumber, vin, vehicleText: vehicle })
      if (truckId) setVehicleId(truckId)
    }
    // The shop's own trucks are billed to the fleet customer: those invoices carry
    // prices but are not revenue (an internal invoice).
    const forFleet = (customers || []).find(c => String(c.id) === String(customerId))?.is_fleet === true
    const entry = await addInvoice({
      id: invNumber,
      dbId: savedDbId,
      internal: forFleet || (fromInvoice?.internal ?? false),
      vehicleId: truckId ?? null,
      roId: roId || null,
      shopId: shop?.id ?? null,
      customerId: customerId ?? ro?.customerId ?? null,
      customerName: customer,
      customerEmail: customerEmail.trim() || null,
      vehicle, unitNumber, vin, jobTitle, diagnostics, notes,
      status: sentStatus,
      created: `${invDate}T12:00:00`,
      paidAt: fromInvoice?.paidAt ?? null,
      paymentMethod: fromInvoice?.paymentMethod ?? null,
      // Quantity and unit price are kept on every line; `services` (one amount
      // per line) is kept for the list, export and older screens.
      lines: shown.map(it => ({ desc: it.desc || 'Item', type: it.type, qty: n(it.qty), price: n(it.price) })),
      services: servicesFromItems(items),
      taxRate: n(taxRate), taxLabor, itemize, cardFee, cardFeeRate: n(cardFeeRate),
      cardFeeAmount: totals.fee,
      subtotal: totals.subtotal,
      tax: totals.tax,
      total: totals.total,
    })
    setSaving(false)
    // Something the user has to fix (number already used, a bad value, trial ended,
    // no connection on an edit): nothing was saved, so keep the draft and the form.
    if (entry?.error) {
      setSaveError(entry.error)
      return
    }
    setBaseline(snapshot)
    restoredRef.current = false
    setRestored(false)
    clearDraft()
    setStatus(sentStatus)
    setSavedDbId(entry?.dbId ?? null)
    setSavedNumber(entry?.id ?? invNumber)
    // Say honestly where it went: on the server, or (no connection) this computer
    setSavedOnServer(!!entry?.dbId)
    setSavedFlash(true)
    setTimeout(() => setSavedFlash(false), 3500)
  }

  const field = 'w-full h-8 px-2.5 rounded-md bg-background border border-border text-xs text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-1 focus:ring-orange/40'
  const label = 'text-2xs font-semibold text-text-muted uppercase tracking-wider'

  // The paper itself: shown in the window and again as the print copy
  const paperInner = (
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
              <div className="flex justify-between text-slate-600"><span>{feeLabel}</span><span className="tabular-nums">{fmt(totals.fee)}</span></div>
            )}
            <div className="flex justify-between pt-1.5 border-t border-slate-200 text-base font-bold"><span>Total due</span><span className="tabular-nums">{fmt(totals.total)}</span></div>
          </div>

          {notes && <div className="mt-4 pt-3 border-t border-slate-100 text-xs text-slate-500 whitespace-pre-wrap">{notes}</div>}
    </>
  )

  return (
    <Modal open={open} onClose={handleClose} title="Invoice Generator" subtitle="Build, print, or save as PDF" size="full">
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
              <p className="mt-1 text-2xs text-text-muted">
                Type 0 if your prices already include tax.{' '}
                {n(taxRate) !== 0 && <button type="button" onClick={() => changeTaxRate('0')} className="font-semibold text-orange underline">No tax</button>}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={label}>Customer</label>
              <input className={`${field} mt-1`} placeholder="Customer or company" value={customer} onChange={e => changeCustomerName(e.target.value)} list="sc-invoice-customers" autoComplete="off" />
              <datalist id="sc-invoice-customers">
                {(customers || []).slice(0, 300).map(c => <option key={c.id} value={c.name} />)}
              </datalist>
              {customerId && <p className="mt-1 text-2xs text-text-muted">Linked to this customer's profile.</p>}
              {trucks.length > 0 && (
                <div className="mt-2">
                  <label className={label}>Saved trucks</label>
                  <select className={`${field} mt-1`} value={vehicleId || ''} onChange={e => pickTruck(e.target.value)}>
                    <option value="">Pick a saved truck (or type one below)</option>
                    {trucks.map(t => <option key={t.id} value={t.id}>{truckLabel(t)}</option>)}
                  </select>
                </div>
              )}
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
            <div className="col-span-2">
              <label className={label}>Customer email (optional)</label>
              <input type="email" className={`${field} mt-1`} placeholder="So you can email them this invoice" value={customerEmail} onChange={e => setCustomerEmail(e.target.value)} />
              {emailInvalid && <p className="mt-1 text-2xs font-medium text-status-red">That email address does not look right.</p>}
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
              disabled={numberTaken || !invNumber.trim() || saving || emailInvalid}
              onClick={() => save()}
            >
              {saving
                ? 'Saving...'
                : savedFlash
                  ? <><Check size={14} className="text-status-green" /> {savedOnServer ? 'Saved' : 'Saved on this computer'}</>
                  : <><Save size={14} /> Save invoice</>}
            </Button>
            <Button className="flex-1" onClick={() => window.print()}>
              <Printer size={14} /> Print / PDF
            </Button>
          </div>
          {status === 'draft' && (
            <Button variant="secondary" className="w-full" disabled={numberTaken || !invNumber.trim() || saving || emailInvalid} onClick={() => save('sent')}>
              <Send size={14} /> Save and mark as sent
            </Button>
          )}
          {canVoidDraft && (
            confirmVoid ? (
              <div className="flex items-center gap-3 text-xs">
                <span className="text-status-red">Void this draft? It is kept on record for your books.</span>
                <button onClick={discardDraft} disabled={voiding} className="font-semibold text-status-red hover:underline whitespace-nowrap">
                  {voiding ? 'Voiding...' : 'Yes, void it'}
                </button>
                <button onClick={() => setConfirmVoid(false)} disabled={voiding} className="text-text-muted hover:text-text-primary">Cancel</button>
              </div>
            ) : (
              <button onClick={() => setConfirmVoid(true)} className="text-xs font-medium text-status-red hover:underline">
                Void this draft
              </button>
            )
          )}
          {saveError && (
            <p className="text-xs font-medium text-status-red" role="alert">{saveError}</p>
          )}
          {savedFlash && !savedOnServer && !session?.demo && (
            <p className="text-xs text-text-muted">
              We could not reach the server, so this invoice is kept on this computer for now. It moves to your account automatically the next time the app connects.
            </p>
          )}
          <p className="text-2xs text-text-muted">
            Print / PDF prints the paper preview on the right. In the print window, choose Save as PDF to get a PDF file.
          </p>
        </div>

        {/* Paper preview: always light, print-faithful */}
        <div id="sc-invoice-paper" className="rounded-xl border border-border bg-white text-slate-900 p-7 shadow-sm min-h-[480px]">
          {paperInner}
        </div>
      </div>
      {/* The print copy lives outside this window, directly in the page, so it prints on whole pages */}
      {open && <PrintPortal padding={24}>{paperInner}</PrintPortal>}
    </Modal>
  )
}
