import { useEffect } from 'react'

const ORIGIN = 'https://shopcommand.net'

/**
 * Set per-page SEO meta: title, description, canonical, OG/Twitter tags,
 * and JSON-LD schema blocks (plus an optional BreadcrumbList).
 *
 * Schema scripts are removed via direct element references on unmount —
 * never by id — so pages can't clobber each other's schema (the old
 * shared `sc-faq-schema` id caused stale duplicates in prerendered HTML).
 *
 * @param {object}  opts
 * @param {string}  opts.title        Full document title
 * @param {string}  opts.description  Meta description
 * @param {string}  opts.path         Site-relative path ('/terms') for canonical/og:url
 * @param {object[]} [opts.schema]    JSON-LD objects to inject
 * @param {{name:string, path?:string}[]} [opts.breadcrumbs]
 *   Breadcrumb trail; the last item may omit `path`
 */
export function usePageMeta({ title, description, path, schema = [], breadcrumbs = null }) {
  useEffect(() => {
    if (!title) return
    const url = `${ORIGIN}${path || ''}`
    document.title = title
    const set = (sel, attr, val) => document.querySelector(sel)?.setAttribute(attr, val)
    set('meta[name="description"]', 'content', description)
    set('meta[property="og:title"]', 'content', title)
    set('meta[property="og:description"]', 'content', description)
    set('meta[property="og:url"]', 'content', url)
    set('meta[name="twitter:title"]', 'content', title)
    set('meta[name="twitter:description"]', 'content', description)
    set('link[rel="canonical"]', 'href', url)

    const blocks = [...schema]
    if (breadcrumbs?.length) {
      blocks.push({
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: breadcrumbs.map((b, i) => ({
          '@type': 'ListItem',
          position: i + 1,
          name: b.name,
          ...(b.path ? { item: `${ORIGIN}${b.path}` } : {}),
        })),
      })
    }
    // Clear schema captured in prerendered HTML so hydration doesn't duplicate it
    document.querySelectorAll('script[data-sc-schema]').forEach(n => n.remove())

    const nodes = blocks.map(obj => {
      const s = document.createElement('script')
      s.type = 'application/ld+json'
      s.setAttribute('data-sc-schema', '')
      s.text = JSON.stringify(obj)
      document.head.appendChild(s)
      return s
    })
    return () => nodes.forEach(n => n.remove())
    // schema/breadcrumbs are static per page; deps track the identity fields
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [title, description, path])
}
