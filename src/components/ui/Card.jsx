import { cn } from '@/lib/utils'

export function Card({ children, className, onClick, ...props }) {
  return (
    <div
      className={cn(
        'bg-surface border border-border rounded-lg',
        onClick && 'cursor-pointer hover:border-border-hover transition-colors duration-150',
        className
      )}
      onClick={onClick}
      {...props}
    >
      {children}
    </div>
  )
}

export function StatCard({ label, value, sub, icon: Icon, trend, trendValue, loading }) {
  if (loading) {
    return (
      <div className="bg-surface border border-border rounded-lg p-4">
        <div className="skeleton h-3 w-20 mb-3" />
        <div className="skeleton h-7 w-28 mb-2" />
        <div className="skeleton h-3 w-16" />
      </div>
    )
  }

  return (
    <div className="bg-surface border border-border rounded-lg p-4 animate-fade-in">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-medium text-text-muted uppercase tracking-wider">{label}</span>
        {Icon && (
          <div className="relative w-7 h-7 flex items-center justify-center">
            <svg width="28" height="28" viewBox="0 0 32 32" className="absolute inset-0" aria-hidden="true">
              <polygon points="16,2 28.1,9 28.1,23 16,30 3.9,23 3.9,9" fill="rgba(249,115,22,0.10)" stroke="rgba(249,115,22,0.25)" strokeWidth="1.5" />
            </svg>
            <Icon size={14} className="relative text-orange" />
          </div>
        )}
      </div>
      <div className="text-2xl font-semibold text-text-primary tabular-nums mb-1">{value}</div>
      {sub && <div className="text-xs text-text-muted">{sub}</div>}
      {trend !== undefined && (
        <div className={cn(
          'text-xs font-medium mt-1',
          trend >= 0 ? 'text-status-green' : 'text-status-red'
        )}>
          {trend >= 0 ? '↑' : '↓'} {Math.abs(trendValue || trend)}% vs last week
        </div>
      )}
    </div>
  )
}
