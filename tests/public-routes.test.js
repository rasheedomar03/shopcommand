import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { ROUTES, sitemapEntries } from '../scripts/sitemap.mjs'

const read = p => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8')
const vercel = JSON.parse(read('vercel.json'))

// The subset of Vercel's source syntax used here: :name, :name(a|b), :name*
function toRegex(source) {
  const body = source.replace(/\/:\w+\*|:\w+(\([^)]*\))?/g, (m, group) => {
    if (m.endsWith('*')) return '(?:/.*)?'
    return group || '[^/]+'
  })
  return new RegExp(`^${body}$`)
}
const rewrites = vercel.rewrites.filter(r => r.destination === '/index.html').map(r => toRegex(r.source))
const served = path => ROUTES.includes(path) || rewrites.some(re => re.test(path))

// Every <Route path="..."> in the app, with :params and /* filled in
const appPaths = [...read('src/App.jsx').matchAll(/path="([^"]+)"/g)]
  .map(m => m[1])
  .filter(p => p !== '*' && p !== '/*')
// :slug pages exist only for the slugs that are prerendered
const concrete = appPaths
  .filter(p => !p.endsWith('/:slug'))
  .map(p => p.replace(/\/\*$/, '').replace(/:\w+/g, 'abc-123'))

describe('addresses the host serves', () => {
  it('serves every route in the app', () => {
    expect(concrete.length).toBeGreaterThan(40)
    expect(concrete.filter(p => !served(p))).toEqual([])
  })

  it('serves the sign-in sub-steps', () => {
    expect(served('/sign-in/factor-one')).toBe(true)
    expect(served('/sign-up/verify-email-address')).toBe(true)
  })

  it('prerenders every article and alternatives page', async () => {
    const { default: articles } = await import('../src/data/articles.js')
    const { alternativesData } = await import('../src/data/alternativesData.js')
    expect(Object.keys(alternativesData).length).toBe(6)
    for (const a of articles) expect(ROUTES).toContain(`/resources/${a.slug}`)
    for (const slug of Object.keys(alternativesData)) expect(ROUTES).toContain(`/alternatives/${slug}`)
  })

  it('does not serve made-up addresses', () => {
    for (const p of ['/nope', '/resources/nope', '/alternatives/nope', '/compare/nope', '/dashboard/x/y', '/tools/nope']) {
      expect(served(p), p).toBe(false)
    }
  })

  it('has a not-found page that search engines skip', () => {
    expect(read('public/404.html')).toContain('content="noindex"')
  })
})

describe('sitemap', () => {
  it('gives each page its own change date, not the build date', () => {
    const dates = sitemapEntries().map(e => e.lastmod)
    expect(dates.every(d => /^\d{4}-\d{2}-\d{2}$/.test(d))).toBe(true)
    expect(new Set(dates).size).toBeGreaterThan(3)
    expect(sitemapEntries()).toHaveLength(33)
  })
})
