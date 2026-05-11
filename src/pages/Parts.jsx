import { useState } from 'react'
import { Search, AlertTriangle, Package } from 'lucide-react'
import { parts, shops } from '@/data/mock'
import { Badge } from '@/components/ui/Badge'
import { Table, Thead, Th, Tbody, Tr, Td } from '@/components/ui/Table'
import { formatCurrency, formatDate } from '@/lib/utils'
import { cn } from '@/lib/utils'

export default function Parts() {
  const [search, setSearch] = useState('')
  const [shopFilter, setShopFilter] = useState('All')
  const [stockFilter, setStockFilter] = useState('All')

  const filtered = parts.filter(p => {
    const q = search.toLowerCase()
    const matchSearch = !q || p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q) || p.category.toLowerCase().includes(q)
    const matchShop = shopFilter === 'All' || String(p.shopId) === shopFilter
    const matchStock = stockFilter === 'All'
      || (stockFilter === 'low' && p.qty <= p.minQty && p.qty > 0)
      || (stockFilter === 'out' && p.qty === 0)
      || (stockFilter === 'ok' && p.qty > p.minQty)
    return matchSearch && matchShop && matchStock
  })

  const lowStockCount = parts.filter(p => p.qty <= p.minQty).length
  const outCount = parts.filter(p => p.qty === 0).length

  const getStockStatus = (p) => {
    if (p.qty === 0) return { label: 'Out of Stock', variant: 'red', dot: 'bg-status-red' }
    if (p.qty <= p.minQty) return { label: 'Low Stock', variant: 'yellow', dot: 'bg-status-yellow' }
    return { label: 'In Stock', variant: 'green', dot: 'bg-status-green' }
  }

  return (
    <div className="p-5 lg:p-6 space-y-5 animate-fade-in">
      <div>
        <h1 className="text-xl font-semibold text-text-primary">Parts Inventory</h1>
        <p className="text-xs text-text-muted mt-0.5">{parts.length} SKUs tracked</p>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-surface border border-border rounded-lg px-4 py-3">
          <div className="text-xs text-text-muted uppercase tracking-wider mb-1">Total SKUs</div>
          <div className="text-xl font-semibold text-text-primary tabular-nums">{parts.length}</div>
        </div>
        <div className={cn('bg-surface border rounded-lg px-4 py-3', lowStockCount > 0 ? 'border-status-yellow/40' : 'border-border')}>
          <div className="text-xs text-text-muted uppercase tracking-wider mb-1 flex items-center gap-1">
            {lowStockCount > 0 && <AlertTriangle size={11} className="text-status-yellow" />}
            Low Stock
          </div>
          <div className={cn('text-xl font-semibold tabular-nums', lowStockCount > 0 ? 'text-status-yellow' : 'text-text-primary')}>{lowStockCount}</div>
        </div>
        <div className={cn('bg-surface border rounded-lg px-4 py-3', outCount > 0 ? 'border-status-red/40' : 'border-border')}>
          <div className="text-xs text-text-muted uppercase tracking-wider mb-1 flex items-center gap-1">
            {outCount > 0 && <AlertTriangle size={11} className="text-status-red" />}
            Out of Stock
          </div>
          <div className={cn('text-xl font-semibold tabular-nums', outCount > 0 ? 'text-status-red' : 'text-text-primary')}>{outCount}</div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search SKU, part name, category…"
            className="h-8 w-full rounded-md border border-border bg-surface pl-8 pr-3 text-xs text-text-primary placeholder:text-text-muted focus:outline-none focus:border-orange focus:ring-1 focus:ring-orange/30 transition-colors"
          />
        </div>
        <select
          value={shopFilter}
          onChange={e => setShopFilter(e.target.value)}
          className="h-8 rounded-md border border-border bg-surface px-3 text-xs text-text-primary focus:outline-none focus:border-orange [&>option]:bg-surface"
        >
          <option value="All">All shops</option>
          {shops.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
        <div className="flex gap-1">
          {[
            { key: 'All', label: 'All' },
            { key: 'ok', label: 'In Stock' },
            { key: 'low', label: 'Low' },
            { key: 'out', label: 'Out' },
          ].map(s => (
            <button
              key={s.key}
              onClick={() => setStockFilter(s.key)}
              className={cn(
                'h-8 px-3 rounded-md text-xs font-medium transition-all duration-150',
                stockFilter === s.key
                  ? 'bg-orange-subtle text-orange'
                  : 'text-text-muted hover:text-text-primary hover:bg-surface border border-border'
              )}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="bg-surface border border-border rounded-lg overflow-hidden">
        {filtered.length === 0 ? (
          <div className="py-16 text-center">
            <div className="w-12 h-12 rounded-xl bg-border mx-auto mb-3 flex items-center justify-center">
              <Package size={20} className="text-text-muted" />
            </div>
            <p className="text-sm text-text-muted">No parts found.</p>
          </div>
        ) : (
          <Table>
            <Thead>
              <tr>
                <Th>SKU</Th>
                <Th>Part Name</Th>
                <Th>Category</Th>
                <Th>Status</Th>
                <Th className="text-right">Qty / Min</Th>
                <Th className="text-right">Cost</Th>
                <Th className="text-right">Price</Th>
                <Th>Shop</Th>
                <Th>Last Ordered</Th>
              </tr>
            </Thead>
            <Tbody>
              {filtered.map(part => {
                const shop = shops.find(s => s.id === part.shopId)
                const status = getStockStatus(part)
                return (
                  <Tr key={part.id}>
                    <Td><span className="text-xs font-mono text-text-muted">{part.sku}</span></Td>
                    <Td>
                      <div className="font-medium text-text-primary">{part.name}</div>
                      <div className="text-xs text-text-muted">{part.vendor}</div>
                    </Td>
                    <Td className="text-text-secondary">{part.category}</Td>
                    <Td>
                      <div className="flex items-center gap-1.5">
                        <div className={cn('w-1.5 h-1.5 rounded-full flex-shrink-0', status.dot)} />
                        <span className={cn('text-xs', status.variant === 'red' ? 'text-status-red' : status.variant === 'yellow' ? 'text-status-yellow' : 'text-status-green')}>
                          {status.label}
                        </span>
                      </div>
                    </Td>
                    <Td className="text-right tabular-nums">
                      <span className={cn(part.qty <= part.minQty ? 'text-status-red font-medium' : 'text-text-primary')}>
                        {part.qty}
                      </span>
                      <span className="text-text-muted"> / {part.minQty}</span>
                    </Td>
                    <Td className="text-right tabular-nums text-text-secondary">{formatCurrency(part.cost)}</Td>
                    <Td className="text-right tabular-nums text-text-primary font-medium">{formatCurrency(part.price)}</Td>
                    <Td className="text-text-muted text-xs">{shop?.name}</Td>
                    <Td className="text-text-muted text-xs">{formatDate(part.lastOrdered)}</Td>
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
