import { cn } from '@/lib/utils'

export function Badge({ children, variant = 'default', className, ...props }) {
  const variants = {
    default: 'bg-border text-text-secondary',
    orange: 'bg-orange-subtle text-orange',
    blue: 'bg-status-blue-subtle text-status-blue',
    green: 'bg-status-green-subtle text-status-green',
    yellow: 'bg-status-yellow-subtle text-status-yellow',
    red: 'bg-status-red-subtle text-status-red',
    purple: 'bg-status-purple-subtle text-status-purple',
    estimate: 'bg-status-blue-subtle text-status-blue',
    approved: 'bg-status-purple-subtle text-status-purple',
    'in progress': 'bg-status-orange-subtle text-status-orange',
    'waiting parts': 'bg-status-yellow-subtle text-status-yellow',
    complete: 'bg-status-green-subtle text-status-green',
    invoiced: 'bg-border text-text-secondary',
    vip: 'bg-orange-subtle text-orange',
    regular: 'bg-border text-text-secondary',
    new: 'bg-status-blue-subtle text-status-blue',
    'at-risk': 'bg-status-red-subtle text-status-red',
  }

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium tracking-wide',
        variants[variant?.toLowerCase()] || variants.default,
        className
      )}
      {...props}
    >
      {children}
    </span>
  )
}

export function StageBadge({ stage }) {
  const stageKey = stage?.toLowerCase()
  return <Badge variant={stageKey}>{stage}</Badge>
}
