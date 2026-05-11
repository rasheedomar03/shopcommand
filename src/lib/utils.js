import { clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(value) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value)
}

export function formatNumber(value) {
  return new Intl.NumberFormat('en-US').format(value)
}

export function formatPercent(value, decimals = 1) {
  return `${value.toFixed(decimals)}%`
}

export function formatDate(dateStr) {
  const date = new Date(dateStr)
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(date)
}

export function formatRelativeTime(dateStr) {
  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = now - date
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays < 7) return `${diffDays}d ago`
  return formatDate(dateStr)
}

export const RO_STAGES = [
  'Estimate',
  'Approved',
  'In Progress',
  'Waiting Parts',
  'Complete',
  'Invoiced',
  'Paid',
]

export const STAGE_COLORS = {
  'Estimate':      { bg: 'bg-status-blue-subtle',   text: 'text-status-blue',   dot: 'bg-status-blue' },
  'Approved':      { bg: 'bg-status-purple-subtle', text: 'text-status-purple', dot: 'bg-status-purple' },
  'In Progress':   { bg: 'bg-status-orange-subtle', text: 'text-status-orange', dot: 'bg-status-orange' },
  'Waiting Parts': { bg: 'bg-status-yellow-subtle', text: 'text-status-yellow', dot: 'bg-status-yellow' },
  'Complete':      { bg: 'bg-status-green-subtle',  text: 'text-status-green',  dot: 'bg-status-green' },
  'Invoiced':      { bg: 'bg-border',               text: 'text-text-secondary', dot: 'bg-text-muted' },
  'Paid':          { bg: 'bg-status-green-subtle',  text: 'text-status-green',  dot: 'bg-status-green' },
}
