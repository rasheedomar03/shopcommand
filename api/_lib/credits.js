// Customer credit: money a customer has paid ahead (a deposit, a prepayment, an
// overpayment) that is used up as their invoices come due. It is a LEDGER: every
// change is a row, nothing is edited, and the balance is the sum. A deposit is not
// revenue until it is applied to an invoice, where it counts as a payment.
//
// Every query is scoped with org_id (there is no RLS safety net).

const MAX_AMOUNT = 1_000_000
const round2 = v => Math.round((Number(v) + Number.EPSILON) * 100) / 100

/** A positive money amount with at most 2 decimals, or an error message. */
export function cleanAmount(value) {
  if (value === undefined || value === null || value === '') return { error: 'Enter an amount' }
  const n = Number(value)
  if (!Number.isFinite(n) || n <= 0) return { error: 'The amount must be more than zero' }
  if (n > MAX_AMOUNT) return { error: 'That amount is too large' }
  if (Math.abs(n * 100 - Math.round(n * 100)) > 1e-6) return { error: 'Use at most two decimal places' }
  return { amount: round2(n) }
}

const note = v => (typeof v === 'string' && v.trim() ? v.trim().slice(0, 200) : null)

/** Validate the body of "add or refund credit". Returns { error } or { value }. */
export function cleanCreditBody(body) {
  const b = body || {}
  if (!['deposit', 'refund'].includes(b.kind)) return { error: 'kind must be deposit or refund' }
  const a = cleanAmount(b.amount)
  if (a.error) return { error: a.error }
  return { value: { kind: b.kind, amount: a.amount, note: note(b.note) } }
}

/** Current credit balance of a customer (the sum of the ledger). */
export async function creditBalance(sql, orgId, customerId) {
  const [row] = await sql`
    SELECT COALESCE(SUM(amount), 0)::float8 AS balance
    FROM customer_credits WHERE org_id = ${orgId} AND customer_id = ${customerId}
  `
  return round2(row?.balance || 0)
}

/** The ledger for one customer, newest first, with the invoice number it was applied to. */
export async function creditHistory(sql, orgId, customerId) {
  return sql`
    SELECT cc.id, cc.kind, cc.amount::float8 AS amount, cc.note, cc.created_at, cc.invoice_id, i.number AS invoice_number
    FROM customer_credits cc
    LEFT JOIN invoices i ON i.id = cc.invoice_id AND i.org_id = cc.org_id
    WHERE cc.org_id = ${orgId} AND cc.customer_id = ${customerId}
    ORDER BY cc.created_at DESC, cc.id
    LIMIT 500
  `
}

/**
 * Add a deposit, or refund some credit back to the customer. A refund can never be
 * more than the balance: the check and the insert are ONE statement, so two refunds
 * at once cannot both pass. Returns the new row, or null when a refund is too big.
 */
export async function addCredit(sql, { orgId, userId, customerId, kind, amount, noteText }) {
  const signed = kind === 'refund' ? -amount : amount
  const [row] = await sql`
    INSERT INTO customer_credits (org_id, customer_id, kind, amount, note, created_by)
    SELECT ${orgId}, ${customerId}, ${kind}, ${signed}::numeric, ${noteText}, ${userId ?? null}::uuid
    WHERE ${kind} = 'deposit'
       OR (SELECT COALESCE(SUM(amount), 0) FROM customer_credits WHERE org_id = ${orgId} AND customer_id = ${customerId}) >= ${amount}::numeric
    RETURNING id, kind, amount::float8 AS amount, note, created_at
  `
  return row || null
}

/**
 * Take `amount` of the customer's credit off an unpaid invoice. ONE statement does
 * all of it, so it is saved together or not at all: the ledger row (applied, a
 * negative amount), the payment (method credit) and the invoice (credit applied,
 * and paid when nothing is left to pay). Nothing is applied unless the invoice is
 * unpaid, has a customer, and the amount is within BOTH what the invoice still
 * owes and the customer's credit.
 *
 * Returns { applied: true, paid, due, balance, roId } or { applied: false, reason }.
 */
export async function applyCredit(sql, { orgId, userId, invoiceId, amount }) {
  const [r] = await sql`
    WITH inv AS (
      SELECT i.id, i.status, i.ro_id,
        COALESCE(i.customer_id, ro.customer_id) AS customer_id,
        COALESCE(ro.shop_id, i.shop_id, (SELECT s.id FROM shops s WHERE s.org_id = ${orgId} ORDER BY s.created_at LIMIT 1)) AS shop_id,
        COALESCE(i.customer_name, c.name) AS customer_name,
        i.amount - COALESCE((SELECT SUM(p.amount) FROM payments p WHERE p.invoice_id = i.id AND p.org_id = ${orgId} AND p.status = 'completed'), 0) AS due
      FROM invoices i
      LEFT JOIN repair_orders ro ON ro.id = i.ro_id
      LEFT JOIN customers c ON c.id = COALESCE(i.customer_id, ro.customer_id)
      WHERE i.id = ${invoiceId} AND i.org_id = ${orgId}
    ),
    bal AS (
      SELECT COALESCE(SUM(amount), 0) AS balance FROM customer_credits
      WHERE org_id = ${orgId} AND customer_id = (SELECT customer_id FROM inv)
    ),
    ok AS (
      SELECT inv.* FROM inv, bal
      WHERE inv.status = 'unpaid' AND inv.customer_id IS NOT NULL
        AND ${amount}::numeric <= inv.due + 0.005
        AND ${amount}::numeric <= bal.balance + 0.005
    ),
    led AS (
      INSERT INTO customer_credits (org_id, customer_id, kind, amount, invoice_id, note, created_by)
      SELECT ${orgId}, ok.customer_id, 'applied', -(${amount}::numeric), ok.id, 'Applied to an invoice', ${userId ?? null}::uuid FROM ok
      RETURNING id
    ),
    pay AS (
      INSERT INTO payments (org_id, invoice_id, shop_id, amount, method, customer_name, status)
      SELECT ${orgId}, ok.id, ok.shop_id, ${amount}::numeric, 'credit', ok.customer_name, 'completed' FROM ok
      RETURNING id
    ),
    upd AS (
      UPDATE invoices i SET
        credit_applied = COALESCE(i.credit_applied, 0) + ${amount}::numeric,
        status = CASE WHEN ${amount}::numeric >= ok.due - 0.005 THEN 'paid' ELSE i.status END,
        paid_at = CASE WHEN ${amount}::numeric >= ok.due - 0.005 THEN now() ELSE i.paid_at END
      FROM ok WHERE i.id = ok.id AND i.org_id = ${orgId}
      RETURNING i.id, i.status
    )
    SELECT
      (SELECT status FROM upd) AS new_status,
      (SELECT id FROM inv) AS found_id,
      (SELECT status FROM inv) AS status,
      (SELECT customer_id FROM inv) AS customer_id,
      (SELECT ro_id FROM inv) AS ro_id,
      (SELECT due FROM inv)::float8 AS due,
      (SELECT balance FROM bal)::float8 AS balance
  `
  if (r?.new_status) {
    return { applied: true, paid: r.new_status === 'paid', due: round2(r.due), balance: round2(r.balance), roId: r.ro_id || null }
  }
  if (!r?.found_id) return { applied: false, reason: 'not_found' }
  if (r.status !== 'unpaid') return { applied: false, reason: r.status === 'draft' ? 'draft' : 'not_unpaid' }
  if (!r.customer_id) return { applied: false, reason: 'no_customer' }
  if (round2(amount) > round2(r.due) + 0.005) return { applied: false, reason: 'over_due', due: round2(r.due) }
  return { applied: false, reason: 'over_credit', balance: round2(r.balance) }
}

/**
 * Give an invoice's applied credit back to the customer (when its payments are
 * undone or it is voided): the credit payments are marked refunded and the same
 * amount goes back on the ledger. One statement. Does nothing if no credit was used.
 */
export async function returnInvoiceCredit(sql, { orgId, invoiceId }) {
  await sql`
    WITH cr AS (
      UPDATE payments SET status = 'refunded'
      WHERE invoice_id = ${invoiceId} AND org_id = ${orgId} AND method = 'credit' AND status = 'completed'
      RETURNING amount
    ),
    inv AS (
      SELECT COALESCE(i.customer_id, ro.customer_id) AS customer_id
      FROM invoices i LEFT JOIN repair_orders ro ON ro.id = i.ro_id
      WHERE i.id = ${invoiceId} AND i.org_id = ${orgId}
    ),
    led AS (
      INSERT INTO customer_credits (org_id, customer_id, kind, amount, invoice_id, note)
      SELECT ${orgId}, inv.customer_id, 'adjustment', (SELECT SUM(amount) FROM cr), ${invoiceId}, 'Returned: the payment was undone or the invoice voided'
      FROM inv WHERE inv.customer_id IS NOT NULL AND (SELECT SUM(amount) FROM cr) > 0
      RETURNING id
    )
    UPDATE invoices SET credit_applied = 0 WHERE id = ${invoiceId} AND org_id = ${orgId} AND EXISTS (SELECT 1 FROM cr)
  `
}
