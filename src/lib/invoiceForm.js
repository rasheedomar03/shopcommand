// Defaults, saved preferences and small helpers for the invoice generator.
import { localYmd } from '@/lib/utils'

export const emptyItem = { desc: '', type: 'labor', qty: '1', price: '' }

// Device-local autosave of an unsaved from-scratch invoice
export const DRAFT_KEY = 'sc_invoice_draft_v1'
// The last tax settings used, so they are not retyped on every invoice
const TAX_PREF_KEY = 'sc_inv_tax_v1'

export function readTaxPref() {
  try {
    const p = JSON.parse(localStorage.getItem(TAX_PREF_KEY) || 'null')
    if (p && p.rate !== undefined) return { rate: String(p.rate), labor: !!p.labor, fee: String(p.fee ?? '3') }
  } catch { /* use defaults */ }
  return { rate: '8.25', labor: false, fee: '3' }
}
export function writeTaxPref(rate, labor, fee) {
  try { localStorage.setItem(TAX_PREF_KEY, JSON.stringify({ rate, labor, fee })) } catch { /* per-viewer convenience */ }
}

export function nextInvoiceNumber() {
  return `INV-${localYmd().slice(2).replace(/-/g, '')}-${Math.floor(100 + Math.random() * 900)}`
}

// Map an RO's services into invoice line items
export function itemsFromRO(ro) {
  const items = (ro.services || []).map(s => ({
    desc: s.name, type: 'labor', qty: '1', price: String(s.price ?? ''),
  }))
  return items.length ? items : [{ ...emptyItem }]
}

export const fmt = v => `$${(Number(v) || 0).toFixed(2)}`
export const n = v => Number(v) || 0

// Shared classes for the generator's inputs and their labels
export const field = 'w-full h-8 px-2.5 rounded-md bg-background border border-border text-xs text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-1 focus:ring-orange/40'
export const label = 'text-2xs font-semibold text-text-muted uppercase tracking-wider'
