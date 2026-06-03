import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Check, X, Minus } from 'lucide-react'
import { CookieBanner } from '@/components/CookieBanner'
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
  { label: 'Pricing',              sc: '$100/mo founding · $175 standard',   them: 'Not disclosed — demo required',     scWin: true  },
  { label: 'Pricing transparency', sc: 'Shown openly on our site',            them: 'Hidden behind a sales call',        scWin: true  },
  { label: 'Multi-location view',  sc: 'Core product — day one',              them: 'Available, but not the core focus', scWin: true  },
  { label: 'Setup time',           sc: 'Up and running same day',             them: 'Enterprise onboarding process',     scWin: true  },
  { label: 'Per-seat fees',        sc: 'Never',                               them: 'Yes',                               scWin: true  },
  { label: 'Feature tiers',        sc: 'One plan, everything included',       them: 'Multiple tiers — basics gated',     scWin: true  },
  { label: 'Founder access',       sc: 'Direct line, every founding member',  them: 'Standard support team',             scWin: true  },
  { label: 'Founding rate lock',   sc: '$100/mo locked forever',              them: 'No equivalent offer',               scWin: true  },
  { label: 'Shops using it',       sc: 'Early access — founding stage',       them: '8,000+ shops',                      scWin: false },
  { label: 'Two-way texting',      sc: 'Coming',                              them: 'Yes — all plans',                   scWin: false },
  { label: 'Buy Now Pay Later',    sc: 'Coming',                              them: 'Yes — integrated',                  scWin: false },
  { label: 'Multi-language',       sc: 'English',                             them: 'English, French, Spanish',          scWin: false },
  { label: 'Built-in CRM',        sc: 'Coming',                              them: 'Yes — CRM Essentials',              scWin: false },
]

const SM_TITLE = 'ShopCommand vs. Shopmonkey — Auto Shop Software Comparison'
const SM_DESC = 'No demo required, no hidden pricing. See how ShopCommand compares to Shopmonkey on price transparency, multi-location focus, and setup time. Founding spots at $100/mo.'
const SM_URL = 'https://shopcommand.net/compare/shopmonkey'

const LAST_UPDATED = 'June 2, 2026'

const compareFaqs = [
  { q: 'How much does Shopmonkey cost per month?', a: 'Shopmonkey doesn\'t publish pricing — you need to book a demo. ShopCommand is $100/mo per location for founding members (locked forever) and $175/mo standard after launch.' },
  { q: 'Can I switch from Shopmonkey to ShopCommand?', a: 'Yes. ShopCommand is designed for same-day setup. We\'re building data import tools to make migration smoother. Founding members get direct support from Rasheed during onboarding.' },
  { q: 'Is ShopCommand better than Shopmonkey for multiple locations?', a: 'ShopCommand is built specifically for multi-location visibility — seeing all your shops from one dashboard without jumping between logins. Shopmonkey supports multiple locations but isn\'t built around that problem first.' },
  { q: 'Does Shopmonkey charge per seat?', a: 'Yes, Shopmonkey uses per-seat pricing. ShopCommand charges per location with unlimited users included — no per-seat fees ever.' },
]

function setMeta(title, desc, url) {
  document.title = title
  document.querySelector('meta[name="description"]')?.setAttribute('content', desc)
  document.querySelector('meta[property="og:title"]')?.setAttribute('content', title)
  document.querySelector('meta[property="og:description"]')?.setAttribute('content', desc)
  document.querySelector('meta[property="og:url"]')?.setAttribute('content', url)
  document.querySelector('meta[name="twitter:title"]')?.setAttribute('content', title)
  document.querySelector('meta[name="twitter:description"]')?.setAttribute('content', desc)
  document.querySelector('link[rel="canonical"]')?.setAttribute('href', url)
}

export default function VsShopmonkey() {
  useEffect(() => {
    setMeta(SM_TITLE, SM_DESC, SM_URL)
    const schema = { '@context': 'https://schema.org', '@type': 'Article', 'headline': SM_TITLE, 'description': SM_DESC, 'url': SM_URL, 'dateModified': '2026-06-02', 'author': { '@type': 'Organization', 'name': 'ShopCommand' } }
    const s = document.createElement('script'); s.type = 'application/ld+json'; s.id = 'sc-compare-schema'; s.text = JSON.stringify(schema)
    document.head.appendChild(s)
    const faqSchema = { '@context': 'https://schema.org', '@type': 'FAQPage', 'mainEntity': compareFaqs.map(({ q, a }) => ({ '@type': 'Question', 'name': q, 'acceptedAnswer': { '@type': 'Answer', 'text': a } })) }
    const f = document.createElement('script'); f.type = 'application/ld+json'; f.id = 'sc-faq-schema'; f.text = JSON.stringify(faqSchema)
    document.head.appendChild(f)
    return () => { document.getElementById('sc-compare-schema')?.remove(); document.getElementById('sc-faq-schema')?.remove() }
  }, [])

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
          ShopCommand vs. Shopmonkey
        </h1>
        <p className="text-slate-500 text-base md:text-lg max-w-2xl mx-auto leading-relaxed">
          Shopmonkey is a proven platform running 8,000+ shops. ShopCommand is built for a different problem — the owner who needs to see across all their locations at once, with transparent pricing and no enterprise complexity.
        </p>
      </section>

      {/* Table */}
      <section className="max-w-4xl mx-auto px-6 pb-20">
        <div className="rounded-2xl border border-slate-200 overflow-hidden">
          {/* Header — desktop */}
          <div className="hidden sm:grid grid-cols-3 bg-slate-50 border-b border-slate-200 px-6 py-4">
            <div className="text-slate-400 text-xs uppercase tracking-widest" />
            <div className="text-slate-400 text-xs text-center uppercase tracking-widest font-medium">Shopmonkey</div>
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
          Shopmonkey data sourced from their public website and G2 reviews. ShopCommand is in early access — features marked "coming" are on the roadmap.
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
                heading: 'Shopmonkey has the scale and the features.',
                body: '8,000+ shops, two-way texting in every plan, multi-language support, Buy Now Pay Later, a full CRM — Shopmonkey is a mature platform that\'s been investing in their product for years. If you want a tool with that depth right now, they\'re a serious option.',
              },
              {
                heading: 'The pricing model is a real difference.',
                body: 'Shopmonkey doesn\'t publish pricing. You book a demo, talk to sales, and get a quote. ShopCommand shows you $100/mo founding and $175 standard, right on the page. Per-seat fees vs. per-location — for a shop with 8 techs, that difference adds up fast.',
              },
              {
                heading: 'ShopCommand is built for the multi-location owner first.',
                body: 'Shopmonkey serves all shop types. ShopCommand is built specifically around the person sitting above multiple locations who needs a real-time view across all of them without leaving their desk. Different focus, different design decisions.',
              },
              {
                heading: 'We\'re early. That\'s the point.',
                body: 'Founding members get $100/mo locked forever, direct access to Rasheed, and a real say in the roadmap. You\'re not buying a finished product — you\'re getting in at the ground floor.',
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
        <p className="text-slate-500 mb-8 max-w-sm mx-auto leading-relaxed">25 founding spots at $100/mo locked forever. Price goes to $175 at public launch.</p>
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
      <footer aria-label="Page footer" className="border-t border-slate-200 px-6 md:px-12 py-8 flex items-center justify-between">
        <Link to="/" aria-label="ShopCommand home" className="flex items-center gap-2 hover:opacity-70 transition-opacity">
          <HexMark size={22} />
          <span className="text-slate-400 text-sm">ShopCommand</span>
        </Link>
        <div className="flex flex-wrap gap-5">
          <Link to="/compare/tekmetric"  className="text-slate-400 hover:text-slate-600 text-xs transition-colors">vs. Tekmetric</Link>
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
