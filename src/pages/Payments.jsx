import { useState } from 'react'
import { Search, DollarSign, CreditCard, TrendingUp, ArrowDownRight, ArrowUpRight, Filter } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { Table, Thead, Th, Tbody, Tr, Td } from '@/components/ui/Table'
import { formatCurrency, formatDate, formatRelativeTime } from '@/lib/utils'
import { cn } from '@/lib/utils'
import { shops } from '@/data/mock'

const PAYMENT_METHODS = {
  visa:       { label: 'Visa',       icon: '💳' },
  mastercard: { label: 'Mastercard', icon: '💳' },
  amex:       { label: 'Amex',       icon: '💳' },
  cash:       { label: 'Cash',       icon: '💵' },
  check:      { label: 'Check',      icon: '📝' },
  financing:  { label: 'Financing',  icon: '🏦' },
}

const mockPayments = [
  { id: 'PAY-6001', invoiceId: 'INV-4401', shopId: 1, customerName: 'Gerald Hutchins', amount: 156.96, method: 'visa', last4: '4821', date: '2026-05-14T16:45:00', status: 'completed' },
  { id: 'PAY-6002', invoiceId: 'INV-4402', shopId: 3, customerName: 'Sandra Montoya', amount: 613.78, method: 'cash', last4: null, date: '2026-05-13T15:10:00', status: 'completed' },
  { id: 'PAY-6003', invoiceId: 'INV-4406', shopId: 4, customerName: 'Alicia Watkins', amount: 119.08, method: 'mastercard', last4: '7733', date: '2026-05-11T15:45:00', status: 'completed' },
  { id: 'PAY-6004', invoiceId: 'INV-4398', shopId: 5, customerName: 'Derek Williamson', amount: 892.40, method: 'visa', last4: '2109', date: '2026-05-10T12:00:00', status: 'completed' },
  { id: 'PAY-6005', invoiceId: 'INV-4395', shopId: 1, customerName: 'Brent Okwu', amount: 1247.50, method: 'financing', last4: null, date: '2026-05-09T14:30:00', status: 'completed' },
  { id: 'PAY-6006', invoiceId: 'INV-4392', shopId: 2, customerName: 'Tanya Reeves', amount: 342.00, method: 'visa', last4: '8856', date: '2026-05-08T11:00:00', status: 'completed' },
  { id: 'PAY-6007', invoiceId: 'INV-4390', shopId: 3, customerName: 'Naomi Fields', amount: 89.00, method: 'cash', last4: null, date: '2026-05-07T16:30:00', status: 'completed' },
  { id: 'PAY-6008', invoiceId: 'INV-4388', shopId: 5, customerName: 'Louis Bergman', amount: 528.25, method: 'mastercard', last4: '3344', date: '2026-05-06T10:15:00', status: 'completed' },
  { id: 'PAY-6009', invoiceId: 'INV-4385', shopId: 1, customerName: 'Gerald Hutchins', amount: 445.00, method: 'visa', last4: '4821', date: '2026-05-05T15:00:00', status: 'completed' },
  { id: 'PAY-6010', invoiceId: 'INV-4382', shopId: 4, customerName: 'Alicia Watkins', amount: 267.50, method: 'check', last4: null, date: '2026-05-03T09:30:00', status: 'completed' },
  { id: 'PAY-6011', invoiceId: 'INV-4403', shopId: 5, customerName: 'Derek Williamson', amount: 846.52, method: 'visa', last4: '2109', date: '2026-05-17T10:00:00', status: 'pending' },
  { id: 'PAY-6012', invoiceId: 'INV-4404', shopId: 2, customerName: 'Tanya Reeves', amount: 492.54, method: null, last4: null, date: null, status: 'failed' },
]

const PAYMENT_STATUS = {
  completed: { label: 'Completed', color: 'text-status-green',  bg: 'bg-status-green/10' },
  pending:   { label: 'Pending',   color: 'text-status-yellow', bg: 'bg-status-yellow/10' },
  failed:    { label: 'Failed',    color: 'text-status-red',    bg: 'bg-status-red/10' },
  refunded:  { label: 'Refunded',  color: 'text-text-muted',    bg: 'bg-border' },
}

function StatusBadge({ status }) {
  const cfg = PAYMENT_STATUS[status] || PAYMENT_STATUS.pending
  return (
    <span className={cn('inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-2xs font-semibold', cfg.bg, cfg.color)}>
      <span className={cn('w-1.5 h-1.5 rounded-full', cfg.color.replace('text-', 'bg-'))} />
      {cfg.label}
    </span>
  )
}

export default function Payments() {
  const { session } = useAuth()
  const isAdvisor = session?.role === 'advisor'
  const [search, setSearch] = useState('')
  const [methodFilter, setMethodFilter] = useState('All')

  const scoped = isAdvisor
    ? mockPayments.filter(p => p.shopId === session.shopId)
    : mockPayments

  const filtered = scoped.filter(p => {
    const q = search.toLowerCase()
    const matchesSearch = !q ||
      p.id.toLowerCase().includes(q) ||
      p.customerName.toLowerCase().includes(q) ||
      p.invoiceId.toLowerCase().includes(q)
    const matchesMethod = methodFilter === 'All' || p.method === methodFilter
    return matchesSearch && matchesMethod
  })

  const totalReceived = scoped.filter(p => p.status === 'completed').reduce((s, p) => s + p.amount, 0)
  const totalPending = scoped.filter(p => p.status === 'pending').reduce((s, p) => s + p.amount, 0)
  const avgTransaction = totalReceived / (scoped.filter(p => p.status === 'completed').length || 1)

  const methodBreakdown = scoped.filter(p => p.status === 'completed').reduce((acc, p) => {
    acc[p.method] = (acc[p.method] || 0) + p.amount
    return acc
  }, {})

  return (
    <div className="p-4 sm:p-5 lg:p-6 space-y-4 sm:space-y-5 animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-semibold text-text-primary">Payments</h1>
          <p className="text-xs text-text-muted mt-0.5">{scoped.length} transactions this month</p>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-surface border border-border rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-text-muted uppercase tracking-wider">Collected (MTD)</span>
            <div className="w-7 h-7 rounded-md bg-status-green/10 flex items-center justify-center">
              <ArrowDownRight size={14} className="text-status-green" />
            </div>
          </div>
          <div className="text-2xl font-semibold text-text-primary tabular-nums">{formatCurrency(totalReceived)}</div>
          <div className="text-xs text-status-green font-medium mt-1">↑ 8% vs last month</div>
        </div>

        <div className="bg-surface border border-border rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-text-muted uppercase tracking-wider">Pending</span>
            <div className="w-7 h-7 rounded-md bg-status-yellow/10 flex items-center justify-center">
              <CreditCard size={14} className="text-status-yellow" />
            </div>
          </div>
          <div className="text-2xl font-semibold text-text-primary tabular-nums">{formatCurrency(totalPending)}</div>
          <div className="text-xs text-text-muted mt-1">{scoped.filter(p => p.status === 'pending').length} pending</div>
        </div>

        <div className="bg-surface border border-border rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-text-muted uppercase tracking-wider">Avg Transaction</span>
            <div className="w-7 h-7 rounded-md bg-orange-muted flex items-center justify-center">
              <TrendingUp size={14} className="text-orange" />
            </div>
          </div>
          <div className="text-2xl font-semibold text-text-primary tabular-nums">{formatCurrency(avgTransaction)}</div>
          <div className="text-xs text-text-muted mt-1">across {scoped.filter(p => p.status === 'completed').length} payments</div>
        </div>
      </div>

      {/* Method breakdown */}
      <div className="bg-surface border border-border rounded-lg p-4">
        <div className="text-xs font-medium text-text-muted uppercase tracking-wider mb-3">Payment Methods</div>
        <div className="flex items-center gap-2 flex-wrap">
          {Object.entries(methodBreakdown).sort((a, b) => b[1] - a[1]).map(([method, amount]) => {
            const cfg = PAYMENT_METHODS[method]
            const pct = ((amount / totalReceived) * 100).toFixed(0)
            return (
              <div key={method} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-background border border-border">
                <span className="text-sm">{cfg?.icon}</span>
                <span className="text-xs font-medium text-text-primary">{cfg?.label || method}</span>
                <span className="text-2xs text-text-muted">{pct}%</span>
                <span className="text-xs text-text-secondary tabular-nums">{formatCurrency(amount)}</span>
              </div>
            )
          })}
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search payments..."
            className="w-full h-9 pl-9 pr-3 rounded-lg bg-background border border-border text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-1 focus:ring-orange/40 transition-shadow"
          />
        </div>
        <select
          value={methodFilter}
          onChange={e => setMethodFilter(e.target.value)}
          className="h-9 px-3 rounded-lg bg-background border border-border text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-orange/40"
        >
          <option value="All">All methods</option>
          {Object.entries(PAYMENT_METHODS).map(([key, { label }]) => (
            <option key={key} value={key}>{label}</option>
          ))}
        </select>
      </div>

      {/* Transactions table */}
      <div className="rounded-lg border border-border overflow-hidden">
        <Table>
          <Thead>
            <Tr>
              <Th>Transaction</Th>
              <Th className="hidden sm:table-cell">Method</Th>
              <Th className="hidden md:table-cell">Shop</Th>
              <Th>Status</Th>
              <Th className="text-right">Amount</Th>
            </Tr>
          </Thead>
          <Tbody>
            {filtered.map(pay => {
              const shop = shops.find(s => s.id === pay.shopId)
              const methodCfg = PAYMENT_METHODS[pay.method]
              return (
                <Tr key={pay.id}>
                  <Td>
                    <div className="text-sm font-medium text-text-primary">{pay.customerName}</div>
                    <div className="text-2xs text-text-muted">{pay.invoiceId} · {pay.date ? formatRelativeTime(pay.date) : 'No date'}</div>
                  </Td>
                  <Td className="hidden sm:table-cell">
                    <span className="text-xs text-text-secondary">
                      {methodCfg ? `${methodCfg.label}${pay.last4 ? ` ···${pay.last4}` : ''}` : '—'}
                    </span>
                  </Td>
                  <Td className="hidden md:table-cell">
                    <span className="text-xs text-text-muted">{shop?.name}</span>
                  </Td>
                  <Td><StatusBadge status={pay.status} /></Td>
                  <Td className="text-right">
                    <span className="text-sm font-medium text-text-primary tabular-nums">${pay.amount.toFixed(2)}</span>
                  </Td>
                </Tr>
              )
            })}
          </Tbody>
        </Table>
        {filtered.length === 0 && (
          <div className="py-12 text-center text-sm text-text-muted">No payments found</div>
        )}
      </div>
    </div>
  )
}
