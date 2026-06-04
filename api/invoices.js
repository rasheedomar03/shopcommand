import { createHandler } from './_lib/handler.js'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

const VALID_METHODS = ['visa', 'mastercard', 'amex', 'cash', 'check', 'financing', 'other']
const VALID_STATUSES = ['completed', 'pending', 'failed', 'refunded']

export default createHandler(
  { methods: ['GET', 'POST', 'PUT'] },
  async ({ req, res, sql, user }) => {
    const action = req.query?.action

    // ── List payments: GET /api/invoices?action=payments ───────────────────
    if (action === 'payments' && req.method === 'GET') {
      const shopId = req.query?.shop_id
      const shopFilter = shopId ? sql`AND p.shop_id = ${shopId}` : sql``

      const rows = await sql`
        SELECT p.*, i.ro_id,
          ro.ro_number, s.name AS shop_name
        FROM payments p
        LEFT JOIN invoices i ON i.id = p.invoice_id
        LEFT JOIN repair_orders ro ON ro.id = i.ro_id
        LEFT JOIN shops s ON s.id = p.shop_id
        WHERE p.org_id = ${user.orgId} ${shopFilter}
        ORDER BY p.created_at DESC
        LIMIT 200
      `
      return res.json(rows)
    }

    // ── Record payment: POST /api/invoices?action=pay ─────────────────────
    if (action === 'pay' && req.method === 'POST') {
      if (user.role === 'tech') {
        return res.status(403).json({ error: 'Technicians cannot record payments' })
      }

      const { invoice_id, method, last4, amount } = req.body || {}

      if (!invoice_id || !UUID_RE.test(invoice_id)) {
        return res.status(400).json({ error: 'Valid invoice_id is required' })
      }
      if (!method || !VALID_METHODS.includes(method)) {
        return res.status(400).json({ error: 'Valid payment method is required' })
      }

      const [invoice] = await sql`
        SELECT i.*, ro.customer_id, ro.shop_id, c.name AS customer_name
        FROM invoices i
        LEFT JOIN repair_orders ro ON ro.id = i.ro_id
        LEFT JOIN customers c ON c.id = ro.customer_id
        WHERE i.id = ${invoice_id} AND i.org_id = ${user.orgId}
      `
      if (!invoice) return res.status(404).json({ error: 'Invoice not found' })
      if (invoice.status === 'paid') return res.status(409).json({ error: 'Invoice already paid' })

      const payAmount = amount ? Number(amount) : Number(invoice.amount)

      const [payment] = await sql`
        INSERT INTO payments (org_id, invoice_id, shop_id, amount, method, last4, customer_name, status)
        VALUES (${user.orgId}, ${invoice_id}, ${invoice.shop_id}, ${payAmount}, ${method}, ${last4 || null}, ${invoice.customer_name || null}, 'completed')
        RETURNING *
      `

      // Mark invoice as paid and RO as Paid
      await sql`UPDATE invoices SET status = 'paid', paid_at = now() WHERE id = ${invoice_id} AND org_id = ${user.orgId}`
      await sql`UPDATE repair_orders SET stage = 'Paid' WHERE id = ${invoice.ro_id} AND org_id = ${user.orgId}`

      return res.status(201).json(payment)
    }

    // ── Update payment status: PUT /api/invoices?action=update-payment ────
    if (action === 'update-payment' && req.method === 'PUT') {
      if (user.role === 'tech') {
        return res.status(403).json({ error: 'Technicians cannot update payments' })
      }

      const id = req.query?.id
      const { status } = req.body || {}
      if (!id) return res.status(400).json({ error: 'Missing ?id= parameter' })
      if (!status || !VALID_STATUSES.includes(status)) {
        return res.status(400).json({ error: 'Valid status is required' })
      }

      const [row] = await sql`
        UPDATE payments SET status = ${status} WHERE id = ${id} AND org_id = ${user.orgId} RETURNING *
      `
      if (!row) return res.status(404).json({ error: 'Payment not found' })
      return res.json(row)
    }

    if (req.method === 'GET') {
      const id = req.query?.id
      const roId = req.query?.ro_id

      if (id) {
        const [row] = await sql`
          SELECT i.*, ro.ro_number, ro.total AS ro_total,
            c.name AS customer_name, c.email AS customer_email
          FROM invoices i
          LEFT JOIN repair_orders ro ON ro.id = i.ro_id
          LEFT JOIN customers c ON c.id = ro.customer_id
          WHERE i.id = ${id} AND i.org_id = ${user.orgId}
        `
        if (!row) return res.status(404).json({ error: 'Invoice not found' })
        return res.json(row)
      }

      if (roId) {
        const rows = await sql`
          SELECT i.*, ro.ro_number
          FROM invoices i
          LEFT JOIN repair_orders ro ON ro.id = i.ro_id
          WHERE i.ro_id = ${roId} AND i.org_id = ${user.orgId}
          ORDER BY i.created_at DESC
        `
        return res.json(rows)
      }

      // List all invoices
      const rows = await sql`
        SELECT i.*, ro.ro_number,
          c.name AS customer_name
        FROM invoices i
        LEFT JOIN repair_orders ro ON ro.id = i.ro_id
        LEFT JOIN customers c ON c.id = ro.customer_id
        WHERE i.org_id = ${user.orgId}
        ORDER BY i.created_at DESC
        LIMIT 200
      `
      return res.json(rows)
    }

    if (req.method === 'POST') {
      if (user.role === 'tech') {
        return res.status(403).json({ error: 'Technicians cannot create invoices' })
      }

      const { ro_id } = req.body || {}

      if (!ro_id || !UUID_RE.test(ro_id)) {
        return res.status(400).json({ error: 'Valid ro_id is required' })
      }

      // Get the RO and verify it exists
      const [ro] = await sql`SELECT * FROM repair_orders WHERE id = ${ro_id} AND org_id = ${user.orgId}`
      if (!ro) return res.status(404).json({ error: 'Repair order not found' })

      // RO must be Complete to invoice
      if (ro.stage !== 'Complete') {
        return res.status(409).json({ error: 'Repair order must be in Complete stage to invoice' })
      }

      // Check for existing unpaid invoice
      const [existing] = await sql`
        SELECT id FROM invoices WHERE ro_id = ${ro_id} AND org_id = ${user.orgId} AND status = 'unpaid'
      `
      if (existing) {
        return res.status(409).json({ error: 'An unpaid invoice already exists for this repair order' })
      }

      const [row] = await sql`
        INSERT INTO invoices (org_id, ro_id, amount)
        VALUES (${user.orgId}, ${ro_id}, ${Number(ro.total)})
        RETURNING *
      `

      // Move RO to Invoiced stage
      await sql`UPDATE repair_orders SET stage = 'Invoiced' WHERE id = ${ro_id} AND org_id = ${user.orgId}`

      return res.status(201).json(row)
    }

    if (req.method === 'PUT') {
      if (user.role === 'tech') {
        return res.status(403).json({ error: 'Technicians cannot update invoices' })
      }

      const id = req.query?.id
      if (!id) return res.status(400).json({ error: 'Missing ?id= parameter' })

      const { status } = req.body || {}

      if (!status || !['paid', 'void'].includes(status)) {
        return res.status(400).json({ error: 'Status must be "paid" or "void"' })
      }

      const [invoice] = await sql`SELECT * FROM invoices WHERE id = ${id} AND org_id = ${user.orgId}`
      if (!invoice) return res.status(404).json({ error: 'Invoice not found' })

      if (invoice.status !== 'unpaid') {
        return res.status(409).json({ error: 'Only unpaid invoices can be updated' })
      }

      if (status === 'paid') {
        const [row] = await sql`
          UPDATE invoices SET status = 'paid', paid_at = now()
          WHERE id = ${id} AND org_id = ${user.orgId}
          RETURNING *
        `

        // Move RO to Paid stage
        await sql`UPDATE repair_orders SET stage = 'Paid' WHERE id = ${invoice.ro_id} AND org_id = ${user.orgId}`

        return res.json(row)
      }

      if (status === 'void') {
        const [row] = await sql`
          UPDATE invoices SET status = 'void'
          WHERE id = ${id} AND org_id = ${user.orgId}
          RETURNING *
        `

        // Move RO back to Complete
        await sql`UPDATE repair_orders SET stage = 'Complete' WHERE id = ${invoice.ro_id} AND org_id = ${user.orgId}`

        return res.json(row)
      }
    }
  }
)
