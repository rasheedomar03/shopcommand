import { forwardRef, useId } from 'react'
import * as LabelPrimitive from '@radix-ui/react-label'
import { cn } from '@/lib/utils'

// ── Label (reusable) ────────────────────────────────────────────────────────

export const Label = forwardRef(function Label({ className, ...props }, ref) {
  return (
    <LabelPrimitive.Root
      ref={ref}
      className={cn(
        'text-xs font-medium text-text-secondary uppercase tracking-wider',
        'peer-disabled:cursor-not-allowed peer-disabled:opacity-50',
        className
      )}
      {...props}
    />
  )
})

// ── Input ────────────────────────────────────────────────────────────────────

export const Input = forwardRef(function Input(
  { className, label, error, helper, id: propId, ...props },
  ref
) {
  const autoId = useId()
  const id = propId || autoId

  return (
    <div className="flex flex-col gap-1.5">
      {label && <Label htmlFor={id}>{label}</Label>}
      <input
        ref={ref}
        id={id}
        aria-invalid={!!error}
        aria-describedby={error ? `${id}-error` : helper ? `${id}-helper` : undefined}
        className={cn(
          'peer h-9 w-full rounded-md border border-border bg-surface px-3 text-sm text-text-primary',
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
      {error && <p id={`${id}-error`} className="text-xs text-status-red" role="alert">{error}</p>}
      {helper && !error && <p id={`${id}-helper`} className="text-xs text-text-muted">{helper}</p>}
    </div>
  )
})

// ── Textarea ─────────────────────────────────────────────────────────────────

export const Textarea = forwardRef(function Textarea(
  { className, label, error, helper, rows = 3, id: propId, ...props },
  ref
) {
  const autoId = useId()
  const id = propId || autoId

  return (
    <div className="flex flex-col gap-1.5">
      {label && <Label htmlFor={id}>{label}</Label>}
      <textarea
        ref={ref}
        id={id}
        rows={rows}
        aria-invalid={!!error}
        aria-describedby={error ? `${id}-error` : helper ? `${id}-helper` : undefined}
        className={cn(
          'peer w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-text-primary',
          'placeholder:text-text-muted resize-none',
          'transition-colors duration-150',
          'hover:border-border-hover',
          'focus:outline-none focus:border-orange focus:ring-1 focus:ring-orange/30',
          'disabled:opacity-50 disabled:cursor-not-allowed',
          error && 'border-status-red focus:border-status-red focus:ring-status-red/30',
          className
        )}
        {...props}
      />
      {error && <p id={`${id}-error`} className="text-xs text-status-red" role="alert">{error}</p>}
      {helper && !error && <p id={`${id}-helper`} className="text-xs text-text-muted">{helper}</p>}
    </div>
  )
})

// ── Select ───────────────────────────────────────────────────────────────────

export const Select = forwardRef(function Select(
  { className, label, error, children, id: propId, ...props },
  ref
) {
  const autoId = useId()
  const id = propId || autoId

  return (
    <div className="flex flex-col gap-1.5">
      {label && <Label htmlFor={id}>{label}</Label>}
      <select
        ref={ref}
        id={id}
        aria-invalid={!!error}
        className={cn(
          'peer h-9 w-full rounded-md border border-border bg-surface px-3 text-sm text-text-primary',
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
      {error && <p id={`${id}-error`} className="text-xs text-status-red" role="alert">{error}</p>}
    </div>
  )
})
