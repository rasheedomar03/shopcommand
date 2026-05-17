import { useState } from 'react'
import { Search, Download, Send, CheckCircle, Clock, AlertCircle, DollarSign } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/Button'
import { Table, Thead, Th, Tbody, Tr, Td } from '@/components/ui/Table'
import { Modal } from '@/components/ui/Modal'
import { formatCurrency, formatDate, formatRelativeTime } from '@/lib/utils'
import { cn } from '@/lib/utils'
import { shops } from '@/data/mock'

const INVOICE_STATUS = {
  paid:     { label: 'Paid',     color: 'text-status-green',  bg: 'bg-status-green/10', icon: CheckCircle },
  sent:     { label: 'Sent',     color: 'text-blue-400',      bg: 'bg-blue-500/10',     icon: Send },
  overdue:  { label: 'Overdue',  color: 'text-status-red',    bg: 'bg-status-red/10',   icon: AlertCircle },
  draft:    { label: 'Draft',    color: 'text-text-muted',    bg: 'bg-border',          icon: Clock },
}

const mockInvoices = [
  {
    id: 'INV-4401', roId: 'RO-8835', shopId: 1, customerId: 1, customerName: 'Gerald Hutchins',
    customerEmail: 'g.hutchins@email.com', vehicle: '2019 Ford F-150',
    status: 'paid', created: '2026-05-14T16:00:00', paidAt: '2026-05-14T16:45:00',
    paymentMethod: 'Visa ending 4821',
    services: [
      { name: 'Oil change (synthetic)', parts: 65, labor: 45 },
      { name: 'Tire rotation', parts: 0, labor: 35 },
    ],
    subtotal: 145, tax: 11.96, total: 156.96,
  },
  {
    id: 'INV-4402', roId: 'RO-8837', shopId: 3, customerId: 2, customerName: 'Sandra Montoya',
    customerEmail: 'smontoya@email.com', vehicle: '2018 Chevrolet Equinox',
    status: 'paid', created: '2026-05-13T14:30:00', paidAt: '2026-05-13T15:10:00',
    paymentMethod: 'Cash',
    services: [
      { name: 'Alternator replacement', parts: 310, labor: 180 },
      { name: 'Belt replacement', parts: 42, labor: 35 },
    ],
    subtotal: 567, tax: 46.78, total: 613.78,
  },
  {
    id: 'INV-4403', roId: 'RO-8839', shopId: 5, customerId: 7, customerName: 'Derek Williamson',
    customerEmail: 'dwilliamson@email.com', vehicle: '2022 BMW X5',
    status: 'sent', created: '2026-05-16T11:00:00', paidAt: null,
    paymentMethod: null,
    services: [
      { name: 'Brake pad replacement (all)', parts: 245, labor: 280 },
      { name: 'Rotor replacement (front)', parts: 190, labor: 0 },
      { name: 'Brake fluid flush', parts: 22, labor: 45 },
    ],
    subtotal: 782, tax: 64.52, total: 846.52,
  },
  {
    id: 'INV-4404', roId: 'RO-8840', shopId: 2, customerId: 4, customerName: 'Tanya Reeves',
    customerEmail: 'treeves@email.com', vehicle: '2020 Honda Civic',
    status: 'overdue', created: '2026-05-08T09:00:00', paidAt: null,
    paymentMethod: null,
    services: [
      { name: 'Starter motor replacement', parts: 265, labor: 190 },
    ],
    subtotal: 455, tax: 37.54, total: 492.54,
  },
  {
    id: 'INV-4405', roId: 'RO-8841', shopId: 1, customerId: 5, customerName: 'Louis Bergman',
    customerEmail: 'lbergman@email.com', vehicle: '2021 Toyota Camry',
    status: 'draft', created: '2026-05-17T08:00:00', paidAt: null,
    paymentMethod: null,
    services: [
      { name: 'Transmission fluid flush', parts: 85, labor: 125 },
      { name: 'Valve body cleaning', parts: 0, labor: 210 },
      { name: 'Solenoid replacement', parts: 185, labor: 0 },
    ],
    subtotal: 605, tax: 49.91, total: 654.91,
  },
  {
    id: 'INV-4406', roId: 'RO-8836', shopId: 4, customerId: 6, customerName: 'Alicia Watkins',
    customerEmail: 'aliciaw@email.com', vehicle: '2017 Nissan Altima',
    status: 'paid', created: '2026-05-11T15:30:00', paidAt: '2026-05-11T15:45:00',
    paymentMethod: 'Mastercard ending 7733',
    services: [
      { name: 'AC recharge', parts: 65, labor: 45 },
    ],
    subtotal: 110, tax: 9.08, total: 119.08,
  },
]

function StatusBadge({ status }) {
  const cfg = INVOICE_STATUS[status] || INVOICE_STATUS.draft
  return (
    <span className={cn('inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-2xs font-semibold', cfg.bg, cfg.color)}>
      <span className={cn('w-1.5 h-1.5 rounded-full', cfg.color.replace('text-', 'bg-'))} />
      {cfg.label}
    </span>
  )
}

function InvoiceDetail({ invoice, onClose }) {
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
  const { session } = useAuth()
  const isAdvisor = session?.role === 'advisor'
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('All')
  const [selected, setSelected] = useState(null)

  const scoped = isAdvisor
    ? mockInvoices.filter(inv => inv.shopId === session.shopId)
    : mockInvoices

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
        <Button>
          <Download size={15} />
          Export
        </Button>
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

      <InvoiceDetail invoice={selected} onClose={() => setSelected(null)} />
    </div>
  )
}
