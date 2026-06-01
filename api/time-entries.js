import { createHandler } from './_lib/handler.js'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export default createHandler(
  { methods: ['GET', 'POST', 'PUT'] },
  async ({ req, res, sql, user }) => {
    if (req.method === 'GET') {
      const techId = req.query?.tech_id
      const date = req.query?.date

      if (user.role !== 'owner' && !techId) {
        return res.status(400).json({ error: 'tech_id is required for non-owners' })
      }

      if (techId && !UUID_RE.test(techId)) {
        return res.status(400).json({ error: 'Invalid tech_id format' })
      }

      const techFilter = techId ? sql`AND te.tech_id = ${techId}` : sql``
      const dateFilter = date ? sql`AND te.clock_in::date = ${date}::date` : sql``

      const rows = await sql`
        SELECT te.*, u.name AS tech_name
        FROM time_entries te
        LEFT JOIN users u ON u.id = te.tech_id
        WHERE 1=1 ${techFilter} ${dateFilter}
        ORDER BY te.clock_in DESC
        LIMIT 200
      `
      return res.json(rows)
    }

    if (req.method === 'POST') {
      const { tech_id, ro_id } = req.body || {}

      if (!tech_id || !UUID_RE.test(tech_id)) {
        return res.status(400).json({ error: 'Valid tech_id is required' })
      }
      if (ro_id && !UUID_RE.test(ro_id)) {
        return res.status(400).json({ error: 'Invalid ro_id format' })
      }

      const openEntry = await sql`
        SELECT id FROM time_entries WHERE tech_id = ${tech_id} AND clock_out IS NULL
      `
      if (openEntry.length) {
        return res.status(409).json({ error: 'Technician already clocked in' })
      }

      const [row] = await sql`
        INSERT INTO time_entries (org_id, tech_id, ro_id, clock_in)
        VALUES (${user.orgId}, ${tech_id}, ${ro_id || null}, now())
        RETURNING *
      `
      return res.status(201).json(row)
    }

    if (req.method === 'PUT') {
      const id = req.query?.id
      if (!id) return res.status(400).json({ error: 'Missing ?id= parameter' })

      const [entry] = await sql`SELECT * FROM time_entries WHERE id = ${id}`
      if (!entry) return res.status(404).json({ error: 'Time entry not found' })
      if (entry.clock_out) return res.status(409).json({ error: 'Already clocked out' })

      if (user.role !== 'owner' && entry.tech_id !== user.userId) {
        return res.status(403).json({ error: 'Can only clock out yourself' })
      }

      const [row] = await sql`
        UPDATE time_entries SET clock_out = now()
        WHERE id = ${id} AND clock_out IS NULL
        RETURNING *
      `
      return res.json(row)
    }
  }
)
