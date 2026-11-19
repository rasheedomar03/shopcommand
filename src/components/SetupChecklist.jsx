import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Check, ChevronRight, X } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { useData } from '@/contexts/DataContext'
import { getTrialStatus, startCheckout } from '@/lib/billing'
import { setupSteps, setupProgress } from '@/lib/setupChecklist'
import { cn } from '@/lib/utils'

/**
 * "Finish setting up" card for new owners, shown at the top of the dashboard
 * until the required steps are done (or they hide it). Everything is derived
 * from data the app already loads, so nothing new is stored on the server;
 * only the "hide" choice is remembered in this browser.
 */
export function SetupChecklist({ onNewRO }) {
  const { session } = useAuth()
  const { shops, repairOrders, invoices, parts, technicians, loading, fetchError } = useData()
  const navigate = useNavigate()
  const hideKey = `sc_setup_hidden_${session?.orgId || 'org'}`

  const [hidden, setHidden] = useState(() => {
    try { return localStorage.getItem(hideKey) === '1' } catch { return false }
  })
  const [trial, setTrial] = useState(null)
  const [redirecting, setRedirecting] = useState(false)

  const isOwner = session?.role === 'owner'

  useEffect(() => {
    if (!isOwner || session?.demo) return
    let cancelled = false
    getTrialStatus().then(t => { if (!cancelled) setTrial(t) }).catch(() => {})
    return () => { cancelled = true }
  }, [isOwner, session?.demo])

  // Wait for real data, and never guess "not done" from a failed load
  if (!isOwner || loading || fetchError || hidden) return null

  const steps = setupSteps({ shops, repairOrders, invoices, parts, technicians, trial })
  const { done, total, complete } = setupProgress(steps)
  if (complete) return null

  const run = async (step) => {
    if (step.action === 'new-ro') return onNewRO?.()
    if (step.action === 'checkout') {
      setRedirecting(true)
      try { await startCheckout() } catch { setRedirecting(false) }
      return
    }
    if (step.to) navigate(step.to)
  }

  const hide = () => {
    setHidden(true)
    try { localStorage.setItem(hideKey, '1') } catch { /* per-viewer convenience only */ }
  }

  return (
    <section className="rounded-xl border border-orange/25 bg-orange/[0.04] p-4" aria-label="Finish setting up">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-text-primary">Finish setting up</h2>
          <p className="text-xs text-text-muted mt-0.5">{done} of {total} done. A few quick steps and ShopCommand is ready for your shop.</p>
        </div>
        <button
          onClick={hide}
          className="p-1.5 -m-1.5 rounded-md text-text-muted hover:text-text-primary transition-colors"
          aria-label="Hide this checklist"
          title="Hide this checklist"
        >
          <X size={14} />
        </button>
      </div>

      <div className="mt-3 h-1.5 rounded-full bg-border overflow-hidden" aria-hidden="true">
        <div className="h-full rounded-full bg-orange transition-all" style={{ width: `${Math.round((done / total) * 100)}%` }} />
      </div>

      <ul className="mt-3 divide-y divide-border/60">
        {steps.map(step => (
          <li key={step.id}>
            <button
              onClick={() => !step.done && run(step)}
              disabled={step.done || (step.action === 'checkout' && redirecting)}
              className={cn(
                'w-full flex items-center gap-3 py-2.5 text-left transition-colors',
                step.done ? 'cursor-default' : 'hover:bg-orange/[0.06] rounded-md px-2 -mx-2'
              )}
            >
              <span
                className={cn(
                  'w-5 h-5 rounded-full border flex items-center justify-center flex-shrink-0',
                  step.done ? 'bg-status-green border-status-green text-white' : 'border-border-hover'
                )}
                aria-hidden="true"
              >
                {step.done && <Check size={12} strokeWidth={3} />}
              </span>
              <span className="flex-1 min-w-0">
                <span className={cn('block text-xs font-medium', step.done ? 'text-text-muted line-through' : 'text-text-primary')}>
                  {step.label}
                  {step.optional && !step.done && <span className="ml-1.5 text-2xs font-normal text-text-muted">(optional)</span>}
                </span>
                {!step.done && step.hint && <span className="block text-2xs text-text-muted mt-0.5">{step.hint}</span>}
              </span>
              {!step.done && <ChevronRight size={14} className="text-text-muted flex-shrink-0" />}
            </button>
          </li>
        ))}
      </ul>
    </section>
  )
}
