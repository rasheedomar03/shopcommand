import { describe, it, expect } from 'vitest'
import { formatMoney, formatCurrency } from '../src/lib/utils.js'

describe('formatMoney', () => {
  it('shows exact cents, unlike formatCurrency which rounds to whole dollars', () => {
    expect(formatMoney(89.99)).toBe('$89.99')
    expect(formatCurrency(89.99)).toBe('$90')
  })

  it('always shows two decimals and thousands separators', () => {
    expect(formatMoney(0)).toBe('$0.00')
    expect(formatMoney(90)).toBe('$90.00')
    expect(formatMoney(1234.5)).toBe('$1,234.50')
  })

  it('treats missing or invalid values as zero instead of printing NaN', () => {
    expect(formatMoney(undefined)).toBe('$0.00')
    expect(formatMoney(null)).toBe('$0.00')
    expect(formatMoney('abc')).toBe('$0.00')
    expect(formatMoney('12.5')).toBe('$12.50')
  })

  it('keeps invoice math visible: 89.99 + 7.65 = 97.64', () => {
    expect([89.99, 7.65, 97.64].map(formatMoney)).toEqual(['$89.99', '$7.65', '$97.64'])
  })
})
