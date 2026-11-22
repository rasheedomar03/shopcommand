import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Printer, Pencil } from 'lucide-react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { formatMoney, formatDate } from '@/lib/utils'
import { logoOf } from '@/lib/shopLogo'
import { truckName, billedForTruck, truckStats, truckYears, describeWork } from '@/lib/trucks'

const STATUS_LABEL = { paid: 'Paid', partial: 'Part paid', sent: 'Sent', overdue: 'Overdue' }

/**
 * One truck's history: every invoice with the date, what was done, the parts and
 * the price, and a total at the bottom that can be printed (for example the
 * year-end cost of the truck). Drafts and voided invoices are left out.
 */
export function TruckProfile({ open, truck, invoices, shop, onClose, onEdit }) {
  const navigate = useNavigate()
  const years = useMemo(() => (truck ? truckYears(truck, invoices) : []), [truck, invoices])
  const thisYear = new Date().getFullYear()
  const [year, setYear] = useState('all')

  useEffect(() => {
    if (open && truck) setYear(years.includes(thisYear) ? String(thisYear) : 'all')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, truck?.id])

  if (!truck) return null
  const yearArg = year === 'all' ? 'all' : Number(year)
  const rows = billedForTruck(invoices, truck.id)
    .filter(i => year === 'all' || Number(String(i.created).slice(0, 4)) === yearArg)
    .sort((a, b) => String(a.created).localeCompare(String(b.created)))
  const { spent } = truckStats(truck, invoices, yearArg)
  const logo = logoOf(shop)
  const period = year === 'all' ? 'All years' : year

  return (
    <Modal open={open} onClose={onClose} title={`Truck ${truck.unitNumber || ''}`.trim()} subtitle={truckName(truck) || 'Truck history'} size="full">
      <style>{`
        @media print {
          body * { visibility: hidden !important; }
          #sc-truck-paper, #sc-truck-paper * { visibility: visible !important; }
          #sc-truck-paper { position: fixed !important; inset: 0 !important; width: 100% !important; border: none !important; box-shadow: none !important; }
        }
      `}</style>
      <div className="p-5 space-y-4">
        <div className="flex items-center gap-2 flex-wrap">
          <label className="text-xs text-text-muted">
            Show{' '}
            <select value={year} onChange={e => setYear(e.target.value)} className="ml-1 h-8 px-2 rounded-md bg-background border border-border text-xs text-text-primary">
              <option value="all">All years</option>
              {years.map(y => <option key={y} value={String(y)}>{y}</option>)}
            </select>
          </label>
          <div className="flex-1" />
          {onEdit && <Button variant="secondary" size="sm" onClick={() => onEdit(truck)}><Pencil size={13} /> Edit truck</Button>}
          <Button size="sm" onClick={() => window.print()} title="Prints this page. Choose Save as PDF in the print window for a PDF.">
            <Printer size={13} /> Print / PDF
          </Button>
        </div>

        <div id="sc-truck-paper" className="rounded-xl border border-border bg-white text-slate-900 p-7">
          <div className="flex items-start justify-between gap-4 pb-4 border-b border-slate-300">
            <div>
              {logo && <img src={logo.src} alt="" style={{ width: logo.width, maxWidth: '100%', height: 'auto', marginBottom: 6 }} />}
              <div className="text-base font-bold">{shop?.name || 'Shop'}</div>
              {shop?.address && <div className="text-xs text-slate-500 mt-0.5">{shop.address}</div>}
              {shop?.phone && <div className="text-xs text-slate-500 mt-0.5">{shop.phone}</div>}
            </div>
            <div className="text-right text-sm">
              <div className="text-xs uppercase tracking-wider text-slate-500">Truck history</div>
              <div className="font-bold text-lg">Truck {truck.unitNumber || ''}</div>
              <div className="text-slate-700">{truckName(truck)}</div>
              {truck.vin && <div className="text-xs font-mono text-slate-500">VIN {truck.vin}</div>}
              {truck.mileage != null && <div className="text-xs text-slate-500">Last mileage {Number(truck.mileage).toLocaleString('en-US')}</div>}
              <div className="text-xs text-slate-500 mt-1">{period}</div>
            </div>
          </div>

          {rows.length === 0 ? (
            <p className="py-10 text-center text-sm text-slate-500">No invoices for this truck{year === 'all' ? ' yet' : ` in ${year}`}. Pick this truck when you make an invoice and it shows up here.</p>
          ) : (
            <table className="w-full text-sm mt-3">
              <thead>
                <tr className="text-left text-2xs uppercase tracking-wider text-slate-500 border-b border-slate-300">
                  <th className="py-2 pr-3 font-semibold">Date</th>
                  <th className="py-2 pr-3 font-semibold">Invoice</th>
                  <th className="py-2 pr-3 font-semibold">What was done</th>
                  <th className="py-2 pr-3 font-semibold">Parts</th>
                  <th className="py-2 text-right font-semibold">Price</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(inv => {
                  const w = describeWork(inv)
                  return (
                    <tr key={inv.id} className="border-b border-slate-200 align-top">
                      <td className="py-2 pr-3 whitespace-nowrap">{formatDate(inv.created)}</td>
                      <td className="py-2 pr-3 whitespace-nowrap">
                        <button onClick={() => { onClose(); navigate(`/invoices?open=${encodeURIComponent(inv.id)}`) }} className="font-medium text-orange hover:underline print:no-underline print:text-slate-900">{inv.id}</button>
                        <div className="text-2xs text-slate-500">{STATUS_LABEL[inv.status] || inv.status}</div>
                      </td>
                      <td className="py-2 pr-3">{w.work || <span className="text-slate-400">Not described</span>}</td>
                      <td className="py-2 pr-3 text-slate-700">{w.parts || <span className="text-slate-400">None</span>}</td>
                      <td className="py-2 text-right tabular-nums">{formatMoney(inv.total)}</td>
                    </tr>
                  )
                })}
              </tbody>
              <tfoot>
                <tr>
                  <td colSpan={4} className="pt-3 pr-3 text-right font-bold">Total ({rows.length} invoice{rows.length === 1 ? '' : 's'}, {period})</td>
                  <td className="pt-3 text-right font-bold tabular-nums">{formatMoney(spent)}</td>
                </tr>
              </tfoot>
            </table>
          )}
          <p className="mt-4 text-2xs text-slate-500">Drafts and voided invoices are not included.</p>
        </div>
      </div>
    </Modal>
  )
}
