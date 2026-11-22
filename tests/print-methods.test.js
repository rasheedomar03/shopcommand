import { describe, it, expect } from 'vitest'
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'

// Printing: every document is printed from a copy placed directly in the page
// (PrintPortal), never by hiding the app with `visibility` and fixing the paper
// in place. The old method cut documents across pages and added blank ones.

const SRC = join(import.meta.dirname, '..', 'src')

function files(dir) {
  return readdirSync(dir).flatMap(name => {
    const p = join(dir, name)
    return statSync(p).isDirectory() ? files(p) : /\.(jsx?|css)$/.test(name) ? [p] : []
  })
}
const all = files(SRC).map(p => ({ p: p.replace(SRC, 'src'), text: readFileSync(p, 'utf8') }))

describe('print methods', () => {
  it('no file uses the old "hide everything with visibility" print rule', () => {
    const bad = all.filter(f => /body \*\s*\{\s*visibility:\s*hidden/.test(f.text)).map(f => f.p)
    expect(bad).toEqual([])
  })

  it('no file prints a document with position: fixed over the page', () => {
    const bad = all.filter(f => /@media print[\s\S]{0,400}position:\s*(fixed|absolute)/.test(f.text) && !f.p.endsWith('index.css')).map(f => f.p)
    expect(bad).toEqual([])
  })

  it('every document that calls window.print uses the PrintPortal copy', () => {
    const printers = all.filter(f => /window\.print\(\)/.test(f.text))
    expect(printers.length).toBeGreaterThanOrEqual(5) // truck history, blank form, generator, invoice page, public tool
    const missing = printers.filter(f => !/PrintPortal/.test(f.text)).map(f => f.p)
    expect(missing).toEqual([])
  })

  it('the shared helper removes everything else from the printed page and keeps table headings', () => {
    const helper = all.find(f => f.p.endsWith('PrintPortal.jsx')).text
    expect(helper).toMatch(/body > \*:not\(\.sc-print-root\):not\(style\)\s*\{\s*display:\s*none !important/)
    expect(helper).toMatch(/thead\s*\{\s*display:\s*table-header-group/)
    expect(helper).toMatch(/break-inside:\s*avoid/)
    expect(helper).toMatch(/createPortal/)
  })

  it('the global print stylesheet leaves the print copy its own colors', () => {
    const css = all.find(f => f.p.endsWith('index.css')).text
    expect(css).toMatch(/\*:not\(\.sc-print-root\):not\(\.sc-print-root \*\)\s*\{[^}]*color: black/)
  })
})
