import { useState, useRef } from 'react'
import { Search, AlertTriangle, Package, ShoppingCart, Check, Plus, Pencil, Trash2, X, Truck, ExternalLink, ChevronDown } from 'lucide-react'
import { useData } from '@/contexts/DataContext'
import { useAuth } from '@/contexts/AuthContext'
import { Table, Thead, Th, Tbody, Tr, Td } from '@/components/ui/Table'
import { formatCurrency, formatDate } from '@/lib/utils'
import { cn } from '@/lib/utils'

const PART_STATUS = {
  requested: { label: 'Requested', color: 'text-text-muted',    bg: 'bg-border' },
  ordered:   { label: 'Ordered',   color: 'text-orange',        bg: 'bg-orange/10' },
  shipped:   { label: 'In Transit',color: 'text-blue-400',      bg: 'bg-blue-500/10' },
  arrived:   { label: 'Arrived',   color: 'text-status-yellow', bg: 'bg-status-yellow/10' },
  ready:     { label: 'Ready ✓',   color: 'text-status-green',  bg: 'bg-status-green/10' },
}

const STATUS_NEXT = { requested: null, ordered: 'shipped', shipped: 'arrived', arrived: 'ready', ready: null }
const STATUS_NEXT_LABEL = { ordered: 'Mark Shipped', shipped: 'Mark Arrived', arrived: 'Mark Ready' }

function daysAgo(dateStr) {
  if (!dateStr) return null
  const diff = (Date.now() - new Date(dateStr).getTime()) / (1000 * 60 * 60 * 24)
  return Math.floor(diff)
}

function getAgeLabel(days) {
  if (days === null) return null
  if (days === 0) return 'Today'
  if (days === 1) return '1 day ago'
  return `${days} days ago`
}

function getAgeSeverity(days, status) {
  if (days === null || status === 'ready' || status === 'arrived') return 'normal'
  if (status === 'ordered' && days >= 5) return 'overdue'
  if (status === 'ordered' && days >= 3) return 'warning'
  if (status === 'shipped' && days >= 5) return 'overdue'
  if (status === 'shipped' && days >= 3) return 'warning'
  return 'normal'
}

function getTrackingUrl(carrier, trackingNumber) {
  if (!trackingNumber) return null
  const map = {
    UPS:   `https://www.ups.com/track?tracknum=${trackingNumber}`,
    FedEx: `https://www.fedex.com/fedextrack/?tracknums=${trackingNumber}`,
    USPS:  `https://tools.usps.com/go/TrackConfirmAction?tLabels=${trackingNumber}`,
  }
  return map[carrier] || null
}

const STATUS_DOTS = {
  requested: 'bg-text-muted',
  ordered:   'bg-orange',
  shipped:   'bg-blue-400',
  arrived:   'bg-status-yellow',
  ready:     'bg-status-green',
}

function StatusDropdown({ value, onChange }) {
  const [open, setOpen] = useState(false)
  const [menuPos, setMenuPos] = useState({ top: 0, right: 0 })
  const btnRef = useRef(null)
  const cfg = PART_STATUS[value] || PART_STATUS.requested

  const handleOpen = () => {
    if (btnRef.current) {
      const rect = btnRef.current.getBoundingClientRect()
      setMenuPos({ top: rect.bottom + 6, right: window.innerWidth - rect.right })
    }
    setOpen(v => !v)
  }

  return (
    <>
      {open && <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />}
      <button
        ref={btnRef}
        onClick={handleOpen}
        className={cn(
          'flex items-center gap-1.5 px-2.5 py-1 rounded-full text-2xs font-semibold border transition-all duration-150 hover:brightness-110',
          cfg.bg, cfg.color, 'border-current/20'
        )}
      >
        <span className={cn('w-1.5 h-1.5 rounded-full flex-shrink-0', STATUS_DOTS[value])} />
        {cfg.label}
        <ChevronDown size={10} className={cn('transition-transform duration-150', open && 'rotate-180')} />
      </button>
      {open && (
        <div
          style={{ position: 'fixed', top: menuPos.top, right: menuPos.right }}
          className="z-50 w-40 bg-surface border border-border rounded-lg shadow-xl overflow-hidden"
        >
          {Object.entries(PART_STATUS).map(([val, s]) => (
            <button
              key={val}
              onClick={() => { onChange(val); setOpen(false) }}
              className={cn(
                'w-full flex items-center gap-2.5 px-3 py-2.5 text-xs transition-colors text-left',
                val === value ? cn(s.bg, s.color, 'font-semibold') : 'text-text-secondary hover:bg-background'
              )}
            >
              <span className={cn('w-2 h-2 rounded-full flex-shrink-0', STATUS_DOTS[val])} />
              {s.label}
              {val === value && <Check size={11} className="ml-auto flex-shrink-0" />}
            </button>
          ))}
        </div>
      )}
    </>
  )
}

const CATEGORIES = ['Brakes', 'Cooling', 'Electrical', 'Engine', 'Exhaust', 'Filters', 'Fluids', 'Ignition', 'Suspension', 'Tires', 'Transmission', 'Other']

const BLANK_PART = { name: '', sku: '', category: 'Engine', vendor: '', qty: 0, minQty: 2, cost: '', price: '', shopId: '' }

function PartModal({ part, shops, onSave, onClose }) {
  const isNew = !part.id
  const [form, setForm] = useState({
    name:     part.name     || '',
    sku:      part.sku      || '',
    category: part.category || 'Engine',
    vendor:   part.vendor   || '',
    qty:      part.qty      ?? 0,
    minQty:   part.minQty   ?? 2,
    cost:     part.cost     || '',
    price:    part.price    || '',
    shopId:   part.shopId   || '',
  })
  const [errors, setErrors] = useState({})

  const set = f => e => setForm(p => ({ ...p, [f]: e.target.value }))

  const validate = () => {
    const e = {}
    if (!form.name.trim())  e.name  = 'Required'
    if (!form.sku.trim())   e.sku   = 'Required'
    if (!form.shopId)       e.shopId = 'Select a shop'
    if (form.price === '' || isNaN(Number(form.price))) e.price = 'Enter a number'
    return e
  }

  const handleSave = () => {
    const e = validate()
    if (Object.keys(e).length) { setErrors(e); return }
    onSave({
      ...part,
      ...form,
      qty:    Number(form.qty)    || 0,
      minQty: Number(form.minQty) || 0,
      cost:   Number(form.cost)   || 0,
      price:  Number(form.price)  || 0,
      shopId: Number(form.shopId),
    })
  }

  const field = (label, key, props = {}) => (
    <div>
      <label className="block text-xs font-medium text-text-secondary mb-1">{label}</label>
      <input
        value={form[key]}
        onChange={set(key)}
        className={cn(
          'w-full h-9 rounded-lg border bg-surface px-3 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-1 focus:border-orange focus:ring-orange/20 transition-colors',
          errors[key] ? 'border-red-500' : 'border-border'
        )}
        {...props}
      />
      {errors[key] && <p className="text-xs text-red-500 mt-1">{errors[key]}</p>}
    </div>
  )

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative bg-surface border border-border rounded-xl shadow-2xl w-full max-w-lg">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <h2 className="text-sm font-semibold text-text-primary">{isNew ? 'Add Part' : 'Edit Part'}</h2>
          <button onClick={onClose} className="text-text-muted hover:text-text-primary transition-colors"><X size={16} /></button>
        </div>
        <div className="p-5 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            {field('Part Name *', 'name', { placeholder: 'NGK Iridium Spark Plug' })}
            {field('SKU *', 'sku', { placeholder: 'NGK-IZFR6K11', className: 'font-mono' })}
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1">Category</label>
              <select value={form.category} onChange={set('category')} className="w-full h-9 rounded-lg border border-border bg-surface px-3 text-sm text-text-primary focus:outline-none focus:border-orange [&>option]:bg-surface">
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1">Shop *</label>
              <select value={form.shopId} onChange={set('shopId')} className={cn('w-full h-9 rounded-lg border bg-surface px-3 text-sm text-text-primary focus:outline-none focus:border-orange [&>option]:bg-surface', errors.shopId ? 'border-red-500' : 'border-border')}>
                <option value="">Select shop…</option>
                {shops.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
              {errors.shopId && <p className="text-xs text-red-500 mt-1">{errors.shopId}</p>}
            </div>
          </div>
          {field('Vendor / Supplier', 'vendor', { placeholder: 'NGK Spark Plugs' })}
          <div className="grid grid-cols-4 gap-3">
            {field('Qty', 'qty', { type: 'number', min: '0' })}
            {field('Min Qty', 'minQty', { type: 'number', min: '0' })}
            {field('Cost ($)', 'cost', { type: 'number', min: '0', step: '0.01', placeholder: '0.00' })}
            {field('Price ($) *', 'price', { type: 'number', min: '0', step: '0.01', placeholder: '0.00' })}
          </div>
        </div>
        <div className="flex justify-end gap-3 px-5 py-4 border-t border-border bg-background/50 rounded-b-xl">
          <button onClick={onClose} className="h-9 px-4 rounded-lg border border-border text-sm text-text-muted hover:text-text-primary transition-colors">Cancel</button>
          <button onClick={handleSave} className="h-9 px-4 rounded-lg bg-orange text-white text-sm font-semibold hover:bg-orange/90 transition-colors">
            {isNew ? 'Add Part' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  )
}

function QtyCell({ part, onUpdate }) {
  const [editing, setEditing] = useState(false)
  const [val, setVal] = useState(String(part.qty))

  const commit = () => {
    const n = parseInt(val, 10)
    if (!isNaN(n) && n >= 0 && n !== part.qty) onUpdate(n)
    setEditing(false)
  }

  if (editing) {
    return (
      <input
        autoFocus
        type="number"
        min="0"
        value={val}
        onChange={e => setVal(e.target.value)}
        onBlur={commit}
        onKeyDown={e => { if (e.key === 'Enter') commit(); if (e.key === 'Escape') setEditing(false) }}
        className="w-14 h-7 rounded border border-orange bg-surface px-2 text-xs text-text-primary text-center focus:outline-none tabular-nums"
      />
    )
  }

  return (
    <button
      onClick={() => { setVal(String(part.qty)); setEditing(true) }}
      title="Click to adjust quantity"
      className={cn(
        'tabular-nums font-medium hover:underline decoration-dashed underline-offset-2 cursor-pointer transition-colors',
        part.qty <= part.minQty ? 'text-status-red' : 'text-text-primary'
      )}
    >
      {part.qty}
    </button>
  )
}

export default function Parts() {
  const { parts, shops, addPart, updatePart, deletePart, orderPart, repairOrders, updateRepairOrder, addNotification } = useData()
  const { session } = useAuth()
  const isAdvisor = session?.role === 'advisor'

  const [search, setSearch] = useState('')
  const [shopFilter, setShopFilter] = useState('All')
  const [stockFilter, setStockFilter] = useState('All')
  const [orderedIds, setOrderedIds] = useState(new Set())
  const [modalPart, setModalPart] = useState(null)
  const [confirmDelete, setConfirmDelete] = useState(null)
  const [orderStatusFilter, setOrderStatusFilter] = useState('active') // 'active' | 'all' | specific status
  const [ordersExpanded, setOrdersExpanded] = useState(true)
  const [editingTrackingId, setEditingTrackingId] = useState(null)
  const [trackingDraft, setTrackingDraft] = useState({ supplier: '', eta: '', carrier: '', trackingNumber: '' })
  const [confirmDeleteOrderId, setConfirmDeleteOrderId] = useState(null)

  // Aggregate all parts requests from scoped ROs
  const scopedROs = isAdvisor
    ? repairOrders.filter(ro => ro.shopId === session.shopId)
    : repairOrders
  const allOrders = scopedROs
    .flatMap(ro => (ro.partsRequests || []).map(req => ({ ...req, ro })))
    .sort((a, b) => new Date(b.requestedAt) - new Date(a.requestedAt))
  const activeOrders = allOrders.filter(o => o.status !== 'ready')
  const displayedOrders = orderStatusFilter === 'active'
    ? activeOrders
    : orderStatusFilter === 'all'
      ? allOrders
      : allOrders.filter(o => o.status === orderStatusFilter)
  const orderCounts = ['requested','ordered','shipped','arrived','ready'].reduce((acc, s) => {
    acc[s] = allOrders.filter(o => o.status === s).length; return acc
  }, {})

  const advanceOrder = (req, ro, newStatus) => {
    const updated = (ro.partsRequests || []).map(r => r.id === req.id ? { ...r, status: newStatus } : r)
    updateRepairOrder(ro.id, { partsRequests: updated })
    addNotification({
      type: 'part_status',
      status: newStatus,
      partName: req.name,
      roId: ro.id,
      vehicle: ro.vehicle,
      customerName: ro.customerName,
      shopId: ro.shopId,
    })
  }
  const saveTracking = (req, ro) => {
    const isFirstOrder = req.status === 'requested' && trackingDraft.supplier.trim()
    const updated = (ro.partsRequests || []).map(r =>
      r.id === req.id ? {
        ...r,
        supplier: trackingDraft.supplier,
        eta: trackingDraft.eta,
        carrier: trackingDraft.carrier,
        trackingNumber: trackingDraft.trackingNumber,
        status: isFirstOrder ? 'ordered' : r.status,
      } : r
    )
    updateRepairOrder(ro.id, { partsRequests: updated })
    if (isFirstOrder) {
      addNotification({
        type: 'part_status',
        status: 'ordered',
        partName: req.name,
        roId: ro.id,
        vehicle: ro.vehicle,
        customerName: ro.customerName,
        shopId: ro.shopId,
      })
    }
    setEditingTrackingId(null)
  }

  const handleOrder = (partId) => {
    orderPart(partId)
    setOrderedIds(prev => new Set(prev).add(partId))
    setTimeout(() => setOrderedIds(prev => { const next = new Set(prev); next.delete(partId); return next }), 3000)
  }

  const handleSave = (data) => {
    if (data.id) updatePart(data.id, data)
    else addPart(data)
    setModalPart(null)
  }

  const scopedParts = isAdvisor ? parts.filter(p => p.shopId === session.shopId) : parts
  const scopedShops = isAdvisor ? shops.filter(s => s.id === session.shopId) : shops

  const filtered = scopedParts.filter(p => {
    const q = search.toLowerCase()
    const matchSearch = !q || p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q) || p.category.toLowerCase().includes(q)
    const matchShop = isAdvisor || shopFilter === 'All' || String(p.shopId) === String(shopFilter)
    const matchStock = stockFilter === 'All'
      || (stockFilter === 'low' && p.qty <= p.minQty && p.qty > 0)
      || (stockFilter === 'out' && p.qty === 0)
      || (stockFilter === 'ok' && p.qty > p.minQty)
    return matchSearch && matchShop && matchStock
  })

  const lowStockCount = scopedParts.filter(p => p.qty <= p.minQty).length
  const outCount      = scopedParts.filter(p => p.qty === 0).length
  const overdueCount  = allOrders.filter(o => {
    const days = daysAgo(o.requestedAt)
    return days !== null && days >= 3 && (o.status === 'ordered' || o.status === 'shipped')
  }).length

  const getStockStatus = (p) => {
    if (p.qty === 0) return { label: 'Out of Stock', dot: 'bg-status-red',    text: 'text-status-red'    }
    if (p.qty <= p.minQty) return { label: 'Low Stock',    dot: 'bg-status-yellow', text: 'text-status-yellow' }
    return               { label: 'In Stock',     dot: 'bg-status-green',  text: 'text-status-green'  }
  }

  const defaultNewPart = isAdvisor
    ? { ...BLANK_PART, shopId: session.shopId }
    : BLANK_PART

  return (
    <div className="p-5 lg:p-6 space-y-5 animate-fade-in">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-semibold text-text-primary">Parts Inventory</h1>
          <p className="text-xs text-text-muted mt-0.5">{scopedParts.length} SKUs tracked</p>
        </div>
        <button
          onClick={() => setModalPart(defaultNewPart)}
          className="flex items-center gap-2 h-9 px-4 rounded-lg bg-orange text-white text-sm font-semibold hover:bg-orange/90 active:scale-[0.98] transition-all duration-150"
        >
          <Plus size={14} /> Add Part
        </button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-surface border border-border rounded-lg px-4 py-3">
          <div className="text-xs text-text-muted uppercase tracking-wider mb-1">Total SKUs</div>
          <div className="text-xl font-semibold text-text-primary tabular-nums">{scopedParts.length}</div>
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
        <div className={cn('bg-surface border rounded-lg px-4 py-3', overdueCount > 0 ? 'border-status-red/40' : 'border-border')}>
          <div className="text-xs text-text-muted uppercase tracking-wider mb-1 flex items-center gap-1">
            {overdueCount > 0 && <Truck size={11} className="text-status-red" />}
            Parts Overdue
          </div>
          <div className={cn('text-xl font-semibold tabular-nums', overdueCount > 0 ? 'text-status-red' : 'text-text-primary')}>{overdueCount}</div>
        </div>
      </div>

      {/* Parts Orders */}
      <div className="bg-surface border border-border rounded-xl overflow-hidden">
        {/* Section header */}
        <button
          onClick={() => setOrdersExpanded(e => !e)}
          className="w-full flex items-center justify-between px-5 py-3.5 hover:bg-background/50 transition-colors"
        >
          <div className="flex items-center gap-3">
            <Truck size={15} className="text-text-muted" />
            <span className="text-sm font-semibold text-text-primary">Parts Orders</span>
            {activeOrders.length > 0 && (
              <span className="text-2xs px-2 py-0.5 rounded-full bg-orange/10 text-orange font-medium">
                {activeOrders.length} active
              </span>
            )}
            {orderCounts.arrived > 0 && (
              <span className="text-2xs px-2 py-0.5 rounded-full bg-status-yellow/10 text-status-yellow font-medium">
                {orderCounts.arrived} arrived
              </span>
            )}
          </div>
          <ChevronDown size={14} className={cn('text-text-muted transition-transform duration-200', ordersExpanded && 'rotate-180')} />
        </button>

        {ordersExpanded && (
          <div className="border-t border-border">
            {/* Status filter pills */}
            {allOrders.length > 0 && (
              <div className="flex flex-wrap gap-2 px-5 py-3 border-b border-border">
                <button
                  onClick={() => setOrderStatusFilter('active')}
                  className={cn('text-xs px-2.5 py-1 rounded-full font-medium border transition-colors', orderStatusFilter === 'active' ? 'border-orange bg-orange/10 text-orange' : 'border-border text-text-muted hover:border-orange/40')}
                >
                  Active ({activeOrders.length})
                </button>
                {Object.entries(orderCounts).map(([status, count]) => count > 0 && (
                  <button
                    key={status}
                    onClick={() => setOrderStatusFilter(orderStatusFilter === status ? 'active' : status)}
                    className={cn(
                      'text-xs px-2.5 py-1 rounded-full font-medium border transition-colors',
                      orderStatusFilter === status
                        ? `border-current ${PART_STATUS[status].color} ${PART_STATUS[status].bg}`
                        : 'border-border text-text-muted hover:border-orange/40'
                    )}
                  >
                    {PART_STATUS[status].label} ({count})
                  </button>
                ))}
                <button
                  onClick={() => setOrderStatusFilter('all')}
                  className={cn('text-xs px-2.5 py-1 rounded-full font-medium border transition-colors', orderStatusFilter === 'all' ? 'border-orange bg-orange/10 text-orange' : 'border-border text-text-muted hover:border-orange/40')}
                >
                  All ({allOrders.length})
                </button>
              </div>
            )}

            {displayedOrders.length === 0 ? (
              <div className="py-12 text-center">
                <Truck size={20} className="text-text-muted mx-auto mb-2" />
                <p className="text-sm text-text-muted">{allOrders.length === 0 ? 'No parts on order' : 'No parts with that status'}</p>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {displayedOrders.map((item, idx) => {
                  const { ro, ...req } = item
                  const cfg = PART_STATUS[req.status] || PART_STATUS.requested
                  const trackUrl = getTrackingUrl(req.carrier, req.trackingNumber)
                  const nextStatus = STATUS_NEXT[req.status]
                  const isEditingTracking = editingTrackingId === `${ro.id}_${req.id}`
                  return (
                    <div key={`${req.id}-${idx}`} className={cn('px-5 py-4', req.status === 'arrived' && 'bg-status-yellow/5')}>
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <span className="text-sm font-medium text-text-primary">{req.name}</span>
                            {req.qty > 1 && <span className="text-xs text-text-muted">×{req.qty}</span>}
                            {req.partNumber && <span className="text-2xs font-mono text-text-muted">#{req.partNumber}</span>}
                          </div>
                          <div className="flex items-center gap-2 text-2xs text-text-muted mb-1.5 flex-wrap">
                            <span className="font-mono text-orange">{ro.id}</span>
                            <span>·</span>
                            <span>{ro.vehicle}</span>
                            <span>·</span>
                            <span>{ro.customerName}</span>
                            {req.requestedBy && <><span>·</span><span>by {req.requestedBy}</span></>}
                          </div>
                          {(req.supplier || req.eta) && (
                            <div className="text-2xs text-text-muted">
                              {req.supplier}{req.eta && ` · ETA ${req.eta}`}
                            </div>
                          )}
                          {(() => {
                            const days = daysAgo(req.requestedAt)
                            const severity = getAgeSeverity(days, req.status)
                            const label = getAgeLabel(days)
                            if (!label || req.status === 'ready') return null
                            return (
                              <div className={cn('text-2xs mt-0.5', severity === 'overdue' ? 'text-status-red font-medium' : severity === 'warning' ? 'text-status-yellow' : 'text-text-muted')}>
                                {severity === 'overdue' ? '⚠ Overdue — ' : ''}{req.status === 'ordered' ? 'Ordered' : req.status === 'shipped' ? 'Shipped' : 'Requested'} {label}
                              </div>
                            )
                          })()}
                          {/* Tracking */}
                          {isEditingTracking ? (
                            <div className="mt-2 space-y-1.5">
                              <input
                                autoFocus
                                value={trackingDraft.supplier}
                                onChange={e => setTrackingDraft(d => ({ ...d, supplier: e.target.value }))}
                                placeholder="Supplier (e.g. NAPA, AutoZone)"
                                className="w-full h-7 rounded border border-border bg-background px-2 text-xs text-text-primary placeholder:text-text-muted focus:outline-none focus:border-orange"
                              />
                              <input
                                value={trackingDraft.eta}
                                onChange={e => setTrackingDraft(d => ({ ...d, eta: e.target.value }))}
                                placeholder="ETA (e.g. Tomorrow 2pm)"
                                className="w-full h-7 rounded border border-border bg-background px-2 text-xs text-text-primary placeholder:text-text-muted focus:outline-none focus:border-orange"
                              />
                              <div className="flex gap-2">
                                <select
                                  value={trackingDraft.carrier}
                                  onChange={e => setTrackingDraft(d => ({ ...d, carrier: e.target.value }))}
                                  className="h-7 rounded border border-border bg-background px-2 text-xs text-text-primary focus:outline-none focus:border-orange [&>option]:bg-surface"
                                >
                                  <option value="">Carrier (optional)</option>
                                  <option value="UPS">UPS</option>
                                  <option value="FedEx">FedEx</option>
                                  <option value="USPS">USPS</option>
                                  <option value="Other">Other</option>
                                </select>
                                <input
                                  value={trackingDraft.trackingNumber}
                                  onChange={e => setTrackingDraft(d => ({ ...d, trackingNumber: e.target.value }))}
                                  placeholder="Tracking # (optional)"
                                  className="flex-1 h-7 rounded border border-border bg-background px-2 text-xs text-text-primary font-mono placeholder:text-text-muted focus:outline-none focus:border-orange"
                                />
                              </div>
                              <div className="flex gap-2">
                                <button onClick={() => saveTracking(req, ro)} className="h-7 px-2.5 rounded bg-orange text-white text-xs font-medium hover:bg-orange/90 transition-colors">Save</button>
                                <button onClick={() => setEditingTrackingId(null)} className="h-7 px-2 rounded border border-border text-xs text-text-muted hover:text-text-primary transition-colors">Cancel</button>
                              </div>
                            </div>
                          ) : trackUrl ? (
                            <div className="flex items-center gap-3 mt-1.5">
                              <a href={trackUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-2xs text-blue-400 hover:underline">
                                <ExternalLink size={9} /> Track with {req.carrier}
                              </a>
                              <button onClick={() => { setEditingTrackingId(`${ro.id}_${req.id}`); setTrackingDraft({ supplier: req.supplier || '', eta: req.eta || '', carrier: req.carrier || '', trackingNumber: req.trackingNumber || '' }) }} className="text-2xs text-text-muted hover:text-orange transition-colors">
                                Edit
                              </button>
                            </div>
                          ) : req.trackingNumber ? (
                            <div className="text-2xs text-text-muted font-mono mt-1">{req.carrier && `${req.carrier} · `}#{req.trackingNumber}</div>
                          ) : req.status === 'ordered' || req.status === 'shipped' ? (
                            <button
                              onClick={() => { setEditingTrackingId(`${ro.id}_${req.id}`); setTrackingDraft({ supplier: req.supplier || '', eta: req.eta || '', carrier: '', trackingNumber: '' }) }}
                              className="mt-2 flex items-center gap-1.5 h-7 px-3 rounded-md border border-orange/30 bg-orange/5 text-xs font-medium text-orange hover:bg-orange/10 transition-colors"
                            >
                              + Add order details
                            </button>
                          ) : null}
                        </div>

                        {/* Right: status + delete */}
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <StatusDropdown
                            value={req.status}
                            onChange={newStatus => advanceOrder(req, ro, newStatus)}
                          />
                          <button
                            onClick={() => setConfirmDeleteOrderId(`${ro.id}_${req.id}`)}
                            title="Remove order"
                            className="w-6 h-6 flex items-center justify-center rounded text-text-muted hover:text-red-400 transition-colors"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}
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
        <div className="flex gap-1">
          {[
            { key: 'All', label: 'All' },
            { key: 'ok',  label: 'In Stock' },
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

      {/* Mobile inventory cards */}
      <div className="sm:hidden space-y-2">
        {filtered.map(part => {
          const shop = shops.find(s => s.id === part.shopId)
          const status = getStockStatus(part)
          return (
            <div key={part.id} className="bg-surface border border-border rounded-xl p-4">
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-text-primary truncate">{part.name}</div>
                  <div className="text-xs font-mono text-text-muted">{part.sku}</div>
                </div>
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <div className={cn('w-1.5 h-1.5 rounded-full', status.dot)} />
                  <span className={cn('text-xs', status.text)}>{status.label}</span>
                </div>
              </div>
              <div className="flex items-center justify-between text-xs text-text-muted">
                <span>{part.category} · {shop?.name}</span>
                <div className="flex items-center gap-3">
                  <span>Qty: <span className={cn('font-semibold tabular-nums', part.qty <= part.minQty ? 'text-status-red' : 'text-text-primary')}>{part.qty}</span></span>
                  <span className="font-medium text-text-primary tabular-nums">{formatCurrency(part.price)}</span>
                </div>
              </div>
              <div className="flex gap-2 mt-3">
                <button
                  onClick={() => handleOrder(part.id)}
                  className={cn(
                    'flex items-center gap-1.5 h-8 px-3 rounded-md text-xs font-medium flex-1 justify-center transition-all',
                    orderedIds.has(part.id)
                      ? 'bg-green-500/10 text-green-400 border border-green-500/30'
                      : part.qty <= part.minQty
                        ? 'bg-orange/10 text-orange border border-orange/30'
                        : 'text-text-muted border border-border'
                  )}
                >
                  {orderedIds.has(part.id) ? '✓ Ordered' : 'Order'}
                </button>
                <button onClick={() => setModalPart(part)} className="h-8 w-10 flex items-center justify-center rounded-md border border-border text-text-muted hover:text-orange">
                  <Pencil size={13} />
                </button>
                <button onClick={() => setConfirmDelete(part)} className="h-8 w-10 flex items-center justify-center rounded-md border border-border text-text-muted hover:text-red-400">
                  <Trash2 size={13} />
                </button>
              </div>
            </div>
          )
        })}
        {filtered.length === 0 && (
          <div className="py-10 text-center text-sm text-text-muted">No parts found.</div>
        )}
      </div>

      {/* Table */}
      <div className="hidden sm:block bg-surface border border-border rounded-lg overflow-hidden">
        {filtered.length === 0 ? (
          <div className="py-16 text-center">
            <div className="w-12 h-12 rounded-xl bg-border mx-auto mb-3 flex items-center justify-center">
              <Package size={20} className="text-text-muted" />
            </div>
            <p className="text-sm text-text-muted">No parts found.</p>
            <button onClick={() => setModalPart(defaultNewPart)} className="mt-3 text-xs text-orange hover:underline">Add your first part →</button>
          </div>
        ) : (
          <Table>
            <Thead>
              <tr>
                <Th>SKU</Th>
                <Th>Part Name</Th>
                <Th>Category</Th>
                <Th>Status</Th>
                <Th className="text-right">Qty</Th>
                <Th className="text-right">Min</Th>
                <Th className="text-right">Cost</Th>
                <Th className="text-right">Price</Th>
                <Th>Shop</Th>
                <Th>Last Ordered</Th>
                <Th></Th>
              </tr>
            </Thead>
            <Tbody>
              {filtered.map(part => {
                const shop   = shops.find(s => s.id === part.shopId)
                const status = getStockStatus(part)
                return (
                  <Tr key={part.id} className="group">
                    <Td><span className="text-xs font-mono text-text-muted">{part.sku}</span></Td>
                    <Td>
                      <div className="font-medium text-text-primary">{part.name}</div>
                      <div className="text-xs text-text-muted">{part.vendor}</div>
                    </Td>
                    <Td className="text-text-secondary">{part.category}</Td>
                    <Td>
                      <div className="flex items-center gap-1.5">
                        <div className={cn('w-1.5 h-1.5 rounded-full flex-shrink-0', status.dot)} />
                        <span className={cn('text-xs', status.text)}>{status.label}</span>
                      </div>
                    </Td>
                    <Td className="text-right">
                      <QtyCell part={part} onUpdate={qty => updatePart(part.id, { qty })} />
                    </Td>
                    <Td className="text-right tabular-nums text-text-muted">{part.minQty}</Td>
                    <Td className="text-right tabular-nums text-text-secondary">{formatCurrency(part.cost)}</Td>
                    <Td className="text-right tabular-nums text-text-primary font-medium">{formatCurrency(part.price)}</Td>
                    <Td className="text-text-muted text-xs">{shop?.name}</Td>
                    <Td className="text-text-muted text-xs">{formatDate(part.lastOrdered)}</Td>
                    <Td>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleOrder(part.id)}
                          className={cn(
                            'flex items-center gap-1.5 h-7 px-2.5 rounded-md text-xs font-medium transition-all duration-150 whitespace-nowrap',
                            orderedIds.has(part.id)
                              ? 'bg-green-500/10 text-green-400 border border-green-500/30'
                              : part.qty <= part.minQty
                                ? 'bg-orange/10 text-orange border border-orange/30 hover:bg-orange/20'
                                : 'text-text-muted border border-border hover:text-text-primary hover:border-border-hover'
                          )}
                        >
                          {orderedIds.has(part.id) ? <><Check size={11} /> Ordered</> : <><ShoppingCart size={11} /> Order</>}
                        </button>
                        <button
                          onClick={() => setModalPart(part)}
                          className="opacity-0 group-hover:opacity-100 w-7 h-7 flex items-center justify-center rounded-md border border-border text-text-muted hover:text-orange hover:border-orange/40 transition-all"
                          title="Edit part"
                        >
                          <Pencil size={11} />
                        </button>
                        <button
                          onClick={() => setConfirmDelete(part)}
                          className="opacity-0 group-hover:opacity-100 w-7 h-7 flex items-center justify-center rounded-md border border-border text-text-muted hover:text-red-400 hover:border-red-400/40 transition-all"
                          title="Remove part"
                        >
                          <Trash2 size={11} />
                        </button>
                      </div>
                    </Td>
                  </Tr>
                )
              })}
            </Tbody>
          </Table>
        )}
      </div>

      {/* Add / Edit modal */}
      {modalPart && (
        <PartModal
          part={modalPart}
          shops={scopedShops}
          onSave={handleSave}
          onClose={() => setModalPart(null)}
        />
      )}

      {/* Delete order confirmation */}
      {confirmDeleteOrderId && (() => {
        const [roId, reqId] = confirmDeleteOrderId.split('_')
        const targetRo  = scopedROs.find(r => r.id === roId)
        const targetReq = targetRo?.partsRequests?.find(r => String(r.id) === reqId)
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/60" onClick={() => setConfirmDeleteOrderId(null)} />
            <div className="relative bg-surface border border-border rounded-xl shadow-2xl w-full max-w-sm p-6">
              <h3 className="text-sm font-semibold text-text-primary mb-1">Remove part order?</h3>
              <p className="text-sm text-text-muted mb-5">
                <span className="font-medium text-text-primary">{targetReq?.name}</span> will be removed from <span className="font-mono text-orange">{roId}</span>.
              </p>
              <div className="flex gap-3">
                <button onClick={() => setConfirmDeleteOrderId(null)} className="flex-1 h-10 rounded-lg border border-border text-sm text-text-muted hover:text-text-primary transition-colors">Cancel</button>
                <button
                  onClick={() => {
                    if (targetRo) {
                      const updated = (targetRo.partsRequests || []).filter(r => String(r.id) !== reqId)
                      updateRepairOrder(targetRo.id, { partsRequests: updated })
                    }
                    setConfirmDeleteOrderId(null)
                  }}
                  className="flex-1 h-10 rounded-lg bg-red-500 text-white text-sm font-semibold hover:bg-red-600 transition-colors"
                >
                  Remove
                </button>
              </div>
            </div>
          </div>
        )
      })()}

      {/* Delete part confirmation */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60" onClick={() => setConfirmDelete(null)} />
          <div className="relative bg-surface border border-border rounded-xl shadow-2xl w-full max-w-sm p-6">
            <h3 className="text-sm font-semibold text-text-primary mb-1">Remove part?</h3>
            <p className="text-xs text-text-muted mb-5">
              <span className="font-medium text-text-primary">{confirmDelete.name}</span> will be permanently removed from inventory.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setConfirmDelete(null)} className="flex-1 h-9 rounded-lg border border-border text-sm text-text-muted hover:text-text-primary transition-colors">Cancel</button>
              <button
                onClick={() => { deletePart(confirmDelete.id); setConfirmDelete(null) }}
                className="flex-1 h-9 rounded-lg bg-red-500 text-white text-sm font-semibold hover:bg-red-600 transition-colors"
              >
                Remove
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
