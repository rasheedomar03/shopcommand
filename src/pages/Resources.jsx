import { Link } from 'react-router-dom'
import { Mail, ArrowRight } from 'lucide-react'
import articles from '@/data/articles'

const CONTACT_EMAIL = 'rasheed.omar@outlook.com'

function HexMark({ size = 28 }) {
  const pts = (cx, cy, r) =>
    [90, 30, -30, -90, -150, 150]
      .map(deg => {
        const a = (deg * Math.PI) / 180
        return `${(cx + r * Math.cos(a)).toFixed(2)},${(cy - r * Math.sin(a)).toFixed(2)}`
      })
      .join(' ')
  const R = 28, r = R * 0.56
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg" role="img" aria-hidden="true">
      <polygon points={pts(32, 32, R)} fill="#F97316" />
      <polygon points={pts(32, 32.5, r)} fill="#0D0E14" />
    </svg>
  )
}

export default function Resources() {
  return (
    <div className="min-h-screen bg-white">
      <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-orange-500 focus:text-white focus:rounded-lg">
        Skip to main content
      </a>

      {/* Nav */}
      <nav aria-label="Page navigation" className="flex items-center justify-between px-6 md:px-12 h-16 border-b border-slate-200 sticky top-0 z-50 backdrop-blur-md bg-white/80">
        <Link to="/" aria-label="ShopCommand home" className="flex items-center gap-2 hover:opacity-70 transition-opacity">
          <HexMark size={26} />
          <span style={{ letterSpacing: '-0.02em' }} className="text-sm font-semibold text-slate-900">
            Shop<span className="text-orange-500">Command</span>
          </span>
        </Link>
        <div className="flex items-center gap-3">
          <Link to="/" className="px-3 py-1.5 text-sm text-slate-500 hover:text-slate-900 transition-colors rounded-lg hover:bg-slate-100">
            Home
          </Link>
          <Link to="/founding-program" className="px-4 py-1.5 rounded-lg text-sm font-semibold bg-orange-500 hover:bg-orange-600 text-white transition-colors">
            Join the Founding Program
          </Link>
        </div>
      </nav>

      <main id="main-content">
        {/* Hero */}
        <section className="px-6 py-20 border-b border-slate-100">
          <div className="max-w-3xl mx-auto text-center">
            <div className="text-xs text-orange-600 uppercase tracking-widest font-semibold mb-4">Resources</div>
            <h1 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4" style={{ letterSpacing: '-0.02em' }}>
              Workflow guides for auto repair shops
            </h1>
            <p className="text-slate-500 leading-relaxed max-w-lg mx-auto">
              Practical reads on running a tighter shop — technician time, repair order flow, parts tracking, and multi-location visibility. No fluff, no sales pitch.
            </p>
          </div>
        </section>

        {/* Article grid */}
        <section className="px-6 py-16">
          <div className="max-w-4xl mx-auto">
            <div className="grid gap-6">
              {articles.map(article => {
                const Icon = article.icon
                return (
                  <Link
                    key={article.slug}
                    to={`/resources/${article.slug}`}
                    className="group flex gap-5 p-6 rounded-2xl border border-slate-200 hover:border-orange-200 hover:bg-orange-50/30 transition-all"
                  >
                    <div className="w-10 h-10 rounded-xl bg-orange-50 border border-orange-200 flex items-center justify-center shrink-0 mt-0.5">
                      <Icon size={18} className="text-orange-500" strokeWidth={1.8} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h2 className="text-base font-semibold text-slate-900 group-hover:text-orange-600 transition-colors mb-1.5">
                        {article.title}
                      </h2>
                      <p className="text-slate-500 text-sm leading-relaxed mb-3">
                        {article.description}
                      </p>
                      <div className="flex items-center gap-4 text-xs text-slate-400">
                        <span>{article.readTime} read</span>
                        <span className="w-1 h-1 rounded-full bg-slate-300" />
                        <span>{article.audience}</span>
                      </div>
                    </div>
                    <ArrowRight size={16} className="text-slate-300 group-hover:text-orange-400 transition-colors mt-1 shrink-0" />
                  </Link>
                )
              })}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="px-6 py-16 bg-slate-50 border-t border-slate-200">
          <div className="max-w-2xl mx-auto text-center">
            <h2 className="text-xl font-bold text-slate-900 mb-3" style={{ letterSpacing: '-0.01em' }}>
              Ready to see it in action?
            </h2>
            <p className="text-slate-500 text-sm mb-6">
              Try the live demo or apply for the Founding Shop Program — 14-day guided pilot, $100/mo locked rate.
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
            <HexMark size={22} />
            <span className="text-slate-400 text-sm">ShopCommand</span>
          </Link>
          <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-6">
            <a href={`mailto:${CONTACT_EMAIL}`} className="flex items-center gap-2 text-slate-400 hover:text-slate-600 text-sm transition-colors">
              <Mail size={13} className="flex-shrink-0" />
              {CONTACT_EMAIL}
            </a>
          </div>
          <div className="flex flex-col items-center md:items-end gap-2.5">
            <div className="flex gap-5">
              <Link to="/terms" className="text-slate-400 hover:text-slate-600 text-xs transition-colors">Terms</Link>
              <Link to="/privacy" className="text-slate-400 hover:text-slate-600 text-xs transition-colors">Privacy</Link>
              <Link to="/resources" className="text-slate-400 hover:text-slate-600 text-xs transition-colors">Resources</Link>
            </div>
            <p className="text-slate-500 text-xs">© 2026 ShopCommand. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}
