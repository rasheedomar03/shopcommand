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

      // Partial payments: sum what's already been paid and cap this one at
      // the remaining balance
      const [{ paid_so_far }] = await sql`
        SELECT COALESCE(SUM(amount), 0) AS paid_so_far
        FROM payments WHERE invoice_id = ${invoice_id} AND org_id = ${user.orgId} AND status = 'completed'
      `
      const balance = Number(invoice.amount) - Number(paid_so_far)
      const payAmount = amount !== undefined && amount !== null && amount !== '' ? Number(amount) : balance

      if (!Number.isFinite(payAmount) || payAmount <= 0) {
        return res.status(400).json({ error: 'Payment amount must be greater than zero' })
      }
      if (payAmount > balance + 0.005) {
        return res.status(400).json({ error: `Payment exceeds the remaining balance of $${balance.toFixed(2)}` })
      }

      const [payment] = await sql`
        INSERT INTO payments (org_id, invoice_id, shop_id, amount, method, last4, customer_name, status)
        VALUES (${user.orgId}, ${invoice_id}, ${invoice.shop_id}, ${payAmount}, ${method}, ${last4 || null}, ${invoice.customer_name || null}, 'completed')
        RETURNING *
      `

      const totalPaid = Number(paid_so_far) + payAmount
      const fullyPaid = totalPaid >= Number(invoice.amount) - 0.005

      if (fullyPaid) {
        await sql`UPDATE invoices SET status = 'paid', paid_at = now() WHERE id = ${invoice_id} AND org_id = ${user.orgId}`
        await sql`UPDATE repair_orders SET stage = 'Paid' WHERE id = ${invoice.ro_id} AND org_id = ${user.orgId}`
      }

      return res.status(201).json({ ...payment, amount_paid: totalPaid, invoice_paid: fullyPaid })
    }

    // ── Email invoice to customer: POST /api/invoices?action=email ────────
    if (action === 'email' && req.method === 'POST') {
      if (user.role === 'tech') {
        return res.status(403).json({ error: 'Technicians cannot email invoices' })
      }
      if (!process.env.RESEND_API_KEY) {
        return res.status(503).json({ error: 'Email sending is not configured' })
      }

      const { invoice_id } = req.body || {}
      if (!invoice_id || !UUID_RE.test(invoice_id)) {
        return res.status(400).json({ error: 'Valid invoice_id is required' })
      }

      const [inv] = await sql`
        SELECT i.*, ro.ro_number, ro.data AS ro_data,
          c.name AS customer_name, c.email AS customer_email,
          s.name AS shop_name, s.address AS shop_address, s.phone AS shop_phone,
          v.year AS vehicle_year, v.make AS vehicle_make, v.model AS vehicle_model,
          COALESCE((SELECT SUM(p.amount) FROM payments p WHERE p.invoice_id = i.id AND p.status = 'completed'), 0) AS amount_paid
        FROM invoices i
        LEFT JOIN repair_orders ro ON ro.id = i.ro_id
        LEFT JOIN customers c ON c.id = ro.customer_id
        LEFT JOIN shops s ON s.id = ro.shop_id
        LEFT JOIN vehicles v ON v.id = ro.vehicle_id
        WHERE i.id = ${invoice_id} AND i.org_id = ${user.orgId}
      `
      if (!inv) return res.status(404).json({ error: 'Invoice not found' })
      if (inv.status === 'void') return res.status(409).json({ error: 'Cannot email a voided invoice' })
      if (!inv.customer_email) {
        return res.status(400).json({ error: 'This customer has no email on file. Add one on the Customers page first.' })
      }

      const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]))
      const money = (v) => `$${(Number(v) || 0).toFixed(2)}`

      const invNumber = inv.ro_number
        ? `INV-${String(inv.ro_number).replace(/^RO-?/i, '')}`
        : `INV-${String(inv.id).slice(0, 8).toUpperCase()}`
      const vehicle = [inv.vehicle_year, inv.vehicle_make, inv.vehicle_model].filter(Boolean).join(' ')
      const shopName = String(inv.shop_name || 'Your repair shop').replace(/[<>@]/g, '')
      // Line items = the RO's service lines plus any parts used on the job
      // (stored separately on the RO), so the Tax gap below is really tax.
      const roServices = Array.isArray(inv.ro_data?.services) ? inv.ro_data.services : []
      const roParts = (Array.isArray(inv.ro_data?.partsUsed) ? inv.ro_data.partsUsed : []).map(p => ({
        name: `${p.name || 'Part'}${Number(p.qty) > 1 ? ` (x${Number(p.qty)})` : ''}`,
        price: (Number(p.price) || 0) * (Number(p.qty) || 1),
      }))
      const services = roServices.length + roParts.length > 0
        ? [...roServices, ...roParts]
        : [{ name: 'Repair services', price: Number(inv.amount) || 0 }]
      const total = Number(inv.amount) || 0
      const paid = Number(inv.amount_paid) || 0
      const balance = Math.max(0, Math.round((total - paid) * 100) / 100)

      // The invoice amount can exceed the line items (tax rolled into the RO
      // total); show that gap as its own line so the math reads clean.
      const linesSum = services.reduce((sum, s) => sum + (Number(s.price) || 0), 0)
      const taxGap = Math.round((total - linesSum) * 100) / 100

      const rowsHtml = services.map(s => `
        <tr>
          <td style="padding:8px 0;border-top:1px solid #e2e8f0;color:#0f172a;">${esc(s.name)}</td>
          <td style="padding:8px 0;border-top:1px solid #e2e8f0;color:#334155;text-align:right;white-space:nowrap;">${money(s.price)}</td>
        </tr>`).join('') + (taxGap > 0.005 ? `
        <tr>
          <td style="padding:8px 0;border-top:1px solid #e2e8f0;color:#64748b;">Tax</td>
          <td style="padding:8px 0;border-top:1px solid #e2e8f0;color:#334155;text-align:right;white-space:nowrap;">${money(taxGap)}</td>
        </tr>` : '')

      const statusLine = inv.status === 'paid'
        ? `<p style="margin:16px 0 0;color:#16a34a;font-weight:600;">Paid in full. Thank you!</p>`
        : paid > 0
          ? `<p style="margin:16px 0 0;color:#334155;">Paid so far: <strong>${money(paid)}</strong> · Balance due: <strong>${money(balance)}</strong></p>`
          : ''

      const html = `
<div style="font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;max-width:560px;margin:0 auto;padding:24px;color:#0f172a;">
  <div style="border-bottom:2px solid #0f172a;padding-bottom:12px;margin-bottom:16px;">
    <div style="font-size:18px;font-weight:700;">${esc(shopName)}</div>
    ${inv.shop_address ? `<div style="font-size:12px;color:#64748b;">${esc(inv.shop_address)}</div>` : ''}
    ${inv.shop_phone ? `<div style="font-size:12px;color:#64748b;">${esc(inv.shop_phone)}</div>` : ''}
  </div>
  <table style="width:100%;font-size:13px;color:#64748b;margin-bottom:16px;">
    <tr>
      <td><strong style="color:#0f172a;">Invoice ${esc(invNumber)}</strong><br>${new Date(inv.created_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</td>
      <td style="text-align:right;">${esc(inv.customer_name || '')}${vehicle ? `<br>${esc(vehicle)}` : ''}</td>
    </tr>
  </table>
  <table style="width:100%;font-size:14px;border-collapse:collapse;">
    ${rowsHtml}
    <tr>
      <td style="padding:10px 0;border-top:2px solid #0f172a;font-weight:700;">Total${inv.status === 'paid' ? '' : ' due'}</td>
      <td style="padding:10px 0;border-top:2px solid #0f172a;font-weight:700;text-align:right;">${money(total)}</td>
    </tr>
  </table>
  ${statusLine}
  <p style="margin:24px 0 0;font-size:12px;color:#94a3b8;">Questions about this invoice? Just reply to this email${inv.shop_phone ? ` or call ${esc(inv.shop_phone)}` : ''}.</p>
</div>`

      const text = [
        `Invoice ${invNumber} from ${shopName}`,
        vehicle ? `Vehicle: ${vehicle}` : null,
        '',
        ...services.map(s => `${s.name}: ${money(s.price)}`),
        ...(taxGap > 0.005 ? [`Tax: ${money(taxGap)}`] : []),
        `Total${inv.status === 'paid' ? '' : ' due'}: ${money(total)}`,
        inv.status === 'paid' ? 'Paid in full. Thank you!' : paid > 0 ? `Paid so far: ${money(paid)} · Balance due: ${money(balance)}` : null,
        '',
        `Questions? Just reply to this email${inv.shop_phone ? ` or call ${inv.shop_phone}` : ''}.`,
      ].filter(v => v !== null).join('\n')

      const sendRes = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: `${shopName} <invoices@shopcommand.net>`,
          to: inv.customer_email,
          ...(user.email ? { reply_to: user.email } : {}),
          subject: `Invoice ${invNumber} from ${shopName}`,
          html,
          text,
        }),
      })
      if (!sendRes.ok) {
        return res.status(502).json({ error: 'Email service rejected the send. Try again in a minute.' })
      }

      return res.json({ sent: true, to: inv.customer_email })
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
            c.name AS customer_name, c.email AS customer_email,
            COALESCE((SELECT SUM(p.amount) FROM payments p WHERE p.invoice_id = i.id AND p.status = 'completed'), 0) AS amount_paid
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
          c.name AS customer_name,
          COALESCE((SELECT SUM(p.amount) FROM payments p WHERE p.invoice_id = i.id AND p.status = 'completed'), 0) AS amount_paid
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

      const { status, amount } = req.body || {}

      if (status === undefined && amount === undefined) {
        return res.status(400).json({ error: 'Provide status or amount to update' })
      }
      if (status !== undefined && !['paid', 'void', 'unpaid'].includes(status)) {
        return res.status(400).json({ error: 'Status must be "paid", "void", or "unpaid"' })
      }
      if (amount !== undefined && (!Number.isFinite(Number(amount)) || Number(amount) < 0 || Number(amount) > 10_000_000)) {
        return res.status(400).json({ error: 'Amount must be a non-negative number' })
      }

      const [invoice] = await sql`SELECT * FROM invoices WHERE id = ${id} AND org_id = ${user.orgId}`
      if (!invoice) return res.status(404).json({ error: 'Invoice not found' })

      // Revert a paid invoice to unpaid (mistaken payment). Its recorded
      // payments are marked refunded so the paid total resets with it.
      if (status === 'unpaid') {
        if (invoice.status !== 'paid') {
          return res.status(409).json({ error: 'Only paid invoices can be marked unpaid' })
        }
        const [row] = await sql`
          UPDATE invoices SET status = 'unpaid', paid_at = NULL
          WHERE id = ${id} AND org_id = ${user.orgId}
          RETURNING *
        `
        await sql`UPDATE payments SET status = 'refunded' WHERE invoice_id = ${id} AND org_id = ${user.orgId} AND status = 'completed'`
        await sql`UPDATE repair_orders SET stage = 'Invoiced' WHERE id = ${invoice.ro_id} AND org_id = ${user.orgId}`
        return res.json({ ...row, amount_paid: 0 })
      }

      if (invoice.status !== 'unpaid') {
        return res.status(409).json({ error: 'Only unpaid invoices can be updated' })
      }

      // Amount edit (no status change): reprice an unpaid invoice
      if (status === undefined) {
        const [row] = await sql`
          UPDATE invoices SET amount = ${Number(amount)}
          WHERE id = ${id} AND org_id = ${user.orgId}
          RETURNING *
        `
        return res.json(row)
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
