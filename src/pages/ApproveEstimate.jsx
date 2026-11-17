import { useState, useEffect, useCallback } from 'react'
import { useParams } from 'react-router-dom'
import { CheckCircle2, XCircle, Clock, Phone, MapPin, Loader2, AlertTriangle } from 'lucide-react'
import { cn } from '@/lib/utils'

// Exact cents: the customer is authorizing this precise amount. (The app's
// shared formatCurrency rounds to whole dollars, which would misstate it.)
const usd = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' })

// Public, mobile-first page a customer opens from an emailed link or QR code
// to approve or decline an estimate. No login: the link's token is the key.

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

function Shell({ children }) {
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
      <main className="flex-1 flex items-start justify-center px-4 py-8">
        <div className="w-full max-w-sm space-y-4">{children}</div>
      </main>
    </div>
  )
}

function ShopCard({ est }) {
  return (
    <div className="bg-surface border border-border rounded-xl p-5">
      <div className="text-2xs font-medium text-text-muted uppercase tracking-wider mb-3">Shop contact</div>
      <div className="text-sm font-semibold text-text-primary">{est.shopName}</div>
      {est.shopAddress && (
        <div className="flex items-start gap-1.5 text-xs text-text-muted mt-1.5">
          <MapPin size={11} className="mt-0.5 flex-shrink-0" />
          {est.shopAddress}
        </div>
      )}
      {est.shopPhone && (
        <a
          href={`tel:${est.shopPhone}`}
          className="flex items-center gap-1.5 text-sm text-orange mt-2 font-medium"
        >
          <Phone size={12} />
          {est.shopPhone}
        </a>
      )}
    </div>
  )
}

function Notice({ icon: Icon, tone = 'neutral', title, children }) {
  const tones = {
    neutral: 'bg-surface border-border',
    good: 'bg-status-green/5 border-status-green/25',
    warn: 'bg-status-yellow/5 border-status-yellow/25',
  }
  const iconTones = { neutral: 'text-text-muted', good: 'text-status-green', warn: 'text-status-yellow' }
  return (
    <div className={cn('rounded-2xl border p-6 text-center', tones[tone])}>
      <Icon size={28} className={cn('mx-auto mb-3', iconTones[tone])} />
      <div className="text-lg font-bold text-text-primary mb-1">{title}</div>
      <p className="text-sm text-text-muted leading-relaxed">{children}</p>
    </div>
  )
}

export default function ApproveEstimate() {
  const { roId, token } = useParams()
  const [est, setEst] = useState(null)
  const [loading, setLoading] = useState(true)
  const [invalid, setInvalid] = useState(false)
  const [name, setName] = useState('')
  const [agreed, setAgreed] = useState(false)
  const [confirmDecline, setConfirmDecline] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  // Token pages should never be indexed
  useEffect(() => {
    const meta = document.createElement('meta')
    meta.name = 'robots'
    meta.content = 'noindex, nofollow'
    document.head.appendChild(meta)
    return () => { document.head.removeChild(meta) }
  }, [])

  const load = useCallback(async () => {
    try {
      const res = await fetch(
        `/api/health?action=approval&roId=${encodeURIComponent(roId)}&token=${encodeURIComponent(token)}`
      )
      if (!res.ok) throw new Error('invalid')
      const data = await res.json()
      // A shop with no name saved still reads naturally
      setEst({ ...data, shopName: data.shopName || 'the shop' })
      setInvalid(false)
    } catch {
      setInvalid(true)
    }
    setLoading(false)
  }, [roId, token])

  useEffect(() => { load() }, [load])

  const respond = async (decision) => {
    setSubmitting(true)
    setError('')
    setNotice('')
    try {
      const res = await fetch('/api/health?action=approval-respond', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roId, token, decision, name, total: est.total }),
      })
      const data = await res.json().catch(() => ({}))
      if (res.ok) {
        await load()
      } else if (res.status === 409) {
        // Estimate changed, or it was already handled: show the fresh state.
        if (data.code === 'estimate_changed') {
          setNotice('The shop updated this estimate. Please review the new total below.')
          setAgreed(false)
        }
        await load()
      } else {
        setError(data.error || 'Something went wrong. Please call the shop.')
      }
    } catch {
      setError('Could not reach the server. Check your connection and try again.')
    }
    setSubmitting(false)
    setConfirmDecline(false)
  }

  if (loading) {
    return (
      <Shell>
        <div className="flex justify-center py-16"><Loader2 size={24} className="text-orange animate-spin" /></div>
      </Shell>
    )
  }

  if (invalid || !est) {
    return (
      <Shell>
        <Notice icon={AlertTriangle} tone="warn" title="Link not valid">
          This estimate link is not valid. Please contact the shop for a new one.
        </Notice>
      </Shell>
    )
  }

  const { state } = est

  if (state === 'expired' || state === 'closed') {
    return (
      <Shell>
        <Notice icon={Clock} title={state === 'expired' ? 'This link has expired' : 'This estimate is no longer open'}>
          Please contact the shop and they will help you directly.
        </Notice>
        <ShopCard est={est} />
      </Shell>
    )
  }

  const money = n => usd.format(Number(n) || 0)
  const lines = [
    ...est.services.map(s => ({ label: s.name, amount: s.price })),
    ...est.parts.map(p => ({ label: p.qty > 1 ? `${p.name} (x${p.qty})` : p.name, amount: p.price * p.qty })),
  ]

  return (
    <Shell>
      {state === 'approved' && (
        <Notice icon={CheckCircle2} tone="good" title="Estimate approved">
          Thank you{est.approvedBy ? `, ${est.approvedBy}` : ''}. {est.shopName} has been notified and will start on your vehicle.
        </Notice>
      )}
      {state === 'declined' && (
        <Notice icon={XCircle} title="Estimate declined">
          The shop has been notified and may contact you. You can also call them below.
        </Notice>
      )}
      {notice && (
        <div className="rounded-xl border border-status-yellow/25 bg-status-yellow/5 px-4 py-3 text-sm text-text-primary">
          {notice}
        </div>
      )}

      <div className="bg-surface border border-border rounded-xl p-5">
        <div className="text-2xs font-medium text-text-muted uppercase tracking-wider mb-3">
          Estimate {est.roNumber}
        </div>
        <div className="text-lg font-semibold text-text-primary">{est.vehicle || 'Your vehicle'}</div>
        {est.customerName && <div className="text-sm text-text-muted mt-0.5">{est.customerName}</div>}
      </div>

      <div className="bg-surface border border-border rounded-xl p-5">
        <div className="text-2xs font-medium text-text-muted uppercase tracking-wider mb-3">Work and parts</div>
        <div className="space-y-2">
          {lines.map((l, i) => (
            <div key={i} className="flex justify-between gap-3 text-sm">
              <span className="text-text-primary min-w-0 break-words">{l.label}</span>
              <span className="text-text-primary tabular-nums flex-shrink-0">{money(l.amount)}</span>
            </div>
          ))}
        </div>
        <div className="mt-3 pt-3 border-t border-border space-y-1.5">
          <div className="flex justify-between text-xs text-text-muted">
            <span>Subtotal</span><span className="tabular-nums">{money(est.subtotal)}</span>
          </div>
          <div className="flex justify-between text-xs text-text-muted">
            <span>Tax (8.5%)</span><span className="tabular-nums">{money(est.tax)}</span>
          </div>
          <div className="flex justify-between text-base font-semibold pt-1">
            <span className="text-text-primary">Total</span>
            <span className="text-orange tabular-nums">{money(est.total)}</span>
          </div>
        </div>
      </div>

      {state === 'pending' && (
        <div className="bg-surface border border-border rounded-xl p-5 space-y-4">
          <label className="flex items-start gap-3 text-sm text-text-primary">
            <input
              type="checkbox"
              checked={agreed}
              onChange={e => setAgreed(e.target.checked)}
              className="mt-0.5 h-5 w-5 flex-shrink-0 accent-orange"
            />
            <span>I authorize {est.shopName} to perform this work for the estimated total of {money(est.total)}.</span>
          </label>
          <div>
            <label htmlFor="signer" className="block text-xs text-text-muted mb-1.5">Type your full name</label>
            <input
              id="signer"
              value={name}
              onChange={e => setName(e.target.value)}
              autoComplete="name"
              maxLength={100}
              className="w-full h-11 px-3 rounded-lg bg-background border border-border text-base text-text-primary focus:outline-none focus:ring-1 focus:ring-orange/40"
            />
          </div>
          {error && <div className="text-sm text-status-red">{error}</div>}
          <button
            onClick={() => respond('approve')}
            disabled={submitting || !agreed || name.trim().length < 2}
            className="w-full h-12 rounded-lg bg-orange text-white font-semibold text-base disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {submitting ? 'Sending...' : 'Approve estimate'}
          </button>

          {confirmDecline ? (
            <div className="space-y-2">
              <div className="text-sm text-text-muted text-center">Decline this estimate?</div>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setConfirmDecline(false)}
                  className="h-11 rounded-lg border border-border text-sm text-text-primary"
                >
                  Go back
                </button>
                <button
                  onClick={() => respond('decline')}
                  disabled={submitting}
                  className="h-11 rounded-lg border border-status-red/40 text-sm text-status-red disabled:opacity-40"
                >
                  Yes, decline
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setConfirmDecline(true)}
              disabled={submitting}
              className="w-full h-11 rounded-lg border border-border text-sm text-text-muted"
            >
              Decline
            </button>
          )}
          <p className="text-2xs text-text-muted text-center leading-relaxed">
            Questions? Call the shop before you decide.
          </p>
        </div>
      )}

      <ShopCard est={est} />
    </Shell>
  )
}
