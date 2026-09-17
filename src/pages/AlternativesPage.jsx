import { Link, useParams, Navigate } from 'react-router-dom'
import { Mail, Check, Minus, ArrowRight } from 'lucide-react'
import { PublicNav } from '@/components/PublicNav'
import { usePageMeta } from '@/lib/seo'
import alternativesData from '@/data/alternativesData'

const CONTACT_EMAIL = 'rasheed.omar@outlook.com'
const ORIGIN = 'https://shopcommand.net'

export default function AlternativesPage() {
  const { slug } = useParams()
  const data = alternativesData[slug]

  usePageMeta({
    title: data?.metaTitle || '',
    description: data?.metaDescription || '',
    path: `/alternatives/${slug}`,
    schema: data ? [
      {
        '@context': 'https://schema.org',
        '@type': 'Article',
        headline: data.title,
        description: data.metaDescription,
        url: `${ORIGIN}/alternatives/${slug}`,
        dateModified: new Date().toISOString().slice(0, 10),
        author: { '@type': 'Organization', name: 'ShopCommand', url: ORIGIN },
      },
      {
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        mainEntity: data.faqs.map(({ q, a }) => ({
          '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a },
        })),
      },
      {
        '@context': 'https://schema.org',
        '@type': 'ItemList',
        name: data.title,
        itemListElement: data.alternatives.map((alt, i) => ({
          '@type': 'ListItem', position: i + 1, name: alt.name,
        })),
      },
    ] : [],
    breadcrumbs: data ? [
      { name: 'Home', path: '/' },
      { name: `${data.competitor} Alternatives` },
    ] : null,
  })

  if (!data) return <Navigate to="/" replace />

  return (
    <div className="min-h-screen bg-white">
      <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-orange-500 focus:text-white focus:rounded-lg">
        Skip to main content
      </a>

      <PublicNav />

      <main id="main-content">
        {/* Hero */}
        <section className="px-6 py-16 border-b border-slate-100">
          <div className="max-w-3xl mx-auto text-center">
            <div className="text-xs text-orange-600 uppercase tracking-widest font-semibold mb-4">Alternatives</div>
            <h1 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4" style={{ letterSpacing: '-0.02em' }}>
              {data.title}
            </h1>
            <p className="text-slate-500 leading-relaxed max-w-xl mx-auto">
              {data.intro}
            </p>
          </div>
        </section>

        {/* Why shops switch */}
        <section className="px-6 py-12 border-b border-slate-100">
          <div className="max-w-3xl mx-auto">
            <h2 className="text-xl font-bold text-slate-900 mb-5" style={{ letterSpacing: '-0.01em' }}>
              Why shops look for {data.competitor} alternatives
            </h2>
            <ul className="space-y-3">
              {data.whySwitch.map(reason => (
                <li key={reason} className="flex gap-3 text-slate-600 text-[15px] leading-relaxed">
                  <span className="text-orange-400 mt-1.5 shrink-0">•</span>
                  {reason}
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* Alternatives cards */}
        <section className="px-6 py-12">
          <div className="max-w-3xl mx-auto">
            <h2 className="text-xl font-bold text-slate-900 mb-6" style={{ letterSpacing: '-0.01em' }}>
              The best {data.competitor} alternatives in {new Date().getFullYear()}
            </h2>
            <div className="space-y-5">
              {data.alternatives.map((alt, i) => (
                <div
                  key={alt.name}
                  className={`p-6 rounded-2xl border ${alt.isUs ? 'border-orange-200 bg-orange-50/40' : 'border-slate-200'}`}
                >
                  <div className="flex flex-wrap items-center gap-2.5 mb-1.5">
                    <h3 className="text-base font-semibold text-slate-900">{i + 1}. {alt.name}</h3>
                    {alt.isUs && (
                      <span className="px-2 py-0.5 rounded-full bg-orange-500 text-white text-[11px] font-semibold uppercase tracking-wide">
                        That's us
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-slate-600 font-medium mb-2">{alt.positioning}</p>
                  <p className="text-xs text-slate-500 mb-3">
                    <span className="font-semibold text-slate-700">Best for:</span> {alt.bestFor}
                  </p>
                  <p className="text-slate-500 text-sm leading-relaxed mb-3">{alt.description}</p>
                  <p className="text-xs text-slate-400">
                    <span className="font-semibold text-slate-500">Pricing:</span> {alt.pricing}
                  </p>
                  {alt.isUs && (
                    <div className="flex flex-wrap gap-3 mt-4">
                      <Link to="/demo" className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold bg-orange-500 hover:bg-orange-600 text-white transition-colors">
                        Try the live demo <ArrowRight size={14} />
                      </Link>
                      <Link to="/founding-program" className="px-4 py-2 rounded-xl text-sm font-semibold text-slate-600 hover:text-slate-900 border border-slate-200 hover:border-slate-300 transition-colors">
                        Founding Shop Program →
                      </Link>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Comparison table */}
        <section className="px-6 pb-12">
          <div className="max-w-3xl mx-auto">
            <h2 className="text-xl font-bold text-slate-900 mb-5" style={{ letterSpacing: '-0.01em' }}>
              At a glance
            </h2>
            <div className="border border-slate-200 rounded-2xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm min-w-[560px]">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200">
                      <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Alternative</th>
                      <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Best for</th>
                      <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Pricing</th>
                      <th className="px-5 py-3 text-center text-xs font-semibold text-slate-500 uppercase tracking-wider">Multi-shop dashboard</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.alternatives.map(alt => (
                      <tr key={alt.name} className={`border-b border-slate-100 last:border-0 ${alt.isUs ? 'bg-orange-50/40' : ''}`}>
                        <td className="px-5 py-3 font-medium text-slate-900 whitespace-nowrap">
                          {alt.name}{alt.isUs && <span className="text-orange-600 text-xs font-semibold ml-1.5">(us)</span>}
                        </td>
                        <td className="px-5 py-3 text-slate-500 text-xs leading-relaxed">{alt.bestFor}</td>
                        <td className="px-5 py-3 text-slate-500 text-xs leading-relaxed">{alt.pricing}</td>
                        <td className="px-5 py-3 text-center">
                          {alt.multiShop
                            ? <Check size={15} className="text-orange-600 mx-auto" strokeWidth={2.5} aria-label="Yes" />
                            : <Minus size={15} className="text-slate-300 mx-auto" strokeWidth={2} aria-label="No" />}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            <p className="text-xs text-slate-400 mt-3">
              Competitor details sourced from their public websites and reviews. Where pricing isn't published, we say so rather than guess.
            </p>
          </div>
        </section>

        {/* FAQ */}
        <section className="px-6 py-12 bg-slate-50 border-y border-slate-200">
          <div className="max-w-3xl mx-auto">
            <h2 className="text-xl font-bold text-slate-900 mb-6" style={{ letterSpacing: '-0.01em' }}>Frequently asked questions</h2>
            <div className="space-y-6">
              {data.faqs.map(({ q, a }) => (
                <div key={q}>
                  <h3 className="text-[15px] font-semibold text-slate-900 mb-1.5">{q}</h3>
                  <p className="text-slate-500 text-sm leading-relaxed">{a}</p>
                </div>
              ))}
            </div>
            <p className="text-slate-500 text-sm mt-8">
              Comparing head-to-head instead? See{' '}
              <Link to={`/compare/${slug}`} className="text-orange-600 hover:underline font-medium">
                ShopCommand vs. {data.competitor}
              </Link>.
            </p>
          </div>
        </section>

        {/* Product CTA */}
        <section className="px-6 py-16">
          <div className="max-w-2xl mx-auto text-center">
            <h2 className="text-xl font-bold text-slate-900 mb-3" style={{ letterSpacing: '-0.01em' }}>
              Running more than one shop?
            </h2>
            <p className="text-slate-500 text-sm mb-6">
              ShopCommand shows multi-location owners their revenue, repair orders, and technician efficiency across
              every shop in one dashboard. $100/mo for your first shop — no per-seat fees.
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
            <span className="text-slate-400 text-sm">ShopCommand</span>
          </Link>
          <a href={`mailto:${CONTACT_EMAIL}`} className="flex items-center gap-2 text-slate-400 hover:text-slate-600 text-sm transition-colors">
            <Mail size={13} className="flex-shrink-0" />
            {CONTACT_EMAIL}
          </a>
          <div className="flex gap-5">
            <Link to={`/compare/${slug}`} className="text-slate-400 hover:text-slate-600 text-xs transition-colors">vs. {data.competitor}</Link>
            <Link to="/resources" className="text-slate-400 hover:text-slate-600 text-xs transition-colors">Resources</Link>
            <Link to="/terms" className="text-slate-400 hover:text-slate-600 text-xs transition-colors">Terms</Link>
            <Link to="/privacy" className="text-slate-400 hover:text-slate-600 text-xs transition-colors">Privacy</Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
