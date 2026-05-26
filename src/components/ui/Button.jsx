import { forwardRef } from 'react'
import { Slot } from '@radix-ui/react-slot'
import { cn } from '@/lib/utils'

const variants = {
  primary: 'bg-orange hover:bg-orange-hover text-white shadow-sm shadow-orange/10',
  secondary: 'bg-surface hover:bg-border text-text-primary border border-border hover:border-border-hover',
  ghost: 'text-text-secondary hover:text-text-primary hover:bg-surface',
  danger: 'bg-status-red-subtle hover:bg-red-500/20 text-status-red border border-status-red/20',
  outline: 'border border-border hover:border-border-hover text-text-secondary hover:text-text-primary bg-transparent',
  link: 'text-orange hover:text-orange-hover underline-offset-4 hover:underline p-0 h-auto',
}

const sizes = {
  xs: 'h-7 px-2.5 text-xs gap-1',
  sm: 'h-8 px-3 text-xs gap-1.5',
  md: 'h-9 px-4 text-sm gap-2',
  lg: 'h-10 px-5 text-sm gap-2',
  icon: 'h-9 w-9',
  'icon-sm': 'h-7 w-7',
  'icon-lg': 'h-10 w-10',
}

export const Button = forwardRef(function Button(
  {
    children,
    variant = 'primary',
    size = 'md',
    className,
    disabled,
    loading,
    asChild = false,
    type = 'button',
    ...props
  },
  ref
) {
  const Comp = asChild ? Slot : 'button'

  return (
    <Comp
      ref={ref}
      type={asChild ? undefined : type}
      disabled={disabled || loading}
      className={cn(
        'inline-flex items-center justify-center rounded-md font-medium whitespace-nowrap',
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
        <svg className="animate-spin h-3.5 w-3.5 shrink-0" viewBox="0 0 24 24" fill="none">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      )}
      {children}
    </Comp>
  )
})
