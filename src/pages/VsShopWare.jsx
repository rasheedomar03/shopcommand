import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Check } from 'lucide-react'
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
  { label: 'Pricing',              sc: '$100/mo founding · $175 standard',  them: 'Not disclosed — demo required',       scWin: true  },
  { label: 'Pricing transparency', sc: 'Shown openly on our site',           them: 'Hidden behind a sales call',          scWin: true  },
  { label: 'Multi-location view',  sc: 'Core product — day one',             them: 'Available, single-location focus',    scWin: true  },
  { label: 'Setup time',           sc: 'Up and running same day',            them: 'Guided onboarding process',           scWin: true  },
  { label: 'Feature tiers',        sc: 'One plan, everything included',      them: 'Multiple tiers — features gated',     scWin: true  },
  { label: 'Founder access',       sc: 'Direct line, every founding member', them: 'Standard support queue',              scWin: true  },
  { label: 'Founding rate lock',   sc: '$100/mo locked forever',             them: 'No equivalent offer',                 scWin: true  },
  { label: 'Digital inspections',  sc: 'Coming',                             them: 'Best-in-class — core feature',        scWin: false },
  { label: 'Customer texting',     sc: 'Coming',                             them: 'Yes — built in',                      scWin: false },
  { label: 'Workflow automation',  sc: 'Coming',                             them: 'Strong — built-in automation',        scWin: false },
  { label: 'Shops using it',       sc: 'Early access — founding stage',      them: '1,000+ shops',                        scWin: false },
]

const TITLE = 'ShopCommand vs. Shop-Ware — Auto Shop Software Comparison'
const DESC = 'Shop-Ware has excellent digital inspections and customer texting. ShopCommand is built for the multi-location owner who needs cross-shop visibility with transparent pricing. Founding spots at $100/mo.'
const URL = 'https://shopcommand.net/compare/shop-ware'

const LAST_UPDATED = 'June 2, 2026'

const compareFaqs = [
  { q: 'How much does Shop-Ware cost per month?', a: 'Shop-Ware doesn\'t publish pricing — you need to book a demo. ShopCommand is $100/mo per location for founding members (locked forever) and $175/mo standard after launch.' },
  { q: 'Can I switch from Shop-Ware to ShopCommand?', a: 'Yes. ShopCommand is designed for same-day setup with no complex onboarding process. Founding members get direct support from Rasheed during migration.' },
  { q: 'Is Shop-Ware better than ShopCommand?', a: 'Shop-Ware has excellent digital inspections and customer texting — great for single-location customer communication. ShopCommand is built for the owner managing multiple locations who needs consolidated visibility across all shops without switching between accounts.' },
  { q: 'Does Shop-Ware support multiple locations?', a: 'Shop-Ware focuses on single-location operations. ShopCommand is built from the ground up for the multi-location owner who needs cross-shop visibility, consolidated reporting, and one dashboard for everything.' },
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

export default function VsShopWare() {
  useEffect(() => {
    setMeta(TITLE, DESC, URL)
    const schema = { '@context': 'https://schema.org', '@type': 'Article', 'headline': TITLE, 'description': DESC, 'url': URL, 'dateModified': '2026-06-02', 'author': { '@type': 'Organization', 'name': 'ShopCommand' } }
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
          ShopCommand vs. Shop-Ware
        </h1>
        <p className="text-slate-500 text-base md:text-lg max-w-2xl mx-auto leading-relaxed">
          Shop-Ware is a modern, well-designed platform with excellent digital inspections and customer communication. ShopCommand is built for a different problem — the owner who needs a real-time view across all their locations at once.
        </p>
      </section>

      {/* Table */}
      <section className="max-w-4xl mx-auto px-6 pb-20">
        <div className="rounded-2xl border border-slate-200 overflow-hidden">
          {/* Header — desktop */}
          <div className="hidden sm:grid grid-cols-3 bg-slate-50 border-b border-slate-200 px-6 py-4">
            <div className="text-slate-400 text-xs uppercase tracking-widest" />
            <div className="text-slate-400 text-xs text-center uppercase tracking-widest font-medium">Shop-Ware</div>
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
          Shop-Ware data sourced from their public website and G2 reviews. ShopCommand is in early access — features marked "coming" are on the roadmap.
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
                heading: 'Shop-Ware is genuinely well built.',
                body: 'The digital inspection experience is one of the best in the industry — customers get photo-rich inspection reports, can approve work from their phone, and get two-way text updates throughout the process. If customer communication and DVI are your priority for a single location, Shop-Ware is worth a serious look.',
              },
              {
                heading: 'The pricing model is opaque.',
                body: 'You can\'t find a number on their website. You book a demo, talk to sales, and get a quote. For an owner trying to evaluate five different platforms without six sales calls, that friction is real. ShopCommand shows you $100/mo founding and $175 standard right on the page.',
              },
              {
                heading: 'ShopCommand is built for the owner layer.',
                body: 'Shop-Ware is excellent at running one shop\'s day-to-day operations. ShopCommand is built for the person sitting above all their locations — consolidated revenue, open ROs across every shop, technician status everywhere, without switching between accounts.',
              },
              {
                heading: 'We\'re early. That\'s the point.',
                body: 'Founding members get $100/mo locked forever, direct access to Rasheed, and a real say in the roadmap. You\'re not buying a finished product — you\'re shaping what comes next.',
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
      <footer aria-label="Page footer" className="border-t border-slate-200 px-6 md:px-12 py-8 flex items-center justify-between flex-wrap gap-4">
        <Link to="/" aria-label="ShopCommand home" className="flex items-center gap-2 hover:opacity-70 transition-opacity">
          <HexMark size={22} />
          <span className="text-slate-400 text-sm">ShopCommand</span>
        </Link>
        <div className="flex flex-wrap gap-5">
          <Link to="/compare/tekmetric"  className="text-slate-400 hover:text-slate-600 text-xs transition-colors">vs. Tekmetric</Link>
          <Link to="/compare/shopmonkey" className="text-slate-400 hover:text-slate-600 text-xs transition-colors">vs. Shopmonkey</Link>
          <Link to="/compare/mitchell1"  className="text-slate-400 hover:text-slate-600 text-xs transition-colors">vs. Mitchell1</Link>
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
