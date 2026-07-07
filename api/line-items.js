import { createHandler } from './_lib/handler.js'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const VALID_TYPES = ['labor', 'part', 'fee', 'discount']

async function recalculateRoTotal(sql, roId) {
  await sql`
    UPDATE repair_orders
    SET total = COALESCE((
      SELECT SUM(qty * unit_price) FROM line_items WHERE ro_id = ${roId}
    ), 0)
    WHERE id = ${roId}
  `
}

export default createHandler(
  { methods: ['GET', 'POST', 'PUT', 'DELETE'] },
  async ({ req, res, sql, user }) => {
    if (req.method === 'GET') {
      const roId = req.query?.ro_id
      if (!roId) return res.status(400).json({ error: 'Missing ?ro_id= parameter' })
      if (!UUID_RE.test(roId)) return res.status(400).json({ error: 'Invalid ro_id format' })

      const rows = await sql`
        SELECT * FROM line_items WHERE ro_id = ${roId} AND org_id = ${user.orgId} ORDER BY created_at ASC
      `
      return res.json(rows)
    }

    if (req.method === 'POST') {
      if (user.role === 'tech') {
        return res.status(403).json({ error: 'Technicians cannot add line items' })
      }

      const { ro_id, type, description, qty, unit_price } = req.body || {}
      const errors = []

      if (!ro_id || !UUID_RE.test(ro_id)) errors.push('Valid ro_id is required')
      if (!type || !VALID_TYPES.includes(type)) {
        errors.push('Type must be one of: ' + VALID_TYPES.join(', '))
      }
      if (!description || typeof description !== 'string' || description.trim().length < 1 || description.trim().length > 500) {
        errors.push('Description must be 1-500 characters')
      }
      if (qty !== undefined && qty !== null) {
        const q = Number(qty)
        if (isNaN(q) || q <= 0 || q > 99999) errors.push('Qty must be between 0.01 and 99999')
      }
      if (unit_price !== undefined && unit_price !== null) {
        const p = Number(unit_price)
        if (isNaN(p) || p < 0 || p > 999999) errors.push('Unit price must be between 0 and 999999')
      }
      if (errors.length) return res.status(400).json({ error: errors.join(', ') })

      // Verify RO exists and belongs to this org (explicit org_id filter is the tenancy layer)
      const [ro] = await sql`SELECT id FROM repair_orders WHERE id = ${ro_id} AND org_id = ${user.orgId}`
      if (!ro) return res.status(404).json({ error: 'Repair order not found' })

      const [row] = await sql`
        INSERT INTO line_items (org_id, ro_id, type, description, qty, unit_price)
        VALUES (
          ${user.orgId}, ${ro_id}, ${type},
          ${description.trim()},
          ${qty != null ? Number(qty) : 1},
          ${unit_price != null ? Number(unit_price) : 0}
        )
        RETURNING *
      `

      await recalculateRoTotal(sql, ro_id)
      return res.status(201).json(row)
    }

    if (req.method === 'PUT') {
      if (user.role === 'tech') {
        return res.status(403).json({ error: 'Technicians cannot update line items' })
      }

      const id = req.query?.id
      if (!id) return res.status(400).json({ error: 'Missing ?id= parameter' })

      const { type, description, qty, unit_price } = req.body || {}
      const errors = []

      if (type && !VALID_TYPES.includes(type)) {
        errors.push('Type must be one of: ' + VALID_TYPES.join(', '))
      }
      if (description !== undefined) {
        if (typeof description !== 'string' || description.trim().length < 1 || description.trim().length > 500) {
          errors.push('Description must be 1-500 characters')
        }
      }
      if (qty !== undefined && qty !== null) {
        const q = Number(qty)
        if (isNaN(q) || q <= 0 || q > 99999) errors.push('Qty must be between 0.01 and 99999')
      }
      if (unit_price !== undefined && unit_price !== null) {
        const p = Number(unit_price)
        if (isNaN(p) || p < 0 || p > 999999) errors.push('Unit price must be between 0 and 999999')
      }
      if (errors.length) return res.status(400).json({ error: errors.join(', ') })

      const [existing] = await sql`SELECT * FROM line_items WHERE id = ${id} AND org_id = ${user.orgId}`
      if (!existing) return res.status(404).json({ error: 'Line item not found' })

      const [row] = await sql`
        UPDATE line_items SET
          type = COALESCE(${type || null}, type),
          description = COALESCE(${description?.trim() || null}, description),
          qty = COALESCE(${qty != null ? Number(qty) : null}, qty),
          unit_price = COALESCE(${unit_price != null ? Number(unit_price) : null}, unit_price)
        WHERE id = ${id} AND org_id = ${user.orgId}
        RETURNING *
      `

      await recalculateRoTotal(sql, existing.ro_id)
      return res.json(row)
    }

    if (req.method === 'DELETE') {
      if (user.role === 'tech') {
        return res.status(403).json({ error: 'Technicians cannot delete line items' })
      }

      const id = req.query?.id
      if (!id) return res.status(400).json({ error: 'Missing ?id= parameter' })

      const [existing] = await sql`SELECT * FROM line_items WHERE id = ${id} AND org_id = ${user.orgId}`
      if (!existing) return res.status(404).json({ error: 'Line item not found' })

      await sql`DELETE FROM line_items WHERE id = ${id} AND org_id = ${user.orgId}`
      await recalculateRoTotal(sql, existing.ro_id)

      return res.json({ deleted: id })
    }
  }
)
