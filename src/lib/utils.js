import { clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs) {
  return twMerge(clsx(inputs))
}

/**
 * The repair order label people should see: the RO number (RO-20261117-0001).
 * Falls back to the id for demo data, whose id is already a short RO number.
 * Never show the raw database UUID, and keep using ro.id for keys, timers,
 * and lookups.
 */
export function roLabel(ro) {
  return String(ro?.roNumber || ro?.id || '')
}

/**
 * Search matching that cannot crash. True when the query is blank, or when any
 * field contains it (case-insensitive). A missing field (null or undefined, for
 * example a customer saved without a phone number) simply never matches.
 */
export function matchesSearch(query, ...fields) {
  const q = String(query ?? '').trim().toLowerCase()
  if (!q) return true
  return fields.some(f => String(f ?? '').toLowerCase().includes(q))
}

export function formatCurrency(value) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value)
}

/**
 * Dollars and cents ($89.99). Use this wherever an exact amount is shown,
 * such as invoice lines and balances, because formatCurrency rounds to whole
 * dollars and would show $89.99 as $90.
 */
export function formatMoney(value) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(value) || 0)
}

export function formatNumber(value) {
  return new Intl.NumberFormat('en-US').format(value)
}

export function formatPercent(value, decimals = 1) {
  if (value == null || isNaN(value)) return '—'
  return `${Number(value).toFixed(decimals)}%`
}

export function formatDate(dateStr) {
  if (!dateStr) return '—'
  const date = new Date(dateStr)
  if (isNaN(date.getTime())) return '—'
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(date)
}

export function formatRelativeTime(dateStr) {
  if (!dateStr) return '—'
  const date = new Date(dateStr)
  if (isNaN(date.getTime())) return '—'
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

// ─── Input sanitization ──────────────────────────────────────────────────────

/** Strip HTML tags, script content, and trim whitespace */
export function sanitize(str) {
  if (typeof str !== 'string') return ''
  return str
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<[^>]*>/g, '')
    .replace(/javascript:/gi, '')
    .replace(/on\w+\s*=/gi, '')
    .trim()
}

/** Sanitize and cap length */
export function sanitizeField(str, maxLen = 200) {
  return sanitize(str).slice(0, maxLen)
}

/** Validate email format */
export function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

/** Sanitize VIN: uppercase alphanumeric only, 17 chars max */
export function sanitizeVin(str) {
  if (typeof str !== 'string') return ''
  return str.replace(/[^A-Za-z0-9]/g, '').toUpperCase().slice(0, 17)
}

/** Sanitize phone: digits, spaces, dashes, parens, plus only */
export function sanitizePhone(str) {
  if (typeof str !== 'string') return ''
  return str.replace(/[^\d\s\-()+ ]/g, '').slice(0, 20)
}

/** Sanitize numeric input */
export function sanitizeNumber(str, { min, max, decimals = 2 } = {}) {
  const num = parseFloat(str)
  if (isNaN(num)) return 0
  let clamped = num
  if (min !== undefined) clamped = Math.max(min, clamped)
  if (max !== undefined) clamped = Math.min(max, clamped)
  return parseFloat(clamped.toFixed(decimals))
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
