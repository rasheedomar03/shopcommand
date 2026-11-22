import { useEffect, useState, useCallback } from 'react'
import { Wallet, Printer } from 'lucide-react'
import { useData } from '@/contexts/DataContext'
import { PrintPortal } from '@/components/PrintPortal'
import { formatMoney, formatDate } from '@/lib/utils'

// A customer's credit on account (prepaid or overpaid), like a gift card:
// add credit, see what was used and what is left, refund it, print a statement.
const KIND_LABEL = { deposit: 'Credit added', applied: 'Used on invoice', refund: 'Refunded', adjustment: 'Returned' }

export function CustomerCredit({ customer, canEdit, shopName }) {
  const { loadCustomerCredit, addCustomerCredit } = useData()
  const [entries, setEntries] = useState([])
  const [loading, setLoading] = useState(true)
  const [mode, setMode] = useState(null) // null | 'deposit' | 'refund'
  const [amount, setAmount] = useState('')
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState(null)
  const [printing, setPrinting] = useState(false)

  const balance = Number(customer.creditBalance) || 0

  const reload = useCallback(async () => {
    const res = await loadCustomerCredit(customer.id)
    setEntries(res?.entries || [])
    setLoading(false)
  }, [loadCustomerCredit, customer.id])

  useEffect(() => { setLoading(true); reload() }, [reload, balance])

  async function submit(e) {
    e.preventDefault()
    setBusy(true); setErr(null)
    try {
      await addCustomerCredit(customer.id, { kind: mode, amount, note })
    } catch (ex) {
      setBusy(false)
      setErr(ex?.message || 'Could not save that')
      return
    }
    setBusy(false)
    setMode(null); setAmount(''); setNote('')
    // The list reloads by itself: the balance changed, and the effect above watches it
  }

  function printStatement() {
    setPrinting(true)
    setTimeout(() => { window.print(); setPrinting(false) }, 50)
  }

  // Nothing to show for a customer who never had credit, unless the user can add some.
  if (!loading && entries.length === 0 && !canEdit) return null

  return (
    <div className="bg-surface border border-border rounded-xl overflow-hidden">
      <div className="px-5 py-3.5 border-b border-border flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm font-semibold text-text-primary"><Wallet size={14} className="text-text-muted" />Credit on account</div>
        {entries.length > 0 && (
          <button onClick={printStatement} className="text-2xs text-text-muted hover:text-text-primary flex items-center gap-1"><Printer size={12} />Statement</button>
        )}
      </div>
      <div className="px-5 py-4">
        <div className="text-2xl font-bold text-text-primary">{formatMoney(balance)}</div>
        <div className="text-2xs text-text-muted">available to use on invoices</div>

        {canEdit && !mode && (
          <div className="flex gap-2 mt-3">
            <button onClick={() => setMode('deposit')} className="text-xs px-3 py-1.5 rounded-md bg-orange text-white font-medium">Add credit</button>
            {balance > 0 && <button onClick={() => setMode('refund')} className="text-xs px-3 py-1.5 rounded-md border border-border text-text-secondary">Refund</button>}
          </div>
        )}

        {mode && (
          <form onSubmit={submit} className="mt-3 space-y-2">
            <div className="text-xs font-medium text-text-primary">{mode === 'deposit' ? 'Add credit (prepayment or overpayment)' : 'Refund credit to the customer'}</div>
            <input inputMode="decimal" autoFocus placeholder="Amount" value={amount} onChange={e => setAmount(e.target.value)}
              className="w-full bg-background border border-border rounded-md px-3 py-1.5 text-sm" />
            <input placeholder="Note (optional)" value={note} onChange={e => setNote(e.target.value)} maxLength={200}
              className="w-full bg-background border border-border rounded-md px-3 py-1.5 text-sm" />
            {mode === 'deposit' && <div className="text-2xs text-text-muted">This is not counted as revenue until it is used on an invoice.</div>}
            {err && <div className="text-xs text-status-red">{err}</div>}
            <div className="flex gap-2">
              <button disabled={busy} className="text-xs px-3 py-1.5 rounded-md bg-orange text-white font-medium disabled:opacity-50">{busy ? 'Saving…' : mode === 'deposit' ? 'Add credit' : 'Refund'}</button>
              <button type="button" onClick={() => { setMode(null); setErr(null) }} className="text-xs px-3 py-1.5 rounded-md border border-border text-text-secondary">Cancel</button>
            </div>
          </form>
        )}
      </div>

      {entries.length > 0 && (
        <div className="border-t border-border divide-y divide-border max-h-64 overflow-y-auto">
          {entries.map(e => (
            <div key={e.id} className="px-5 py-2.5 flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="text-xs text-text-primary">{KIND_LABEL[e.kind] || e.kind}{e.invoice_number ? ` · ${e.invoice_number}` : ''}</div>
                <div className="text-2xs text-text-muted truncate">{formatDate(e.created_at)}{e.note ? ` · ${e.note}` : ''}</div>
              </div>
              <div className={`text-xs font-medium ${e.amount < 0 ? 'text-text-secondary' : 'text-status-green'}`}>{e.amount < 0 ? '−' : '+'}{formatMoney(Math.abs(e.amount))}</div>
            </div>
          ))}
        </div>
      )}

      {printing && (
        <PrintPortal padding={24}>
          <h2 style={{ margin: 0 }}>{shopName || 'Credit statement'}</h2>
          <div style={{ marginBottom: 12, color: '#475569' }}>Credit statement for {customer.name} · {formatDate(new Date().toISOString())}</div>
          <table style={{ width: '100%' }}>
            <thead><tr style={{ textAlign: 'left', borderBottom: '1px solid #cbd5e1' }}><th>Date</th><th>What</th><th>Note</th><th style={{ textAlign: 'right' }}>Amount</th></tr></thead>
            <tbody>
              {[...entries].reverse().map(e => (
                <tr key={e.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                  <td style={{ padding: '4px 0' }}>{formatDate(e.created_at)}</td>
                  <td>{KIND_LABEL[e.kind] || e.kind}{e.invoice_number ? ` · ${e.invoice_number}` : ''}</td>
                  <td>{e.note || ''}</td>
                  <td style={{ textAlign: 'right' }}>{e.amount < 0 ? '−' : '+'}{formatMoney(Math.abs(e.amount))}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div style={{ marginTop: 12, textAlign: 'right', fontWeight: 700 }}>Credit remaining: {formatMoney(balance)}</div>
        </PrintPortal>
      )}
    </div>
  )
}
