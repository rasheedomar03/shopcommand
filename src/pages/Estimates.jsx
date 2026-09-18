import { useState } from 'react'
import { Search, Plus } from 'lucide-react'
import { useData } from '@/contexts/DataContext'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/Button'
import { NewROModal } from '@/components/modals/NewROModal'
import { RODetailModal } from '@/components/modals/RODetailModal'
import { Table, Thead, Th, Tbody, Tr, Td } from '@/components/ui/Table'
import { formatCurrency, formatRelativeTime } from '@/lib/utils'
import { cn } from '@/lib/utils'

// Estimates are repair orders in the Estimate/Approved stages — one system,
// two views. (This page previously showed a hardcoded list disconnected from
// real ROs, and its detail modal crashed on an undefined variable.)

const ESTIMATE_STATUS = {
  pending:  { label: 'Awaiting approval', color: 'text-status-yellow', bg: 'bg-status-yellow/10' },
  approved: { label: 'Approved',          color: 'text-status-green',  bg: 'bg-status-green/10' },
}

function estimateStatus(ro) {
  if (ro.stage === 'Approved' || ro.authorized) return 'approved'
  return 'pending'
}

function estimateTotal(ro) {
  if (ro.total > 0) return ro.total
  return (ro.services || []).reduce((s, svc) => s + (svc.price || 0), 0)
}

function StatusBadge({ status }) {
  const cfg = ESTIMATE_STATUS[status] || ESTIMATE_STATUS.pending
  return (
    <span className={cn('inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-2xs font-semibold', cfg.bg, cfg.color)}>
      <span className={cn('w-1.5 h-1.5 rounded-full', cfg.color.replace('text-', 'bg-'))} />
      {cfg.label}
    </span>
  )
}

export default function Estimates() {
  const { shops, repairOrders } = useData()
  const { session } = useAuth()
  const isAdvisor = session?.role === 'advisor'
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('All')
  const [selected, setSelected] = useState(null)
  const [newOpen, setNewOpen] = useState(false)

  const allEstimates = repairOrders.filter(ro => ro.stage === 'Estimate' || ro.stage === 'Approved')
  const scoped = isAdvisor
    ? allEstimates.filter(ro => ro.shopId === session.shopId)
    : allEstimates

  const filtered = scoped.filter(ro => {
    const q = search.toLowerCase()
    const matchesSearch = !q ||
      String(ro.roNumber || ro.id).toLowerCase().includes(q) ||
      (ro.customerName || '').toLowerCase().includes(q) ||
      (ro.vehicle || '').toLowerCase().includes(q)
    const matchesStatus = statusFilter === 'All' || estimateStatus(ro) === statusFilter
    return matchesSearch && matchesStatus
  })

  const statusCounts = ['All', ...Object.keys(ESTIMATE_STATUS)].reduce((acc, s) => {
    acc[s] = s === 'All' ? scoped.length : scoped.filter(ro => estimateStatus(ro) === s).length
    return acc
  }, {})

  return (
    <div className="p-4 sm:p-5 lg:p-6 space-y-4 sm:space-y-5 animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-semibold text-text-primary">Estimates</h1>
          <p className="text-xs text-text-muted mt-0.5">
            Repair orders awaiting customer approval · {statusCounts.pending} pending · {statusCounts.approved} approved
          </p>
        </div>
        <Button onClick={() => setNewOpen(true)}>
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
            {filtered.map(ro => {
              const shop = shops.find(s => s.id === ro.shopId)
              const total = estimateTotal(ro)
              return (
                <Tr key={ro.id} onClick={() => setSelected(ro)} className="cursor-pointer">
                  <Td>
                    <div className="text-sm font-medium text-text-primary">{ro.roNumber || ro.id}</div>
                    <div className="text-2xs text-text-muted">{ro.customerName} · {formatRelativeTime(ro.created)}</div>
                  </Td>
                  <Td className="hidden sm:table-cell">
                    <span className="text-xs text-text-secondary">{ro.vehicle}</span>
                  </Td>
                  <Td className="hidden md:table-cell">
                    <span className="text-xs text-text-muted">{shop?.name}</span>
                  </Td>
                  <Td><StatusBadge status={estimateStatus(ro)} /></Td>
                  <Td className="text-right">
                    <span className="text-sm font-medium text-text-primary tabular-nums">
                      {total > 0 ? formatCurrency(total) : '—'}
                    </span>
                  </Td>
                </Tr>
              )
            })}
          </Tbody>
        </Table>
        {filtered.length === 0 && (
          <div className="py-12 text-center text-sm text-text-muted">
            No estimates right now — new repair orders start here in the Estimate stage.
          </div>
        )}
      </div>

      {selected && (
        <RODetailModal key={selected.id} open={!!selected} onClose={() => setSelected(null)} ro={selected} />
      )}
      {newOpen && <NewROModal open={newOpen} onClose={() => setNewOpen(false)} />}
    </div>
  )
}
