import { neon } from '@neondatabase/serverless'
import { rateLimit } from './_lib/rate-limit.js'
import { authenticate } from './_lib/auth.js'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export default async function handler(req, res) {
  const action = req.query?.action

  // ── Parts CRUD (authenticated) ──────────────────────────────────────────
  if (action === 'parts' || action === 'add-part' || action === 'update-part' || action === 'delete-part') {
    if (!rateLimit(req, res)) return res.status(429).json({ error: 'Too many requests' })

    const user = await authenticate(req)
    if (!user) return res.status(401).json({ error: 'Unauthorized' })
    if (user.role === 'tech') return res.status(403).json({ error: 'Technicians cannot manage parts inventory' })

    const sql = neon(process.env.DATABASE_URL)

    // GET — list parts
    if (action === 'parts' && req.method === 'GET') {
      const rows = await sql`
        SELECT * FROM parts WHERE org_id = ${user.orgId} ORDER BY name ASC LIMIT 500
      `
      return res.json(rows)
    }

    // POST — add part
    if (action === 'add-part' && req.method === 'POST') {
      const { shop_id, name, sku, category, vendor, qty, min_qty, cost, price } = req.body || {}
      if (!name || typeof name !== 'string' || name.trim().length < 1) {
        return res.status(400).json({ error: 'Part name is required' })
      }
      if (!shop_id || !UUID_RE.test(shop_id)) {
        return res.status(400).json({ error: 'Valid shop_id is required' })
      }

      const [row] = await sql`
        INSERT INTO parts (org_id, shop_id, name, sku, category, vendor, qty, min_qty, cost, price)
        VALUES (
          ${user.orgId}, ${shop_id}, ${name.trim()},
          ${(sku || '').trim()}, ${category || 'Other'}, ${(vendor || '').trim()},
          ${Number(qty) || 0}, ${Number(min_qty) || 2},
          ${Number(cost) || 0}, ${Number(price) || 0}
        )
        RETURNING *
      `
      return res.status(201).json(row)
    }

    // PUT — update part
    if (action === 'update-part' && req.method === 'PUT') {
      const id = req.query?.id
      if (!id || !UUID_RE.test(id)) return res.status(400).json({ error: 'Valid part id is required' })

      const { name, sku, category, vendor, qty, min_qty, cost, price } = req.body || {}

      const [row] = await sql`
        UPDATE parts SET
          name = COALESCE(${name?.trim() || null}, name),
          sku = COALESCE(${sku?.trim() || null}, sku),
          category = COALESCE(${category || null}, category),
          vendor = COALESCE(${vendor?.trim() || null}, vendor),
          qty = COALESCE(${qty != null ? Number(qty) : null}, qty),
          min_qty = COALESCE(${min_qty != null ? Number(min_qty) : null}, min_qty),
          cost = COALESCE(${cost != null ? Number(cost) : null}, cost),
          price = COALESCE(${price != null ? Number(price) : null}, price),
          updated_at = now()
        WHERE id = ${id} AND org_id = ${user.orgId}
        RETURNING *
      `
      if (!row) return res.status(404).json({ error: 'Part not found' })
      return res.json(row)
    }

    // DELETE — delete part
    if (action === 'delete-part' && req.method === 'DELETE') {
      const id = req.query?.id
      if (!id || !UUID_RE.test(id)) return res.status(400).json({ error: 'Valid part id is required' })

      const [row] = await sql`DELETE FROM parts WHERE id = ${id} AND org_id = ${user.orgId} RETURNING id`
      if (!row) return res.status(404).json({ error: 'Part not found' })
      return res.json({ deleted: row.id })
    }

    return res.status(400).json({ error: 'Invalid parts action' })
  }

  // ── Bug report: POST /api/health?action=bug-report ──────────────────────
  if (req.method === 'POST' && req.query?.action === 'bug-report') {
    if (!rateLimit(req, res, 'strict')) {
      return res.status(429).json({ error: 'Too many reports. Try again later.' })
    }

    const { description, page, url, userAgent, screenWidth, screenHeight } = req.body || {}

    if (!description || typeof description !== 'string' || description.trim().length < 5) {
      return res.status(400).json({ error: 'Description is required (minimum 5 characters)' })
    }
    if (description.length > 2000) {
      return res.status(400).json({ error: 'Description too long (max 2000 characters)' })
    }

    try {
      const sql = neon(process.env.DATABASE_URL)

      await sql`
        CREATE TABLE IF NOT EXISTS bug_reports (
          id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
          description TEXT NOT NULL,
          page TEXT,
          url TEXT,
          user_agent TEXT,
          screen_width INTEGER,
          screen_height INTEGER,
          reporter_ip TEXT,
          status TEXT DEFAULT 'new',
          created_at TIMESTAMPTZ DEFAULT NOW()
        )
      `

      const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || 'unknown'

      await sql`
        INSERT INTO bug_reports (description, page, url, user_agent, screen_width, screen_height, reporter_ip)
        VALUES (${description.trim()}, ${page || null}, ${url || null}, ${userAgent || null}, ${screenWidth || null}, ${screenHeight || null}, ${ip})
      `

      // Discord notification — must await or Vercel kills the function before it sends
      const webhookUrl = process.env.DISCORD_BUG_WEBHOOK_URL
      if (webhookUrl) {
        const embed = {
          title: '🐛 New Bug Report',
          color: 0xF97316,
          fields: [
            { name: 'Description', value: description.trim().slice(0, 1024) },
            { name: 'Page', value: page || 'Unknown', inline: true },
            { name: 'Screen', value: screenWidth ? `${screenWidth}×${screenHeight}` : 'Unknown', inline: true },
            { name: 'IP', value: ip, inline: true },
          ],
          timestamp: new Date().toISOString(),
          footer: { text: 'ShopCommand Bug Reports' },
        }
        try {
          await fetch(webhookUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ embeds: [embed] }),
          })
        } catch (_) { /* Discord down — don't fail the user */ }
      }

      return res.status(201).json({ success: true, message: 'Bug report received' })
    } catch (err) {
      console.error('Bug report error:', err)
      return res.status(500).json({ error: 'Failed to save report' })
    }
  }

  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET, POST, PUT, DELETE')
    return res.status(405).json({ error: 'Method not allowed' })
  }

  if (!rateLimit(req, res)) {
    return res.status(429).json({ error: 'Too many requests' })
  }

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
