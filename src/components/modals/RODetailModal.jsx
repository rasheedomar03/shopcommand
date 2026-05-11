import { useState } from 'react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { NewROModal } from '@/components/modals/NewROModal'
import { PrintPacketModal } from '@/components/modals/PrintPacketModal'
import { formatCurrency, RO_STAGES } from '@/lib/utils'
import { CheckCircle, MessageSquare, Phone, ChevronRight, ChevronDown, FileText, Plus, X } from 'lucide-react'
import { cn } from '@/lib/utils'

const TAX_RATE = 0.085

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
  const [stage, setStage] = useState(ro?.stage || 'Estimate')
  const [services, setServices] = useState(ro?.services || [])
  const [mpiItems, setMpiItems] = useState(
    ro?.mpi?.items?.length ? ro.mpi.items : DEFAULT_MPI_ITEMS
  )
  const [mpiExpanded, setMpiExpanded] = useState(false)
  const [payment, setPayment] = useState(ro?.payment || null)
  const [paymentPending, setPaymentPending] = useState(null)
  const [saving, setSaving] = useState(false)
  const [showNewRO, setShowNewRO] = useState(false)
  const [showPrintPacket, setShowPrintPacket] = useState(false)

  if (!ro) return null

  const currentStageIdx = RO_STAGES.indexOf(stage)
  const subtotal = services.reduce((sum, s) => sum + (Number(s.price) || 0), 0)
  const taxAmount = Math.round(subtotal * TAX_RATE * 100) / 100
  const grandTotal = subtotal + taxAmount

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
  const addService    = () => setServices(s => [...s, { name: '', price: '' }])
  const removeService = (i) => setServices(s => s.filter((_, idx) => idx !== i))
  const updateService = (i, field, val) => setServices(s =>
    s.map((svc, idx) => idx === i ? { ...svc, [field]: val } : svc)
  )

  const advanceStage = async () => {
    if (currentStageIdx >= RO_STAGES.length - 1) return
    setSaving(true)
    await new Promise(r => setTimeout(r, 400))
    setStage(RO_STAGES[currentStageIdx + 1])
    setSaving(false)
  }

  const markPaid = async (method) => {
    setSaving(true)
    await new Promise(r => setTimeout(r, 300))
    setPayment({ method, paidAt: new Date().toISOString() })
    setStage('Paid')
    setPaymentPending(null)
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
  const stageBar = (
    <div className="px-5 py-3 border-b border-border">
      <div className="flex rounded-md overflow-hidden">
        {RO_STAGES.map((s, i) => {
          const active = i <= currentStageIdx
          const isPaidSegment = s === 'Paid'
          const isCurrent = i === currentStageIdx
          return (
            <div
              key={s}
              className={cn(
                'flex-1 text-center py-1.5 text-xs transition-colors duration-300',
                active && isPaidSegment  ? 'bg-status-green text-white font-semibold' : '',
                active && !isPaidSegment ? 'bg-orange text-white' : '',
                !active ? 'bg-border text-text-muted' : '',
                isCurrent && !isPaidSegment ? 'font-semibold' : ''
              )}
            >
              {isCurrent && isPaidSegment ? '✓ ' : ''}{s}
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

  // ── Left column ──────────────────────────────────────────────────────────
  const isPastComplete = currentStageIdx >= RO_STAGES.indexOf('Complete')

  const leftColumn = (
    <div className="flex flex-col gap-5">
      {/* Customer / Vehicle / Tech row */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Customer',   value: ro.customerName },
          { label: 'Vehicle',    value: ro.vehicle },
          { label: 'Technician', value: ro.techName || 'Unassigned' },
        ].map(({ label, value }) => (
          <div key={label}>
            <div className="text-2xs font-medium text-text-muted uppercase tracking-wider mb-1">{label}</div>
            <div className="text-sm font-medium text-text-primary leading-snug">{value}</div>
          </div>
        ))}
      </div>

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
            {services.map((svc, i) => (
              <div key={i} className="flex items-center justify-between gap-3 text-sm">
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
                {Number(svc.price) > 0 && (
                  <span className="text-text-secondary font-medium tabular-nums flex-shrink-0">
                    {formatCurrency(Number(svc.price))}
                  </span>
                )}
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-text-muted">No services added yet</p>
        )}
      </div>

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

      {/* Next service due nudge (Paid only) */}
      {stage === 'Paid' && ro.nextServiceDue && (
        <div className="bg-orange-subtle border border-orange/20 rounded-lg p-3">
          <div className="text-xs font-semibold text-orange mb-1">Next service due</div>
          <div className="text-sm text-text-primary">
            {ro.nextServiceDue.service} in ~{ro.nextServiceDue.miles.toLocaleString()} miles
          </div>
          <div className="text-xs text-orange font-medium mt-2 cursor-pointer">
            Schedule next appointment →
          </div>
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

        <button
          onClick={addService}
          className="mt-2 flex items-center gap-1 text-xs font-medium text-orange hover:text-orange-hover transition-colors"
        >
          <Plus size={12} />
          Add service
        </button>
      </div>

      {subtotal > 0 && (
        <div className="space-y-1 pt-3 border-t border-border">
          <div className="flex justify-between text-xs text-text-muted">
            <span>Subtotal</span>
            <span className="tabular-nums">{formatCurrency(subtotal)}</span>
          </div>
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

      <Button
        className="w-full"
        onClick={advanceStage}
        loading={saving}
        disabled={services.length === 0 || subtotal === 0}
      >
        Send estimate to customer
        <ChevronRight size={14} />
      </Button>
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

      {stage === 'Complete' ? (
        <Button className="w-full" onClick={advanceStage} loading={saving}>
          <FileText size={14} />
          Generate Invoice
        </Button>
      ) : currentStageIdx < RO_STAGES.indexOf('Invoiced') ? (
        <Button className="w-full" onClick={advanceStage} loading={saving}>
          Advance to {RO_STAGES[currentStageIdx + 1]}
          <ChevronRight size={14} />
        </Button>
      ) : null}
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
        <button className="border border-border rounded-lg py-2.5 text-sm font-medium text-text-secondary hover:border-orange hover:text-text-primary transition-all duration-150 hover:-translate-y-px hover:shadow-[0_0_10px_rgba(249,115,22,0.2)] active:scale-[0.98] flex items-center justify-center gap-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-orange">
          <Phone size={14} />
          Text receipt
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

  // ── Panel routing ────────────────────────────────────────────────────────
  const rightPanel =
    stage === 'Paid'     ? rightPanelPaid :
    stage === 'Invoiced' ? rightPanelInvoiced :
    stage === 'Estimate' ? rightPanelEstimate :
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
        <div className="grid grid-cols-[3fr_2fr] overflow-hidden">
          <div className="p-5 overflow-y-auto max-h-[65vh]">
            {leftColumn}
          </div>
          <div className="border-l border-border p-5 overflow-y-auto max-h-[65vh]">
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
    </>
  )
}
