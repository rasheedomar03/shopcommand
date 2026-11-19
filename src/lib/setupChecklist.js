// "Finish setting up" checklist for new owners. Pure functions so the rules are
// easy to test: what is still to do, based on the data the app already has.

const hasText = v => typeof v === 'string' && v.trim().length > 0

/**
 * @param {object} data
 * @param {Array} data.shops
 * @param {Array} data.repairOrders
 * @param {Array} data.invoices
 * @param {Array} data.parts
 * @param {Array} data.technicians
 * @param {{paid?:boolean, trialEndsAt?:string|null, daysLeft?:number|null}|null} data.trial
 * @returns {Array<{id:string,label:string,hint?:string,done:boolean,optional?:boolean,to?:string,action?:string}>}
 */
export function setupSteps({ shops = [], repairOrders = [], invoices = [], parts = [], technicians = [], trial = null } = {}) {
  const steps = [
    {
      id: 'contact',
      label: 'Add your shop address and phone',
      hint: 'They print on your invoices and work orders, and appear in customer emails.',
      done: shops.length > 0 && shops.every(s => hasText(s.address) && hasText(s.phone)),
      to: '/settings?tab=locations',
    },
    {
      id: 'first-job',
      label: 'Create your first repair order or invoice',
      hint: 'Start with a real job from today, or a practice one.',
      done: repairOrders.length > 0 || invoices.length > 0,
      action: 'new-ro',
    },
    {
      id: 'parts',
      label: 'Add a few parts',
      hint: 'Start with the parts you reorder most.',
      done: parts.length > 0,
      to: '/parts',
    },
    {
      id: 'team',
      label: 'Invite your team',
      hint: 'Optional. Give advisors and technicians their own login with an invite code.',
      done: technicians.length > 0,
      optional: true,
      to: '/settings?tab=team',
    },
  ]

  // Only owners still on a free trial get the card step. Paying and legacy
  // accounts (no trial date) never see it.
  if (trial && !trial.paid && trial.trialEndsAt) {
    const left = Number(trial.daysLeft)
    steps.push({
      id: 'card',
      label: left > 0
        ? `Add a card to keep your account (${left} day${left === 1 ? '' : 's'} left in your trial)`
        : 'Add a card to keep your account active',
      hint: 'No charge until your trial ends.',
      done: false,
      action: 'checkout',
    })
  }

  return steps
}

/** Required steps decide when the checklist is finished; optional ones never block it. */
export function setupProgress(steps) {
  const required = steps.filter(s => !s.optional)
  const done = required.filter(s => s.done).length
  return {
    done,
    total: required.length,
    complete: required.length > 0 && done === required.length,
  }
}
