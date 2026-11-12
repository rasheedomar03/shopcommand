import { Link } from 'react-router-dom'
import { Check, X, Minus } from 'lucide-react'
import { CookieBanner } from '@/components/CookieBanner'
import { usePageMeta } from '@/lib/seo'
import { CompareNav } from '@/components/CompareNav'

function HexMark({ size = 36 }) {
  const pts = (cx, cy, r) =>
    [90, 30, -30, -90, -150, 150]
      .map(deg => {
        const a = (deg * Math.PI) / 180
        return `${(cx + r * Math.cos(a)).toFixed(2)},${(cy - r * Math.sin(a)).toFixed(2)}`
      })
      .join(' ')
  const R = 28, r = R * 0.56
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" role="img" aria-hidden="true">
      <polygon points={pts(32, 32, R)} fill="#F97316" />
      <polygon points={pts(32, 32.5, r)} fill="#0D0E14" />
    </svg>
  )
}

const rows = [
  { label: 'Pricing',               sc: '$100/mo + $50/mo per shop, published openly',       them: 'Express plan listed at $149/mo (1 user); Basic, Pro, and Elite require a sales call', scWin: true },
  { label: 'Per-seat fees',         sc: 'Never. Unlimited users per shop',                   them: 'Plans are scoped by user count, with additional users priced separately', scWin: true },
  { label: 'Multi-location view',   sc: 'Core product, one dashboard across shops',          them: 'Per-location plans; multi-shop view not the core focus',   scWin: true },
  { label: 'Built-in time clock',   sc: 'Included, tied to jobs and efficiency',             them: 'Timesheet users are a separate per-user add-on',          scWin: true },
  { label: 'Setup time',            sc: 'Up and running same day',                           them: 'Reviewers describe a real learning curve during setup',   scWin: true },
  { label: 'Founder access',        sc: 'Direct line, bug fixes often same day',             them: 'Standard support team (well reviewed)',                   scWin: true },
  { label: 'Founding rate lock',    sc: '$100/mo + $50/shop locked forever',                 them: 'No equivalent offer',                                     scWin: true },
  { label: 'Heavy-duty depth',      sc: 'Early. Core RO, parts, and invoicing work today',   them: 'Purpose-built for heavy-duty for roughly a decade',       scWin: false },
  { label: 'Preventive maintenance', sc: 'Coming',                                           them: 'Yes, PM scheduling is a core feature',                    scWin: false },
  { label: 'Fleet customer portal', sc: 'Customer status page today; full portal coming',    them: 'Yes, approvals and repair status for fleet customers',    scWin: false },
  { label: 'QuickBooks integration', sc: 'Coming',                                           them: 'Yes, established integration',                            scWin: false },
  { label: 'Years in market',       sc: 'Founded 2026, early access',                        them: 'Established heavy-duty platform with years of reviews',   scWin: false },
]

function Tick({ win }) {
  if (win === true)  return <Check size={15} className="text-orange-600 mx-auto" strokeWidth={2.5} />
  if (win === false) return <Minus size={15} className="text-slate-400 mx-auto" strokeWidth={2} />
  return <X size={15} className="text-slate-400 mx-auto" strokeWidth={2} />
}

const TITLE = 'ShopCommand vs. Fullbay | Truck Repair Software Comparison'
const DESC = 'An honest comparison of ShopCommand and Fullbay for heavy-duty and truck repair shops: pricing, per-seat fees, multi-location dashboards, and where each one wins.'
const URL = 'https://shopcommand.net/compare/fullbay'
const LAST_UPDATED = 'November 11, 2026'

const compareFaqs = [
  { q: 'How much does Fullbay cost?', a: 'Fullbay lists one price publicly: the Express plan at $149/mo with one user license, aimed at mobile and single-person operations. The Basic, Pro, and Elite plans require a sales call for a quote, and plans are scoped by user count with additional users priced separately. ShopCommand publishes everything: $100/mo for the first shop plus $50/mo per additional location for founding members (locked forever), $175/mo plus $100/mo per location at standard pricing, unlimited users included.' },
  { q: 'What is the best Fullbay alternative?', a: 'It depends on what you need. If you want the deepest heavy-duty feature set available today, including preventive maintenance scheduling and a fleet customer portal, Fullbay has been building that for years and is hard to beat on depth. If you want flat per-shop pricing with no per-user fees, a multi-location dashboard, and a direct line to the person building the software, ShopCommand is built for exactly that. Our full roundup is at /alternatives/fullbay.' },
  { q: 'Does ShopCommand work for diesel and truck repair shops?', a: 'Yes. Our first founding customer is a truck repair shop in Illinois. Heavy-duty work shaped the product early: per-job custom parts with per-truck pricing, job timers that span multi-day repair orders, partial payments for fleet accounts, and invoices emailed under your shop\'s name. Some heavy-duty specifics like PM scheduling are still on the roadmap, and we say so plainly.' },
  { q: 'Does Fullbay charge per user?', a: 'Fullbay\'s plans are scoped by user count. Basic covers one location and up to five users, with additional users priced separately, and timesheet users are listed at $25 on their comparison table. ShopCommand never charges per seat: every plan includes unlimited users, so adding a tech or an advisor never changes your bill.' },
]

export default function VsFullbay() {
  usePageMeta({
    title: TITLE,
    description: DESC,
    path: '/compare/fullbay',
    schema: [
      { '@context': 'https://schema.org', '@type': 'Article', headline: TITLE, description: DESC, url: URL, dateModified: '2026-11-11', author: { '@type': 'Organization', name: 'ShopCommand' } },
      { '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: compareFaqs.map(({ q, a }) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a } })) },
    ],
    breadcrumbs: [
      { name: 'Home', path: '/' },
      { name: 'ShopCommand vs. Fullbay' },
    ],
  })

  return (
    <div className="min-h-screen bg-[#FAFAF8] text-slate-900 overflow-x-hidden">
      <a href="#main-content" className="skip-link">Skip to main content</a>

      <CompareNav />

      <main id="main-content">
      {/* Hero */}
      <section className="max-w-4xl mx-auto px-6 pt-20 pb-16 text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-slate-200 bg-slate-100 text-slate-500 text-xs font-medium mb-6">
          Comparison
        </div>
        <h1 className="font-display text-4xl md:text-5xl font-bold text-slate-900 mb-5" style={{ letterSpacing: '-0.01em' }}>
          ShopCommand vs. Fullbay
        </h1>
        <p className="text-slate-500 text-base md:text-lg max-w-2xl mx-auto leading-relaxed">
          Fullbay is the established name in heavy-duty repair shop software. ShopCommand is the new option: flat per-shop pricing published openly, no per-user fees, and a multi-location dashboard, built in the open with truck shops on board from day one.
        </p>
      </section>

      {/* Table */}
      <section className="max-w-4xl mx-auto px-6 pb-20">
        <div className="rounded-lg border border-slate-200 overflow-hidden">
          {/* Header, desktop */}
          <div className="hidden sm:grid grid-cols-3 bg-slate-50 border-b border-slate-200 px-6 py-4">
            <div className="text-slate-400 text-xs uppercase tracking-widest" />
            <div className="text-slate-400 text-xs text-center uppercase tracking-widest font-medium">Fullbay</div>
            <div className="text-orange-600 text-xs text-center uppercase tracking-widest font-semibold">ShopCommand</div>
          </div>

          {rows.map(({ label, sc, them, scWin }, i) => (
            <div key={label}>
              {/* Desktop row */}
              <div className={`hidden sm:grid grid-cols-3 px-6 py-4 items-start gap-4 ${i < rows.length - 1 ? 'border-b border-slate-100' : ''}`}>
                <div className="text-slate-500 text-sm font-medium pt-0.5">{label}</div>
                <div className="text-center">
                  <span className={`text-xs leading-relaxed ${scWin ? 'text-slate-400' : 'text-slate-500'}`}>{them}</span>
                </div>
                <div className="text-center">
                  <span className={`text-xs leading-relaxed font-medium ${scWin ? 'text-orange-600' : 'text-slate-400'}`}>{sc}</span>
                </div>
              </div>
              {/* Mobile stacked */}
              <div className={`sm:hidden px-5 py-4 ${i < rows.length - 1 ? 'border-b border-slate-100' : ''}`}>
                <div className="text-slate-700 text-sm font-medium mb-2">{label}</div>
                <div className="flex items-start gap-2 text-xs text-slate-400 mb-1">
                  <span className="text-slate-300 flex-shrink-0">✕</span> {them}
                </div>
                <div className="flex items-start gap-2 text-xs text-orange-600 font-semibold">
                  <Check size={12} className="text-orange-500 flex-shrink-0 mt-0.5" strokeWidth={2.5} /> {sc}
                </div>
              </div>
            </div>
          ))}
        </div>

        <p className="text-slate-400 text-xs text-center mt-4">
          Fullbay data sourced from their public pricing page and third-party review sites as of November 2026. ShopCommand is in early access; features marked "coming" are on the roadmap.
        </p>
      </section>

      {/* The honest take */}
      <section className="border-t border-slate-200 py-20 px-6">
        <div className="max-w-3xl mx-auto">
          <h2 className="font-display text-2xl md:text-3xl font-bold text-slate-900 mb-8" style={{ letterSpacing: '-0.01em' }}>
            The honest take
          </h2>
          <div className="space-y-6">
            {[
              {
                heading: 'Fullbay has real heavy-duty depth.',
                body: 'Preventive maintenance scheduling, a customer portal where fleet managers approve work and watch repair status, parts inventory, invoicing, and an established QuickBooks integration. It has been built for heavy-duty shops for years, and reviewers consistently rate the product and its support well. If you need all of that today, Fullbay earns its position.',
              },
              {
                heading: 'ShopCommand wins on pricing and visibility.',
                body: 'Every price is published on our site: $100/mo for the first shop plus $50/mo per additional location for founding members, no per-user fees ever. Fullbay\'s plans are scoped by user count, so the bill grows with your team. And if you run more than one location, ShopCommand puts every shop in one dashboard, because that is the problem it was built to solve.',
              },
              {
                heading: 'We are early, and truck shops are already shaping the product.',
                body: 'Our first founding customer is a truck repair shop in Illinois. They filed six bug reports in their first weeks; every one was fixed the same day. That is what founding membership means here: a locked-forever rate and a direct line to the person writing the code.',
              },
            ].map(({ heading, body }) => (
              <div key={heading} className="flex gap-5">
                <div className="w-1 rounded-full bg-orange-400/40 flex-shrink-0 mt-1" />
                <div>
                  <div className="text-slate-900 text-sm font-semibold mb-1.5">{heading}</div>
                  <p className="text-slate-500 text-sm leading-relaxed">{body}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="border-t border-slate-200 py-20 px-6">
        <div className="max-w-3xl mx-auto">
          <h2 className="font-display text-2xl md:text-3xl font-bold text-slate-900 mb-8" style={{ letterSpacing: '-0.01em' }}>
            Frequently asked questions
          </h2>
          <div className="space-y-6">
            {compareFaqs.map(({ q, a }) => (
              <div key={q}>
                <h3 className="text-slate-900 text-sm font-semibold mb-2">{q}</h3>
                <p className="text-slate-500 text-sm leading-relaxed">{a}</p>
              </div>
            ))}
          </div>
          <p className="text-slate-400 text-xs mt-10">Last updated: {LAST_UPDATED}</p>
        </div>
      </section>

      {/* CTA */}
      <section className="border-t border-slate-200 py-20 px-6 text-center">
        <h2 className="font-display text-3xl md:text-4xl font-bold text-slate-900 mb-4" style={{ letterSpacing: '-0.01em' }}>
          Ready to see it for yourself?
        </h2>
        <p className="text-slate-500 mb-8 max-w-sm mx-auto leading-relaxed">25 founding spots starting at $100/mo locked forever. Price goes to $175 at public launch.</p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <a href="/#founding" className="px-7 py-3.5 rounded-lg text-base font-semibold bg-orange-500 hover:bg-orange-600 text-white transition-colors shadow-sm">
            Reserve a founding spot →
          </a>
          <Link to="/truck-repair-shop-software" className="px-6 py-3.5 rounded-lg text-base font-medium text-slate-500 hover:text-slate-900 border border-slate-200 hover:border-slate-300 transition-colors">
            ShopCommand for truck shops
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer aria-label="Page footer" className="border-t border-slate-200 px-6 md:px-12 py-8 flex items-center justify-between">
        <Link to="/" aria-label="ShopCommand home" className="flex items-center gap-2 hover:opacity-70 transition-opacity">
          <HexMark size={22} />
          <span className="text-slate-400 text-sm">ShopCommand</span>
        </Link>
        <div className="flex flex-wrap gap-5">
          <Link to="/compare/tekmetric"  className="text-slate-400 hover:text-slate-600 text-xs transition-colors">vs. Tekmetric</Link>
          <Link to="/compare/shopmonkey" className="text-slate-400 hover:text-slate-600 text-xs transition-colors">vs. Shopmonkey</Link>
          <Link to="/compare/mitchell1"  className="text-slate-400 hover:text-slate-600 text-xs transition-colors">vs. Mitchell1</Link>
          <Link to="/compare/shop-ware"  className="text-slate-400 hover:text-slate-600 text-xs transition-colors">vs. Shop-Ware</Link>
          <Link to="/compare/ro-writer"  className="text-slate-400 hover:text-slate-600 text-xs transition-colors">vs. R.O. Writer</Link>
          <Link to="/terms"   className="text-slate-400 hover:text-slate-600 text-xs transition-colors">Terms</Link>
          <Link to="/privacy" className="text-slate-400 hover:text-slate-600 text-xs transition-colors">Privacy</Link>
          <Link to="/cookies" className="text-slate-400 hover:text-slate-600 text-xs transition-colors">Cookies</Link>
          <Link to="/accessibility" className="text-slate-400 hover:text-slate-600 text-xs transition-colors">Accessibility</Link>
        </div>
      </footer>
      </main>

      <CookieBanner />
    </div>
  )
}
