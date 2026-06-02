import { neon } from '@neondatabase/serverless'
import { rateLimit } from './_lib/rate-limit.js'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET')
    return res.status(405).json({ error: 'Method not allowed' })
  }

  if (!rateLimit(req, res)) {
    return res.status(429).json({ error: 'Too many requests' })
  }

  const action = req.query?.action

  // ── Public RO status lookup: GET /api/health?action=status&roId=xxx ─────
  if (action === 'status') {
    const roId = req.query?.roId
    if (!roId || !UUID_RE.test(roId)) {
      return res.status(400).json({ error: 'Valid roId is required' })
    }

    const sql = neon(process.env.DATABASE_URL)

    const [ro] = await sql`
      SELECT ro.id, ro.ro_number, ro.stage, ro.total, ro.created_at, ro.updated_at,
        c.name AS customer_name,
        v.year AS vehicle_year, v.make AS vehicle_make, v.model AS vehicle_model,
        s.name AS shop_name, s.address AS shop_address, s.phone AS shop_phone
      FROM repair_orders ro
      LEFT JOIN customers c ON c.id = ro.customer_id
      LEFT JOIN vehicles v ON v.id = ro.vehicle_id
      LEFT JOIN shops s ON s.id = ro.shop_id
      WHERE ro.id = ${roId}
    `

    if (!ro) {
      return res.status(404).json({ error: 'Repair order not found' })
    }

    // Only return safe public-facing fields
    return res.json({
      id: ro.id,
      roNumber: ro.ro_number,
      stage: ro.stage,
      total: Number(ro.total),
      customerName: ro.customer_name,
      vehicle: [ro.vehicle_year, ro.vehicle_make, ro.vehicle_model].filter(Boolean).join(' '),
      shopName: ro.shop_name,
      shopAddress: ro.shop_address,
      shopPhone: ro.shop_phone,
      createdAt: ro.created_at,
      updatedAt: ro.updated_at,
    })
  }

  // ── Default health check ────────────────────────────────────────────────
  return res.json({ status: 'ok', timestamp: new Date().toISOString() })
}
