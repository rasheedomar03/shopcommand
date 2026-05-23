/**
 * Post-build prerender script
 *
 * Spins up a static server on the Vite build output, visits each public route
 * with Puppeteer, and writes the fully-rendered HTML so crawlers that don't
 * execute JavaScript still see real content + meta tags.
 *
 * Usage:  node scripts/prerender.mjs
 * Runs automatically as part of `npm run build`.
 */

import { createServer } from 'http'
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs'
import { join, extname } from 'path'
import { fileURLToPath } from 'url'
import puppeteer from 'puppeteer'

const __dirname = fileURLToPath(new URL('.', import.meta.url))
const DIST = join(__dirname, '..', 'dist')
const PORT = 4173

// ── Routes to prerender ─────────────────────────────────────────────────────
// Only public, crawlable pages. Auth-gated app routes are excluded.
const ROUTES = [
  '/',
  '/compare/tekmetric',
  '/compare/shopmonkey',
  '/compare/mitchell1',
  '/compare/shop-ware',
  '/compare/ro-writer',
  '/terms',
  '/privacy',
  '/dpa',
]

// ── Tiny static file server ─────────────────────────────────────────────────
const MIME = {
  '.html': 'text/html',
  '.js':   'application/javascript',
  '.css':  'text/css',
  '.json': 'application/json',
  '.svg':  'image/svg+xml',
  '.png':  'image/png',
  '.ico':  'image/x-icon',
  '.woff': 'font/woff',
  '.woff2':'font/woff2',
}

function serve() {
  return new Promise((resolve) => {
    const server = createServer((req, res) => {
      let filePath = join(DIST, req.url === '/' ? 'index.html' : req.url)

      // SPA fallback — if the file doesn't exist, serve index.html
      if (!existsSync(filePath) || !extname(filePath)) {
        filePath = join(DIST, 'index.html')
      }

      try {
        const data = readFileSync(filePath)
        const ext = extname(filePath)
        res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' })
        res.end(data)
      } catch {
        // Final fallback
        const html = readFileSync(join(DIST, 'index.html'))
        res.writeHead(200, { 'Content-Type': 'text/html' })
        res.end(html)
      }
    })

    server.listen(PORT, () => {
      console.log(`  Static server on http://localhost:${PORT}`)
      resolve(server)
    })
  })
}

// ── Prerender each route ────────────────────────────────────────────────────
async function prerender() {
  console.log('\n⚡ Prerendering public routes...\n')

  const server = await serve()
  const browser = await puppeteer.launch({ headless: true })

  for (const route of ROUTES) {
    const page = await browser.newPage()
    const url = `http://localhost:${PORT}${route}`

    await page.goto(url, { waitUntil: 'networkidle0', timeout: 15000 })

    // Wait a beat for any lazy meta-tag updates
    await page.waitForFunction(
      () => document.querySelector('title')?.textContent?.length > 0,
      { timeout: 5000 }
    ).catch(() => {})

    let html = await page.content()

    // Add a marker so we know this page was prerendered (skip if already present)
    if (!html.includes('prerender-status')) {
      html = html.replace(
        '<head>',
        '<head>\n    <meta name="prerender-status" content="200" />'
      )
    }

    // Write to the correct path
    const outDir = route === '/'
      ? DIST
      : join(DIST, ...route.split('/').filter(Boolean))

    mkdirSync(outDir, { recursive: true })
    writeFileSync(join(outDir, 'index.html'), html)

    console.log(`  ✓ ${route}`)
    await page.close()
  }

  await browser.close()
  server.close()

  console.log(`\n  Done — ${ROUTES.length} pages prerendered.\n`)
}

prerender().catch((err) => {
  console.error('Prerender failed:', err)
  process.exit(1)
})
