import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Phone, Mail, MapPin, Plus, Star, Clock, TrendingUp, Wrench, Car, Check, Shield } from 'lucide-react'
import { useData } from '@/contexts/DataContext'
import { Badge, StageBadge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { RODetailModal } from '@/components/modals/RODetailModal'
import { NewROModal } from '@/components/modals/NewROModal'
import { formatCurrency, formatDate, formatRelativeTime } from '@/lib/utils'
import { cn } from '@/lib/utils'

const STATUS_CONFIG = {
  vip:      { label: 'VIP',     variant: 'vip',     icon: Star },
  regular:  { label: 'Regular', variant: 'default',  icon: null },
  new:      { label: 'New',     variant: 'blue',     icon: null },
  'at-risk':{ label: 'At Risk', variant: 'red',      icon: null },
}

const METHOD_LABELS = {
  'text-to-pay': 'Text-to-pay',
  'cash': 'Cash',
  'card': 'Card',
  'check': 'Check',
}

// Warranty helpers (module-level, no state needed)
const warrantyExpires = (svc) => {
  if (!svc.warrantyMonths || !svc.warrantyStartDate) return null
  const d = new Date(svc.warrantyStartDate)
  d.setMonth(d.getMonth() + svc.warrantyMonths)
  return d
}
const isWarrantyActive = (svc) => {
  const exp = warrantyExpires(svc)
  return exp && exp > new Date()
}

export default function CustomerProfile() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [selectedRO, setSelectedRO] = useState(null)
  const [newROOpen, setNewROOpen] = useState(false)
  const [textSent, setTextSent] = useState(false)

  const handleTextCustomer = () => {
    setTextSent(true)
    setTimeout(() => setTextSent(false), 3000)
  }

  const { repairOrders, customers, shops } = useData()
  const customer = customers.find(c => String(c.id) === String(id))
  if (!customer) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="text-4xl font-bold text-text-muted mb-2">404</div>
          <div className="text-sm text-text-muted">Customer not found</div>
          <button onClick={() => navigate('/customers')} className="mt-4 text-xs text-orange hover:underline">
            ← Back to customers
          </button>
        </div>
      </div>
    )
  }

  const customerROs = repairOrders
    .filter(ro => ro.customerId === customer.id)
    .sort((a, b) => new Date(b.updated) - new Date(a.updated))

  const shop = shops.find(s => s.id === customer.shopId)
  const status = STATUS_CONFIG[customer.status] || STATUS_CONFIG.regular

  // Derive unique vehicles from RO history
  const vehicleMap = {}
  customerROs.forEach(ro => {
    if (!vehicleMap[ro.vehicle]) {
      vehicleMap[ro.vehicle] = {
        name: ro.vehicle,
        vin: ro.vin,
        lastService: ro.updated,
        lastOdometer: ro.odometerOut || ro.odometerIn,
        roCount: 0,
        totalSpent: 0,
        activeWarranties: [],
      }
    }
    vehicleMap[ro.vehicle].roCount++
    if (ro.stage === 'Paid') vehicleMap[ro.vehicle].totalSpent += ro.total
    if (new Date(ro.updated) > new Date(vehicleMap[ro.vehicle].lastService)) {
      vehicleMap[ro.vehicle].lastService = ro.updated
      vehicleMap[ro.vehicle].lastOdometer = ro.odometerOut || ro.odometerIn
    }
    // Collect active warranties for this vehicle
    ;(ro.services || []).forEach(svc => {
      if (isWarrantyActive(svc)) {
        vehicleMap[ro.vehicle].activeWarranties.push({ ...svc, roId: ro.id })
      }
    })
  })
  const vehicles = Object.values(vehicleMap)

  const paidROs = customerROs.filter(ro => ro.stage === 'Paid')
  const totalVerified = paidROs.reduce((sum, ro) => sum + ro.total, 0)
  const avgTicket = paidROs.length > 0 ? Math.round(totalVerified / paidROs.length) : 0
  const activeROs = customerROs.filter(ro => !['Paid', 'Invoiced'].includes(ro.stage))

  const initials = customer.name.split(' ').map(n => n[0]).join('').toUpperCase()

  return (
    <div className="p-5 lg:p-6 space-y-6 animate-fade-in">

      {/* Back nav */}
      <button
        onClick={() => navigate('/customers')}
        className="flex items-center gap-1.5 text-xs text-text-muted hover:text-text-primary transition-colors"
      >
        <ArrowLeft size={13} />
        All customers
      </button>

      {/* Hero */}
      <div className="bg-surface border border-border rounded-xl p-6">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-5">
            {/* Avatar */}
            <div className={cn(
              'w-16 h-16 rounded-full flex items-center justify-center flex-shrink-0 text-xl font-bold',
              customer.status === 'vip'     ? 'bg-amber-500/20 text-amber-500' :
              customer.status === 'at-risk' ? 'bg-red-500/10 text-red-500' :
              customer.status === 'new'     ? 'bg-blue-500/10 text-blue-500' :
              'bg-orange/10 text-orange'
            )}>
              {initials}
            </div>

            {/* Name + details */}
            <div>
              <div className="flex items-center gap-2 mb-1">
                <h1 className="text-xl font-semibold text-text-primary">{customer.name}</h1>
                <Badge variant={status.variant}>{status.label}</Badge>
              </div>
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-text-muted">
                {customer.phone && (
                  <span className="flex items-center gap-1.5">
                    <Phone size={11} />
                    {customer.phone}
                  </span>
                )}
                {customer.email && (
                  <span className="flex items-center gap-1.5">
                    <Mail size={11} />
                    {customer.email}
                  </span>
                )}
                {shop && (
                  <span className="flex items-center gap-1.5">
                    <MapPin size={11} />
                    {shop.name}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            <button
              onClick={handleTextCustomer}
              className={cn(
                'flex items-center gap-2 h-8 px-3 rounded-md border text-xs font-medium transition-all duration-150 hover:-translate-y-px',
                textSent
                  ? 'border-green-500/50 text-green-400 bg-green-500/10'
                  : 'border-border text-text-secondary hover:border-orange hover:text-text-primary hover:shadow-[0_0_10px_rgba(249,115,22,0.15)]'
              )}
            >
              {textSent ? <Check size={12} /> : <Phone size={12} />}
              {textSent ? 'Message sent!' : 'Text customer'}
            </button>
            <Button onClick={() => setNewROOpen(true)}>
              <Plus size={13} />
              New RO
            </Button>
          </div>
        </div>

        {/* Stats strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-5 border-t border-border">
          {[
            { icon: Wrench,     label: 'Total Visits',    value: customer.roCount,            format: v => v },
            { icon: TrendingUp, label: 'Lifetime Spend',  value: customer.totalSpent,         format: formatCurrency },
            { icon: Star,       label: 'Avg Ticket',      value: avgTicket,                   format: formatCurrency },
            { icon: Clock,      label: 'Last Visit',      value: customer.lastVisit,          format: v => formatDate(v) },
          ].map(({ icon: Icon, label, value, format }) => (
            <div key={label}>
              <div className="flex items-center gap-1.5 text-2xs text-text-muted uppercase tracking-wider mb-1">
                <Icon size={10} />
                {label}
              </div>
              <div className="text-lg font-semibold text-text-primary tabular-nums">{format(value)}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Body: RO history + sidebar */}
      <div className="grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-5 items-start">

        {/* RO History */}
        <div className="bg-surface border border-border rounded-xl overflow-hidden">
          <div className="px-5 py-3.5 border-b border-border flex items-center justify-between">
            <div className="text-sm font-semibold text-text-primary">Repair History</div>
            {activeROs.length > 0 && (
              <span className="text-2xs px-2 py-0.5 rounded-full bg-orange/10 text-orange font-medium">
                {activeROs.length} active
              </span>
            )}
          </div>

          {customerROs.length === 0 ? (
            <div className="py-16 text-center">
              <Wrench size={24} className="text-text-muted mx-auto mb-3" />
              <p className="text-sm text-text-muted">No repair orders yet.</p>
              <button onClick={() => setNewROOpen(true)} className="mt-2 text-xs text-orange hover:underline">
                Create first RO →
              </button>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {customerROs.map(ro => (
                <button
                  key={ro.id}
                  onClick={() => setSelectedRO(ro)}
                  className="w-full text-left px-5 py-4 hover:bg-background transition-colors duration-100 group"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 min-w-0">
                      {/* RO number */}
                      <div className="flex-shrink-0 pt-0.5">
                        <div className="text-xs font-mono text-orange">{ro.id}</div>
                        <div className="text-2xs text-text-muted mt-0.5">{formatDate(ro.updated)}</div>
                      </div>

                      {/* Details */}
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-sm font-medium text-text-primary truncate">{ro.vehicle}</span>
                          <StageBadge stage={ro.stage} />
                        </div>
                        <div className="text-xs text-text-muted truncate">{ro.complaint}</div>
                        {ro.services?.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1.5">
                            {ro.services.slice(0, 3).map((svc, i) => (
                              <span
                                key={i}
                                className={cn(
                                  'text-2xs px-1.5 py-0.5 rounded font-medium inline-flex items-center gap-1',
                                  isWarrantyActive(svc)
                                    ? 'bg-status-green/10 text-status-green border border-status-green/20'
                                    : 'bg-border text-text-muted'
                                )}
                              >
                                {isWarrantyActive(svc) && <Shield size={8} />}
                                {svc.name}
                              </span>
                            ))}
                            {ro.services.length > 3 && (
                              <span className="text-2xs px-1.5 py-0.5 rounded bg-border text-text-muted">
                                +{ro.services.length - 3} more
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Right: total + payment */}
                    <div className="flex-shrink-0 text-right">
                      {ro.total > 0 ? (
                        <div className="text-sm font-semibold text-text-primary tabular-nums">
                          {formatCurrency(ro.total)}
                        </div>
                      ) : (
                        <div className="text-xs text-text-muted">Pending</div>
                      )}
                      {ro.payment && (
                        <div className="text-2xs text-status-green mt-0.5">
                          ✓ {METHOD_LABELS[ro.payment.method]}
                        </div>
                      )}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-4">

          {/* Vehicles */}
          <div className="bg-surface border border-border rounded-xl overflow-hidden">
            <div className="px-5 py-3.5 border-b border-border">
              <div className="text-sm font-semibold text-text-primary">Vehicles</div>
            </div>
            {vehicles.length === 0 ? (
              <div className="px-5 py-6 text-sm text-text-muted text-center">No vehicles on record</div>
            ) : (
              <div className="divide-y divide-border">
                {vehicles.map(v => (
                  <div key={v.name} className="px-5 py-3.5">
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-md bg-border flex items-center justify-center flex-shrink-0 mt-0.5">
                        <Car size={14} className="text-text-muted" />
                      </div>
                      <div className="min-w-0">
                        <div className="text-sm font-medium text-text-primary leading-snug">{v.name}</div>
                        {v.vin && (
                          <div className="text-2xs font-mono text-text-muted mt-0.5 tracking-wide">{v.vin}</div>
                        )}
                        <div className="flex gap-3 mt-1">
                          {v.lastOdometer && (
                            <span className="text-2xs text-text-muted">{v.lastOdometer.toLocaleString()} mi</span>
                          )}
                          <span className="text-2xs text-text-muted">{v.roCount} visit{v.roCount !== 1 ? 's' : ''}</span>
                        </div>
                        {v.activeWarranties.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {v.activeWarranties.map((svc, idx) => {
                              const exp = warrantyExpires(svc)
                              return (
                                <span
                                  key={idx}
                                  title={`Expires ${exp?.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`}
                                  className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded bg-status-green/10 text-status-green border border-status-green/20 font-medium"
                                >
                                  <Shield size={8} />
                                  {svc.name}
                                </span>
                              )
                            })}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Quick actions */}
          <div className="bg-surface border border-border rounded-xl p-4 space-y-2">
            <div className="text-2xs font-medium text-text-muted uppercase tracking-wider mb-3">Quick Actions</div>
            <button
              onClick={() => setNewROOpen(true)}
              className="w-full flex items-center gap-3 p-3 rounded-lg border border-border hover:border-orange hover:text-text-primary transition-all duration-150 hover:-translate-y-px hover:shadow-[0_0_10px_rgba(249,115,22,0.15)] text-left"
            >
              <div className="w-7 h-7 rounded-md bg-orange/10 flex items-center justify-center flex-shrink-0">
                <Plus size={13} className="text-orange" />
              </div>
              <div>
                <div className="text-sm font-medium text-text-primary leading-tight">New repair order</div>
                <div className="text-2xs text-text-muted">Start a new job for this customer</div>
              </div>
            </button>
            <button
              onClick={handleTextCustomer}
              className={cn(
                'w-full flex items-center gap-3 p-3 rounded-lg border transition-all duration-150 hover:-translate-y-px text-left',
                textSent
                  ? 'border-green-500/50 bg-green-500/10'
                  : 'border-border hover:border-orange hover:text-text-primary hover:shadow-[0_0_10px_rgba(249,115,22,0.15)]'
              )}
            >
              <div className={cn(
                'w-7 h-7 rounded-md flex items-center justify-center flex-shrink-0',
                textSent ? 'bg-green-500/15' : 'bg-border'
              )}>
                {textSent
                  ? <Check size={13} className="text-green-400" />
                  : <Phone size={13} className="text-text-muted" />
                }
              </div>
              <div>
                <div className={cn('text-sm font-medium leading-tight', textSent ? 'text-green-400' : 'text-text-primary')}>
                  {textSent ? 'Message sent!' : 'Text customer'}
                </div>
                <div className="text-2xs text-text-muted">{customer.phone}</div>
              </div>
            </button>
          </div>

        </div>
      </div>

      {/* Modals */}
      {selectedRO && (
        <RODetailModal
          key={selectedRO?.id}
          open={!!selectedRO}
          onClose={() => setSelectedRO(null)}
          ro={selectedRO}
        />
      )}
      <NewROModal
        open={newROOpen}
        onClose={() => setNewROOpen(false)}
        preShopId={customer.shopId}
        preCustomerName={customer.name}
        preCustomerPhone={customer.phone}
      />
    </div>
  )
}
