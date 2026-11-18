import { describe, it, expect } from 'vitest'
import { roLabel } from '../src/lib/utils.js'

// People should see the RO number (RO-20261117-0001), never the database UUID.

describe('roLabel', () => {
  const uuid = '8113e72b-a9c3-456e-8754-4c03dbb9862b'

  it('prefers the RO number over the database id', () => {
    expect(roLabel({ id: uuid, roNumber: 'RO-20261117-0001' })).toBe('RO-20261117-0001')
  })

  it('falls back to the id for demo data, whose id is already a short RO number', () => {
    expect(roLabel({ id: 'RO-8843' })).toBe('RO-8843')
    expect(roLabel({ id: 'RO-8843', roNumber: undefined })).toBe('RO-8843')
    expect(roLabel({ id: 'RO-8843', roNumber: '' })).toBe('RO-8843')
  })

  it('returns an empty string for missing input instead of throwing', () => {
    expect(roLabel(undefined)).toBe('')
    expect(roLabel(null)).toBe('')
    expect(roLabel({})).toBe('')
  })

  it('always returns a string', () => {
    expect(typeof roLabel({ id: 42 })).toBe('string')
    expect(roLabel({ id: 42 })).toBe('42')
  })
})
