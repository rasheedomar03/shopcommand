import { useState } from 'react'
import { Truck } from 'lucide-react'

/**
 * Settings switch for the Fleet page. Off by default: a mechanic who works on
 * customers' cars does not need it. A shop that runs its own trucks turns it on
 * and gets the Fleet page in the sidebar. Turning it off only hides the page;
 * trucks and invoices are kept.
 */
export function FleetToggle({ shops, onUpdate }) {
  const on = shops.some(s => s.fleetEnabled)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  const flip = async () => {
    setSaving(true)
    setError(null)
    try {
      if (on) {
        // off everywhere it is on
        for (const s of shops.filter(x => x.fleetEnabled)) await onUpdate(s.id, { fleet_enabled: false })
      } else if (shops[0]) {
        await onUpdate(shops[0].id, { fleet_enabled: true })
      }
    } catch (err) {
      setError(err?.message || 'Could not change this setting.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="px-5 py-4 border-b border-border flex items-start gap-3">
      <div className="mt-0.5 w-8 h-8 rounded-lg bg-orange/10 border border-orange/20 flex items-center justify-center flex-shrink-0">
        <Truck size={15} className="text-orange" strokeWidth={1.8} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-semibold text-text-primary">Track my own trucks (Fleet)</div>
        <p className="text-xs text-text-muted mt-0.5 leading-relaxed">
          For shops that run their own trucks or vehicles. Adds a Fleet page with each truck's history and cost, and invoices for your own trucks stay out of revenue. Leave it off if you only repair customers' vehicles.
        </p>
        {error && <p className="mt-1 text-xs font-medium text-status-red" role="alert">{error}</p>}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={on}
        aria-label="Track my own trucks"
        onClick={flip}
        disabled={saving || shops.length === 0}
        className={`relative inline-flex h-6 w-11 flex-shrink-0 items-center rounded-full transition-colors disabled:opacity-50 ${on ? 'bg-orange' : 'bg-border'}`}
      >
        <span className={`inline-block h-5 w-5 rounded-full bg-white shadow transition-transform ${on ? 'translate-x-5' : 'translate-x-0.5'}`} />
      </button>
    </div>
  )
}
