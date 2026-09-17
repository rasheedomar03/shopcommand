import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Mail, ArrowRight, ArrowUpDown, Calculator } from 'lucide-react'
import { PublicNav } from '@/components/PublicNav'
import { usePageMeta } from '@/lib/seo'
import {
  STATE_WAGES, BLS_RELEASE, BLS_SOURCE_URL, MULTIPLIER_LOW, MULTIPLIER_HIGH,
} from '@/data/laborRates'

const CONTACT_EMAIL = 'rasheed.omar@outlook.com'
const YEAR = new Date().getFullYear()

// Round estimated rates to the nearest $5 — these are ranges, not precision claims
const lo = w => Math.round((w * MULTIPLIER_LOW) / 5) * 5
const hi = w => Math.round((w * MULTIPLIER_HIGH) / 5) * 5

const faqs = [
  {
    q: 'What is the average auto repair labor rate in the US?',
    a: `Based on Bureau of Labor Statistics wage data (${BLS_RELEASE}) and typical shop cost structures, most US auto repair shops charge between $${lo(Math.min(...STATE_WAGES.map(s => s.wage)))} and $${hi(Math.max(...STATE_WAGES.map(s => s.wage)))} per labor hour, with most independent shops falling in the $120–$180 range. Dealerships typically charge 20–40% more than independent shops in the same market.`,
  },
  {
    q: 'Why do labor rates vary so much by state?',
    a: 'Labor rates track local technician wages, commercial rent, insurance costs, and cost of living. States with higher mechanic wages (Alaska, California, Washington, and the Northeast) support higher posted rates, while Southern and Midwestern states run lower. Urban shops also typically charge more than rural shops within the same state.',
  },
  {
    q: 'How are these labor rate estimates calculated?',
    a: `Each state's estimated range is the BLS mean hourly wage for automotive service technicians (occupation 49-3023, ${BLS_RELEASE}) multiplied by ${MULTIPLIER_LOW}–${MULTIPLIER_HIGH}. That multiplier reflects the industry-standard relationship between what a shop pays its technicians and what it must charge to cover bays, equipment, insurance, service writers, and profit. Actual posted rates at individual shops will vary.`,
  },
  {
    q: 'What labor rate should my shop charge?',
    a: 'Your rate should be driven by your own costs, not just the local average: technician wages, overhead per bay, and how many hours your techs actually bill versus sit idle. Use our free labor rate calculator to compute the break-even and target rate for your specific shop.',
  },
]

export default function LaborRatesByState() {
  const [sortBy, setSortBy] = useState('name')
  const [dir, setDir] = useState(1)

  usePageMeta({
    title: `Auto Repair Labor Rates by State (${YEAR}) | ShopCommand`,
    description: `Average auto repair shop labor rates for all 50 states, estimated from BLS ${BLS_RELEASE} technician wage data with a transparent methodology. See how your state compares.`,
    path: '/tools/labor-rates-by-state',
    schema: [
      {
        '@context': 'https://schema.org',
        '@type': 'Article',
        headline: `Average Auto Repair Labor Rates by State (${YEAR})`,
        description: `State-by-state estimated auto repair labor rates derived from BLS ${BLS_RELEASE} wage data for automotive service technicians.`,
        url: 'https://shopcommand.net/tools/labor-rates-by-state',
        dateModified: new Date().toISOString().slice(0, 10),
        author: { '@type': 'Organization', name: 'ShopCommand', url: 'https://shopcommand.net' },
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
      { name: 'Free Tools', path: '/tools/labor-rate-calculator' },
      { name: 'Labor Rates by State' },
    ],
  })

  const sorted = [...STATE_WAGES].sort((a, b) => {
    if (sortBy === 'name') return dir * a.name.localeCompare(b.name)
    return dir * (a.wage - b.wage)
  })

  const toggleSort = (col) => {
    if (sortBy === col) setDir(d => -d)
    else { setSortBy(col); setDir(col === 'name' ? 1 : -1) }
  }

  const wages = STATE_WAGES.map(s => s.wage)
  const natLow = lo(wages.reduce((s, w) => s + w, 0) / wages.length)
  const natHigh = hi(wages.reduce((s, w) => s + w, 0) / wages.length)

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
              Average Auto Repair Labor Rates by State ({YEAR})
            </h1>
            <p className="text-slate-500 leading-relaxed max-w-xl mx-auto mb-6">
              Estimated shop labor rates for all 50 states and DC, built from Bureau of Labor Statistics
              technician wage data ({BLS_RELEASE}) — with the methodology shown, not hidden.
            </p>
            <div className="inline-flex items-baseline gap-2 px-5 py-3 rounded-xl bg-orange-50 border border-orange-200">
              <span className="text-sm text-slate-600">Typical US shop rate:</span>
              <span className="text-2xl font-bold text-slate-900 tabular-nums">${natLow}–${natHigh}</span>
              <span className="text-sm text-slate-500">/hr (est.)</span>
            </div>
          </div>
        </section>

        {/* Table */}
        <section className="px-6 py-12">
          <div className="max-w-3xl mx-auto">
            <div className="border border-slate-200 rounded-2xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm min-w-[520px]">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200">
                      <th className="px-5 py-3 text-left">
                        <button onClick={() => toggleSort('name')} className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 uppercase tracking-wider hover:text-slate-900">
                          State <ArrowUpDown size={11} />
                        </button>
                      </th>
                      <th className="px-5 py-3 text-right">
                        <button onClick={() => toggleSort('wage')} className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 uppercase tracking-wider hover:text-slate-900 ml-auto">
                          Tech Wage (BLS) <ArrowUpDown size={11} />
                        </button>
                      </th>
                      <th className="px-5 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">
                        Est. Shop Labor Rate
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {sorted.map(s => (
                      <tr key={s.code} className="border-b border-slate-100 last:border-0 hover:bg-orange-50/30 transition-colors">
                        <td className="px-5 py-3 font-medium text-slate-900">{s.name}</td>
                        <td className="px-5 py-3 text-right tabular-nums text-slate-600">${s.wage.toFixed(2)}/hr</td>
                        <td className="px-5 py-3 text-right tabular-nums font-semibold text-slate-900">
                          ${lo(s.wage)}–${hi(s.wage)}<span className="text-slate-400 font-normal">/hr</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            <p className="text-xs text-slate-400 mt-3">
              Tech wage: BLS mean hourly wage for Automotive Service Technicians and Mechanics (49-3023), {BLS_RELEASE}.
              Shop rate: estimated range, wage × {MULTIPLIER_LOW}–{MULTIPLIER_HIGH}, rounded to the nearest $5.
            </p>
          </div>
        </section>

        {/* Calculator CTA */}
        <section className="px-6 pb-12">
          <div className="max-w-3xl mx-auto">
            <Link
              to="/tools/labor-rate-calculator"
              className="group flex items-center gap-5 p-6 rounded-2xl border border-orange-200 bg-orange-50/40 hover:bg-orange-50 transition-colors"
            >
              <div className="w-11 h-11 rounded-xl bg-white border border-orange-200 flex items-center justify-center shrink-0">
                <Calculator size={20} className="text-orange-500" strokeWidth={1.8} />
              </div>
              <div className="flex-1">
                <h2 className="text-base font-semibold text-slate-900 group-hover:text-orange-600 transition-colors mb-1">
                  What should <em>your</em> shop charge?
                </h2>
                <p className="text-slate-500 text-sm">
                  State averages are a benchmark — your rate should come from your own costs. Use the free calculator to find your break-even and target rate.
                </p>
              </div>
              <ArrowRight size={16} className="text-slate-300 group-hover:text-orange-400 transition-colors shrink-0" />
            </Link>
          </div>
        </section>

        {/* Methodology */}
        <section className="px-6 py-12 bg-slate-50 border-y border-slate-200">
          <div className="max-w-3xl mx-auto">
            <h2 className="text-xl font-bold text-slate-900 mb-4" style={{ letterSpacing: '-0.01em' }}>Methodology</h2>
            <div className="space-y-3 text-[15px] text-slate-600 leading-relaxed">
              <p>
                There is no public registry of what auto repair shops charge, so most "labor rates by state" pages publish
                numbers with no explanation. This page shows its work instead.
              </p>
              <p>
                <strong className="text-slate-900">Wage data:</strong> the mean hourly wage for Automotive Service
                Technicians and Mechanics (occupation 49-3023) in each state, from the{' '}
                <a href={BLS_SOURCE_URL} target="_blank" rel="noopener noreferrer" className="text-orange-600 hover:underline">
                  BLS Occupational Employment and Wage Statistics
                </a>{' '}
                release for {BLS_RELEASE}.
              </p>
              <p>
                <strong className="text-slate-900">Rate estimate:</strong> a shop's posted labor rate typically runs
                {' '}{MULTIPLIER_LOW}–{MULTIPLIER_HIGH}× what it pays technicians — the difference covers rent, bays,
                equipment, insurance, service advisors, unbillable time, and profit. We apply that multiplier to each
                state's wage and round to the nearest $5.
              </p>
              <p>
                <strong className="text-slate-900">Limits:</strong> these are estimated ranges for independent shops.
                Dealership rates run higher; rural shops run lower; specialty work (European, diesel, EV) commands a
                premium. Data updates annually when BLS publishes new wage figures.
              </p>
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section className="px-6 py-12">
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
              Know your rate. Now see if your shops actually hit it.
            </h2>
            <p className="text-slate-500 text-sm mb-6">
              ShopCommand shows multi-location owners their revenue, repair orders, and technician efficiency across
              every shop in one dashboard. $100/mo for your first shop — no per-seat fees.
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
            <Link to="/tools/labor-rate-calculator" className="text-slate-400 hover:text-slate-600 text-xs transition-colors">Rate Calculator</Link>
            <Link to="/resources" className="text-slate-400 hover:text-slate-600 text-xs transition-colors">Resources</Link>
            <Link to="/terms" className="text-slate-400 hover:text-slate-600 text-xs transition-colors">Terms</Link>
            <Link to="/privacy" className="text-slate-400 hover:text-slate-600 text-xs transition-colors">Privacy</Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
