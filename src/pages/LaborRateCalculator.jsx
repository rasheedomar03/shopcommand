import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Mail, ArrowRight, Table2 } from 'lucide-react'
import { PublicNav } from '@/components/PublicNav'
import { usePageMeta } from '@/lib/seo'
import { STATE_WAGES, MULTIPLIER_LOW, MULTIPLIER_HIGH } from '@/data/laborRates'

const CONTACT_EMAIL = 'rasheed.omar@outlook.com'
const WEEKS_PER_MONTH = 4.33
const PAID_HOURS_PER_WEEK = 40

const faqs = [
  {
    q: 'How do I calculate my shop\'s labor rate?',
    a: 'Add up what an hour of sold labor actually costs you — technician pay for all paid hours (billable or not) plus your fixed monthly overhead, divided by the hours you actually bill — then add your target profit margin. Rate = (monthly tech pay + monthly overhead) ÷ monthly billed hours ÷ (1 − margin).',
  },
  {
    q: 'What profit margin should an auto repair shop target on labor?',
    a: 'Healthy independent shops typically target a 20–35% net margin on labor. Below 15%, one slow month or one equipment failure puts the shop underwater; the calculator defaults to 25%.',
  },
  {
    q: 'Why does technician efficiency matter so much for my rate?',
    a: 'You pay techs for every hour they\'re clocked in, but you only collect for billed hours. A tech who bills 30 of 40 paid hours (75% efficiency) costs a third more per billable hour than their wage suggests. Small efficiency gains often beat rate increases — which is why tracking billed vs. clocked hours per tech is the first thing to fix.',
  },
  {
    q: 'Should I charge the same rate at all my locations?',
    a: 'Not necessarily. Rent, wages, and competition differ by neighborhood. Multi-location owners often run a base rate per market, then watch effective labor rate (labor revenue ÷ billed hours) per shop to catch discounting drift.',
  },
]

function Field({ label, suffix, value, onChange, min = 0, max, step = 1, hint }) {
  return (
    <label className="block">
      <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{label}</span>
      <div className="mt-1.5 flex items-center rounded-xl border border-slate-200 bg-white focus-within:border-orange-400 transition-colors">
        <input
          type="number"
          inputMode="decimal"
          value={value}
          min={min}
          max={max}
          step={step}
          onChange={e => onChange(e.target.value)}
          className="w-full px-4 py-2.5 text-slate-900 text-[15px] bg-transparent outline-none rounded-xl"
        />
        {suffix && <span className="pr-4 text-sm text-slate-400 whitespace-nowrap">{suffix}</span>}
      </div>
      {hint && <span className="block mt-1 text-xs text-slate-400">{hint}</span>}
    </label>
  )
}

export default function LaborRateCalculator() {
  const [techs, setTechs] = useState('4')
  const [wage, setWage] = useState('26')
  const [overhead, setOverhead] = useState('18000')
  const [billable, setBillable] = useState('32')
  const [margin, setMargin] = useState('25')
  const [stateCode, setStateCode] = useState('TX')

  usePageMeta({
    title: 'Auto Repair Labor Rate Calculator (Free) | ShopCommand',
    description: 'Free labor rate calculator for auto repair shops: enter your tech wages, overhead, billable hours, and target margin to get your break-even and recommended labor rate — compared against your state average.',
    path: '/tools/labor-rate-calculator',
    schema: [
      {
        '@context': 'https://schema.org',
        '@type': 'WebApplication',
        name: 'Auto Repair Labor Rate Calculator',
        url: 'https://shopcommand.net/tools/labor-rate-calculator',
        applicationCategory: 'BusinessApplication',
        operatingSystem: 'Web',
        offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
        description: 'Calculates the break-even and recommended hourly labor rate for an auto repair shop from technician wages, overhead, billable efficiency, and target margin.',
      },
      {
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        mainEntity: faqs.map(({ q, a }) => ({
          '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a },
        })),
      },
    ],
    breadcrumbs: [
      { name: 'Home', path: '/' },
      { name: 'Free Tools', path: '/tools/labor-rates-by-state' },
      { name: 'Labor Rate Calculator' },
    ],
  })

  const n = v => Math.max(0, Number(v) || 0)
  const nTechs = n(techs)
  const nWage = n(wage)
  const nOverhead = n(overhead)
  const nBillable = Math.min(n(billable), 60)
  const nMargin = Math.min(n(margin), 60)

  const monthlyBilledHours = nTechs * nBillable * WEEKS_PER_MONTH
  const monthlyTechCost = nTechs * nWage * PAID_HOURS_PER_WEEK * WEEKS_PER_MONTH
  const costPerBilledHour = monthlyBilledHours > 0 ? (monthlyTechCost + nOverhead) / monthlyBilledHours : 0
  const breakEven = costPerBilledHour
  const recommended = nMargin < 100 ? costPerBilledHour / (1 - nMargin / 100) : 0
  const monthlyLaborRevenue = recommended * monthlyBilledHours
  const efficiencyPct = Math.round((nBillable / PAID_HOURS_PER_WEEK) * 100)

  const st = STATE_WAGES.find(s => s.code === stateCode)
  const stLow = st ? Math.round((st.wage * MULTIPLIER_LOW) / 5) * 5 : 0
  const stHigh = st ? Math.round((st.wage * MULTIPLIER_HIGH) / 5) * 5 : 0
  const vsState = st && recommended > 0
    ? recommended < stLow ? 'below' : recommended > stHigh ? 'above' : 'within'
    : null

  const fmt = v => v > 0 && isFinite(v) ? `$${Math.round(v)}` : '—'

  return (
    <div className="min-h-screen bg-white">
      <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-orange-500 focus:text-white focus:rounded-lg">
        Skip to main content
      </a>

      <PublicNav />

      <main id="main-content">
        {/* Hero */}
        <section className="px-6 py-16 border-b border-slate-100">
          <div className="max-w-3xl mx-auto text-center">
            <div className="text-xs text-orange-600 uppercase tracking-widest font-semibold mb-4">Free Tool</div>
            <h1 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4" style={{ letterSpacing: '-0.02em' }}>
              Auto Repair Labor Rate Calculator
            </h1>
            <p className="text-slate-500 leading-relaxed max-w-xl mx-auto">
              The state average tells you what other shops charge. This tells you what <em>your</em> shop
              needs to charge — from your real wages, overhead, and billable hours.
            </p>
          </div>
        </section>

        {/* Calculator */}
        <section className="px-6 py-12">
          <div className="max-w-4xl mx-auto grid md:grid-cols-[1fr_320px] gap-8 items-start">
            {/* Inputs */}
            <div className="space-y-5">
              <div className="grid sm:grid-cols-2 gap-4">
                <Field label="Technicians" value={techs} onChange={setTechs} suffix="techs" min={1} max={200}
                  hint="Wrench-turning techs on payroll" />
                <Field label="Average tech wage" value={wage} onChange={setWage} suffix="$/hr" step="0.5"
                  hint="Blended average across your techs" />
              </div>
              <Field label="Monthly fixed overhead" value={overhead} onChange={setOverhead} suffix="$/mo" step="500"
                hint="Rent, utilities, insurance, advisors, software, equipment — everything except tech pay and parts" />
              <div className="grid sm:grid-cols-2 gap-4">
                <Field label="Billable hours per tech / week" value={billable} onChange={setBillable} suffix="hrs" max={60}
                  hint={`Hours actually billed, not clocked. ${efficiencyPct}% efficiency at 40 paid hrs`} />
                <Field label="Target profit margin" value={margin} onChange={setMargin} suffix="%" max={60}
                  hint="Net margin on labor. Healthy shops target 20–35%" />
              </div>

              <label className="block">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Compare against state</span>
                <select
                  value={stateCode}
                  onChange={e => setStateCode(e.target.value)}
                  className="mt-1.5 w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-900 text-[15px] outline-none focus:border-orange-400 transition-colors"
                >
                  {STATE_WAGES.map(s => <option key={s.code} value={s.code}>{s.name}</option>)}
                </select>
              </label>
            </div>

            {/* Results */}
            <div className="md:sticky md:top-20 rounded-2xl border border-slate-200 overflow-hidden">
              <div className="px-5 py-4 bg-slate-50 border-b border-slate-200">
                <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Your numbers</div>
              </div>
              <div className="p-5 space-y-4">
                <div>
                  <div className="text-xs text-slate-400 mb-0.5">Break-even labor rate</div>
                  <div className="text-2xl font-bold text-slate-900 tabular-nums">{fmt(breakEven)}<span className="text-sm font-normal text-slate-400">/hr</span></div>
                </div>
                <div className="pt-3 border-t border-slate-100">
                  <div className="text-xs text-slate-400 mb-0.5">Recommended rate at {nMargin}% margin</div>
                  <div className="text-3xl font-extrabold text-orange-600 tabular-nums">{fmt(recommended)}<span className="text-sm font-normal text-slate-400">/hr</span></div>
                  {vsState && st && (
                    <div className="text-xs text-slate-500 mt-1.5">
                      {vsState === 'within' && <>Within {st.name}'s estimated range (${stLow}–${stHigh}/hr) ✓</>}
                      {vsState === 'below' && <>Below {st.name}'s estimated range (${stLow}–${stHigh}/hr) — you may have room to raise it</>}
                      {vsState === 'above' && <>Above {st.name}'s estimated range (${stLow}–${stHigh}/hr) — justified if your costs or specialty demand it</>}
                    </div>
                  )}
                </div>
                <div className="pt-3 border-t border-slate-100 grid grid-cols-2 gap-3">
                  <div>
                    <div className="text-xs text-slate-400 mb-0.5">Billed hrs / mo</div>
                    <div className="text-base font-semibold text-slate-900 tabular-nums">{Math.round(monthlyBilledHours) || '—'}</div>
                  </div>
                  <div>
                    <div className="text-xs text-slate-400 mb-0.5">Labor revenue / mo</div>
                    <div className="text-base font-semibold text-slate-900 tabular-nums">{monthlyLaborRevenue > 0 ? `$${Math.round(monthlyLaborRevenue).toLocaleString()}` : '—'}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* How it works */}
        <section className="px-6 py-12 bg-slate-50 border-y border-slate-200">
          <div className="max-w-3xl mx-auto">
            <h2 className="text-xl font-bold text-slate-900 mb-4" style={{ letterSpacing: '-0.01em' }}>How the math works</h2>
            <div className="space-y-3 text-[15px] text-slate-600 leading-relaxed">
              <p>
                You pay technicians for every clocked hour, but you only collect for <em>billed</em> hours. So the true
                cost of one billable hour is your total monthly labor cost plus fixed overhead, divided by the hours you
                actually sell:
              </p>
              <p className="px-4 py-3 rounded-xl bg-white border border-slate-200 font-mono text-sm text-slate-700">
                break-even = (tech pay + overhead) ÷ billed hours<br />
                rate = break-even ÷ (1 − target margin)
              </p>
              <p>
                Two levers move the answer far more than owners expect: <strong className="text-slate-900">billable
                efficiency</strong> (a tech billing 34 hours instead of 30 drops your break-even by more than a 10% rate
                hike adds) and <strong className="text-slate-900">overhead per bay</strong>. Both are visibility problems
                before they're pricing problems.
              </p>
            </div>
          </div>
        </section>

        {/* State table CTA */}
        <section className="px-6 py-12">
          <div className="max-w-3xl mx-auto">
            <Link
              to="/tools/labor-rates-by-state"
              className="group flex items-center gap-5 p-6 rounded-2xl border border-slate-200 hover:border-orange-200 hover:bg-orange-50/30 transition-all"
            >
              <div className="w-11 h-11 rounded-xl bg-orange-50 border border-orange-200 flex items-center justify-center shrink-0">
                <Table2 size={20} className="text-orange-500" strokeWidth={1.8} />
              </div>
              <div className="flex-1">
                <h2 className="text-base font-semibold text-slate-900 group-hover:text-orange-600 transition-colors mb-1">
                  See labor rates for all 50 states
                </h2>
                <p className="text-slate-500 text-sm">
                  BLS-derived estimated shop rates, state by state, with the full methodology.
                </p>
              </div>
              <ArrowRight size={16} className="text-slate-300 group-hover:text-orange-400 transition-colors shrink-0" />
            </Link>
          </div>
        </section>

        {/* FAQ */}
        <section className="px-6 pb-12">
          <div className="max-w-3xl mx-auto">
            <h2 className="text-xl font-bold text-slate-900 mb-6" style={{ letterSpacing: '-0.01em' }}>Frequently asked questions</h2>
            <div className="space-y-6">
              {faqs.map(({ q, a }) => (
                <div key={q}>
                  <h3 className="text-[15px] font-semibold text-slate-900 mb-1.5">{q}</h3>
                  <p className="text-slate-500 text-sm leading-relaxed">{a}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Product CTA */}
        <section className="px-6 py-16 bg-slate-50 border-t border-slate-200">
          <div className="max-w-2xl mx-auto text-center">
            <h2 className="text-xl font-bold text-slate-900 mb-3" style={{ letterSpacing: '-0.01em' }}>
              The calculator assumes you know your billable hours. Do you?
            </h2>
            <p className="text-slate-500 text-sm mb-6">
              ShopCommand tracks clocked vs. billed hours per technician, per shop — so multi-location owners see real
              efficiency, not guesses. $100/mo per shop, unlimited users.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <Link to="/demo" className="px-5 py-2.5 rounded-xl text-sm font-semibold bg-orange-500 hover:bg-orange-600 text-white transition-colors">
                Try the live demo
              </Link>
              <Link to="/founding-program" className="px-5 py-2.5 rounded-xl text-sm font-semibold text-slate-600 hover:text-slate-900 border border-slate-200 hover:border-slate-300 transition-colors">
                Founding Shop Program →
              </Link>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 px-6 md:px-12 py-10 bg-slate-50/60">
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <Link to="/" className="flex items-center gap-2 hover:opacity-70 transition-opacity flex-shrink-0">
            <span className="text-slate-400 text-sm">ShopCommand</span>
          </Link>
          <a href={`mailto:${CONTACT_EMAIL}`} className="flex items-center gap-2 text-slate-400 hover:text-slate-600 text-sm transition-colors">
            <Mail size={13} className="flex-shrink-0" />
            {CONTACT_EMAIL}
          </a>
          <div className="flex gap-5">
            <Link to="/tools/labor-rates-by-state" className="text-slate-400 hover:text-slate-600 text-xs transition-colors">Rates by State</Link>
            <Link to="/resources" className="text-slate-400 hover:text-slate-600 text-xs transition-colors">Resources</Link>
            <Link to="/terms" className="text-slate-400 hover:text-slate-600 text-xs transition-colors">Terms</Link>
            <Link to="/privacy" className="text-slate-400 hover:text-slate-600 text-xs transition-colors">Privacy</Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
