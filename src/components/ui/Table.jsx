import { cn } from '@/lib/utils'

export function Table({ children, className }) {
  return (
    <div className={cn('w-full overflow-x-auto', className)}>
      <table className="w-full border-collapse text-sm">
        {children}
      </table>
    </div>
  )
}

export function Thead({ children }) {
  return (
    <thead>
      {children}
    </thead>
  )
}

export function Th({ children, className }) {
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

export function Tbody({ children }) {
  return <tbody>{children}</tbody>
}

export function Tr({ children, onClick, className }) {
  return (
    <tr
      className={cn(
        'border-b border-border/60 last:border-0',
        'transition-colors duration-100',
        onClick && 'cursor-pointer hover:bg-border/40',
        className
      )}
      onClick={onClick}
    >
      {children}
    </tr>
  )
}

export function Td({ children, className }) {
  return (
    <td className={cn('px-4 py-3 text-sm text-text-primary', className)}>
      {children}
    </td>
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
