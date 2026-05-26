import { forwardRef } from 'react'
import { cn } from '@/lib/utils'

const variantStyles = {
  default: 'bg-border text-text-secondary',
  orange: 'bg-orange-subtle text-orange',
  blue: 'bg-status-blue-subtle text-status-blue',
  green: 'bg-status-green-subtle text-status-green',
  yellow: 'bg-status-yellow-subtle text-status-yellow',
  red: 'bg-status-red-subtle text-status-red',
  purple: 'bg-status-purple-subtle text-status-purple',
  // RO stages
  estimate: 'bg-status-blue-subtle text-status-blue',
  approved: 'bg-status-purple-subtle text-status-purple',
  'in progress': 'bg-status-orange-subtle text-status-orange',
  'waiting parts': 'bg-status-yellow-subtle text-status-yellow',
  complete: 'bg-status-green-subtle text-status-green',
  invoiced: 'bg-border text-text-secondary',
  paid: 'bg-status-green-subtle text-status-green',
  // Customer types
  vip: 'bg-orange-subtle text-orange',
  regular: 'bg-border text-text-secondary',
  new: 'bg-status-blue-subtle text-status-blue',
  'at-risk': 'bg-status-red-subtle text-status-red',
}

const dotColors = {
  default: 'bg-text-muted',
  orange: 'bg-orange',
  blue: 'bg-status-blue',
  green: 'bg-status-green',
  yellow: 'bg-status-yellow',
  red: 'bg-status-red',
  purple: 'bg-status-purple',
  estimate: 'bg-status-blue',
  approved: 'bg-status-purple',
  'in progress': 'bg-status-orange',
  'waiting parts': 'bg-status-yellow',
  complete: 'bg-status-green',
  invoiced: 'bg-text-muted',
  paid: 'bg-status-green',
  vip: 'bg-orange',
  new: 'bg-status-blue',
  'at-risk': 'bg-status-red',
}

export const Badge = forwardRef(function Badge(
  { children, variant = 'default', dot = false, className, ...props },
  ref
) {
  const key = variant?.toLowerCase()

  return (
    <span
      ref={ref}
      className={cn(
        'inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium tracking-wide',
        'transition-colors duration-150',
        variantStyles[key] || variantStyles.default,
        className
      )}
      {...props}
    >
      {dot && (
        <span className={cn('h-1.5 w-1.5 rounded-full shrink-0', dotColors[key] || dotColors.default)} />
      )}
      {children}
    </span>
  )
})

export function StageBadge({ stage, dot = true }) {
  return <Badge variant={stage?.toLowerCase()} dot={dot}>{stage}</Badge>
}
