import { useNavigate } from 'react-router-dom'
import { FileText } from 'lucide-react'
import { useData } from '@/contexts/DataContext'
import { formatMoney, formatDate } from '@/lib/utils'
import { cn } from '@/lib/utils'

// Every invoice for one customer: the ones made from a repair order and the ones made
// from scratch in the invoice generator. Click one to open it on the Invoices page.
const STATUS = {
  paid: { label: 'Paid', cls: 'text-status-green' },
  partial: { label: 'Partial', cls: 'text-orange' },
  sent: { label: 'Unpaid', cls: 'text-blue-400' },
  overdue: { label: 'Overdue', cls: 'text-status-red' },
  draft: { label: 'Draft', cls: 'text-text-muted' },
}

export function customerInvoices(invoices, customer, repairOrders) {
  const roIds = new Set((repairOrders || []).filter(r => r.customerId === customer.id).map(r => r.id))
  return (invoices || [])
    .filter(i => String(i.customerId) === String(customer.id) || (i.roId && roIds.has(i.roId)))
    .sort((a, b) => String(b.created || '').localeCompare(String(a.created || '')))
}

export function CustomerInvoices({ customer }) {
  const { invoices, repairOrders } = useData()
  const navigate = useNavigate()
  const rows = customerInvoices(invoices, customer, repairOrders)
  if (rows.length === 0) return null

  // Billed and unpaid add up the real invoices only (not drafts)
  const real = rows.filter(i => i.status !== 'draft')
  const billed = real.reduce((s, i) => s + (Number(i.total) || 0), 0)
  const unpaid = real
    .filter(i => ['sent', 'overdue', 'partial'].includes(i.status))
    .reduce((s, i) => s + Math.max(0, (Number(i.total) || 0) - (Number(i.amountPaid) || 0)), 0)

  return (
    <div className="bg-surface border border-border rounded-xl overflow-hidden">
      <div className="px-5 py-3.5 border-b border-border flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-sm font-semibold text-text-primary"><FileText size={14} className="text-text-muted" />Invoices</div>
        <div className="text-2xs text-text-muted tabular-nums">Invoiced {formatMoney(billed)} · Unpaid {formatMoney(unpaid)}</div>
      </div>
      <div className="divide-y divide-border">
        {rows.map(i => {
          const st = STATUS[i.status] || STATUS.draft
          return (
            <button
              key={i.id}
              onClick={() => navigate(`/invoices?open=${encodeURIComponent(i.id)}`)}
              className="w-full text-left px-5 py-3 hover:bg-background transition-colors flex items-center justify-between gap-3"
            >
              <div className="min-w-0">
                <div className="text-xs font-mono text-orange truncate">{i.id}</div>
                <div className="text-2xs text-text-muted truncate">
                  {formatDate(i.created)}{i.unitNumber ? ` · Truck # ${i.unitNumber}` : ''}{i.vehicle ? ` · ${i.vehicle}` : ''}
                </div>
              </div>
              <div className="text-right flex-shrink-0">
                <div className="text-sm font-medium text-text-primary tabular-nums">{formatMoney(i.total)}</div>
                <div className={cn('text-2xs font-medium', st.cls)}>{st.label}</div>
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
