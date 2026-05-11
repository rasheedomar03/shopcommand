import { cn } from '@/lib/utils'

export function Input({ className, label, error, helper, ...props }) {
  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label className="text-xs font-medium text-text-secondary uppercase tracking-wider">
          {label}
        </label>
      )}
      <input
        className={cn(
          'h-9 w-full rounded-md border border-border bg-surface px-3 text-sm text-text-primary',
          'placeholder:text-text-muted',
          'transition-colors duration-150',
          'hover:border-border-hover',
          'focus:outline-none focus:border-orange focus:ring-1 focus:ring-orange/30',
          'disabled:opacity-50 disabled:cursor-not-allowed',
          error && 'border-status-red focus:border-status-red focus:ring-status-red/30',
          className
        )}
        {...props}
      />
      {error && <p className="text-xs text-status-red">{error}</p>}
      {helper && !error && <p className="text-xs text-text-muted">{helper}</p>}
    </div>
  )
}

export function Textarea({ className, label, error, helper, rows = 3, ...props }) {
  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label className="text-xs font-medium text-text-secondary uppercase tracking-wider">
          {label}
        </label>
      )}
      <textarea
        rows={rows}
        className={cn(
          'w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-text-primary',
          'placeholder:text-text-muted resize-none',
          'transition-colors duration-150',
          'hover:border-border-hover',
          'focus:outline-none focus:border-orange focus:ring-1 focus:ring-orange/30',
          'disabled:opacity-50 disabled:cursor-not-allowed',
          error && 'border-status-red',
          className
        )}
        {...props}
      />
      {error && <p className="text-xs text-status-red">{error}</p>}
      {helper && !error && <p className="text-xs text-text-muted">{helper}</p>}
    </div>
  )
}

export function Select({ className, label, error, children, ...props }) {
  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label className="text-xs font-medium text-text-secondary uppercase tracking-wider">
          {label}
        </label>
      )}
      <select
        className={cn(
          'h-9 w-full rounded-md border border-border bg-surface px-3 text-sm text-text-primary',
          'transition-colors duration-150',
          'hover:border-border-hover',
          'focus:outline-none focus:border-orange focus:ring-1 focus:ring-orange/30',
          'disabled:opacity-50 disabled:cursor-not-allowed',
          '[&>option]:bg-surface',
          error && 'border-status-red',
          className
        )}
        {...props}
      >
        {children}
      </select>
      {error && <p className="text-xs text-status-red">{error}</p>}
    </div>
  )
}
