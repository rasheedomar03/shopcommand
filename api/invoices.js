import { createHandler } from './_lib/handler.js'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export default createHandler(
  { methods: ['GET', 'POST', 'PUT'] },
  async ({ req, res, sql, user }) => {
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
          WHERE i.id = ${id}
        `
        if (!row) return res.status(404).json({ error: 'Invoice not found' })
        return res.json(row)
      }

      if (roId) {
        const rows = await sql`
          SELECT i.*, ro.ro_number
          FROM invoices i
          LEFT JOIN repair_orders ro ON ro.id = i.ro_id
          WHERE i.ro_id = ${roId}
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
      const [ro] = await sql`SELECT * FROM repair_orders WHERE id = ${ro_id}`
      if (!ro) return res.status(404).json({ error: 'Repair order not found' })

      // RO must be Complete to invoice
      if (ro.stage !== 'Complete') {
        return res.status(409).json({ error: 'Repair order must be in Complete stage to invoice' })
      }

      // Check for existing unpaid invoice
      const [existing] = await sql`
        SELECT id FROM invoices WHERE ro_id = ${ro_id} AND status = 'unpaid'
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
      await sql`UPDATE repair_orders SET stage = 'Invoiced' WHERE id = ${ro_id}`

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

      const [invoice] = await sql`SELECT * FROM invoices WHERE id = ${id}`
      if (!invoice) return res.status(404).json({ error: 'Invoice not found' })

      if (invoice.status !== 'unpaid') {
        return res.status(409).json({ error: 'Only unpaid invoices can be updated' })
      }

      if (status === 'paid') {
        const [row] = await sql`
          UPDATE invoices SET status = 'paid', paid_at = now()
          WHERE id = ${id}
          RETURNING *
        `

        // Move RO to Paid stage
        await sql`UPDATE repair_orders SET stage = 'Paid' WHERE id = ${invoice.ro_id}`

        return res.json(row)
      }

      if (status === 'void') {
        const [row] = await sql`
          UPDATE invoices SET status = 'void'
          WHERE id = ${id}
          RETURNING *
        `

        // Move RO back to Complete
        await sql`UPDATE repair_orders SET stage = 'Complete' WHERE id = ${invoice.ro_id}`

        return res.json(row)
      }
    }
  }
)
