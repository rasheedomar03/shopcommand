import { useState } from 'react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { NewROModal } from '@/components/modals/NewROModal'
import { PrintPacketModal } from '@/components/modals/PrintPacketModal'
import { formatCurrency, RO_STAGES } from '@/lib/utils'
import { CheckCircle, MessageSquare, Phone, ChevronRight, FileText } from 'lucide-react'
import { cn } from '@/lib/utils'

const TAX_RATE = 0.085

const METHOD_LABELS = {
  'text-to-pay': 'Text-to-pay',
  'cash': 'Cash',
  'card': 'Card',
  'check': 'Check',
}

export function RODetailModal({ open, onClose, ro }) {
  const [stage, setStage] = useState(ro?.stage || 'Estimate')
  const [payment, setPayment] = useState(ro?.payment || null)
  const [paymentPending, setPaymentPending] = useState(null)
  const [saving, setSaving] = useState(false)
  const [showNewRO, setShowNewRO] = useState(false)
  const [showPrintPacket, setShowPrintPacket] = useState(false)

  if (!ro) return null

  const currentStageIdx = RO_STAGES.indexOf(stage)
  const subtotal = ro.total
  const taxAmount = Math.round(subtotal * TAX_RATE * 100) / 100
  const grandTotal = subtotal + taxAmount

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
        <div className="space-y-2">
          {ro.services.map((svc, i) => (
            <div key={i} className="flex items-center justify-between gap-3 text-sm">
              <div className="flex items-center gap-2 min-w-0">
                {isPastComplete ? (
                  <CheckCircle size={13} className="text-status-green flex-shrink-0" />
                ) : (
                  <div className="w-1.5 h-1.5 rounded-full bg-orange flex-shrink-0" />
                )}
                <span className="text-text-primary truncate">{svc.name}</span>
              </div>
              {svc.price > 0 && (
                <span className="text-text-secondary font-medium tabular-nums flex-shrink-0">
                  {formatCurrency(svc.price)}
                </span>
              )}
            </div>
          ))}
        </div>
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

  // ── Right panel: pre-invoice stages ─────────────────────────────────────
  const rightPanelEarly = (
    <div className="flex flex-col gap-4">
      <div>
        <div className="text-2xs font-medium text-text-muted uppercase tracking-wider mb-3">Financials</div>
        {ro.total > 0 ? (
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-text-muted">Parts</span>
              <span className="text-text-primary tabular-nums">{formatCurrency(ro.parts)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-text-muted">Labor</span>
              <span className="text-text-primary tabular-nums">{formatCurrency(ro.labor)}</span>
            </div>
            <div className="flex justify-between text-sm pt-2 border-t border-border">
              <span className="font-semibold text-text-primary">Total</span>
              <span className="font-semibold text-orange tabular-nums">{formatCurrency(ro.total)}</span>
            </div>
          </div>
        ) : (
          <p className="text-sm text-text-muted">Awaiting estimate approval</p>
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
      {/* Invoice summary */}
      <div>
        <div className="text-2xs font-medium text-text-muted uppercase tracking-wider mb-3">Invoice Summary</div>
        <div className="space-y-1.5">
          {ro.services.map((svc, i) => (
            <div key={i} className="flex justify-between text-sm">
              <span className="text-text-muted truncate mr-2">{svc.name}</span>
              <span className="text-text-primary tabular-nums flex-shrink-0">{formatCurrency(svc.price)}</span>
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

      {/* Payment actions */}
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
          {/* Text-to-pay — primary */}
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

          {/* Divider */}
          <div className="flex items-center gap-2">
            <div className="flex-1 h-px bg-border" />
            <span className="text-2xs text-text-muted whitespace-nowrap">or mark as paid</span>
            <div className="flex-1 h-px bg-border" />
          </div>

          {/* Cash / Card / Check */}
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
      {/* Green success card */}
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

      {/* Text receipt + Print packet */}
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

      {/* Start new RO */}
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
        <div className="grid grid-cols-[3fr_2fr]">
          <div className="p-5">
            {leftColumn}
          </div>
          <div className="border-l border-border p-5">
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
          ro={ro}
          payment={payment}
        />
      )}
    </>
  )
}
