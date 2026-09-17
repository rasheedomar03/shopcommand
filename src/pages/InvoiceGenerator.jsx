import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Mail, ArrowRight, Plus, Trash2, Printer, Calculator } from 'lucide-react'
import { PublicNav } from '@/components/PublicNav'
import { usePageMeta } from '@/lib/seo'

const CONTACT_EMAIL = 'rasheed.omar@outlook.com'

const faqs = [
  {
    q: 'What should an auto repair invoice include?',
    a: 'A complete auto repair invoice lists the shop\'s name and contact details, the customer\'s name, the vehicle (year, make, model, VIN, and mileage in/out), an invoice number and date, each service and part as a separate line item with quantity and price, labor and parts subtotals, sales tax, the total due, and payment terms. Many states also require the odometer reading and written authorization for the work.',
  },
  {
    q: 'Is this invoice generator really free?',
    a: 'Yes — no account, no watermark, no email required. Fill in the fields, click Print / Save PDF, and use your browser\'s built-in "Save as PDF" option. Your shop details are saved in your own browser so repeat invoices are faster; nothing is sent to a server.',
  },
  {
    q: 'Should I charge sales tax on labor?',
    a: 'It depends on your state. Some states (like Texas under certain repair types, Connecticut, and others) tax auto repair labor; many tax only parts. The generator lets you toggle tax on labor on or off — confirm the rule for your state with your accountant.',
  },
  {
    q: 'How do shops with multiple locations handle invoicing?',
    a: 'Manually generated invoices work for one-off jobs, but multi-location shops usually need invoices tied to repair orders, technician hours, and parts inventory so nothing gets missed between "work finished" and "invoice sent." That gap is one of the most common revenue leaks in multi-shop operations — and the problem ShopCommand was built to close.',
  },
]

const emptyItem = { desc: '', type: 'labor', qty: '1', price: '' }

function load(key, fallback) {
  try {
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw) : fallback
  } catch { return fallback }
}

export default function InvoiceGenerator() {
  const [shop, setShop] = useState(() => load('sc_inv_shop', { name: '', address: '', phone: '', email: '' }))
  const [customer, setCustomer] = useState({ name: '', phone: '' })
  const [vehicle, setVehicle] = useState({ year: '', make: '', model: '', vin: '', mileage: '' })
  const [invNumber, setInvNumber] = useState(() => `INV-${new Date().toISOString().slice(2, 10).replace(/-/g, '')}-1`)
  const [invDate, setInvDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [items, setItems] = useState([{ ...emptyItem, desc: '', type: 'labor' }])
  const [taxRate, setTaxRate] = useState('8.25')
  const [taxLabor, setTaxLabor] = useState(false)
  const [notes, setNotes] = useState('')

  useEffect(() => {
    try { localStorage.setItem('sc_inv_shop', JSON.stringify(shop)) } catch {}
  }, [shop])

  usePageMeta({
    title: 'Free Auto Repair Invoice Generator | ShopCommand',
    description: 'Create a professional auto repair invoice in your browser — parts and labor line items, sales tax, vehicle details — then print or save as PDF. Free, no signup, no watermark.',
    path: '/tools/invoice-generator',
    schema: [
      {
        '@context': 'https://schema.org',
        '@type': 'WebApplication',
        name: 'Auto Repair Invoice Generator',
        url: 'https://shopcommand.net/tools/invoice-generator',
        applicationCategory: 'BusinessApplication',
        operatingSystem: 'Web',
        offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
        description: 'Free browser-based invoice generator for auto repair shops with labor/parts line items, tax handling, and print-to-PDF.',
      },
      {
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        mainEntity: faqs.map(({ q, a }) => ({
          '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a },
        })),
      },
    ],
    breadcrumbs: [
      { name: 'Home', path: '/' },
      { name: 'Free Tools', path: '/tools/labor-rate-calculator' },
      { name: 'Invoice Generator' },
    ],
  })

  const n = v => Number(v) || 0
  const lineTotal = it => n(it.qty) * n(it.price)
  const laborSubtotal = items.filter(i => i.type === 'labor').reduce((s, i) => s + lineTotal(i), 0)
  const partsSubtotal = items.filter(i => i.type === 'part').reduce((s, i) => s + lineTotal(i), 0)
  const feesSubtotal = items.filter(i => i.type === 'fee').reduce((s, i) => s + lineTotal(i), 0)
  const taxable = partsSubtotal + feesSubtotal + (taxLabor ? laborSubtotal : 0)
  const tax = taxable * (n(taxRate) / 100)
  const total = laborSubtotal + partsSubtotal + feesSubtotal + tax
  const fmt = v => `$${v.toFixed(2)}`

  const setItem = (idx, patch) => setItems(prev => prev.map((it, i) => i === idx ? { ...it, ...patch } : it))
  const addItem = (type) => setItems(prev => [...prev, { ...emptyItem, type }])
  const removeItem = (idx) => setItems(prev => prev.length > 1 ? prev.filter((_, i) => i !== idx) : prev)

  const vehicleLabel = [vehicle.year, vehicle.make, vehicle.model].filter(Boolean).join(' ')

  const input = 'w-full px-3 py-2 rounded-lg border border-slate-200 bg-white text-slate-900 text-sm outline-none focus:border-orange-400 transition-colors'
  const label = 'text-xs font-semibold text-slate-500 uppercase tracking-wider'

  return (
    <div className="min-h-screen bg-white">
      <style>{`
        @media print {
          body * { visibility: hidden !important; }
          #invoice-print, #invoice-print * { visibility: visible !important; }
          #invoice-print { position: absolute !important; left: 0; top: 0; width: 100%; border: none !important; border-radius: 0 !important; box-shadow: none !important; }
        }
      `}</style>
      <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-orange-500 focus:text-white focus:rounded-lg">
        Skip to main content
      </a>

      <PublicNav />

      <main id="main-content">
        <section className="px-6 py-14 border-b border-slate-100">
          <div className="max-w-3xl mx-auto text-center">
            <div className="text-xs text-orange-600 uppercase tracking-widest font-semibold mb-4">Free Tool</div>
            <h1 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4" style={{ letterSpacing: '-0.02em' }}>
              Free Auto Repair Invoice Generator
            </h1>
            <p className="text-slate-500 leading-relaxed max-w-xl mx-auto">
              Build a professional invoice with parts and labor line items, then print or save it as a PDF.
              No signup, no watermark — your shop details stay in your browser.
            </p>
          </div>
        </section>

        <section className="px-6 py-10">
          <div className="max-w-6xl mx-auto grid lg:grid-cols-2 gap-8 items-start">
            {/* Form */}
            <div className="space-y-6">
              <div>
                <h2 className="text-sm font-bold text-slate-900 mb-3">Your shop</h2>
                <div className="grid sm:grid-cols-2 gap-3">
                  <input className={input} placeholder="Shop name" value={shop.name} onChange={e => setShop(s => ({ ...s, name: e.target.value }))} />
                  <input className={input} placeholder="Phone" value={shop.phone} onChange={e => setShop(s => ({ ...s, phone: e.target.value }))} />
                  <input className={`${input} sm:col-span-2`} placeholder="Address" value={shop.address} onChange={e => setShop(s => ({ ...s, address: e.target.value }))} />
                  <input className={`${input} sm:col-span-2`} placeholder="Email (optional)" value={shop.email} onChange={e => setShop(s => ({ ...s, email: e.target.value }))} />
                </div>
              </div>

              <div>
                <h2 className="text-sm font-bold text-slate-900 mb-3">Customer & vehicle</h2>
                <div className="grid sm:grid-cols-2 gap-3">
                  <input className={input} placeholder="Customer name" value={customer.name} onChange={e => setCustomer(c => ({ ...c, name: e.target.value }))} />
                  <input className={input} placeholder="Customer phone" value={customer.phone} onChange={e => setCustomer(c => ({ ...c, phone: e.target.value }))} />
                  <div className="grid grid-cols-3 gap-3 sm:col-span-2">
                    <input className={input} placeholder="Year" value={vehicle.year} onChange={e => setVehicle(v => ({ ...v, year: e.target.value }))} />
                    <input className={input} placeholder="Make" value={vehicle.make} onChange={e => setVehicle(v => ({ ...v, make: e.target.value }))} />
                    <input className={input} placeholder="Model" value={vehicle.model} onChange={e => setVehicle(v => ({ ...v, model: e.target.value }))} />
                  </div>
                  <input className={input} placeholder="VIN (optional)" value={vehicle.vin} onChange={e => setVehicle(v => ({ ...v, vin: e.target.value }))} />
                  <input className={input} placeholder="Mileage" value={vehicle.mileage} onChange={e => setVehicle(v => ({ ...v, mileage: e.target.value }))} />
                </div>
              </div>

              <div>
                <h2 className="text-sm font-bold text-slate-900 mb-3">Invoice details</h2>
                <div className="grid sm:grid-cols-2 gap-3">
                  <div>
                    <span className={label}>Invoice #</span>
                    <input className={`${input} mt-1`} value={invNumber} onChange={e => setInvNumber(e.target.value)} />
                  </div>
                  <div>
                    <span className={label}>Date</span>
                    <input type="date" className={`${input} mt-1`} value={invDate} onChange={e => setInvDate(e.target.value)} />
                  </div>
                </div>
              </div>

              <div>
                <h2 className="text-sm font-bold text-slate-900 mb-3">Line items</h2>
                <div className="space-y-2">
                  {items.map((it, i) => (
                    <div key={i} className="grid grid-cols-[1fr_84px_56px_84px_32px] gap-2 items-center">
                      <input className={input} placeholder={it.type === 'labor' ? 'e.g. Front brake pads & rotors — labor' : it.type === 'part' ? 'e.g. Brake pads (set)' : 'e.g. Shop supplies'} value={it.desc} onChange={e => setItem(i, { desc: e.target.value })} />
                      <select className={input} value={it.type} onChange={e => setItem(i, { type: e.target.value })}>
                        <option value="labor">Labor</option>
                        <option value="part">Part</option>
                        <option value="fee">Fee</option>
                      </select>
                      <input className={input} inputMode="decimal" placeholder="Qty" value={it.qty} onChange={e => setItem(i, { qty: e.target.value })} />
                      <input className={input} inputMode="decimal" placeholder="$" value={it.price} onChange={e => setItem(i, { price: e.target.value })} />
                      <button onClick={() => removeItem(i)} aria-label="Remove line item" className="p-1.5 rounded-md text-slate-300 hover:text-red-500 transition-colors">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                </div>
                <div className="flex gap-2 mt-3">
                  <button onClick={() => addItem('labor')} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-medium text-slate-600 hover:border-orange-300 hover:text-orange-600 transition-colors">
                    <Plus size={12} /> Labor
                  </button>
                  <button onClick={() => addItem('part')} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-medium text-slate-600 hover:border-orange-300 hover:text-orange-600 transition-colors">
                    <Plus size={12} /> Part
                  </button>
                  <button onClick={() => addItem('fee')} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-medium text-slate-600 hover:border-orange-300 hover:text-orange-600 transition-colors">
                    <Plus size={12} /> Fee
                  </button>
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-3 items-end">
                <div>
                  <span className={label}>Sales tax %</span>
                  <input className={`${input} mt-1`} inputMode="decimal" value={taxRate} onChange={e => setTaxRate(e.target.value)} />
                </div>
                <label className="flex items-center gap-2 py-2.5 cursor-pointer">
                  <input type="checkbox" checked={taxLabor} onChange={e => setTaxLabor(e.target.checked)} className="w-4 h-4 accent-orange-500" />
                  <span className="text-sm text-slate-600">Apply tax to labor <span className="text-slate-400">(varies by state)</span></span>
                </label>
              </div>

              <div>
                <span className={label}>Notes / payment terms</span>
                <textarea className={`${input} mt-1`} rows={2} placeholder="e.g. Due on receipt. 12-month / 12,000-mile parts & labor warranty." value={notes} onChange={e => setNotes(e.target.value)} />
              </div>

              <button
                onClick={() => window.print()}
                className="w-full flex items-center justify-center gap-2 px-5 py-3 rounded-xl text-sm font-semibold bg-orange-500 hover:bg-orange-600 text-white transition-colors"
              >
                <Printer size={15} />
                Print / Save as PDF
              </button>
            </div>

            {/* Live preview */}
            <div id="invoice-print" className="rounded-2xl border border-slate-200 shadow-sm p-8 bg-white lg:sticky lg:top-20">
              <div className="flex items-start justify-between gap-4 pb-5 border-b border-slate-200">
                <div>
                  <div className="text-lg font-bold text-slate-900">{shop.name || 'Your Shop Name'}</div>
                  {shop.address && <div className="text-xs text-slate-500 mt-0.5">{shop.address}</div>}
                  <div className="text-xs text-slate-500 mt-0.5">
                    {[shop.phone, shop.email].filter(Boolean).join(' · ')}
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <div className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Invoice</div>
                  <div className="text-sm font-semibold text-slate-900">{invNumber}</div>
                  <div className="text-xs text-slate-500">{new Date(invDate + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 py-4 border-b border-slate-200 text-sm">
                <div>
                  <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Bill to</div>
                  <div className="font-medium text-slate-900">{customer.name || '—'}</div>
                  {customer.phone && <div className="text-xs text-slate-500">{customer.phone}</div>}
                </div>
                <div>
                  <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Vehicle</div>
                  <div className="font-medium text-slate-900">{vehicleLabel || '—'}</div>
                  <div className="text-xs text-slate-500">
                    {[vehicle.vin && `VIN ${vehicle.vin}`, vehicle.mileage && `${vehicle.mileage} mi`].filter(Boolean).join(' · ')}
                  </div>
                </div>
              </div>

              <table className="w-full text-sm mt-4">
                <thead>
                  <tr className="text-xs text-slate-400 uppercase tracking-wider">
                    <th className="text-left font-semibold pb-2">Description</th>
                    <th className="text-right font-semibold pb-2 w-12">Qty</th>
                    <th className="text-right font-semibold pb-2 w-20">Price</th>
                    <th className="text-right font-semibold pb-2 w-20">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {items.filter(it => it.desc || n(it.price) > 0).map((it, i) => (
                    <tr key={i} className="border-t border-slate-100">
                      <td className="py-2 text-slate-900">
                        {it.desc || '—'}
                        <span className="ml-2 text-[10px] uppercase tracking-wider text-slate-400">{it.type}</span>
                      </td>
                      <td className="py-2 text-right tabular-nums text-slate-600">{n(it.qty)}</td>
                      <td className="py-2 text-right tabular-nums text-slate-600">{fmt(n(it.price))}</td>
                      <td className="py-2 text-right tabular-nums font-medium text-slate-900">{fmt(lineTotal(it))}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="mt-4 pt-4 border-t border-slate-200 space-y-1.5 text-sm">
                <div className="flex justify-between text-slate-600"><span>Labor</span><span className="tabular-nums">{fmt(laborSubtotal)}</span></div>
                <div className="flex justify-between text-slate-600"><span>Parts</span><span className="tabular-nums">{fmt(partsSubtotal)}</span></div>
                {feesSubtotal > 0 && <div className="flex justify-between text-slate-600"><span>Fees</span><span className="tabular-nums">{fmt(feesSubtotal)}</span></div>}
                <div className="flex justify-between text-slate-600"><span>Tax ({n(taxRate)}%{taxLabor ? ', incl. labor' : ', parts & fees'})</span><span className="tabular-nums">{fmt(tax)}</span></div>
                <div className="flex justify-between pt-2 border-t border-slate-200 text-base font-bold text-slate-900"><span>Total due</span><span className="tabular-nums">{fmt(total)}</span></div>
              </div>

              {notes && <div className="mt-5 pt-4 border-t border-slate-100 text-xs text-slate-500 whitespace-pre-wrap">{notes}</div>}
              <div className="mt-6 text-center text-[10px] text-slate-300">Generated free at shopcommand.net/tools/invoice-generator</div>
            </div>
          </div>
        </section>

        {/* Cross-links */}
        <section className="px-6 py-10">
          <div className="max-w-3xl mx-auto grid sm:grid-cols-2 gap-4">
            <Link to="/tools/labor-rate-calculator" className="group flex items-center gap-4 p-5 rounded-2xl border border-slate-200 hover:border-orange-200 hover:bg-orange-50/30 transition-all">
              <div className="w-10 h-10 rounded-xl bg-orange-50 border border-orange-200 flex items-center justify-center shrink-0">
                <Calculator size={18} className="text-orange-500" strokeWidth={1.8} />
              </div>
              <div className="flex-1">
                <div className="text-sm font-semibold text-slate-900 group-hover:text-orange-600 transition-colors">Labor Rate Calculator</div>
                <div className="text-xs text-slate-500 mt-0.5">Is the rate on this invoice actually profitable?</div>
              </div>
              <ArrowRight size={14} className="text-slate-300 group-hover:text-orange-400 shrink-0" />
            </Link>
            <Link to="/tools/labor-rates-by-state" className="group flex items-center gap-4 p-5 rounded-2xl border border-slate-200 hover:border-orange-200 hover:bg-orange-50/30 transition-all">
              <div className="w-10 h-10 rounded-xl bg-orange-50 border border-orange-200 flex items-center justify-center shrink-0">
                <ArrowRight size={18} className="text-orange-500" strokeWidth={1.8} />
              </div>
              <div className="flex-1">
                <div className="text-sm font-semibold text-slate-900 group-hover:text-orange-600 transition-colors">Labor Rates by State</div>
                <div className="text-xs text-slate-500 mt-0.5">How does your rate compare to your state?</div>
              </div>
              <ArrowRight size={14} className="text-slate-300 group-hover:text-orange-400 shrink-0" />
            </Link>
          </div>
        </section>

        {/* FAQ */}
        <section className="px-6 py-10">
          <div className="max-w-3xl mx-auto">
            <h2 className="text-xl font-bold text-slate-900 mb-6" style={{ letterSpacing: '-0.01em' }}>Frequently asked questions</h2>
            <div className="space-y-6">
              {faqs.map(({ q, a }) => (
                <div key={q}>
                  <h3 className="text-[15px] font-semibold text-slate-900 mb-1.5">{q}</h3>
                  <p className="text-slate-500 text-sm leading-relaxed">{a}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Product CTA */}
        <section className="px-6 py-16 bg-slate-50 border-t border-slate-200">
          <div className="max-w-2xl mx-auto text-center">
            <h2 className="text-xl font-bold text-slate-900 mb-3" style={{ letterSpacing: '-0.01em' }}>
              Typing invoices by hand at more than one shop?
            </h2>
            <p className="text-slate-500 text-sm mb-6">
              ShopCommand turns repair orders into invoices automatically — with technician hours, parts, and payment
              status tracked across every location. $100/mo per shop, unlimited users.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <Link to="/demo" className="px-5 py-2.5 rounded-xl text-sm font-semibold bg-orange-500 hover:bg-orange-600 text-white transition-colors">
                Try the live demo
              </Link>
              <Link to="/founding-program" className="px-5 py-2.5 rounded-xl text-sm font-semibold text-slate-600 hover:text-slate-900 border border-slate-200 hover:border-slate-300 transition-colors">
                Founding Shop Program →
              </Link>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 px-6 md:px-12 py-10 bg-slate-50/60">
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <Link to="/" className="flex items-center gap-2 hover:opacity-70 transition-opacity flex-shrink-0">
            <span className="text-slate-400 text-sm">ShopCommand</span>
          </Link>
          <a href={`mailto:${CONTACT_EMAIL}`} className="flex items-center gap-2 text-slate-400 hover:text-slate-600 text-sm transition-colors">
            <Mail size={13} className="flex-shrink-0" />
            {CONTACT_EMAIL}
          </a>
          <div className="flex gap-5">
            <Link to="/tools/labor-rate-calculator" className="text-slate-400 hover:text-slate-600 text-xs transition-colors">Rate Calculator</Link>
            <Link to="/tools/labor-rates-by-state" className="text-slate-400 hover:text-slate-600 text-xs transition-colors">Rates by State</Link>
            <Link to="/resources" className="text-slate-400 hover:text-slate-600 text-xs transition-colors">Resources</Link>
            <Link to="/terms" className="text-slate-400 hover:text-slate-600 text-xs transition-colors">Terms</Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
