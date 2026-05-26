import { forwardRef } from 'react'
import { ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react'
import { cn } from '@/lib/utils'

export const Table = forwardRef(function Table({ children, className, ...props }, ref) {
  return (
    <div ref={ref} className={cn('w-full overflow-x-auto', className)} {...props}>
      <table className="w-full border-collapse text-sm">
        {children}
      </table>
    </div>
  )
})

export function Thead({ children, sticky = false }) {
  return (
    <thead className={cn(sticky && 'sticky top-0 z-10 bg-surface')}>
      {children}
    </thead>
  )
}

export function Th({ children, className, sortable, sortDir, onSort }) {
  if (!sortable) {
    return (
      <th className={cn(
        'px-4 py-2.5 text-left text-xs font-medium text-text-muted uppercase tracking-wider',
        'border-b border-border',
        className
      )}>
        {children}
      </th>
    )
  }

  const Icon = sortDir === 'asc' ? ChevronUp : sortDir === 'desc' ? ChevronDown : ChevronsUpDown

  return (
    <th
      className={cn(
        'px-4 py-2.5 text-left text-xs font-medium uppercase tracking-wider',
        'border-b border-border',
        'cursor-pointer select-none',
        'transition-colors duration-150',
        sortDir ? 'text-text-primary' : 'text-text-muted hover:text-text-secondary',
        className
      )}
      onClick={onSort}
    >
      <span className="inline-flex items-center gap-1">
        {children}
        <Icon size={13} className="shrink-0" />
      </span>
    </th>
  )
}

export function Tbody({ children }) {
  return <tbody>{children}</tbody>
}

export function Tr({ children, onClick, selected, className, ...props }) {
  return (
    <tr
      className={cn(
        'border-b border-border/60 last:border-0',
        'transition-colors duration-100',
        onClick && 'cursor-pointer hover:bg-border/40',
        selected && 'bg-orange-muted',
        className
      )}
      onClick={onClick}
      {...props}
    >
      {children}
    </tr>
  )
}

export function Td({ children, className, ...props }) {
  return (
    <td className={cn('px-4 py-3 text-sm text-text-primary', className)} {...props}>
      {children}
    </td>
  )
}

export function TableEmpty({ cols = 5, message = 'No results found', icon: Icon }) {
  return (
    <tr>
      <td colSpan={cols} className="px-4 py-12 text-center">
        {Icon && <Icon size={28} className="mx-auto mb-2 text-text-muted" />}
        <p className="text-sm text-text-muted">{message}</p>
      </td>
    </tr>
  )
}

export function TableSkeleton({ rows = 5, cols = 5 }) {
  return (
    <>
      {Array.from({ length: rows }).map((_, i) => (
        <tr key={i} className="border-b border-border/60">
          {Array.from({ length: cols }).map((_, j) => (
            <td key={j} className="px-4 py-3">
              <div className="skeleton h-4 rounded" style={{ width: `${60 + Math.random() * 40}%` }} />
            </td>
          ))}
        </tr>
      ))}
    </>
  )
}
