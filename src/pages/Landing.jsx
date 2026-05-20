import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { Building2, Wrench, Users, Check, Mail, ChevronDown, Menu, X } from 'lucide-react'
import { CookieBanner } from '@/components/CookieBanner'

const TOTAL_SPOTS = 25
const CLAIMED_SPOTS = 0    // ← update this manually as signups come in
const CALENDLY_URL = 'https://calendly.com/rasheed-omar/30min'
const CONTACT_EMAIL = 'rasheed.omar@outlook.com'

/* ─── Color tokens ────────────────────────────────────────────────────────────
   Warm light palette. Every neutral tinted toward warm-gray.
   Orange stays brand (#F97316) but used deliberately, not everywhere.
   ──────────────────────────────────────────────────────────────────────────── */
const FONT_HEADING = '"Bricolage Grotesque", system-ui, sans-serif'
const FONT_BODY    = '"Figtree", system-ui, sans-serif'

// ─── Hex mark ────────────────────────────────────────────────────────────────
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
    <svg width={size} height={size} viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">
      <polygon points={pts(32, 32, R)} fill="#F97316" />
      <polygon points={pts(32, 32.5, r)} fill="#1C2030" />
    </svg>
  )
}

// ─── Scroll reveal hook ───────────────────────────────────────────────────────
function useReveal(threshold = 0.12) {
  const ref = useRef(null)
  const [visible, setVisible] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setVisible(true) },
      { threshold }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [threshold])
  return [ref, visible]
}

function Reveal({ children, delay = 0, className = '' }) {
  const [ref, visible] = useReveal()
  return (
    <div
      ref={ref}
      className={className}
      style={{
        transition: `opacity 0.7s cubic-bezier(0.16,1,0.3,1) ${delay}ms, transform 0.7s cubic-bezier(0.16,1,0.3,1) ${delay}ms`,
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0)' : 'translateY(24px)',
      }}
    >
      {children}
    </div>
  )
}

// ─── Data ─────────────────────────────────────────────────────────────────────
const steps = [
  {
    num: '01',
    title: 'Connect your shop',
    desc: 'Add your location in minutes. One shop or ten. No IT required, no hardware to install. Just log in and go.',
  },
  {
    num: '02',
    title: 'Track everything live',
    desc: 'Revenue, open ROs, technician clock-ins, and parts inventory update in real time. Always current, never a guess.',
  },
  {
    num: '03',
    title: 'Make better calls',
    desc: 'Spot your top performers, catch problems before they become expensive, and grow with actual data behind you.',
  },
]

const features = [
  {
    icon: Building2,
    title: 'Your whole business, one tab',
    desc: 'Stop guessing how your shop is doing. Revenue, open ROs, and technician status live, the moment you open your laptop. Running multiple locations? See them all at once.',
    badge: 'Real-time',
    badgeSub: 'One dashboard',
  },
  {
    icon: Wrench,
    title: 'Every job, accounted for',
    desc: "No more calling the manager to find out where a job stands. Every RO moves through stages digitally, with full history and accountability from the moment it's written.",
    badge: 'Every stage',
    badgeSub: 'Full visibility',
  },
  {
    icon: Users,
    title: 'Know your team without the check-in calls',
    desc: "Who's clocked in, who's behind, who's carrying the day. Without being there. Efficiency scores, clock-ins, and performance data at your fingertips.",
    badge: 'Real-time',
    badgeSub: 'Clock-ins & efficiency',
  },
]

const faqs = [
  {
    q: 'Do I need to install anything?',
    a: 'No. ShopCommand is fully browser-based. You log in, add your locations, and you\'re running. Nothing to download, no IT required.',
  },
  {
    q: 'Can my technicians use it on their phone?',
    a: 'Yes. Techs get their own login that goes straight to a mobile-friendly board showing their assigned jobs. No access to owner financials.',
  },
  {
    q: 'Is this only for multi-location shops?',
    a: 'No. Single-location shops get the same full dashboard. Multi-location owners just get the added ability to see everything across all their shops at once.',
  },
  {
    q: 'What happens to my data if I cancel?',
    a: 'Your data stays yours. You can export everything before you go. We don\'t hold it hostage.',
  },
  {
    q: 'When will the backend be ready for founding members?',
    a: 'We\'re onboarding our first shops now. Founding members get direct access to us during setup. You\'re not going through a ticket queue.',
  },
  {
    q: 'What does the $125/mo founding rate cover?',
    a: 'One shop location with unlimited technicians, users, and repair orders. The rate locks in forever as long as you stay subscribed. Price goes to $199 at public launch.',
  },
  {
    q: 'How is this different from Tekmetric or Shopmonkey?',
    a: 'Those are full shop management platforms, great at day-to-day operations for a single location. ShopCommand is built for the owner sitting above all their locations who needs real-time visibility across every shop without jumping between logins. Different problem, different tool.',
  },
]

// ─── Dashboard preview data ───────────────────────────────────────────────────
const shopRows = [
  { name: 'Tulsa Main',   sub: '8 techs clocked in',    revenue: 8240,  ros: 21, techs: '8 / 10',  best: false },
  { name: 'Broken Arrow', sub: '6 techs clocked in',    revenue: 6180,  ros: 17, techs: '6 / 8',   best: false },
  { name: 'Owasso',       sub: '↑ Best day this month', revenue: 11450, ros: 35, techs: '10 / 10', best: true  },
]

function DashboardPreview() {
  const containerRef = useRef(null)
  const [triggered, setTriggered] = useState(false)
  const [counts, setCounts] = useState(shopRows.map(() => 0))

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setTriggered(true) },
      { threshold: 0.2 }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    if (!triggered) return
    // Respect reduced motion
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
      setCounts(shopRows.map(r => r.revenue))
      return
    }
    const targets = shopRows.map(r => r.revenue)
    const duration = 900
    let start = null
    const timer = setTimeout(() => {
      const step = (ts) => {
        if (!start) start = ts
        const progress = Math.min((ts - start) / duration, 1)
        const eased = 1 - Math.pow(1 - progress, 3)
        setCounts(targets.map(t => Math.floor(eased * t)))
        if (progress < 1) requestAnimationFrame(step)
        else setCounts(targets)
      }
      requestAnimationFrame(step)
    }, 700)
    return () => clearTimeout(timer)
  }, [triggered])

  return (
    <div ref={containerRef} className="relative mt-14 w-full max-w-3xl mx-auto rounded-2xl overflow-hidden border border-slate-200/80 shadow-xl shadow-slate-900/[0.06]">
      {/* Keep dashboard dark-themed — it IS the product */}
      <div className="flex items-center justify-between px-5 py-3 bg-[#0F1018] border-b border-white/[0.08]">
        <span className="text-white/40 text-xs uppercase tracking-wider" style={{ fontFamily: FONT_BODY }}>Live preview</span>
        <span className="text-orange-400/70 text-xs font-medium italic" style={{ fontFamily: FONT_BODY }}>sample data</span>
      </div>
      <div className="bg-[#0F1018]">
        <div className="grid grid-cols-4 gap-4 px-5 py-2.5 border-b border-white/[0.08]">
          {['Shop', 'Revenue', 'Open ROs', 'Techs'].map((h, i) => (
            <div key={h} className={`text-white/30 text-xs ${i > 0 ? 'text-right' : ''}`} style={{ fontFamily: FONT_BODY }}>{h}</div>
          ))}
        </div>
        {shopRows.map(({ name, sub, ros, techs, best }, i) => (
          <div
            key={name}
            className="grid grid-cols-4 gap-4 px-5 py-3.5 border-b border-white/[0.06] last:border-0 items-center motion-safe:transition-all"
            style={{
              opacity: triggered ? 1 : 0,
              transform: triggered ? 'translateY(0)' : 'translateY(10px)',
              transition: `opacity 0.45s ease ${i * 110 + 700}ms, transform 0.45s ease ${i * 110 + 700}ms`,
            }}
          >
            <div>
              <div className="text-white text-sm font-medium" style={{ fontFamily: FONT_BODY }}>{name}</div>
              <div className={`text-xs mt-0.5 ${best ? 'text-emerald-400/90' : 'text-white/40'}`} style={{ fontFamily: FONT_BODY }}>{sub}</div>
            </div>
            <div className="text-orange-400 text-sm font-bold text-right tabular-nums" style={{ fontFamily: FONT_BODY }}>
              ${counts[i].toLocaleString()}
            </div>
            <div className="text-right">
              <span className="bg-orange-500/15 text-orange-400 text-xs px-2 py-0.5 rounded-md">{ros}</span>
            </div>
            <div className="text-white/55 text-sm text-right" style={{ fontFamily: FONT_BODY }}>{techs}</div>
          </div>
        ))}
        <div className="px-5 py-2.5 border-t border-white/[0.06]">
          <span className="text-white/25 text-xs" style={{ fontFamily: FONT_BODY }}>3 of 5 locations shown</span>
        </div>
      </div>
    </div>
  )
}

// ─── FAQ item ─────────────────────────────────────────────────────────────────
function FAQItem({ q, a, delay, id }) {
  const [open, setOpen] = useState(false)
  const bodyRef = useRef(null)
  const [height, setHeight] = useState(0)

  useEffect(() => {
    if (bodyRef.current) {
      setHeight(open ? bodyRef.current.scrollHeight : 0)
    }
  }, [open])

  const panelId = `faq-panel-${id}`
  const buttonId = `faq-btn-${id}`

  return (
    <Reveal delay={delay}>
      <div className="py-5">
        <button
          id={buttonId}
          onClick={() => setOpen(o => !o)}
          aria-expanded={open}
          aria-controls={panelId}
          className="w-full flex items-center justify-between gap-4 text-left group focus-visible:outline-2 focus-visible:outline-orange-500 focus-visible:outline-offset-2 rounded-lg"
        >
          <span className="text-sm font-medium text-slate-800 group-hover:text-orange-600 transition-colors duration-200" style={{ fontFamily: FONT_BODY }}>{q}</span>
          <span
            className="text-slate-400 text-xl leading-none flex-shrink-0 motion-safe:transition-transform duration-300"
            aria-hidden="true"
            style={{ transform: open ? 'rotate(45deg)' : 'rotate(0deg)' }}
          >+</span>
        </button>
        <div
          id={panelId}
          role="region"
          aria-labelledby={buttonId}
          style={{
            height: `${height}px`,
            overflow: 'hidden',
            transition: 'height 280ms cubic-bezier(0.16,1,0.3,1)',
          }}
        >
          <div ref={bodyRef} style={{ paddingTop: '12px', paddingBottom: '8px' }}>
            <p className="text-sm text-slate-500 leading-relaxed pr-8" style={{ fontFamily: FONT_BODY }}>{a}</p>
          </div>
        </div>
      </div>
    </Reveal>
  )
}

// ─── Founding Member section ──────────────────────────────────────────────────
function FoundingSection() {
  const remaining = TOTAL_SPOTS - CLAIMED_SPOTS
  const pct = Math.round((CLAIMED_SPOTS / TOTAL_SPOTS) * 100)

  const [form, setForm] = useState({ name: '', email: '', shop: '' })
  const [submitted, setSubmitted] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.name.trim() || !form.email.trim() || !form.shop.trim()) {
      setError('Please fill in all three fields.')
      return
    }
    setError('')
    setSubmitting(true)
    try {
      const res = await fetch('https://formspree.io/f/mwvzeojn', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ name: form.name, email: form.email, shop: form.shop, _gotcha: '' }),
      })
      if (!res.ok) throw new Error('Submit failed')
    } catch {
      setError('Something went wrong. Try emailing rasheed.omar@outlook.com directly.')
      setSubmitting(false)
      return
    }
    setSubmitting(false)
    setSubmitted(true)
  }

  return (
    <section id="founding" className="border-t border-slate-200 py-24 px-6 bg-orange-50/40">
      <div className="max-w-2xl mx-auto">
        <Reveal>
          <div className="text-center mb-10">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-orange-300 bg-orange-100 text-orange-700 text-xs font-semibold mb-5">
              <span className="w-1.5 h-1.5 rounded-full bg-orange-500" />
              Founding Member Program
            </div>
            <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4" style={{ fontFamily: FONT_HEADING, letterSpacing: '-0.02em' }}>
              Lock in $125/mo forever.
            </h2>
            <p className="text-slate-500 leading-relaxed max-w-sm mx-auto" style={{ fontFamily: FONT_BODY }}>
              First {TOTAL_SPOTS} shops get founding member pricing, locked for life. Price goes to $199 when we open to everyone.
            </p>
          </div>
        </Reveal>

        <Reveal delay={80}>
          {/* Spot counter */}
          <div className="mb-8">
            <div className="flex justify-between text-xs mb-2" style={{ fontFamily: FONT_BODY }}>
              <span className="text-slate-400">{CLAIMED_SPOTS === 0 ? 'Be the first to reserve a spot' : `${CLAIMED_SPOTS} of ${TOTAL_SPOTS} spots claimed`}</span>
              <span className="text-orange-600 font-semibold">{remaining} of {TOTAL_SPOTS} left</span>
            </div>
            <div className="h-2 rounded-full bg-slate-200 overflow-hidden">
              <div
                className="h-full rounded-full bg-orange-500 motion-safe:transition-all duration-700"
                style={{ width: `${Math.max(pct, CLAIMED_SPOTS === 0 ? 0 : 4)}%` }}
              />
            </div>
          </div>

          {/* Walkthrough alternative */}
          <p className="text-center text-slate-400 text-base mb-8" style={{ fontFamily: FONT_BODY }}>
            Want to see it first?{' '}
            <a href={CALENDLY_URL} target="_blank" rel="noopener noreferrer" className="text-orange-600 hover:text-orange-700 underline underline-offset-4 decoration-orange-300 transition-colors">
              Book a free 15-min walkthrough →
            </a>
          </p>

          {/* Form / success */}
          <div className="rounded-2xl border border-orange-200 bg-white p-7 shadow-sm">
            {submitted ? (
              <div className="text-center py-6">
                <div className="w-14 h-14 rounded-full bg-orange-100 border border-orange-200 flex items-center justify-center mx-auto mb-5">
                  <Check size={24} className="text-orange-600" strokeWidth={2} />
                </div>
                <h3 className="text-lg font-semibold text-slate-900 mb-2" style={{ fontFamily: FONT_HEADING }}>
                  You're on the list.
                </h3>
                <p className="text-slate-500 text-sm leading-relaxed max-w-xs mx-auto" style={{ fontFamily: FONT_BODY }}>
                  We'll reach out to {form.email} within 24 hours with next steps. Welcome to the founding crew.
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-slate-500 font-medium mb-1.5 uppercase tracking-wider" style={{ fontFamily: FONT_BODY }}>Your name</label>
                    <input
                      type="text"
                      placeholder="Marcus Webb"
                      value={form.name}
                      onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                      className="w-full h-11 px-4 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-sm placeholder-slate-400 focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 transition-colors"
                      style={{ fontFamily: FONT_BODY }}
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-500 font-medium mb-1.5 uppercase tracking-wider" style={{ fontFamily: FONT_BODY }}>Email</label>
                    <input
                      type="email"
                      placeholder="marcus@northhoustonauto.com"
                      value={form.email}
                      onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                      className="w-full h-11 px-4 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-sm placeholder-slate-400 focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 transition-colors"
                      style={{ fontFamily: FONT_BODY }}
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs text-slate-500 font-medium mb-1.5 uppercase tracking-wider" style={{ fontFamily: FONT_BODY }}>Shop name</label>
                  <input
                    type="text"
                    placeholder="North Houston Auto"
                    value={form.shop}
                    onChange={e => setForm(f => ({ ...f, shop: e.target.value }))}
                    className="w-full h-11 px-4 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-sm placeholder-slate-400 focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 transition-colors"
                    style={{ fontFamily: FONT_BODY }}
                  />
                </div>
                {error && <p className="text-red-600 text-xs" role="alert" style={{ fontFamily: FONT_BODY }}>{error}</p>}
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full h-12 rounded-xl text-sm font-semibold bg-orange-500 hover:bg-orange-600 disabled:opacity-60 disabled:cursor-not-allowed text-white transition-colors shadow-sm"
                  style={{ fontFamily: FONT_BODY }}
                >
                  {submitting ? 'Reserving your spot…' : 'Reserve my founding spot →'}
                </button>
                <p className="text-center text-slate-400 text-xs" style={{ fontFamily: FONT_BODY }}>No credit card. No commitment. We'll reach out within 24 hours.</p>
              </form>
            )}
          </div>

          <p className="text-center text-slate-400 text-sm mt-6 leading-relaxed" style={{ fontFamily: FONT_BODY }}>
            You won't get a ticket queue. Every founding member gets direct access to Rasheed: real answers, no support portal, no waiting.
          </p>
        </Reveal>
      </div>
    </section>
  )
}

// ─── Component ────────────────────────────────────────────────────────────────
const LANDING_TITLE = 'ShopCommand — Auto Shop Management Software'
const LANDING_DESC = 'Auto repair shop management software. Track repair orders, technician efficiency, and revenue across every location in real time. Founding member spots at $125/mo.'
const LANDING_URL = 'https://shopcommand.net'

export default function Landing() {
  useEffect(() => {
    document.title = LANDING_TITLE
    document.querySelector('meta[name="description"]')?.setAttribute('content', LANDING_DESC)
    document.querySelector('meta[property="og:title"]')?.setAttribute('content', LANDING_TITLE)
    document.querySelector('meta[property="og:description"]')?.setAttribute('content', LANDING_DESC)
    document.querySelector('meta[property="og:url"]')?.setAttribute('content', LANDING_URL)
    document.querySelector('meta[name="twitter:title"]')?.setAttribute('content', LANDING_TITLE)
    document.querySelector('meta[name="twitter:description"]')?.setAttribute('content', LANDING_DESC)
    document.querySelector('link[rel="canonical"]')?.setAttribute('href', LANDING_URL)

    const faqSchema = {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: faqs.map(({ q, a }) => ({
        '@type': 'Question',
        name: q,
        acceptedAnswer: { '@type': 'Answer', text: a },
      })),
    }
    const script = document.createElement('script')
    script.type = 'application/ld+json'
    script.id = 'sc-faq-schema'
    script.text = JSON.stringify(faqSchema)
    document.head.appendChild(script)
    return () => document.getElementById('sc-faq-schema')?.remove()
  }, [])

  const [compareOpen, setCompareOpen] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const compareRef = useRef(null)

  useEffect(() => {
    const handler = (e) => {
      if (compareRef.current && !compareRef.current.contains(e.target)) {
        setCompareOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  // Close mobile menu on route navigation or escape
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') setMobileMenuOpen(false) }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [])

  return (
    <div className="min-h-screen bg-[#FAFAF8] text-slate-900 overflow-x-hidden" style={{ fontFamily: FONT_BODY }}>

      {/* Nav */}
      <nav className="flex items-center justify-between px-6 md:px-12 h-16 border-b border-slate-200/80 sticky top-0 z-50 backdrop-blur-md bg-[#FAFAF8]/90">
        <Link to="/" className="flex items-center gap-2.5 hover:opacity-80 transition-opacity flex-shrink-0">
          <HexMark size={30} />
          <span style={{ fontFamily: FONT_HEADING, letterSpacing: '-0.02em' }} className="text-base font-semibold">
            <span className="text-slate-900">Shop</span>
            <span className="text-orange-500">Command</span>
          </span>
        </Link>

        {/* Center links: desktop */}
        <div className="hidden md:flex items-center gap-1 absolute left-1/2 -translate-x-1/2">
          <a href="#how-it-works" className="px-3 py-1.5 text-sm text-slate-500 hover:text-slate-900 transition-colors rounded-lg hover:bg-slate-100">
            How it works
          </a>
          <a href="#pricing" className="px-3 py-1.5 text-sm text-slate-500 hover:text-slate-900 transition-colors rounded-lg hover:bg-slate-100">
            Pricing
          </a>
          <div className="relative" ref={compareRef}>
            <button
              onClick={() => setCompareOpen(o => !o)}
              aria-expanded={compareOpen}
              aria-haspopup="true"
              className="flex items-center gap-1 px-3 py-1.5 text-sm text-slate-500 hover:text-slate-900 transition-colors rounded-lg hover:bg-slate-100"
            >
              Compare
              <ChevronDown size={13} className={`motion-safe:transition-transform duration-200 ${compareOpen ? 'rotate-180' : ''}`} />
            </button>
            {compareOpen && (
              <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 bg-white border border-slate-200 rounded-xl overflow-hidden shadow-lg shadow-slate-900/[0.08] z-50 w-52">
                {[
                  { to: '/compare/tekmetric', label: 'ShopCommand vs. Tekmetric' },
                  { to: '/compare/shopmonkey', label: 'ShopCommand vs. Shopmonkey' },
                  { to: '/compare/mitchell1', label: 'ShopCommand vs. Mitchell1' },
                  { to: '/compare/shop-ware', label: 'ShopCommand vs. Shop-Ware' },
                  { to: '/compare/ro-writer', label: 'ShopCommand vs. R.O. Writer' },
                ].map(({ to, label }, i) => (
                  <Link
                    key={to}
                    to={to}
                    onClick={() => setCompareOpen(false)}
                    className={`flex items-center px-4 py-3 text-sm text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-colors ${i > 0 ? 'border-t border-slate-100' : ''}`}
                  >
                    {label}
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3 flex-shrink-0">
          <Link to="/login" className="hidden sm:inline-flex px-4 py-1.5 text-sm font-medium text-slate-500 hover:text-slate-900 transition-colors">
            See the demo
          </Link>
          <a href="#founding" className="hidden sm:inline-flex px-4 py-1.5 rounded-lg text-sm font-semibold bg-orange-500 hover:bg-orange-600 text-white transition-colors whitespace-nowrap">
            Reserve your spot
          </a>
          {/* Mobile hamburger */}
          <button
            className="md:hidden p-2 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors"
            onClick={() => setMobileMenuOpen(o => !o)}
            aria-expanded={mobileMenuOpen}
            aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
          >
            {mobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </nav>

      {/* Mobile menu */}
      {mobileMenuOpen && (
        <div className="md:hidden fixed inset-x-0 top-16 z-40 bg-white border-b border-slate-200 shadow-lg shadow-slate-900/[0.06] px-6 py-4 space-y-1">
          {[
            { href: '#how-it-works', label: 'How it works' },
            { href: '#pricing', label: 'Pricing' },
            { href: '#founding', label: 'Reserve your spot' },
          ].map(({ href, label }) => (
            <a
              key={href}
              href={href}
              onClick={() => setMobileMenuOpen(false)}
              className="block px-3 py-3 text-sm font-medium text-slate-700 hover:text-orange-600 hover:bg-slate-50 rounded-lg transition-colors"
            >
              {label}
            </a>
          ))}
          <Link
            to="/login"
            onClick={() => setMobileMenuOpen(false)}
            className="block px-3 py-3 text-sm font-medium text-slate-700 hover:text-orange-600 hover:bg-slate-50 rounded-lg transition-colors"
          >
            See the demo
          </Link>
          <div className="pt-2 border-t border-slate-100">
            {[
              { to: '/compare/tekmetric', label: 'vs. Tekmetric' },
              { to: '/compare/shopmonkey', label: 'vs. Shopmonkey' },
              { to: '/compare/mitchell1', label: 'vs. Mitchell1' },
            ].map(({ to, label }) => (
              <Link
                key={to}
                to={to}
                onClick={() => setMobileMenuOpen(false)}
                className="block px-3 py-2.5 text-sm text-slate-500 hover:text-orange-600 rounded-lg transition-colors"
              >
                {label}
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Hero */}
      <section className="relative flex flex-col items-center text-center px-6 pt-20 md:pt-28 pb-20 overflow-hidden">
        <div className="animate-fade-up" style={{ animationDelay: '0ms' }}>
          <a href="#founding" className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-orange-300 bg-orange-50 text-orange-700 text-xs font-medium mb-6 hover:border-orange-400 transition-colors">
            Auto repair shop management software
          </a>
        </div>

        <h1
          className="text-4xl md:text-6xl font-extrabold text-slate-900 mb-5 max-w-3xl leading-tight animate-fade-up"
          style={{ fontFamily: FONT_HEADING, letterSpacing: '-0.03em', animationDelay: '80ms' }}
        >
          Stop flying blind.
          <br />
          <span className="text-orange-500">Run your auto shop on data.</span>
        </h1>

        <p className="text-slate-500 text-base md:text-lg max-w-xl mb-7 leading-relaxed animate-fade-up" style={{ fontFamily: FONT_BODY, animationDelay: '160ms' }}>
          Know exactly where every shop stands before your first call of the day. Repair orders, tech efficiency, and revenue across every bay and every location.
        </p>

        <div className="flex flex-wrap justify-center gap-2 mb-8 animate-fade-up" style={{ animationDelay: '210ms' }}>
          {[
            'Track every RO from estimate to paid',
            'See every tech\'s efficiency across every bay',
            'Replace whiteboards and manager calls',
          ].map(item => (
            <span key={item} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-100 border border-slate-200 text-slate-600 text-xs" style={{ fontFamily: FONT_BODY }}>
              <Check size={10} className="text-orange-500 flex-shrink-0" strokeWidth={2.5} />
              {item}
            </span>
          ))}
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-3 animate-fade-up" style={{ animationDelay: '280ms' }}>
          <Link to="/login" className="px-6 py-3 rounded-xl text-base font-semibold bg-orange-500 hover:bg-orange-600 text-white transition-colors shadow-sm" style={{ fontFamily: FONT_BODY }}>
            See the dashboard →
          </Link>
          <a href="#how-it-works" className="px-6 py-3 rounded-xl text-base font-medium text-slate-600 hover:text-slate-900 border border-slate-200 hover:border-slate-300 transition-colors" style={{ fontFamily: FONT_BODY }}>
            How it works
          </a>
        </div>
        <p className="text-slate-400 text-base mt-2 text-center animate-fade-up" style={{ fontFamily: FONT_BODY, animationDelay: '320ms' }}>
          Not ready to commit?{' '}
          <a href={CALENDLY_URL} target="_blank" rel="noopener noreferrer" className="text-orange-600 hover:text-orange-700 underline underline-offset-4 decoration-orange-300 transition-colors">
            Book a free 15-min walkthrough →
          </a>
        </p>

        <DashboardPreview />
      </section>

      {/* How it works */}
      <section id="how-it-works" className="max-w-5xl mx-auto px-6 py-24">
        <Reveal>
          <div className="text-center mb-14">
            <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4" style={{ fontFamily: FONT_HEADING, letterSpacing: '-0.02em' }}>
              Up and running in a day
            </h2>
            <p className="text-slate-500 max-w-sm mx-auto leading-relaxed" style={{ fontFamily: FONT_BODY }}>No long onboarding calls. No implementation fees. Just connect and go.</p>
          </div>
        </Reveal>
        <div className="grid md:grid-cols-3 gap-8 relative">
          {/* Connector line */}
          <div className="hidden md:block absolute top-7 left-[calc(16.67%+1rem)] right-[calc(16.67%+1rem)] h-px z-0 bg-gradient-to-r from-transparent via-orange-300 to-transparent" />
          {steps.map(({ num, title, desc }, i) => (
            <Reveal key={num} delay={i * 100}>
              <div className="relative z-10 flex flex-col items-start md:items-center text-left md:text-center">
                <div className="w-14 h-14 rounded-2xl bg-white border border-slate-200 flex items-center justify-center mb-5 flex-shrink-0 shadow-sm" style={{ boxShadow: '0 0 0 4px #FAFAF8' }}>
                  <span className="text-orange-500 text-sm font-bold" style={{ fontFamily: FONT_HEADING }}>{num}</span>
                </div>
                <h3 className="text-base font-semibold text-slate-900 mb-2" style={{ fontFamily: FONT_HEADING }}>{title}</h3>
                <p className="text-slate-500 text-sm leading-relaxed" style={{ fontFamily: FONT_BODY }}>{desc}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="max-w-5xl mx-auto px-6 pb-24">
        <Reveal>
          <div className="text-center mb-14">
            <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4" style={{ fontFamily: FONT_HEADING, letterSpacing: '-0.02em' }}>
              Everything your shop needs
            </h2>
            <p className="text-slate-500 max-w-md mx-auto leading-relaxed" style={{ fontFamily: FONT_BODY }}>Built specifically for auto repair shops, not a generic tool bolted onto your workflow.</p>
          </div>
        </Reveal>
        <div className="divide-y divide-slate-200">
          {features.map(({ icon: Icon, title, desc, badge, badgeSub }, i) => (
            <Reveal key={title} delay={i * 80} className="py-7 first:pt-0 last:pb-0">
              <div className="flex items-center gap-6">
                <div className="w-10 h-10 rounded-xl bg-orange-50 border border-orange-200 flex items-center justify-center flex-shrink-0">
                  <Icon size={18} className="text-orange-500" strokeWidth={1.8} />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-semibold text-slate-900 mb-1" style={{ fontFamily: FONT_HEADING }}>{title}</h3>
                  <p className="text-slate-500 text-sm leading-relaxed" style={{ fontFamily: FONT_BODY }}>{desc}</p>
                </div>
                <div className="hidden sm:block flex-shrink-0 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-right min-w-[90px]">
                  <div className="text-orange-500 text-sm font-semibold leading-none mb-1" style={{ fontFamily: FONT_HEADING }}>{badge}</div>
                  <div className="text-slate-400 text-xs" style={{ fontFamily: FONT_BODY }}>{badgeSub}</div>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* Who it's built for */}
      <section className="border-t border-slate-200 py-24 px-6 bg-slate-50/60">
        <div className="max-w-5xl mx-auto">
          <Reveal>
            <div className="text-center mb-14">
              <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4" style={{ fontFamily: FONT_HEADING, letterSpacing: '-0.02em' }}>
                Built for every role in your shop
              </h2>
              <p className="text-slate-500 max-w-md mx-auto text-sm md:text-base leading-relaxed" style={{ fontFamily: FONT_BODY }}>
                One login, every role. Owners see the full picture. Advisors run their board. Techs see their queue.
              </p>
            </div>
          </Reveal>
          <div className="grid md:grid-cols-3 gap-5">
            {[
              {
                role: 'Owner',
                headline: 'Always know where your business stands',
                points: [
                  'Revenue, open ROs, and staffing in one tab',
                  'Spot problems and top performers at a glance',
                  'Set monthly targets and track progress live',
                ],
              },
              {
                role: 'Service Advisor',
                headline: 'Run your board without the chaos',
                points: [
                  'Write and track ROs from estimate to payment',
                  'Pull full vehicle history before writing a line',
                  'Keep customers updated without chasing them down',
                ],
                highlight: true,
              },
              {
                role: 'Technician',
                headline: 'Clock in and know exactly where to start',
                points: [
                  'See your assigned jobs the moment you log in',
                  'No clipboard, no whiteboard. Everything\'s in your queue',
                  'Update job status from your phone between lifts',
                ],
              },
            ].map(({ role, headline, points, highlight }, i) => (
              <Reveal key={role} delay={i * 80}>
                <div className={`rounded-2xl border p-7 h-full flex flex-col ${highlight ? 'border-orange-300 bg-orange-50/60 shadow-sm' : 'border-slate-200 bg-white'}`}>
                  <div className={`text-xs uppercase tracking-widest font-semibold mb-4 ${highlight ? 'text-orange-600' : 'text-slate-400'}`} style={{ fontFamily: FONT_BODY }}>{role}</div>
                  <h3 className="text-base font-semibold text-slate-900 mb-5 leading-snug" style={{ fontFamily: FONT_HEADING }}>{headline}</h3>
                  <ul className="space-y-3">
                    {points.map(point => (
                      <li key={point} className="flex items-start gap-2.5">
                        <div className={`w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0 ${highlight ? 'bg-orange-500' : 'bg-slate-300'}`} />
                        <span className="text-slate-500 text-sm leading-relaxed" style={{ fontFamily: FONT_BODY }}>{point}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* What's included */}
      <section className="border-t border-slate-200 py-20 px-6">
        <div className="max-w-4xl mx-auto">
          <Reveal>
            <div className="text-center mb-10">
              <h2 className="text-2xl md:text-3xl font-bold text-slate-900 mb-3" style={{ fontFamily: FONT_HEADING, letterSpacing: '-0.02em' }}>
                Everything's included. No tiers, no add-ons.
              </h2>
              <p className="text-slate-400 text-sm" style={{ fontFamily: FONT_BODY }}>One plan. One price. Every feature on day one.</p>
            </div>
          </Reveal>
          <div className="grid sm:grid-cols-2 gap-x-10 gap-y-3.5">
            {[
              'Real-time cross-location dashboard',
              'Unlimited technicians and users',
              'Repair order tracking, every stage',
              'Tech efficiency scores and clock-ins',
              'Per-shop monthly revenue targets',
              'Mobile board for technicians',
              'Role-based access: owner, advisor, tech',
              'No per-seat fees. Ever.',
            ].map((item, i) => (
              <Reveal key={item} delay={i * 40}>
                <div className="flex items-center gap-3 py-1">
                  <div className="w-5 h-5 rounded-full bg-orange-100 border border-orange-200 flex items-center justify-center flex-shrink-0">
                    <Check size={10} className="text-orange-600" strokeWidth={2.5} />
                  </div>
                  <span className="text-slate-600 text-sm" style={{ fontFamily: FONT_BODY }}>{item}</span>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* Comparison */}
      <section className="border-t border-slate-200 py-24 px-6 bg-slate-50/60">
        <div className="max-w-4xl mx-auto">
          <Reveal>
            <div className="text-center mb-12">
              <div className="text-xs text-slate-400 uppercase tracking-widest font-medium mb-4" style={{ fontFamily: FONT_BODY }}>A different kind of tool</div>
              <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4" style={{ fontFamily: FONT_HEADING, letterSpacing: '-0.02em' }}>
                Most shop software is complex and overpriced.
                <br className="hidden md:block" />
                <span className="text-orange-500"> Ours is built to be neither.</span>
              </h2>
              <p className="text-slate-500 max-w-lg mx-auto leading-relaxed text-sm md:text-base" style={{ fontFamily: FONT_BODY }}>
                The big platforms hide pricing, charge per seat, and lock basics behind upgrade tiers. ShopCommand is one price per location, everything included, day one.
              </p>
            </div>
          </Reveal>

          <div className="rounded-2xl border border-slate-200 overflow-hidden bg-white">
            {/* Header row */}
            <div className="grid grid-cols-3 bg-slate-50 border-b border-slate-200 px-5 md:px-8 py-4">
              <div />
              <div className="text-slate-400 text-xs text-center uppercase tracking-widest font-medium" style={{ fontFamily: FONT_BODY }}>Typical shop software</div>
              <div className="text-orange-600 text-xs text-center uppercase tracking-widest font-semibold" style={{ fontFamily: FONT_BODY }}>ShopCommand</div>
            </div>
            {[
              { label: 'Default view',     them: 'One location at a time',      us: 'All shops, one screen' },
              { label: 'Pricing',          them: 'Per-seat + paid add-ons',     us: 'Per location. Unlimited users.' },
              { label: 'Getting started',  them: 'Days of onboarding calls',    us: 'Up and running same day' },
              { label: 'Built for',        them: 'Advisors and technicians',    us: 'The owner, first' },
              { label: 'Feature access',   them: 'Upgrade tiers to unlock basics', us: 'One plan. Everything in.' },
            ].map(({ label, them, us }, i, arr) => (
              <Reveal key={label} delay={i * 60}>
                <div className={`grid grid-cols-3 px-5 md:px-8 py-4 items-center ${i < arr.length - 1 ? 'border-b border-slate-100' : ''}`}>
                  <div className="text-slate-700 text-sm font-medium pr-4" style={{ fontFamily: FONT_BODY }}>{label}</div>
                  <div className="text-slate-400 text-xs md:text-sm text-center px-2 leading-snug" style={{ fontFamily: FONT_BODY }}>{them}</div>
                  <div className="text-orange-600 text-xs md:text-sm text-center font-semibold px-2 leading-snug" style={{ fontFamily: FONT_BODY }}>{us}</div>
                </div>
              </Reveal>
            ))}
          </div>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-5 mt-8">
            <Link to="/compare/tekmetric" className="text-slate-400 hover:text-orange-600 text-xs underline underline-offset-2 transition-colors">
              Full breakdown: ShopCommand vs. Tekmetric →
            </Link>
            <Link to="/compare/shopmonkey" className="text-slate-400 hover:text-orange-600 text-xs underline underline-offset-2 transition-colors">
              Full breakdown: ShopCommand vs. Shopmonkey →
            </Link>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="border-t border-slate-200 py-24 px-6">
        <div className="max-w-4xl mx-auto">
          <Reveal>
            <div className="text-center mb-12">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-slate-200 bg-slate-50 text-slate-500 text-xs font-medium mb-4" style={{ fontFamily: FONT_BODY }}>
                Simple pricing
              </div>
              <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4" style={{ fontFamily: FONT_HEADING, letterSpacing: '-0.02em' }}>
                Per location. No per-seat fees.
              </h2>
              <p className="text-slate-500 leading-relaxed max-w-md mx-auto" style={{ fontFamily: FONT_BODY }}>
                Pay for the shops you run, not the people who help you run them.
              </p>
            </div>
          </Reveal>
          <div className="grid md:grid-cols-2 gap-5">
            {/* Founding Member */}
            <Reveal delay={0}>
              <div className="relative rounded-2xl border-2 border-orange-400 bg-white p-7 flex flex-col h-full shadow-sm">
                <div className="absolute -top-3 left-6">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-orange-500 text-white text-xs font-semibold">
                    {TOTAL_SPOTS - CLAIMED_SPOTS} spots left
                  </span>
                </div>
                <div className="mb-5 pt-2">
                  <div className="text-orange-600 text-xs uppercase tracking-widest mb-3 font-medium" style={{ fontFamily: FONT_BODY }}>Founding Member</div>
                  <div className="flex items-end gap-2 mb-1">
                    <span className="text-5xl font-bold text-slate-900" style={{ fontFamily: FONT_HEADING, letterSpacing: '-0.03em' }}>$125</span>
                    <div className="mb-2">
                      <div className="text-slate-400 text-sm line-through leading-none mb-0.5">$199</div>
                      <div className="text-slate-500 text-xs">/mo forever</div>
                    </div>
                  </div>
                  <p className="text-slate-500 text-xs leading-relaxed" style={{ fontFamily: FONT_BODY }}>Single shop. Locked in for life: price never goes up as long as you stay subscribed.</p>
                </div>
                <div className="space-y-2.5 mb-7">
                  {[
                    'Everything in the standard plan',
                    'Founding member pricing locked forever',
                    'Direct line to the founding team',
                    'Shape the product roadmap',
                  ].map(item => (
                    <div key={item} className="flex items-center gap-2.5">
                      <div className="w-4 h-4 rounded-full bg-orange-100 flex items-center justify-center flex-shrink-0">
                        <Check size={9} className="text-orange-600" strokeWidth={2.5} />
                      </div>
                      <span className="text-slate-600 text-sm" style={{ fontFamily: FONT_BODY }}>{item}</span>
                    </div>
                  ))}
                </div>
                <a href="#founding"
                  className="mt-auto w-full py-3 rounded-xl text-sm font-semibold bg-orange-500 hover:bg-orange-600 text-white transition-colors text-center shadow-sm">
                  Reserve my founding spot →
                </a>
              </div>
            </Reveal>

            {/* Standard */}
            <Reveal delay={80}>
              <div className="rounded-2xl border border-slate-200 bg-white p-7 flex flex-col h-full">
                <div className="mb-5">
                  <div className="text-slate-400 text-xs uppercase tracking-widest mb-3 font-medium" style={{ fontFamily: FONT_BODY }}>Standard: After launch</div>
                  <div className="flex items-end gap-1.5 mb-1">
                    <span className="text-5xl font-bold text-slate-400" style={{ fontFamily: FONT_HEADING, letterSpacing: '-0.03em' }}>$199</span>
                    <span className="text-slate-400 text-sm mb-2">/mo</span>
                  </div>
                  <p className="text-slate-400 text-xs leading-relaxed" style={{ fontFamily: FONT_BODY }}>Single shop. $149/location for 3+ shops. Cancel anytime.</p>
                </div>
                <div className="space-y-2.5 mb-7">
                  {[
                    'Unlimited technicians and users',
                    'All locations in one dashboard',
                    'Repair order tracking',
                    'Real-time revenue and efficiency data',
                  ].map(item => (
                    <div key={item} className="flex items-center gap-2.5">
                      <div className="w-4 h-4 rounded-full bg-slate-100 flex items-center justify-center flex-shrink-0">
                        <Check size={9} className="text-slate-400" strokeWidth={2.5} />
                      </div>
                      <span className="text-slate-400 text-sm" style={{ fontFamily: FONT_BODY }}>{item}</span>
                    </div>
                  ))}
                </div>
                <div className="mt-auto w-full py-3 rounded-xl text-sm font-medium border border-slate-200 text-slate-400 text-center cursor-default" style={{ fontFamily: FONT_BODY }}>
                  Available at launch
                </div>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* Founder */}
      <section className="border-t border-slate-200 py-24 px-6 bg-slate-50/60">
        <div className="max-w-2xl mx-auto">
          <Reveal>
            <div className="text-xs text-slate-400 uppercase tracking-widest font-medium mb-10" style={{ fontFamily: FONT_BODY }}>Why I built this</div>
            <p className="text-slate-800 text-xl md:text-2xl leading-relaxed mb-6" style={{ fontFamily: FONT_HEADING, letterSpacing: '-0.01em' }}>
              "I watched shop owners spend their Fridays driving location to location just to get a picture of how the week went. Calling managers, chasing spreadsheets, guessing at numbers that should have been obvious."
            </p>
            <p className="text-slate-500 text-base leading-relaxed mb-10" style={{ fontFamily: FONT_BODY }}>
              ShopCommand started as a tool to fix that one problem: give shop owners a real-time view of their business without leaving their desk. One location or ten, it grew from there.
            </p>
            <div className="flex items-center gap-4">
              <div className="w-11 h-11 rounded-full bg-orange-100 border border-orange-200 flex items-center justify-center flex-shrink-0">
                <span className="text-orange-600 text-xs font-bold tracking-wide" style={{ fontFamily: FONT_HEADING }}>RO</span>
              </div>
              <div>
                <div className="text-slate-900 text-sm font-semibold" style={{ fontFamily: FONT_BODY }}>Rasheed Omar</div>
                <div className="text-slate-400 text-xs mt-0.5" style={{ fontFamily: FONT_BODY }}>Founder, ShopCommand, Houston TX</div>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* FAQ */}
      <section className="border-t border-slate-200 py-20 px-6">
        <div className="max-w-2xl mx-auto">
          <Reveal>
            <h2 className="text-2xl font-bold text-slate-900 mb-8" style={{ fontFamily: FONT_HEADING, letterSpacing: '-0.02em' }}>
              Common questions
            </h2>
          </Reveal>
          <div className="space-y-0 divide-y divide-slate-200">
            {faqs.map(({ q, a }, i) => (
              <FAQItem key={i} q={q} a={a} delay={i * 50} id={i} />
            ))}
          </div>
        </div>
      </section>

      {/* Founding Member signup */}
      <FoundingSection />

      {/* CTA */}
      <section className="relative py-28 px-6 text-center overflow-hidden border-t border-slate-200">
        <Reveal>
          <p className="relative text-orange-600 text-xs uppercase tracking-widest font-medium mb-4" style={{ fontFamily: FONT_BODY }}>Early access open now</p>
          <h2 className="relative text-4xl md:text-5xl font-bold text-slate-900 mb-5 max-w-xl mx-auto" style={{ fontFamily: FONT_HEADING, letterSpacing: '-0.03em' }}>
            Stop driving to your shops to check on every bay.
          </h2>
          <p className="relative text-slate-500 mb-10 max-w-sm mx-auto leading-relaxed" style={{ fontFamily: FONT_BODY }}>
            Every repair order, every tech, every location. Right in front of you.
          </p>
          <div className="relative flex flex-col sm:flex-row items-center justify-center gap-3">
            <a
              href="#founding"
              className="px-8 py-3.5 rounded-xl text-base font-semibold bg-orange-500 hover:bg-orange-600 text-white transition-colors shadow-sm"
              style={{ fontFamily: FONT_BODY }}
            >
              Reserve your founding spot: {TOTAL_SPOTS - CLAIMED_SPOTS} left →
            </a>
            <Link
              to="/login"
              className="px-6 py-3.5 rounded-xl text-base font-medium text-slate-500 hover:text-slate-900 border border-slate-200 hover:border-slate-300 transition-colors"
              style={{ fontFamily: FONT_BODY }}
            >
              See the dashboard
            </Link>
          </div>
        </Reveal>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-200 px-6 md:px-12 py-10 bg-slate-50/60">
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 hover:opacity-70 transition-opacity flex-shrink-0">
            <HexMark size={22} />
            <span className="text-slate-400 text-sm" style={{ fontFamily: FONT_HEADING }}>ShopCommand</span>
          </Link>

          {/* Contact */}
          <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-6">
            <a href={`mailto:${CONTACT_EMAIL}`} className="flex items-center gap-2 text-slate-400 hover:text-slate-600 text-sm transition-colors" style={{ fontFamily: FONT_BODY }}>
              <Mail size={13} className="flex-shrink-0" />
              {CONTACT_EMAIL}
            </a>
          </div>

          {/* Links + copyright */}
          <div className="flex flex-col items-center md:items-end gap-2.5">
            <div className="flex gap-5">
              <Link to="/terms" className="text-slate-400 hover:text-slate-600 text-xs transition-colors">Terms</Link>
              <Link to="/privacy" className="text-slate-400 hover:text-slate-600 text-xs transition-colors">Privacy</Link>
              <Link to="/dpa" className="text-slate-400 hover:text-slate-600 text-xs transition-colors">DPA</Link>
            </div>
            <p className="text-slate-300 text-xs" style={{ fontFamily: FONT_BODY }}>© 2026 ShopCommand. All rights reserved.</p>
          </div>
        </div>
      </footer>
      <CookieBanner />
    </div>
  )
}
