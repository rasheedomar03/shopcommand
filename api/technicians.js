import { createHandler } from './_lib/handler.js'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export default createHandler(
  { methods: ['GET', 'POST', 'PUT', 'DELETE'] },
  async ({ req, res, sql, user }) => {
    if (req.method === 'GET') {
      const rows = await sql`
        SELECT u.id, u.clerk_id, u.name, u.email, u.role, u.shop_id, u.created_at,
          s.name AS shop_name,
          (SELECT COUNT(*) FROM repair_orders ro
           WHERE ro.tech_id = u.id
             AND ro.stage NOT IN ('Complete', 'Invoiced', 'Paid')
          ) AS active_ros,
          (SELECT COUNT(*) FROM time_entries te
           WHERE te.tech_id = u.id
             AND te.clock_in::date = CURRENT_DATE
          ) AS entries_today,
          (SELECT MAX(te.clock_in) FROM time_entries te
           WHERE te.tech_id = u.id AND te.clock_out IS NULL
          ) AS clocked_in_since,
          'General'::text AS specialty,
          'Technician'::text AS level,
          '[]'::jsonb AS certifications,
          COALESCE(ROUND(
            (SELECT COALESCE(SUM(li.qty), 0) FROM line_items li
             JOIN repair_orders ro2 ON ro2.id = li.ro_id
             WHERE li.org_id = ${user.orgId} AND li.type = 'labor'
               AND ro2.tech_id = u.id AND ro2.org_id = ${user.orgId}
               AND ro2.stage IN ('Complete', 'Invoiced', 'Paid')
               AND ro2.updated_at >= CURRENT_DATE - INTERVAL '30 days'
            ) / NULLIF((
              SELECT SUM(EXTRACT(EPOCH FROM (te2.clock_out - te2.clock_in)) / 3600.0)
              FROM time_entries te2
              WHERE te2.tech_id = u.id AND te2.org_id = ${user.orgId}
                AND te2.clock_out IS NOT NULL
                AND te2.clock_in >= CURRENT_DATE - INTERVAL '30 days'
            ), 0) * 100
          ), 0)::int AS efficiency
        FROM users u
        LEFT JOIN shops s ON s.id = u.shop_id
        WHERE u.org_id = ${user.orgId} AND u.role = 'tech'
        ORDER BY u.name ASC
      `
      return res.json(rows)
    }

    if (req.method === 'POST') {
      if (user.role !== 'owner') return res.status(403).json({ error: 'Only owners can add technicians' })

      const { name, email, shop_id } = req.body || {}
      const errors = []
      if (!name || typeof name !== 'string' || name.trim().length < 2 || name.trim().length > 100) {
        errors.push('Name must be 2-100 characters')
      }
      if (!email || typeof email !== 'string' || !EMAIL_RE.test(email)) {
        errors.push('Valid email is required')
      }
      if (!shop_id || !UUID_RE.test(shop_id)) {
        errors.push('Valid shop_id is required')
      }
      if (errors.length) return res.status(400).json({ error: errors.join(', ') })

      const existing = await sql`SELECT id FROM users WHERE email = ${email.trim()}`
      if (existing.length) return res.status(409).json({ error: 'A user with this email already exists' })

      const [row] = await sql`
        INSERT INTO users (clerk_id, org_id, shop_id, role, name, email)
        VALUES (${'pending_' + crypto.randomUUID().slice(0, 8)}, ${user.orgId}, ${shop_id}, 'tech', ${name.trim()}, ${email.trim()})
        RETURNING id, name, email, role, shop_id, created_at
      `
      return res.status(201).json(row)
    }

    if (req.method === 'PUT') {
      if (user.role !== 'owner') return res.status(403).json({ error: 'Only owners can update technicians' })

      const id = req.query?.id
      if (!id) return res.status(400).json({ error: 'Missing ?id= parameter' })

      const { name, email, shop_id, role } = req.body || {}
      const errors = []
      if ('name' in (req.body || {}) && (!name || typeof name !== 'string' || name.trim().length < 2)) {
        errors.push('Name must be at least 2 characters')
      }
      if ('email' in (req.body || {}) && (!email || !EMAIL_RE.test(email))) {
        errors.push('Valid email required')
      }
      if ('shop_id' in (req.body || {}) && shop_id && !UUID_RE.test(shop_id)) {
        errors.push('Valid shop_id required')
      }
      if ('role' in (req.body || {}) && !['owner', 'advisor', 'tech'].includes(role)) {
        errors.push('Role must be owner, advisor, or tech')
      }
      if (errors.length) return res.status(400).json({ error: errors.join(', ') })

      const [row] = await sql`
        UPDATE users SET
          name = COALESCE(${name?.trim() || null}, name),
          email = COALESCE(${email?.trim() || null}, email),
          shop_id = COALESCE(${shop_id || null}, shop_id),
          role = COALESCE(${role || null}, role)
        WHERE id = ${id} AND org_id = ${user.orgId} AND role = 'tech'
        RETURNING id, name, email, role, shop_id
      `
      if (!row) return res.status(404).json({ error: 'Technician not found' })
      return res.json(row)
    }

    if (req.method === 'DELETE') {
      if (user.role !== 'owner') return res.status(403).json({ error: 'Only owners can remove technicians' })

      const id = req.query?.id
      if (!id) return res.status(400).json({ error: 'Missing ?id= parameter' })

      const [row] = await sql`DELETE FROM users WHERE id = ${id} AND org_id = ${user.orgId} AND role = 'tech' RETURNING id`
      if (!row) return res.status(404).json({ error: 'Technician not found' })
      return res.json({ deleted: row.id })
    }
  }
)
