import { createHandler } from './_lib/handler.js'

function validate(body, partial = false) {
  const errors = []
  if (!partial || 'name' in body) {
    if (!body.name || typeof body.name !== 'string' || body.name.trim().length < 2 || body.name.trim().length > 100) {
      errors.push('Name must be 2-100 characters')
    }
  }
  if ('address' in body && body.address) {
    if (typeof body.address !== 'string' || body.address.trim().length > 300) {
      errors.push('Address must be under 300 characters')
    }
  }
  if ('phone' in body && body.phone) {
    if (typeof body.phone !== 'string' || body.phone.trim().length > 30) {
      errors.push('Phone must be under 30 characters')
    }
  }
  return errors
}

export default createHandler(
  { methods: ['GET', 'POST', 'PUT', 'DELETE'] },
  async ({ req, res, sql, user }) => {
    if (req.method === 'GET') {
      const rows = await sql`SELECT * FROM shops ORDER BY created_at ASC`
      return res.json(rows)
    }

    if (req.method === 'POST') {
      if (user.role !== 'owner') return res.status(403).json({ error: 'Only owners can create shops' })

      const errors = validate(req.body || {})
      if (errors.length) return res.status(400).json({ error: errors.join(', ') })

      const { name, address, phone } = req.body
      const [row] = await sql`
        INSERT INTO shops (org_id, name, address, phone)
        VALUES (${user.orgId}, ${name.trim()}, ${address?.trim() || null}, ${phone?.trim() || null})
        RETURNING *
      `
      return res.status(201).json(row)
    }

    if (req.method === 'PUT') {
      if (user.role !== 'owner') return res.status(403).json({ error: 'Only owners can update shops' })

      const id = req.query?.id
      if (!id) return res.status(400).json({ error: 'Missing ?id= parameter' })

      const errors = validate(req.body || {}, true)
      if (errors.length) return res.status(400).json({ error: errors.join(', ') })

      const { name, address, phone } = req.body
      const [row] = await sql`
        UPDATE shops SET
          name = COALESCE(${name?.trim() || null}, name),
          address = COALESCE(${address?.trim() || null}, address),
          phone = COALESCE(${phone?.trim() || null}, phone)
        WHERE id = ${id}
        RETURNING *
      `
      if (!row) return res.status(404).json({ error: 'Shop not found' })
      return res.json(row)
    }

    if (req.method === 'DELETE') {
      if (user.role !== 'owner') return res.status(403).json({ error: 'Only owners can delete shops' })

      const id = req.query?.id
      if (!id) return res.status(400).json({ error: 'Missing ?id= parameter' })

      const [row] = await sql`DELETE FROM shops WHERE id = ${id} RETURNING id`
      if (!row) return res.status(404).json({ error: 'Shop not found' })
      return res.json({ deleted: row.id })
    }
  }
)
