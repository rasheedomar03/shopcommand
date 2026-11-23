import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Phone, Mail, MapPin, Plus, Star, Clock, TrendingUp, Wrench, Car, Shield, Trash2, Pencil } from 'lucide-react'
import { useData } from '@/contexts/DataContext'
import { useAuth } from '@/contexts/AuthContext'
import { Modal } from '@/components/ui/Modal'
import { Badge, StageBadge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { CustomerCredit } from '@/components/CustomerCredit'
import { CustomerInvoices } from '@/components/CustomerInvoices'
import { useCustomerTrucks } from '@/lib/useCustomerTrucks'
import { truckName } from '@/lib/trucks'
import { RODetailModal } from '@/components/modals/RODetailModal'
import { NewROModal } from '@/components/modals/NewROModal'
import { formatCurrency, formatMoney, formatDate, formatRelativeTime, roLabel } from '@/lib/utils'
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
  const [editingEmail, setEditingEmail] = useState(false)
  const [emailDraft, setEmailDraft] = useState('')
  const [emailSaving, setEmailSaving] = useState(false)
  const [emailErr, setEmailErr] = useState(null)
  const [delOpen, setDelOpen] = useState(false)
  const [delInfo, setDelInfo] = useState(null)
  const [delText, setDelText] = useState('')
  const [delBusy, setDelBusy] = useState(false)
  const [delErr, setDelErr] = useState(null)
  const [delBlocked, setDelBlocked] = useState(null)
  const [editOpen, setEditOpen] = useState(false)
  const [editForm, setEditForm] = useState({ name: '', phone: '', address: '', notes: '' })
  const [editBusy, setEditBusy] = useState(false)
  const [editErr, setEditErr] = useState(null)

  const { repairOrders, customers, shops, updateCustomer, removeCustomer } = useData()
  const { session } = useAuth()
  const isOwner = session?.role === 'owner'
  const customer = customers.find(c => String(c.id) === String(id))
  // The trucks and vehicles saved for this customer (from invoices and the Fleet page),
  // not only the ones that came through a repair order
  const { trucks: savedTrucks } = useCustomerTrucks(customer?.id, { demo: !!session?.demo })
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
  // Add the saved trucks: fill in the truck number on one a repair order already
  // showed (matched by VIN or by name), otherwise list it as its own vehicle
  savedTrucks.forEach(t => {
    const name = truckName(t) || (t.unitNumber ? `Truck ${t.unitNumber}` : 'Vehicle')
    const known = Object.values(vehicleMap).find(v => (t.vin && v.vin === t.vin) || v.name === name)
    if (known) {
      known.unitNumber = known.unitNumber || t.unitNumber
      known.vin = known.vin || t.vin
      known.lastOdometer = known.lastOdometer || t.mileage
    } else {
      vehicleMap[`truck:${t.id}`] = { name, vin: t.vin, unitNumber: t.unitNumber, lastOdometer: t.mileage, roCount: 0, totalSpent: 0, activeWarranties: [] }
    }
  })
  const vehicles = Object.values(vehicleMap)

  const paidROs = customerROs.filter(ro => ro.stage === 'Paid')
  const totalVerified = paidROs.reduce((sum, ro) => sum + ro.total, 0)
  const avgTicket = paidROs.length > 0 ? Math.round(totalVerified / paidROs.length) : 0
  const activeROs = customerROs.filter(ro => !['Paid', 'Invoiced'].includes(ro.stage))

  // Work this customer declined — follow-up opportunities
  const declinedServices = customerROs.flatMap(ro =>
    (ro.declinedServices || []).map(s => ({ ...s, vehicle: ro.vehicle, roId: ro.id, when: s.declinedAt || ro.updated || ro.created }))
  )
  const declinedTotal = declinedServices.reduce((sum, s) => sum + (s.price || 0), 0)

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
                {editingEmail ? (
                  <span className="flex items-center gap-1.5">
                    <Mail size={11} />
                    <input
                      autoFocus
                      type="email"
                      value={emailDraft}
                      onChange={e => setEmailDraft(e.target.value)}
                      onKeyDown={async (e) => {
                        if (e.key === 'Escape') { setEditingEmail(false); setEmailErr(null) }
                        if (e.key === 'Enter') {
                          e.preventDefault()
                          setEmailSaving(true)
                          setEmailErr(null)
                          try {
                            await updateCustomer(customer.id, { email: emailDraft.trim() })
                            setEditingEmail(false)
                          } catch (err) {
                            setEmailErr(err.message || 'Could not save')
                          }
                          setEmailSaving(false)
                        }
                      }}
                      placeholder="customer@email.com"
                      disabled={emailSaving}
                      className="h-6 w-48 px-1.5 rounded border border-border bg-background text-xs text-text-primary focus:outline-none focus:border-orange"
                    />
                    <span className="text-2xs text-text-muted">{emailSaving ? 'Saving…' : 'Enter to save · Esc to cancel'}</span>
                    {emailErr && <span className="text-2xs text-status-red">{emailErr}</span>}
                  </span>
                ) : customer.email ? (
                  <button
                    onClick={() => { setEmailDraft(customer.email); setEditingEmail(true) }}
                    title="Edit email"
                    className="flex items-center gap-1.5 hover:text-text-primary transition-colors"
                  >
                    <Mail size={11} />
                    {customer.email}
                  </button>
                ) : (
                  <button
                    onClick={() => { setEmailDraft(''); setEditingEmail(true) }}
                    className="flex items-center gap-1.5 text-orange hover:underline underline-offset-2"
                  >
                    <Mail size={11} />
                    Add email
                  </button>
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
              disabled
              title="SMS coming soon"
              className="flex items-center gap-2 h-8 px-3 rounded-md border border-border text-xs font-medium text-text-muted opacity-60 cursor-not-allowed"
            >
              <Phone size={12} />
              Text customer
              <span className="text-2xs text-text-muted">· SMS coming soon</span>
            </button>
            <Button onClick={() => setNewROOpen(true)}>
              <Plus size={13} />
              New RO
            </Button>
            <Button
              variant="secondary"
              onClick={() => {
                setEditErr(null)
                setEditForm({ name: customer.name || '', phone: customer.phone || '', address: customer.address || '', notes: customer.notes || '' })
                setEditOpen(true)
              }}
            >
              <Pencil size={13} />
              Edit details
            </Button>
            {isOwner && (
              <Button variant="secondary" onClick={() => { setDelErr(null); setDelInfo(null); setDelBlocked(null); setDelText(''); setDelOpen(true) }}>
                <Trash2 size={13} />
                Delete customer
              </Button>
            )}
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

        <div className="space-y-5 min-w-0">
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
                        <div className="text-xs font-mono text-orange">{roLabel(ro)}</div>
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
                          {formatMoney(ro.total)}
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

        <CustomerInvoices customer={customer} />
        </div>

        {/* Sidebar */}
        <div className="space-y-4">

          <CustomerCredit customer={customer} canEdit={session?.role !== 'tech'} shopName={shops?.[0]?.name} />

          {/* Vehicles */}
          <div className="bg-surface border border-border rounded-xl overflow-hidden">
            <div className="px-5 py-3.5 border-b border-border">
              <div className="text-sm font-semibold text-text-primary">Vehicles</div>
            </div>
            {vehicles.length === 0 ? (
              <div className="px-5 py-6 text-sm text-text-muted text-center">No vehicles on record</div>
            ) : (
              <div className="divide-y divide-border">
                {vehicles.map((v, vi) => (
                  <div key={`${v.name}-${vi}`} className="px-5 py-3.5">
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-md bg-border flex items-center justify-center flex-shrink-0 mt-0.5">
                        <Car size={14} className="text-text-muted" />
                      </div>
                      <div className="min-w-0">
                        <div className="text-sm font-medium text-text-primary leading-snug">{v.name}</div>
                        {v.unitNumber && (
                          <div className="text-2xs text-text-secondary mt-0.5">Truck # {v.unitNumber}</div>
                        )}
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

          {/* Declined work — follow-up opportunities */}
          {declinedServices.length > 0 && (
            <div className="bg-surface border border-status-red/25 rounded-xl overflow-hidden">
              <div className="px-5 py-3.5 border-b border-border flex items-center justify-between">
                <div className="text-sm font-semibold text-text-primary">Declined Work</div>
                <span className="text-xs font-semibold text-status-red tabular-nums">{formatCurrency(declinedTotal)}</span>
              </div>
              <div className="divide-y divide-border">
                {declinedServices.map((s, i) => (
                  <div key={i} className="px-5 py-3">
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <div className="text-sm text-text-primary leading-snug">{s.name}</div>
                        <div className="text-2xs text-text-muted mt-0.5">{s.vehicle} · {formatDate(s.when)}</div>
                      </div>
                      <span className="text-sm font-medium text-text-secondary tabular-nums flex-shrink-0">{formatMoney(s.price)}</span>
                    </div>
                  </div>
                ))}
              </div>
              <div className="px-5 py-3 border-t border-border bg-status-red/5">
                <div className="text-2xs text-text-muted">
                  Deferred maintenance this customer said no to — worth a follow-up call.
                </div>
              </div>
            </div>
          )}

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
              disabled
              title="SMS coming soon"
              className="w-full flex items-center gap-3 p-3 rounded-lg border border-border text-left opacity-60 cursor-not-allowed"
            >
              <div className="w-7 h-7 rounded-md bg-border flex items-center justify-center flex-shrink-0">
                <Phone size={13} className="text-text-muted" />
              </div>
              <div>
                <div className="text-sm font-medium leading-tight text-text-primary">Text customer</div>
                <div className="text-2xs text-text-muted">{customer.phone} · SMS coming soon</div>
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
      {/* Delete customer: a simple confirmation, then a typed one if they have history */}
      <Modal open={delOpen} onClose={() => !delBusy && setDelOpen(false)} title={`Delete ${customer.name}?`} size="sm">
        <div className="p-5 space-y-4">
          {delBlocked ? (
            <div className="rounded-lg border border-status-red/30 bg-status-red/5 px-3 py-2.5 text-sm text-text-primary space-y-1">
              <p className="font-semibold text-status-red">This customer can't be deleted.</p>
              <p className="text-xs text-text-secondary">{delBlocked}</p>
            </div>
          ) : !delInfo ? (
            <p className="text-sm text-text-secondary">
              This removes {customer.name} from your customers. This cannot be undone.
            </p>
          ) : (
            <>
              <div className="rounded-lg border border-status-red/30 bg-status-red/5 px-3 py-2.5 text-sm text-text-primary space-y-1">
                <p className="font-semibold text-status-red">{customer.name} has history that will be erased too:</p>
                <ul className="list-disc pl-5 text-xs text-text-secondary">
                  <li>{delInfo.repairOrders} repair order{delInfo.repairOrders === 1 ? '' : 's'}</li>
                  {delInfo.vehicles > 0 && <li>{delInfo.vehicles} vehicle{delInfo.vehicles === 1 ? '' : 's'}</li>}
                </ul>
                <p className="text-xs text-text-muted">Invoices are never deleted with a customer, and this customer has none.</p>
              </div>
              <div>
                <label htmlFor="sc-del-confirm" className="block text-xs text-text-secondary mb-1">Type DELETE to confirm</label>
                <input
                  id="sc-del-confirm"
                  value={delText}
                  onChange={e => setDelText(e.target.value)}
                  autoComplete="off"
                  className="w-full h-9 px-3 rounded-lg border border-border bg-background text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-status-red/50"
                />
              </div>
            </>
          )}
          {delErr && <p className="text-xs text-status-red">{delErr}</p>}
          <div className="flex justify-end gap-2">
            <Button variant="secondary" size="sm" onClick={() => setDelOpen(false)} disabled={delBusy}>{delBlocked ? 'Close' : 'Cancel'}</Button>
            {!delBlocked && <Button
              size="sm"
              disabled={delBusy || (delInfo && delText !== 'DELETE')}
              onClick={async () => {
                setDelBusy(true)
                setDelErr(null)
                try {
                  await removeCustomer(customer.id, { force: !!delInfo })
                  setDelOpen(false)
                  navigate('/customers', { replace: true })
                } catch (err) {
                  if (err?.data?.code === 'has_invoices') setDelBlocked(err.message)
                  else if (err?.data?.code === 'has_history') setDelInfo(err.data)
                  else setDelErr(err?.message || 'Could not delete the customer')
                }
                setDelBusy(false)
              }}
            >
              {delBusy ? 'Deleting...' : delInfo ? 'Delete customer and repair orders' : 'Delete customer'}
            </Button>}
          </div>
        </div>
      </Modal>

      {/* Edit customer details (the email is edited inline in the header) */}
      <Modal open={editOpen} onClose={() => !editBusy && setEditOpen(false)} title="Edit customer details" size="sm">
        <div className="p-5 space-y-3">
          {[
            ['name', 'Name or company', 'text'],
            ['phone', 'Phone', 'tel'],
            ['address', 'Address', 'text'],
          ].map(([key, label, type]) => (
            <div key={key}>
              <label htmlFor={`sc-cust-${key}`} className="block text-xs text-text-secondary mb-1">{label}</label>
              <input
                id={`sc-cust-${key}`}
                type={type}
                value={editForm[key]}
                onChange={e => setEditForm(f => ({ ...f, [key]: e.target.value }))}
                maxLength={key === 'address' ? 300 : 100}
                className="w-full h-9 px-3 rounded-lg border border-border bg-background text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-orange/40"
              />
            </div>
          ))}
          <div>
            <label htmlFor="sc-cust-notes" className="block text-xs text-text-secondary mb-1">Notes</label>
            <textarea
              id="sc-cust-notes"
              value={editForm.notes}
              onChange={e => setEditForm(f => ({ ...f, notes: e.target.value }))}
              maxLength={2000}
              rows={3}
              className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-orange/40"
            />
          </div>
          {editErr && <p className="text-xs text-status-red">{editErr}</p>}
          <div className="flex justify-end gap-2 pt-1">
            <Button variant="secondary" size="sm" onClick={() => setEditOpen(false)} disabled={editBusy}>Cancel</Button>
            <Button
              size="sm"
              disabled={editBusy || editForm.name.trim().length < 2}
              onClick={async () => {
                setEditBusy(true)
                setEditErr(null)
                try {
                  await updateCustomer(customer.id, {
                    name: editForm.name.trim(),
                    phone: editForm.phone.trim(),
                    address: editForm.address.trim(),
                    notes: editForm.notes.trim(),
                  })
                  setEditOpen(false)
                } catch (err) {
                  setEditErr(err?.message || 'Could not save')
                }
                setEditBusy(false)
              }}
            >
              {editBusy ? 'Saving...' : 'Save'}
            </Button>
          </div>
        </div>
      </Modal>
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
