import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, UserCircle } from 'lucide-react'
import { useData } from '@/contexts/DataContext'
import { useAuth } from '@/contexts/AuthContext'
import { Badge } from '@/components/ui/Badge'
import { Table, Thead, Th, Tbody, Tr, Td } from '@/components/ui/Table'
import { formatCurrency, formatDate } from '@/lib/utils'
import { cn } from '@/lib/utils'

const STATUS_CONFIG = {
  vip: { label: 'VIP', variant: 'vip' },
  regular: { label: 'Regular', variant: 'default' },
  new: { label: 'New', variant: 'blue' },
  'at-risk': { label: 'At Risk', variant: 'red' },
}

export default function Customers() {
  const navigate = useNavigate()
  const { customers, shops } = useData()
  const { session } = useAuth()
  const isAdvisor = session?.role === 'advisor'
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('All')

  const scopedCustomers = isAdvisor
    ? customers.filter(c => c.shopId === session.shopId)
    : customers

  const filtered = scopedCustomers.filter(c => {
    const q = search.toLowerCase()
    const matchSearch = !q || c.name.toLowerCase().includes(q) || c.email.toLowerCase().includes(q) || c.phone.includes(q)
    const matchStatus = statusFilter === 'All' || c.status === statusFilter
    return matchSearch && matchStatus
  })

  return (
    <div className="p-5 lg:p-6 space-y-5 animate-fade-in">
      <div>
        <h1 className="text-xl font-semibold text-text-primary">Customers</h1>
        <p className="text-xs text-text-muted mt-0.5">{scopedCustomers.length} customers{isAdvisor ? ' at your location' : ' across all locations'}</p>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Total',   value: scopedCustomers.length },
          { label: 'VIP',     value: scopedCustomers.filter(c => c.status === 'vip').length },
          { label: 'New',     value: scopedCustomers.filter(c => c.status === 'new').length },
          { label: 'At Risk', value: scopedCustomers.filter(c => c.status === 'at-risk').length },
        ].map(s => (
          <div key={s.label} className="bg-surface border border-border rounded-lg px-4 py-3">
            <div className="text-xs text-text-muted uppercase tracking-wider mb-1">{s.label}</div>
            <div className="text-xl font-semibold text-text-primary tabular-nums">{s.value}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search customers…"
            className="h-8 w-full rounded-md border border-border bg-surface pl-8 pr-3 text-xs text-text-primary placeholder:text-text-muted focus:outline-none focus:border-orange focus:ring-1 focus:ring-orange/30 transition-colors"
          />
        </div>
        <div className="flex gap-1">
          {['All', 'vip', 'regular', 'new', 'at-risk'].map(s => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={cn(
                'h-8 px-3 rounded-md text-xs font-medium transition-all duration-150 capitalize',
                statusFilter === s
                  ? 'bg-orange-subtle text-orange'
                  : 'text-text-muted hover:text-text-primary hover:bg-surface border border-border'
              )}
            >
              {s === 'at-risk' ? 'At Risk' : s}
            </button>
          ))}
        </div>
      </div>

      {/* Mobile */}
      <div className="sm:hidden space-y-2">
        {filtered.map(c => {
          const sc = STATUS_CONFIG[c.status] || STATUS_CONFIG.regular
          return (
            <button
              key={c.id}
              onClick={() => navigate(`/customers/${c.id}`)}
              className="w-full text-left bg-surface border border-border rounded-xl p-4 hover:border-orange/40 transition-colors"
            >
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-full bg-orange/10 flex items-center justify-center flex-shrink-0">
                  <span className="text-sm font-semibold text-orange">{c.name.split(' ').map(n => n[0]).join('').slice(0,2)}</span>
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-semibold text-text-primary truncate">{c.name}</div>
                  <div className="text-xs text-text-muted">{c.phone}</div>
                </div>
                <Badge variant={sc.variant}>{sc.label}</Badge>
              </div>
              <div className="flex items-center justify-between text-xs text-text-muted">
                <span>{c.roCount} visit{c.roCount !== 1 ? 's' : ''}</span>
                <span className="font-medium text-text-primary tabular-nums">{formatCurrency(c.totalSpent)}</span>
              </div>
            </button>
          )
        })}
        {filtered.length === 0 && (
          <div className="py-12 text-center text-sm text-text-muted">No customers found.</div>
        )}
      </div>

      {/* Table */}
      <div className="hidden sm:block bg-surface border border-border rounded-lg overflow-hidden">
        {filtered.length === 0 ? (
          <div className="py-16 text-center">
            <div className="w-12 h-12 rounded-xl bg-border mx-auto mb-3 flex items-center justify-center">
              <UserCircle size={20} className="text-text-muted" />
            </div>
            <p className="text-sm text-text-muted">No customers found.</p>
          </div>
        ) : (
          <Table>
            <Thead>
              <tr>
                <Th>Customer</Th>
                <Th>Status</Th>
                <Th>Vehicles</Th>
                <Th>Total Visits</Th>
                <Th className="text-right">Lifetime Spent</Th>
                <Th>Last Visit</Th>
                <Th>Shop</Th>
              </tr>
            </Thead>
            <Tbody>
              {filtered.map(c => {
                const shop = shops.find(s => s.id === c.shopId)
                const config = STATUS_CONFIG[c.status] || STATUS_CONFIG.regular
                return (
                  <Tr key={c.id} onClick={() => navigate(`/customers/${c.id}`)}>
                    <Td>
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-border flex items-center justify-center flex-shrink-0">
                          <span className="text-xs font-medium text-text-secondary">
                            {c.name.split(' ').map(n => n[0]).join('')}
                          </span>
                        </div>
                        <div>
                          <div className="font-medium text-text-primary">{c.name}</div>
                          <div className="text-xs text-text-muted">{c.phone}</div>
                        </div>
                      </div>
                    </Td>
                    <Td><Badge variant={config.variant}>{config.label}</Badge></Td>
                    <Td className="tabular-nums">{c.vehicles}</Td>
                    <Td className="tabular-nums">{c.roCount}</Td>
                    <Td className="text-right tabular-nums font-medium">{formatCurrency(c.totalSpent)}</Td>
                    <Td className="text-text-muted text-xs">{formatDate(c.lastVisit)}</Td>
                    <Td className="text-text-muted text-xs">{shop?.name}</Td>
                  </Tr>
                )
              })}
            </Tbody>
          </Table>
        )}
      </div>
    </div>
  )
}
