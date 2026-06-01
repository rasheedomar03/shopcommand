import { createHandler } from './_lib/handler.js'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const VIN_RE = /^[A-HJ-NPR-Z0-9]{17}$/i

function validate(body, partial = false) {
  const errors = []
  if (!partial) {
    if (!body.customer_id || !UUID_RE.test(body.customer_id)) {
      errors.push('Valid customer_id is required')
    }
  }
  if ('year' in body && body.year != null) {
    const y = Number(body.year)
    if (!Number.isInteger(y) || y < 1900 || y > 2100) {
      errors.push('Year must be between 1900 and 2100')
    }
  }
  if ('make' in body && body.make) {
    if (typeof body.make !== 'string' || body.make.trim().length < 1 || body.make.trim().length > 50) {
      errors.push('Make must be 1-50 characters')
    }
  }
  if ('model' in body && body.model) {
    if (typeof body.model !== 'string' || body.model.trim().length < 1 || body.model.trim().length > 50) {
      errors.push('Model must be 1-50 characters')
    }
  }
  if ('vin' in body && body.vin) {
    if (typeof body.vin !== 'string' || !VIN_RE.test(body.vin.trim())) {
      errors.push('VIN must be 17 alphanumeric characters')
    }
  }
  if ('license' in body && body.license) {
    if (typeof body.license !== 'string' || body.license.trim().length > 20) {
      errors.push('License must be under 20 characters')
    }
  }
  return errors
}

export default createHandler(
  { methods: ['GET', 'POST', 'PUT', 'DELETE'] },
  async ({ req, res, sql, user }) => {
    if (req.method === 'GET') {
      const customerId = req.query?.customer_id
      if (!customerId) return res.status(400).json({ error: 'Missing ?customer_id= parameter' })

      const rows = await sql`
        SELECT * FROM vehicles WHERE customer_id = ${customerId} ORDER BY created_at DESC
      `
      return res.json(rows)
    }

    if (req.method === 'POST') {
      const errors = validate(req.body || {})
      if (errors.length) return res.status(400).json({ error: errors.join(', ') })

      const { customer_id, year, make, model, vin, license } = req.body
      const [row] = await sql`
        INSERT INTO vehicles (org_id, customer_id, year, make, model, vin, license)
        VALUES (
          ${user.orgId},
          ${customer_id},
          ${year ? Number(year) : null},
          ${make?.trim() || null},
          ${model?.trim() || null},
          ${vin?.trim().toUpperCase() || null},
          ${license?.trim() || null}
        )
        RETURNING *
      `
      return res.status(201).json(row)
    }

    if (req.method === 'PUT') {
      const id = req.query?.id
      if (!id) return res.status(400).json({ error: 'Missing ?id= parameter' })

      const errors = validate(req.body || {}, true)
      if (errors.length) return res.status(400).json({ error: errors.join(', ') })

      const { year, make, model, vin, license } = req.body
      const [row] = await sql`
        UPDATE vehicles SET
          year = COALESCE(${year ? Number(year) : null}, year),
          make = COALESCE(${make?.trim() || null}, make),
          model = COALESCE(${model?.trim() || null}, model),
          vin = COALESCE(${vin?.trim().toUpperCase() || null}, vin),
          license = COALESCE(${license?.trim() || null}, license)
        WHERE id = ${id}
        RETURNING *
      `
      if (!row) return res.status(404).json({ error: 'Vehicle not found' })
      return res.json(row)
    }

    if (req.method === 'DELETE') {
      const id = req.query?.id
      if (!id) return res.status(400).json({ error: 'Missing ?id= parameter' })

      const [row] = await sql`DELETE FROM vehicles WHERE id = ${id} RETURNING id`
      if (!row) return res.status(404).json({ error: 'Vehicle not found' })
      return res.json({ deleted: row.id })
    }
  }
)
