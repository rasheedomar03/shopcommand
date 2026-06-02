import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { RO_STAGES, formatRelativeTime } from '@/lib/utils'
import { cn } from '@/lib/utils'
import { MapPin, Phone, Clock, CheckCircle2, Wrench, Package, FileText, DollarSign, Loader2 } from 'lucide-react'

const STAGE_INFO = {
  'Estimate':       { msg: "We're putting together an estimate for your vehicle. We'll reach out shortly.", icon: FileText },
  'Approved':       { msg: "Your estimate has been approved. Your job is queued and ready to start.", icon: CheckCircle2 },
  'In Progress':    { msg: "Your vehicle is currently being worked on by our technician.", icon: Wrench },
  'Waiting Parts':  { msg: "We're waiting on parts to arrive before we can continue. We'll update you soon.", icon: Package },
  'Complete':       { msg: "Work is complete! We're finishing up the paperwork and will notify you shortly.", icon: CheckCircle2 },
  'Invoiced':       { msg: "Your vehicle is ready for pickup. Payment is due at pickup.", icon: FileText },
  'Paid':           { msg: "All done! Thank you for choosing us. See you next time.", icon: DollarSign },
}

function HexMark({ size = 22 }) {
  const pts = (cx, cy, r) =>
    [90, 30, -30, -90, -150, 150]
      .map(deg => {
        const a = (deg * Math.PI) / 180
        return `${(cx + r * Math.cos(a)).toFixed(2)},${(cy - r * Math.sin(a)).toFixed(2)}`
      })
      .join(' ')
  const R = 28, r = R * 0.56
  return (
    <svg width={size} height={size} viewBox="0 0 64 64">
      <polygon points={pts(32, 32, R)} fill="#F97316" />
      <polygon points={pts(32, 32.5, r)} fill="#0D0E14" />
    </svg>
  )
}

export default function CustomerStatus() {
  const { roId } = useParams()
  const [ro, setRO] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    if (!roId) { setLoading(false); setError(true); return }
    fetch(`/api/health?action=status&roId=${encodeURIComponent(roId)}`)
      .then(r => r.ok ? r.json() : Promise.reject())
      .then(data => { setRO(data); setLoading(false) })
      .catch(() => { setError(true); setLoading(false) })
  }, [roId])

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6">
        <Loader2 size={24} className="text-orange animate-spin" />
      </div>
    )
  }

  if (error || !ro) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6">
        <div className="flex items-center gap-2 mb-8">
          <HexMark size={32} />
          <span className="text-lg font-semibold text-text-primary" style={{ letterSpacing: '-0.02em' }}>
            Shop<span className="text-orange">Command</span>
          </span>
        </div>
        <div className="text-center">
          <div className="text-3xl font-bold text-text-muted mb-2">Not Found</div>
          <div className="text-sm text-text-muted">We couldn't find that repair order. Check the link and try again.</div>
        </div>
      </div>
    )
  }

  const stageIdx = RO_STAGES.indexOf(ro.stage)
  const isPaid = ro.stage === 'Paid'
  const isReady = ['Invoiced', 'Paid'].includes(ro.stage)
  const info = STAGE_INFO[ro.stage] || { msg: 'Your vehicle is in our care.', icon: Wrench }
  const StageIcon = info.icon

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="h-14 border-b border-border flex items-center px-5">
        <div className="flex items-center gap-2">
          <HexMark size={24} />
          <span className="text-base font-semibold text-text-primary" style={{ letterSpacing: '-0.02em' }}>
            Shop<span className="text-orange">Command</span>
          </span>
        </div>
      </header>

      <main className="flex-1 flex items-start justify-center px-4 py-10">
        <div className="w-full max-w-sm space-y-4">

          <div className={cn(
            'rounded-2xl border p-6 text-center',
            isPaid    ? 'bg-status-green/5 border-status-green/25' :
            isReady   ? 'bg-orange/5 border-orange/25' :
                        'bg-surface border-border'
          )}>
            <div className={cn(
              'w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4',
              isPaid ? 'bg-status-green/15' : isReady ? 'bg-orange/10' : 'bg-border'
            )}>
              <StageIcon size={22} className={cn(
                isPaid ? 'text-status-green' : isReady ? 'text-orange' : 'text-text-muted'
              )} />
            </div>
            <div className={cn(
              'text-2xl font-bold mb-2',
              isPaid ? 'text-status-green' : isReady ? 'text-orange' : 'text-text-primary'
            )}>
              {ro.stage}
            </div>
            <p className="text-sm text-text-muted leading-relaxed">{info.msg}</p>
          </div>

          <div className="flex gap-1 px-1">
            {RO_STAGES.map((s, i) => (
              <div
                key={s}
                title={s}
                className={cn(
                  'flex-1 h-1.5 rounded-full transition-colors duration-500',
                  i <= stageIdx ? (isPaid ? 'bg-status-green' : 'bg-orange') : 'bg-border'
                )}
              />
            ))}
          </div>
          <div className="flex justify-between text-2xs text-text-muted px-1">
            <span>Estimate</span>
            <span>Paid</span>
          </div>

          <div className="bg-surface border border-border rounded-xl p-5">
            <div className="text-2xs font-medium text-text-muted uppercase tracking-wider mb-3">Your Vehicle</div>
            <div className="text-lg font-semibold text-text-primary">{ro.vehicle}</div>
            <div className="text-sm text-text-muted mt-0.5">{ro.customerName}</div>
            <div className="flex items-center gap-1.5 text-xs text-text-muted mt-3">
              <Clock size={11} />
              Last updated {formatRelativeTime(ro.updatedAt)}
            </div>
          </div>

          {ro.shopName && (
            <div className="bg-surface border border-border rounded-xl p-5">
              <div className="text-2xs font-medium text-text-muted uppercase tracking-wider mb-3">Shop Contact</div>
              <div className="text-sm font-semibold text-text-primary">{ro.shopName}</div>
              {ro.shopAddress && (
                <div className="flex items-start gap-1.5 text-xs text-text-muted mt-1.5">
                  <MapPin size={11} className="mt-0.5 flex-shrink-0" />
                  {ro.shopAddress}
                </div>
              )}
              {ro.shopPhone && (
                <a
                  href={`tel:${ro.shopPhone}`}
                  className="flex items-center gap-1.5 text-xs text-orange hover:underline mt-1.5 font-medium"
                >
                  <Phone size={11} />
                  {ro.shopPhone}
                </a>
              )}
            </div>
          )}

          <div className="text-center text-2xs text-text-muted py-2">
            {ro.roNumber} · Questions? Call the shop above.
          </div>
        </div>
      </main>
    </div>
  )
}
