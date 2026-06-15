import { Link, useParams, Navigate } from 'react-router-dom'
import { Mail, ArrowLeft } from 'lucide-react'
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

function ContentBlock({ block }) {
  if (block.type === 'paragraph') {
    return <p className="text-slate-600 text-[15px] leading-relaxed">{block.text}</p>
  }
  if (block.type === 'heading') {
    return <h2 className="text-lg font-bold text-slate-900 mt-8 mb-2" style={{ letterSpacing: '-0.01em' }}>{block.text}</h2>
  }
  if (block.type === 'list') {
    return (
      <ul className="space-y-2 my-4">
        {block.items.map((item, i) => (
          <li key={i} className="flex gap-3 text-slate-600 text-[15px] leading-relaxed">
            <span className="text-orange-400 mt-1.5 shrink-0">•</span>
            {item}
          </li>
        ))}
      </ul>
    )
  }
  return null
}

export default function Article() {
  const { slug } = useParams()
  const article = articles.find(a => a.slug === slug)

  if (!article) return <Navigate to="/resources" replace />

  const Icon = article.icon
  const currentIndex = articles.indexOf(article)
  const next = articles[currentIndex + 1]
  const prev = articles[currentIndex - 1]

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
          <Link to="/resources" className="px-3 py-1.5 text-sm text-slate-500 hover:text-slate-900 transition-colors rounded-lg hover:bg-slate-100">
            All Resources
          </Link>
          <Link to="/founding-program" className="px-4 py-1.5 rounded-lg text-sm font-semibold bg-orange-500 hover:bg-orange-600 text-white transition-colors">
            Join the Founding Program
          </Link>
        </div>
      </nav>

      <main id="main-content">
        <article className="px-6 py-16">
          <div className="max-w-2xl mx-auto">
            {/* Back link */}
            <Link to="/resources" className="inline-flex items-center gap-1.5 text-sm text-slate-400 hover:text-slate-600 transition-colors mb-8">
              <ArrowLeft size={14} />
              All resources
            </Link>

            {/* Header */}
            <div className="mb-10">
              <div className="w-10 h-10 rounded-xl bg-orange-50 border border-orange-200 flex items-center justify-center mb-4">
                <Icon size={18} className="text-orange-500" strokeWidth={1.8} />
              </div>
              <h1 className="text-2xl md:text-3xl font-bold text-slate-900 mb-3" style={{ letterSpacing: '-0.02em' }}>
                {article.title}
              </h1>
              <div className="flex items-center gap-4 text-sm text-slate-400">
                <span>{article.readTime} read</span>
                <span className="w-1 h-1 rounded-full bg-slate-300" />
                <span>{article.audience}</span>
                <span className="w-1 h-1 rounded-full bg-slate-300" />
                <time dateTime={article.publishedAt}>
                  {new Date(article.publishedAt + 'T12:00:00').toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                </time>
              </div>
            </div>

            {/* Content */}
            <div className="space-y-4">
              {article.content.map((block, i) => (
                <ContentBlock key={i} block={block} />
              ))}
            </div>

            {/* CTA */}
            <div className="mt-14 p-6 rounded-2xl border border-orange-200 bg-orange-50/40">
              <h3 className="text-base font-semibold text-slate-900 mb-2">See this in action</h3>
              <p className="text-slate-500 text-sm mb-4">
                ShopCommand handles repair orders, technician time, parts inventory, and invoicing from one dashboard. Try it free.
              </p>
              <div className="flex flex-wrap gap-3">
                <Link to="/demo" className="px-4 py-2 rounded-xl text-sm font-semibold bg-orange-500 hover:bg-orange-600 text-white transition-colors">
                  Try the live demo
                </Link>
                <Link to="/founding-program" className="px-4 py-2 rounded-xl text-sm font-semibold text-slate-600 hover:text-slate-900 border border-slate-200 hover:border-slate-300 transition-colors">
                  Founding Shop Program →
                </Link>
              </div>
            </div>

            {/* Prev/Next */}
            {(prev || next) && (
              <div className="mt-10 pt-8 border-t border-slate-200 grid grid-cols-2 gap-4">
                {prev ? (
                  <Link to={`/resources/${prev.slug}`} className="group">
                    <div className="text-xs text-slate-400 mb-1">← Previous</div>
                    <div className="text-sm font-medium text-slate-700 group-hover:text-orange-600 transition-colors">{prev.title}</div>
                  </Link>
                ) : <div />}
                {next ? (
                  <Link to={`/resources/${next.slug}`} className="group text-right">
                    <div className="text-xs text-slate-400 mb-1">Next →</div>
                    <div className="text-sm font-medium text-slate-700 group-hover:text-orange-600 transition-colors">{next.title}</div>
                  </Link>
                ) : <div />}
              </div>
            )}
          </div>
        </article>
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
