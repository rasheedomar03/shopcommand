import { neon } from '@neondatabase/serverless'
import { rateLimit } from './_lib/rate-limit.js'

export default async function handler(req, res) {
  // Only POST
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ error: 'Method not allowed' })
  }

  // Rate limit — stricter to prevent spam (5 reports per minute per IP)
  if (!rateLimit(req, res, 'strict')) {
    return res.status(429).json({ error: 'Too many reports. Try again later.' })
  }

  try {
    const { description, page, url, userAgent, screenWidth, screenHeight, timestamp } = req.body || {}

    // Validate
    if (!description || typeof description !== 'string' || description.trim().length < 5) {
      return res.status(400).json({ error: 'Description is required (minimum 5 characters)' })
    }

    if (description.length > 2000) {
      return res.status(400).json({ error: 'Description too long (max 2000 characters)' })
    }

    const sql = neon(process.env.DATABASE_URL)

    // Create table if it doesn't exist (idempotent)
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

    // Insert the report
    const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || 'unknown'

    await sql`
      INSERT INTO bug_reports (description, page, url, user_agent, screen_width, screen_height, reporter_ip)
      VALUES (
        ${description.trim()},
        ${page || null},
        ${url || null},
        ${userAgent || null},
        ${screenWidth || null},
        ${screenHeight || null},
        ${ip}
      )
    `

    // Notify via Discord webhook (non-blocking — don't fail the response if Discord is down)
    const webhookUrl = process.env.DISCORD_BUG_WEBHOOK_URL
    if (webhookUrl) {
      const embed = {
        title: '🐛 New Bug Report',
        color: 0xF97316, // orange
        fields: [
          { name: 'Description', value: description.trim().slice(0, 1024) },
          { name: 'Page', value: page || 'Unknown', inline: true },
          { name: 'Screen', value: screenWidth ? `${screenWidth}×${screenHeight}` : 'Unknown', inline: true },
          { name: 'IP', value: ip, inline: true },
        ],
        timestamp: new Date().toISOString(),
        footer: { text: 'ShopCommand Bug Reports' },
      }

      fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ embeds: [embed] }),
      }).catch(() => {}) // silently ignore Discord failures
    }

    return res.status(201).json({ success: true, message: 'Bug report received' })
  } catch (err) {
    console.error('Bug report error:', err)
    return res.status(500).json({ error: 'Failed to save report' })
  }
}
