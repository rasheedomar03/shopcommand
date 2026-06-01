import { createHandler } from './_lib/handler.js'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const VALID_STAGES = [
  'Estimate', 'Approved', 'Waiting Parts', 'In Progress',
  'Complete', 'Invoiced', 'Paid',
]

export default createHandler(
  { methods: ['GET', 'POST', 'PUT'] },
  async ({ req, res, sql, user }) => {
    if (req.method === 'GET') {
      const id = req.query?.id
      const shopId = req.query?.shop_id
      const stage = req.query?.stage
      const customerId = req.query?.customer_id

      // Single RO by ID
      if (id) {
        const [row] = await sql`
          SELECT ro.*,
            c.name AS customer_name, c.email AS customer_email, c.phone AS customer_phone,
            v.year AS vehicle_year, v.make AS vehicle_make, v.model AS vehicle_model,
            v.vin AS vehicle_vin, v.license AS vehicle_license,
            tech.name AS tech_name, adv.name AS advisor_name,
            s.name AS shop_name
          FROM repair_orders ro
          LEFT JOIN customers c ON c.id = ro.customer_id
          LEFT JOIN vehicles v ON v.id = ro.vehicle_id
          LEFT JOIN users tech ON tech.id = ro.tech_id
          LEFT JOIN users adv ON adv.id = ro.advisor_id
          LEFT JOIN shops s ON s.id = ro.shop_id
          WHERE ro.id = ${id}
        `
        if (!row) return res.status(404).json({ error: 'Repair order not found' })
        return res.json(row)
      }

      // List with filters
      const shopFilter = shopId ? sql`AND ro.shop_id = ${shopId}` : sql``
      const stageFilter = stage ? sql`AND ro.stage = ${stage}` : sql``
      const customerFilter = customerId ? sql`AND ro.customer_id = ${customerId}` : sql``

      const rows = await sql`
        SELECT ro.*, c.name AS customer_name,
          v.year AS vehicle_year, v.make AS vehicle_make, v.model AS vehicle_model,
          tech.name AS tech_name, adv.name AS advisor_name,
          s.name AS shop_name
        FROM repair_orders ro
        LEFT JOIN customers c ON c.id = ro.customer_id
        LEFT JOIN vehicles v ON v.id = ro.vehicle_id
        LEFT JOIN users tech ON tech.id = ro.tech_id
        LEFT JOIN users adv ON adv.id = ro.advisor_id
        LEFT JOIN shops s ON s.id = ro.shop_id
        WHERE 1=1 ${shopFilter} ${stageFilter} ${customerFilter}
        ORDER BY ro.created_at DESC
        LIMIT 200
      `
      return res.json(rows)
    }

    if (req.method === 'POST') {
      if (user.role === 'tech') {
        return res.status(403).json({ error: 'Technicians cannot create repair orders' })
      }

      const { shop_id, customer_id, vehicle_id, tech_id, advisor_id, notes } = req.body || {}
      const errors = []

      if (!shop_id || !UUID_RE.test(shop_id)) errors.push('Valid shop_id is required')
      if (!customer_id || !UUID_RE.test(customer_id)) errors.push('Valid customer_id is required')
      if (vehicle_id && !UUID_RE.test(vehicle_id)) errors.push('Invalid vehicle_id format')
      if (tech_id && !UUID_RE.test(tech_id)) errors.push('Invalid tech_id format')
      if (advisor_id && !UUID_RE.test(advisor_id)) errors.push('Invalid advisor_id format')
      if (notes && (typeof notes !== 'string' || notes.length > 5000)) {
        errors.push('Notes must be under 5000 characters')
      }
      if (errors.length) return res.status(400).json({ error: errors.join(', ') })

      // Generate RO number: RO-YYYYMMDD-XXXX
      const today = new Date().toISOString().slice(0, 10).replace(/-/g, '')
      const [seq] = await sql`
        SELECT COUNT(*) AS cnt FROM repair_orders
        WHERE org_id = ${user.orgId}
          AND created_at::date = CURRENT_DATE
      `
      const roNumber = 'RO-' + today + '-' + String(Number(seq.cnt) + 1).padStart(4, '0')

      const [row] = await sql`
        INSERT INTO repair_orders (org_id, shop_id, customer_id, vehicle_id, tech_id, advisor_id, ro_number, notes)
        VALUES (
          ${user.orgId}, ${shop_id}, ${customer_id},
          ${vehicle_id || null}, ${tech_id || null}, ${advisor_id || null},
          ${roNumber}, ${notes?.trim() || null}
        )
        RETURNING *
      `
      return res.status(201).json(row)
    }

    if (req.method === 'PUT') {
      const id = req.query?.id
      if (!id) return res.status(400).json({ error: 'Missing ?id= parameter' })

      const { stage, tech_id, advisor_id, vehicle_id, notes } = req.body || {}
      const errors = []

      if (stage && !VALID_STAGES.includes(stage)) {
        errors.push('Invalid stage. Must be one of: ' + VALID_STAGES.join(', '))
      }
      if (tech_id && !UUID_RE.test(tech_id)) errors.push('Invalid tech_id format')
      if (advisor_id && !UUID_RE.test(advisor_id)) errors.push('Invalid advisor_id format')
      if (vehicle_id && !UUID_RE.test(vehicle_id)) errors.push('Invalid vehicle_id format')
      if (notes !== undefined && notes !== null && typeof notes !== 'string') {
        errors.push('Notes must be a string')
      }
      if (notes && notes.length > 5000) errors.push('Notes must be under 5000 characters')
      if (errors.length) return res.status(400).json({ error: errors.join(', ') })

      // Techs can only update stage to In Progress or Complete
      if (user.role === 'tech' && stage) {
        if (!['In Progress', 'Complete'].includes(stage)) {
          return res.status(403).json({ error: 'Technicians can only move ROs to In Progress or Complete' })
        }
      }

      const [row] = await sql`
        UPDATE repair_orders SET
          stage = COALESCE(${stage || null}, stage),
          tech_id = COALESCE(${tech_id || null}, tech_id),
          advisor_id = COALESCE(${advisor_id || null}, advisor_id),
          vehicle_id = COALESCE(${vehicle_id || null}, vehicle_id),
          notes = COALESCE(${notes?.trim() || null}, notes)
        WHERE id = ${id}
        RETURNING *
      `
      if (!row) return res.status(404).json({ error: 'Repair order not found' })
      return res.json(row)
    }
  }
)
