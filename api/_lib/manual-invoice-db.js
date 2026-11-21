import { cleanManualInvoice, generateInvoiceNumber, rowFromLocalInvoice } from './manual-invoice.js'

// Database side of from-scratch invoices. Every query is scoped with
// org_id = user.orgId: tenant isolation depends on it (there is no RLS safety net).

const UNIQUE_VIOLATION = '23505'
const MAX_IMPORT = 200

// A shop, customer or truck sent by the browser must belong to this organization
async function checkOwnership(sql, orgId, v) {
  if (v.shop_id) {
    const [r] = await sql`SELECT id FROM shops WHERE id = ${v.shop_id} AND org_id = ${orgId}`
    if (!r) return 'Shop not found'
  }
  if (v.customer_id) {
    const [r] = await sql`SELECT id FROM customers WHERE id = ${v.customer_id} AND org_id = ${orgId}`
    if (!r) return 'Customer not found'
  }
  if (v.vehicle_id) {
    const [r] = await sql`SELECT id FROM vehicles WHERE id = ${v.vehicle_id} AND org_id = ${orgId}`
    if (!r) return 'Vehicle not found'
  }
  return null
}

/** POST /api/invoices with { manual: true, ... }. Returns { status, body }. */
export async function createManualInvoice({ sql, user, body }) {
  const { error, value: v } = cleanManualInvoice(body)
  if (error) return { status: 400, body: { error } }
  const bad = await checkOwnership(sql, user.orgId, v)
  if (bad) return { status: 404, body: { error: bad } }

  const status = body?.draft ? 'draft' : 'unpaid'
  const supplied = v.number
  for (let attempt = 0; attempt < 6; attempt++) {
    const number = supplied || generateInvoiceNumber()
    try {
      const [row] = await sql`
        INSERT INTO invoices (
          org_id, ro_id, amount, status, source, number, invoice_date, shop_id, customer_id, vehicle_id,
          customer_name, customer_email, customer_phone, company_name,
          vehicle_text, vehicle_year, vehicle_make, vehicle_model, unit_number, vin, mileage,
          job_title, diagnostics, notes, lines, itemize, subtotal, tax, tax_rate, tax_labor,
          card_fee_rate, card_fee_amount, is_internal
        ) VALUES (
          ${user.orgId}, NULL, ${v.amount}, ${status}, 'manual', ${number},
          ${v.invoice_date || new Date().toISOString().slice(0, 10)}, ${v.shop_id}, ${v.customer_id}, ${v.vehicle_id},
          ${v.customer_name}, ${v.customer_email}, ${v.customer_phone}, ${v.company_name},
          ${v.vehicle_text}, ${v.vehicle_year}, ${v.vehicle_make}, ${v.vehicle_model}, ${v.unit_number}, ${v.vin}, ${v.mileage},
          ${v.job_title}, ${v.diagnostics}, ${v.notes}, ${JSON.stringify(v.lines)}::jsonb, ${v.itemize}, ${v.subtotal}, ${v.tax}, ${v.tax_rate}, ${v.tax_labor},
          ${v.card_fee_rate}, ${v.card_fee_amount}, ${v.is_internal}
        )
        RETURNING *
      `
      return { status: 201, body: { ...row, amount_paid: 0 } }
    } catch (err) {
      if (err?.code !== UNIQUE_VIOLATION) throw err
      if (supplied) return { status: 409, body: { error: `Invoice number ${supplied} is already used`, code: 'number_taken' } }
      // generated number collided: try another
    }
  }
  return { status: 503, body: { error: 'Could not allocate an invoice number. Try again.' } }
}

/**
 * PUT /api/invoices?id= with the full from-scratch form. Only a draft or unpaid
 * invoice with no recorded payments can be edited (undo the payments first).
 */
export async function updateManualInvoice({ sql, user, id, body, invoice }) {
  if (invoice.ro_id) return { status: 409, body: { error: 'This invoice comes from a repair order' } }
  if (invoice.status !== 'draft' && invoice.status !== 'unpaid') {
    return { status: 409, body: { error: 'Only draft or unpaid invoices can be edited' } }
  }
  const [{ n: recorded }] = await sql`
    SELECT COUNT(*)::int AS n FROM payments WHERE invoice_id = ${id} AND org_id = ${user.orgId} AND status = 'completed'
  `
  if (recorded > 0) return { status: 409, body: { error: 'Undo the payments before editing this invoice' } }

  const { error, value: v } = cleanManualInvoice(body)
  if (error) return { status: 400, body: { error } }
  const bad = await checkOwnership(sql, user.orgId, v)
  if (bad) return { status: 404, body: { error: bad } }

  const number = v.number || invoice.number
  try {
    const [row] = await sql`
      UPDATE invoices SET
        amount = ${v.amount}, number = ${number},
        invoice_date = COALESCE(${v.invoice_date}::date, invoice_date),
        shop_id = ${v.shop_id}, customer_id = ${v.customer_id}, vehicle_id = ${v.vehicle_id},
        customer_name = ${v.customer_name}, customer_email = ${v.customer_email}, customer_phone = ${v.customer_phone},
        company_name = ${v.company_name}, vehicle_text = ${v.vehicle_text}, vehicle_year = ${v.vehicle_year},
        vehicle_make = ${v.vehicle_make}, vehicle_model = ${v.vehicle_model}, unit_number = ${v.unit_number},
        vin = ${v.vin}, mileage = ${v.mileage}, job_title = ${v.job_title}, diagnostics = ${v.diagnostics}, notes = ${v.notes},
        lines = ${JSON.stringify(v.lines)}::jsonb, itemize = ${v.itemize}, subtotal = ${v.subtotal}, tax = ${v.tax},
        tax_rate = ${v.tax_rate}, tax_labor = ${v.tax_labor}, card_fee_rate = ${v.card_fee_rate},
        card_fee_amount = ${v.card_fee_amount}, is_internal = ${v.is_internal}
      WHERE id = ${id} AND org_id = ${user.orgId}
      RETURNING *
    `
    return { status: 200, body: { ...row, amount_paid: 0 } }
  } catch (err) {
    if (err?.code === UNIQUE_VIOLATION) {
      return { status: 409, body: { error: `Invoice number ${number} is already used`, code: 'number_taken' } }
    }
    throw err
  }
}

/**
 * POST /api/invoices?action=import with { invoices: [...] }: the one-time move of
 * browser-only invoices. Stored amounts are kept exactly. Safe to repeat: an
 * invoice whose number already exists in the organization is skipped.
 */
export async function importLocalInvoices({ sql, user, list }) {
  if (!Array.isArray(list) || list.length === 0) return { status: 400, body: { error: 'invoices must be a non-empty list' } }
  if (list.length > MAX_IMPORT) return { status: 400, body: { error: `Send at most ${MAX_IMPORT} invoices per request` } }

  const shops = await sql`SELECT id FROM shops WHERE org_id = ${user.orgId}`
  const shopIds = new Set(shops.map(s => String(s.id)))
  const customers = await sql`SELECT id, lower(name) AS name FROM customers WHERE org_id = ${user.orgId}`
  const byName = new Map()
  for (const c of customers) byName.set(c.name, byName.has(c.name) ? null : c.id) // ambiguous names stay unlinked

  const imported = []
  const skipped = []
  const failed = []
  let importedTotal = 0

  for (const local of list) {
    const { row, payment, error } = rowFromLocalInvoice(local)
    if (error) { failed.push({ number: String(local?.id ?? ''), error }); continue }
    try {
      const shopId = local?.shopId && shopIds.has(String(local.shopId)) ? local.shopId : null
      const customerId = byName.get(String(row.customer_name).toLowerCase()) || null
      const [inserted] = await sql`
        INSERT INTO invoices (
          org_id, ro_id, amount, status, source, number, invoice_date, created_at, paid_at, shop_id, customer_id,
          customer_name, customer_email, vehicle_text, unit_number, vin, job_title, diagnostics, notes,
          lines, itemize, subtotal, tax, tax_rate, tax_labor, card_fee_rate, card_fee_amount
        ) VALUES (
          ${user.orgId}, NULL, ${row.amount}, ${row.status}, 'import', ${row.number}, ${row.invoice_date},
          COALESCE(${row.created_at}::timestamptz, now()), ${row.paid_at}, ${shopId}, ${customerId},
          ${row.customer_name}, ${row.customer_email}, ${row.vehicle_text}, ${row.unit_number}, ${row.vin},
          ${row.job_title}, ${row.diagnostics}, ${row.notes},
          ${JSON.stringify(row.lines)}::jsonb, ${row.itemize}, ${row.subtotal}, ${row.tax}, ${row.tax_rate}, ${row.tax_labor},
          ${row.card_fee_rate}, ${row.card_fee_amount}
        )
        ON CONFLICT (org_id, lower(number)) WHERE number IS NOT NULL DO NOTHING
        RETURNING id
      `
      if (!inserted) { skipped.push(row.number); continue }
      if (payment) {
        await sql`
          INSERT INTO payments (org_id, invoice_id, shop_id, amount, method, customer_name, status, created_at)
          VALUES (${user.orgId}, ${inserted.id}, ${shopId}, ${payment.amount}, ${payment.method}, ${row.customer_name}, 'completed',
                  COALESCE(${payment.paid_at}::timestamptz, now()))
        `
      }
      imported.push(row.number)
      importedTotal += row.amount
    } catch (err) {
      failed.push({ number: row.number, error: 'could not be saved' })
    }
  }

  return {
    status: 200,
    body: {
      imported: imported.length,
      importedNumbers: imported,
      importedTotal: Math.round(importedTotal * 100) / 100,
      skipped,
      failed,
    },
  }
}
