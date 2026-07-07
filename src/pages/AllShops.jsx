import { useNavigate } from 'react-router-dom'
import { Building2, ChevronRight, MapPin } from 'lucide-react'
import { useData } from '@/contexts/DataContext'
import { formatCurrency } from '@/lib/utils'
import { cn } from '@/lib/utils'

export default function AllShops() {
  const navigate = useNavigate()
  const { shops } = useData()

  const totalRevToday = shops.reduce((s, sh) => s + (sh.revenue?.today || 0), 0)
  const totalRevMTD = shops.reduce((s, sh) => s + (sh.revenue?.mtd || 0), 0)
  const totalOpenROs = shops.reduce((s, sh) => s + (sh.openROs || 0), 0)

  return (
    <div className="p-5 lg:p-6 space-y-6 animate-fade-in">
      <div>
        <h1 className="text-xl font-semibold text-text-primary">All Shops</h1>
        <p className="text-xs text-text-muted mt-0.5">{shops.length} locations · Houston metro area</p>
      </div>

      {/* Summary bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
        {[
          { label: 'Today Revenue', value: formatCurrency(totalRevToday) },
          { label: 'MTD Revenue', value: formatCurrency(totalRevMTD) },
          { label: 'Open ROs', value: totalOpenROs },
        ].map(stat => (
          <div key={stat.label} className="bg-surface border border-border rounded-lg px-4 py-3">
            <div className="text-xs text-text-muted uppercase tracking-wider mb-1">{stat.label}</div>
            <div className="text-xl font-semibold text-text-primary tabular-nums">{stat.value}</div>
          </div>
        ))}
      </div>

      {/* Shop cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
        {shops.map(shop => (
          <ShopCard key={shop.id} shop={shop} onClick={() => navigate(`/shops/${shop.id}`)} />
        ))}
      </div>
    </div>
  )
}

function ShopCard({ shop, onClick }) {
  const effColor = shop.efficiency >= 85
    ? 'text-status-green'
    : shop.efficiency >= 75
    ? 'text-status-yellow'
    : 'text-status-red'

  return (
    <div
      onClick={onClick}
      className="bg-surface border border-border rounded-lg hover:border-border-hover cursor-pointer transition-colors duration-150 group"
    >
      {/* Header */}
      <div className="px-5 py-4 border-b border-border">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-md bg-orange-muted flex items-center justify-center flex-shrink-0">
              <Building2 size={16} className="text-orange" />
            </div>
            <div className="min-w-0">
              <div className="text-sm font-medium text-text-primary truncate">{shop.name}</div>
              <div className="flex items-center gap-1 mt-0.5">
                <MapPin size={10} className="text-text-muted flex-shrink-0" />
                <span className="text-xs text-text-muted truncate">{shop.address ? shop.address.split(',')[1]?.trim() || shop.address : 'No address'}</span>
              </div>
            </div>
          </div>
          <ChevronRight size={15} className="text-text-muted flex-shrink-0 mt-1 group-hover:text-orange transition-colors duration-150" />
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 divide-x divide-border border-b border-border">
        <div className="px-5 py-3">
          <div className="text-xs text-text-muted mb-0.5">Today</div>
          <div className="text-base font-semibold tabular-nums text-text-primary">{formatCurrency(shop.revenue?.today || 0)}</div>
        </div>
        <div className="px-5 py-3">
          <div className="text-xs text-text-muted mb-0.5">MTD</div>
          <div className="text-base font-semibold tabular-nums text-text-primary">{formatCurrency(shop.revenue?.mtd || 0)}</div>
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between px-5 py-3">
        <div className="flex items-center gap-3 text-xs">
          <span className="text-text-secondary">{shop.openROs || 0} open ROs</span>
          <span className="text-border">·</span>
          <span className="text-text-secondary">{shop.activeTechs || 0}/{shop.bays || 0} bays</span>
        </div>
        <span className={cn('text-xs font-medium tabular-nums', effColor)}>
          {shop.efficiency || 0}% eff.
        </span>
      </div>
    </div>
  )
}
