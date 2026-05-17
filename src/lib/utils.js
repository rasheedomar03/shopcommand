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

// Time tracking helpers

export function startOfToday() {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  return d.getTime()
}

export function startOfWeek() {
  const d = new Date()
  const day = d.getDay()
  d.setDate(d.getDate() - (day === 0 ? 6 : day - 1))
  d.setHours(0, 0, 0, 0)
  return d.getTime()
}

export function computeHoursMs(timeEntries, techId, sinceMs) {
  const now = Date.now()
  return (timeEntries || [])
    .filter(e => e.techId === techId && new Date(e.clockInAt).getTime() >= sinceMs)
    .reduce((sum, e) => {
      const start = new Date(e.clockInAt).getTime()
      const end = e.clockOutAt ? new Date(e.clockOutAt).getTime() : now
      return sum + Math.max(0, end - start)
    }, 0)
}

export function formatHours(ms) {
  if (ms <= 0) return '—'
  const totalMins = Math.floor(ms / 60000)
  const h = Math.floor(totalMins / 60)
  const m = totalMins % 60
  if (h === 0) return `${m}m`
  return m === 0 ? `${h}h` : `${h}h ${m}m`
}

export const RO_STAGES = [
  'Estimate',
  'Approved',
  'Waiting Parts',
  'In Progress',
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
