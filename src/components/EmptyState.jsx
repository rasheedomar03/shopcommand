import { cn } from '@/lib/utils'

const HEX = '16,2 28.1,9 28.1,23 16,30 3.9,23 3.9,9' // viewBox 0 0 32 32

/**
 * Branded empty state for app pages. Theme-token colors so it works in both
 * light and dark mode. `search` variant is the quieter no-results message for
 * filtered lists; the full variant is for genuinely empty pages and takes an
 * optional action button.
 */
export function EmptyState({ icon: Icon, title, hint, actionLabel, onAction, search = false, className }) {
  if (search) {
    return (
      <div className={cn('py-12 text-center text-sm text-text-muted', className)}>
        {title}
      </div>
    )
  }
  return (
    <div className={cn('py-14 px-6 text-center', className)}>
      <div className="relative w-12 h-12 mx-auto mb-4 flex items-center justify-center">
        <svg width="48" height="48" viewBox="0 0 32 32" className="absolute inset-0" aria-hidden="true">
          <polygon points={HEX} fill="rgba(249,115,22,0.08)" stroke="#F97316" strokeWidth="1.5" strokeOpacity="0.5" />
        </svg>
        {Icon && <Icon size={19} className="relative text-orange" strokeWidth={1.8} />}
      </div>
      <div className="text-sm font-semibold text-text-primary mb-1">{title}</div>
      {hint && <p className="text-xs text-text-muted max-w-xs mx-auto leading-relaxed">{hint}</p>}
      {onAction && (
        <button
          onClick={onAction}
          className="mt-4 inline-flex items-center h-8 px-3.5 rounded-lg bg-orange text-white text-xs font-semibold hover:bg-orange-hover active:scale-[0.98] transition-all"
        >
          {actionLabel}
        </button>
      )}
    </div>
  )
}
