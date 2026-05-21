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
      <polygon points={pts(32, 32.5, r)} fill="#0D0E14" />
    </svg>
  )
}

const rows = [
  { label: 'Pricing',              sc: '$125/mo founding · $199 standard',  them: 'Not disclosed — contact sales',       scWin: true  },
  { label: 'Pricing transparency', sc: 'Shown openly on our site',           them: 'Hidden behind a sales process',       scWin: true  },
  { label: 'Multi-location view',  sc: 'Core product — day one',             them: 'Available, complex to manage',        scWin: true  },
  { label: 'Cloud-native',         sc: 'Fully browser-based',                them: 'Windows desktop — not true cloud',    scWin: true  },
  { label: 'Setup time',           sc: 'Up and running same day',            them: 'Days to weeks — installation req.',   scWin: true  },
  { label: 'Per-seat fees',        sc: 'Never',                              them: 'Yes — per-workstation licensing',     scWin: true  },
  { label: 'Mobile access',        sc: 'Fully mobile-friendly',              them: 'Limited mobile support',              scWin: true  },
  { label: 'Modern UI',            sc: 'Built in 2024',                      them: 'Legacy interface',                    scWin: true  },
  { label: 'Founder access',       sc: 'Direct line, every founding member', them: 'Standard support queue',              scWin: true  },
  { label: 'Founding rate lock',   sc: '$125/mo locked forever',             them: 'No equivalent offer',                 scWin: true  },
  { label: 'Parts integrations',   sc: 'Coming',                             them: 'Extensive — core strength',           scWin: false },
  { label: 'Labor guide',          sc: 'Coming',                             them: 'Built-in — multiple sources',         scWin: false },
  { label: 'Market presence',      sc: 'Early access — founding stage',      them: 'Established — large install base',    scWin: false },
]

const TITLE = 'ShopCommand vs. R.O. Writer — Auto Shop Software Comparison'
const DESC = 'R.O. Writer is a legacy desktop platform with strong parts integrations. ShopCommand is cloud-native, mobile-friendly, and built for multi-location visibility with transparent pricing. Founding spots at $125/mo.'
const URL = 'https://shopcommand.net/compare/ro-writer'

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

export default function VsROWriter() {
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
          ShopCommand vs. R.O. Writer
        </h1>
        <p className="text-slate-500 text-base md:text-lg max-w-2xl mx-auto leading-relaxed">
          R.O. Writer is a long-established platform with deep parts integrations and a large install base. ShopCommand is cloud-native, mobile-first, and built for owners who need real-time visibility across multiple locations without a Windows server.
        </p>
      </section>

      {/* Table */}
      <section className="max-w-4xl mx-auto px-6 pb-20">
        <div className="rounded-2xl border border-slate-200 overflow-hidden">
          <div className="grid grid-cols-3 bg-slate-50 border-b border-slate-200 px-6 py-4">
            <div className="text-slate-400 text-xs uppercase tracking-widest" />
            <div className="text-slate-400 text-xs text-center uppercase tracking-widest font-medium">R.O. Writer</div>
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
          R.O. Writer data sourced from their public website and G2 reviews. ShopCommand is in early access — features marked "coming" are on the roadmap.
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
                heading: 'R.O. Writer has serious parts integration depth.',
                body: 'If your shop\'s workflow is deeply embedded in parts ordering — live pricing from suppliers, electronic ordering, core tracking — R.O. Writer has built that infrastructure over many years. For high-volume parts shops, those integrations have real operational value.',
              },
              {
                heading: 'The desktop model is the limiting factor.',
                body: 'R.O. Writer is fundamentally a Windows application. It wasn\'t built for the cloud, and the mobile experience reflects that. If you want to check on your shop from your phone on a Sunday, or give a manager access without installing software on a workstation, the architecture works against you.',
              },
              {
                heading: 'Per-workstation licensing adds up fast.',
                body: 'Pricing based on the number of workstations or users means your costs scale with your headcount. A shop with 10 techs and 3 service advisors is paying for 13 seats. ShopCommand is per location, never per seat — whether you have 2 people or 20.',
              },
              {
                heading: 'We\'re early. That\'s the point.',
                body: 'Founding members get $125/mo locked forever, direct access to Rasheed, and a real say in the roadmap. You\'re not buying a finished product — you\'re getting in at the ground floor with the pricing to match.',
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
          <Link to="/compare/shop-ware"  className="text-slate-400 hover:text-slate-600 text-xs transition-colors">vs. Shop-Ware</Link>
          <Link to="/terms"   className="text-slate-400 hover:text-slate-600 text-xs transition-colors">Terms</Link>
          <Link to="/privacy" className="text-slate-400 hover:text-slate-600 text-xs transition-colors">Privacy</Link>
        </div>
      </footer>

      <CookieBanner />
    </div>
  )
}
