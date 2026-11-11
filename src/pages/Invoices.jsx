import { useState, useEffect } from 'react'
import { Search, Download, Send, CheckCircle, Clock, AlertCircle, DollarSign, Printer, Plus, Pencil, Trash2 } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/Button'
import { Table, Thead, Th, Tbody, Tr, Td } from '@/components/ui/Table'
import { Modal } from '@/components/ui/Modal'
import { InvoiceGeneratorModal } from '@/components/modals/InvoiceGeneratorModal'
import { formatCurrency, formatDate, formatRelativeTime } from '@/lib/utils'
import { cn } from '@/lib/utils'
import { useData } from '@/contexts/DataContext'

const INVOICE_STATUS = {
  paid:     { label: 'Paid',     color: 'text-status-green',  bg: 'bg-status-green/10', icon: CheckCircle },
  partial:  { label: 'Partial',  color: 'text-orange',        bg: 'bg-orange/10',       icon: DollarSign },
  sent:     { label: 'Sent',     color: 'text-blue-400',      bg: 'bg-blue-500/10',     icon: Send },
  overdue:  { label: 'Overdue',  color: 'text-status-red',    bg: 'bg-status-red/10',   icon: AlertCircle },
  draft:    { label: 'Draft',    color: 'text-text-muted',    bg: 'bg-border',          icon: Clock },
}

function StatusBadge({ status }) {
  const cfg = INVOICE_STATUS[status] || INVOICE_STATUS.draft
  return (
    <span className={cn('inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-2xs font-semibold', cfg.bg, cfg.color)}>
      <span className={cn('w-1.5 h-1.5 rounded-full', cfg.color.replace('text-', 'bg-'))} />
      {cfg.label}
    </span>
  )
}

function InvoiceDetail({ invoice, onClose, shops, onPrint, onUpdate, onVoid, onRecordPayment }) {
  const [confirmVoid, setConfirmVoid] = useState(false)
  const [confirmUnpay, setConfirmUnpay] = useState(false)
  const [editing, setEditing] = useState(false)
  const [rows, setRows] = useState([])
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState(null)
  const [payOpen, setPayOpen] = useState(false)
  const [payAmount, setPayAmount] = useState('')
  const [payError, setPayError] = useState(null)
  const [paying, setPaying] = useState(false)

  // Reset edit state when a different invoice opens (or the modal closes)
  useEffect(() => {
    setEditing(false)
    setConfirmVoid(false)
    setConfirmUnpay(false)
    setSaveError(null)
    setPayOpen(false)
    setPayError(null)
  }, [invoice?.id])

  if (!invoice) return null
  const shop = shops.find(s => s.id === invoice.shopId)
  const editable = invoice.status !== 'paid'
  const amountPaid = Number(invoice.amountPaid) || 0
  const balance = Math.max(0, Math.round((invoice.total - amountPaid) * 100) / 100)
  const canTakePayment = ['sent', 'overdue', 'partial'].includes(invoice.status)

  const submitPayment = async () => {
    setPaying(true)
    setPayError(null)
    const r = await onRecordPayment(invoice.id, Number(payAmount))
    setPaying(false)
    if (r?.error) setPayError(r.error)
    else { setPayOpen(false); setPayAmount('') }
  }

  const startEdit = () => {
    setRows(invoice.services.map(s => ({ name: s.name, parts: s.parts ?? 0, labor: s.labor ?? 0 })))
    setSaveError(null)
    setEditing(true)
  }
  const setRow = (i, field, value) => setRows(prev => prev.map((r, idx) => idx === i ? { ...r, [field]: value } : r))
  const editSubtotal = rows.reduce((sum, r) => sum + (Number(r.parts) || 0) + (Number(r.labor) || 0), 0)
  // Local invoices carry 8.25% tax; DB-backed invoices store a tax-free total
  const editTax = invoice.tax > 0 ? Math.round(editSubtotal * 8.25) / 100 : 0
  const editTotal = Math.round((editSubtotal + editTax) * 100) / 100

  const saveEdit = async () => {
    const services = rows
      .filter(r => String(r.name).trim())
      .map(r => ({ name: String(r.name).trim(), parts: Number(r.parts) || 0, labor: Number(r.labor) || 0 }))
    if (services.length === 0) {
      setSaveError('An invoice needs at least one line item')
      return
    }
    setSaving(true)
    setSaveError(null)
    const r = await onUpdate(invoice.id, { services, subtotal: editSubtotal, tax: editTax, total: editTotal })
    setSaving(false)
    if (r?.error) setSaveError(r.error)
    else setEditing(false)
  }

  return (
    <Modal open={!!invoice} onClose={onClose} title={invoice.id} subtitle={`${invoice.vehicle} · ${invoice.customerName}`} size="lg">
      <div className="p-5 space-y-5">
        <div className="flex items-center justify-between">
          <StatusBadge status={invoice.status} />
          <div className="text-right">
            <div className="text-xs text-text-muted">{shop?.name}</div>
            <div className="text-xs text-text-muted">RO: {invoice.roId}</div>
          </div>
        </div>

        <div className="rounded-lg border border-border overflow-hidden">
          <div className="grid grid-cols-[1fr_auto_auto] gap-4 px-4 py-2.5 bg-background text-xs font-medium text-text-muted uppercase tracking-wider">
            <div>Service</div>
            <div className="text-right">Parts</div>
            <div className="text-right">Labor</div>
          </div>
          {editing ? (
            <>
              {rows.map((r, i) => (
                <div key={i} className={cn('grid grid-cols-[1fr_84px_84px_28px] gap-2 items-center px-3 py-2', i > 0 && 'border-t border-border')}>
                  <input
                    value={r.name}
                    onChange={e => setRow(i, 'name', e.target.value)}
                    placeholder="Service description"
                    className="h-8 px-2.5 rounded-md bg-background border border-border text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-1 focus:ring-orange/40"
                  />
                  <input
                    type="number" min="0" step="0.01" inputMode="decimal"
                    value={r.parts}
                    onChange={e => setRow(i, 'parts', e.target.value)}
                    aria-label="Parts amount"
                    className="h-8 px-2 rounded-md bg-background border border-border text-sm text-right text-text-primary tabular-nums focus:outline-none focus:ring-1 focus:ring-orange/40"
                  />
                  <input
                    type="number" min="0" step="0.01" inputMode="decimal"
                    value={r.labor}
                    onChange={e => setRow(i, 'labor', e.target.value)}
                    aria-label="Labor amount"
                    className="h-8 px-2 rounded-md bg-background border border-border text-sm text-right text-text-primary tabular-nums focus:outline-none focus:ring-1 focus:ring-orange/40"
                  />
                  <button
                    onClick={() => setRows(prev => prev.filter((_, idx) => idx !== i))}
                    disabled={rows.length === 1}
                    aria-label="Remove line"
                    className="flex items-center justify-center h-8 w-7 rounded-md text-text-muted hover:text-status-red disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
              <div className="border-t border-border px-3 py-2">
                <button
                  onClick={() => setRows(prev => [...prev, { name: '', parts: 0, labor: 0 }])}
                  className="text-xs text-orange hover:underline underline-offset-2 font-medium"
                >
                  + Add line item
                </button>
              </div>
            </>
          ) : (
            invoice.services.map((svc, i) => (
              <div key={i} className={cn('grid grid-cols-[1fr_auto_auto] gap-4 px-4 py-3 text-sm', i > 0 && 'border-t border-border')}>
                <div className="text-text-primary">{svc.name}</div>
                <div className="text-right text-text-secondary tabular-nums">{formatCurrency(svc.parts)}</div>
                <div className="text-right text-text-secondary tabular-nums">{formatCurrency(svc.labor)}</div>
              </div>
            ))
          )}
          <div className="border-t border-border px-4 py-3 space-y-1.5 bg-background">
            <div className="flex justify-between text-sm text-text-secondary">
              <span>Subtotal</span>
              <span className="tabular-nums">{formatCurrency(editing ? editSubtotal : invoice.subtotal)}</span>
            </div>
            <div className="flex justify-between text-sm text-text-secondary">
              <span>Tax (8.25%)</span>
              <span className="tabular-nums">${(editing ? editTax : invoice.tax).toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm font-semibold text-text-primary pt-1.5 border-t border-border">
              <span>Total</span>
              <span className="text-orange tabular-nums">${(editing ? editTotal : invoice.total).toFixed(2)}</span>
            </div>
          </div>
        </div>

        {saveError && (
          <div className="px-3 py-2.5 rounded-lg bg-status-red/5 border border-status-red/20 text-xs text-status-red">
            {saveError}
          </div>
        )}

        {invoice.status === 'paid' && invoice.paidAt && (
          <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-status-green/5 border border-status-green/20">
            <CheckCircle size={14} className="text-status-green" />
            <span className="text-xs text-status-green font-medium">
              Paid {formatRelativeTime(invoice.paidAt)} via {invoice.paymentMethod}
            </span>
          </div>
        )}

        {invoice.status !== 'paid' && amountPaid > 0 && (
          <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-orange/5 border border-orange/20">
            <DollarSign size={14} className="text-orange" />
            <span className="text-xs text-orange font-medium">
              {formatCurrency(amountPaid)} paid · {formatCurrency(balance)} balance remaining
            </span>
          </div>
        )}

        {payOpen && canTakePayment && (
          <div className="px-3 py-3 rounded-lg bg-background border border-border space-y-2">
            <div className="text-xs font-medium text-text-secondary">Record a payment</div>
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-text-muted">$</span>
                <input
                  autoFocus
                  type="number" min="0.01" step="0.01" inputMode="decimal"
                  value={payAmount}
                  onChange={e => setPayAmount(e.target.value)}
                  placeholder={balance.toFixed(2)}
                  className="w-full h-8 pl-6 pr-2.5 rounded-md bg-surface border border-border text-sm text-text-primary tabular-nums focus:outline-none focus:ring-1 focus:ring-orange/40"
                />
              </div>
              <button
                onClick={() => setPayAmount(String(balance.toFixed(2)))}
                className="text-xs text-orange hover:underline underline-offset-2 whitespace-nowrap"
              >
                Full balance
              </button>
              <Button size="sm" onClick={submitPayment} disabled={paying || !(Number(payAmount) > 0)}>
                {paying ? 'Recording...' : 'Record'}
              </Button>
              <Button size="sm" variant="secondary" onClick={() => { setPayOpen(false); setPayError(null) }} disabled={paying}>
                Cancel
              </Button>
            </div>
            <div className="text-2xs text-text-muted">A partial amount keeps the invoice open with the remaining balance.</div>
            {payError && <div className="text-xs text-status-red">{payError}</div>}
          </div>
        )}

        <div className="flex items-center justify-between pt-2">
          <div className="flex items-center gap-3">
            <div className="text-xs text-text-muted">Created {formatDate(invoice.created)}</div>
            {invoice.status !== 'paid' && (
              confirmVoid ? (
                <span className="flex items-center gap-2 text-xs">
                  <span className="text-status-red">Void this invoice?</span>
                  <button onClick={() => { setConfirmVoid(false); onVoid(invoice.id) }} className="font-semibold text-status-red hover:underline">Yes, void</button>
                  <button onClick={() => setConfirmVoid(false)} className="text-text-muted hover:text-text-primary">Cancel</button>
                </span>
              ) : (
                <button onClick={() => setConfirmVoid(true)} className="text-xs text-text-muted hover:text-status-red transition-colors underline-offset-2 hover:underline">
                  Void invoice
                </button>
              )
            )}
          </div>
          <div className="flex items-center gap-2">
            {editing ? (
              <>
                <Button size="sm" variant="secondary" onClick={() => { setEditing(false); setSaveError(null) }} disabled={saving}>
                  Cancel
                </Button>
                <Button size="sm" onClick={saveEdit} disabled={saving}>
                  {saving ? 'Saving...' : 'Save changes'}
                </Button>
              </>
            ) : (
              <>
                {editable && (
                  <Button size="sm" variant="secondary" onClick={startEdit}>
                    <Pencil size={13} /> Edit
                  </Button>
                )}
                <Button size="sm" variant="secondary" onClick={() => onPrint(invoice)}>
                  <Printer size={13} /> Print / PDF
                </Button>
                {invoice.status === 'draft' && (
                  <Button size="sm" onClick={() => onUpdate(invoice.id, { status: 'sent' })}>
                    <Send size={13} /> Mark as sent
                  </Button>
                )}
                {canTakePayment && (
                  <Button size="sm" onClick={() => { setPayOpen(v => !v); setPayAmount(''); setPayError(null) }}>
                    <DollarSign size={13} /> Record payment
                  </Button>
                )}
                {invoice.status === 'paid' && (
                  confirmUnpay ? (
                    <span className="flex items-center gap-2 text-xs">
                      <span className="text-text-secondary">Move back to unpaid?</span>
                      <button onClick={() => { setConfirmUnpay(false); onUpdate(invoice.id, { status: 'unpaid' }) }} className="font-semibold text-orange hover:underline">Yes</button>
                      <button onClick={() => setConfirmUnpay(false)} className="text-text-muted hover:text-text-primary">Cancel</button>
                    </span>
                  ) : (
                    <Button size="sm" variant="secondary" onClick={() => setConfirmUnpay(true)}>
                      Mark as unpaid
                    </Button>
                  )
                )}
                {invoice.status === 'overdue' && (
                  <Button size="sm" variant="secondary" disabled title="Email reminders coming soon">
                    <Send size={13} /> Reminder — soon
                  </Button>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </Modal>
  )
}

export default function Invoices() {
  const { shops, invoices, updateInvoice, voidInvoice, recordInvoicePayment } = useData()
  const { session } = useAuth()
  const isAdvisor = session?.role === 'advisor'
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('All')
  const [selected, setSelected] = useState(null)
  const [generatorOpen, setGeneratorOpen] = useState(false)
  const [generatorSource, setGeneratorSource] = useState(null)

  const allInvoices = invoices
  const scoped = isAdvisor
    ? allInvoices.filter(inv => inv.shopId === session.shopId)
    : allInvoices

  const filtered = scoped.filter(inv => {
    const q = search.toLowerCase()
    const matchesSearch = !q ||
      inv.id.toLowerCase().includes(q) ||
      inv.customerName.toLowerCase().includes(q) ||
      inv.vehicle.toLowerCase().includes(q)
    const matchesStatus = statusFilter === 'All' || inv.status === statusFilter
    return matchesSearch && matchesStatus
  })

  const statusCounts = ['All', ...Object.keys(INVOICE_STATUS)].reduce((acc, s) => {
    acc[s] = s === 'All' ? scoped.length : scoped.filter(inv => inv.status === s).length
    return acc
  }, {})

  const totalOutstanding = scoped
    .filter(inv => ['sent', 'overdue', 'partial'].includes(inv.status))
    .reduce((sum, inv) => sum + (inv.total - (Number(inv.amountPaid) || 0)), 0)

  return (
    <div className="p-4 sm:p-5 lg:p-6 space-y-4 sm:space-y-5 animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-semibold text-text-primary">Invoices</h1>
          <p className="text-xs text-text-muted mt-0.5">
            {scoped.filter(i => i.status === 'paid').length} paid · ${totalOutstanding.toFixed(0)} outstanding
          </p>
        </div>
        <div className="flex items-center gap-2">
        <Button onClick={() => { setGeneratorSource(null); setGeneratorOpen(true) }}>
          <Plus size={15} />
          New invoice
        </Button>
        <Button variant="secondary" onClick={() => {
          const rows = scoped.map(i => [i.id, i.customerName, i.vehicle, i.status, i.total?.toFixed(2), i.created].join(','))
          const csv = ['Invoice,Customer,Vehicle,Status,Amount,Date', ...rows].join('\n')
          const blob = new Blob([csv], { type: 'text/csv' })
          const url = URL.createObjectURL(blob)
          const a = document.createElement('a')
          a.href = url
          a.download = `invoices-${new Date().toISOString().slice(0,10)}.csv`
          a.click()
          URL.revokeObjectURL(url)
        }}>
          <Download size={15} />
          Export
        </Button>
        </div>
      </div>

      <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-hide pb-1 -mx-4 px-4 sm:mx-0 sm:px-0">
        {['All', ...Object.keys(INVOICE_STATUS)].map(s => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={cn(
              'flex items-center gap-1.5 h-7 px-3 rounded-md text-xs font-medium whitespace-nowrap',
              'transition-all duration-150',
              statusFilter === s
                ? 'bg-orange-subtle text-orange'
                : 'text-text-muted hover:text-text-primary hover:bg-surface'
            )}
          >
            {s === 'All' ? 'All' : INVOICE_STATUS[s].label}
            <span className={cn('text-2xs px-1 py-0.5 rounded', statusFilter === s ? 'bg-orange/20' : 'bg-border')}>
              {statusCounts[s]}
            </span>
          </button>
        ))}
      </div>

      <div className="relative">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search invoices..."
          className="w-full h-9 pl-9 pr-3 rounded-lg bg-background border border-border text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-1 focus:ring-orange/40 transition-shadow"
        />
      </div>

      <div className="rounded-lg border border-border overflow-hidden">
        <Table>
          <Thead>
            <Tr>
              <Th>Invoice</Th>
              <Th className="hidden sm:table-cell">Vehicle</Th>
              <Th className="hidden md:table-cell">Shop</Th>
              <Th>Status</Th>
              <Th className="text-right">Amount</Th>
            </Tr>
          </Thead>
          <Tbody>
            {filtered.map(inv => {
              const shop = shops.find(s => s.id === inv.shopId)
              return (
                <Tr key={inv.id} onClick={() => setSelected(inv)} className="cursor-pointer">
                  <Td>
                    <div className="text-sm font-medium text-text-primary">{inv.id}</div>
                    <div className="text-2xs text-text-muted">{inv.customerName}</div>
                  </Td>
                  <Td className="hidden sm:table-cell">
                    <span className="text-xs text-text-secondary">{inv.vehicle}</span>
                  </Td>
                  <Td className="hidden md:table-cell">
                    <span className="text-xs text-text-muted">{shop?.name}</span>
                  </Td>
                  <Td><StatusBadge status={inv.status} /></Td>
                  <Td className="text-right">
                    <span className="text-sm font-medium text-text-primary tabular-nums">${inv.total.toFixed(2)}</span>
                  </Td>
                </Tr>
              )
            })}
          </Tbody>
        </Table>
        {filtered.length === 0 && (
          <div className="py-12 text-center text-sm text-text-muted">No invoices found</div>
        )}
      </div>

      <InvoiceDetail
        invoice={selected}
        onClose={() => setSelected(null)}
        shops={shops}
        onPrint={(inv) => { setSelected(null); setGeneratorSource(inv); setGeneratorOpen(true) }}
        onUpdate={async (id, patch) => {
          const r = await updateInvoice(id, patch)
          if (!r?.error) {
            // 'unpaid' is the server transition; locally the invoice shows as sent
            const display = patch.status === 'unpaid'
              ? { ...patch, status: 'sent', paidAt: null, amountPaid: 0, paymentMethod: null }
              : patch
            setSelected(prev => prev ? { ...prev, ...display } : prev)
          }
          return r
        }}
        onRecordPayment={async (id, amount) => {
          const r = await recordInvoicePayment(id, amount)
          if (!r?.error) {
            setSelected(prev => {
              if (!prev) return prev
              const newPaid = (Number(prev.amountPaid) || 0) + amount
              const full = newPaid >= prev.total - 0.005
              return {
                ...prev,
                amountPaid: newPaid,
                status: full ? 'paid' : 'partial',
                paidAt: full ? new Date().toISOString() : prev.paidAt,
                paymentMethod: full ? (prev.paymentMethod || 'Recorded manually') : prev.paymentMethod,
              }
            })
          }
          return r
        }}
        onVoid={async (id) => {
          const r = await voidInvoice(id)
          if (!r?.error) setSelected(null)
        }}
      />
      <InvoiceGeneratorModal
        open={generatorOpen}
        onClose={() => { setGeneratorOpen(false); setGeneratorSource(null) }}
        fromInvoice={generatorSource}
      />
    </div>
  )
}
