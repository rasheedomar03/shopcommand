import { describe, it, expect } from 'vitest'
import { setupSteps, setupProgress } from '../src/lib/setupChecklist.js'

const shop = (over = {}) => ({ id: 's1', name: 'Main', address: '1 Main St', phone: '555-0100', ...over })
const byId = (steps, id) => steps.find(s => s.id === id)

describe('setupSteps', () => {
  it('a brand-new owner has every required step still to do', () => {
    const steps = setupSteps({ shops: [shop({ address: null, phone: null })] })
    expect(byId(steps, 'contact').done).toBe(false)
    expect(byId(steps, 'first-job').done).toBe(false)
    expect(byId(steps, 'parts').done).toBe(false)
    expect(setupProgress(steps)).toEqual({ done: 0, total: 3, complete: false })
  })

  it('shop contact is done only when every shop has an address and a phone', () => {
    expect(byId(setupSteps({ shops: [shop()] }), 'contact').done).toBe(true)
    expect(byId(setupSteps({ shops: [shop(), shop({ id: 's2', phone: '' })] }), 'contact').done).toBe(false)
    expect(byId(setupSteps({ shops: [shop({ address: '   ' })] }), 'contact').done).toBe(false)
    expect(byId(setupSteps({ shops: [] }), 'contact').done).toBe(false)
  })

  it('first job counts a repair order or an invoice', () => {
    expect(byId(setupSteps({ repairOrders: [{ id: 'r1' }] }), 'first-job').done).toBe(true)
    expect(byId(setupSteps({ invoices: [{ id: 'INV-1' }] }), 'first-job').done).toBe(true)
  })

  it('inviting the team is optional and never blocks completion', () => {
    const steps = setupSteps({ shops: [shop()], repairOrders: [{ id: 'r1' }], parts: [{ id: 'p1' }] })
    expect(byId(steps, 'team').optional).toBe(true)
    expect(byId(steps, 'team').done).toBe(false)
    expect(setupProgress(steps)).toEqual({ done: 3, total: 3, complete: true })
  })

  it('shows the card step only for owners on a free trial, with days left', () => {
    const base = { shops: [shop()], repairOrders: [{ id: 'r1' }], parts: [{ id: 'p1' }] }
    const trial = setupSteps({ ...base, trial: { paid: false, trialEndsAt: '2026-12-02T00:00:00Z', daysLeft: 9 } })
    expect(byId(trial, 'card').label).toMatch(/9 days left/)
    expect(setupProgress(trial).complete).toBe(false)

    expect(byId(setupSteps({ ...base, trial: { paid: false, trialEndsAt: '2026-12-02T00:00:00Z', daysLeft: 1 } }), 'card').label).toMatch(/1 day left/)
    expect(byId(setupSteps({ ...base, trial: { paid: false, trialEndsAt: '2026-11-01T00:00:00Z', daysLeft: 0 } }), 'card').label).toMatch(/active/)
    // paying, legacy (no trial date) and unknown trial state show no card step
    expect(byId(setupSteps({ ...base, trial: { paid: true, trialEndsAt: '2026-12-02T00:00:00Z' } }), 'card')).toBeUndefined()
    expect(byId(setupSteps({ ...base, trial: { paid: false, trialEndsAt: null } }), 'card')).toBeUndefined()
    expect(byId(setupSteps({ ...base, trial: null }), 'card')).toBeUndefined()
  })

  it('does not crash on missing data', () => {
    expect(() => setupSteps()).not.toThrow()
    expect(setupProgress([]).complete).toBe(false)
  })
})
