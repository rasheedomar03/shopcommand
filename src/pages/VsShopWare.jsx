import { useEffect } from 'react'
import { Link } from 'react-router-dom'
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
    <svg width={size} height={size} viewBox="0 0 64 64">
      <polygon points={pts(32, 32, R)} fill="#F97316" />
      <polygon points={pts(32, 32.5, r)} fill="#FAFAF8" />
    </svg>
  )
}

const rows = [
  { label: 'Pricing',              sc: '$125/mo founding · $199 standard',  them: 'Not disclosed — demo required',       scWin: true  },
  { label: 'Pricing transparency', sc: 'Shown openly on our site',           them: 'Hidden behind a sales call',          scWin: true  },
  { label: 'Multi-location view',  sc: 'Core product — day one',             them: 'Available, single-location focus',    scWin: true  },
  { label: 'Setup time',           sc: 'Up and running same day',            them: 'Guided onboarding process',           scWin: true  },
  { label: 'Feature tiers',        sc: 'One plan, everything included',      them: 'Multiple tiers — features gated',     scWin: true  },
  { label: 'Founder access',       sc: 'Direct line, every founding member', them: 'Standard support queue',              scWin: true  },
  { label: 'Founding rate lock',   sc: '$125/mo locked forever',             them: 'No equivalent offer',                 scWin: true  },
  { label: 'Digital inspections',  sc: 'Coming',                             them: 'Best-in-class — core feature',        scWin: false },
  { label: 'Customer texting',     sc: 'Coming',                             them: 'Yes — built in',                      scWin: false },
  { label: 'Workflow automation',  sc: 'Coming',                             them: 'Strong — built-in automation',        scWin: false },
  { label: 'Shops using it',       sc: 'Early access — founding stage',      them: '1,000+ shops',                        scWin: false },
]

const TITLE = 'ShopCommand vs. Shop-Ware — Auto Shop Software Comparison'
const DESC = 'Shop-Ware has excellent digital inspections and customer texting. ShopCommand is built for the multi-location owner who needs cross-shop visibility with transparent pricing. Founding spots at $125/mo.'
const URL = 'https://shopcommand.net/compare/shop-ware'

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
  useEffect(() => { setMeta(TITLE, DESC, URL) }, [])

  return (
    <div className="min-h-screen bg-[#FAFAF8] text-slate-900 overflow-x-hidden" style={{ fontFamily: '"General Sans", system-ui, sans-serif' }}>

      <CompareNav />

      {/* Hero */}
      <section className="max-w-4xl mx-auto px-6 pt-20 pb-16 text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-slate-200 bg-slate-100 text-slate-500 text-xs font-medium mb-6">
          Comparison
        </div>
        <h1 className="text-4xl md:text-5xl font-bold text-slate-900 mb-5" style={{ fontFamily: '"Gambetta", Georgia, serif', letterSpacing: '-0.03em' }}>
          ShopCommand vs. Shop-Ware
        </h1>
        <p className="text-slate-500 text-base md:text-lg max-w-2xl mx-auto leading-relaxed">
          Shop-Ware is a modern, well-designed platform with excellent digital inspections and customer communication. ShopCommand is built for a different problem — the owner who needs a real-time view across all their locations at once.
        </p>
      </section>

      {/* Table */}
      <section className="max-w-4xl mx-auto px-6 pb-20">
        <div className="rounded-2xl border border-slate-200 overflow-hidden">
          <div className="grid grid-cols-3 bg-slate-50 border-b border-slate-200 px-6 py-4">
            <div className="text-slate-400 text-xs uppercase tracking-widest" />
            <div className="text-slate-400 text-xs text-center uppercase tracking-widest font-medium">Shop-Ware</div>
            <div className="text-orange-600 text-xs text-center uppercase tracking-widest font-semibold">ShopCommand</div>
          </div>

          {rows.map(({ label, sc, them, scWin }, i) => (
            <div key={label} className={`grid grid-cols-3 px-6 py-4 items-start gap-4 ${i < rows.length - 1 ? 'border-b border-slate-100' : ''}`}>
              <div className="text-slate-500 text-sm font-medium pt-0.5">{label}</div>
              <div className="text-center">
                <span className={`text-xs leading-relaxed ${scWin ? 'text-slate-400' : 'text-slate-500'}`}>{them}</span>
              </div>
              <div className="text-center">
                <span className={`text-xs leading-relaxed font-medium ${scWin ? 'text-orange-600' : 'text-slate-400'}`}>{sc}</span>
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
          <h2 className="text-2xl md:text-3xl font-bold text-slate-900 mb-8" style={{ fontFamily: '"Gambetta", Georgia, serif', letterSpacing: '-0.02em' }}>
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
                body: 'You can\'t find a number on their website. You book a demo, talk to sales, and get a quote. For an owner trying to evaluate five different platforms without six sales calls, that friction is real. ShopCommand shows you $125/mo founding and $199 standard right on the page.',
              },
              {
                heading: 'ShopCommand is built for the owner layer.',
                body: 'Shop-Ware is excellent at running one shop\'s day-to-day operations. ShopCommand is built for the person sitting above all their locations — consolidated revenue, open ROs across every shop, technician status everywhere, without switching between accounts.',
              },
              {
                heading: 'We\'re early. That\'s the point.',
                body: 'Founding members get $125/mo locked forever, direct access to Rasheed, and a real say in the roadmap. You\'re not buying a finished product — you\'re shaping what comes next.',
              },
            ].map(({ heading, body }) => (
              <div key={heading} className="flex gap-5">
                <div className="w-1 rounded-full bg-orange-400/40 flex-shrink-0 mt-1" />
                <div>
                  <div className="text-slate-900 text-sm font-semibold mb-1.5" style={{ fontFamily: '"Gambetta", Georgia, serif' }}>{heading}</div>
                  <p className="text-slate-500 text-sm leading-relaxed">{body}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="border-t border-slate-200 py-20 px-6 text-center">
        <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4" style={{ fontFamily: '"Gambetta", Georgia, serif', letterSpacing: '-0.02em' }}>
          Ready to see it for yourself?
        </h2>
        <p className="text-slate-500 mb-8 max-w-sm mx-auto leading-relaxed">25 founding spots at $125/mo locked forever. Price goes to $199 at public launch.</p>
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
      <footer className="border-t border-slate-200 px-6 md:px-12 py-8 flex items-center justify-between flex-wrap gap-4">
        <Link to="/" className="flex items-center gap-2 hover:opacity-70 transition-opacity">
          <HexMark size={20} />
          <span className="text-slate-400 text-sm" style={{ fontFamily: '"Bricolage Grotesque", system-ui, sans-serif' }}>ShopCommand</span>
        </Link>
        <div className="flex flex-wrap gap-5">
          <Link to="/compare/tekmetric"  className="text-slate-400 hover:text-slate-600 text-xs transition-colors">vs. Tekmetric</Link>
          <Link to="/compare/shopmonkey" className="text-slate-400 hover:text-slate-600 text-xs transition-colors">vs. Shopmonkey</Link>
          <Link to="/compare/mitchell1"  className="text-slate-400 hover:text-slate-600 text-xs transition-colors">vs. Mitchell1</Link>
          <Link to="/compare/ro-writer"  className="text-slate-400 hover:text-slate-600 text-xs transition-colors">vs. R.O. Writer</Link>
          <Link to="/terms"   className="text-slate-400 hover:text-slate-600 text-xs transition-colors">Terms</Link>
          <Link to="/privacy" className="text-slate-400 hover:text-slate-600 text-xs transition-colors">Privacy</Link>
        </div>
      </footer>

      <CookieBanner />
    </div>
  )
}
