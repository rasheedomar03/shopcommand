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
      <polygon points={pts(32, 32.5, r)} fill="#0A0B12" />
    </svg>
  )
}

const rows = [
  { label: 'Pricing',              sc: '$125/mo founding · $199 standard',  them: 'Not disclosed — contact sales',       scWin: true  },
  { label: 'Pricing transparency', sc: 'Shown openly on our site',           them: 'Hidden behind a sales process',       scWin: true  },
  { label: 'Multi-location view',  sc: 'Core product — day one',             them: 'Possible, not the core focus',        scWin: true  },
  { label: 'Cloud-native',         sc: 'Fully browser-based',                them: 'Desktop roots — partial cloud',       scWin: true  },
  { label: 'Setup time',           sc: 'Up and running same day',            them: 'Weeks — training required',           scWin: true  },
  { label: 'Per-seat fees',        sc: 'Never',                              them: 'Yes — per-user licensing',            scWin: true  },
  { label: 'Modern UI',            sc: 'Built in 2024',                      them: 'Legacy interface, incremental updates', scWin: true },
  { label: 'Founder access',       sc: 'Direct line, every founding member', them: 'Standard support queue',              scWin: true  },
  { label: 'Founding rate lock',   sc: '$125/mo locked forever',             them: 'No equivalent offer',                 scWin: true  },
  { label: 'Repair data / times',  sc: 'Coming',                             them: 'Industry-leading — ProDemand',        scWin: false },
  { label: 'Parts integrations',   sc: 'Coming',                             them: 'Extensive — deep supplier network',   scWin: false },
  { label: 'Market presence',      sc: 'Early access — founding stage',      them: '50,000+ shops',                       scWin: false },
  { label: 'Two-way texting',      sc: 'Coming',                             them: 'Available',                           scWin: false },
]

const TITLE = 'ShopCommand vs. Mitchell1 — Auto Shop Software Comparison'
const DESC = 'Mitchell1 is the legacy leader in repair data. ShopCommand is built for the owner sitting above their locations — transparent pricing, no per-seat fees, same-day setup. Founding spots at $125/mo.'
const URL = 'https://shopcommand.net/compare/mitchell1'

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

export default function VsMitchell1() {
  useEffect(() => { setMeta(TITLE, DESC, URL) }, [])

  return (
    <div className="min-h-screen bg-[#0A0B12] text-white overflow-x-hidden" style={{ fontFamily: '"Inter", system-ui, sans-serif' }}>

      <CompareNav />

      {/* Hero */}
      <section className="max-w-4xl mx-auto px-6 pt-20 pb-16 text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-white/10 bg-white/[0.04] text-white/40 text-xs font-medium mb-6">
          Comparison
        </div>
        <h1 className="text-4xl md:text-5xl font-bold text-white mb-5" style={{ fontFamily: '"Space Grotesk", system-ui', letterSpacing: '-0.03em' }}>
          ShopCommand vs. Mitchell1
        </h1>
        <p className="text-white/55 text-base md:text-lg max-w-2xl mx-auto leading-relaxed">
          Mitchell1 is the industry standard for repair data and labor times. ShopCommand is built for a different problem — the owner who needs real-time visibility across all their locations without a legacy desktop application.
        </p>
      </section>

      {/* Table */}
      <section className="max-w-4xl mx-auto px-6 pb-20">
        <div className="rounded-2xl border border-white/[0.08] overflow-hidden">
          <div className="grid grid-cols-3 bg-white/[0.03] border-b border-white/[0.08] px-6 py-4">
            <div className="text-white/25 text-xs uppercase tracking-widest" />
            <div className="text-white/35 text-xs text-center uppercase tracking-widest font-medium">Mitchell1</div>
            <div className="text-orange-400 text-xs text-center uppercase tracking-widest font-semibold">ShopCommand</div>
          </div>

          {rows.map(({ label, sc, them, scWin }, i) => (
            <div key={label} className={`grid grid-cols-3 px-6 py-4 items-start gap-4 ${i < rows.length - 1 ? 'border-b border-white/[0.05]' : ''}`}>
              <div className="text-white/50 text-sm font-medium pt-0.5">{label}</div>
              <div className="text-center">
                <span className={`text-xs leading-relaxed ${scWin ? 'text-white/30' : 'text-white/55'}`}>{them}</span>
              </div>
              <div className="text-center">
                <span className={`text-xs leading-relaxed font-medium ${scWin ? 'text-orange-400' : 'text-white/35'}`}>{sc}</span>
              </div>
            </div>
          ))}
        </div>

        <p className="text-white/20 text-xs text-center mt-4">
          Mitchell1 data sourced from their public website and G2 reviews. ShopCommand is in early access — features marked "coming" are on the roadmap.
        </p>
      </section>

      {/* The honest take */}
      <section className="border-t border-white/[0.06] py-20 px-6">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-bold text-white mb-8" style={{ fontFamily: '"Space Grotesk", system-ui', letterSpacing: '-0.02em' }}>
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
                body: 'Founding members get $125/mo locked forever, direct access to Rasheed, and a real say in the roadmap. You\'re not buying a finished product — you\'re getting in at the ground floor with the pricing to match.',
              },
            ].map(({ heading, body }) => (
              <div key={heading} className="flex gap-5">
                <div className="w-1 rounded-full bg-orange-500/30 flex-shrink-0 mt-1" />
                <div>
                  <div className="text-white text-sm font-semibold mb-1.5" style={{ fontFamily: '"Space Grotesk", system-ui' }}>{heading}</div>
                  <p className="text-white/50 text-sm leading-relaxed">{body}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="border-t border-white/[0.06] py-20 px-6 text-center">
        <h2 className="text-3xl md:text-4xl font-bold text-white mb-4" style={{ fontFamily: '"Space Grotesk", system-ui', letterSpacing: '-0.02em' }}>
          Ready to see it for yourself?
        </h2>
        <p className="text-white/50 mb-8 max-w-sm mx-auto leading-relaxed">25 founding spots at $125/mo locked forever. Price goes to $199 at public launch.</p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <a href="/#founding" className="px-7 py-3.5 rounded-xl text-base font-semibold bg-orange-500 hover:bg-orange-400 text-white transition-colors shadow-lg shadow-orange-500/20">
            Reserve a founding spot →
          </a>
          <Link to="/login" className="px-6 py-3.5 rounded-xl text-base font-medium text-white/50 hover:text-white border border-white/10 hover:border-white/20 transition-colors">
            See the dashboard
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/[0.06] px-6 md:px-12 py-8 flex items-center justify-between flex-wrap gap-4">
        <Link to="/" className="flex items-center gap-2 hover:opacity-70 transition-opacity">
          <HexMark size={20} />
          <span className="text-white/35 text-sm" style={{ fontFamily: '"Space Grotesk", system-ui' }}>ShopCommand</span>
        </Link>
        <div className="flex flex-wrap gap-5">
          <Link to="/compare/tekmetric"   className="text-white/25 hover:text-white/50 text-xs transition-colors">vs. Tekmetric</Link>
          <Link to="/compare/shopmonkey"  className="text-white/25 hover:text-white/50 text-xs transition-colors">vs. Shopmonkey</Link>
          <Link to="/compare/shop-ware"   className="text-white/25 hover:text-white/50 text-xs transition-colors">vs. Shop-Ware</Link>
          <Link to="/compare/ro-writer"   className="text-white/25 hover:text-white/50 text-xs transition-colors">vs. R.O. Writer</Link>
          <Link to="/terms"  className="text-white/25 hover:text-white/50 text-xs transition-colors">Terms</Link>
          <Link to="/privacy" className="text-white/25 hover:text-white/50 text-xs transition-colors">Privacy</Link>
        </div>
      </footer>

      <CookieBanner />
    </div>
  )
}
