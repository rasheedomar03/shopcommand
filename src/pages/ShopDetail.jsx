import { useParams, useNavigate } from 'react-router-dom'
import { useState } from 'react'
import { ArrowLeft, Phone, MapPin, User, Plus } from 'lucide-react'
import { shops, repairOrders, technicians } from '@/data/mock'
import { Button } from '@/components/ui/Button'
import { StageBadge } from '@/components/ui/Badge'
import { NewROModal } from '@/components/modals/NewROModal'
import { RODetailModal } from '@/components/modals/RODetailModal'
import { formatCurrency } from '@/lib/utils'
import { cn } from '@/lib/utils'

export default function ShopDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const shop = shops.find(s => String(s.id) === id)
  const [newROOpen, setNewROOpen] = useState(false)
  const [selectedRO, setSelectedRO] = useState(null)

  if (!shop) {
    return (
      <div className="p-6 text-center">
        <p className="text-text-muted">Shop not found.</p>
        <Button variant="ghost" onClick={() => navigate('/shops')} className="mt-3">Back to Shops</Button>
      </div>
    )
  }

  const shopROs = repairOrders.filter(ro => ro.shopId === shop.id)
  const shopTechs = technicians.filter(t => t.shopId === shop.id)

  const effColor = shop.efficiency >= 85 ? 'text-status-green' : shop.efficiency >= 75 ? 'text-status-yellow' : 'text-status-red'

  return (
    <div className="p-5 lg:p-6 space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <button
          onClick={() => navigate('/shops')}
          className="flex items-center gap-1.5 text-xs text-text-muted hover:text-text-primary transition-colors duration-150 mb-4"
        >
          <ArrowLeft size={13} />
          All Shops
        </button>
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-xl font-semibold text-text-primary">{shop.name}</h1>
            <div className="flex items-center gap-4 mt-1.5 flex-wrap">
              <div className="flex items-center gap-1.5 text-xs text-text-muted">
                <MapPin size={12} />
                {shop.address}
              </div>
              <div className="flex items-center gap-1.5 text-xs text-text-muted">
                <Phone size={12} />
                {shop.phone}
              </div>
              <div className="flex items-center gap-1.5 text-xs text-text-muted">
                <User size={12} />
                {shop.manager}
              </div>
            </div>
          </div>
          <Button onClick={() => setNewROOpen(true)}>
            <Plus size={15} />
            New RO
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: 'Today', value: formatCurrency(shop.revenue.today) },
          { label: 'MTD Revenue', value: formatCurrency(shop.revenue.mtd) },
          { label: 'Open ROs', value: shop.openROs },
          { label: 'Efficiency', value: <span className={effColor}>{shop.efficiency}%</span> },
        ].map(s => (
          <div key={s.label} className="bg-surface border border-border rounded-lg px-4 py-3">
            <div className="text-xs text-text-muted uppercase tracking-wider mb-1">{s.label}</div>
            <div className="text-xl font-semibold text-text-primary tabular-nums">{s.value}</div>
          </div>
        ))}
      </div>

      {/* ROs and Techs */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* ROs */}
        <div className="bg-surface border border-border rounded-lg">
          <div className="px-5 py-4 border-b border-border">
            <div className="text-sm font-medium text-text-primary">Repair Orders</div>
          </div>
          {shopROs.length === 0 ? (
            <div className="px-5 py-10 text-center text-text-muted text-sm">No repair orders for this shop.</div>
          ) : (
            <div className="divide-y divide-border/60">
              {shopROs.map(ro => (
                <div
                  key={ro.id}
                  className="flex items-center gap-3 px-5 py-3 hover:bg-border/30 cursor-pointer transition-colors duration-100"
                  onClick={() => setSelectedRO(ro)}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-xs font-mono text-text-muted">{ro.id}</span>
                      <StageBadge stage={ro.stage} />
                    </div>
                    <div className="text-sm text-text-primary truncate">{ro.customerName} · {ro.vehicle}</div>
                  </div>
                  {ro.total > 0 && <span className="text-sm tabular-nums text-text-primary">{formatCurrency(ro.total)}</span>}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Techs */}
        <div className="bg-surface border border-border rounded-lg">
          <div className="px-5 py-4 border-b border-border">
            <div className="text-sm font-medium text-text-primary">Technicians</div>
          </div>
          {shopTechs.length === 0 ? (
            <div className="px-5 py-10 text-center text-text-muted text-sm">No technicians assigned.</div>
          ) : (
            <div className="divide-y divide-border/60">
              {shopTechs.map(tech => (
                <div key={tech.id} className="flex items-center justify-between px-5 py-3">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-border flex items-center justify-center flex-shrink-0">
                      <span className="text-xs font-medium text-text-secondary">
                        {tech.name.split(' ').map(n => n[0]).join('')}
                      </span>
                    </div>
                    <div>
                      <div className="text-sm text-text-primary">{tech.name}</div>
                      <div className="text-xs text-text-muted">{tech.specialty}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className={cn(
                      'text-xs font-medium px-2 py-0.5 rounded-full',
                      tech.status === 'clocked-in' ? 'bg-status-green-subtle text-status-green' : 'bg-border text-text-muted'
                    )}>
                      {tech.status === 'clocked-in' ? 'Active' : 'Off'}
                    </div>
                    <div className="text-xs text-text-muted mt-0.5">{tech.efficiency}% eff.</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <NewROModal open={newROOpen} onClose={() => setNewROOpen(false)} preShopId={shop.id} />
      {selectedRO && <RODetailModal key={selectedRO.id} open={!!selectedRO} onClose={() => setSelectedRO(null)} ro={selectedRO} />}
    </div>
  )
}
