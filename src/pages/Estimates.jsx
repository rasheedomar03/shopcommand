import { useState } from 'react'
import { Search, Plus, Send, Check, X, Clock, ChevronRight, Phone } from 'lucide-react'
import { useData } from '@/contexts/DataContext'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/Button'
import { Table, Thead, Th, Tbody, Tr, Td } from '@/components/ui/Table'
import { Modal } from '@/components/ui/Modal'
import { formatCurrency, formatRelativeTime } from '@/lib/utils'
import { cn } from '@/lib/utils'
import { shops } from '@/data/mock'

const ESTIMATE_STATUS = {
  draft:    { label: 'Draft',    color: 'text-text-muted',    bg: 'bg-border' },
  sent:     { label: 'Sent',     color: 'text-blue-400',      bg: 'bg-blue-500/10' },
  approved: { label: 'Approved', color: 'text-status-green',  bg: 'bg-status-green/10' },
  declined: { label: 'Declined', color: 'text-status-red',    bg: 'bg-status-red/10' },
  expired:  { label: 'Expired',  color: 'text-status-yellow', bg: 'bg-status-yellow/10' },
}

const mockEstimates = [
  {
    id: 'EST-1201', shopId: 1, customerId: 1, customerName: 'Gerald Hutchins', customerPhone: '+1 (713) 881-4472',
    vehicle: '2019 Ford F-150', status: 'sent', created: '2026-05-16T14:30:00', expires: '2026-05-23T14:30:00',
    services: [
      { name: 'Brake pad replacement (front)', parts: 89, labor: 120 },
      { name: 'Rotor resurfacing', parts: 0, labor: 80 },
      { name: 'Brake fluid flush', parts: 22, labor: 45 },
    ],
    total: 356, notes: 'Customer mentioned squeaking when braking at low speed',
  },
  {
    id: 'EST-1202', shopId: 1, customerId: 5, customerName: 'Louis Bergman', customerPhone: '+1 (281) 663-0921',
    vehicle: '2021 Toyota Camry', status: 'approved', created: '2026-05-15T09:00:00', expires: '2026-05-22T09:00:00',
    services: [
      { name: '60k mile service', parts: 145, labor: 280 },
      { name: 'Cabin air filter', parts: 32, labor: 15 },
    ],
    total: 472, notes: '',
  },
  {
    id: 'EST-1203', shopId: 2, customerId: 4, customerName: 'Tanya Reeves', customerPhone: '+1 (713) 556-3847',
    vehicle: '2020 Honda Civic', status: 'draft', created: '2026-05-17T08:15:00', expires: '2026-05-24T08:15:00',
    services: [
      { name: 'AC compressor replacement', parts: 420, labor: 350 },
      { name: 'AC recharge', parts: 65, labor: 45 },
    ],
    total: 880, notes: 'No cold air — diagnosed compressor failure',
  },
  {
    id: 'EST-1204', shopId: 3, customerId: 2, customerName: 'Sandra Montoya', customerPhone: '+1 (281) 772-6931',
    vehicle: '2018 Chevrolet Equinox', status: 'declined', created: '2026-05-12T11:00:00', expires: '2026-05-19T11:00:00',
    services: [
      { name: 'Timing chain replacement', parts: 380, labor: 650 },
      { name: 'Water pump (preventive)', parts: 95, labor: 0 },
    ],
    total: 1125, notes: 'Customer said too expensive, will get second opinion',
  },
  {
    id: 'EST-1205', shopId: 5, customerId: 7, customerName: 'Derek Williamson', customerPhone: '+1 (832) 798-5503',
    vehicle: '2022 BMW X5', status: 'sent', created: '2026-05-16T16:45:00', expires: '2026-05-23T16:45:00',
    services: [
      { name: 'Oil change (synthetic)', parts: 85, labor: 55 },
      { name: 'Brake fluid flush', parts: 22, labor: 45 },
      { name: 'Cabin air filter', parts: 48, labor: 15 },
      { name: 'Engine air filter', parts: 38, labor: 10 },
    ],
    total: 318, notes: 'Regular maintenance visit',
  },
  {
    id: 'EST-1206', shopId: 4, customerId: 6, customerName: 'Alicia Watkins', customerPhone: '+1 (713) 324-8817',
    vehicle: '2017 Nissan Altima', status: 'expired', created: '2026-05-03T10:00:00', expires: '2026-05-10T10:00:00',
    services: [
      { name: 'Transmission fluid exchange', parts: 110, labor: 120 },
    ],
    total: 230, notes: 'Customer never responded',
  },
]

function StatusBadge({ status }) {
  const cfg = ESTIMATE_STATUS[status] || ESTIMATE_STATUS.draft
  return (
    <span className={cn('inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-2xs font-semibold', cfg.bg, cfg.color)}>
      <span className={cn('w-1.5 h-1.5 rounded-full', cfg.color.replace('text-', 'bg-'))} />
      {cfg.label}
    </span>
  )
}

function EstimateDetail({ estimate, onClose }) {
  if (!estimate) return null
  const shop = shops.find(s => s.id === estimate.shopId)

  return (
    <Modal open={!!estimate} onClose={onClose} title={estimate.id} subtitle={`${estimate.vehicle} · ${estimate.customerName}`} size="lg">
      <div className="p-5 space-y-5">
        <div className="flex items-center justify-between">
          <StatusBadge status={estimate.status} />
          <span className="text-xs text-text-muted">{shop?.name}</span>
        </div>

        <div className="rounded-lg border border-border overflow-hidden">
          <div className="grid grid-cols-[1fr_auto_auto] gap-4 px-4 py-2.5 bg-background text-xs font-medium text-text-muted uppercase tracking-wider">
            <div>Service</div>
            <div className="text-right">Parts</div>
            <div className="text-right">Labor</div>
          </div>
          {estimate.services.map((svc, i) => (
            <div key={i} className={cn('grid grid-cols-[1fr_auto_auto] gap-4 px-4 py-3 text-sm', i > 0 && 'border-t border-border')}>
              <div className="text-text-primary">{svc.name}</div>
              <div className="text-right text-text-secondary tabular-nums">{formatCurrency(svc.parts)}</div>
              <div className="text-right text-text-secondary tabular-nums">{formatCurrency(svc.labor)}</div>
            </div>
          ))}
          <div className="grid grid-cols-[1fr_auto] gap-4 px-4 py-3 border-t border-border bg-background">
            <div className="text-sm font-semibold text-text-primary">Total</div>
            <div className="text-sm font-semibold text-orange tabular-nums">{formatCurrency(estimate.total)}</div>
          </div>
        </div>

        {estimate.notes && (
          <div className="rounded-lg bg-background border border-border p-3">
            <div className="text-2xs font-medium text-text-muted uppercase tracking-wider mb-1">Notes</div>
            <p className="text-sm text-text-secondary">{estimate.notes}</p>
          </div>
        )}

        <div className="flex items-center justify-between pt-2">
          <div className="text-xs text-text-muted">
            Created {formatRelativeTime(estimate.created)}
          </div>
          <div className="flex items-center gap-2">
            {estimate.status === 'draft' && (
              <Button size="sm">
                <Send size={13} />
                Send to customer
              </Button>
            )}
            {estimate.status === 'approved' && (
              <Button size="sm">
                <ChevronRight size={13} />
                Convert to RO
              </Button>
            )}
          </div>
        </div>
      </div>
    </Modal>
  )
}

export default function Estimates() {
  const { session } = useAuth()
  const isAdvisor = session?.role === 'advisor'
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('All')
  const [selected, setSelected] = useState(null)

  const scoped = isAdvisor
    ? mockEstimates.filter(e => e.shopId === session.shopId)
    : mockEstimates

  const filtered = scoped.filter(e => {
    const q = search.toLowerCase()
    const matchesSearch = !q ||
      e.id.toLowerCase().includes(q) ||
      e.customerName.toLowerCase().includes(q) ||
      e.vehicle.toLowerCase().includes(q)
    const matchesStatus = statusFilter === 'All' || e.status === statusFilter
    return matchesSearch && matchesStatus
  })

  const statusCounts = ['All', ...Object.keys(ESTIMATE_STATUS)].reduce((acc, s) => {
    acc[s] = s === 'All' ? scoped.length : scoped.filter(e => e.status === s).length
    return acc
  }, {})

  return (
    <div className="p-4 sm:p-5 lg:p-6 space-y-4 sm:space-y-5 animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-semibold text-text-primary">Estimates</h1>
          <p className="text-xs text-text-muted mt-0.5">{scoped.length} total · {scoped.filter(e => e.status === 'sent').length} awaiting response</p>
        </div>
        <Button>
          <Plus size={15} />
          New Estimate
        </Button>
      </div>

      <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-hide pb-1 -mx-4 px-4 sm:mx-0 sm:px-0">
        {['All', ...Object.keys(ESTIMATE_STATUS)].map(s => (
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
            {s === 'All' ? 'All' : ESTIMATE_STATUS[s].label}
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
          placeholder="Search estimates..."
          className="w-full h-9 pl-9 pr-3 rounded-lg bg-background border border-border text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-1 focus:ring-orange/40 transition-shadow"
        />
      </div>

      <div className="rounded-lg border border-border overflow-hidden">
        <Table>
          <Thead>
            <Tr>
              <Th>Estimate</Th>
              <Th className="hidden sm:table-cell">Vehicle</Th>
              <Th className="hidden md:table-cell">Shop</Th>
              <Th>Status</Th>
              <Th className="text-right">Total</Th>
            </Tr>
          </Thead>
          <Tbody>
            {filtered.map(est => {
              const shop = shops.find(s => s.id === est.shopId)
              return (
                <Tr key={est.id} onClick={() => setSelected(est)} className="cursor-pointer">
                  <Td>
                    <div className="text-sm font-medium text-text-primary">{est.id}</div>
                    <div className="text-2xs text-text-muted">{est.customerName}</div>
                  </Td>
                  <Td className="hidden sm:table-cell">
                    <span className="text-xs text-text-secondary">{est.vehicle}</span>
                  </Td>
                  <Td className="hidden md:table-cell">
                    <span className="text-xs text-text-muted">{shop?.name}</span>
                  </Td>
                  <Td><StatusBadge status={est.status} /></Td>
                  <Td className="text-right">
                    <span className="text-sm font-medium text-text-primary tabular-nums">{formatCurrency(est.total)}</span>
                  </Td>
                </Tr>
              )
            })}
          </Tbody>
        </Table>
        {filtered.length === 0 && (
          <div className="py-12 text-center text-sm text-text-muted">No estimates found</div>
        )}
      </div>

      <EstimateDetail estimate={selected} onClose={() => setSelected(null)} />
    </div>
  )
}
