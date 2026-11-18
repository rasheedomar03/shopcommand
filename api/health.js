import { neon } from '@neondatabase/serverless'
import { rateLimit } from './_lib/rate-limit.js'
import { authenticate } from './_lib/auth.js'
import { estimateTotals, approvalState, tokenMatches, isTokenFormat, cleanName } from './_lib/approval.js'
import { shopResponseEmail } from './_lib/approval-email.js'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

// Repair order + shop/vehicle details for the public customer approval link.
async function loadApprovalRO(sql, roId) {
  const [ro] = await sql`
    SELECT ro.id, ro.org_id, ro.stage, ro.data, ro.ro_number, ro.advisor_id,
      c.name AS customer_name, c.phone AS customer_phone,
      v.year AS vehicle_year, v.make AS vehicle_make, v.model AS vehicle_model,
      s.name AS shop_name, s.address AS shop_address, s.phone AS shop_phone
    FROM repair_orders ro
    LEFT JOIN customers c ON c.id = ro.customer_id
    LEFT JOIN vehicles v ON v.id = ro.vehicle_id
    LEFT JOIN shops s ON s.id = ro.shop_id
    WHERE ro.id = ${roId}
  `
  return ro || null
}

export default async function handler(req, res) {
  const action = req.query?.action

  // ── Parts CRUD (authenticated) ──────────────────────────────────────────
  if (action === 'parts' || action === 'add-part' || action === 'update-part' || action === 'delete-part') {
    if (!rateLimit(req, res)) return res.status(429).json({ error: 'Too many requests' })

    const user = await authenticate(req)
    if (!user) return res.status(401).json({ error: 'Unauthorized' })
    if (user.role === 'tech') return res.status(403).json({ error: 'Technicians cannot manage parts inventory' })
    if (req.method !== 'GET' && user.plan !== 'founding' && user.trialEndsAt && new Date(user.trialEndsAt).getTime() < Date.now()) {
      return res.status(402).json({ error: 'Your free trial has ended. Start your plan in Settings to keep working.', code: 'subscription_required' })
    }

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

      // Default minimum is 2, but an explicit 0 must stay 0.
      const minQty = (min_qty == null || min_qty === '' || Number.isNaN(Number(min_qty)))
        ? 2
        : Math.max(0, Number(min_qty))

      const [row] = await sql`
        INSERT INTO parts (org_id, shop_id, name, sku, category, vendor, qty, min_qty, cost, price)
        VALUES (
          ${user.orgId}, ${shop_id}, ${name.trim()},
          ${(sku || '').trim()}, ${category || 'Other'}, ${(vendor || '').trim()},
          ${Number(qty) || 0}, ${minQty},
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

      const { name, sku, category, vendor, qty, min_qty, cost, price, last_ordered } = req.body || {}

      const [row] = await sql`
        UPDATE parts SET
          name = COALESCE(${name?.trim() || null}, name),
          sku = COALESCE(${typeof sku === 'string' ? sku.trim() : null}, sku),
          category = COALESCE(${category || null}, category),
          vendor = COALESCE(${typeof vendor === 'string' ? vendor.trim() : null}, vendor),
          qty = COALESCE(${qty != null ? Number(qty) : null}, qty),
          min_qty = COALESCE(${min_qty != null ? Number(min_qty) : null}, min_qty),
          cost = COALESCE(${cost != null ? Number(cost) : null}, cost),
          price = COALESCE(${price != null ? Number(price) : null}, price),
          last_ordered = COALESCE(${last_ordered || null}, last_ordered),
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

  // ── Parts orders CRUD (authenticated) ───────────────────────────────────
  if (action === 'parts-orders' || action === 'add-parts-order' || action === 'update-parts-order' || action === 'delete-parts-order') {
    if (!rateLimit(req, res)) return res.status(429).json({ error: 'Too many requests' })

    const user = await authenticate(req)
    if (!user) return res.status(401).json({ error: 'Unauthorized' })

    const sql = neon(process.env.DATABASE_URL)

    await sql`
      CREATE TABLE IF NOT EXISTS parts_orders (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        org_id UUID NOT NULL,
        shop_id UUID,
        name TEXT NOT NULL,
        part_number TEXT,
        qty INTEGER DEFAULT 1,
        status TEXT DEFAULT 'ordered',
        supplier TEXT,
        eta TEXT,
        carrier TEXT,
        tracking_number TEXT,
        requested_by TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `

    const VALID_STATUSES = ['ordered', 'shipped', 'arrived', 'returned', 'credited']

    // GET — list parts orders
    if (action === 'parts-orders' && req.method === 'GET') {
      const rows = await sql`
        SELECT * FROM parts_orders WHERE org_id = ${user.orgId} ORDER BY created_at DESC LIMIT 200
      `
      return res.json(rows)
    }

    // POST — add parts order
    if (action === 'add-parts-order' && req.method === 'POST') {
      const { shop_id, name, part_number, qty, status, supplier, eta, carrier, tracking_number, requested_by } = req.body || {}

      if (!name || typeof name !== 'string' || name.trim().length < 1 || name.trim().length > 200) {
        return res.status(400).json({ error: 'Name must be 1-200 characters' })
      }
      const qtyNum = qty != null ? Number(qty) : 1
      if (!Number.isInteger(qtyNum) || qtyNum < 1 || qtyNum > 9999) {
        return res.status(400).json({ error: 'Qty must be an integer between 1 and 9999' })
      }
      if (shop_id && !UUID_RE.test(shop_id)) {
        return res.status(400).json({ error: 'shop_id must be a valid UUID' })
      }
      if (status && !VALID_STATUSES.includes(status)) {
        return res.status(400).json({ error: `Status must be one of: ${VALID_STATUSES.join(', ')}` })
      }

      const [row] = await sql`
        INSERT INTO parts_orders (org_id, shop_id, name, part_number, qty, status, supplier, eta, carrier, tracking_number, requested_by)
        VALUES (
          ${user.orgId}, ${shop_id || null}, ${name.trim()},
          ${(part_number || '').trim() || null}, ${qtyNum}, ${status || 'ordered'},
          ${(supplier || '').trim() || null}, ${(eta || '').trim() || null},
          ${(carrier || '').trim() || null}, ${(tracking_number || '').trim() || null},
          ${(requested_by || '').trim() || null}
        )
        RETURNING *
      `
      return res.status(201).json(row)
    }

    // PUT — update parts order
    if (action === 'update-parts-order' && req.method === 'PUT') {
      const id = req.query?.id
      if (!id || !UUID_RE.test(id)) return res.status(400).json({ error: 'Valid parts order id is required' })

      const { status, supplier, eta, carrier, tracking_number, qty } = req.body || {}

      if (status != null && !VALID_STATUSES.includes(status)) {
        return res.status(400).json({ error: `Status must be one of: ${VALID_STATUSES.join(', ')}` })
      }
      if (qty != null && (!Number.isInteger(Number(qty)) || Number(qty) < 1 || Number(qty) > 9999)) {
        return res.status(400).json({ error: 'Qty must be an integer between 1 and 9999' })
      }

      const [row] = await sql`
        UPDATE parts_orders SET
          status = COALESCE(${status || null}, status),
          supplier = COALESCE(${supplier?.trim() || null}, supplier),
          eta = COALESCE(${eta?.trim() || null}, eta),
          carrier = COALESCE(${carrier?.trim() || null}, carrier),
          tracking_number = COALESCE(${tracking_number?.trim() || null}, tracking_number),
          qty = COALESCE(${qty != null ? Number(qty) : null}, qty)
        WHERE id = ${id} AND org_id = ${user.orgId}
        RETURNING *
      `
      if (!row) return res.status(404).json({ error: 'Parts order not found' })
      return res.json(row)
    }

    // DELETE — delete parts order
    if (action === 'delete-parts-order' && req.method === 'DELETE') {
      const id = req.query?.id
      if (!id || !UUID_RE.test(id)) return res.status(400).json({ error: 'Valid parts order id is required' })

      const [row] = await sql`DELETE FROM parts_orders WHERE id = ${id} AND org_id = ${user.orgId} RETURNING id`
      if (!row) return res.status(404).json({ error: 'Parts order not found' })
      return res.json({ deleted: row.id })
    }

    return res.status(400).json({ error: 'Invalid parts orders action' })
  }

  // ── Bug report: POST /api/health?action=bug-report ──────────────────────
  if (req.method === 'POST' && req.query?.action === 'bug-report') {
    if (!rateLimit(req, res, 'strict')) {
      return res.status(429).json({ error: 'Too many reports. Try again later.' })
    }

    const { description, email, reporterName, page, url, userAgent, screenWidth, screenHeight } = req.body || {}

    if (!description || typeof description !== 'string' || description.trim().length < 5) {
      return res.status(400).json({ error: 'Description is required (minimum 5 characters)' })
    }
    if (description.length > 2000) {
      return res.status(400).json({ error: 'Description too long (max 2000 characters)' })
    }
    const reporterEmail = (typeof email === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()) && email.length <= 200)
      ? email.trim().toLowerCase()
      : null
    const safeName = (typeof reporterName === 'string' && reporterName.trim())
      ? reporterName.trim().slice(0, 100)
      : null

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

      await sql`ALTER TABLE bug_reports ADD COLUMN IF NOT EXISTS reporter_email TEXT`
      await sql`ALTER TABLE bug_reports ADD COLUMN IF NOT EXISTS reporter_name TEXT`

      const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || 'unknown'

      await sql`
        INSERT INTO bug_reports (description, page, url, user_agent, screen_width, screen_height, reporter_ip, reporter_email, reporter_name)
        VALUES (${description.trim()}, ${page || null}, ${url || null}, ${userAgent || null}, ${screenWidth || null}, ${screenHeight || null}, ${ip}, ${reporterEmail}, ${safeName})
      `

      // Discord notification — must await or Vercel kills the function before it sends
      const webhookUrl = process.env.DISCORD_BUG_WEBHOOK_URL
      if (webhookUrl) {
        const embed = {
          title: '🐛 New Bug Report',
          color: 0xF97316,
          fields: [
            { name: 'Description', value: description.trim().slice(0, 1024) },
            { name: 'Contact', value: reporterEmail ? (safeName ? `${safeName} <${reporterEmail}>` : reporterEmail) : 'Not provided', inline: true },
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

  // ── Customer estimate response: POST /api/health?action=approval-respond ─
  // Public, token-protected. The org/shop come from the database row, never
  // from the request, and only the approval fields are ever written.
  if (req.method === 'POST' && req.query?.action === 'approval-respond') {
    if (!rateLimit(req, res, 'approval')) {
      return res.status(429).json({ error: 'Too many requests. Try again in a minute.' })
    }

    const { roId, token, decision, name, total } = req.body || {}
    if (!roId || !UUID_RE.test(roId) || !isTokenFormat(token) || !['approve', 'decline'].includes(decision)) {
      return res.status(400).json({ error: 'Invalid request' })
    }

    try {
      const sql = neon(process.env.DATABASE_URL)
      const ro = await loadApprovalRO(sql, roId)
      if (!ro || !tokenMatches(token, ro.data?.approval)) {
        return res.status(404).json({ error: 'This link is not valid' })
      }

      const state = approvalState(ro)
      if (state !== 'pending') {
        return res.status(409).json({ error: 'This estimate can no longer be changed from this link', code: state })
      }

      const totals = estimateTotals(ro.data)
      const signer = cleanName(name)
      const nowIso = new Date().toISOString()

      if (decision === 'approve') {
        if (signer.length < 2) {
          return res.status(400).json({ error: 'Please type your full name to approve' })
        }
        // The customer must approve the exact total they were shown. If the
        // shop edited the estimate after sending it, make them look again.
        if (!Number.isFinite(Number(total)) || Math.abs(Number(total) - totals.total) > 0.005) {
          return res.status(409).json({
            error: 'This estimate was updated. Please review the new total.',
            code: 'estimate_changed',
          })
        }
        const [updated] = await sql`
          UPDATE repair_orders
          SET stage = 'Approved',
              data = COALESCE(data, '{}'::jsonb) || ${JSON.stringify({
                authorized: true,
                authorizedAt: nowIso,
                authorizedVia: 'customer link',
                approvedBy: signer,
                approvedTotal: totals.total,
              })}::jsonb,
              updated_at = now()
          WHERE id = ${ro.id} AND stage = 'Estimate'
          RETURNING id
        `
        if (!updated) return res.status(409).json({ error: 'This estimate can no longer be changed from this link', code: 'closed' })
      } else {
        const approval = { ...(ro.data?.approval || {}), declinedAt: nowIso, declinedBy: signer || null }
        const [updated] = await sql`
          UPDATE repair_orders
          SET data = COALESCE(data, '{}'::jsonb) || ${JSON.stringify({ approval })}::jsonb,
              updated_at = now()
          WHERE id = ${ro.id} AND stage = 'Estimate'
          RETURNING id
        `
        if (!updated) return res.status(409).json({ error: 'This estimate can no longer be changed from this link', code: 'closed' })
      }

      // Tell the shop (owner + the RO's advisor). Never fails the customer.
      // Must be awaited or Vercel ends the function before it sends.
      const resendKey = process.env.RESEND_API_KEY
      if (resendKey) {
        try {
          const rows = await sql`
            SELECT DISTINCT email FROM users
            WHERE org_id = ${ro.org_id} AND email IS NOT NULL
              AND (role = 'owner' OR id = ${ro.advisor_id})
          `
          const to = rows.map(r => r.email).filter(Boolean)
          if (to.length) {
            const notice = shopResponseEmail({
              decision,
              signer,
              customerName: ro.customer_name,
              customerPhone: ro.customer_phone,
              shopName: ro.shop_name,
              vehicle: [ro.vehicle_year, ro.vehicle_make, ro.vehicle_model].filter(Boolean).join(' '),
              roNumber: ro.ro_number,
              total: totals.total,
              roId: ro.id,
            })
            await fetch('https://api.resend.com/emails', {
              method: 'POST',
              headers: { Authorization: `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
              body: JSON.stringify({
                from: 'ShopCommand <notifications@shopcommand.net>',
                to,
                subject: notice.subject,
                text: notice.text,
              }),
            })
          }
        } catch { /* the response is already saved; the email is a courtesy */ }
      }

      return res.json({ ok: true, state: decision === 'approve' ? 'approved' : 'declined' })
    } catch (err) {
      console.error('Approval respond error:', err)
      return res.status(500).json({ error: 'Something went wrong. Please call the shop.' })
    }
  }

  // ── Founding program application: POST /api/health?action=founding-signup ─
  // Stores the lead in Neon and pings Discord. (This endpoint didn't exist
  // for months — the form returned a generic 200 and applications were lost.)
  if (req.method === 'POST' && req.query?.action === 'founding-signup') {
    if (!rateLimit(req, res, 'strict')) {
      return res.status(429).json({ error: 'Too many submissions. Try again later.' })
    }

    const { name, email, locations, pain, page } = req.body || {}

    if (!name || typeof name !== 'string' || name.trim().length < 2 || name.length > 100) {
      return res.status(400).json({ error: 'Name is required' })
    }
    if (!email || typeof email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 200) {
      return res.status(400).json({ error: 'A valid email is required' })
    }

    try {
      const sql = neon(process.env.DATABASE_URL)

      await sql`
        CREATE TABLE IF NOT EXISTS founding_applications (
          id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
          name TEXT NOT NULL,
          email TEXT NOT NULL,
          locations TEXT,
          pain TEXT,
          page TEXT,
          applicant_ip TEXT,
          status TEXT DEFAULT 'new',
          created_at TIMESTAMPTZ DEFAULT NOW()
        )
      `

      const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || 'unknown'

      await sql`
        INSERT INTO founding_applications (name, email, locations, pain, page, applicant_ip)
        VALUES (${name.trim()}, ${email.trim().toLowerCase()}, ${String(locations || '').slice(0, 100) || null}, ${String(pain || '').slice(0, 2000) || null}, ${String(page || '').slice(0, 100) || null}, ${ip})
      `

      // Discord notification — must await or Vercel kills the function before it sends
      const webhookUrl = process.env.DISCORD_BUG_WEBHOOK_URL
      if (webhookUrl) {
        const embed = {
          title: '🏁 New Founding Program Application',
          color: 0x22C55E,
          fields: [
            { name: 'Name', value: name.trim().slice(0, 256), inline: true },
            { name: 'Email', value: email.trim().slice(0, 256), inline: true },
            { name: 'Locations', value: String(locations || 'Not specified').slice(0, 256), inline: true },
            // Only the /founding-program form asks about pain points; the
            // landing form doesn't, so omit the field instead of "Not specified"
            ...(pain ? [{ name: 'Biggest pain point', value: String(pain).slice(0, 1024) }] : []),
            { name: 'From page', value: String(page || 'unknown'), inline: true },
          ],
          timestamp: new Date().toISOString(),
          footer: { text: 'ShopCommand Founding Applications' },
        }
        try {
          await fetch(webhookUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ embeds: [embed] }),
          })
        } catch (_) { /* Discord down — the DB row is the source of truth */ }
      }

      // Welcome email via Resend, scheduled 5 minutes out so it reads like a
      // person noticed the application rather than a bot auto-reply. Skipped
      // silently when RESEND_API_KEY isn't configured; a send failure never
      // fails the signup (the DB row + Discord ping are the source of truth).
      const resendKey = process.env.RESEND_API_KEY
      if (resendKey) {
        const firstName = name.trim().split(/\s+/)[0]
        const safeFirst = firstName.replace(/[<>&"']/g, '')
        try {
          const emailRes = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${resendKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              from: 'Rasheed at ShopCommand <hello@shopcommand.net>',
              to: [email.trim().toLowerCase()],
              reply_to: 'rasheed@shopcommand.net',
              subject: 'Your ShopCommand founding application',
              scheduled_at: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
              text: [
                `Hey ${safeFirst},`,
                '',
                'Thanks for applying to the ShopCommand founding program. I saw your application come in and wanted to reach out personally.',
                '',
                "Here's what happens next: I'll email you within 24 hours to set up a quick call, get your shop loaded in, and walk you through the dashboard. No credit card needed until you've seen it working with your own numbers.",
                '',
                'As a founding member your rate is $100/month for your first shop and $50/month for each additional location, locked in for life. It never goes up, even after public pricing moves to $175.',
                '',
                'If you want to skip the wait, just reply to this email and tell me a good time to talk. Replies come straight to me.',
                '',
                'Rasheed',
                'Founder, ShopCommand',
                'shopcommand.net',
              ].join('\n'),
            }),
          })
          if (!emailRes.ok) {
            console.error('Welcome email failed:', emailRes.status, await emailRes.text().catch(() => ''))
          }
        } catch (err) {
          console.error('Welcome email error:', err)
        }
      }

      return res.status(201).json({ success: true, message: 'Application received' })
    } catch (err) {
      console.error('Founding signup error:', err)
      return res.status(500).json({ error: 'Failed to save application' })
    }
  }

  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET, POST, PUT, DELETE')
    return res.status(405).json({ error: 'Method not allowed' })
  }

  if (!rateLimit(req, res)) {
    return res.status(429).json({ error: 'Too many requests' })
  }

  // ── Customer estimate view: GET /api/health?action=approval&roId=&token= ─
  // Public, token-protected. Returns only what the customer needs to decide:
  // no customer phone/email/address, nothing from other records.
  if (action === 'approval') {
    if (!rateLimit(req, res, 'approval')) {
      return res.status(429).json({ error: 'Too many requests. Try again in a minute.' })
    }
    const roId = req.query?.roId
    const token = req.query?.token
    if (!roId || !UUID_RE.test(roId) || !isTokenFormat(token)) {
      return res.status(404).json({ error: 'This link is not valid' })
    }

    const sql = neon(process.env.DATABASE_URL)
    const ro = await loadApprovalRO(sql, roId)
    if (!ro || !tokenMatches(token, ro.data?.approval)) {
      return res.status(404).json({ error: 'This link is not valid' })
    }

    const state = approvalState(ro)
    const data = ro.data || {}
    const base = {
      state,
      roNumber: ro.ro_number,
      customerName: ro.customer_name,
      vehicle: [ro.vehicle_year, ro.vehicle_make, ro.vehicle_model].filter(Boolean).join(' '),
      shopName: ro.shop_name,
      shopAddress: ro.shop_address,
      shopPhone: ro.shop_phone,
    }
    if (state === 'expired' || state === 'closed') return res.json(base)

    return res.json({
      ...base,
      ...estimateTotals(data),
      approvedAt: state === 'approved' ? (data.authorizedAt || null) : null,
      approvedBy: state === 'approved' ? (data.approvedBy || null) : null,
      declinedAt: state === 'declined' ? (data.approval?.declinedAt || null) : null,
    })
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
