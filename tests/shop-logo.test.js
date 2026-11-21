import { describe, it, expect } from 'vitest'
import { fitLogo, clampLogoSize, logoOf, LOGO_SIZE_MIN, LOGO_SIZE_MAX, LOGO_SIZE_DEFAULT } from '../src/lib/shopLogo.js'
import { logoErrors, logoPatch, MAX_LOGO_CHARS, LOGO_WIDTH_MIN, LOGO_WIDTH_MAX } from '../api/_lib/shop-logo.js'

const PNG = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=='

describe('fitLogo (browser)', () => {
  it('shrinks a big picture to fit, keeping its shape', () => {
    expect(fitLogo(1600, 400)).toEqual({ width: 400, height: 100 })
    expect(fitLogo(800, 800)).toEqual({ width: 200, height: 200 })
  })
  it('never enlarges a small picture', () => {
    expect(fitLogo(120, 60)).toEqual({ width: 120, height: 60 })
  })
  it('copes with nonsense sizes', () => {
    expect(fitLogo(0, 10)).toEqual({ width: 0, height: 0 })
    expect(fitLogo('x', 10)).toEqual({ width: 0, height: 0 })
  })
})

describe('clampLogoSize', () => {
  it('keeps the slider inside its range', () => {
    expect(clampLogoSize(5)).toBe(LOGO_SIZE_MIN)
    expect(clampLogoSize(9999)).toBe(LOGO_SIZE_MAX)
    expect(clampLogoSize('150')).toBe(150)
  })
  it('falls back to the default for anything that is not a number', () => {
    expect(clampLogoSize('abc')).toBe(LOGO_SIZE_DEFAULT)
    expect(clampLogoSize(undefined)).toBe(LOGO_SIZE_DEFAULT)
  })
})

describe('logoOf', () => {
  it('returns the picture and a safe width for a shop that has one', () => {
    expect(logoOf({ logo: PNG, logoWidth: 200 })).toEqual({ src: PNG, width: 200 })
    expect(logoOf({ logo: PNG, logoWidth: 0 }).width).toBe(LOGO_SIZE_DEFAULT)
  })
  it('returns null for no logo or something that is not an image', () => {
    expect(logoOf({})).toBeNull()
    expect(logoOf(null)).toBeNull()
    expect(logoOf({ logo: 'https://evil.example/x.png' })).toBeNull()
    expect(logoOf({ logo: 'javascript:alert(1)' })).toBeNull()
  })
})

describe('server rules for a logo', () => {
  it('accepts a small PNG, JPEG or WebP and a size in range', () => {
    expect(logoErrors({ logo: PNG, logo_width: 120 })).toEqual([])
    expect(logoErrors({ logo: PNG.replace('png', 'jpeg') })).toEqual([])
    expect(logoErrors({ logo: PNG.replace('png', 'webp') })).toEqual([])
  })
  it('accepts null (remove the logo) and a body with neither field', () => {
    expect(logoErrors({ logo: null })).toEqual([])
    expect(logoErrors({ name: 'x' })).toEqual([])
    expect(logoErrors(null)).toEqual([])
  })
  it('refuses SVG, other types, links, scripts and non-strings', () => {
    for (const bad of ['data:image/svg+xml;base64,PHN2Zz48L3N2Zz4=', 'data:text/html;base64,PGgxPg==', 'https://x.example/a.png', 'javascript:alert(1)', 123, {}, 'data:image/png;base64,<script>']) {
      expect(logoErrors({ logo: bad })).toHaveLength(1)
    }
  })
  it('refuses a logo over the size limit', () => {
    const big = 'data:image/png;base64,' + 'A'.repeat(MAX_LOGO_CHARS)
    expect(logoErrors({ logo: big })).toHaveLength(1)
  })
  it('refuses a size outside the range', () => {
    expect(logoErrors({ logo_width: LOGO_WIDTH_MIN - 1 })).toHaveLength(1)
    expect(logoErrors({ logo_width: LOGO_WIDTH_MAX + 1 })).toHaveLength(1)
    expect(logoErrors({ logo_width: 'wide' })).toHaveLength(1)
    expect(logoErrors({ logo_width: LOGO_WIDTH_MIN })).toEqual([])
  })
  it('builds the merge: a logo, a rounded size, and null removes the logo', () => {
    expect(logoPatch({ logo: PNG, logo_width: 120.4 })).toEqual({ logo: PNG, logo_width: 120 })
    expect(logoPatch({ logo: null })).toEqual({ logo: null })
    expect(logoPatch({ logo_width: 90 })).toEqual({ logo_width: 90 }) // size only: the logo is left alone
    expect(logoPatch({ name: 'x' })).toEqual({})
  })
})
