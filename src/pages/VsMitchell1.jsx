import { Link } from 'react-router-dom'
import { Check } from 'lucide-react'
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
  { label: 'Pricing',              sc: '$100/mo + $50/mo per shop · $175 + $100/mo per shop', them: 'Not disclosed — contact sales',       scWin: true  },
  { label: 'Pricing transparency', sc: 'Shown openly on our site',           them: 'Hidden behind a sales process',       scWin: true  },
  { label: 'Multi-location view',  sc: 'Core product — day one',             them: 'Possible, not the core focus',        scWin: true  },
  { label: 'Cloud-native',         sc: 'Fully browser-based',                them: 'Desktop roots — partial cloud',       scWin: true  },
  { label: 'Setup time',           sc: 'Up and running same day',            them: 'Weeks — training required',           scWin: true  },
  { label: 'Per-seat fees',        sc: 'Never',                              them: 'Yes — per-user licensing',            scWin: true  },
  { label: 'Modern UI',            sc: 'Built in 2024',                      them: 'Legacy interface, incremental updates', scWin: true },
  { label: 'Founder access',       sc: 'Direct line, every founding member', them: 'Standard support queue',              scWin: true  },
  { label: 'Founding rate lock',   sc: '$100/mo + $50/shop locked forever',  them: 'No equivalent offer',                 scWin: true  },
  { label: 'Repair data / times',  sc: 'Coming',                             them: 'Industry-leading — ProDemand',        scWin: false },
  { label: 'Parts integrations',   sc: 'Coming',                             them: 'Extensive — deep supplier network',   scWin: false },
  { label: 'Market presence',      sc: 'Early access — founding stage',      them: '50,000+ shops',                       scWin: false },
  { label: 'Two-way texting',      sc: 'Coming',                             them: 'Available',                           scWin: false },
]

const TITLE = 'ShopCommand vs. Mitchell1 — Auto Shop Software Comparison'
const DESC = 'Mitchell1 is the legacy leader in repair data. ShopCommand is built for the owner sitting above their locations — transparent pricing, no per-seat fees, same-day setup. Founding spots at $100/mo.'
const URL = 'https://shopcommand.net/compare/mitchell1'

const LAST_UPDATED = 'June 2, 2026'

const compareFaqs = [
  { q: 'How much does Mitchell1 cost per month?', a: 'Mitchell1 doesn\'t publish pricing — you need to contact sales for a quote. ShopCommand is $100/mo for the first shop plus $50/mo for each additional location for founding members (locked forever), and $175/mo for the first shop plus $100/mo per additional location at standard launch pricing.' },
  { q: 'Can I switch from Mitchell1 to ShopCommand?', a: 'Yes. ShopCommand is cloud-native and sets up in a day — no desktop installation, no Windows server. Founding members get direct onboarding support from Rasheed.' },
  { q: 'Is Mitchell1 better than ShopCommand?', a: 'Mitchell1 has industry-leading repair data (ProDemand) and 50,000+ shops. If your techs live in repair data and wiring diagrams all day, Mitchell1 is strong. ShopCommand is built for the owner layer — real-time visibility across multiple locations without legacy desktop software.' },
  { q: 'Does Mitchell1 work on mobile?', a: 'Mitchell1 grew up as a Windows desktop application. Cloud access is an incremental update. ShopCommand is fully browser-based and works on any device from day one.' },
]

export default function VsMitchell1() {
  usePageMeta({
    title: TITLE,
    description: DESC,
    path: '/compare/mitchell1',
    schema: [
      { '@context': 'https://schema.org', '@type': 'Article', headline: TITLE, description: DESC, url: URL, dateModified: '2026-06-02', author: { '@type': 'Organization', name: 'ShopCommand' } },
      { '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: compareFaqs.map(({ q, a }) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a } })) },
    ],
    breadcrumbs: [
      { name: 'Home', path: '/' },
      { name: 'ShopCommand vs. Mitchell1' },
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
        <h1 className="text-4xl md:text-5xl font-bold text-slate-900 mb-5" style={{ letterSpacing: '-0.03em' }}>
          ShopCommand vs. Mitchell1
        </h1>
        <p className="text-slate-500 text-base md:text-lg max-w-2xl mx-auto leading-relaxed">
          Mitchell1 is the industry standard for repair data and labor times. ShopCommand is built for a different problem — the owner who needs real-time visibility across all their locations without a legacy desktop application.
        </p>
      </section>

      {/* Table */}
      <section className="max-w-4xl mx-auto px-6 pb-20">
        <div className="rounded-2xl border border-slate-200 overflow-hidden">
          {/* Header — desktop */}
          <div className="hidden sm:grid grid-cols-3 bg-slate-50 border-b border-slate-200 px-6 py-4">
            <div className="text-slate-400 text-xs uppercase tracking-widest" />
            <div className="text-slate-400 text-xs text-center uppercase tracking-widest font-medium">Mitchell1</div>
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
          Mitchell1 data sourced from their public website and G2 reviews. ShopCommand is in early access — features marked "coming" are on the roadmap.
        </p>
      </section>

      {/* The honest take */}
      <section className="border-t border-slate-200 py-20 px-6">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-bold text-slate-900 mb-8" style={{ letterSpacing: '-0.02em' }}>
            The honest take
          </h2>
          <div className="space-y-6">
            {[
              {
                heading: 'Mitchell1 owns the repair data layer.',
                body: 'ProDemand is genuinely best-in-class for labor times, wiring diagrams, and repair procedures. If your techs live in repair data all day, Mitchell1 has built something over decades that\'s hard to replicate. Manager SE handles the shop management side, and the two are tightly integrated.',
              },
              {
                heading: 'The desktop model is the friction.',
                body: 'Mitchell1 grew up as a Windows application. The cloud story is an incremental update on top of that heritage — not a ground-up rethink. For shop owners trying to check in from their phone on a Saturday, or see across three locations without VPN access to a server, the experience shows its age.',
              },
              {
                heading: 'Different tools for different jobs.',
                body: 'If you need deep repair data integrated with your ROs, Mitchell1 is worth the call. If you need a clean, fast view across your locations with transparent pricing and no IT setup, ShopCommand is built for that. Many shops end up using both.',
              },
              {
                heading: 'We\'re early. That\'s the point.',
                body: 'Founding members get $100/mo + $50/shop locked forever, direct access to Rasheed, and a real say in the roadmap. You\'re not buying a finished product — you\'re getting in at the ground floor with the pricing to match.',
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
          <h2 className="text-2xl md:text-3xl font-bold text-slate-900 mb-8" style={{ letterSpacing: '-0.02em' }}>
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
        <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4" style={{ letterSpacing: '-0.02em' }}>
          Ready to see it for yourself?
        </h2>
        <p className="text-slate-500 mb-8 max-w-sm mx-auto leading-relaxed">25 founding spots starting at $100/mo locked forever. Price goes to $175 at public launch.</p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <a href="/#founding" className="px-7 py-3.5 rounded-xl text-base font-semibold bg-orange-500 hover:bg-orange-600 text-white transition-colors shadow-sm">
            Reserve a founding spot →
          </a>
          <Link to="/login" className="px-6 py-3.5 rounded-xl text-base font-medium text-slate-500 hover:text-slate-900 border border-slate-200 hover:border-slate-300 transition-colors">
            See the dashboard
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer aria-label="Page footer" className="border-t border-slate-200 px-6 md:px-12 py-8 flex items-center justify-between flex-wrap gap-4">
        <Link to="/" aria-label="ShopCommand home" className="flex items-center gap-2 hover:opacity-70 transition-opacity">
          <HexMark size={22} />
          <span className="text-slate-400 text-sm">ShopCommand</span>
        </Link>
        <div className="flex flex-wrap gap-5">
          <Link to="/compare/tekmetric"   className="text-slate-400 hover:text-slate-600 text-xs transition-colors">vs. Tekmetric</Link>
          <Link to="/compare/shopmonkey"  className="text-slate-400 hover:text-slate-600 text-xs transition-colors">vs. Shopmonkey</Link>
          <Link to="/compare/shop-ware"   className="text-slate-400 hover:text-slate-600 text-xs transition-colors">vs. Shop-Ware</Link>
          <Link to="/compare/ro-writer"   className="text-slate-400 hover:text-slate-600 text-xs transition-colors">vs. R.O. Writer</Link>
          <Link to="/terms"  className="text-slate-400 hover:text-slate-600 text-xs transition-colors">Terms</Link>
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
