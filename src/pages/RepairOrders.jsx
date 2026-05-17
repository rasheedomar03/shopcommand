import { useState } from 'react'
import { Search, Plus, Filter } from 'lucide-react'
import { shops } from '@/data/mock'
import { useData } from '@/contexts/DataContext'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/Button'
import { StageBadge } from '@/components/ui/Badge'
import { NewROModal } from '@/components/modals/NewROModal'
import { RODetailModal } from '@/components/modals/RODetailModal'
import { Table, Thead, Th, Tbody, Tr, Td } from '@/components/ui/Table'
import { formatCurrency, formatRelativeTime, RO_STAGES } from '@/lib/utils'
import { cn } from '@/lib/utils'

export default function RepairOrders() {
  const { repairOrders } = useData()
  const { session } = useAuth()
  const isAdvisor = session?.role === 'advisor'
  const [newROOpen, setNewROOpen] = useState(false)
  const [selectedRO, setSelectedRO] = useState(null)
  const [search, setSearch] = useState('')
  const [stageFilter, setStageFilter] = useState('All')
  const [shopFilter, setShopFilter] = useState('All')

  const scopedROs = isAdvisor
    ? repairOrders.filter(ro => ro.shopId === session.shopId)
    : repairOrders

  const filtered = scopedROs.filter(ro => {
    const q = search.toLowerCase()
    const matchesSearch = !q ||
      ro.id.toLowerCase().includes(q) ||
      ro.customerName.toLowerCase().includes(q) ||
      ro.vehicle.toLowerCase().includes(q) ||
      ro.techName?.toLowerCase().includes(q)
    const matchesStage = stageFilter === 'All' || ro.stage === stageFilter
    const matchesShop = isAdvisor || shopFilter === 'All' || String(ro.shopId) === shopFilter
    return matchesSearch && matchesStage && matchesShop
  })

  const stageCounts = ['All', ...RO_STAGES].reduce((acc, s) => {
    acc[s] = s === 'All' ? scopedROs.length : scopedROs.filter(ro => ro.stage === s).length
    return acc
  }, {})

  return (
    <div className="p-4 sm:p-5 lg:p-6 space-y-4 sm:space-y-5 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-semibold text-text-primary">Repair Orders</h1>
          <p className="text-xs text-text-muted mt-0.5">{scopedROs.length} total · {scopedROs.filter(r => r.stage !== 'Invoiced').length} active</p>
        </div>
        <Button onClick={() => setNewROOpen(true)}>
          <Plus size={15} />
          New RO
        </Button>
      </div>

      {/* Stage filter tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-hide pb-1 -mx-4 px-4 sm:mx-0 sm:px-0">
        {['All', ...RO_STAGES].map(s => (
          <button
            key={s}
            onClick={() => setStageFilter(s)}
            className={cn(
              'flex items-center gap-1.5 h-7 px-3 rounded-md text-xs font-medium whitespace-nowrap',
              'transition-all duration-150',
              stageFilter === s
                ? 'bg-orange-subtle text-orange'
                : 'text-text-muted hover:text-text-primary hover:bg-surface'
            )}
          >
            {s}
            <span className={cn(
              'text-2xs px-1 py-0.5 rounded',
              stageFilter === s ? 'bg-orange/20' : 'bg-border'
            )}>
              {stageCounts[s]}
            </span>
          </button>
        ))}
      </div>

      {/* Filters row */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search ROs, customers, vehicles…"
            className="h-8 w-full rounded-md border border-border bg-surface pl-8 pr-3 text-xs text-text-primary placeholder:text-text-muted focus:outline-none focus:border-orange focus:ring-1 focus:ring-orange/30 transition-colors duration-150"
          />
        </div>
        {!isAdvisor && (
          <select
            value={shopFilter}
            onChange={e => setShopFilter(e.target.value)}
            className="h-8 rounded-md border border-border bg-surface px-3 text-xs text-text-primary focus:outline-none focus:border-orange [&>option]:bg-surface"
          >
            <option value="All">All shops</option>
            {shops.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        )}
      </div>

      {/* Mobile card list */}
      <div className="sm:hidden space-y-2">
        {filtered.map(ro => (
          <button
            key={ro.id}
            onClick={() => setSelectedRO(ro)}
            className="w-full text-left bg-surface border border-border rounded-xl p-4 hover:border-orange/40 transition-colors"
          >
            <div className="flex items-start justify-between gap-2 mb-2">
              <div>
                <div className="text-xs font-mono text-orange">{ro.id}</div>
                <div className="text-sm font-semibold text-text-primary mt-0.5">{ro.customerName}</div>
                <div className="text-xs text-text-muted">{ro.vehicle}</div>
              </div>
              <StageBadge stage={ro.stage} />
            </div>
            <div className="flex items-center justify-between text-xs text-text-muted">
              <span>{ro.techName || 'Unassigned'}</span>
              <span className="font-medium text-text-primary tabular-nums">{ro.total ? formatCurrency(ro.total) : '—'}</span>
            </div>
          </button>
        ))}
        {filtered.length === 0 && (
          <div className="py-12 text-center text-sm text-text-muted">No repair orders found.</div>
        )}
      </div>

      {/* Table */}
      <div className="hidden sm:block bg-surface border border-border rounded-lg overflow-hidden">
        {filtered.length === 0 ? (
          <div className="py-16 text-center">
            <div className="w-12 h-12 rounded-xl bg-border mx-auto mb-3 flex items-center justify-center">
              <Filter size={20} className="text-text-muted" />
            </div>
            <p className="text-sm text-text-muted">No repair orders match your filters.</p>
            <button
              onClick={() => { setSearch(''); setStageFilter('All'); setShopFilter('All') }}
              className="mt-2 text-xs text-orange hover:underline"
            >
              Clear filters
            </button>
          </div>
        ) : (
          <Table>
            <Thead>
              <tr>
                <Th>RO #</Th>
                <Th>Customer · Vehicle</Th>
                <Th>Stage</Th>
                <Th>Technician</Th>
                <Th>Shop</Th>
                <Th className="text-right">Total</Th>
                <Th>Updated</Th>
              </tr>
            </Thead>
            <Tbody>
              {filtered.map(ro => {
                const shop = shops.find(s => s.id === ro.shopId)
                return (
                  <Tr key={ro.id} onClick={() => setSelectedRO(ro)}>
                    <Td>
                      <span className="text-xs font-mono text-text-muted">{ro.id}</span>
                    </Td>
                    <Td>
                      <div className="font-medium text-text-primary">{ro.customerName}</div>
                      <div className="text-xs text-text-muted">{ro.vehicle}</div>
                    </Td>
                    <Td><StageBadge stage={ro.stage} /></Td>
                    <Td className="text-text-secondary">{ro.techName || '—'}</Td>
                    <Td className="text-text-muted text-xs">{shop?.name}</Td>
                    <Td className="text-right tabular-nums">
                      {ro.total > 0 ? (
                        <span className="text-text-primary font-medium">{formatCurrency(ro.total)}</span>
                      ) : (
                        <span className="text-text-muted">Pending</span>
                      )}
                    </Td>
                    <Td className="text-text-muted text-xs">{formatRelativeTime(ro.updated)}</Td>
                  </Tr>
                )
              })}
            </Tbody>
          </Table>
        )}
      </div>

      <NewROModal open={newROOpen} onClose={() => setNewROOpen(false)} />
      {selectedRO && <RODetailModal open={!!selectedRO} onClose={() => setSelectedRO(null)} ro={selectedRO} />}
    </div>
  )
}
