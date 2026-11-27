// The public pages (prerendered at build time) and the sitemap that lists them.
import ARTICLES from '../src/data/articles.js'

const ORIGIN = 'https://shopcommand.net'

// The day each page's content last changed. CHANGE THE DATE WHEN YOU CHANGE A PAGE.
// Search engines ignore dates that move on every deploy, so these are kept by hand.
// Articles carry their own dates in src/data/articles.js.
const latestArticle = ARTICLES.map(a => a.updatedAt || a.publishedAt).sort().at(-1)

const PAGES = {
  '/': '2026-11-12',
  '/founding-program': '2026-11-12',
  '/tools/labor-rates-by-state': '2026-11-27',
  '/tools/labor-rate-calculator': '2026-11-27',
  '/tools/invoice-generator': '2026-11-23',
  '/resources': latestArticle,
  ...Object.fromEntries(ARTICLES.map(a => [`/resources/${a.slug}`, a.updatedAt || a.publishedAt])),
  '/compare/tekmetric': '2026-11-12',
  '/compare/shopmonkey': '2026-11-12',
  '/compare/mitchell1': '2026-11-12',
  '/compare/shop-ware': '2026-11-12',
  '/compare/ro-writer': '2026-11-12',
  '/compare/fullbay': '2026-11-12',
  '/alternatives/tekmetric': '2026-11-12',
  '/alternatives/shopmonkey': '2026-11-12',
  '/alternatives/mitchell1': '2026-11-12',
  '/alternatives/shop-ware': '2026-11-12',
  '/alternatives/ro-writer': '2026-11-12',
  '/alternatives/fullbay': '2026-11-12',
  '/truck-repair-shop-software': '2026-11-12',
  // Legal pages: the "Last updated" date printed on each
  '/terms': '2026-05-13',
  '/privacy': '2026-05-13',
  '/dpa': '2026-05-13',
  '/cookies': '2026-05-31',
  '/accessibility': '2026-05-31',
}

export const ROUTES = Object.keys(PAGES)

function meta(route) {
  if (route === '/') return { changefreq: 'weekly', priority: '1.0' }
  if (route === '/founding-program') return { changefreq: 'weekly', priority: '0.9' }
  if (route === '/resources') return { changefreq: 'weekly', priority: '0.8' }
  if (route.startsWith('/tools/')) return { changefreq: 'monthly', priority: '0.8' }
  if (route.startsWith('/resources/')) return { changefreq: 'monthly', priority: '0.7' }
  if (route.startsWith('/compare/')) return { changefreq: 'monthly', priority: '0.8' }
  if (route.startsWith('/alternatives/')) return { changefreq: 'monthly', priority: '0.8' }
  return { changefreq: 'yearly', priority: '0.3' } // legal pages
}

const EXTRAS = [
  { route: '/llms.txt', lastmod: '2026-11-11', changefreq: 'monthly', priority: '0.4' },
  { route: '/pricing.md', lastmod: '2026-11-11', changefreq: 'monthly', priority: '0.5' },
]

export function sitemapEntries() {
  return [
    ...ROUTES.map(route => ({ route, lastmod: PAGES[route], ...meta(route) })),
    ...EXTRAS,
  ].map(e => ({ ...e, loc: `${ORIGIN}${e.route}` }))
}

export function sitemapXml() {
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...sitemapEntries().map(e => [
      '  <url>',
      `    <loc>${e.loc}</loc>`,
      `    <lastmod>${e.lastmod}</lastmod>`,
      `    <changefreq>${e.changefreq}</changefreq>`,
      `    <priority>${e.priority}</priority>`,
      '  </url>',
    ].join('\n')),
    '</urlset>',
    '',
  ].join('\n')
}
