import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { Building2, Wrench, Users, Check, Mail, ChevronDown } from 'lucide-react'
import { CookieBanner } from '@/components/CookieBanner'

const TOTAL_SPOTS = 25
const CLAIMED_SPOTS = 0    // ← update this manually as signups come in
const CALENDLY_URL = 'https://calendly.com/rasheed-omar/30min'
const CONTACT_EMAIL = 'rasheed.omar@outlook.com'

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
      <polygon points={pts(32, 32.5, r)} fill="#0A0B12" />
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
        transform: visible ? 'translateY(0)' : 'translateY(28px)',
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
    desc: 'Add your location in minutes — one shop or ten. No IT required, no hardware to install. Just log in and go.',
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
    desc: 'Stop guessing how your shop is doing. Revenue, open ROs, and technician status — live, the moment you open your laptop. Running multiple locations? See them all at once.',
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
    desc: "Who's clocked in, who's behind, who's carrying the day — without being there. Efficiency scores, clock-ins, and performance data at your fingertips.",
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
    a: 'No — single-location shops get the same full dashboard. Multi-location owners just get the added ability to see everything across all their shops at once.',
  },
  {
    q: 'What happens to my data if I cancel?',
    a: 'Your data stays yours. You can export everything before you go. We don\'t hold it hostage.',
  },
  {
    q: 'When will the backend be ready for founding members?',
    a: 'We\'re onboarding our first shops now. Founding members get direct access to us during setup — you\'re not going through a ticket queue.',
  },
  {
    q: 'What does the $125/mo founding rate cover?',
    a: 'One shop location — unlimited technicians, users, and repair orders. The rate locks in forever as long as you stay subscribed. Price goes to $199 at public launch.',
  },
  {
    q: 'How is this different from Tekmetric or Shopmonkey?',
    a: 'Those are full shop management platforms — great at day-to-day operations for a single location. ShopCommand is built for the owner sitting above all their locations who needs real-time visibility across every shop without jumping between logins. Different problem, different tool.',
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
    <div ref={containerRef} className="relative mt-16 w-full max-w-3xl mx-auto rounded-2xl overflow-hidden border border-white/10 shadow-2xl shadow-black/60 animate-fade-up" style={{ animationDelay: '360ms' }}>
      <div className="flex items-center justify-between px-5 py-3 bg-white/[0.04] border-b border-white/[0.06]">
        <span className="text-white/30 text-xs uppercase tracking-wider">Live preview</span>
        <span className="text-orange-400/60 text-xs font-medium italic">sample data</span>
      </div>
      <div className="bg-[#0F1018]">
        <div className="grid grid-cols-4 gap-4 px-5 py-2.5 border-b border-white/[0.06]">
          {['Shop', 'Revenue', 'Open ROs', 'Techs'].map((h, i) => (
            <div key={h} className={`text-white/25 text-xs ${i > 0 ? 'text-right' : ''}`}>{h}</div>
          ))}
        </div>
        {shopRows.map(({ name, sub, ros, techs, best }, i) => (
          <div
            key={name}
            className="grid grid-cols-4 gap-4 px-5 py-3.5 border-b border-white/[0.04] last:border-0 items-center"
            style={{
              opacity: triggered ? 1 : 0,
              transform: triggered ? 'translateY(0)' : 'translateY(10px)',
              transition: `opacity 0.45s ease ${i * 110 + 700}ms, transform 0.45s ease ${i * 110 + 700}ms`,
            }}
          >
            <div>
              <div className="text-white text-sm font-medium">{name}</div>
              <div className={`text-xs mt-0.5 ${best ? 'text-green-400/80' : 'text-white/35'}`}>{sub}</div>
            </div>
            <div className="text-orange-400 text-sm font-bold text-right tabular-nums">
              ${counts[i].toLocaleString()}
            </div>
            <div className="text-right">
              <span className="bg-orange-500/10 text-orange-400 text-xs px-2 py-0.5 rounded-md">{ros}</span>
            </div>
            <div className="text-white/50 text-sm text-right">{techs}</div>
          </div>
        ))}
        <div className="px-5 py-2.5 border-t border-white/[0.04]">
          <span className="text-white/20 text-xs">3 of 5 locations shown</span>
        </div>
      </div>
    </div>
  )
}

// ─── FAQ item ─────────────────────────────────────────────────────────────────
function FAQItem({ q, a, delay }) {
  const [open, setOpen] = useState(false)
  const bodyRef = useRef(null)
  const [height, setHeight] = useState(0)

  useEffect(() => {
    if (bodyRef.current) {
      setHeight(open ? bodyRef.current.scrollHeight : 0)
    }
  }, [open])

  return (
    <Reveal delay={delay}>
      <div className="py-5">
        <button
          onClick={() => setOpen(o => !o)}
          className="w-full flex items-center justify-between gap-4 text-left group"
        >
          <span className="text-sm font-medium text-white group-hover:text-orange-400 transition-colors duration-200">{q}</span>
          <span
            className="text-white/30 text-xl leading-none flex-shrink-0 transition-transform duration-300"
            style={{ transform: open ? 'rotate(45deg)' : 'rotate(0deg)' }}
          >+</span>
        </button>
        <div
          style={{
            height: `${height}px`,
            overflow: 'hidden',
            transition: 'height 280ms cubic-bezier(0.16,1,0.3,1)',
          }}
        >
          <div ref={bodyRef} style={{ paddingTop: '12px', paddingBottom: '8px' }}>
            <p className="text-sm text-white/50 leading-relaxed pr-8">{a}</p>
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
    <section id="founding" className="border-t border-white/[0.06] py-24 px-6">
      <div className="max-w-2xl mx-auto">
        <Reveal>
          <div className="text-center mb-10">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-orange-500/30 bg-orange-500/10 text-orange-400 text-xs font-semibold mb-5">
              <span className="w-1.5 h-1.5 rounded-full bg-orange-400 animate-pulse" />
              Founding Member Program
            </div>
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4" style={{ fontFamily: '"Space Grotesk", system-ui', letterSpacing: '-0.02em' }}>
              Lock in $125/mo forever.
            </h2>
            <p className="text-white/55 leading-relaxed max-w-sm mx-auto">
              First {TOTAL_SPOTS} shops get founding member pricing — locked for life. Price goes to $199 when we open to everyone.
            </p>
          </div>
        </Reveal>

        <Reveal delay={80}>
          {/* Spot counter */}
          <div className="mb-8">
            <div className="flex justify-between text-xs mb-2">
              <span className="text-white/40">{CLAIMED_SPOTS === 0 ? 'Be the first to reserve a spot' : `${CLAIMED_SPOTS} of ${TOTAL_SPOTS} spots claimed`}</span>
              <span className="text-orange-400 font-semibold">{remaining} of {TOTAL_SPOTS} left</span>
            </div>
            <div className="h-2 rounded-full bg-white/[0.06] overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-orange-600 to-orange-400 transition-all duration-700"
                style={{ width: `${Math.max(pct, CLAIMED_SPOTS === 0 ? 0 : 4)}%` }}
              />
            </div>
          </div>

          {/* Walkthrough alternative */}
          <p className="text-center text-white/35 text-base mb-8">
            Want to see it first?{' '}
            <a href={CALENDLY_URL} target="_blank" rel="noopener noreferrer" className="text-orange-400/70 hover:text-orange-400 underline underline-offset-4 decoration-orange-400/30 transition-colors">
              Book a free 15-min walkthrough →
            </a>
          </p>

          {/* Form / success */}
          <div className="rounded-2xl border border-orange-500/20 bg-orange-500/[0.04] p-7"
            style={{ boxShadow: '0 0 60px rgba(249,115,22,0.06)' }}>
            {submitted ? (
              <div className="text-center py-6">
                <div className="w-14 h-14 rounded-full bg-orange-500/15 border border-orange-500/30 flex items-center justify-center mx-auto mb-5">
                  <Check size={24} className="text-orange-400" strokeWidth={2} />
                </div>
                <h3 className="text-lg font-semibold text-white mb-2" style={{ fontFamily: '"Space Grotesk", system-ui' }}>
                  You're on the list.
                </h3>
                <p className="text-white/50 text-sm leading-relaxed max-w-xs mx-auto">
                  We'll reach out to {form.email} within 24 hours with next steps. Welcome to the founding crew.
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-white/40 font-medium mb-1.5 uppercase tracking-wider">Your name</label>
                    <input
                      type="text"
                      placeholder="Marcus Webb"
                      value={form.name}
                      onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                      className="w-full h-11 px-4 rounded-xl bg-white/[0.06] border border-white/[0.10] text-white text-sm placeholder-white/25 focus:outline-none focus:border-orange-500/60 transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-white/40 font-medium mb-1.5 uppercase tracking-wider">Email</label>
                    <input
                      type="email"
                      placeholder="marcus@northhoustonauto.com"
                      value={form.email}
                      onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                      className="w-full h-11 px-4 rounded-xl bg-white/[0.06] border border-white/[0.10] text-white text-sm placeholder-white/25 focus:outline-none focus:border-orange-500/60 transition-colors"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs text-white/40 font-medium mb-1.5 uppercase tracking-wider">Shop name</label>
                  <input
                    type="text"
                    placeholder="North Houston Auto"
                    value={form.shop}
                    onChange={e => setForm(f => ({ ...f, shop: e.target.value }))}
                    className="w-full h-11 px-4 rounded-xl bg-white/[0.06] border border-white/[0.10] text-white text-sm placeholder-white/25 focus:outline-none focus:border-orange-500/60 transition-colors"
                  />
                </div>
                {error && <p className="text-orange-400/80 text-xs">{error}</p>}
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full h-12 rounded-xl text-sm font-semibold bg-orange-500 hover:bg-orange-400 disabled:opacity-60 disabled:cursor-not-allowed text-white transition-colors shadow-lg shadow-orange-500/20"
                >
                  {submitting ? 'Reserving your spot…' : 'Reserve my founding spot →'}
                </button>
                <p className="text-center text-white/25 text-xs">No credit card. No commitment. We'll reach out within 24 hours.</p>
              </form>
            )}
          </div>

          <p className="text-center text-white/35 text-sm mt-6 leading-relaxed">
            You won't get a ticket queue. Every founding member gets direct access to Rasheed — real answers, no support portal, no waiting.
          </p>
        </Reveal>
      </div>
    </section>
  )
}

// ─── Component ────────────────────────────────────────────────────────────────
const LANDING_TITLE = 'ShopCommand — Auto Shop Management Software'
const LANDING_DESC = 'Know exactly where your business stands before your first call of the day. Revenue, open ROs, and technician status — whether you\'re running one shop or five. Founding spots at $125/mo.'
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

  return (
    <div className="min-h-screen bg-[#0A0B12] text-white overflow-x-hidden" style={{ fontFamily: '"Inter", system-ui, sans-serif' }}>

      {/* Nav */}
      <nav className="flex items-center justify-between px-6 md:px-12 h-16 border-b border-white/[0.06] sticky top-0 z-50 backdrop-blur-md bg-[#0A0B12]/80">
        <Link to="/" className="flex items-center gap-2.5 hover:opacity-80 transition-opacity flex-shrink-0">
          <HexMark size={30} />
          <span style={{ fontFamily: '"Space Grotesk", system-ui, sans-serif', letterSpacing: '-0.02em' }} className="text-base font-semibold">
            <span className="text-white">Shop</span>
            <span className="text-orange-400">Command</span>
          </span>
        </Link>

        {/* Center links — desktop only */}
        <div className="hidden md:flex items-center gap-1 absolute left-1/2 -translate-x-1/2">
          <a href="#how-it-works" className="px-3 py-1.5 text-sm text-white/45 hover:text-white transition-colors rounded-lg hover:bg-white/[0.05]">
            How it works
          </a>
          <a href="#pricing" className="px-3 py-1.5 text-sm text-white/45 hover:text-white transition-colors rounded-lg hover:bg-white/[0.05]">
            Pricing
          </a>
          <div className="relative" ref={compareRef}>
            <button
              onClick={() => setCompareOpen(o => !o)}
              className="flex items-center gap-1 px-3 py-1.5 text-sm text-white/45 hover:text-white transition-colors rounded-lg hover:bg-white/[0.05]"
            >
              Compare
              <ChevronDown size={13} className={`transition-transform duration-200 ${compareOpen ? 'rotate-180' : ''}`} />
            </button>
            {compareOpen && (
              <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 bg-[#13141F] border border-white/[0.08] rounded-xl overflow-hidden shadow-2xl shadow-black/60 z-50 w-52">
                <Link
                  to="/compare/tekmetric"
                  onClick={() => setCompareOpen(false)}
                  className="flex items-center px-4 py-3 text-sm text-white/55 hover:text-white hover:bg-white/[0.05] transition-colors"
                >
                  ShopCommand vs. Tekmetric
                </Link>
                <Link
                  to="/compare/shopmonkey"
                  onClick={() => setCompareOpen(false)}
                  className="flex items-center px-4 py-3 text-sm text-white/55 hover:text-white hover:bg-white/[0.05] transition-colors border-t border-white/[0.06]"
                >
                  ShopCommand vs. Shopmonkey
                </Link>
                <Link
                  to="/compare/mitchell1"
                  onClick={() => setCompareOpen(false)}
                  className="flex items-center px-4 py-3 text-sm text-white/55 hover:text-white hover:bg-white/[0.05] transition-colors border-t border-white/[0.06]"
                >
                  ShopCommand vs. Mitchell1
                </Link>
                <Link
                  to="/compare/shop-ware"
                  onClick={() => setCompareOpen(false)}
                  className="flex items-center px-4 py-3 text-sm text-white/55 hover:text-white hover:bg-white/[0.05] transition-colors border-t border-white/[0.06]"
                >
                  ShopCommand vs. Shop-Ware
                </Link>
                <Link
                  to="/compare/ro-writer"
                  onClick={() => setCompareOpen(false)}
                  className="flex items-center px-4 py-3 text-sm text-white/55 hover:text-white hover:bg-white/[0.05] transition-colors border-t border-white/[0.06]"
                >
                  ShopCommand vs. R.O. Writer
                </Link>
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3 flex-shrink-0">
          <Link to="/login" className="px-4 py-1.5 text-sm font-medium text-white/60 hover:text-white transition-colors">
            See the demo
          </Link>
          <a href="#founding" className="px-4 py-1.5 rounded-lg text-sm font-semibold bg-orange-500 hover:bg-orange-400 text-white transition-colors whitespace-nowrap">
            Reserve your spot
          </a>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative flex flex-col items-center text-center px-6 pt-24 pb-20 overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[500px] rounded-full bg-orange-500/10 blur-[120px] pointer-events-none animate-glow-pulse" />
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.07) 1px, transparent 1px)',
            backgroundSize: '28px 28px',
            maskImage: 'radial-gradient(ellipse 80% 70% at 50% 40%, black 20%, transparent 75%)',
            WebkitMaskImage: 'radial-gradient(ellipse 80% 70% at 50% 40%, black 20%, transparent 75%)',
          }}
        />

        <div className="animate-fade-up" style={{ animationDelay: '0ms' }}>
          <a href="#founding" className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-orange-500/30 bg-orange-500/10 text-orange-400 text-xs font-medium mb-6 hover:border-orange-500/50 transition-colors">
            <span className="w-1.5 h-1.5 rounded-full bg-orange-400 animate-pulse" />
            Founding member rate — {TOTAL_SPOTS - CLAIMED_SPOTS} of {TOTAL_SPOTS} spots left
          </a>
        </div>

        <h1
          className="text-4xl md:text-6xl font-bold text-white mb-5 max-w-3xl leading-tight animate-fade-up"
          style={{ fontFamily: '"Space Grotesk", system-ui, sans-serif', letterSpacing: '-0.03em', animationDelay: '80ms' }}
        >
          Stop flying blind.
          <br />
          <span className="text-orange-400">Run your shop smarter.</span>
        </h1>

        <p className="text-white/65 text-base md:text-lg max-w-xl mb-7 leading-relaxed animate-fade-up" style={{ animationDelay: '160ms' }}>
          Know exactly where your business stands before your first call of the day. Revenue, open ROs, and technician status — live, whether you're running one shop or five.
        </p>

        <div className="flex flex-wrap justify-center gap-2 mb-8 animate-fade-up" style={{ animationDelay: '210ms' }}>
          {[
            'Run on data, not gut feel',
            'Catch problems before they get expensive',
            'Replace spreadsheets and manager calls',
          ].map(item => (
            <span key={item} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/[0.05] border border-white/[0.08] text-white/45 text-xs">
              <Check size={10} className="text-orange-400 flex-shrink-0" strokeWidth={2.5} />
              {item}
            </span>
          ))}
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-3 animate-fade-up" style={{ animationDelay: '280ms' }}>
          <Link to="/login" className="px-6 py-3 rounded-xl text-base font-semibold bg-orange-500 hover:bg-orange-400 text-white transition-colors shadow-lg shadow-orange-500/20">
            See the dashboard →
          </Link>
          <a href="#how-it-works" className="px-6 py-3 rounded-xl text-base font-medium text-white/60 hover:text-white border border-white/10 hover:border-white/20 transition-colors">
            How it works
          </a>
        </div>
        <p className="text-white/35 text-base mt-2 text-center animate-fade-up" style={{ animationDelay: '320ms' }}>
          Not ready to commit?{' '}
          <a href={CALENDLY_URL} target="_blank" rel="noopener noreferrer" className="text-white/55 hover:text-orange-400 underline underline-offset-4 decoration-white/20 hover:decoration-orange-400/50 transition-colors">
            Book a free 15-min walkthrough →
          </a>
        </p>

        <DashboardPreview />
      </section>

      {/* How it works */}
      <section id="how-it-works" className="max-w-5xl mx-auto px-6 py-24">
        <Reveal>
          <div className="text-center mb-14">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4" style={{ fontFamily: '"Space Grotesk", system-ui', letterSpacing: '-0.02em' }}>
              Up and running in a day
            </h2>
            <p className="text-white/65 max-w-sm mx-auto leading-relaxed">No long onboarding calls. No implementation fees. Just connect and go.</p>
          </div>
        </Reveal>
        <div className="grid md:grid-cols-3 gap-8 relative">
          {/* Connector line */}
          <div className="hidden md:block absolute top-7 left-[calc(16.67%+1rem)] right-[calc(16.67%+1rem)] h-px z-0 bg-gradient-to-r from-transparent via-orange-500/30 to-transparent" />
          {steps.map(({ num, title, desc }, i) => (
            <Reveal key={num} delay={i * 100}>
              <div className="relative z-10 flex flex-col items-start md:items-center text-left md:text-center">
                <div className="w-14 h-14 rounded-2xl bg-[#0A0B12] border border-orange-500/20 flex items-center justify-center mb-5 flex-shrink-0" style={{ boxShadow: '0 0 0 4px #0A0B12' }}>
                  <span className="text-orange-400 text-sm font-bold" style={{ fontFamily: '"Space Grotesk", system-ui' }}>{num}</span>
                </div>
                <h3 className="text-base font-semibold text-white mb-2" style={{ fontFamily: '"Space Grotesk", system-ui' }}>{title}</h3>
                <p className="text-white/65 text-sm leading-relaxed">{desc}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="max-w-5xl mx-auto px-6 pb-24">
        <Reveal>
          <div className="text-center mb-14">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4" style={{ fontFamily: '"Space Grotesk", system-ui', letterSpacing: '-0.02em' }}>
              Everything your shop needs
            </h2>
            <p className="text-white/65 max-w-md mx-auto leading-relaxed">Built specifically for auto repair shops — not a generic tool bolted onto your workflow.</p>
          </div>
        </Reveal>
        <div className="divide-y divide-white/[0.06]">
          {features.map(({ icon: Icon, title, desc, badge, badgeSub }, i) => (
            <Reveal key={title} delay={i * 80} className="py-7 first:pt-0 last:pb-0">
              <div className="flex items-center gap-6">
                <div className="w-10 h-10 rounded-xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center flex-shrink-0">
                  <Icon size={18} className="text-orange-400" strokeWidth={1.8} />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-semibold text-white mb-1" style={{ fontFamily: '"Space Grotesk", system-ui' }}>{title}</h3>
                  <p className="text-white/65 text-sm leading-relaxed">{desc}</p>
                </div>
                <div className="flex-shrink-0 bg-[#0F1018] border border-white/[0.06] rounded-xl px-4 py-3 text-right min-w-[90px]">
                  <div className="text-orange-400 text-sm font-semibold leading-none mb-1" style={{ fontFamily: '"Space Grotesk", system-ui' }}>{badge}</div>
                  <div className="text-white/40 text-xs">{badgeSub}</div>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* Who it's built for */}
      <section className="border-t border-white/[0.06] py-24 px-6">
        <div className="max-w-5xl mx-auto">
          <Reveal>
            <div className="text-center mb-14">
              <h2 className="text-3xl md:text-4xl font-bold text-white mb-4" style={{ fontFamily: '"Space Grotesk", system-ui', letterSpacing: '-0.02em' }}>
                Built for every role in your shop
              </h2>
              <p className="text-white/50 max-w-md mx-auto text-sm md:text-base leading-relaxed">
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
                  'No clipboard, no whiteboard — everything\'s in your queue',
                  'Update job status from your phone between lifts',
                ],
              },
            ].map(({ role, headline, points, highlight }, i) => (
              <Reveal key={role} delay={i * 80}>
                <div className={`rounded-2xl border p-7 h-full flex flex-col ${highlight ? 'border-orange-500/30 bg-orange-500/[0.05]' : 'border-white/[0.08] bg-white/[0.02]'}`}>
                  <div className={`text-xs uppercase tracking-widest font-semibold mb-4 ${highlight ? 'text-orange-400' : 'text-white/30'}`}>{role}</div>
                  <h3 className="text-base font-semibold text-white mb-5 leading-snug" style={{ fontFamily: '"Space Grotesk", system-ui' }}>{headline}</h3>
                  <ul className="space-y-3">
                    {points.map(point => (
                      <li key={point} className="flex items-start gap-2.5">
                        <div className={`w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0 ${highlight ? 'bg-orange-400' : 'bg-white/25'}`} />
                        <span className="text-white/55 text-sm leading-relaxed">{point}</span>
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
      <section className="border-t border-white/[0.06] py-20 px-6">
        <div className="max-w-4xl mx-auto">
          <Reveal>
            <div className="text-center mb-10">
              <h2 className="text-2xl md:text-3xl font-bold text-white mb-3" style={{ fontFamily: '"Space Grotesk", system-ui', letterSpacing: '-0.02em' }}>
                Everything's included. No tiers, no add-ons.
              </h2>
              <p className="text-white/45 text-sm">One plan. One price. Every feature on day one.</p>
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
              'Role-based access — owner, advisor, tech',
              'No per-seat fees. Ever.',
            ].map((item, i) => (
              <Reveal key={item} delay={i * 40}>
                <div className="flex items-center gap-3 py-1">
                  <div className="w-5 h-5 rounded-full bg-orange-500/15 border border-orange-500/25 flex items-center justify-center flex-shrink-0">
                    <Check size={10} className="text-orange-400" strokeWidth={2.5} />
                  </div>
                  <span className="text-white/60 text-sm">{item}</span>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* Comparison */}
      <section className="border-t border-white/[0.06] py-24 px-6">
        <div className="max-w-4xl mx-auto">
          <Reveal>
            <div className="text-center mb-12">
              <div className="text-xs text-white/30 uppercase tracking-widest font-medium mb-4">A different kind of tool</div>
              <h2 className="text-3xl md:text-4xl font-bold text-white mb-4" style={{ fontFamily: '"Space Grotesk", system-ui', letterSpacing: '-0.02em' }}>
                Most shop software is complex and overpriced.
                <br className="hidden md:block" />
                <span className="text-orange-400"> Ours is built to be neither.</span>
              </h2>
              <p className="text-white/50 max-w-lg mx-auto leading-relaxed text-sm md:text-base">
                The big platforms hide pricing, charge per seat, and lock basics behind upgrade tiers. ShopCommand is one price per location — everything included, day one.
              </p>
            </div>
          </Reveal>

          <div className="rounded-2xl border border-white/[0.08] overflow-hidden">
            {/* Header row */}
            <div className="grid grid-cols-3 bg-white/[0.03] border-b border-white/[0.08] px-5 md:px-8 py-4">
              <div />
              <div className="text-white/30 text-xs text-center uppercase tracking-widest font-medium">Typical shop software</div>
              <div className="text-orange-400 text-xs text-center uppercase tracking-widest font-semibold">ShopCommand</div>
            </div>
            {[
              { label: 'Default view',     them: 'One location at a time',      us: 'All shops, one screen' },
              { label: 'Pricing',          them: 'Per-seat + paid add-ons',     us: 'Per location. Unlimited users.' },
              { label: 'Getting started',  them: 'Days of onboarding calls',    us: 'Up and running same day' },
              { label: 'Built for',        them: 'Advisors and technicians',    us: 'The owner, first' },
              { label: 'Feature access',   them: 'Upgrade tiers to unlock basics', us: 'One plan. Everything in.' },
            ].map(({ label, them, us }, i, arr) => (
              <Reveal key={label} delay={i * 60}>
                <div className={`grid grid-cols-3 px-5 md:px-8 py-4 items-center ${i < arr.length - 1 ? 'border-b border-white/[0.05]' : ''}`}>
                  <div className="text-white/55 text-sm font-medium pr-4">{label}</div>
                  <div className="text-white/28 text-xs md:text-sm text-center px-2 leading-snug">{them}</div>
                  <div className="text-orange-400 text-xs md:text-sm text-center font-semibold px-2 leading-snug">{us}</div>
                </div>
              </Reveal>
            ))}
          </div>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-5 mt-8">
            <Link to="/compare/tekmetric" className="text-white/30 hover:text-orange-400 text-xs underline underline-offset-2 transition-colors">
              Full breakdown: ShopCommand vs. Tekmetric →
            </Link>
            <Link to="/compare/shopmonkey" className="text-white/30 hover:text-orange-400 text-xs underline underline-offset-2 transition-colors">
              Full breakdown: ShopCommand vs. Shopmonkey →
            </Link>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="border-t border-white/[0.06] py-24 px-6">
        <div className="max-w-4xl mx-auto">
          <Reveal>
            <div className="text-center mb-12">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-white/10 bg-white/[0.04] text-white/40 text-xs font-medium mb-4">
                Simple pricing
              </div>
              <h2 className="text-3xl md:text-4xl font-bold text-white mb-4" style={{ fontFamily: '"Space Grotesk", system-ui', letterSpacing: '-0.02em' }}>
                Per location. No per-seat fees.
              </h2>
              <p className="text-white/65 leading-relaxed max-w-md mx-auto">
                Pay for the shops you run, not the people who help you run them.
              </p>
            </div>
          </Reveal>
          <div className="grid md:grid-cols-2 gap-5">
            {/* Founding Member */}
            <Reveal delay={0}>
              <div className="relative rounded-2xl border border-orange-500/40 bg-orange-500/[0.06] p-7 flex flex-col h-full"
                style={{ boxShadow: '0 0 40px rgba(249,115,22,0.08)' }}>
                <div className="absolute -top-3 left-6">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-orange-500 text-white text-xs font-semibold">
                    <span className="w-1.5 h-1.5 rounded-full bg-white/70 animate-pulse" />
                    {TOTAL_SPOTS - CLAIMED_SPOTS} spots left
                  </span>
                </div>
                <div className="mb-5 pt-2">
                  <div className="text-orange-400/80 text-xs uppercase tracking-widest mb-3 font-medium">Founding Member</div>
                  <div className="flex items-end gap-2 mb-1">
                    <span className="text-5xl font-bold text-white" style={{ fontFamily: '"Space Grotesk", system-ui', letterSpacing: '-0.03em' }}>$125</span>
                    <div className="mb-2">
                      <div className="text-white/35 text-sm line-through leading-none mb-0.5">$199</div>
                      <div className="text-white/40 text-xs">/mo forever</div>
                    </div>
                  </div>
                  <p className="text-white/45 text-xs leading-relaxed">Single shop. Locked in for life — price never goes up as long as you stay subscribed.</p>
                </div>
                <div className="space-y-2.5 mb-7">
                  {[
                    'Everything in the standard plan',
                    'Founding member pricing locked forever',
                    'Direct line to the founding team',
                    'Shape the product roadmap',
                  ].map(item => (
                    <div key={item} className="flex items-center gap-2.5">
                      <div className="w-4 h-4 rounded-full bg-orange-500/20 flex items-center justify-center flex-shrink-0">
                        <Check size={9} className="text-orange-400" strokeWidth={2.5} />
                      </div>
                      <span className="text-white/65 text-sm">{item}</span>
                    </div>
                  ))}
                </div>
                <a href="#founding"
                  className="mt-auto w-full py-3 rounded-xl text-sm font-semibold bg-orange-500 hover:bg-orange-400 text-white transition-colors text-center shadow-lg shadow-orange-500/20">
                  Reserve my founding spot →
                </a>
              </div>
            </Reveal>

            {/* Standard */}
            <Reveal delay={80}>
              <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-7 flex flex-col h-full">
                <div className="mb-5">
                  <div className="text-white/35 text-xs uppercase tracking-widest mb-3 font-medium">Standard — After launch</div>
                  <div className="flex items-end gap-1.5 mb-1">
                    <span className="text-5xl font-bold text-white/70" style={{ fontFamily: '"Space Grotesk", system-ui', letterSpacing: '-0.03em' }}>$199</span>
                    <span className="text-white/30 text-sm mb-2">/mo</span>
                  </div>
                  <p className="text-white/30 text-xs leading-relaxed">Single shop. $149/location for 3+ shops. Cancel anytime.</p>
                </div>
                <div className="space-y-2.5 mb-7">
                  {[
                    'Unlimited technicians and users',
                    'All locations in one dashboard',
                    'Repair order tracking',
                    'Real-time revenue and efficiency data',
                  ].map(item => (
                    <div key={item} className="flex items-center gap-2.5">
                      <div className="w-4 h-4 rounded-full bg-white/[0.06] flex items-center justify-center flex-shrink-0">
                        <Check size={9} className="text-white/30" strokeWidth={2.5} />
                      </div>
                      <span className="text-white/35 text-sm">{item}</span>
                    </div>
                  ))}
                </div>
                <div className="mt-auto w-full py-3 rounded-xl text-sm font-medium border border-white/[0.08] text-white/25 text-center cursor-default">
                  Available at launch
                </div>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* Founder */}
      <section className="border-t border-white/[0.06] py-24 px-6">
        <div className="max-w-2xl mx-auto">
          <Reveal>
            <div className="text-xs text-white/35 uppercase tracking-widest font-medium mb-10">Why I built this</div>
            <p className="text-white/80 text-xl md:text-2xl leading-relaxed mb-6" style={{ fontFamily: '"Space Grotesk", system-ui', letterSpacing: '-0.01em' }}>
              "I watched shop owners spend their Fridays driving location to location just to get a picture of how the week went. Calling managers, chasing spreadsheets, guessing at numbers that should have been obvious."
            </p>
            <p className="text-white/45 text-base leading-relaxed mb-10">
              ShopCommand started as a tool to fix that one problem — give shop owners a real-time view of their business without leaving their desk. One location or ten, it grew from there.
            </p>
            <div className="flex items-center gap-4">
              <div className="w-11 h-11 rounded-full bg-orange-500/15 border border-orange-500/25 flex items-center justify-center flex-shrink-0">
                <span className="text-orange-400 text-xs font-bold tracking-wide" style={{ fontFamily: '"Space Grotesk", system-ui' }}>RO</span>
              </div>
              <div>
                <div className="text-white text-sm font-semibold">Rasheed Omar</div>
                <div className="text-white/35 text-xs mt-0.5">Founder · ShopCommand · Houston, TX</div>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* FAQ */}
      <section className="border-t border-white/[0.06] py-20 px-6">
        <div className="max-w-2xl mx-auto">
          <Reveal>
            <h2 className="text-2xl font-bold text-white mb-8" style={{ fontFamily: '"Space Grotesk", system-ui', letterSpacing: '-0.02em' }}>
              Common questions
            </h2>
          </Reveal>
          <div className="space-y-0 divide-y divide-white/[0.06]">
            {faqs.map(({ q, a }, i) => (
              <FAQItem key={i} q={q} a={a} delay={i * 50} />
            ))}
          </div>
        </div>
      </section>

      {/* Support promise */}
      {/* Founding Member signup */}
      <FoundingSection />

      {/* CTA */}
      <section className="relative py-28 px-6 text-center overflow-hidden border-t border-white/[0.06]">
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-[600px] h-[350px] bg-orange-500/[0.08] rounded-full blur-[120px] animate-glow-pulse" />
        </div>
        <Reveal>
          <p className="relative text-orange-400/80 text-xs uppercase tracking-widest font-medium mb-4">Early access open now</p>
          <h2 className="relative text-4xl md:text-5xl font-bold text-white mb-5 max-w-xl mx-auto" style={{ fontFamily: '"Space Grotesk", system-ui', letterSpacing: '-0.03em' }}>
            Stop driving to your shops to find out how they're doing.
          </h2>
          <p className="relative text-white/65 mb-10 max-w-sm mx-auto leading-relaxed">
            Everything across all your locations, right in front of you. Always.
          </p>
          <div className="relative flex flex-col sm:flex-row items-center justify-center gap-3">
            <a
              href="#founding"
              className="px-8 py-3.5 rounded-xl text-base font-semibold bg-orange-500 hover:bg-orange-400 text-white transition-colors shadow-lg shadow-orange-500/25"
            >
              Reserve your founding spot — {TOTAL_SPOTS - CLAIMED_SPOTS} left →
            </a>
            <Link
              to="/login"
              className="px-6 py-3.5 rounded-xl text-base font-medium text-white/50 hover:text-white border border-white/10 hover:border-white/20 transition-colors"
            >
              See the dashboard
            </Link>
          </div>
        </Reveal>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/[0.06] px-6 md:px-12 py-10">
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 hover:opacity-70 transition-opacity flex-shrink-0">
            <HexMark size={22} />
            <span className="text-white/40 text-sm" style={{ fontFamily: '"Space Grotesk", system-ui' }}>ShopCommand</span>
          </Link>

          {/* Contact */}
          <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-6">
            <a href={`mailto:${CONTACT_EMAIL}`} className="flex items-center gap-2 text-white/35 hover:text-white/60 text-sm transition-colors">
              <Mail size={13} className="flex-shrink-0" />
              {CONTACT_EMAIL}
            </a>
          </div>

          {/* Links + copyright */}
          <div className="flex flex-col items-center md:items-end gap-2.5">
            <div className="flex gap-5">
              <Link to="/terms" className="text-white/25 hover:text-white/50 text-xs transition-colors">Terms</Link>
              <Link to="/privacy" className="text-white/25 hover:text-white/50 text-xs transition-colors">Privacy</Link>
              <Link to="/dpa" className="text-white/25 hover:text-white/50 text-xs transition-colors">DPA</Link>
            </div>
            <p className="text-white/20 text-xs">© 2026 ShopCommand. All rights reserved.</p>
          </div>
        </div>
      </footer>
      <CookieBanner />
    </div>
  )
}
