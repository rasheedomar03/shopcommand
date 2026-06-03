/**
 * Post-build prerender script
 *
 * Spins up a static server on the Vite build output, visits each public route
 * with Puppeteer, and writes the fully-rendered HTML so crawlers that don't
 * execute JavaScript still see real content + meta tags.
 *
 * Works in two modes:
 *   - Local (Windows/Mac): uses your installed Chrome
 *   - CI / Vercel (Linux):  uses @sparticuz/chromium
 *
 * Usage:  node scripts/prerender.mjs
 */

import { createServer } from 'http'
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs'
import { join, extname } from 'path'
import { fileURLToPath } from 'url'
import puppeteer from 'puppeteer-core'

const __dirname = fileURLToPath(new URL('.', import.meta.url))
const DIST = join(__dirname, '..', 'dist')
const PORT = 4173

// ── Routes to prerender ─────────────────────────────────────────────────────
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
  '/cookies',
  '/accessibility',
]

// ── Find a browser to use ───────────────────────────────────────────────────
async function getBrowserLaunchOptions() {
  const isLinux = process.platform === 'linux'

  if (isLinux) {
    // CI / Vercel — use @sparticuz/chromium
    const chromium = await import('@sparticuz/chromium')
    return {
      args: chromium.default.args,
      defaultViewport: chromium.default.defaultViewport,
      executablePath: await chromium.default.executablePath(),
      headless: chromium.default.headless,
    }
  }

  // Local dev — find installed Chrome
  const paths =
    process.platform === 'win32'
      ? [
          process.env['PROGRAMFILES'] + '\\Google\\Chrome\\Application\\chrome.exe',
          process.env['PROGRAMFILES(X86)'] + '\\Google\\Chrome\\Application\\chrome.exe',
          process.env.LOCALAPPDATA + '\\Google\\Chrome\\Application\\chrome.exe',
        ]
      : [
          '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
          '/usr/bin/google-chrome',
          '/usr/bin/chromium-browser',
        ]

  const found = paths.find((p) => existsSync(p))
  if (!found) {
    throw new Error(
      'No Chrome found. Install Chrome or run on Linux CI where @sparticuz/chromium is used.'
    )
  }

  return { executablePath: found, headless: true }
}

// ── Tiny static file server ─────────────────────────────────────────────────
const MIME = {
  '.html': 'text/html',
  '.js': 'application/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
}

function serve() {
  return new Promise((resolve) => {
    const server = createServer((req, res) => {
      let filePath = join(DIST, req.url === '/' ? 'index.html' : req.url)

      if (!existsSync(filePath) || !extname(filePath)) {
        filePath = join(DIST, 'index.html')
      }

      try {
        const data = readFileSync(filePath)
        const ext = extname(filePath)
        res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' })
        res.end(data)
      } catch {
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
  const launchOpts = await getBrowserLaunchOptions()
  const browser = await puppeteer.launch(launchOpts)

  for (const route of ROUTES) {
    const page = await browser.newPage()
    const url = `http://localhost:${PORT}${route}`

    await page.goto(url, { waitUntil: 'networkidle0', timeout: 15000 })

    await page
      .waitForFunction(() => document.querySelector('title')?.textContent?.length > 0, {
        timeout: 5000,
      })
      .catch(() => {})

    let html = await page.content()

    if (!html.includes('prerender-status')) {
      html = html.replace('<head>', '<head>\n    <meta name="prerender-status" content="200" />')
    }

    const outDir = route === '/' ? DIST : join(DIST, ...route.split('/').filter(Boolean))

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
