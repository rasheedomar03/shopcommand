import { createHandler } from './_lib/handler.js'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function validate(body, partial = false) {
  const errors = []
  if (!partial || 'name' in body) {
    if (!body.name || typeof body.name !== 'string' || body.name.trim().length < 2 || body.name.trim().length > 100) {
      errors.push('name must be 2-100 characters')
    }
  }
  if ('email' in body && body.email) {
    if (typeof body.email !== 'string' || !EMAIL_RE.test(body.email)) {
      errors.push('Invalid email format')
    }
  }
  if ('phone' in body && body.phone) {
    if (typeof body.phone !== 'string' || body.phone.trim().length > 30) {
      errors.push('Phone must be under 30 characters')
    }
  }
  if ('address' in body && body.address) {
    if (typeof body.address !== 'string' || body.address.trim().length > 300) {
      errors.push('Address must be under 300 characters')
    }
  }
  if ('notes' in body && body.notes) {
    if (typeof body.notes !== 'string' || body.notes.trim().length > 2000) {
      errors.push('Notes must be under 2000 characters')
    }
  }
  return errors
}

export default createHandler(
  { methods: ['GET', 'POST', 'PUT', 'DELETE'] },
  async ({ req, res, sql, user }) => {
    if (req.method === 'GET') {
      const search = req.query?.search?.trim()
      let rows
      if (search) {
        const pattern = `%${search}%`
        rows = await sql`
          SELECT id, org_id, name, email, phone, address, notes, created_at, updated_at
          FROM customers
          WHERE (name ILIKE ${pattern} OR email ILIKE ${pattern} OR phone ILIKE ${pattern})
          ORDER BY created_at DESC
          LIMIT 200
        `
      } else {
        rows = await sql`
          SELECT id, org_id, name, email, phone, address, notes, created_at, updated_at
          FROM customers ORDER BY created_at DESC LIMIT 200
        `
      }
      return res.json(rows)
    }

    if (req.method === 'POST') {
      const errors = validate(req.body || {})
      if (errors.length) return res.status(400).json({ error: errors.join(', ') })

      const { name, email, phone, address, notes } = req.body
      const [row] = await sql`
        INSERT INTO customers (org_id, name, email, phone, address, notes)
        VALUES (${user.orgId}, ${name.trim()}, ${email?.trim() || null}, ${phone?.trim() || null}, ${address?.trim() || null}, ${notes?.trim() || null})
        RETURNING *
      `
      return res.status(201).json(row)
    }

    if (req.method === 'PUT') {
      const id = req.query?.id
      if (!id) return res.status(400).json({ error: 'Missing ?id= parameter' })

      const errors = validate(req.body || {}, true)
      if (errors.length) return res.status(400).json({ error: errors.join(', ') })

      const { name, email, phone, address, notes } = req.body
      const [row] = await sql`
        UPDATE customers SET
          name = COALESCE(${name?.trim() || null}, name),
          email = COALESCE(${email?.trim() || null}, email),
          phone = COALESCE(${phone?.trim() || null}, phone),
          address = COALESCE(${address?.trim() || null}, address),
          notes = COALESCE(${notes?.trim() || null}, notes)
        WHERE id = ${id}
        RETURNING *
      `
      if (!row) return res.status(404).json({ error: 'Customer not found' })
      return res.json(row)
    }

    if (req.method === 'DELETE') {
      if (user.role !== 'owner') return res.status(403).json({ error: 'Only owners can delete customers' })

      const id = req.query?.id
      if (!id) return res.status(400).json({ error: 'Missing ?id= parameter' })

      const [row] = await sql`DELETE FROM customers WHERE id = ${id} RETURNING id`
      if (!row) return res.status(404).json({ error: 'Customer not found' })
      return res.json({ deleted: row.id })
    }
  }
)
