import { Link } from 'react-router-dom'
import { Check, Minus } from 'lucide-react'
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

// scWin: true = ShopCommand wins, false = Tekmetric wins, null = tie or not comparable
const rows = [
  { label: 'Pricing',                 sc: '$100/mo + $50/mo per shop · $175 + $100/mo per shop', them: 'Not disclosed, call required',           scWin: true },
  { label: 'Pricing transparency',    sc: 'Shown openly on our site',             them: 'Quote after a sales call',               scWin: true },
  { label: 'Multi-location dashboard', sc: 'Included at base price',              them: 'Multi-shop tools on higher tiers',       scWin: true },
  { label: 'Per-seat fees',           sc: 'Never',                                them: 'Priced per shop, not per user',          scWin: null },
  { label: 'Long-term contract',      sc: 'None, cancel anytime',                 them: 'Varies by agreement',                    scWin: true },
  { label: 'Time clock',              sc: 'Included',                             them: 'Included',                               scWin: null },
  { label: 'Founder access',          sc: 'Direct line, same-day fixes',          them: 'Established support team',               scWin: true },
  { label: 'Founding rate lock',      sc: '$100/mo + $50/shop locked forever',    them: 'No equivalent offer',                    scWin: true },
  { label: 'Track record',            sc: 'Early access, founding stage',         them: 'Years in market, thousands of shops',    scWin: false },
  { label: 'Verified reviews',        sc: 'Building toward it',                   them: '600+ G2 reviews, multiple badges',       scWin: false },
  { label: 'Tire module',             sc: 'Coming',                               them: 'Yes, fully built out',                   scWin: false },
  { label: 'CRM and marketing',       sc: 'Coming',                               them: 'Yes, dedicated module',                  scWin: false },
  { label: 'Two-way texting',         sc: 'Coming',                               them: 'Yes, mature feature',                    scWin: false },
  { label: 'Integrated payments',     sc: 'Coming',                               them: 'Fully embedded',                         scWin: false },
  { label: 'Parts and integrations',  sc: 'Coming',                               them: 'PartsTech, CARFAX, QuickBooks and more', scWin: false },
]

const TITLE = 'ShopCommand vs. Tekmetric | Auto Shop Software Comparison'
const DESC = 'Transparent pricing, no per-seat fees, and built for multi-location owners from day one. See how ShopCommand compares to Tekmetric. Founding spots at $100/mo.'
const URL = 'https://shopcommand.net/compare/tekmetric'
const LAST_UPDATED = 'November 11, 2026'

const compareFaqs = [
  { q: 'How much does Tekmetric cost per month?', a: 'Tekmetric doesn\'t publish pricing on their website. You need to book a demo and speak to sales to get a quote. ShopCommand is $100/mo for the first shop plus $50/mo for each additional location for founding members (locked forever), and $175/mo for the first shop plus $100/mo per additional location at standard launch pricing.' },
  { q: 'Can I switch from Tekmetric to ShopCommand?', a: 'Yes. ShopCommand is designed for quick setup, and you can be running the same day. We\'re building data import tools to make migration smoother. Founding members get direct support from Rasheed during onboarding. If you depend on Tekmetric\'s tire module, CRM, or embedded payments today, those are still on our roadmap, so check the table above before you move.' },
  { q: 'Is ShopCommand better than Tekmetric?', a: 'It depends on your needs. Tekmetric is a mature platform with 600+ G2 reviews, a built-in CRM, embedded payments, two-way texting, a tire module, and a wide integration ecosystem. If you want all of that today, Tekmetric wins. ShopCommand is built specifically for the owner managing multiple locations who needs cross-shop visibility at a transparent price without jumping between logins.' },
  { q: 'Does Tekmetric charge per seat?', a: 'Tekmetric prices per shop, not per user, but they don\'t publish the numbers, so you\'d confirm the details on a sales call. ShopCommand also charges per shop with unlimited users: $100/mo for the first shop plus $50/mo for each additional location, whether you have 2 people or 20 at each.' },
]

export default function VsTekmetric() {
  usePageMeta({
    title: TITLE,
    description: DESC,
    path: '/compare/tekmetric',
    schema: [
      { '@context': 'https://schema.org', '@type': 'Article', headline: TITLE, description: DESC, url: URL, dateModified: '2026-11-11', author: { '@type': 'Organization', name: 'ShopCommand' } },
      { '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: compareFaqs.map(({ q, a }) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a } })) },
    ],
    breadcrumbs: [
      { name: 'Home', path: '/' },
      { name: 'ShopCommand vs. Tekmetric' },
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
          ShopCommand vs. Tekmetric
        </h1>
        <p className="text-slate-500 text-base md:text-lg max-w-2xl mx-auto leading-relaxed">
          Tekmetric is a mature, full-featured shop management platform. ShopCommand is built for a different problem: the owner managing multiple locations who needs cross-shop visibility without jumping between logins.
        </p>
        <p className="text-slate-400 text-xs mt-4">Last updated: {LAST_UPDATED}</p>
      </section>

      {/* Table */}
      <section className="max-w-4xl mx-auto px-6 pb-20">
        <div className="rounded-lg border border-slate-200 overflow-hidden">
          {/* Header (desktop) */}
          <div className="hidden sm:grid grid-cols-3 bg-slate-50 border-b border-slate-200 px-6 py-4">
            <div className="text-slate-400 text-xs uppercase tracking-widest" />
            <div className="text-slate-400 text-xs text-center uppercase tracking-widest font-medium">Tekmetric</div>
            <div className="text-orange-600 text-xs text-center uppercase tracking-widest font-semibold">ShopCommand</div>
          </div>

          {rows.map(({ label, sc, them, scWin }, i) => (
            <div key={label}>
              {/* Desktop row */}
              <div className={`hidden sm:grid grid-cols-3 px-6 py-4 items-start gap-4 ${i < rows.length - 1 ? 'border-b border-slate-100' : ''}`}>
                <div className="text-slate-500 text-sm font-medium pt-0.5">{label}</div>
                <div className="text-center">
                  <span className={`text-xs leading-relaxed ${scWin === false ? 'text-slate-700 font-medium' : scWin === true ? 'text-slate-400' : 'text-slate-500'}`}>{them}</span>
                </div>
                <div className="text-center">
                  <span className={`text-xs leading-relaxed ${scWin === true ? 'text-orange-600 font-medium' : scWin === false ? 'text-slate-400' : 'text-slate-500'}`}>{sc}</span>
                </div>
              </div>
              {/* Mobile stacked */}
              <div className={`sm:hidden px-5 py-4 ${i < rows.length - 1 ? 'border-b border-slate-100' : ''}`}>
                <div className="text-slate-700 text-sm font-medium mb-2">{label}</div>
                <div className={`flex items-start gap-2 text-xs mb-1 ${scWin === false ? 'text-slate-700 font-semibold' : 'text-slate-400'}`}>
                  {scWin === false
                    ? <Check size={12} className="text-slate-600 flex-shrink-0 mt-0.5" strokeWidth={2.5} />
                    : <Minus size={12} className="text-slate-300 flex-shrink-0 mt-0.5" strokeWidth={2} />}
                  {them}
                </div>
                <div className={`flex items-start gap-2 text-xs ${scWin === true ? 'text-orange-600 font-semibold' : 'text-slate-400'}`}>
                  {scWin === true
                    ? <Check size={12} className="text-orange-500 flex-shrink-0 mt-0.5" strokeWidth={2.5} />
                    : <Minus size={12} className="text-slate-300 flex-shrink-0 mt-0.5" strokeWidth={2} />}
                  {sc}
                </div>
              </div>
            </div>
          ))}
        </div>

        <p className="text-slate-400 text-xs text-center mt-4">
          Tekmetric data sourced from their public website and G2 reviews. ShopCommand is in early access, and features marked "coming" are on the roadmap.
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
                heading: 'Tekmetric wins on features today.',
                body: 'If you have one location and want a mature platform with 600+ reviews, a built-in CRM, embedded payments, a tire module, two-way texting, and integrations with PartsTech, CARFAX, and QuickBooks, Tekmetric is the stronger product right now. It has been built out over years by a large team.',
              },
              {
                heading: 'ShopCommand is built for a different moment.',
                body: 'When you own three shops and spend your Fridays driving location to location to piece together how the week went, that\'s the problem ShopCommand is solving. Real-time cross-location visibility, owner-first, all in one dashboard, included at the base price.',
              },
              {
                heading: 'We\'re early. That\'s the point.',
                body: 'Founding members get the product at $100/mo + $50/shop locked forever, a direct line to the founder with same-day fixes, and a say in where the product goes. If you need Tekmetric\'s full feature set today, buy Tekmetric. If the multi-location dashboard and the price are what matter, this is the better bet.',
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
          <Link to="/login" className="px-6 py-3.5 rounded-lg text-base font-medium text-slate-500 hover:text-slate-900 border border-slate-200 hover:border-slate-300 transition-colors">
            See the dashboard
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
