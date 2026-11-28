import { useState, useEffect } from 'react'
import { Search, Download, Send, CheckCircle, Clock, AlertCircle, DollarSign, Printer, Plus, Pencil, Trash2, FileText } from 'lucide-react'
import { EmptyState } from '@/components/EmptyState'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/Button'
import { Table, Thead, Th, Tbody, Tr, Td } from '@/components/ui/Table'
import { Modal } from '@/components/ui/Modal'
import { InvoiceGeneratorModal } from '@/components/modals/InvoiceGeneratorModal'
import { BlankFormModal } from '@/components/modals/BlankFormModal'
import { VoidedInvoices } from '@/components/VoidedInvoices'
import { formatMoney, formatDate, formatRelativeTime, roLabel, matchesSearch, localYmd } from '@/lib/utils'
import { useUnitLabel } from '@/lib/unitLabel'
import { priceInvoiceEdit, invoiceBreakdown } from '@/lib/invoiceEdit'
import { invoiceNumberTaken, invoiceMatchesQuery, lineDisplay } from '@/lib/invoiceLines'
import { invoicesToCsv } from '@/lib/invoiceExport'
import { logoOf } from '@/lib/shopLogo'
import { PrintPortal } from '@/components/PrintPortal'
import { useSearchParams } from 'react-router-dom'
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
    <span className={cn('inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-2xs font-semibold whitespace-nowrap', cfg.bg, cfg.color)}>
      <span className={cn('w-1.5 h-1.5 rounded-full', cfg.color.replace('text-', 'bg-'))} />
      {cfg.label}
    </span>
  )
}

function InvoiceDetail({ invoice, onClose, shops, onUpdate, onVoid, onRecordPayment, onApplyCredit, onEmail, onEditInGenerator }) {
  const [confirmVoid, setConfirmVoid] = useState(false)
  const [confirmUnpay, setConfirmUnpay] = useState(false)
  const [editing, setEditing] = useState(false)
  const [rows, setRows] = useState([])
  const [numDraft, setNumDraft] = useState('')
  const [billName, setBillName] = useState('')
  const [billEmail, setBillEmail] = useState('')
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState(null)
  const [payOpen, setPayOpen] = useState(false)
  const [payAmount, setPayAmount] = useState('')
  const [payError, setPayError] = useState(null)
  const [paying, setPaying] = useState(false)
  const [emailState, setEmailState] = useState('idle') // idle | sending | sent
  const [emailError, setEmailError] = useState(null)
  const [creditOpen, setCreditOpen] = useState(false)
  const [creditAmount, setCreditAmount] = useState('')
  const [creditError, setCreditError] = useState(null)
  const [applying, setApplying] = useState(false)
  const { repairOrders, invoices: allInvoices, customers } = useData()
  const unitLabel = useUnitLabel()

  // Reset edit state when a different invoice opens (or the modal closes)
  useEffect(() => {
    setEditing(false)
    setConfirmVoid(false)
    setConfirmUnpay(false)
    setSaveError(null)
    setPayOpen(false)
    setPayError(null)
    setCreditOpen(false)
    setCreditError(null)
    setEmailState('idle')
    setEmailError(null)
  }, [invoice?.id])

  if (!invoice) return null
  const shop = shops.find(s => s.id === invoice.shopId)
  const editable = invoice.status !== 'paid'
  const amountPaid = Number(invoice.amountPaid) || 0
  const balance = Math.max(0, Math.round((invoice.total - amountPaid) * 100) / 100)
  const canTakePayment = ['sent', 'overdue', 'partial'].includes(invoice.status)
  // Credit on account (prepaid or overpaid). Matched by customer id; the demo has no ids, so by name.
  const creditCustomer = customers.find(c => invoice.customerId != null && String(c.id) === String(invoice.customerId))
    || (invoice.customerId == null ? customers.find(c => c.name && c.name === invoice.customerName) : null)
  const creditAvailable = Math.max(0, Number(creditCustomer?.creditBalance) || 0)
  const creditUsed = Number(invoice.creditApplied) || 0
  const creditLeft = creditAvailable
  // Credit on account is money a customer paid ahead; an invoice for your own fleet has no customer to owe it
  const canUseCredit = canTakePayment && !invoice.internal && creditAvailable > 0 && balance > 0 && (!!invoice.dbId || !!invoice.customerId || creditCustomer)

  const sendEmail = async () => {
    setEmailState('sending')
    setEmailError(null)
    const r = await onEmail(invoice.id)
    if (r?.error) {
      setEmailState('idle')
      setEmailError(r.error)
    } else {
      setEmailState('sent')
    }
  }

  const submitPayment = async () => {
    setPaying(true)
    setPayError(null)
    const r = await onRecordPayment(invoice.id, Number(payAmount))
    setPaying(false)
    if (r?.error) setPayError(r.error)
    else { setPayOpen(false); setPayAmount('') }
  }

  const submitCredit = async () => {
    setApplying(true)
    setCreditError(null)
    const r = await onApplyCredit(invoice.id, Number(creditAmount))
    setApplying(false)
    if (r?.error) setCreditError(r.error)
    else { setCreditOpen(false); setCreditAmount('') }
  }

  const startEdit = () => {
    setRows(invoice.services.map(s => ({ name: s.name, parts: s.parts ?? 0, labor: s.labor ?? 0 })))
    setNumDraft(invoice.id)
    setBillName(invoice.customerName || '')
    setBillEmail(invoice.customerEmail || '')
    setSaveError(null)
    setEditing(true)
  }
  const setRow = (i, field, value) => setRows(prev => prev.map((r, idx) => idx === i ? { ...r, [field]: value } : r))
  // Database invoices: the amount already includes tax and must not change
  // unless the line items do (see lib/invoiceEdit.js). Device-only invoices
  // carry 8.25% tax computed here.
  // "Database invoice" here means one that comes from a repair order (priced and
  // edited through its repair order). Invoices made from scratch are edited in the
  // generator whether they are saved on the server or only on this computer.
  const isDb = !!invoice.dbId && !!invoice.roId
  const namedRows = rows.filter(r => String(r.name).trim())
  const dbEdit = isDb && editing ? priceInvoiceEdit(invoice, namedRows) : null
  const editSubtotal = dbEdit ? dbEdit.subtotal : rows.reduce((sum, r) => sum + (Number(r.parts) || 0) + (Number(r.labor) || 0), 0)
  const editTax = dbEdit ? dbEdit.tax : (invoice.tax > 0 ? Math.round(editSubtotal * 8.25) / 100 : 0)
  const editTotal = dbEdit ? dbEdit.total : Math.round((editSubtotal + editTax) * 100) / 100
  const view = invoiceBreakdown(invoice)
  // Browser-made invoices keep quantity and unit price on every line
  const useLines = !isDb && Array.isArray(invoice.lines) && invoice.lines.length > 0
  const cardFeeAmt = Number(invoice.cardFeeAmount) || 0
  const taxLabel = isDb ? 'Tax' : `Sales tax (${invoice.taxRate ?? 8.25}%)`
  const showTax = isDb || view.tax > 0

  const saveEdit = async () => {
    const services = rows
      .filter(r => String(r.name).trim())
      .map(r => ({ name: String(r.name).trim(), parts: Number(r.parts) || 0, labor: Number(r.labor) || 0 }))
    if (services.length === 0) {
      setSaveError('An invoice needs at least one line item')
      return
    }
    const newNumber = numDraft.trim()
    if (!newNumber || newNumber.length > 30) {
      setSaveError('Invoice number must be 1-30 characters')
      return
    }
    if (invoiceNumberTaken(allInvoices, newNumber, invoice.id)) {
      setSaveError('That invoice number is already used by another invoice. Choose a different one.')
      return
    }
    const newEmail = billEmail.trim()
    if (newEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newEmail)) {
      setSaveError('That customer email does not look valid')
      return
    }
    setSaving(true)
    setSaveError(null)
    // Database invoices: only send lines and amount when the lines actually
    // changed, so renaming or fixing the customer email can never alter the
    // amount (it used to drop the tax).
    const pricing = isDb ? priceInvoiceEdit(invoice, services) : null
    const r = await onUpdate(invoice.id, {
      ...(isDb
        ? (pricing.changed ? { services, subtotal: pricing.subtotal, tax: pricing.tax, total: pricing.total } : {})
        : { services, subtotal: editSubtotal, tax: editTax, total: editTotal }),
      ...(newNumber !== invoice.id ? { number: newNumber } : {}),
      ...(billName.trim() !== (invoice.customerName || '') ? { customerName: billName.trim() } : {}),
      ...(newEmail !== (invoice.customerEmail || '') ? { customerEmail: newEmail } : {}),
    })
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
            {/* invoice.roId may be the RO's database id or its number; show the number */}
            {invoice.roId && <div className="text-xs text-text-muted">RO: {roLabel(repairOrders.find(r => r.id === invoice.roId || r.roNumber === invoice.roId)) || invoice.roId}</div>}
          </div>
        </div>

        {editing && (
          <div className="grid sm:grid-cols-3 gap-2.5">
            <div>
              <label className="block text-2xs font-medium text-text-muted uppercase tracking-wider mb-1">Invoice #</label>
              <input
                value={numDraft}
                onChange={e => setNumDraft(e.target.value)}
                maxLength={30}
                className="w-full h-8 px-2.5 rounded-md bg-background border border-border text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-orange/40"
              />
            </div>
            <div>
              <label className="block text-2xs font-medium text-text-muted uppercase tracking-wider mb-1">Bill to</label>
              <input
                value={billName}
                onChange={e => setBillName(e.target.value)}
                maxLength={100}
                placeholder="Customer name"
                className="w-full h-8 px-2.5 rounded-md bg-background border border-border text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-1 focus:ring-orange/40"
              />
            </div>
            <div>
              <label className="block text-2xs font-medium text-text-muted uppercase tracking-wider mb-1">Customer email</label>
              <input
                type="email"
                value={billEmail}
                onChange={e => setBillEmail(e.target.value)}
                maxLength={200}
                placeholder="customer@email.com"
                className="w-full h-8 px-2.5 rounded-md bg-background border border-border text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-1 focus:ring-orange/40"
              />
            </div>
          </div>
        )}

        {invoice.internal && (
          <div className="rounded-lg border border-border bg-background px-3 py-2 text-xs text-text-secondary">
            Your own fleet. This invoice tracks the cost of a truck you run and is not counted as revenue or as money owed to you.
          </div>
        )}

        {!isDb && (invoice.unitNumber || invoice.vin || invoice.jobTitle || invoice.diagnostics) && (
          <div className="rounded-lg border border-border bg-background px-4 py-3 text-sm space-y-1">
            {invoice.jobTitle && <div className="font-semibold text-text-primary">{invoice.jobTitle}</div>}
            {(invoice.unitNumber || invoice.vin) && (
              <div className="text-xs text-text-secondary">
                {invoice.unitNumber && <>{unitLabel} <span className="font-medium text-text-primary">{invoice.unitNumber}</span></>}
                {invoice.unitNumber && invoice.vin && ' · '}
                {invoice.vin && <>VIN <span className="font-mono text-text-primary">{invoice.vin}</span></>}
              </div>
            )}
            {invoice.diagnostics && <div className="text-xs text-text-muted whitespace-pre-wrap">Diagnostics: {invoice.diagnostics}</div>}
          </div>
        )}

        <div className="rounded-lg border border-border overflow-hidden">
          {useLines && !editing ? (
            <div className="grid grid-cols-[1fr_44px_76px_76px] gap-3 px-4 py-2.5 bg-background text-xs font-medium text-text-muted uppercase tracking-wider">
              <div>Description</div>
              <div className="text-right">Qty</div>
              <div className="text-right">Price</div>
              <div className="text-right">Total</div>
            </div>
          ) : (
            <div className="grid grid-cols-[1fr_auto_auto] gap-4 px-4 py-2.5 bg-background text-xs font-medium text-text-muted uppercase tracking-wider">
              <div>Service</div>
              <div className="text-right">Parts</div>
              <div className="text-right">Labor</div>
            </div>
          )}
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
          ) : useLines ? (
            invoice.lines.map((l, i) => {
              const d = lineDisplay(l)
              return (
                <div key={i} className={cn('grid grid-cols-[1fr_44px_76px_76px] gap-3 px-4 py-3 text-sm', i > 0 && 'border-t border-border')}>
                  <div className="text-text-primary">{l.desc}</div>
                  <div className="text-right text-text-secondary tabular-nums">{d.qty}</div>
                  {/* One amount when the quantity is 1; price each and line total otherwise */}
                  <div className="text-right text-text-secondary tabular-nums">{d.showUnit ? formatMoney(d.unit) : ''}</div>
                  <div className="text-right text-text-primary tabular-nums">{formatMoney(d.total)}</div>
                </div>
              )
            })
          ) : (
            invoice.services.map((svc, i) => (
              <div key={i} className={cn('grid grid-cols-[1fr_auto_auto] gap-4 px-4 py-3 text-sm', i > 0 && 'border-t border-border')}>
                <div className="text-text-primary">{svc.name}</div>
                <div className="text-right text-text-secondary tabular-nums">{formatMoney(svc.parts)}</div>
                <div className="text-right text-text-secondary tabular-nums">{formatMoney(svc.labor)}</div>
              </div>
            ))
          )}
          <div className="border-t border-border px-4 py-3 space-y-1.5 bg-background">
            <div className="flex justify-between text-sm text-text-secondary">
              <span>Subtotal</span>
              <span className="tabular-nums">{formatMoney(editing ? editSubtotal : view.subtotal)}</span>
            </div>
            {(editing || showTax) && (
              <div className="flex justify-between text-sm text-text-secondary">
                <span>{taxLabel}</span>
                <span className="tabular-nums">{formatMoney(editing ? editTax : view.tax)}</span>
              </div>
            )}
            {!editing && cardFeeAmt > 0 && (
              <div className="flex justify-between text-sm text-text-secondary">
                <span>Card fee {invoice.cardFeeRate ?? 3}%</span>
                <span className="tabular-nums">{formatMoney(cardFeeAmt)}</span>
              </div>
            )}
            <div className="flex justify-between text-sm font-semibold text-text-primary pt-1.5 border-t border-border">
              <span>Total</span>
              <span className="text-orange tabular-nums">{formatMoney(editing ? editTotal : view.total)}</span>
            </div>
          </div>
        </div>

        {saveError && (
          <div className="px-3 py-2.5 rounded-lg bg-status-red/5 border border-status-red/20 text-xs text-status-red">
            {saveError}
          </div>
        )}

        {emailError && (
          <div className="px-3 py-2.5 rounded-lg bg-status-red/5 border border-status-red/20 text-xs text-status-red">
            {emailError}
          </div>
        )}

        {invoice.status === 'paid' && invoice.paidAt && (
          <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-status-green/5 border border-status-green/20">
            <CheckCircle size={14} className="text-status-green" />
            <span className="text-xs text-status-green font-medium">
              Paid {formatRelativeTime(invoice.paidAt)}{invoice.paymentMethod ? ` via ${invoice.paymentMethod}` : ''}
            </span>
          </div>
        )}

        {invoice.status !== 'paid' && amountPaid > 0 && (
          <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-orange/5 border border-orange/20">
            <DollarSign size={14} className="text-orange" />
            <span className="text-xs text-orange font-medium">
              {formatMoney(amountPaid)} paid · {formatMoney(balance)} balance remaining
            </span>
          </div>
        )}

        {creditUsed > 0 && (
          <div className="text-xs text-text-secondary px-1">
            {formatMoney(creditUsed)} of this invoice was paid with credit on account{creditCustomer ? ` · ${formatMoney(creditLeft)} credit left` : ''}.
          </div>
        )}

        {creditOpen && canUseCredit && (
          <div className="px-3 py-3 rounded-lg bg-background border border-border space-y-2">
            <div className="text-xs font-medium text-text-secondary">Use credit on account ({formatMoney(creditAvailable)} available)</div>
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-text-muted">$</span>
                <input
                  autoFocus
                  type="number" min="0.01" step="0.01" inputMode="decimal"
                  value={creditAmount}
                  onChange={e => setCreditAmount(e.target.value)}
                  placeholder={Math.min(balance, creditAvailable).toFixed(2)}
                  className="w-full h-8 pl-6 pr-2.5 rounded-md bg-surface border border-border text-sm text-text-primary tabular-nums focus:outline-none focus:ring-1 focus:ring-orange/40"
                />
              </div>
              <button
                onClick={() => setCreditAmount(Math.min(balance, creditAvailable).toFixed(2))}
                className="text-xs text-orange hover:underline underline-offset-2 whitespace-nowrap"
              >
                As much as fits
              </button>
              <Button size="sm" onClick={submitCredit} disabled={applying || !(Number(creditAmount) > 0)}>
                {applying ? 'Applying...' : 'Apply'}
              </Button>
              <Button size="sm" variant="secondary" onClick={() => { setCreditOpen(false); setCreditError(null) }} disabled={applying}>
                Cancel
              </Button>
            </div>
            {creditError && <div className="text-xs text-status-red">{creditError}</div>}
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

        {!invoice.dbId && (
          <p className="text-2xs text-text-muted">
            This invoice is saved on this computer only for now. Print / PDF prints it exactly as shown above; choose Save as PDF in the print window for a PDF file.
          </p>
        )}
        {invoice.dbId && (
          <p className="text-2xs text-text-muted">
            Print / PDF prints this invoice exactly as shown above. Choose Save as PDF in the print window for a PDF file.
          </p>
        )}

        <div className="flex items-center justify-between pt-2 flex-wrap gap-2">
          <div className="flex items-center gap-3">
            <div className="text-xs text-text-muted whitespace-nowrap">Created {formatDate(invoice.created)}</div>
            {invoice.status !== 'paid' && (
              confirmVoid ? (
                <span className="flex items-center gap-2 text-xs">
                  <span className="text-status-red">Remove this invoice? It's kept on record for your books.</span>
                  <button onClick={() => { setConfirmVoid(false); onVoid(invoice.id) }} className="font-semibold text-status-red hover:underline whitespace-nowrap">Yes, void it</button>
                  <button onClick={() => setConfirmVoid(false)} className="text-text-muted hover:text-text-primary">Cancel</button>
                </span>
              ) : (
                <button
                  onClick={() => setConfirmVoid(true)}
                  title="Removes the invoice from the list; the record is kept for your books"
                  className="flex items-center gap-1.5 h-8 px-3 rounded-lg border border-status-red/30 text-xs font-medium text-status-red hover:bg-status-red/10 transition-colors whitespace-nowrap flex-shrink-0"
                >
                  <Trash2 size={13} /> Void invoice
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
                  <Button size="sm" variant="secondary" onClick={isDb || !onEditInGenerator ? startEdit : () => onEditInGenerator(invoice)}>
                    <Pencil size={13} /> Edit
                  </Button>
                )}
                <Button size="sm" variant="secondary" onClick={() => window.print()} title="Prints this invoice exactly as shown. Choose Save as PDF in the print window to get a PDF.">
                  <Printer size={13} /> Print / PDF
                </Button>
                {invoice.customerEmail && (
                  <Button size="sm" variant="secondary" onClick={sendEmail} disabled={emailState !== 'idle'}>
                    {emailState === 'sent'
                      ? <><CheckCircle size={13} className="text-status-green" /> Sent</>
                      : <><Send size={13} /> {emailState === 'sending' ? 'Sending...' : 'Email to customer'}</>}
                  </Button>
                )}
                {!isDb && invoice.status === 'sent' && amountPaid === 0 && (
                  <Button size="sm" variant="secondary" onClick={() => onUpdate(invoice.id, { status: 'draft' })} title="Undo Mark as sent. The invoice goes back to a draft.">
                    Mark as draft
                  </Button>
                )}
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
                {canUseCredit && (
                  <Button size="sm" variant="secondary" onClick={() => { setCreditOpen(v => !v); setCreditAmount(''); setCreditError(null) }}>
                    <DollarSign size={13} /> Use credit ({formatMoney(creditAvailable)})
                  </Button>
                )}
                {(invoice.status === 'paid' || (invoice.status === 'partial' && amountPaid > 0)) && (
                  confirmUnpay ? (
                    <span className="flex items-center gap-2 text-xs">
                      <span className="text-text-secondary">
                        {invoice.status === 'partial'
                          ? `Remove the ${formatMoney(amountPaid)} recorded so far?`
                          : 'Move back to unpaid?'}
                      </span>
                      <button onClick={() => { setConfirmUnpay(false); onUpdate(invoice.id, { status: 'unpaid' }) }} className="font-semibold text-orange hover:underline">Yes</button>
                      <button onClick={() => setConfirmUnpay(false)} className="text-text-muted hover:text-text-primary">Cancel</button>
                    </span>
                  ) : (
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => setConfirmUnpay(true)}
                      title={invoice.status === 'partial' ? 'Removes the payments recorded so far, so you can enter them again correctly' : undefined}
                    >
                      {invoice.status === 'partial' ? 'Undo payments' : 'Mark as unpaid'}
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

      {/* Print-only copy of this invoice, placed directly in the page (not in this
          window) so it prints on whole pages. Print / PDF prints exactly what is
          saved here, with no separate generator screen. */}
      <PrintPortal padding={36}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 24, paddingBottom: 14, borderBottom: '1px solid #cbd5e1' }}>
          <div>
            {logoOf(shop) && <img src={logoOf(shop).src} alt="" style={{ width: logoOf(shop).width, maxWidth: '100%', height: 'auto', marginBottom: 6 }} />}
            <div style={{ fontSize: 18, fontWeight: 700 }}>{shop?.name || 'Shop'}</div>
            {shop?.address && <div style={{ color: '#64748b', marginTop: 2 }}>{shop.address}</div>}
            {shop?.phone && <div style={{ color: '#64748b', marginTop: 2 }}>{shop.phone}</div>}
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 18, fontWeight: 700 }}>INVOICE</div>
            <div style={{ marginTop: 2 }}>{invoice.id}</div>
            <div style={{ color: '#64748b', marginTop: 2 }}>{formatDate(invoice.created)}</div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 40, padding: '14px 0' }}>
          <div>
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1, color: '#64748b' }}>BILL TO</div>
            <div style={{ fontWeight: 600, marginTop: 2 }}>{invoice.customerName || '-'}</div>
          </div>
          <div>
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1, color: '#64748b' }}>VEHICLE</div>
            <div style={{ fontWeight: 600, marginTop: 2 }}>{invoice.vehicle || '-'}</div>
          </div>
          {!isDb && invoice.unitNumber && (
            <div>
              <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1, color: '#64748b' }}>TRUCK #</div>
              <div style={{ fontWeight: 600, marginTop: 2 }}>{invoice.unitNumber}</div>
            </div>
          )}
          {!isDb && invoice.vin && (
            <div>
              <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1, color: '#64748b' }}>VIN</div>
              <div style={{ fontWeight: 600, marginTop: 2, fontFamily: 'monospace' }}>{invoice.vin}</div>
            </div>
          )}
        </div>
        {!isDb && invoice.jobTitle && <div style={{ fontWeight: 700, paddingBottom: 6 }}>{invoice.jobTitle}</div>}
        {!isDb && invoice.diagnostics && (
          <div style={{ paddingBottom: 10 }}>
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1, color: '#64748b' }}>DIAGNOSTICS</div>
            <div style={{ whiteSpace: 'pre-wrap', color: '#334155', marginTop: 2 }}>{invoice.diagnostics}</div>
          </div>
        )}
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid #cbd5e1', textAlign: 'left', fontSize: 10, letterSpacing: 1, color: '#64748b' }}>
              <th style={{ padding: '6px 0' }}>DESCRIPTION</th>
              {useLines ? (
                <>
                  <th style={{ padding: '6px 0', textAlign: 'right' }}>QTY</th>
                  <th style={{ padding: '6px 0', textAlign: 'right' }}>PRICE</th>
                  <th style={{ padding: '6px 0', textAlign: 'right' }}>TOTAL</th>
                </>
              ) : (
                <>
                  <th style={{ padding: '6px 0', textAlign: 'right' }}>PARTS</th>
                  <th style={{ padding: '6px 0', textAlign: 'right' }}>LABOR</th>
                </>
              )}
            </tr>
          </thead>
          <tbody>
            {useLines
              ? invoice.lines.map((l, i) => {
                  const d = lineDisplay(l)
                  return (
                    <tr key={i} style={{ borderBottom: '1px solid #e2e8f0' }}>
                      <td style={{ padding: '7px 0' }}>{l.desc}</td>
                      <td style={{ padding: '7px 0', textAlign: 'right' }}>{d.qty}</td>
                      <td style={{ padding: '7px 0', textAlign: 'right' }}>{d.showUnit ? formatMoney(d.unit) : ''}</td>
                      <td style={{ padding: '7px 0', textAlign: 'right' }}>{formatMoney(d.total)}</td>
                    </tr>
                  )
                })
              : invoice.services.map((svc, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid #e2e8f0' }}>
                    <td style={{ padding: '7px 0' }}>{svc.name}</td>
                    <td style={{ padding: '7px 0', textAlign: 'right' }}>{formatMoney(svc.parts)}</td>
                    <td style={{ padding: '7px 0', textAlign: 'right' }}>{formatMoney(svc.labor)}</td>
                  </tr>
                ))}
          </tbody>
        </table>
        <div style={{ marginLeft: 'auto', width: 240, paddingTop: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '2px 0' }}><span>Subtotal</span><span>{formatMoney(view.subtotal)}</span></div>
          {showTax && <div style={{ display: 'flex', justifyContent: 'space-between', padding: '2px 0' }}><span>{taxLabel}</span><span>{formatMoney(view.tax)}</span></div>}
          {cardFeeAmt > 0 && <div style={{ display: 'flex', justifyContent: 'space-between', padding: '2px 0' }}><span>Card fee {invoice.cardFeeRate ?? 3}%</span><span>{formatMoney(cardFeeAmt)}</span></div>}
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', marginTop: 4, borderTop: '1px solid #cbd5e1', fontWeight: 700, fontSize: 15 }}><span>Total</span><span>{formatMoney(view.total)}</span></div>
          {amountPaid > 0 && (
            <>
              {creditUsed > 0 && <div style={{ display: 'flex', justifyContent: 'space-between', padding: '2px 0' }}><span>Credit applied</span><span>{formatMoney(creditUsed)}</span></div>}
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '2px 0' }}><span>Paid</span><span>{formatMoney(amountPaid)}</span></div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '2px 0', fontWeight: 600 }}><span>Balance due</span><span>{formatMoney(balance)}</span></div>
            </>
          )}
          {creditCustomer && (creditUsed > 0 || creditAvailable > 0) && (
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0 2px', marginTop: 6, borderTop: '1px dashed #cbd5e1', fontWeight: 600 }}><span>Credit remaining on account</span><span>{formatMoney(creditLeft)}</span></div>
          )}
        </div>
      </PrintPortal>
    </Modal>
  )
}

export default function Invoices() {
  const { shops, invoices, updateInvoice, voidInvoice, recordInvoicePayment, applyInvoiceCredit, emailInvoice, invoiceImport, dismissInvoiceImport } = useData()
  const unitLabel = useUnitLabel()
  const { session } = useAuth()
  const isAdvisor = session?.role === 'advisor'
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('All')
  const [selected, setSelected] = useState(null)
  const [generatorOpen, setGeneratorOpen] = useState(false)
  const [generatorSource, setGeneratorSource] = useState(null)
  const [blankFormOpen, setBlankFormOpen] = useState(false)
  const openInGenerator = (inv) => { setGeneratorSource(inv); setGeneratorOpen(true) }

  // Links from the top search box: /invoices?open=030 opens that invoice
  // (a draft in the generator, anything else in the detail view)
  const [searchParams, setSearchParams] = useSearchParams()
  const openParam = searchParams.get('open')
  useEffect(() => {
    if (!openParam) return
    const target = invoices.find(i => i.id === openParam)
    if (!target) return // data may still be loading; try again when it arrives
    if (!target.roId && target.status === 'draft') openInGenerator(target)
    else setSelected(target)
    setSearchParams({}, { replace: true })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openParam, invoices])

  const allInvoices = invoices
  const scoped = isAdvisor
    ? allInvoices.filter(inv => inv.shopId === session.shopId)
    : allInvoices

  const filtered = scoped.filter(inv => {
    const matchesText = invoiceMatchesQuery(inv, search)
    const matchesStatus = statusFilter === 'All' || inv.status === statusFilter
    return matchesText && matchesStatus
  })

  const statusCounts = ['All', ...Object.keys(INVOICE_STATUS)].reduce((acc, s) => {
    acc[s] = s === 'All' ? scoped.length : scoped.filter(inv => inv.status === s).length
    return acc
  }, {})

  // Money customers still owe you: sent, overdue and part-paid invoices. Drafts are not
  // counted, and neither are invoices for your own fleet (nobody owes you that).
  const totalOutstanding = scoped
    .filter(inv => ['sent', 'overdue', 'partial'].includes(inv.status) && !inv.internal)
    .reduce((sum, inv) => sum + (inv.total - (Number(inv.amountPaid) || 0)), 0)

  return (
    <div className="p-4 sm:p-5 lg:p-6 space-y-4 sm:space-y-5 animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-display text-xl font-semibold text-text-primary">Invoices</h1>
          <p className="text-xs text-text-muted mt-0.5">
            {scoped.filter(i => i.status === 'paid').length} paid · ${totalOutstanding.toFixed(0)} outstanding
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
        <Button onClick={() => { setGeneratorSource(null); setGeneratorOpen(true) }}>
          <Plus size={15} />
          New invoice
        </Button>
        <Button variant="secondary" onClick={() => {
          // A leading byte-order mark makes Excel read names with accents correctly
          const csv = '﻿' + invoicesToCsv(scoped)
          const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
          const url = URL.createObjectURL(blob)
          const a = document.createElement('a')
          a.href = url
          a.download = `invoices-${localYmd()}.csv`
          a.click()
          URL.revokeObjectURL(url)
        }}>
          <Download size={15} />
          Export
        </Button>
        <Button variant="secondary" onClick={() => setBlankFormOpen(true)} title="Print a blank paper work order to fill in by hand, for when the system is down">
          <Printer size={15} />
          Blank form
        </Button>
        </div>
      </div>

      {invoiceImport && (
        <div className="rounded-lg border border-orange/20 bg-orange/[0.05] px-4 py-3 text-xs text-text-secondary space-y-1" role="status">
          {invoiceImport.imported > 0 && (
            <p>
              <span className="font-semibold text-text-primary">
                {invoiceImport.imported} invoice{invoiceImport.imported === 1 ? '' : 's'} moved to your account
              </span>
              {' '}(total {formatMoney(invoiceImport.importedTotal)}). They are now saved on the server, so they are there on any computer. A backup copy of the originals stays on this computer, and your Export file is still good.
            </p>
          )}
          {invoiceImport.conflicts?.length > 0 && (
            <p>
              Not moved, because your account already has an invoice with the same number but a different amount: {invoiceImport.conflicts.join(', ')}. Their full details are saved aside in this browser (and in your Export file), and nothing was changed or deleted. Send us a message and we will sort them out.
            </p>
          )}
          {invoiceImport.failed?.length > 0 && (
            <p>
              Could not be moved yet. They are still in your list on this computer and the app will try again the next time it loads: {invoiceImport.failed.join(', ')}.
            </p>
          )}
          <button onClick={dismissInvoiceImport} className="font-semibold text-orange hover:underline">Dismiss</button>
        </div>
      )}

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
              <Th className="hidden sm:table-cell">{unitLabel}</Th>
              <Th className="hidden lg:table-cell">VIN</Th>
              <Th className="hidden md:table-cell">Shop</Th>
              <Th>Status</Th>
              <Th className="text-right">Amount</Th>
            </Tr>
          </Thead>
          <Tbody>
            {filtered.map(inv => {
              const shop = shops.find(s => s.id === inv.shopId)
              return (
                <Tr
                  key={inv.id}
                  // A draft opens in the invoice generator, filled in; everything else opens the detail view
                  onClick={() => (!inv.roId && inv.status === 'draft' ? openInGenerator(inv) : setSelected(inv))}
                  className="cursor-pointer"
                >
                  <Td>
                    <div className="text-sm font-medium text-text-primary">{inv.id}</div>
                    <div className="text-2xs text-text-muted">{inv.customerName}</div>
                  </Td>
                  <Td className="hidden sm:table-cell">
                    <span className="text-xs text-text-secondary">{inv.vehicle}</span>
                  </Td>
                  <Td className="hidden sm:table-cell">
                    <span className="text-xs font-medium text-text-primary">{inv.unitNumber || ''}</span>
                  </Td>
                  <Td className="hidden lg:table-cell">
                    <span className="text-2xs font-mono text-text-muted">{inv.vin || ''}</span>
                  </Td>
                  <Td className="hidden md:table-cell">
                    <span className="text-xs text-text-muted">{shop?.name}</span>
                  </Td>
                  <Td><StatusBadge status={inv.status} /></Td>
                  <Td className="text-right">
                    <span className="text-sm font-medium text-text-primary tabular-nums">{formatMoney(inv.total)}</span>
                  </Td>
                </Tr>
              )
            })}
          </Tbody>
        </Table>
        {filtered.length === 0 && (
          scoped.length === 0 ? (
            <EmptyState
              icon={FileText}
              title="No invoices yet"
              hint="An invoice is created when a repair order reaches Complete. You can also build one from scratch."
              actionLabel="New invoice"
              onAction={() => { setGeneratorSource(null); setGeneratorOpen(true) }}
            />
          ) : (
            <EmptyState search title="No invoices match your search" />
          )
        )}
      </div>

      <VoidedInvoices search={search} shopId={isAdvisor ? session.shopId : null} />

      <InvoiceDetail
        invoice={selected}
        onClose={() => setSelected(null)}
        shops={shops}
        onEditInGenerator={(inv) => { setSelected(null); openInGenerator(inv) }}
        onUpdate={async (id, patch) => {
          const r = await updateInvoice(id, patch)
          if (!r?.error) {
            // 'unpaid' is the server transition; locally the invoice shows as sent
            let display = patch.status === 'unpaid'
              ? { ...patch, status: 'sent', paidAt: null, amountPaid: 0, creditApplied: 0, paymentMethod: null }
              : patch
            // A new number becomes the display id
            if (display.number !== undefined) display = { ...display, id: display.number }
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
        onApplyCredit={async (id, amount) => {
          const r = await applyInvoiceCredit(id, amount)
          if (!r?.error) {
            setSelected(prev => {
              if (!prev) return prev
              const newPaid = (Number(prev.amountPaid) || 0) + amount
              const full = r.paid || newPaid >= prev.total - 0.005
              return {
                ...prev,
                amountPaid: newPaid,
                creditApplied: (Number(prev.creditApplied) || 0) + amount,
                status: full ? 'paid' : 'partial',
                paidAt: full ? new Date().toISOString() : prev.paidAt,
                paymentMethod: full ? (prev.paymentMethod || 'Credit on account') : prev.paymentMethod,
              }
            })
          }
          return r
        }}
        onVoid={async (id) => {
          const r = await voidInvoice(id)
          if (!r?.error) setSelected(null)
        }}
        onEmail={emailInvoice}
      />
      <BlankFormModal open={blankFormOpen} onClose={() => setBlankFormOpen(false)} />
      <InvoiceGeneratorModal
        open={generatorOpen}
        onClose={() => { setGeneratorOpen(false); setGeneratorSource(null) }}
        fromInvoice={generatorSource}
      />
    </div>
  )
}
