import { useState, useEffect } from 'react'
import { Plus, Trash2, Printer, Check, Save } from 'lucide-react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { useData } from '@/contexts/DataContext'
import { useAuth } from '@/contexts/AuthContext'

// In-app invoice generator: create a printable invoice from scratch, from a
// repair order, or from an existing invoice record. The preview is rendered
// as white "paper" regardless of app theme so Print / Save as PDF is true to
// what the customer receives.

const emptyItem = { desc: '', type: 'labor', qty: '1', price: '' }
const REVENUE_STAGES = new Set(['Complete', 'Invoiced', 'Paid'])

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

// Map a mock/stored invoice's services (name/parts/labor) into line items
function itemsFromInvoice(inv) {
  const items = []
  for (const s of inv.services || []) {
    if (s.labor > 0) items.push({ desc: `${s.name} — labor`, type: 'labor', qty: '1', price: String(s.labor) })
    if (s.parts > 0) items.push({ desc: `${s.name} — parts`, type: 'part', qty: '1', price: String(s.parts) })
  }
  return items.length ? items : [{ ...emptyItem }]
}

export function InvoiceGeneratorModal({ open, onClose, fromInvoice = null, fromRO = null }) {
  const { shops, repairOrders, addInvoice } = useData()
  const { session } = useAuth()
  const [savedFlash, setSavedFlash] = useState(false)

  const [shopId, setShopId] = useState('')
  const [roId, setRoId] = useState('')
  const [invNumber, setInvNumber] = useState(nextInvoiceNumber)
  const [invDate, setInvDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [customer, setCustomer] = useState('')
  const [vehicle, setVehicle] = useState('')
  const [items, setItems] = useState([{ ...emptyItem }])
  const [taxRate, setTaxRate] = useState('8.25')
  const [taxLabor, setTaxLabor] = useState(false)
  const [notes, setNotes] = useState('')

  const billableROs = repairOrders.filter(ro => REVENUE_STAGES.has(ro.stage))

  const applyRO = (ro) => {
    if (!ro) return
    setRoId(ro.id)
    setShopId(String(ro.shopId ?? ''))
    setCustomer(ro.customerName || '')
    setVehicle(ro.vehicle || '')
    setItems(itemsFromRO(ro))
  }

  // Initialize when opened
  useEffect(() => {
    if (!open) return
    setInvNumber(fromInvoice?.id || nextInvoiceNumber())
    setInvDate((fromInvoice?.created || new Date().toISOString()).slice(0, 10))
    if (fromInvoice) {
      setRoId(fromInvoice.roId || '')
      setShopId(String(fromInvoice.shopId ?? ''))
      setCustomer(fromInvoice.customerName || '')
      setVehicle(fromInvoice.vehicle || '')
      setItems(itemsFromInvoice(fromInvoice))
    } else if (fromRO) {
      applyRO(fromRO)
    } else {
      setRoId('')
      setShopId(String(session?.shopId ?? shops[0]?.id ?? ''))
      setCustomer('')
      setVehicle('')
      setItems([{ ...emptyItem }])
    }
    setNotes('')
    setSavedFlash(false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  const shop = shops.find(s => String(s.id) === String(shopId))

  const n = v => Number(v) || 0
  const lineTotal = it => n(it.qty) * n(it.price)
  const laborSubtotal = items.filter(i => i.type === 'labor').reduce((s, i) => s + lineTotal(i), 0)
  const partsSubtotal = items.filter(i => i.type !== 'labor').reduce((s, i) => s + lineTotal(i), 0)
  const taxable = partsSubtotal + (taxLabor ? laborSubtotal : 0)
  const tax = taxable * (n(taxRate) / 100)
  const total = laborSubtotal + partsSubtotal + tax
  const fmt = v => `$${v.toFixed(2)}`

  const setItem = (idx, patch) => setItems(prev => prev.map((it, i) => i === idx ? { ...it, ...patch } : it))

  const field = 'w-full h-8 px-2.5 rounded-md bg-background border border-border text-xs text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-1 focus:ring-orange/40'

  return (
    <Modal open={open} onClose={onClose} title="Invoice Generator" subtitle="Build, print, or save as PDF" size="full">
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
              <label className="text-2xs font-semibold text-text-muted uppercase tracking-wider">Fill from repair order</label>
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
              <label className="text-2xs font-semibold text-text-muted uppercase tracking-wider">Shop</label>
              <select className={`${field} mt-1`} value={shopId} onChange={e => setShopId(e.target.value)}>
                {shops.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-2xs font-semibold text-text-muted uppercase tracking-wider">Invoice #</label>
              <input className={`${field} mt-1`} value={invNumber} onChange={e => setInvNumber(e.target.value)} />
            </div>
            <div>
              <label className="text-2xs font-semibold text-text-muted uppercase tracking-wider">Date</label>
              <input type="date" className={`${field} mt-1`} value={invDate} onChange={e => setInvDate(e.target.value)} />
            </div>
            <div>
              <label className="text-2xs font-semibold text-text-muted uppercase tracking-wider">Sales tax %</label>
              <input className={`${field} mt-1`} inputMode="decimal" value={taxRate} onChange={e => setTaxRate(e.target.value)} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-2xs font-semibold text-text-muted uppercase tracking-wider">Customer</label>
              <input className={`${field} mt-1`} placeholder="Customer name" value={customer} onChange={e => setCustomer(e.target.value)} />
            </div>
            <div>
              <label className="text-2xs font-semibold text-text-muted uppercase tracking-wider">Vehicle</label>
              <input className={`${field} mt-1`} placeholder="2019 Ford F-150" value={vehicle} onChange={e => setVehicle(e.target.value)} />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-2xs font-semibold text-text-muted uppercase tracking-wider">Line items</label>
              <button
                onClick={() => setItems(prev => [...prev, { ...emptyItem }])}
                className="flex items-center gap-1 text-2xs font-medium text-orange hover:text-orange/80 transition-colors"
              >
                <Plus size={11} /> Add line
              </button>
            </div>
            <div className="space-y-1.5">
              {items.map((it, i) => (
                <div key={i} className="grid grid-cols-[1fr_68px_44px_64px_24px] gap-1.5 items-center">
                  <input className={field} placeholder="Description" value={it.desc} onChange={e => setItem(i, { desc: e.target.value })} />
                  <select className={field} value={it.type} onChange={e => setItem(i, { type: e.target.value })}>
                    <option value="labor">Labor</option>
                    <option value="part">Part</option>
                    <option value="fee">Fee</option>
                  </select>
                  <input className={field} inputMode="decimal" placeholder="Qty" value={it.qty} onChange={e => setItem(i, { qty: e.target.value })} />
                  <input className={field} inputMode="decimal" placeholder="$" value={it.price} onChange={e => setItem(i, { price: e.target.value })} />
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
          </div>

          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={taxLabor} onChange={e => setTaxLabor(e.target.checked)} className="w-3.5 h-3.5 accent-orange-500" />
            <span className="text-xs text-text-secondary">Apply tax to labor <span className="text-text-muted">(varies by state)</span></span>
          </label>

          <div>
            <label className="text-2xs font-semibold text-text-muted uppercase tracking-wider">Notes / payment terms</label>
            <textarea className={`${field} mt-1 h-16 py-2`} value={notes} onChange={e => setNotes(e.target.value)} placeholder="e.g. Due on receipt. 12-month / 12,000-mile warranty." />
          </div>

          <div className="flex gap-2">
            <Button
              variant="secondary"
              className="flex-1"
              onClick={() => {
                const ro = repairOrders.find(r => String(r.id) === String(roId))
                addInvoice({
                  id: invNumber,
                  roId: roId || null,
                  shopId: shop?.id ?? null,
                  customerId: ro?.customerId ?? fromInvoice?.customerId ?? null,
                  customerName: customer,
                  customerEmail: fromInvoice?.customerEmail ?? ro?.customerEmail ?? null,
                  vehicle,
                  status: fromInvoice?.status || 'draft',
                  created: `${invDate}T12:00:00`,
                  paidAt: fromInvoice?.paidAt ?? null,
                  paymentMethod: fromInvoice?.paymentMethod ?? null,
                  services: items
                    .filter(it => it.desc || n(it.price) > 0)
                    .map(it => ({
                      name: it.desc || 'Item',
                      parts: it.type === 'labor' ? 0 : lineTotal(it),
                      labor: it.type === 'labor' ? lineTotal(it) : 0,
                    })),
                  subtotal: laborSubtotal + partsSubtotal,
                  tax: Number(tax.toFixed(2)),
                  total: Number(total.toFixed(2)),
                })
                setSavedFlash(true)
                setTimeout(() => setSavedFlash(false), 2000)
              }}
            >
              {savedFlash ? <><Check size={14} className="text-status-green" /> Saved</> : <><Save size={14} /> Save invoice</>}
            </Button>
            <Button className="flex-1" onClick={() => window.print()}>
              <Printer size={14} /> Print / PDF
            </Button>
          </div>
        </div>

        {/* Paper preview — always light, print-faithful */}
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

          <div className="grid grid-cols-2 gap-4 py-3 border-b border-slate-200 text-sm">
            <div>
              <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-0.5">Bill to</div>
              <div className="font-medium">{customer || '—'}</div>
            </div>
            <div>
              <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-0.5">Vehicle</div>
              <div className="font-medium">{vehicle || '—'}</div>
            </div>
          </div>

          <table className="w-full text-sm mt-3">
            <thead>
              <tr className="text-[10px] text-slate-400 uppercase tracking-wider">
                <th className="text-left font-semibold pb-1.5">Description</th>
                <th className="text-right font-semibold pb-1.5 w-10">Qty</th>
                <th className="text-right font-semibold pb-1.5 w-16">Price</th>
                <th className="text-right font-semibold pb-1.5 w-16">Total</th>
              </tr>
            </thead>
            <tbody>
              {items.filter(it => it.desc || n(it.price) > 0).map((it, i) => (
                <tr key={i} className="border-t border-slate-100">
                  <td className="py-1.5">
                    {it.desc || '—'}
                    <span className="ml-1.5 text-[9px] uppercase tracking-wider text-slate-400">{it.type}</span>
                  </td>
                  <td className="py-1.5 text-right tabular-nums text-slate-600">{n(it.qty)}</td>
                  <td className="py-1.5 text-right tabular-nums text-slate-600">{fmt(n(it.price))}</td>
                  <td className="py-1.5 text-right tabular-nums font-medium">{fmt(lineTotal(it))}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="mt-3 pt-3 border-t border-slate-200 space-y-1 text-sm">
            <div className="flex justify-between text-slate-600"><span>Labor</span><span className="tabular-nums">{fmt(laborSubtotal)}</span></div>
            <div className="flex justify-between text-slate-600"><span>Parts & fees</span><span className="tabular-nums">{fmt(partsSubtotal)}</span></div>
            <div className="flex justify-between text-slate-600"><span>Tax ({n(taxRate)}%{taxLabor ? ', incl. labor' : ''})</span><span className="tabular-nums">{fmt(tax)}</span></div>
            <div className="flex justify-between pt-1.5 border-t border-slate-200 text-base font-bold"><span>Total due</span><span className="tabular-nums">{fmt(total)}</span></div>
          </div>

          {notes && <div className="mt-4 pt-3 border-t border-slate-100 text-xs text-slate-500 whitespace-pre-wrap">{notes}</div>}
        </div>
      </div>
    </Modal>
  )
}
