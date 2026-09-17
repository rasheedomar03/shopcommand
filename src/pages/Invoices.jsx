import { useState } from 'react'
import { Search, Download, Send, CheckCircle, Clock, AlertCircle, DollarSign, Printer, Plus } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/Button'
import { Table, Thead, Th, Tbody, Tr, Td } from '@/components/ui/Table'
import { Modal } from '@/components/ui/Modal'
import { InvoiceGeneratorModal } from '@/components/modals/InvoiceGeneratorModal'
import { formatCurrency, formatDate, formatRelativeTime } from '@/lib/utils'
import { cn } from '@/lib/utils'
import { useData } from '@/contexts/DataContext'

const INVOICE_STATUS = {
  paid:     { label: 'Paid',     color: 'text-status-green',  bg: 'bg-status-green/10', icon: CheckCircle },
  sent:     { label: 'Sent',     color: 'text-blue-400',      bg: 'bg-blue-500/10',     icon: Send },
  overdue:  { label: 'Overdue',  color: 'text-status-red',    bg: 'bg-status-red/10',   icon: AlertCircle },
  draft:    { label: 'Draft',    color: 'text-text-muted',    bg: 'bg-border',          icon: Clock },
}

function StatusBadge({ status }) {
  const cfg = INVOICE_STATUS[status] || INVOICE_STATUS.draft
  return (
    <span className={cn('inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-2xs font-semibold', cfg.bg, cfg.color)}>
      <span className={cn('w-1.5 h-1.5 rounded-full', cfg.color.replace('text-', 'bg-'))} />
      {cfg.label}
    </span>
  )
}

function InvoiceDetail({ invoice, onClose, shops, onPrint }) {
  if (!invoice) return null
  const shop = shops.find(s => s.id === invoice.shopId)

  return (
    <Modal open={!!invoice} onClose={onClose} title={invoice.id} subtitle={`${invoice.vehicle} · ${invoice.customerName}`} size="lg">
      <div className="p-5 space-y-5">
        <div className="flex items-center justify-between">
          <StatusBadge status={invoice.status} />
          <div className="text-right">
            <div className="text-xs text-text-muted">{shop?.name}</div>
            <div className="text-xs text-text-muted">RO: {invoice.roId}</div>
          </div>
        </div>

        <div className="rounded-lg border border-border overflow-hidden">
          <div className="grid grid-cols-[1fr_auto_auto] gap-4 px-4 py-2.5 bg-background text-xs font-medium text-text-muted uppercase tracking-wider">
            <div>Service</div>
            <div className="text-right">Parts</div>
            <div className="text-right">Labor</div>
          </div>
          {invoice.services.map((svc, i) => (
            <div key={i} className={cn('grid grid-cols-[1fr_auto_auto] gap-4 px-4 py-3 text-sm', i > 0 && 'border-t border-border')}>
              <div className="text-text-primary">{svc.name}</div>
              <div className="text-right text-text-secondary tabular-nums">{formatCurrency(svc.parts)}</div>
              <div className="text-right text-text-secondary tabular-nums">{formatCurrency(svc.labor)}</div>
            </div>
          ))}
          <div className="border-t border-border px-4 py-3 space-y-1.5 bg-background">
            <div className="flex justify-between text-sm text-text-secondary">
              <span>Subtotal</span>
              <span className="tabular-nums">{formatCurrency(invoice.subtotal)}</span>
            </div>
            <div className="flex justify-between text-sm text-text-secondary">
              <span>Tax (8.25%)</span>
              <span className="tabular-nums">${invoice.tax.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm font-semibold text-text-primary pt-1.5 border-t border-border">
              <span>Total</span>
              <span className="text-orange tabular-nums">${invoice.total.toFixed(2)}</span>
            </div>
          </div>
        </div>

        {invoice.paidAt && (
          <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-status-green/5 border border-status-green/20">
            <CheckCircle size={14} className="text-status-green" />
            <span className="text-xs text-status-green font-medium">
              Paid {formatRelativeTime(invoice.paidAt)} via {invoice.paymentMethod}
            </span>
          </div>
        )}

        <div className="flex items-center justify-between pt-2">
          <div className="text-xs text-text-muted">Created {formatDate(invoice.created)}</div>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="secondary" onClick={() => onPrint(invoice)}>
              <Printer size={13} /> Print / PDF
            </Button>
            {invoice.status === 'draft' && (
              <Button size="sm"><Send size={13} /> Send invoice</Button>
            )}
            {invoice.status === 'sent' && (
              <Button size="sm"><DollarSign size={13} /> Record payment</Button>
            )}
            {invoice.status === 'overdue' && (
              <Button size="sm"><Send size={13} /> Send reminder</Button>
            )}
          </div>
        </div>
      </div>
    </Modal>
  )
}

export default function Invoices() {
  const { shops, invoices } = useData()
  const { session } = useAuth()
  const isAdvisor = session?.role === 'advisor'
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('All')
  const [selected, setSelected] = useState(null)
  const [generatorOpen, setGeneratorOpen] = useState(false)
  const [generatorSource, setGeneratorSource] = useState(null)

  const allInvoices = invoices
  const scoped = isAdvisor
    ? allInvoices.filter(inv => inv.shopId === session.shopId)
    : allInvoices

  const filtered = scoped.filter(inv => {
    const q = search.toLowerCase()
    const matchesSearch = !q ||
      inv.id.toLowerCase().includes(q) ||
      inv.customerName.toLowerCase().includes(q) ||
      inv.vehicle.toLowerCase().includes(q)
    const matchesStatus = statusFilter === 'All' || inv.status === statusFilter
    return matchesSearch && matchesStatus
  })

  const statusCounts = ['All', ...Object.keys(INVOICE_STATUS)].reduce((acc, s) => {
    acc[s] = s === 'All' ? scoped.length : scoped.filter(inv => inv.status === s).length
    return acc
  }, {})

  const totalOutstanding = scoped
    .filter(inv => inv.status === 'sent' || inv.status === 'overdue')
    .reduce((sum, inv) => sum + inv.total, 0)

  return (
    <div className="p-4 sm:p-5 lg:p-6 space-y-4 sm:space-y-5 animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-semibold text-text-primary">Invoices</h1>
          <p className="text-xs text-text-muted mt-0.5">
            {scoped.filter(i => i.status === 'paid').length} paid · ${totalOutstanding.toFixed(0)} outstanding
          </p>
        </div>
        <div className="flex items-center gap-2">
        <Button onClick={() => { setGeneratorSource(null); setGeneratorOpen(true) }}>
          <Plus size={15} />
          New invoice
        </Button>
        <Button variant="secondary" onClick={() => {
          const rows = scoped.map(i => [i.id, i.customerName, i.vehicle, i.status, i.total?.toFixed(2), i.created].join(','))
          const csv = ['Invoice,Customer,Vehicle,Status,Amount,Date', ...rows].join('\n')
          const blob = new Blob([csv], { type: 'text/csv' })
          const url = URL.createObjectURL(blob)
          const a = document.createElement('a')
          a.href = url
          a.download = `invoices-${new Date().toISOString().slice(0,10)}.csv`
          a.click()
          URL.revokeObjectURL(url)
        }}>
          <Download size={15} />
          Export
        </Button>
        </div>
      </div>

      <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-hide pb-1 -mx-4 px-4 sm:mx-0 sm:px-0">
        {['All', ...Object.keys(INVOICE_STATUS)].map(s => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={cn(
              'flex items-center gap-1.5 h-7 px-3 rounded-md text-xs font-medium whitespace-nowrap',
              'transition-all duration-150',
              statusFilter === s
                ? 'bg-orange-subtle text-orange'
                : 'text-text-muted hover:text-text-primary hover:bg-surface'
            )}
          >
            {s === 'All' ? 'All' : INVOICE_STATUS[s].label}
            <span className={cn('text-2xs px-1 py-0.5 rounded', statusFilter === s ? 'bg-orange/20' : 'bg-border')}>
              {statusCounts[s]}
            </span>
          </button>
        ))}
      </div>

      <div className="relative">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search invoices..."
          className="w-full h-9 pl-9 pr-3 rounded-lg bg-background border border-border text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-1 focus:ring-orange/40 transition-shadow"
        />
      </div>

      <div className="rounded-lg border border-border overflow-hidden">
        <Table>
          <Thead>
            <Tr>
              <Th>Invoice</Th>
              <Th className="hidden sm:table-cell">Vehicle</Th>
              <Th className="hidden md:table-cell">Shop</Th>
              <Th>Status</Th>
              <Th className="text-right">Amount</Th>
            </Tr>
          </Thead>
          <Tbody>
            {filtered.map(inv => {
              const shop = shops.find(s => s.id === inv.shopId)
              return (
                <Tr key={inv.id} onClick={() => setSelected(inv)} className="cursor-pointer">
                  <Td>
                    <div className="text-sm font-medium text-text-primary">{inv.id}</div>
                    <div className="text-2xs text-text-muted">{inv.customerName}</div>
                  </Td>
                  <Td className="hidden sm:table-cell">
                    <span className="text-xs text-text-secondary">{inv.vehicle}</span>
                  </Td>
                  <Td className="hidden md:table-cell">
                    <span className="text-xs text-text-muted">{shop?.name}</span>
                  </Td>
                  <Td><StatusBadge status={inv.status} /></Td>
                  <Td className="text-right">
                    <span className="text-sm font-medium text-text-primary tabular-nums">${inv.total.toFixed(2)}</span>
                  </Td>
                </Tr>
              )
            })}
          </Tbody>
        </Table>
        {filtered.length === 0 && (
          <div className="py-12 text-center text-sm text-text-muted">No invoices found</div>
        )}
      </div>

      <InvoiceDetail
        invoice={selected}
        onClose={() => setSelected(null)}
        shops={shops}
        onPrint={(inv) => { setSelected(null); setGeneratorSource(inv); setGeneratorOpen(true) }}
      />
      <InvoiceGeneratorModal
        open={generatorOpen}
        onClose={() => { setGeneratorOpen(false); setGeneratorSource(null) }}
        fromInvoice={generatorSource}
      />
    </div>
  )
}
