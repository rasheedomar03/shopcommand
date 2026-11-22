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
  // Truck number (the shop's own number for a truck), trim and last known mileage
  if ('unit_number' in body && body.unit_number != null && body.unit_number !== '') {
    if (typeof body.unit_number !== 'string' || body.unit_number.trim().length > 40) {
      errors.push('Truck number must be under 40 characters')
    }
  }
  if ('trim' in body && body.trim != null && body.trim !== '') {
    if (typeof body.trim !== 'string' || body.trim.trim().length > 60) {
      errors.push('Trim must be under 60 characters')
    }
  }
  if ('last_mileage' in body && body.last_mileage != null && body.last_mileage !== '') {
    const m = Number(body.last_mileage)
    if (!Number.isInteger(m) || m < 0 || m > 10_000_000) errors.push('Mileage must be a whole number up to 10,000,000')
  }
  return errors
}

const clean = (v, max) => (typeof v === 'string' && v.trim() ? v.trim().slice(0, max) : null)
const mileage = v => (v === undefined || v === null || v === '' ? null : Number(v))

export default createHandler(
  { methods: ['GET', 'POST', 'PUT', 'DELETE'] },
  async ({ req, res, sql, user }) => {
    if (req.method === 'GET') {
      // The shop's own trucks: vehicles of customers flagged as the fleet
      if (req.query?.fleet) {
        const rows = await sql`
          SELECT v.*, c.name AS customer_name, c.id AS fleet_customer_id
          FROM vehicles v
          JOIN customers c ON c.id = v.customer_id AND c.org_id = v.org_id
          WHERE v.org_id = ${user.orgId} AND c.is_fleet = true
          ORDER BY lower(COALESCE(v.unit_number, '')), v.created_at DESC
          LIMIT 500
        `
        return res.json(rows)
      }

      const customerId = req.query?.customer_id
      if (!customerId) return res.status(400).json({ error: 'Missing ?customer_id= parameter' })

      const rows = await sql`
        SELECT * FROM vehicles WHERE customer_id = ${customerId} AND org_id = ${user.orgId} ORDER BY created_at DESC
      `
      return res.json(rows)
    }

    if (req.method === 'POST') {
      const errors = validate(req.body || {})
      if (errors.length) return res.status(400).json({ error: errors.join(', ') })

      const { customer_id, year, make, model, vin, license } = req.body
      // The customer must belong to this organization (the id comes from the browser)
      const [owner] = await sql`SELECT id FROM customers WHERE id = ${customer_id} AND org_id = ${user.orgId}`
      if (!owner) return res.status(404).json({ error: 'Customer not found' })

      const [row] = await sql`
        INSERT INTO vehicles (org_id, customer_id, year, make, model, vin, license, unit_number, trim, last_mileage)
        VALUES (
          ${user.orgId},
          ${customer_id},
          ${year ? Number(year) : null},
          ${make?.trim() || null},
          ${model?.trim() || null},
          ${vin?.trim().toUpperCase() || null},
          ${license?.trim() || null},
          ${clean(req.body.unit_number, 40)},
          ${clean(req.body.trim, 60)},
          ${mileage(req.body.last_mileage)}
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
          license = COALESCE(${license?.trim() || null}, license),
          unit_number = COALESCE(${clean(req.body.unit_number, 40)}, unit_number),
          trim = COALESCE(${clean(req.body.trim, 60)}, trim),
          last_mileage = COALESCE(${mileage(req.body.last_mileage)}, last_mileage)
        WHERE id = ${id} AND org_id = ${user.orgId}
        RETURNING *
      `
      if (!row) return res.status(404).json({ error: 'Vehicle not found' })
      return res.json(row)
    }

    if (req.method === 'DELETE') {
      const id = req.query?.id
      if (!id) return res.status(400).json({ error: 'Missing ?id= parameter' })

      try {
        const [row] = await sql`DELETE FROM vehicles WHERE id = ${id} AND org_id = ${user.orgId} RETURNING id`
        if (!row) return res.status(404).json({ error: 'Vehicle not found' })
        return res.json({ deleted: row.id })
      } catch (err) {
        // invoices keep their truck (migration 008): a truck with invoices cannot be deleted
        if (err?.code === '23503') {
          return res.status(409).json({ error: 'This truck has invoices, so it cannot be deleted.', code: 'has_invoices' })
        }
        throw err
      }
    }
  }
)
