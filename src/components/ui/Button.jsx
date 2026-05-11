import { cn } from '@/lib/utils'

export function Button({
  children,
  variant = 'primary',
  size = 'md',
  className,
  disabled,
  loading,
  onClick,
  type = 'button',
  ...props
}) {
  const variants = {
    primary: 'bg-orange hover:bg-orange-hover text-white',
    secondary: 'bg-surface hover:bg-border text-text-primary border border-border hover:border-border-hover',
    ghost: 'text-text-secondary hover:text-text-primary hover:bg-surface',
    danger: 'bg-status-red-subtle hover:bg-red-500/20 text-status-red border border-status-red/20',
    outline: 'border border-border hover:border-border-hover text-text-secondary hover:text-text-primary bg-transparent',
  }

  const sizes = {
    xs: 'h-7 px-2.5 text-xs',
    sm: 'h-8 px-3 text-xs',
    md: 'h-9 px-4 text-sm',
    lg: 'h-10 px-5 text-sm',
    icon: 'h-9 w-9',
  }

  return (
    <button
      type={type}
      disabled={disabled || loading}
      onClick={onClick}
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-md font-medium',
        'transition-all duration-150 ease-out-quart',
        'focus-visible:outline focus-visible:outline-2 focus-visible:outline-orange focus-visible:outline-offset-2',
        'active:scale-[0.98]',
        'disabled:opacity-40 disabled:cursor-not-allowed disabled:pointer-events-none',
        variants[variant],
        sizes[size],
        className
      )}
      {...props}
    >
      {loading && (
        <svg className="animate-spin h-3.5 w-3.5" viewBox="0 0 24 24" fill="none">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      )}
      {children}
    </button>
  )
}
