import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useData } from '@/contexts/DataContext'
import { useAuth } from '@/contexts/AuthContext'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { NewROModal } from '@/components/modals/NewROModal'
import { PrintPacketModal } from '@/components/modals/PrintPacketModal'
import { formatCurrency, RO_STAGES } from '@/lib/utils'
import { CheckCircle, MessageSquare, Phone, ChevronRight, ChevronDown, FileText, Plus, X, Package, Link2, Check, Clock, PlayCircle, Flag, Zap, Square, StopCircle, Shield, Trash2 } from 'lucide-react'
import { cn } from '@/lib/utils'

const TAX_RATE = 0.085

const PART_STATUS_CFG = {
  requested: { label: 'Requested',  color: 'text-text-muted',    bg: 'bg-border/60'           },
  ordered:   { label: 'Ordered',    color: 'text-orange',        bg: 'bg-orange/10'           },
  shipped:   { label: 'In Transit', color: 'text-blue-400',      bg: 'bg-blue-500/10'         },
  arrived:   { label: 'Arrived',    color: 'text-status-yellow', bg: 'bg-status-yellow/10'    },
  ready:     { label: 'Ready ✓',   color: 'text-status-green',  bg: 'bg-status-green/10'     },
}
const PART_STATUS_DOTS = {
  requested: 'bg-text-muted',
  ordered:   'bg-orange',
  shipped:   'bg-blue-400',
  arrived:   'bg-status-yellow',
  ready:     'bg-status-green',
}

function PartStatusDropdown({ value, onChange }) {
  const [open, setOpen] = useState(false)
  const [menuPos, setMenuPos] = useState({ top: 0, right: 0 })
  const btnRef = useRef(null)
  const cfg = PART_STATUS_CFG[value] || PART_STATUS_CFG.requested

  const handleOpen = () => {
    if (btnRef.current) {
      const rect = btnRef.current.getBoundingClientRect()
      setMenuPos({ top: rect.bottom + 6, right: window.innerWidth - rect.right })
    }
    setOpen(v => !v)
  }

  return (
    <>
      {open && <div className="fixed inset-0 z-[60]" onClick={() => setOpen(false)} />}
      <button
        ref={btnRef}
        onClick={handleOpen}
        className={cn(
          'flex items-center gap-1 px-2 py-0.5 rounded-full text-2xs font-semibold border transition-all duration-150 hover:brightness-110',
          cfg.bg, cfg.color, 'border-current/20'
        )}
      >
        <span className={cn('w-1.5 h-1.5 rounded-full flex-shrink-0', PART_STATUS_DOTS[value])} />
        {cfg.label}
        <ChevronDown size={9} className={cn('transition-transform duration-150', open && 'rotate-180')} />
      </button>
      {open && (
        <div
          style={{ position: 'fixed', top: menuPos.top, right: menuPos.right }}
          className="z-[70] w-36 bg-surface border border-border rounded-lg shadow-xl overflow-hidden"
        >
          {Object.entries(PART_STATUS_CFG).map(([val, s]) => (
            <button
              key={val}
              onClick={() => { onChange(val); setOpen(false) }}
              className={cn(
                'w-full flex items-center gap-2 px-3 py-2 text-xs transition-colors text-left',
                val === value
                  ? cn(s.bg, s.color, 'font-semibold')
                  : 'text-text-secondary hover:bg-background'
              )}
            >
              <span className={cn('w-1.5 h-1.5 rounded-full flex-shrink-0', PART_STATUS_DOTS[val])} />
              {s.label}
              {val === value && <Check size={10} className="ml-auto flex-shrink-0" />}
            </button>
          ))}
        </div>
      )}
    </>
  )
}

const METHOD_LABELS = {
  'text-to-pay': 'Text-to-pay',
  'cash': 'Cash',
  'card': 'Card',
  'check': 'Check',
}

const STATUS_CYCLE = ['unchecked', 'green', 'yellow', 'red']

const DEFAULT_MPI_ITEMS = [
  { category: 'Tires',                label: 'Front Left',         detail: '', status: 'unchecked' },
  { category: 'Tires',                label: 'Front Right',        detail: '', status: 'unchecked' },
  { category: 'Tires',                label: 'Rear Left',          detail: '', status: 'unchecked' },
  { category: 'Tires',                label: 'Rear Right',         detail: '', status: 'unchecked' },
  { category: 'Brakes',               label: 'Front Pads',         detail: '', status: 'unchecked' },
  { category: 'Brakes',               label: 'Rear Pads',          detail: '', status: 'unchecked' },
  { category: 'Brakes',               label: 'Rotors',             detail: '', status: 'unchecked' },
  { category: 'Brakes',               label: 'Brake Fluid',        detail: '', status: 'unchecked' },
  { category: 'Fluids',               label: 'Engine Oil',         detail: '', status: 'unchecked' },
  { category: 'Fluids',               label: 'Coolant',            detail: '', status: 'unchecked' },
  { category: 'Fluids',               label: 'Transmission',       detail: '', status: 'unchecked' },
  { category: 'Fluids',               label: 'Power Steering',     detail: '', status: 'unchecked' },
  { category: 'Battery & Electrical', label: 'Battery',            detail: '', status: 'unchecked' },
  { category: 'Battery & Electrical', label: 'Alternator',         detail: '', status: 'unchecked' },
  { category: 'Filters',              label: 'Engine Air Filter',  detail: '', status: 'unchecked' },
  { category: 'Filters',              label: 'Cabin Air Filter',   detail: '', status: 'unchecked' },
  { category: 'Exterior',             label: 'All Lights',         detail: '', status: 'unchecked' },
  { category: 'Exterior',             label: 'Wiper Blades',       detail: '', status: 'unchecked' },
  { category: 'Exterior',             label: 'Serpentine Belt',    detail: '', status: 'unchecked' },
]

function groupMpi(items) {
  return items.reduce((acc, item, idx) => {
    if (!acc[item.category]) acc[item.category] = []
    acc[item.category].push({ ...item, _idx: idx })
    return acc
  }, {})
}

export function RODetailModal({ open, onClose, ro }) {
  const navigate = useNavigate()
  const { session } = useAuth()
  const isTech    = session?.role === 'tech'
  const isAdvisor = session?.role === 'advisor'
  const { updateRepairOrder, sendEstimateReady, technicians, parts: allParts, usePart, restockPart, jobTimers, startJobTimer, stopJobTimer, repairOrders, addNotification, cannedServices } = useData()
  const [stage, setStage] = useState(ro?.stage || 'Estimate')
  const [services, setServices] = useState(ro?.services || [])
  const [mpiItems, setMpiItems] = useState(
    ro?.mpi?.items?.length ? ro.mpi.items : DEFAULT_MPI_ITEMS
  )
  const [mpiExpanded, setMpiExpanded] = useState(false)
  const [partsUsed, setPartsUsed] = useState(ro?.partsUsed || [])
  const [showPartsPicker, setShowPartsPicker] = useState(false)
  const [partSearch, setPartSearch] = useState('')
  const [payment, setPayment] = useState(ro?.payment || null)
  const [paymentPending, setPaymentPending] = useState(null)
  const [saving, setSaving] = useState(false)
  const [authStep, setAuthStep]   = useState(null)   // null | 'capturing'
  const [authMethod, setAuthMethod] = useState(null) // 'phone' | 'text' | 'in-person'
  const [showNewRO, setShowNewRO] = useState(false)
  const [showPrintPacket, setShowPrintPacket] = useState(false)
  const [copied, setCopied] = useState(false)
  const [receiptSent, setReceiptSent] = useState(false)
  const [estimateSent, setEstimateSent] = useState(false)
  const [warrantyOpen, setWarrantyOpen] = useState(null)

  const [assignedTechId, setAssignedTechId] = useState(ro?.techId ? String(ro.techId) : '')
  const [notes, setNotes]           = useState(ro?.notes || [])
  const [newNoteText, setNewNoteText] = useState('')
  const [partsRequests, setPartsRequests]   = useState(ro?.partsRequests || [])
  const [partsNeedForm, setPartsNeedForm]   = useState(false)
  const [partsDraft, setPartsDraft]         = useState([{ name: '', partNumber: '', qty: 1 }])
  const [editingOrderId, setEditingOrderId] = useState(null)
  const [orderDraft, setOrderDraft]         = useState({ supplier: '', eta: '', carrier: '', trackingNumber: '' })
  const [confirmDeletePartId, setConfirmDeletePartId] = useState(null)

  if (!ro) return null

  // ── Warranty helpers ─────────────────────────────────────────────────────
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
  const setWarranty = (idx, months) => {
    const updated = services.map((svc, i) =>
      i === idx
        ? { ...svc, warrantyMonths: months || null, warrantyStartDate: months ? (svc.warrantyStartDate || new Date().toISOString()) : null }
        : svc
    )
    setServices(updated)
    updateRepairOrder(ro.id, { services: updated })
    setWarrantyOpen(null)
  }
  // Warranties from OTHER ROs for the same customer (to show banner on return visits)
  const activeWarranties = ro.customerId
    ? repairOrders
        .filter(r => r.id !== ro.id && r.customerId === ro.customerId)
        .flatMap(r => (r.services || []).map(svc => ({ ...svc, roId: r.id })))
        .filter(svc => isWarrantyActive(svc))
    : []

  const shopTechs = technicians.filter(t => t.shopId === ro.shopId)

  const reassignTech = (newTechId) => {
    const tech = technicians.find(t => t.id === Number(newTechId))
    setAssignedTechId(newTechId)
    updateRepairOrder(ro.id, {
      techId: newTechId ? Number(newTechId) : null,
      techName: tech?.name || 'Unassigned',
    })
  }

  const noteAuthor = isTech
    ? (technicians.find(t => t.id === session?.techId)?.name || 'Tech')
    : isAdvisor ? 'Service Advisor' : 'Owner'

  const addNote = () => {
    const text = newNoteText.trim()
    if (!text) return
    const note = {
      id: crypto.randomUUID(),
      text,
      type: isTech ? 'tech' : 'advisor',
      author: noteAuthor,
      createdAt: new Date().toISOString(),
    }
    const next = [...notes, note]
    setNotes(next)
    setNewNoteText('')
    updateRepairOrder(ro.id, { notes: next })
  }

  const submitPartsRequest = async () => {
    const valid = partsDraft.filter(p => p.name.trim())
    if (!valid.length) return
    setSaving(true)
    await new Promise(r => setTimeout(r, 300))
    const newReqs = valid.map(p => ({
      id: crypto.randomUUID(),
      name: p.name.trim(),
      partNumber: p.partNumber.trim(),
      qty: Number(p.qty) || 1,
      requestedAt: new Date().toISOString(),
      requestedBy: noteAuthor,
      status: 'requested',
      supplier: '', eta: '',
    }))
    const allReqs = [...partsRequests, ...newReqs]
    setPartsRequests(allReqs)
    setStage('Waiting Parts')
    updateRepairOrder(ro.id, { stage: 'Waiting Parts', partsRequests: allReqs, services, partsUsed, mpi: { ...(ro.mpi || {}), items: mpiItems } })
    newReqs.forEach(req => addNotification({
      type: 'part_status',
      status: 'requested',
      partName: req.name,
      roId: ro.id,
      vehicle: ro.vehicle,
      customerName: ro.customerName,
      shopId: ro.shopId,
    }))
    setSaving(false)
    setPartsNeedForm(false)
    setPartsDraft([{ name: '', partNumber: '', qty: 1 }])
  }

  const saveOrderDetails = (id) => {
    if (!orderDraft.supplier.trim()) return
    const req = partsRequests.find(r => r.id === id)
    const updated = partsRequests.map(r =>
      r.id === id ? {
        ...r,
        supplier: orderDraft.supplier.trim(),
        eta: orderDraft.eta.trim(),
        carrier: orderDraft.carrier.trim(),
        trackingNumber: orderDraft.trackingNumber.trim(),
        status: 'ordered',
      } : r
    )
    setPartsRequests(updated)
    updateRepairOrder(ro.id, { partsRequests: updated })
    if (req && req.status !== 'ordered') {
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
    setEditingOrderId(null)
    setOrderDraft({ supplier: '', eta: '', carrier: '', trackingNumber: '' })
  }

  const advancePartStatus = (id, newStatus) => {
    const req = partsRequests.find(r => r.id === id)
    const updated = partsRequests.map(r => r.id === id ? { ...r, status: newStatus } : r)
    setPartsRequests(updated)
    updateRepairOrder(ro.id, { partsRequests: updated })
    if (req) {
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
  }

  const deletePartRequest = (id) => {
    const updated = partsRequests.filter(r => r.id !== id)
    setPartsRequests(updated)
    updateRepairOrder(ro.id, { partsRequests: updated })
    setConfirmDeletePartId(null)
  }

  const markPartArrived = (id) => {
    const req = partsRequests.find(r => r.id === id)
    if (req) {
      const catalogMatch = allParts.find(p =>
        p.sku.toLowerCase() === (req.partNumber || '').toLowerCase() ||
        p.name.toLowerCase() === req.name.toLowerCase()
      )
      if (catalogMatch) restockPart(catalogMatch.id, req.qty || 1)
    }
    const updated = partsRequests.map(r => r.id === id ? { ...r, status: 'arrived' } : r)
    setPartsRequests(updated)
    updateRepairOrder(ro.id, { partsRequests: updated })
    if (req) {
      addNotification({
        type: 'part_status',
        status: 'arrived',
        partName: req.name,
        roId: ro.id,
        vehicle: ro.vehicle,
        customerName: ro.customerName,
        shopId: ro.shopId,
      })
    }
  }

  const currentStageIdx = RO_STAGES.indexOf(stage)
  const servicesSubtotal = services.reduce((sum, s) => sum + (Number(s.price) || 0), 0)
  const partsSubtotal = partsUsed.reduce((sum, p) => sum + (p.price * p.qty), 0)
  const subtotal = servicesSubtotal + partsSubtotal
  const taxAmount = Math.round(subtotal * TAX_RATE * 100) / 100
  const grandTotal = subtotal + taxAmount

  // Parts helpers
  const shopParts = allParts.filter(p => p.shopId === ro.shopId)
  const filteredPickerParts = shopParts.filter(p => {
    if (!partSearch) return true
    const q = partSearch.toLowerCase()
    return p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q)
  })

  const addPart = (part) => {
    const existing = partsUsed.find(p => p.partId === part.id)
    if (existing) {
      setPartsUsed(prev => prev.map(p => p.partId === part.id ? { ...p, qty: p.qty + 1 } : p))
    } else {
      setPartsUsed(prev => [...prev, { partId: part.id, name: part.name, qty: 1, price: part.price }])
    }
    usePart(part.id, 1)
    setShowPartsPicker(false)
    setPartSearch('')
  }

  const updatePartQty = (idx, newQty) => {
    if (newQty < 1) { removePart(idx); return }
    const current = partsUsed[idx]
    const delta = newQty - current.qty
    if (delta > 0) usePart(current.partId, delta)
    else if (delta < 0) restockPart(current.partId, Math.abs(delta))
    setPartsUsed(prev => prev.map((p, i) => i === idx ? { ...p, qty: newQty } : p))
  }

  const removePart = (idx) => {
    const p = partsUsed[idx]
    if (p.partId) restockPart(p.partId, p.qty)
    setPartsUsed(prev => prev.filter((_, i) => i !== idx))
  }

  const copyStatusLink = async () => {
    await navigator.clipboard.writeText(`${window.location.origin}/status/${ro.id}`)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  // MPI helpers
  const cycleStatus = (idx) => {
    setMpiItems(items => items.map((item, i) =>
      i === idx
        ? { ...item, status: STATUS_CYCLE[(STATUS_CYCLE.indexOf(item.status) + 1) % STATUS_CYCLE.length] }
        : item
    ))
  }
  const updateDetail = (idx, val) => {
    setMpiItems(items => items.map((item, i) => i === idx ? { ...item, detail: val } : item))
  }

  const mpiGreen    = mpiItems.filter(i => i.status === 'green').length
  const mpiYellow   = mpiItems.filter(i => i.status === 'yellow').length
  const mpiRed      = mpiItems.filter(i => i.status === 'red').length
  const mpiChecked  = mpiGreen + mpiYellow + mpiRed
  const mpiGrouped  = groupMpi(mpiItems)

  // Service line editing
  const [showCannedPicker, setShowCannedPicker] = useState(false)
  const [cannedSearch, setCannedSearch] = useState('')

  const addService    = () => setServices(s => [...s, { name: '', price: '' }])
  const removeService = (i) => setServices(s => s.filter((_, idx) => idx !== i))
  const updateService = (i, field, val) => setServices(s =>
    s.map((svc, idx) => idx === i ? { ...svc, [field]: val } : svc)
  )

  const addCannedService = (cs) => {
    setServices(s => [...s, { name: cs.name, price: cs.price }])
    setShowCannedPicker(false)
    setCannedSearch('')
  }

  const filteredCanned = cannedSearch
    ? cannedServices.filter(cs => cs.name.toLowerCase().includes(cannedSearch.toLowerCase()) || cs.category.toLowerCase().includes(cannedSearch.toLowerCase()))
    : cannedServices

  const completeIdx = RO_STAGES.indexOf('Complete')

  const advanceStage = async () => {
    if (currentStageIdx >= RO_STAGES.length - 1) return
    if (isTech && currentStageIdx >= completeIdx) return
    setSaving(true)
    await new Promise(r => setTimeout(r, 400))
    const nextStage = RO_STAGES[currentStageIdx + 1]
    setStage(nextStage)
    updateRepairOrder(ro.id, {
      stage: nextStage,
      services,
      partsUsed,
      mpi: { ...(ro.mpi || {}), items: mpiItems },
    })
    setSaving(false)
  }

  const revertToStage = async (targetStage) => {
    setSaving(true)
    await new Promise(r => setTimeout(r, 300))
    const patch = { stage: targetStage, services, partsUsed, mpi: { ...(ro.mpi || {}), items: mpiItems } }
    if (targetStage === 'Estimate') {
      patch.authorized   = false
      patch.authorizedAt  = null
      patch.authorizedVia = null
    }
    setStage(targetStage)
    updateRepairOrder(ro.id, patch)
    setSaving(false)
  }

  const authorizeAndAdvance = async () => {
    if (!authMethod) return
    setSaving(true)
    await new Promise(r => setTimeout(r, 350))
    setStage('Approved')
    updateRepairOrder(ro.id, {
      stage: 'Approved',
      authorized: true,
      authorizedAt: new Date().toISOString(),
      authorizedVia: authMethod,
      services,
      partsUsed,
    })
    setSaving(false)
    setAuthStep(null)
    setAuthMethod(null)
  }

  const markPaid = async (method) => {
    setSaving(true)
    await new Promise(r => setTimeout(r, 300))
    const paidPayment = { method, paidAt: new Date().toISOString() }
    setPayment(paidPayment)
    setStage('Paid')
    setPaymentPending(null)
    updateRepairOrder(ro.id, {
      stage: 'Paid',
      payment: paidPayment,
      services,
      partsUsed,
      total: grandTotal,
    })
    setSaving(false)
  }

  const paidAt = payment?.paidAt
    ? new Date(payment.paidAt).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
    : ''

  const roForPrint = {
    ...ro,
    services,
    total: subtotal,
    mpi: { ...(ro.mpi || {}), items: mpiItems },
  }

  // ── Stage bar ────────────────────────────────────────────────────────────
  const TECH_STAGES = RO_STAGES.slice(0, RO_STAGES.indexOf('Complete') + 1)
  const visibleStages   = isTech ? TECH_STAGES : RO_STAGES
  const visibleStageIdx = Math.min(currentStageIdx, visibleStages.length - 1)

  const canClickBack = (s, i) => {
    if (stage === 'Paid') return false            // nothing reverts from Paid
    if (i >= visibleStageIdx) return false        // can't click current or future
    if (isTech && s === 'Estimate') return false  // techs can't un-authorize
    return true
  }

  const stageBar = (
    <div className="px-3 sm:px-5 py-3 border-b border-border">
      <div className="flex rounded-md overflow-hidden">
        {visibleStages.map((s, i) => {
          const active            = i <= visibleStageIdx
          const isPaidSegment     = s === 'Paid'
          const isCurrent         = i === visibleStageIdx
          const isCompleteForTech = isTech && s === 'Complete' && currentStageIdx >= RO_STAGES.indexOf('Complete')
          const clickable         = canClickBack(s, i)
          return (
            <div
              key={s}
              onClick={clickable ? () => revertToStage(s) : undefined}
              title={clickable ? `Go back to ${s}` : undefined}
              className={cn(
                'flex-1 text-center py-1.5 text-xs transition-all duration-300',
                active && (isPaidSegment || isCompleteForTech) ? 'bg-status-green text-white font-semibold' : '',
                active && !isPaidSegment && !isCompleteForTech ? 'bg-orange text-white' : '',
                !active ? 'bg-border text-text-muted' : '',
                isCurrent && !isPaidSegment && !isCompleteForTech ? 'font-semibold' : '',
                clickable ? 'cursor-pointer hover:opacity-70' : '',
              )}
            >
              {isCompleteForTech ? '✓ ' : ''}{s}
            </div>
          )
        })}
      </div>
    </div>
  )

  // ── MPI dot ──────────────────────────────────────────────────────────────
  const StatusDot = ({ status, onClick, size = 'md' }) => (
    <button
      onClick={onClick}
      title={onClick ? 'Click to cycle: good → monitor → urgent' : undefined}
      className={cn(
        'rounded-full flex-shrink-0 transition-all duration-150',
        size === 'sm' ? 'w-2 h-2' : 'w-3 h-3',
        onClick ? 'hover:scale-125 active:scale-95 cursor-pointer' : 'cursor-default',
        status === 'green'     ? 'bg-green-500' :
        status === 'yellow'    ? 'bg-yellow-400' :
        status === 'red'       ? 'bg-red-500' :
        'bg-transparent border-2 border-slate-300'
      )}
    />
  )

  // ── Job timer helpers ─────────────────────────────────────────────────────
  const [now, setNow] = useState(Date.now())
  const tickRef = useRef(null)
  useEffect(() => {
    tickRef.current = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(tickRef.current)
  }, [])

  const getTimerMs = (svcIdx) => {
    const t = jobTimers[`${ro.id}_${svcIdx}`]
    if (!t) return 0
    return t.totalMs + (t.startedAt ? now - new Date(t.startedAt).getTime() : 0)
  }

  const isTimerRunning = (svcIdx) => !!jobTimers[`${ro.id}_${svcIdx}`]?.startedAt

  function formatMs(ms) {
    const s = Math.floor(ms / 1000)
    const h = Math.floor(s / 3600)
    const m = Math.floor((s % 3600) / 60)
    const sec = s % 60
    if (h > 0) return `${h}:${String(m).padStart(2,'0')}:${String(sec).padStart(2,'0')}`
    return `${m}:${String(sec).padStart(2,'0')}`
  }

  // ── Left column ──────────────────────────────────────────────────────────
  const isPastComplete = currentStageIdx >= RO_STAGES.indexOf('Complete')

  const leftColumn = (
    <div className="flex flex-col gap-5">
      {/* Customer / Vehicle / Tech row */}
      <div className="grid grid-cols-3 gap-3">
        <div>
          <div className="text-2xs font-medium text-text-muted uppercase tracking-wider mb-1">Customer</div>
          {ro.customerId ? (
            <button onClick={() => { onClose(); navigate(`/customers/${ro.customerId}`) }} className="text-sm font-medium text-orange hover:underline leading-snug text-left">
              {ro.customerName}
            </button>
          ) : (
            <div className="text-sm font-medium text-text-primary leading-snug">{ro.customerName}</div>
          )}
        </div>
        <div>
          <div className="text-2xs font-medium text-text-muted uppercase tracking-wider mb-1">Vehicle</div>
          <div className="text-sm font-medium text-text-primary leading-snug">{ro.vehicle}</div>
        </div>
        <div>
          <div className="text-2xs font-medium text-text-muted uppercase tracking-wider mb-1">Technician</div>
          {(isAdvisor || session?.role === 'owner') ? (
            <select
              value={assignedTechId}
              onChange={e => reassignTech(e.target.value)}
              className="w-full text-sm bg-surface border border-border rounded px-1.5 py-0.5 text-text-primary focus:outline-none focus:border-orange transition-colors [&>option]:bg-surface"
            >
              <option value="">Unassigned</option>
              {shopTechs.map(t => (
                <option key={t.id} value={String(t.id)}>{t.name}</option>
              ))}
            </select>
          ) : (
            <div className="text-sm font-medium text-text-primary leading-snug">{ro.techName || 'Unassigned'}</div>
          )}
        </div>
      </div>

      {/* Active warranty banner — only shown when customer has prior warranties still valid */}
      {activeWarranties.length > 0 && (
        <div className="bg-status-green-subtle border border-status-green/30 rounded-lg p-3">
          <div className="flex items-center gap-2 mb-1.5">
            <Shield size={12} className="text-status-green flex-shrink-0" />
            <span className="text-xs font-semibold text-status-green">
              Active Warrant{activeWarranties.length === 1 ? 'y' : 'ies'} on File
            </span>
          </div>
          <div className="space-y-1">
            {activeWarranties.map((svc, idx) => {
              const exp = warrantyExpires(svc)
              return (
                <div key={idx} className="text-xs text-text-primary leading-relaxed">
                  <span className="font-medium">{svc.name}</span>
                  <span className="text-text-muted"> · expires {exp?.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Customer concern */}
      <div>
        <div className="text-2xs font-medium text-text-muted uppercase tracking-wider mb-1.5">Customer Concern</div>
        <p className="text-sm text-text-secondary leading-relaxed">{ro.complaint}</p>
      </div>

      {/* Services list */}
      <div>
        <div className="text-2xs font-medium text-text-muted uppercase tracking-wider mb-2">Services</div>
        {services.length > 0 ? (
          <div className="space-y-2">
            {services.map((svc, i) => {
              const running = isTimerRunning(i)
              const ms = getTimerMs(i)
              const exp = warrantyExpires(svc)
              const wActive = isWarrantyActive(svc)
              return (
                <div key={i} className="space-y-1">
                  <div className="flex items-center justify-between gap-2 text-sm">
                    <div className="flex items-center gap-2 min-w-0">
                      {isPastComplete ? (
                        <CheckCircle size={13} className="text-status-green flex-shrink-0" />
                      ) : (
                        <div className="w-1.5 h-1.5 rounded-full bg-orange flex-shrink-0" />
                      )}
                      <span className="text-text-primary truncate">
                        {svc.name || <span className="text-text-muted italic">Unnamed service</span>}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {ms > 0 && (
                        <span className={cn('text-xs font-mono tabular-nums', running ? 'text-orange' : 'text-text-muted')}>
                          {formatMs(ms)}
                        </span>
                      )}
                      {stage === 'In Progress' && (
                        <button
                          onClick={() => running ? stopJobTimer(ro.id, i) : startJobTimer(ro.id, i)}
                          className={cn(
                            'w-5 h-5 flex items-center justify-center rounded transition-colors',
                            running
                              ? 'text-orange hover:text-orange/70'
                              : 'text-text-muted hover:text-orange'
                          )}
                          title={running ? 'Stop timer' : 'Start timer'}
                        >
                          {running ? <Square size={10} fill="currentColor" /> : <PlayCircle size={13} />}
                        </button>
                      )}
                      <button
                        onClick={() => setWarrantyOpen(warrantyOpen === i ? null : i)}
                        title={wActive ? `Warranty active · expires ${exp?.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}` : svc.warrantyMonths ? 'Warranty expired' : 'Add warranty'}
                        className={cn(
                          'w-5 h-5 flex items-center justify-center rounded transition-colors',
                          wActive ? 'text-status-green' :
                          svc.warrantyMonths ? 'text-text-muted' :
                          'text-text-muted hover:text-orange'
                        )}
                      >
                        <Shield size={12} />
                      </button>
                      {Number(svc.price) > 0 && (
                        <span className="text-text-secondary font-medium tabular-nums text-xs">
                          {formatCurrency(Number(svc.price))}
                        </span>
                      )}
                    </div>
                  </div>
                  {/* Warranty badge */}
                  {svc.warrantyMonths && (
                    <div className={cn(
                      'ml-5 flex items-center gap-1 text-[10px]',
                      wActive ? 'text-status-green' : 'text-text-muted line-through'
                    )}>
                      <Shield size={9} />
                      {wActive
                        ? `Warranty · expires ${exp?.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`
                        : `Expired ${exp?.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`
                      }
                    </div>
                  )}
                  {/* Warranty picker */}
                  {warrantyOpen === i && (
                    <div className="ml-5 flex flex-wrap gap-1.5 pt-0.5">
                      {[null, 1, 3, 6, 12, 24].map(mo => (
                        <button
                          key={mo ?? 'none'}
                          onClick={() => setWarranty(i, mo)}
                          className={cn(
                            'px-2 py-0.5 rounded text-[10px] font-medium border transition-colors',
                            svc.warrantyMonths === mo
                              ? 'border-orange bg-orange/10 text-orange'
                              : 'border-border text-text-muted hover:border-orange hover:text-orange'
                          )}
                        >
                          {mo === null ? 'None' : `${mo} mo`}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        ) : (
          <p className="text-sm text-text-muted">No services added yet</p>
        )}
      </div>

      {/* Parts Used */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <div className="text-2xs font-medium text-text-muted uppercase tracking-wider">Parts Used</div>
          <button
            onClick={() => { setShowPartsPicker(v => !v); setPartSearch('') }}
            className="flex items-center gap-1 text-xs font-medium text-orange hover:text-orange/80 transition-colors"
          >
            <Plus size={11} /> Add Part
          </button>
        </div>

        {partsUsed.length > 0 && (
          <div className="space-y-1.5 mb-2">
            {partsUsed.map((p, i) => (
              <div key={i} className="flex items-center gap-2">
                <Package size={11} className="text-text-muted flex-shrink-0" />
                <span className="flex-1 text-xs text-text-primary truncate">{p.name}</span>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <button onClick={() => updatePartQty(i, p.qty - 1)} className="w-5 h-5 rounded border border-border text-xs text-text-muted hover:text-text-primary hover:border-orange transition-colors flex items-center justify-center">−</button>
                  <span className="text-xs tabular-nums text-text-primary w-4 text-center">{p.qty}</span>
                  <button onClick={() => updatePartQty(i, p.qty + 1)} className="w-5 h-5 rounded border border-border text-xs text-text-muted hover:text-text-primary hover:border-orange transition-colors flex items-center justify-center">+</button>
                </div>
                <span className="text-xs font-medium text-text-secondary tabular-nums flex-shrink-0 w-14 text-right">{formatCurrency(p.price * p.qty)}</span>
                <button onClick={() => removePart(i)} className="text-text-muted hover:text-red-400 transition-colors flex-shrink-0"><X size={11} /></button>
              </div>
            ))}
          </div>
        )}

        {showPartsPicker && (
          <div className="border border-border rounded-lg overflow-hidden">
            <div className="p-2 border-b border-border">
              <input
                autoFocus
                type="text"
                value={partSearch}
                onChange={e => setPartSearch(e.target.value)}
                placeholder="Search parts…"
                className="w-full text-xs bg-transparent focus:outline-none text-text-primary placeholder:text-text-muted"
              />
            </div>
            <div className="max-h-36 overflow-y-auto">
              {filteredPickerParts.length === 0 ? (
                <div className="px-3 py-4 text-xs text-text-muted text-center">
                  {shopParts.length === 0 ? 'No parts on file for this shop' : 'No parts match your search'}
                </div>
              ) : (
                filteredPickerParts.map(p => (
                  <button
                    key={p.id}
                    onClick={() => addPart(p)}
                    disabled={p.qty === 0}
                    className="w-full flex items-center justify-between px-3 py-2 hover:bg-surface text-left text-xs transition-colors border-b border-border/50 last:border-0 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <div className="min-w-0 mr-2">
                      <div className="text-text-primary truncate">{p.name}</div>
                      <div className="text-text-muted">{p.sku}</div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className={cn(
                        'text-xs tabular-nums',
                        p.qty === 0 ? 'text-status-red' : p.qty <= p.minQty ? 'text-status-yellow' : 'text-text-muted'
                      )}>
                        {p.qty === 0 ? 'Out' : `${p.qty} in stock`}
                      </span>
                      <span className="text-text-muted">{formatCurrency(p.price)}</span>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        )}

        {partsUsed.length === 0 && !showPartsPicker && (
          <p className="text-xs text-text-muted">No parts added yet</p>
        )}
      </div>

      {/* Parts Requests */}
      {(partsRequests.length > 0 || stage === 'Waiting Parts') && (
        <div>
          <div className="text-2xs font-medium text-text-muted uppercase tracking-wider mb-2">Parts Requests</div>
          {partsRequests.length === 0 ? (
            <p className="text-xs text-text-muted">No parts requested yet.</p>
          ) : (
            <div className="space-y-2">
              {partsRequests.map(req => (
                <div
                  key={req.id}
                  className={cn(
                    'rounded-lg border p-3',
                    req.status === 'arrived' ? 'border-status-green/30 bg-status-green/5' :
                    req.status === 'ordered' ? 'border-orange/20 bg-orange/5' :
                    'border-border bg-background'
                  )}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="text-xs font-medium text-text-primary truncate">{req.name}</div>
                      {req.partNumber && <div className="text-2xs text-text-muted">#{req.partNumber}</div>}
                    </div>
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <span className="text-2xs text-text-muted">×{req.qty}</span>
                      {!isTech ? (
                        <PartStatusDropdown
                          value={req.status}
                          onChange={newStatus => advancePartStatus(req.id, newStatus)}
                        />
                      ) : (
                        <span className={cn(
                          'text-2xs px-1.5 py-0.5 rounded-full font-medium',
                          req.status === 'ready'   ? 'bg-status-green/10 text-status-green' :
                          req.status === 'arrived' ? 'bg-status-yellow/10 text-status-yellow' :
                          req.status === 'shipped' ? 'bg-blue-500/10 text-blue-400' :
                          req.status === 'ordered' ? 'bg-orange/10 text-orange' :
                          'bg-border text-text-muted'
                        )}>
                          {req.status === 'ready' ? 'Ready' : req.status === 'arrived' ? 'Arrived' : req.status === 'shipped' ? 'Shipped' : req.status === 'ordered' ? 'Ordered' : 'Requested'}
                        </span>
                      )}
                      <button
                        onClick={() => setConfirmDeletePartId(req.id)}
                        title="Remove part request"
                        className="w-5 h-5 flex items-center justify-center rounded text-text-muted hover:text-red-400 transition-colors flex-shrink-0"
                      >
                        <Trash2 size={11} />
                      </button>
                    </div>
                  </div>

                  {/* Advisor: order details */}
                  {!isTech && req.status !== 'ready' && (
                    editingOrderId === req.id ? (
                      <div className="mt-2 space-y-1.5">
                        <input
                          autoFocus
                          type="text"
                          placeholder="Supplier (e.g. NAPA, AutoZone)"
                          value={orderDraft.supplier}
                          onChange={e => setOrderDraft(d => ({ ...d, supplier: e.target.value }))}
                          className="w-full text-xs bg-surface border border-border rounded px-2 py-1.5 text-text-primary placeholder:text-text-muted focus:outline-none focus:border-orange transition-colors"
                        />
                        <input
                          type="text"
                          placeholder="ETA (e.g. Tomorrow 2pm)"
                          value={orderDraft.eta}
                          onChange={e => setOrderDraft(d => ({ ...d, eta: e.target.value }))}
                          className="w-full text-xs bg-surface border border-border rounded px-2 py-1.5 text-text-primary placeholder:text-text-muted focus:outline-none focus:border-orange transition-colors"
                        />
                        <div className="flex gap-2">
                          <select
                            value={orderDraft.carrier}
                            onChange={e => setOrderDraft(d => ({ ...d, carrier: e.target.value }))}
                            className="flex-1 text-xs bg-surface border border-border rounded px-2 py-1.5 text-text-primary focus:outline-none focus:border-orange transition-colors [&>option]:bg-surface"
                          >
                            <option value="">Carrier (optional)</option>
                            <option value="UPS">UPS</option>
                            <option value="FedEx">FedEx</option>
                            <option value="USPS">USPS</option>
                            <option value="Other">Other</option>
                          </select>
                          <input
                            type="text"
                            placeholder="Tracking # (optional)"
                            value={orderDraft.trackingNumber}
                            onChange={e => setOrderDraft(d => ({ ...d, trackingNumber: e.target.value }))}
                            className="flex-1 text-xs bg-surface border border-border rounded px-2 py-1.5 text-text-primary placeholder:text-text-muted focus:outline-none focus:border-orange transition-colors font-mono"
                          />
                        </div>
                        <div className="flex gap-2">
                          <button onClick={() => saveOrderDetails(req.id)} className="h-7 px-3 rounded bg-orange text-white text-xs font-medium hover:bg-orange/90 transition-colors">
                            Save
                          </button>
                          <button onClick={() => setEditingOrderId(null)} className="h-7 px-3 rounded border border-border text-xs text-text-muted hover:text-text-primary transition-colors">
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between mt-2">
                        <div className="min-w-0">
                          <span className="text-2xs text-text-muted">
                            {req.supplier ? `${req.supplier}${req.eta ? ` · ETA ${req.eta}` : ''}` : req.status === 'requested' ? 'Not yet ordered' : ''}
                          </span>
                          {req.trackingNumber && (
                            <div className="text-2xs text-text-muted font-mono mt-0.5">
                              {req.carrier && `${req.carrier} · `}# {req.trackingNumber}
                            </div>
                          )}
                        </div>
                        <button
                          onClick={() => { setEditingOrderId(req.id); setOrderDraft({ supplier: req.supplier || '', eta: req.eta || '', carrier: req.carrier || '', trackingNumber: req.trackingNumber || '' }) }}
                          className="text-2xs text-orange hover:text-orange/80 transition-colors flex-shrink-0"
                        >
                          {req.supplier ? 'Edit' : 'Add order details'}
                        </button>
                      </div>
                    )
                  )}

                  {/* Tech: read order status + tracking link */}
                  {isTech && (
                    <div className="mt-1.5 space-y-0.5">
                      <div className="text-2xs text-text-muted">
                        Requested by {req.requestedBy} · {new Date(req.requestedAt).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                        {req.supplier && ` · ${req.supplier}`}
                        {req.eta && ` · ETA ${req.eta}`}
                      </div>
                      {req.trackingNumber && (() => {
                        const urls = { UPS: `https://www.ups.com/track?tracknum=${req.trackingNumber}`, FedEx: `https://www.fedex.com/fedextrack/?tracknums=${req.trackingNumber}`, USPS: `https://tools.usps.com/go/TrackConfirmAction?tLabels=${req.trackingNumber}` }
                        const url = urls[req.carrier]
                        return url ? (
                          <a href={url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-2xs text-blue-400 hover:underline">
                            Track with {req.carrier} →
                          </a>
                        ) : (
                          <div className="text-2xs text-text-muted font-mono"># {req.trackingNumber}</div>
                        )
                      })()}
                      {req.status === 'arrived' && (
                        <button onClick={() => advancePartStatus(req.id, 'ready')} className="text-2xs text-status-green hover:text-status-green/80 transition-colors mt-1 block">
                          ✓ Got it — mark ready
                        </button>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Vehicle Inspection (MPI) */}
      <div>
        {/* Header — always visible, click to expand */}
        <button
          onClick={() => setMpiExpanded(e => !e)}
          className="w-full flex items-center justify-between group"
        >
          <div className="text-2xs font-medium text-text-muted uppercase tracking-wider">
            Vehicle Inspection
          </div>
          <div className="flex items-center gap-2">
            {mpiChecked > 0 ? (
              <div className="flex items-center gap-1.5">
                {mpiGreen  > 0 && <span className="flex items-center gap-1 text-[10px] text-green-600"><span className="w-2 h-2 rounded-full bg-green-500 inline-block" />{mpiGreen}</span>}
                {mpiYellow > 0 && <span className="flex items-center gap-1 text-[10px] text-yellow-600"><span className="w-2 h-2 rounded-full bg-yellow-400 inline-block" />{mpiYellow}</span>}
                {mpiRed    > 0 && <span className="flex items-center gap-1 text-[10px] text-red-600"><span className="w-2 h-2 rounded-full bg-red-500 inline-block" />{mpiRed}</span>}
              </div>
            ) : (
              <span className="text-[10px] text-text-muted">Not started</span>
            )}
            <ChevronDown
              size={12}
              className={cn('text-text-muted transition-transform duration-200', mpiExpanded && 'rotate-180')}
            />
          </div>
        </button>

        {/* Expanded inspection grid */}
        {mpiExpanded && (
          <div className="mt-3 space-y-4">
            {Object.entries(mpiGrouped).map(([category, items]) => (
              <div key={category}>
                <div className="text-[10px] font-semibold uppercase text-text-muted tracking-wider mb-2">
                  {category}
                </div>
                <div className="space-y-1.5">
                  {items.map((item) => (
                    <div key={item._idx} className="flex items-center gap-2">
                      {/* Clickable status dot */}
                      <StatusDot
                        status={item.status}
                        onClick={() => cycleStatus(item._idx)}
                      />
                      {/* Label */}
                      <span className={cn(
                        'text-xs flex-1',
                        item.status === 'red'    ? 'text-red-600 font-medium' :
                        item.status === 'yellow' ? 'text-yellow-700' :
                        item.status === 'green'  ? 'text-text-primary' :
                        'text-text-muted'
                      )}>
                        {item.label}
                      </span>
                      {/* Detail note — shown once status is set */}
                      {item.status !== 'unchecked' && (
                        <input
                          type="text"
                          value={item.detail}
                          onChange={e => updateDetail(item._idx, e.target.value)}
                          placeholder="Note…"
                          className="w-28 text-[10px] text-text-muted bg-transparent border-b border-border focus:border-orange focus:outline-none placeholder:text-text-muted/40 text-right"
                        />
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}

            {/* Legend */}
            <div className="flex gap-4 pt-1 text-[10px] text-text-muted border-t border-border">
              <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-green-500" /> Good</span>
              <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-yellow-400" /> Monitor</span>
              <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-red-500" /> Urgent</span>
              <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full border-2 border-slate-300" /> Not checked</span>
            </div>
          </div>
        )}
      </div>

      {/* Notes thread */}
      <div>
        <div className="text-2xs font-medium text-text-muted uppercase tracking-wider mb-2">Notes</div>
        {notes.length > 0 && (
          <div className="space-y-2 mb-3">
            {notes.map(note => (
              <div
                key={note.id}
                className={cn(
                  'rounded-lg px-3 py-2.5',
                  note.type === 'tech'
                    ? 'bg-status-blue-subtle border border-status-blue/20'
                    : 'bg-background border border-border'
                )}
              >
                <div className="flex items-center gap-2 mb-1">
                  <span className={cn('text-2xs font-semibold', note.type === 'tech' ? 'text-status-blue' : 'text-text-muted')}>
                    {note.author}
                  </span>
                  <span className="text-2xs text-text-muted">
                    {new Date(note.createdAt).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                  </span>
                </div>
                <p className="text-xs text-text-primary leading-relaxed">{note.text}</p>
              </div>
            ))}
          </div>
        )}
        <div className="flex gap-2">
          <textarea
            value={newNoteText}
            onChange={e => setNewNoteText(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) addNote() }}
            placeholder={isTech ? 'Tech note — findings, work done…' : 'Advisor note — customer calls, instructions…'}
            rows={2}
            className="flex-1 text-xs bg-surface border border-border rounded-lg px-3 py-2 text-text-primary placeholder:text-text-muted focus:outline-none focus:border-orange focus:ring-1 focus:ring-orange/30 resize-none transition-colors"
          />
          <button
            onClick={addNote}
            disabled={!newNoteText.trim()}
            className="self-end h-8 px-3 rounded-lg bg-orange text-white text-xs font-medium hover:bg-orange/90 disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex-shrink-0"
          >
            Add
          </button>
        </div>
        <p className="text-2xs text-text-muted mt-1">⌘↵ to add</p>
      </div>

      {/* Next service due nudge (Paid only) */}
      {stage === 'Paid' && ro.nextServiceDue && (
        <div className="bg-orange-subtle border border-orange/20 rounded-lg p-3">
          <div className="text-xs font-semibold text-orange mb-1">Next service due</div>
          <div className="text-sm text-text-primary">
            {ro.nextServiceDue.service} in ~{ro.nextServiceDue.miles.toLocaleString()} miles
          </div>
          <button
            onClick={() => { onClose(); navigate(ro.customerId ? `/customers/${ro.customerId}` : '/customers') }}
            className="text-xs text-orange font-medium mt-2 hover:underline"
          >
            View customer profile →
          </button>
        </div>
      )}
    </div>
  )

  // ── Right panel: Estimate — editable services ────────────────────────────
  const rightPanelEstimate = (
    <div className="flex flex-col gap-4">
      <div>
        <div className="text-2xs font-medium text-text-muted uppercase tracking-wider mb-2">Services &amp; Estimate</div>

        <div className="space-y-1.5">
          {services.map((svc, i) => (
            <div key={i} className="flex items-center gap-1.5">
              <input
                type="text"
                placeholder="Service name"
                value={svc.name}
                onChange={e => updateService(i, 'name', e.target.value)}
                className="flex-1 min-w-0 text-sm bg-surface border border-border rounded px-2 py-1.5 text-text-primary placeholder:text-text-muted focus:outline-none focus:border-orange transition-colors"
              />
              <div className="relative w-[72px] flex-shrink-0">
                <span className="absolute left-2 top-1/2 -translate-y-1/2 text-text-muted text-xs pointer-events-none">$</span>
                <input
                  type="number"
                  min="0"
                  step="1"
                  placeholder="0"
                  value={svc.price === 0 || svc.price === '' ? '' : svc.price}
                  onChange={e => updateService(i, 'price', e.target.value === '' ? '' : parseFloat(e.target.value) || 0)}
                  className="w-full text-sm bg-surface border border-border rounded pl-5 pr-2 py-1.5 text-text-primary placeholder:text-text-muted focus:outline-none focus:border-orange transition-colors tabular-nums"
                />
              </div>
              <button
                onClick={() => removeService(i)}
                className="flex-shrink-0 text-text-muted hover:text-red-400 transition-colors p-0.5"
              >
                <X size={13} />
              </button>
            </div>
          ))}
        </div>

        <div className="mt-2 flex items-center gap-2">
          <button
            onClick={addService}
            className="flex items-center gap-1 text-xs font-medium text-orange hover:text-orange-hover transition-colors"
          >
            <Plus size={12} />
            Add service
          </button>
          <span className="text-text-muted text-xs">·</span>
          <button
            onClick={() => { setShowCannedPicker(v => !v); setCannedSearch('') }}
            className="flex items-center gap-1 text-xs font-medium text-text-muted hover:text-text-primary transition-colors"
          >
            <Zap size={11} />
            Quick add
          </button>
        </div>

        {showCannedPicker && (
          <div className="mt-2 border border-border rounded-lg overflow-hidden">
            <div className="p-2 border-b border-border">
              <input
                autoFocus
                type="text"
                value={cannedSearch}
                onChange={e => setCannedSearch(e.target.value)}
                placeholder="Search services…"
                className="w-full text-xs bg-transparent focus:outline-none text-text-primary placeholder:text-text-muted"
              />
            </div>
            <div className="max-h-40 overflow-y-auto">
              {filteredCanned.map(cs => (
                <button
                  key={cs.id}
                  onClick={() => addCannedService(cs)}
                  className="w-full flex items-center justify-between px-3 py-2 hover:bg-surface text-left text-xs transition-colors border-b border-border/50 last:border-0"
                >
                  <div className="min-w-0 mr-2">
                    <div className="text-text-primary truncate">{cs.name}</div>
                    <div className="text-text-muted">{cs.category}</div>
                  </div>
                  <span className="text-text-secondary font-medium tabular-nums flex-shrink-0">
                    {cs.price === 0 ? 'Free' : `$${cs.price.toFixed(2)}`}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {subtotal > 0 && (
        <div className="space-y-1 pt-3 border-t border-border">
          {servicesSubtotal > 0 && (
            <div className="flex justify-between text-xs text-text-muted">
              <span>Labor &amp; services</span>
              <span className="tabular-nums">{formatCurrency(servicesSubtotal)}</span>
            </div>
          )}
          {partsSubtotal > 0 && (
            <div className="flex justify-between text-xs text-text-muted">
              <span>Parts</span>
              <span className="tabular-nums">{formatCurrency(partsSubtotal)}</span>
            </div>
          )}
          <div className="flex justify-between text-xs text-text-muted">
            <span>Tax (8.5%)</span>
            <span className="tabular-nums">{formatCurrency(taxAmount)}</span>
          </div>
          <div className="flex justify-between text-sm font-semibold pt-2 border-t border-border">
            <span className="text-text-primary">Total</span>
            <span className="text-orange tabular-nums">{formatCurrency(grandTotal)}</span>
          </div>
        </div>
      )}

      {subtotal > 0 && (
        <button
          onClick={() => {
            updateRepairOrder(ro.id, { services, partsUsed, total: grandTotal })
            sendEstimateReady(ro.id, grandTotal)
            setEstimateSent(true)
            setTimeout(() => setEstimateSent(false), 3000)
          }}
          className={cn(
            'w-full flex items-center justify-center gap-2 h-9 rounded-lg border text-sm font-medium transition-all duration-150',
            estimateSent
              ? 'border-status-green/30 bg-status-green/5 text-status-green'
              : 'border-border text-text-muted hover:border-orange hover:text-orange transition-colors'
          )}
        >
          {estimateSent
            ? <><Check size={13} /> Estimate sent!</>
            : <><MessageSquare size={13} /> Send estimate to customer</>
          }
        </button>
      )}

      {authStep === 'capturing' ? (
        <div className="space-y-3">
          <div className="text-xs font-medium text-text-muted">How did the customer approve?</div>
          <div className="grid grid-cols-3 gap-2">
            {[
              { id: 'phone',     label: 'Phone call' },
              { id: 'text',      label: 'Text / SMS' },
              { id: 'in-person', label: 'In person' },
            ].map(({ id, label }) => (
              <button
                key={id}
                onClick={() => setAuthMethod(id)}
                className={cn(
                  'rounded-lg border py-2.5 text-xs font-medium transition-all duration-150',
                  authMethod === id
                    ? 'border-orange bg-orange/10 text-orange'
                    : 'border-border text-text-muted hover:border-text-muted hover:text-text-primary'
                )}
              >
                {label}
              </button>
            ))}
          </div>
          <Button className="w-full" onClick={authorizeAndAdvance} loading={saving} disabled={!authMethod}>
            <CheckCircle size={14} /> Confirm Authorization
          </Button>
          <button
            onClick={() => { setAuthStep(null); setAuthMethod(null) }}
            className="w-full text-xs text-text-muted hover:text-text-primary transition-colors"
          >
            Cancel
          </button>
        </div>
      ) : (
        <Button
          className="w-full"
          onClick={() => setAuthStep('capturing')}
          disabled={services.length === 0 || subtotal === 0}
        >
          Customer approved estimate
          <ChevronRight size={14} />
        </Button>
      )}
    </div>
  )

  // ── Right panel: Approved → Complete — read-only summary ─────────────────
  const rightPanelEarly = (
    <div className="flex flex-col gap-4">
      <div>
        <div className="text-2xs font-medium text-text-muted uppercase tracking-wider mb-3">Estimate</div>
        {subtotal > 0 ? (
          <div className="space-y-1.5">
            {services.map((svc, i) => (
              <div key={i} className="flex justify-between text-sm">
                <span className="text-text-muted truncate mr-2">{svc.name}</span>
                <span className="text-text-primary tabular-nums flex-shrink-0">{formatCurrency(Number(svc.price))}</span>
              </div>
            ))}
            <div className="flex justify-between text-xs text-text-muted pt-2 border-t border-border">
              <span>Tax (8.5%)</span>
              <span className="tabular-nums">{formatCurrency(taxAmount)}</span>
            </div>
            <div className="flex justify-between text-sm font-semibold pt-1.5 border-t border-border">
              <span className="text-text-primary">Total</span>
              <span className="text-orange tabular-nums">{formatCurrency(grandTotal)}</span>
            </div>
          </div>
        ) : (
          <p className="text-sm text-text-muted">No estimate on file</p>
        )}
      </div>

      {stage === 'Approved' && ro.authorizedAt && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-status-green-subtle border border-status-green/20">
          <CheckCircle size={12} className="text-status-green flex-shrink-0" />
          <span className="text-xs text-status-green">
            Authorized {ro.authorizedVia ? `via ${ro.authorizedVia}` : ''} · {new Date(ro.authorizedAt).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
          </span>
        </div>
      )}

      {stage === 'Complete' ? (
        isTech ? (
          <div className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-center text-xs text-text-muted">
            Invoicing handled by front desk
          </div>
        ) : (
          <Button className="w-full" onClick={advanceStage} loading={saving}>
            <FileText size={14} />
            Generate Invoice
          </Button>
        )
      ) : currentStageIdx < completeIdx ? (
        <Button className="w-full" onClick={advanceStage} loading={saving}>
          Advance to {RO_STAGES[currentStageIdx + 1]}
          <ChevronRight size={14} />
        </Button>
      ) : null}

      <button
        onClick={copyStatusLink}
        className="w-full flex items-center justify-center gap-2 py-2 rounded-md border border-border text-xs text-text-muted hover:text-text-primary hover:border-orange transition-all duration-150"
      >
        {copied ? <Check size={12} className="text-status-green" /> : <Link2 size={12} />}
        {copied ? 'Link copied!' : 'Copy customer tracking link'}
      </button>
    </div>
  )

  // ── Right panel: payment panel (Invoiced) ────────────────────────────────
  const rightPanelInvoiced = (
    <div className="flex flex-col gap-4">
      <div>
        <div className="text-2xs font-medium text-text-muted uppercase tracking-wider mb-3">Invoice Summary</div>
        <div className="space-y-1.5">
          {services.map((svc, i) => (
            <div key={i} className="flex justify-between text-sm">
              <span className="text-text-muted truncate mr-2">{svc.name}</span>
              <span className="text-text-primary tabular-nums flex-shrink-0">{formatCurrency(Number(svc.price))}</span>
            </div>
          ))}
          <div className="flex justify-between text-sm pt-2 border-t border-border">
            <span className="text-text-muted">Tax (8.5%)</span>
            <span className="text-text-primary tabular-nums">{formatCurrency(taxAmount)}</span>
          </div>
          <div className="flex justify-between items-baseline pt-2 border-t border-border">
            <span className="text-sm font-semibold text-text-primary">Total due</span>
            <span className="text-2xl font-bold text-orange tabular-nums">{formatCurrency(grandTotal)}</span>
          </div>
        </div>
      </div>

      {paymentPending === 'text-to-pay' ? (
        <div className="flex flex-col gap-2.5">
          <div className="bg-orange-subtle border border-orange/20 rounded-lg p-3 text-center">
            <div className="text-xs font-semibold text-orange mb-1">Link sent</div>
            <div className="text-sm text-text-primary">{ro.customerPhone}</div>
            <div className="text-xs text-text-muted mt-1">Waiting for payment…</div>
          </div>
          <Button className="w-full" onClick={() => markPaid('text-to-pay')} loading={saving}>
            Simulate payment received
          </Button>
          <Button variant="secondary" className="w-full" onClick={() => markPaid('cash')} loading={saving}>
            Mark as paid manually
          </Button>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          <button
            onClick={() => setPaymentPending('text-to-pay')}
            className="w-full bg-orange hover:bg-orange-hover text-white rounded-lg p-3 text-left transition-all duration-150 hover:-translate-y-px hover:shadow-[0_0_18px_rgba(249,115,22,0.45)] active:scale-[0.98] focus-visible:outline focus-visible:outline-2 focus-visible:outline-orange focus-visible:outline-offset-2"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-white/20 rounded-md flex items-center justify-center flex-shrink-0">
                <MessageSquare size={15} className="text-white" />
              </div>
              <div>
                <div className="text-sm font-semibold leading-tight">Send text-to-pay link</div>
                <div className="text-xs text-white/75 mt-0.5">
                  Text {formatCurrency(grandTotal)} link to {ro.customerPhone}
                </div>
              </div>
            </div>
          </button>

          <div className="flex items-center gap-2">
            <div className="flex-1 h-px bg-border" />
            <span className="text-2xs text-text-muted whitespace-nowrap">or mark as paid</span>
            <div className="flex-1 h-px bg-border" />
          </div>

          <div className="grid grid-cols-3 gap-2">
            {['cash', 'card', 'check'].map(method => (
              <button
                key={method}
                onClick={() => markPaid(method)}
                className="border border-border rounded-lg py-2.5 text-center text-sm font-medium text-text-secondary hover:border-orange hover:text-text-primary transition-all duration-150 hover:-translate-y-px hover:shadow-[0_0_10px_rgba(249,115,22,0.2)] active:scale-[0.98] capitalize focus-visible:outline focus-visible:outline-2 focus-visible:outline-orange"
              >
                {method.charAt(0).toUpperCase() + method.slice(1)}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )

  // ── Right panel: paid confirmation ───────────────────────────────────────
  const rightPanelPaid = (
    <div className="flex flex-col gap-4">
      <div className="bg-status-green-subtle border border-status-green/20 rounded-xl p-5 text-center">
        <div className="w-11 h-11 rounded-full bg-status-green/20 flex items-center justify-center mx-auto mb-3">
          <CheckCircle size={22} className="text-status-green" />
        </div>
        <div className="text-lg font-bold text-status-green mb-1">
          {formatCurrency(grandTotal)} received
        </div>
        <div className="text-xs text-text-muted">
          {METHOD_LABELS[payment?.method] || 'Paid'} · {paidAt}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <button
          onClick={() => { setReceiptSent(true); setTimeout(() => setReceiptSent(false), 3000) }}
          className={cn(
            'border rounded-lg py-2.5 text-sm font-medium transition-all duration-150 hover:-translate-y-px active:scale-[0.98] flex items-center justify-center gap-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-orange',
            receiptSent
              ? 'border-status-green/30 bg-status-green/5 text-status-green'
              : 'border-border text-text-secondary hover:border-orange hover:text-text-primary hover:shadow-[0_0_10px_rgba(249,115,22,0.2)]'
          )}
        >
          {receiptSent ? <Check size={14} /> : <Phone size={14} />}
          {receiptSent ? 'Receipt sent!' : 'Text receipt'}
        </button>
        <button
          onClick={() => setShowPrintPacket(true)}
          className="border border-border rounded-lg py-2.5 text-sm font-medium text-text-secondary hover:border-orange hover:text-text-primary transition-all duration-150 hover:-translate-y-px hover:shadow-[0_0_10px_rgba(249,115,22,0.2)] active:scale-[0.98] flex items-center justify-center gap-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-orange"
        >
          <FileText size={14} />
          Print packet
        </button>
      </div>

      <button
        onClick={() => setShowNewRO(true)}
        className="w-full border border-border rounded-md py-2.5 px-3 text-left hover:border-orange transition-all duration-150 hover:-translate-y-px hover:shadow-[0_0_10px_rgba(249,115,22,0.2)] active:scale-[0.98] focus-visible:outline focus-visible:outline-2 focus-visible:outline-orange"
      >
        <div className="text-2xs text-text-muted mb-0.5">Start new RO for</div>
        <div className="text-sm font-medium text-text-primary">{ro.customerName} →</div>
      </button>
    </div>
  )

  // ── Tech waiting panel (Estimate — customer hasn't approved yet) ─────────
  const rightPanelTechWaiting = (
    <div className="flex flex-col gap-4">
      <div className="rounded-xl border border-border bg-background p-5 text-center">
        <div className="w-10 h-10 rounded-full bg-border flex items-center justify-center mx-auto mb-3">
          <Clock size={18} className="text-text-muted" />
        </div>
        <div className="text-sm font-semibold text-text-primary mb-1">Waiting on customer</div>
        <div className="text-xs text-text-muted leading-relaxed">The service advisor is waiting for customer approval before this job can start.</div>
      </div>
      {subtotal > 0 && (
        <div className="space-y-1.5">
          {services.map((svc, i) => (
            <div key={i} className="flex justify-between text-sm">
              <span className="text-text-muted truncate mr-2">{svc.name}</span>
              <span className="text-text-primary tabular-nums flex-shrink-0">{formatCurrency(Number(svc.price))}</span>
            </div>
          ))}
          <div className="flex justify-between text-sm font-semibold pt-2 border-t border-border">
            <span className="text-text-primary">Estimate</span>
            <span className="text-orange tabular-nums">{formatCurrency(grandTotal)}</span>
          </div>
        </div>
      )}
    </div>
  )

  // ── Tech work panel (Approved / Waiting Parts / In Progress) ─────────────
  const techStageAction = async (targetStage, extraPatch = {}) => {
    setSaving(true)
    await new Promise(r => setTimeout(r, 300))
    setStage(targetStage)
    updateRepairOrder(ro.id, { stage: targetStage, services, partsUsed, mpi: { ...(ro.mpi || {}), items: mpiItems }, ...extraPatch })
    setSaving(false)
  }

  const rightPanelTechWork = (
    <div className="flex flex-col gap-4">
      {subtotal > 0 && (
        <div className="space-y-1.5">
          <div className="text-2xs font-medium text-text-muted uppercase tracking-wider mb-2">Estimate</div>
          {services.map((svc, i) => (
            <div key={i} className="flex justify-between text-sm">
              <span className="text-text-muted truncate mr-2">{svc.name}</span>
              <span className="text-text-primary tabular-nums flex-shrink-0">{formatCurrency(Number(svc.price))}</span>
            </div>
          ))}
          {partsSubtotal > 0 && (
            <div className="flex justify-between text-xs text-text-muted">
              <span>Parts</span>
              <span className="tabular-nums">{formatCurrency(partsSubtotal)}</span>
            </div>
          )}
          <div className="flex justify-between text-sm font-semibold pt-2 border-t border-border">
            <span className="text-text-primary">Total</span>
            <span className="text-orange tabular-nums">{formatCurrency(grandTotal)}</span>
          </div>
        </div>
      )}

      {stage === 'Approved' && (
        <Button className="w-full" onClick={() => techStageAction('In Progress')} loading={saving}>
          <PlayCircle size={14} /> Start Job
        </Button>
      )}
      {stage === 'Waiting Parts' && (
        <Button className="w-full" onClick={() => techStageAction('In Progress')} loading={saving}>
          <PlayCircle size={14} /> Parts Arrived — Resume Job
        </Button>
      )}
      {stage === 'In Progress' && !partsNeedForm && (
        <>
          <Button className="w-full" onClick={() => techStageAction('Complete')} loading={saving}>
            <Flag size={14} /> Mark Complete
          </Button>
          <button
            onClick={() => setPartsNeedForm(true)}
            className="w-full h-9 rounded-lg border border-status-yellow/30 bg-status-yellow/5 text-status-yellow text-sm font-medium hover:bg-status-yellow/10 transition-colors"
          >
            Need Parts
          </button>
        </>
      )}

      {stage === 'In Progress' && partsNeedForm && (
        <div className="space-y-3">
          <div className="text-xs font-semibold text-text-primary">What parts do you need?</div>
          {partsDraft.map((p, i) => (
            <div key={i} className="space-y-1.5">
              {i > 0 && <div className="border-t border-border pt-3" />}
              <input
                type="text"
                placeholder="Part name / description"
                value={p.name}
                onChange={e => setPartsDraft(d => d.map((x, idx) => idx === i ? { ...x, name: e.target.value } : x))}
                className="w-full text-xs bg-surface border border-border rounded px-2 py-1.5 text-text-primary placeholder:text-text-muted focus:outline-none focus:border-orange transition-colors"
              />
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Part # (optional)"
                  value={p.partNumber}
                  onChange={e => setPartsDraft(d => d.map((x, idx) => idx === i ? { ...x, partNumber: e.target.value } : x))}
                  className="flex-1 text-xs bg-surface border border-border rounded px-2 py-1.5 text-text-primary placeholder:text-text-muted focus:outline-none focus:border-orange transition-colors"
                />
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <span className="text-2xs text-text-muted">Qty</span>
                  <input
                    type="number"
                    min="1"
                    value={p.qty}
                    onChange={e => setPartsDraft(d => d.map((x, idx) => idx === i ? { ...x, qty: e.target.value } : x))}
                    className="w-12 text-xs bg-surface border border-border rounded px-2 py-1.5 text-text-primary focus:outline-none focus:border-orange transition-colors text-center"
                  />
                </div>
              </div>
            </div>
          ))}
          <button
            onClick={() => setPartsDraft(d => [...d, { name: '', partNumber: '', qty: 1 }])}
            className="text-xs text-orange hover:text-orange/80 transition-colors"
          >
            + Add another part
          </button>
          <Button className="w-full" onClick={submitPartsRequest} loading={saving} disabled={!partsDraft[0]?.name.trim()}>
            <Package size={14} /> Submit & Mark Waiting
          </Button>
          <button
            onClick={() => { setPartsNeedForm(false); setPartsDraft([{ name: '', partNumber: '', qty: 1 }]) }}
            className="w-full text-xs text-text-muted hover:text-text-primary transition-colors"
          >
            Cancel
          </button>
        </div>
      )}
    </div>
  )

  // ── Tech completed panel (Complete / Invoiced / Paid — all look the same to a tech)
  const rightPanelTechDone = (
    <div className="flex flex-col gap-4">
      <div className="bg-status-green-subtle border border-status-green/20 rounded-xl p-5 text-center">
        <div className="w-11 h-11 rounded-full bg-status-green/20 flex items-center justify-center mx-auto mb-3">
          <CheckCircle size={22} className="text-status-green" />
        </div>
        <div className="text-base font-semibold text-status-green mb-1">Job complete</div>
        <div className="text-xs text-text-muted">Handed off to service desk for invoicing</div>
      </div>
      {subtotal > 0 && (
        <div className="space-y-1.5 pt-1">
          {services.map((svc, i) => (
            <div key={i} className="flex justify-between text-sm">
              <span className="text-text-muted truncate mr-2">{svc.name}</span>
              <span className="text-text-primary tabular-nums flex-shrink-0">{formatCurrency(Number(svc.price))}</span>
            </div>
          ))}
          {partsSubtotal > 0 && (
            <div className="flex justify-between text-xs text-text-muted">
              <span>Parts</span>
              <span className="tabular-nums">{formatCurrency(partsSubtotal)}</span>
            </div>
          )}
          <div className="flex justify-between text-sm font-semibold pt-2 border-t border-border">
            <span className="text-text-primary">Estimate total</span>
            <span className="text-orange tabular-nums">{formatCurrency(grandTotal)}</span>
          </div>
        </div>
      )}
    </div>
  )

  // ── Panel routing ────────────────────────────────────────────────────────
  const rightPanel =
    isTech && currentStageIdx >= completeIdx ? rightPanelTechDone :
    isTech && stage === 'Estimate'           ? rightPanelTechWaiting :
    isTech                                   ? rightPanelTechWork :
    stage === 'Paid'                         ? rightPanelPaid :
    stage === 'Invoiced'                     ? rightPanelInvoiced :
    stage === 'Estimate'                     ? rightPanelEstimate :
                                               rightPanelEarly

  return (
    <>
      <Modal
        open={open}
        onClose={onClose}
        title={ro.id}
        subtitle={`${ro.vehicle} · ${ro.customerName}`}
        size="xl"
      >
        {stageBar}
        <div className="flex flex-col md:grid md:grid-cols-[3fr_2fr]">
          <div className="p-5 overflow-y-auto md:max-h-[60vh]">
            {leftColumn}
          </div>
          <div className="border-t md:border-t-0 md:border-l border-border p-5 overflow-y-auto md:max-h-[60vh]">
            {rightPanel}
          </div>
        </div>
      </Modal>

      {showNewRO && (
        <NewROModal
          open={showNewRO}
          onClose={() => setShowNewRO(false)}
          preShopId={ro.shopId}
          preCustomerName={ro.customerName}
          preCustomerPhone={ro.customerPhone}
        />
      )}

      {showPrintPacket && (
        <PrintPacketModal
          open={showPrintPacket}
          onClose={() => setShowPrintPacket(false)}
          ro={roForPrint}
          payment={payment}
        />
      )}

      {confirmDeletePartId && (() => {
        const req = partsRequests.find(r => r.id === confirmDeletePartId)
        return (
          <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/60" onClick={() => setConfirmDeletePartId(null)} />
            <div className="relative bg-surface border border-border rounded-xl shadow-2xl w-full max-w-sm p-6">
              <h3 className="text-sm font-semibold text-text-primary mb-1">Remove part request?</h3>
              <p className="text-sm text-text-muted mb-5">
                <span className="font-medium text-text-primary">{req?.name}</span> will be removed from this repair order.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setConfirmDeletePartId(null)}
                  className="flex-1 h-10 rounded-lg border border-border text-sm text-text-muted hover:text-text-primary transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => deletePartRequest(confirmDeletePartId)}
                  className="flex-1 h-10 rounded-lg bg-red-500 text-white text-sm font-semibold hover:bg-red-600 transition-colors"
                >
                  Remove
                </button>
              </div>
            </div>
          </div>
        )
      })()}
    </>
  )
}
