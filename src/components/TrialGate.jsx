import { useState } from 'react'
import { X } from 'lucide-react'
import { startCheckout } from '@/lib/billing'
import { useAuth } from '@/contexts/AuthContext'
import { HexDot, HexPattern } from '@/components/Hex'

const HEX = '16,2 28.1,9 28.1,23 16,30 3.9,23 3.9,9'

/**
 * Countdown strip for owners whose org is on the free trial.
 * Dismiss hides it for the session; it returns next visit until they pay.
 */
export function TrialBanner({ daysLeft }) {
  const [dismissed, setDismissed] = useState(() => {
    try { return sessionStorage.getItem('sc_trial_banner_dismissed') === '1' } catch { return false }
  })
  const [redirecting, setRedirecting] = useState(false)
  if (dismissed) return null

  const urgent = daysLeft <= 3

  return (
    <div className={`flex items-center gap-3 px-4 py-2 text-xs border-b ${urgent ? 'bg-status-red/10 border-status-red/20' : 'bg-orange-subtle border-orange/20'}`}>
      <HexDot size={9} color={urgent ? '#EF4444' : '#F97316'} />
      <span className="text-text-primary font-medium">
        {daysLeft === 0 ? 'Last day of your free trial.' : `${daysLeft} day${daysLeft === 1 ? '' : 's'} left in your free trial.`}
        <span className="text-text-muted font-normal"> Lock in the $100/mo founding rate for life.</span>
      </span>
      <button
        onClick={async () => { setRedirecting(true); try { await startCheckout() } catch { setRedirecting(false) } }}
        disabled={redirecting}
        className={`ml-auto flex-shrink-0 h-7 px-3 rounded-md text-white text-xs font-semibold transition-colors disabled:opacity-60 ${urgent ? 'bg-status-red hover:bg-status-red/90' : 'bg-orange hover:bg-orange-hover'}`}
      >
        {redirecting ? 'Redirecting…' : 'Start free trial'}
      </button>
      <button
        onClick={() => { setDismissed(true); try { sessionStorage.setItem('sc_trial_banner_dismissed', '1') } catch { /* per-session nicety */ } }}
        aria-label="Dismiss"
        className="flex-shrink-0 text-text-muted hover:text-text-primary transition-colors"
      >
        <X size={14} />
      </button>
    </div>
  )
}

/**
 * Full-screen lock once the trial has ended without a subscription.
 * Owners get checkout; everyone else gets pointed to the owner.
 * Data is never touched — paying picks up exactly where they left off.
 */
export function TrialLock() {
  const { session, logout } = useAuth()
  const [redirecting, setRedirecting] = useState(false)
  const isOwner = session?.role === 'owner'

  return (
    <div className="relative min-h-screen bg-background flex items-center justify-center px-6 overflow-hidden">
      <HexPattern className="absolute inset-0 opacity-[0.04]" />
      <div className="relative max-w-md text-center">
        <div className="relative w-14 h-14 mx-auto mb-6 flex items-center justify-center">
          <svg width="56" height="56" viewBox="0 0 32 32" className="absolute inset-0" aria-hidden="true">
            <polygon points={HEX} fill="rgba(249,115,22,0.1)" stroke="#F97316" strokeWidth="1.5" />
          </svg>
          <span className="relative text-orange text-xl font-bold">!</span>
        </div>
        <h1 className="font-display text-2xl font-bold text-text-primary mb-3">Your free trial has ended</h1>
        {isOwner ? (
          <>
            <p className="text-sm text-text-muted leading-relaxed mb-2">
              Everything is exactly where you left it: every repair order, customer, part, and invoice. Start your plan and pick up where you stopped.
            </p>
            <p className="text-sm text-text-secondary font-medium mb-6">
              $100/mo for your first shop + $50/mo per additional location. Founding rate, locked for life.
            </p>
            <button
              onClick={async () => { setRedirecting(true); try { await startCheckout() } catch { setRedirecting(false) } }}
              disabled={redirecting}
              className="inline-flex items-center h-10 px-5 rounded-lg bg-orange text-white text-sm font-semibold hover:bg-orange-hover disabled:opacity-60 transition-colors"
            >
              {redirecting ? 'Redirecting to Stripe…' : 'Start my plan'}
            </button>
            <p className="text-xs text-text-muted mt-5">
              Questions? Email <a href="mailto:hello@shopcommand.net" className="text-orange hover:underline">hello@shopcommand.net</a> and you'll get the founder.
            </p>
          </>
        ) : (
          <>
            <p className="text-sm text-text-muted leading-relaxed mb-6">
              Your shop's free trial is over. Ask the shop owner to activate the plan and everything will be right back, nothing is lost.
            </p>
          </>
        )}
        <button onClick={logout} className="mt-4 text-xs text-text-muted hover:text-text-primary underline underline-offset-2 transition-colors">
          Sign out
        </button>
      </div>
    </div>
  )
}
