import { describe, it, expect } from 'vitest'
import { invoiceBreakdown } from '../src/lib/invoiceEdit.js'
import { invoiceFromServerRow, manualBodyFromInvoice, planImport, isImportCandidate, batches, moveLocalInvoices, remainingLocal, saveInvoiceToServer, mergeSetAside, buildImportReport } from '../src/lib/serverInvoices.js'

const NOW = new Date('2026-11-21T12:00:00').getTime()
const UUID = '00000000-0000-0000-0000-0000000000a1'

const row = (o = {}) => ({
  id: UUID, number: '032', status: 'unpaid', amount: '221.40', amount_paid: '0', ro_id: null,
  invoice_day: '2026-11-18', created_at: '2026-11-18T03:00:00Z', customer_name: 'Zain Trucking', customer_email: 'z@x.com',
  unit_number: '236', vin: '1FUJGLDR5CLBP8834', vehicle_text: '2019 Freightliner', job_title: 'Brakes',
  lines: [{ desc: 'Air line', type: 'part', qty: '3', price: '20' }, { desc: 'Diagnostics', type: 'labor', qty: 1.5, price: 100 }],
  itemize: true, tax_rate: '8.25', tax_labor: false, card_fee_rate: '3', card_fee_amount: '6.45', subtotal: '210', tax: '4.95',
  ...o,
})

describe('invoiceFromServerRow', () => {
  it('maps a from-scratch row to the shape the screens use', () => {
    const inv = invoiceFromServerRow(row(), NOW)
    expect(inv).toMatchObject({
      id: '032', dbId: UUID, roId: null, customerName: 'Zain Trucking', unitNumber: '236', vin: '1FUJGLDR5CLBP8834',
      vehicle: '2019 Freightliner', jobTitle: 'Brakes', total: 221.4, subtotal: 210, tax: 4.95,
      taxRate: 8.25, taxLabor: false, itemize: true, cardFee: true, cardFeeRate: 3, cardFeeAmount: 6.45, internal: false,
    })
    expect(inv.lines[0]).toEqual({ desc: 'Air line', type: 'part', qty: 3, price: 20 })
    expect(inv.services).toHaveLength(2) // older screens still get one amount per line
  })

  it('uses the invoice date as a calendar day, so no timezone can move it', () => {
    expect(invoiceFromServerRow(row({ invoice_day: '2026-10-02', created_at: '2026-10-02T02:00:00Z' }), NOW).created).toBe('2026-10-02T12:00:00')
    expect(invoiceFromServerRow(row({ invoice_day: null, created_at: '2026-10-02T02:00:00Z' }), NOW).created).toBe('2026-10-02T02:00:00Z')
  })

  it('derives the status: draft, paid, partial, overdue after 14 days, else sent', () => {
    expect(invoiceFromServerRow(row({ status: 'draft' }), NOW).status).toBe('draft')
    expect(invoiceFromServerRow(row({ status: 'paid', amount_paid: '221.40' }), NOW).status).toBe('paid')
    expect(invoiceFromServerRow(row({ amount_paid: '50' }), NOW).status).toBe('partial')
    expect(invoiceFromServerRow(row({ invoice_day: '2026-11-01' }), NOW).status).toBe('overdue')
    expect(invoiceFromServerRow(row({ invoice_day: '2026-11-18' }), NOW).status).toBe('sent')
  })

  it('hides voided invoices', () => {
    expect(invoiceFromServerRow(row({ status: 'void' }), NOW)).toBeNull()
    expect(invoiceFromServerRow(null, NOW)).toBeNull()
  })

  it('leaves tax settings unset for imported rows that never stored them, so they are worked out later', () => {
    const inv = invoiceFromServerRow(row({ tax_rate: null, tax_labor: null, itemize: null, card_fee_rate: null }), NOW)
    expect('taxRate' in inv).toBe(false)
    expect('taxLabor' in inv).toBe(false)
    expect(inv.cardFee).toBe(false)
  })

  it('an imported invoice with $0 tax and no stored rate loads as 0%, so editing it never adds tax', () => {
    const inv = invoiceFromServerRow(row({ tax_rate: null, tax_labor: null, tax: '0' }), NOW)
    expect(inv.taxRate).toBe(0)
    expect(inv.taxLabor).toBe(false)
    // an unknown tax (never stored) stays unset
    expect('taxRate' in invoiceFromServerRow(row({ tax_rate: null, tax_labor: null, tax: null }), NOW)).toBe(false)
  })

  it('falls back to year make model and never crashes on missing fields', () => {
    const inv = invoiceFromServerRow({ id: UUID, number: null, status: 'unpaid', amount: 5, vehicle_year: 2019, vehicle_make: 'Kenworth', vehicle_model: 'T680', created_at: '2026-11-18T10:00:00Z' }, NOW)
    expect(inv.vehicle).toBe('2019 Kenworth T680')
    expect(inv.id).toMatch(/^INV-/)
    expect(inv.lines).toEqual([])
  })

  it('keeps a negative total', () => {
    expect(invoiceFromServerRow(row({ amount: '-250', subtotal: null, tax: null }), NOW).total).toBe(-250)
  })
})

describe('manualBodyFromInvoice', () => {
  const inv = {
    id: ' 032 ', status: 'draft', created: '2026-11-18T12:00:00', shopId: UUID, customerId: 'local-1', customerName: 'Zain',
    customerEmail: 'bad', vehicle: '2019 Freightliner', unitNumber: '236', vin: 'V', lines: [{ desc: 'x', type: 'part', qty: '3', price: '20' }],
    itemize: true, taxRate: 8.25, taxLabor: false, cardFee: true, cardFeeRate: 3, total: 999, subtotal: 999, tax: 999,
  }

  it('sends lines and settings, never the browser totals', () => {
    const b = manualBodyFromInvoice(inv)
    expect(b.manual).toBe(true)
    expect(b.draft).toBe(true)
    expect(b.number).toBe('032')
    expect(b.invoice_date).toBe('2026-11-18')
    expect(b.lines).toEqual([{ desc: 'x', type: 'part', qty: 3, price: 20 }])
    for (const k of ['total', 'subtotal', 'tax', 'amount']) expect(k in b).toBe(false)
    expect(b.tax_rate).toBe(8.25)
    expect(b.card_fee).toBe(true)
  })

  it('only sends ids that are real server ids and emails that look valid', () => {
    const b = manualBodyFromInvoice(inv)
    expect(b.shop_id).toBe(UUID)
    expect(b.customer_id).toBeUndefined() // a local-only id
    expect(b.customer_email).toBeUndefined()
    expect(manualBodyFromInvoice({ ...inv, customerEmail: 'a@b.co' }).customer_email).toBe('a@b.co')
  })

  it('never sends a blank customer name', () => {
    expect(manualBodyFromInvoice({ ...inv, customerName: '  ' }).customer_name).toBe('Customer')
  })

  it('a sent invoice is not a draft', () => {
    expect(manualBodyFromInvoice({ ...inv, status: 'sent' }).draft).toBe(false)
  })
})

describe('planImport', () => {
  const local = (id, total, extra = {}) => ({ id, total, status: 'sent', ...extra })

  it('sends what the server does not have', () => {
    const p = planImport([local('020', 100), local('021', 50)], [])
    expect(p.toSend.map(i => i.id)).toEqual(['020', '021'])
  })

  it('treats the same number and amount as already moved, ignoring case and spaces', () => {
    const p = planImport([local(' ab-1 ', 100)], [{ number: 'AB-1', amount: '100.00' }])
    expect(p.duplicates).toHaveLength(1)
    expect(p.toSend).toHaveLength(0)
  })

  it('flags the same number with a different amount instead of overwriting or deleting', () => {
    const p = planImport([local('032', 100)], [{ number: '032', amount: '250' }])
    expect(p.conflicts).toHaveLength(1)
    expect(p.toSend).toHaveLength(0)
    expect(p.duplicates).toHaveLength(0)
  })

  it('skips invoices already on the server and those tied to a repair order', () => {
    expect(isImportCandidate({ id: '1', dbId: UUID })).toBe(false)
    expect(isImportCandidate({ id: '1', roId: UUID })).toBe(false)
    expect(isImportCandidate({ id: '1', roId: 'RO-1042' })).toBe(true) // a repair order number, not a server id
    expect(isImportCandidate({ id: '1' })).toBe(true)
    expect(isImportCandidate(null)).toBe(false)
    expect(planImport([{ id: '1', total: 5, dbId: UUID }], []).toSend).toHaveLength(0)
  })

  it('ignores invoices with no number and tolerates missing lists', () => {
    expect(planImport([{ total: 5 }], []).toSend).toHaveLength(0)
    expect(planImport(null, null)).toEqual({ toSend: [], duplicates: [], conflicts: [] })
  })
})

describe('moveLocalInvoices (the move of browser invoices)', () => {
  const L = (id, total = 100, extra = {}) => ({ id, total, status: 'sent', customerName: 'A', ...extra })
  const okPost = (calls = []) => async (batch) => {
    calls.push(batch.map(i => i.id))
    return { importedNumbers: batch.map(i => String(i.id).trim()), importedTotal: batch.reduce((s, i) => s + i.total, 0), failed: [] }
  }

  it('moves what the server confirms and nothing else, and tells you the total', async () => {
    const calls = []
    const local = [L('020', 100), L('021', 50.5)]
    const r = await moveLocalInvoices({ local, serverRows: [], post: okPost(calls) })
    expect([...r.moved].sort()).toEqual(['020', '021'])
    expect(r.movedTotal).toBe(150.5)
    expect(remainingLocal(local, r)).toEqual([])
    expect(calls).toEqual([['020', '021']])
  })

  it('keeps an invoice the server did not confirm (it reports it as failed)', async () => {
    const local = [L('020'), L('021')]
    const post = async () => ({ importedNumbers: ['020'], importedTotal: 100, failed: [{ number: '021', error: 'could not be saved' }] })
    const r = await moveLocalInvoices({ local, serverRows: [], post })
    expect(remainingLocal(local, r).map(i => i.id)).toEqual(['021'])
    expect(r.failed).toEqual(['021'])
  })

  it('keeps everything when the server rejects a whole batch', async () => {
    const local = [L('020'), L('021')]
    const post = async () => { throw Object.assign(new Error('bad'), { status: 400 }) }
    const r = await moveLocalInvoices({ local, serverRows: [], post })
    expect(r.moved.size).toBe(0)
    expect(remainingLocal(local, r)).toHaveLength(2)
    expect(r.failed).toEqual(['020', '021'])
  })

  it('stops quietly with nothing removed when there is no connection, and retries later', async () => {
    const local = [L('020')]
    const tried = new Set()
    const offline = async () => { throw new Error('Failed to fetch') }
    const r1 = await moveLocalInvoices({ local, serverRows: [], post: offline, tried })
    expect(r1.moved.size).toBe(0)
    expect(r1.failed).toEqual([])
    expect(remainingLocal(local, r1)).toHaveLength(1)
    // back online: it is tried again
    const r2 = await moveLocalInvoices({ local, serverRows: [], post: okPost(), tried })
    expect(r2.moved.has('020')).toBe(true)
  })

  it('does not post the same failed invoice again on every refresh', async () => {
    const tried = new Set()
    const calls = []
    const reject = async (b) => { calls.push(b.length); throw Object.assign(new Error('x'), { status: 400 }) }
    const local = [L('020')]
    await moveLocalInvoices({ local, serverRows: [], post: reject, tried })
    await moveLocalInvoices({ local, serverRows: [], post: reject, tried })
    expect(calls).toEqual([1])
  })

  it('removes a local copy the server already has with the same amount, and never posts it', async () => {
    const calls = []
    const local = [L('032', 100)]
    const r = await moveLocalInvoices({ local, serverRows: [{ number: '032', amount: '100' }], post: okPost(calls) })
    expect(calls).toEqual([])
    expect(remainingLocal(local, r)).toEqual([])
  })

  it('leaves a local copy alone when the server has that number with a different amount', async () => {
    const calls = []
    const local = [L('032', 100)]
    const r = await moveLocalInvoices({ local, serverRows: [{ number: '032', amount: '999' }], post: okPost(calls) })
    expect(calls).toEqual([])
    expect(r.conflicts).toEqual(['032'])
    expect(remainingLocal(local, r)).toHaveLength(1)
  })

  it('sends large sets in batches and one failing batch does not lose the others', async () => {
    const local = Array.from({ length: 5 }, (_, i) => L(String(100 + i)))
    let n = 0
    const post = async (batch) => {
      n++
      if (n === 2) throw Object.assign(new Error('x'), { status: 500 })
      return { importedNumbers: batch.map(i => String(i.id)), importedTotal: batch.length * 100, failed: [] }
    }
    const r = await moveLocalInvoices({ local, serverRows: [], post, batchSize: 2 })
    expect([...r.moved].sort()).toEqual(['100', '101', '104'])
    expect(r.failed.sort()).toEqual(['102', '103'])
    expect(remainingLocal(local, r).map(i => i.id).sort()).toEqual(['102', '103'])
  })

  it('compares numbers ignoring case and spaces when matching what the server confirmed', async () => {
    const local = [L(' ab-7 ')]
    const post = async () => ({ importedNumbers: ['ab-7'], importedTotal: 100, failed: [] })
    const r = await moveLocalInvoices({ local, serverRows: [], post })
    expect(remainingLocal(local, r)).toEqual([])
  })

  it('does nothing for invoices already on the server or tied to a repair order', async () => {
    const calls = []
    const local = [L('1', 5, { dbId: UUID }), L('2', 5, { roId: UUID })]
    const r = await moveLocalInvoices({ local, serverRows: [], post: okPost(calls) })
    expect(calls).toEqual([])
    expect(remainingLocal(local, r)).toHaveLength(2)
  })
})

describe('saveInvoiceToServer', () => {
  const inv = (o = {}) => ({
    id: '040', status: 'sent', created: '2026-11-18T12:00:00', shopId: UUID, customerName: 'Zain', unitNumber: '236',
    lines: [{ desc: 'Air line', type: 'part', qty: 3, price: 20 }], itemize: true, taxRate: 8.25, taxLabor: false, cardFee: false, ...o,
  })
  const serverRow = (o = {}) => ({ id: UUID, number: '040', status: 'unpaid', amount: '64.95', subtotal: '60', tax: '4.95', ...o })
  const fakeApi = (handlers) => {
    const calls = []
    const api = async (path, opts = {}) => {
      calls.push({ path, method: opts.method, params: opts.params, body: opts.body })
      const h = handlers[calls.length - 1] ?? handlers.default
      if (h instanceof Error) throw h
      return typeof h === 'function' ? h(opts) : h
    }
    return { api, calls }
  }
  const httpErr = (status, message) => Object.assign(new Error(message), { status })

  it('creates a sent invoice in one request and shows the day the user chose', async () => {
    const { api, calls } = fakeApi({ default: serverRow() })
    const out = await saveInvoiceToServer({ api, invoice: inv() })
    expect(calls).toHaveLength(1)
    expect(calls[0]).toMatchObject({ path: '/api/invoices', method: 'POST' })
    expect(calls[0].body.manual).toBe(true)
    expect('total' in calls[0].body).toBe(false)
    expect(out.entry).toMatchObject({ id: '040', dbId: UUID, status: 'sent', created: '2026-11-18T12:00:00', total: 64.95 })
  })

  it('creates a draft in one request', async () => {
    const { api, calls } = fakeApi({ default: serverRow({ status: 'draft' }) })
    const out = await saveInvoiceToServer({ api, invoice: inv({ status: 'draft' }) })
    expect(calls).toHaveLength(1)
    expect(calls[0].body.draft).toBe(true)
    expect(out.entry.status).toBe('draft')
  })

  it('editing a draft and marking it sent is an edit then a status move', async () => {
    const { api, calls } = fakeApi({ 0: serverRow({ status: 'draft' }), 1: { id: UUID, status: 'unpaid' } })
    const out = await saveInvoiceToServer({ api, invoice: inv({ dbId: UUID, status: 'sent' }) })
    expect(calls.map(c => [c.method, c.params?.id, c.body.status])).toEqual([['PUT', UUID, undefined], ['PUT', UUID, 'unpaid']])
    expect(out.entry.status).toBe('sent')
    expect(out.entry.total).toBe(64.95) // the status reply has no amount; the edit's is kept
  })

  it('moving a sent invoice back to draft is an edit then a status move', async () => {
    const { api, calls } = fakeApi({ 0: serverRow({ status: 'unpaid' }), 1: { id: UUID, status: 'draft' } })
    const out = await saveInvoiceToServer({ api, invoice: inv({ dbId: UUID, status: 'draft' }) })
    expect(calls[1].body).toEqual({ status: 'draft' })
    expect(out.entry.status).toBe('draft')
  })

  it('saving an already-sent invoice again makes no extra status move', async () => {
    const { api, calls } = fakeApi({ default: serverRow({ status: 'unpaid' }) })
    await saveInvoiceToServer({ api, invoice: inv({ dbId: UUID, status: 'sent' }) })
    expect(calls).toHaveLength(1)
  })

  it('returns the server message when the user has something to fix (number already used)', async () => {
    const { api } = fakeApi({ default: httpErr(409, 'Invoice number 040 is already used') })
    expect(await saveInvoiceToServer({ api, invoice: inv() })).toEqual({ error: 'Invoice number 040 is already used' })
  })

  it('returns an error for a trial that has ended, never falls back to this computer', async () => {
    const { api } = fakeApi({ default: httpErr(402, 'Your free trial has ended.') })
    const out = await saveInvoiceToServer({ api, invoice: inv() })
    expect(out.error).toMatch(/trial/)
    expect(out.offline).toBeUndefined()
  })

  it('a NEW invoice with no connection is reported offline so the caller keeps it', async () => {
    const { api } = fakeApi({ default: new TypeError('Failed to fetch') })
    expect(await saveInvoiceToServer({ api, invoice: inv() })).toEqual({ offline: true })
  })

  it('an EDIT with no connection is an error, not a silent local copy', async () => {
    const { api } = fakeApi({ default: new TypeError('Failed to fetch') })
    const out = await saveInvoiceToServer({ api, invoice: inv({ dbId: UUID }) })
    expect(out.error).toMatch(/Could not reach the server/)
    expect(out.offline).toBeUndefined()
  })

  it('keeps the local customer id when the server row has none', async () => {
    const { api } = fakeApi({ default: serverRow({ customer_id: null }) })
    const out = await saveInvoiceToServer({ api, invoice: inv({ customerId: 'c-1' }) })
    expect(out.entry.customerId).toBe('c-1')
  })
})

describe('invoiceBreakdown for server-saved invoices', () => {
  it('uses the stored tax for a from-scratch invoice, so a card fee is not shown as tax', () => {
    const inv = invoiceFromServerRow({
      id: UUID, number: '1', status: 'unpaid', amount: '206', subtotal: '200', tax: '0', card_fee_rate: '3', card_fee_amount: '6',
      lines: [{ desc: 'Brake job', type: 'labor', qty: 2, price: 100 }], created_at: '2026-11-21T12:00:00Z',
    })
    expect(invoiceBreakdown(inv)).toEqual({ subtotal: 200, tax: 0, total: 206 })
  })

  it('still works tax out as total minus lines for a repair-order invoice', () => {
    const inv = { dbId: UUID, roId: 'RO-1', total: 108.25, services: [{ name: 'x', parts: 0, labor: 100 }] }
    expect(invoiceBreakdown(inv)).toEqual({ subtotal: 100, tax: 8.25, total: 108.25 })
  })
})

describe('conflicts are set aside, never lost', () => {
  const L = (id, total = 100) => ({ id, total, status: 'sent', customerName: 'A' })
  const okPost = async (batch) => ({ importedNumbers: batch.map(i => String(i.id)), importedTotal: 0, failed: [] })

  it('a conflict stays in the live list unless its details were saved aside first', async () => {
    const local = [L('032', 100)]
    const r = await moveLocalInvoices({ local, serverRows: [{ number: '032', amount: '999' }], post: okPost })
    expect(r.conflictItems).toEqual([local[0]]) // the full invoice, ready to be saved aside
    expect(remainingLocal(local, r)).toHaveLength(1) // not saved aside: it stays
    expect(remainingLocal(local, r, { conflictsSavedAside: false })).toHaveLength(1)
    expect(remainingLocal(local, r, { conflictsSavedAside: true })).toHaveLength(0) // saved aside: it can leave
  })

  it('does not post a conflict, and reports it again only if it is still in the live list', async () => {
    const local = [L('032', 100)]
    let posted = 0
    const post = async (b) => { posted++; return okPost(b) }
    const r1 = await moveLocalInvoices({ local, serverRows: [{ number: '032', amount: '999' }], post })
    expect(posted).toBe(0)
    expect(r1.conflicts).toEqual(['032'])
    // once it has left the live list there is nothing left to report
    const left = remainingLocal(local, r1, { conflictsSavedAside: true })
    const r2 = await moveLocalInvoices({ local: left, serverRows: [{ number: '032', amount: '999' }], post })
    expect(r2.conflicts).toEqual([])
  })

  it('mergeSetAside keeps earlier invoices and replaces one with the same number', () => {
    const a = { id: '032', total: 1 }, b = { id: '040', total: 2 }, a2 = { id: ' 032 ', total: 3 }
    expect(mergeSetAside([a], [b]).map(i => i.id)).toEqual(['032', '040'])
    const merged = mergeSetAside([a, b], [a2])
    expect(merged).toHaveLength(2)
    expect(merged.find(i => i.id.trim() === '032').total).toBe(3)
    expect(mergeSetAside(null, [a])).toEqual([a])
    expect(mergeSetAside([a], null)).toEqual([a])
  })

  it('buildImportReport adds to an unread summary instead of replacing it', () => {
    const existing = { at: 'x', imported: 4, importedTotal: -9.5, conflicts: ['A-1'], failed: [] }
    const result = { moved: new Set(['b-1', 'b-2']), movedTotal: 30.25, conflicts: ['A-1', 'C-3'], failed: ['D-4'] }
    expect(buildImportReport(existing, result, 'now')).toEqual({
      at: 'now', imported: 6, importedTotal: 20.75, conflicts: ['A-1', 'C-3'], failed: ['D-4'],
    })
  })

  it('buildImportReport starts a fresh summary when there is none', () => {
    const r = buildImportReport(null, { moved: new Set(['x']), movedTotal: 100, conflicts: [], failed: [] }, 'now')
    expect(r).toEqual({ at: 'now', imported: 1, importedTotal: 100, conflicts: [], failed: [] })
  })
})

describe('batches', () => {
  it('splits into groups the server accepts', () => {
    expect(batches(Array.from({ length: 250 }, (_, i) => i)).map(b => b.length)).toEqual([100, 100, 50])
    expect(batches([])).toEqual([])
  })
})
