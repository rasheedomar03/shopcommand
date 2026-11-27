import { useState, useEffect } from 'react'
import { useData } from '@/contexts/DataContext'
import { formatMoney, formatDate } from '@/lib/utils'
import { invoiceMatchesQuery } from '@/lib/invoiceLines'

/**
 * Voided invoices, kept on record but left out of the list and every total.
 * Closed until asked for. Read only: a void cannot be undone.
 */
export function VoidedInvoices({ search = '', shopId = null }) {
  const { loadVoidedInvoices, invoices } = useData()
  const [open, setOpen] = useState(false)
  const [rows, setRows] = useState(null) // null = loading
  const [error, setError] = useState(null)

  // Reloaded when the invoice list changes, so a fresh void shows up
  useEffect(() => {
    if (!open) return undefined
    let alive = true
    loadVoidedInvoices()
      .then(r => { if (alive) { setRows(r); setError(null) } })
      .catch(() => { if (alive) setError('We could not load voided invoices. Try again in a moment.') })
    return () => { alive = false }
  }, [open, invoices.length, loadVoidedInvoices])

  const shown = (rows || [])
    .filter(r => !shopId || r.shopId === shopId)
    .filter(r => invoiceMatchesQuery(r, search))

  return (
    <div className="space-y-2">
      <button onClick={() => setOpen(o => !o)} aria-expanded={open} className="text-xs font-medium text-text-muted hover:text-text-primary">
        {open ? 'Hide voided invoices' : 'Show voided invoices'}
      </button>
      {open && (
        <div className="rounded-lg border border-border overflow-hidden">
          {error ? (
            <div className="px-4 py-3 text-xs text-status-red" role="alert">{error}</div>
          ) : rows === null ? (
            <div className="px-4 py-3 text-xs text-text-muted">Loading...</div>
          ) : shown.length === 0 ? (
            <div className="px-4 py-3 text-xs text-text-muted">{rows.length === 0 ? 'No voided invoices' : 'No voided invoices match'}</div>
          ) : (
            <div className="divide-y divide-border">
              {shown.map(r => (
                <div key={r.dbId || r.id} className="px-4 py-2.5 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-sm text-text-secondary truncate">{r.id}{r.customerName ? ` · ${r.customerName}` : ''}</div>
                    <div className="text-2xs text-text-muted truncate">{formatDate(r.created)}{r.vehicle ? ` · ${r.vehicle}` : ''}{r.unitNumber ? ` · ${r.unitNumber}` : ''}</div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <div className="text-sm text-text-muted line-through tabular-nums">{formatMoney(r.total)}</div>
                    <div className="text-2xs text-text-muted">Voided</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
