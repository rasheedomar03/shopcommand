import { servicesFromItems } from './invoiceLines'

// Invoices made from scratch are saved on the server. These pure helpers turn a
// server row into the shape the screens use, turn the generator's invoice into
// an API body, and plan the one-time move of browser-only invoices.

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const num = v => { const x = Number(v); return Number.isFinite(x) ? x : 0 }
const isUuid = v => typeof v === 'string' && UUID_RE.test(v)

/** True when an invoice belongs to a repair order (those are handled the older way). */
export const isRoInvoice = inv => !!inv?.roId || (typeof inv?.ro_id === 'string' && !!inv.ro_id)

/**
 * A server invoice row with no repair order (from scratch or imported) in the
 * shape the screens use. Returns null for a voided invoice (never shown).
 */
export function invoiceFromServerRow(row, now = Date.now()) {
  if (!row || row.status === 'void') return null
  const lines = (Array.isArray(row.lines) ? row.lines : []).map(l => ({
    desc: String(l?.desc ?? ''),
    type: ['labor', 'part', 'fee'].includes(l?.type) ? l.type : 'labor',
    qty: num(l?.qty ?? 1),
    price: num(l?.price),
  }))
  const total = num(row.amount)
  const amountPaid = num(row.amount_paid)
  // The invoice date is a calendar day: build it at noon so no timezone moves it
  const created = row.invoice_day ? `${row.invoice_day}T12:00:00` : row.created_at
  const ageMs = now - new Date(created).getTime()
  const status = row.status === 'draft' ? 'draft'
    : row.status === 'paid' ? 'paid'
      : amountPaid > 0 ? 'partial'
        : ageMs > 14 * 86400000 ? 'overdue' : 'sent'
  const yearMakeModel = [row.vehicle_year, row.vehicle_make, row.vehicle_model].filter(Boolean).join(' ')
  const hasTaxRate = row.tax_rate !== null && row.tax_rate !== undefined && row.tax_rate !== ''
  // An imported invoice that never stored a rate but was saved with $0 tax had no
  // tax: reopening it must show 0%, not this browser's default, or saving it
  // would quietly add tax to the customer's invoice.
  const knownNoTax = !hasTaxRate && row.tax !== null && row.tax !== undefined && row.tax !== '' && num(row.tax) === 0
  return {
    id: row.number || `INV-${String(row.id).slice(0, 8).toUpperCase()}`,
    dbId: row.id,
    roId: null,
    shopId: row.shop_id ?? null,
    customerId: row.customer_id ?? null,
    customerName: row.customer_name || '',
    customerEmail: row.customer_email || null,
    vehicle: row.vehicle_text || yearMakeModel,
    unitNumber: row.unit_number || '',
    vin: row.vin || '',
    jobTitle: row.job_title || '',
    diagnostics: row.diagnostics || '',
    notes: row.notes || '',
    status,
    created,
    paidAt: row.paid_at || null,
    amountPaid,
    paymentMethod: null,
    lines,
    services: servicesFromItems(lines),
    ...(hasTaxRate ? { taxRate: num(row.tax_rate) } : knownNoTax ? { taxRate: 0 } : {}),
    ...(typeof row.tax_labor === 'boolean' ? { taxLabor: row.tax_labor } : knownNoTax ? { taxLabor: false } : {}),
    ...(typeof row.itemize === 'boolean' ? { itemize: row.itemize } : {}),
    cardFee: row.card_fee_rate !== null && row.card_fee_rate !== undefined,
    ...(row.card_fee_rate !== null && row.card_fee_rate !== undefined ? { cardFeeRate: num(row.card_fee_rate) } : {}),
    cardFeeAmount: num(row.card_fee_amount),
    subtotal: row.subtotal === null || row.subtotal === undefined ? total : num(row.subtotal),
    tax: num(row.tax),
    total,
    internal: !!row.is_internal,
  }
}

/**
 * The API body for saving one of the generator's invoices. Totals are NOT sent:
 * the server works them out from the lines and the tax and fee settings.
 */
export function manualBodyFromInvoice(inv) {
  const email = String(inv?.customerEmail ?? '').trim()
  return {
    manual: true,
    draft: inv?.status === 'draft',
    number: String(inv?.id ?? '').trim() || undefined,
    invoice_date: String(inv?.created ?? '').slice(0, 10) || undefined,
    shop_id: isUuid(inv?.shopId) ? inv.shopId : undefined,
    customer_id: isUuid(inv?.customerId) ? inv.customerId : undefined,
    customer_name: String(inv?.customerName ?? '').trim() || 'Customer',
    customer_email: EMAIL_RE.test(email) ? email : undefined,
    vehicle_text: inv?.vehicle || undefined,
    unit_number: inv?.unitNumber || undefined,
    vin: inv?.vin || undefined,
    job_title: inv?.jobTitle || undefined,
    diagnostics: inv?.diagnostics || undefined,
    notes: inv?.notes || undefined,
    lines: (inv?.lines || []).map(l => ({ desc: l.desc, type: l.type, qty: num(l.qty), price: num(l.price) })),
    itemize: inv?.itemize,
    tax_rate: inv?.taxRate,
    tax_labor: !!inv?.taxLabor,
    card_fee: !!inv?.cardFee,
    card_fee_rate: inv?.cardFeeRate,
    is_internal: !!inv?.internal,
  }
}

/** Browser-only invoices that still need to move: no server copy, not tied to a repair order. */
export const isImportCandidate = inv => !!inv && !inv.dbId && !(typeof inv.roId === 'string' && isUuid(inv.roId))

/**
 * Decide what to do with each browser-only invoice, given the invoices the
 * server already has (rows with `number` and `amount`):
 *  - toSend: no server invoice has this number, so move it
 *  - duplicates: the server has this number with the same amount (already moved)
 *  - conflicts: the server has this number with a DIFFERENT amount, so leave the
 *    local copy alone and tell the owner
 */
export function planImport(local, serverRows) {
  const byNumber = new Map((serverRows || []).map(r => [String(r.number ?? '').trim().toLowerCase(), r]))
  const toSend = [], duplicates = [], conflicts = []
  for (const inv of local || []) {
    if (!isImportCandidate(inv)) continue
    const key = String(inv.id ?? '').trim().toLowerCase()
    if (!key) continue
    const hit = byNumber.get(key)
    if (!hit) toSend.push(inv)
    else if (Math.abs(num(hit.amount) - num(inv.total)) < 0.005) duplicates.push(inv)
    else conflicts.push(inv)
  }
  return { toSend, duplicates, conflicts }
}

/**
 * Save one from-scratch invoice on the server (create, or edit when it already
 * has a dbId) and put it in the right status. `api` is the app's request helper.
 * Returns { entry } on success, { error } when the user has something to fix
 * (number already used, a bad value, trial ended) or an edit could not reach the
 * server, and { offline: true } only for a NEW invoice with no connection (the
 * caller keeps it on this computer so it is never lost).
 */
export async function saveInvoiceToServer({ api, invoice }) {
  const isEdit = !!invoice.dbId
  try {
    const body = manualBodyFromInvoice(invoice)
    let row = isEdit
      ? await api('/api/invoices', { method: 'PUT', params: { id: invoice.dbId }, body })
      : await api('/api/invoices', { method: 'POST', body })
    // Mark sent and back to draft are status moves of their own on the server
    const wantsSent = invoice.status !== 'draft'
    if (wantsSent && row.status === 'draft') {
      row = { ...row, ...(await api('/api/invoices', { method: 'PUT', params: { id: row.id }, body: { status: 'unpaid' } })) }
    } else if (!wantsSent && row.status === 'unpaid') {
      row = { ...row, ...(await api('/api/invoices', { method: 'PUT', params: { id: row.id }, body: { status: 'draft' } })) }
    }
    // The server returns the date as a timestamp; keep the calendar day the user chose
    const entry = invoiceFromServerRow({
      ...row,
      amount_paid: row.amount_paid ?? 0,
      invoice_day: String(invoice.created || '').slice(0, 10) || null,
    })
    return { entry: { ...entry, customerId: invoice.customerId ?? entry.customerId } }
  } catch (err) {
    if (err?.status) return { error: err.message || 'Could not save the invoice' }
    if (isEdit) return { error: 'Could not reach the server. Your changes were not saved. Try again.' }
    return { offline: true }
  }
}

const keyOf = i => String(i?.id ?? '').trim().toLowerCase()

/**
 * Move browser-only invoices to the server. `post(batch)` sends one batch and
 * resolves with the server's answer ({ importedNumbers, importedTotal, failed }).
 * Pure apart from calling `post`, so the safety rules can be tested:
 *  - only invoices the server CONFIRMS (importedNumbers) count as moved
 *  - a failed batch (server error) is reported and not counted as moved
 *  - no connection (error without a status) stops and will be retried later
 *  - `tried` stops the same invoice being posted again on every refresh
 * Returns what to remove from this computer and what to tell the owner.
 */
export async function moveLocalInvoices({ local, serverRows, post, tried = new Set(), batchSize = 100 }) {
  const plan = planImport(local, serverRows)
  const toSend = plan.toSend.filter(i => !tried.has(keyOf(i)))
  // Conflicts are reported once and then set aside by the caller (see remainingLocal),
  // so they never come back on later refreshes.
  const conflicts = plan.conflicts
  const duplicateKeys = new Set(plan.duplicates.map(keyOf))
  const moved = new Set()
  const failed = []
  let movedTotal = 0

  for (const batch of batches(toSend, batchSize)) {
    batch.forEach(i => tried.add(keyOf(i)))
    try {
      const res = await post(batch)
      for (const n of res?.importedNumbers || []) moved.add(String(n).trim().toLowerCase())
      movedTotal += Number(res?.importedTotal) || 0
      for (const f of res?.failed || []) failed.push(String(f?.number || ''))
    } catch (err) {
      if (!err?.status) { // no connection: try these again on the next refresh
        batch.forEach(i => tried.delete(keyOf(i)))
        break
      }
      failed.push(...batch.map(i => String(i.id)))
    }
  }
  return {
    moved,
    movedTotal: Math.round(movedTotal * 100) / 100,
    failed: failed.filter(Boolean),
    conflicts: conflicts.map(i => String(i.id)),
    conflictItems: conflicts, // the full invoices, to be saved aside before they leave the live list
    conflictKeys: new Set(conflicts.map(keyOf)),
    duplicateKeys,
    attempted: toSend.length,
  }
}

/**
 * The invoices to keep in the live list on this computer after a move: everything
 * the server did not take. A conflict (same number as a server invoice, different
 * amount) leaves the live list too, but ONLY when `conflictsSavedAside` is true,
 * meaning its full details were safely written somewhere else first. Otherwise it
 * stays, so nothing can be lost.
 */
export function remainingLocal(current, result, { conflictsSavedAside = false } = {}) {
  return (current || []).filter(i =>
    !result.moved.has(keyOf(i)) &&
    !result.duplicateKeys.has(keyOf(i)) &&
    !(conflictsSavedAside && result.conflictKeys?.has(keyOf(i)))
  )
}

/**
 * Add invoices to the set-aside list without losing earlier ones. An invoice with
 * the same number replaces its earlier set-aside copy.
 */
export function mergeSetAside(existing, items) {
  const byKey = new Map((Array.isArray(existing) ? existing : []).map(i => [keyOf(i), i]))
  for (const i of items || []) byKey.set(keyOf(i), i)
  return [...byKey.values()]
}

/**
 * The message for the owner. A new result is ADDED to an unread one instead of
 * replacing it, so the "N moved" summary is never lost when a later load adds a
 * conflict or a retry.
 */
export function buildImportReport(existing, result, nowIso = new Date().toISOString()) {
  const union = (a, b) => [...new Set([...(a || []), ...(b || [])])]
  return {
    at: nowIso,
    imported: (existing?.imported || 0) + result.moved.size,
    importedTotal: Math.round(((existing?.importedTotal || 0) + result.movedTotal) * 100) / 100,
    conflicts: union(existing?.conflicts, result.conflicts),
    failed: union(existing?.failed, result.failed),
  }
}

/** Split into batches the server accepts (it takes at most 200 per request). */
export function batches(list, size = 100) {
  const out = []
  for (let i = 0; i < list.length; i += size) out.push(list.slice(i, i + size))
  return out
}
