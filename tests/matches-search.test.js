import { describe, it, expect } from 'vitest'
import { matchesSearch } from '../src/lib/utils.js'

// Search must never crash: a customer saved without a phone number has
// phone = null, and typing in the search box used to throw on it.

describe('matchesSearch', () => {
  it('matches everything when the query is blank', () => {
    expect(matchesSearch('', 'a')).toBe(true)
    expect(matchesSearch('   ', null)).toBe(true)
    expect(matchesSearch(undefined)).toBe(true)
  })
  it('matches any field, ignoring case', () => {
    expect(matchesSearch('ford', 'Ann Lee', '2019 FORD F-150')).toBe(true)
    expect(matchesSearch('lee', 'Ann Lee')).toBe(true)
    expect(matchesSearch('zzz', 'Ann Lee', '2019 Ford')).toBe(false)
  })
  it('does not crash on missing fields, and they never match', () => {
    expect(matchesSearch('555', 'Ann Lee', null)).toBe(false)
    expect(matchesSearch('555', undefined, null)).toBe(false)
    expect(matchesSearch('555', 'Ann Lee', '708-555-0100')).toBe(true)
  })
  it('matches numbers', () => {
    expect(matchesSearch('2019', 2019)).toBe(true)
  })
})
