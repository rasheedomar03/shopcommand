import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { Wrench, ClipboardList, Gauge, Car, Check, Mail, ChevronDown, Menu, X, Shield, Zap, Smartphone, Clock } from 'lucide-react'
import { CookieBanner } from '@/components/CookieBanner'
import { sanitizeField, isValidEmail } from '@/lib/utils'

const TOTAL_SPOTS = 25
const CLAIMED_SPOTS = 0    // ← update this manually as signups come in
const CALENDLY_URL = 'https://calendly.com/rasheed-omar/30min'
const CONTACT_EMAIL = 'rasheed.omar@outlook.com'

/* ─── Color tokens ────────────────────────────────────────────────────────────
   Warm light palette. Every neutral tinted toward warm-gray.
   Orange stays brand (#F97316) but used deliberately, not everywhere.
   ──────────────────────────────────────────────────────────────────────────── */
// Typography: Inter everywhere via Tailwind config. No inline font overrides.

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
    <svg width={size} height={size} viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg" role="img" aria-hidden="true">
      <polygon points={pts(32, 32, R)} fill="#F97316" />
      <polygon points={pts(32, 32.5, r)} fill="#0D0E14" />
    </svg>
  )
}

// ─── Data ─────────────────────────────────────────────────────────────────────
const steps = [
  {
    title: 'Intake the vehicle',
    desc: "Customer drops off or calls ahead — you capture the complaint, VIN, and contact info in one screen. The repair order is open before the keys hit the hook.",
  },
  {
    title: 'Assign & track the work',
    desc: "Route the job to the right tech, clock them in, and watch hours accumulate in real time. No clipboard. No whiteboard. Everyone knows what they're on.",
  },
  {
    title: 'Parts, labor & approvals',
    desc: "Add labor lines, pull parts from inventory (or order them), and send digital approvals to the customer. Inventory updates automatically.",
  },
  {
    title: 'Invoice & collect payment',
    desc: "One click turns the RO into an invoice. Customer pays in-shop or online. The job closes, revenue posts, and your books stay clean.",
  },
]

const features = [
  {
    icon: Gauge,
    title: 'Your whole business, one tab',
    desc: 'Stop guessing how your shop is doing. Revenue, open ROs, and technician status live, the moment you open your laptop. Running multiple locations? See them all at once.',
  },
  {
    icon: Clock,
    title: 'Time clock built right in',
    desc: "Techs clock in and out from their phone or the shop terminal. You see who's on the floor, track billable hours against actual hours, and catch overtime before it happens.",
  },
  {
    icon: ClipboardList,
    title: 'Every job, accounted for',
    desc: "No more calling the manager to find out where a job stands. Every RO moves through stages digitally, with full history and accountability from the moment it's written.",
  },
  {
    icon: Wrench,
    title: 'Know your team without the check-in calls',
    desc: "Who's behind, who's carrying the day, and who hit their hours target. Efficiency scores, shift logs, and performance data — without being there.",
  },
]

// ─── Integration partners ────────────────────────────────────────────────────
const integrations = ['CARFAX', 'QuickBooks', 'PartsTech', 'Worldpac', 'Stripe']


const faqs = [
  {
    q: 'Do I need to install anything?',
    a: 'No. ShopCommand is fully browser-based and loads instantly on any device. You log in, add your locations, and you\'re running. Nothing to download, no IT required.',
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
    <div ref={containerRef} className="relative w-full rounded-2xl overflow-hidden border border-slate-200/80 shadow-xl shadow-slate-900/[0.06]">
      {/* Keep dashboard dark-themed — it IS the product */}
      <div className="flex items-center justify-between px-5 py-3 bg-[#0F1018] border-b border-white/[0.08]">
        <span className="text-white/60 text-xs uppercase tracking-wider">Live preview</span>
        <span className="text-orange-400/70 text-xs font-medium italic">sample data</span>
      </div>
      <div className="bg-[#0F1018]">
        <div className="grid grid-cols-4 gap-4 px-5 py-2.5 border-b border-white/[0.08]">
          {['Shop', 'Revenue', 'Open ROs', 'Techs'].map((h, i) => (
            <div key={h} className={`text-white/60 text-xs ${i > 0 ? 'text-right' : ''}`} >{h}</div>
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
              <div className="text-white text-sm font-medium">{name}</div>
              <div className={`text-xs mt-0.5 ${best ? 'text-emerald-400/90' : 'text-white/40'}`} >{sub}</div>
            </div>
            <div className="text-orange-400 text-sm font-bold text-right tabular-nums">
              ${counts[i].toLocaleString()}
            </div>
            <div className="text-right">
              <span className="bg-orange-500/15 text-orange-400 text-xs px-2 py-0.5 rounded-md">{ros}</span>
            </div>
            <div className="text-white/70 text-sm text-right">{techs}</div>
          </div>
        ))}
        <div className="px-5 py-2.5 border-t border-white/[0.06]">
          <span className="text-white/60 text-xs">3 of 5 locations shown</span>
        </div>
      </div>
    </div>
  )
}

// ─── Feature previews ────────────────────────────────────────────────────────
function ROPreview() {
  const rows = [
    { id: 'RO-4821', vehicle: '2019 F-150 · Brake job', status: 'In progress', advisor: 'Sarah M.', color: 'text-emerald-400', bg: 'bg-emerald-400/15' },
    { id: 'RO-4820', vehicle: '2022 Camry · 60k service', status: 'Waiting parts', advisor: 'Sarah M.', color: 'text-amber-400', bg: 'bg-amber-400/15' },
    { id: 'RO-4819', vehicle: '2018 Silverado · A/C diag', status: 'Ready for pickup', advisor: 'James T.', color: 'text-blue-400', bg: 'bg-blue-400/15' },
    { id: 'RO-4818', vehicle: '2021 Accord · Oil + rotate', status: 'Invoiced', advisor: 'James T.', color: 'text-slate-400', bg: 'bg-slate-400/15' },
  ]
  return (
    <div className="rounded-2xl overflow-hidden border border-slate-200/80 shadow-xl shadow-slate-900/[0.06]">
      <div className="flex items-center justify-between px-5 py-3 bg-[#0F1018] border-b border-white/[0.08]">
        <span className="text-white/60 text-xs uppercase tracking-wider">Repair orders</span>
        <span className="text-white/60 text-xs">Today</span>
      </div>
      <div className="bg-[#0F1018] divide-y divide-white/[0.06]">
        {rows.map(({ id, vehicle, status, color, bg }) => (
          <div key={id} className="flex items-center justify-between px-5 py-3">
            <div>
              <div className="text-white/80 text-sm font-medium">{id}</div>
              <div className="text-white/60 text-xs mt-0.5">{vehicle}</div>
            </div>
            <span className={`text-xs px-2 py-0.5 rounded-md ${color} ${bg}`}>{status}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function TechPreview() {
  const techs = [
    { name: 'Mike R.', status: 'Clocked in', job: 'RO-4821 · Bay 3', hours: '6.2h', efficiency: '94%', effColor: 'text-emerald-400' },
    { name: 'Carlos P.', status: 'Clocked in', job: 'RO-4820 · Bay 1', hours: '5.8h', efficiency: '87%', effColor: 'text-emerald-400' },
    { name: 'Andre W.', status: 'On break', job: '—', hours: '4.1h', efficiency: '78%', effColor: 'text-amber-400' },
  ]
  return (
    <div className="rounded-2xl overflow-hidden border border-slate-200/80 shadow-xl shadow-slate-900/[0.06]">
      <div className="flex items-center justify-between px-5 py-3 bg-[#0F1018] border-b border-white/[0.08]">
        <span className="text-white/60 text-xs uppercase tracking-wider">Technicians</span>
        <span className="text-white/60 text-xs">Live</span>
      </div>
      <div className="bg-[#0F1018]">
        <div className="grid grid-cols-[1fr_auto_auto] gap-4 px-5 py-2 border-b border-white/[0.08]">
          <span className="text-white/60 text-xs">Tech</span>
          <span className="text-white/60 text-xs text-right">Hours</span>
          <span className="text-white/60 text-xs text-right w-12">Eff.</span>
        </div>
        <div className="divide-y divide-white/[0.06]">
          {techs.map(({ name, status, job, hours, efficiency, effColor }) => (
            <div key={name} className="grid grid-cols-[1fr_auto_auto] gap-4 px-5 py-3 items-center">
              <div>
                <div className="text-white/80 text-sm font-medium">{name}</div>
                <div className="text-white/60 text-xs mt-0.5">{status} · {job}</div>
              </div>
              <div className="text-white/70 text-sm text-right tabular-nums">{hours}</div>
              <div className={`text-sm font-semibold text-right tabular-nums w-12 ${effColor}`}>{efficiency}</div>
            </div>
          ))}
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
      <div className="py-5">
        <button
          id={buttonId}
          onClick={() => setOpen(o => !o)}
          aria-expanded={open}
          aria-controls={panelId}
          className="w-full flex items-center justify-between gap-4 text-left group focus-visible:outline-2 focus-visible:outline-orange-500 focus-visible:outline-offset-2 rounded-lg"
        >
          <span className="text-sm font-medium text-slate-800 group-hover:text-orange-600 transition-colors duration-200">{q}</span>
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
            <p className="text-sm text-slate-500 leading-relaxed pr-8">{a}</p>
          </div>
        </div>
      </div>
  )
}

// ─── Founding Shop Program ───────────────────────────────────────────────────
function FoundingSection() {
  const remaining = TOTAL_SPOTS - CLAIMED_SPOTS
  const pct = Math.round((CLAIMED_SPOTS / TOTAL_SPOTS) * 100)

  const [form, setForm] = useState({ name: '', email: '', locations: '' })
  const [honeypot, setHoneypot] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const lastSubmitRef = useRef(0)

  const handleSubmit = async (e) => {
    e.preventDefault()

    // Honeypot — bots fill hidden fields
    if (honeypot) return

    // Rate limit — 30 seconds between submissions
    const now = Date.now()
    if (now - lastSubmitRef.current < 30000) {
      setError('Please wait a moment before submitting again.')
      return
    }

    // Sanitize all inputs
    const name  = sanitizeField(form.name, 100)
    const email = sanitizeField(form.email, 150)
    const locations = sanitizeField(form.locations, 20)

    if (!name || !email) {
      setError('Please fill in your name and email.')
      return
    }
    if (!isValidEmail(email)) {
      setError('Please enter a valid email address.')
      return
    }

    // Prevent duplicate signups from the same device
    const emailKey = email.toLowerCase().trim()
    try {
      const prev = JSON.parse(localStorage.getItem('sc_founding_emails') || '[]')
      if (prev.includes(emailKey)) {
        setError('This email has already been submitted. Check your inbox or email us directly.')
        return
      }
    } catch {}

    setError('')
    setSubmitting(true)
    lastSubmitRef.current = now
    try {
      const res = await fetch('https://formspree.io/f/mwvzeojn', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ name, email, locations: locations || 'Not specified', _gotcha: '' }),
      })
      if (!res.ok) throw new Error('Submit failed')

      // Remember this email to prevent duplicates
      try {
        const prev = JSON.parse(localStorage.getItem('sc_founding_emails') || '[]')
        prev.push(emailKey)
        localStorage.setItem('sc_founding_emails', JSON.stringify(prev))
      } catch {}
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
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-12">
          <div className="text-xs text-orange-600 uppercase tracking-widest font-semibold mb-4">Founding Shop Program</div>
          <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4" style={{ letterSpacing: '-0.02em' }}>
            A guided 14-day pilot before you commit.
          </h2>
          <p className="text-slate-500 leading-relaxed max-w-lg mx-auto">
            Prove that ShopCommand fits your workflow — repair orders, technician time, parts handoff, and invoice readiness — against your real day-to-day before choosing a paid plan.
          </p>
        </div>

        <p className="text-center text-slate-500 text-sm mb-10">
          <Link to="/founding-program" className="text-orange-600 hover:text-orange-700 underline underline-offset-4 decoration-orange-300 transition-colors">
            See full program details →
          </Link>
        </p>

        <div>
          {/* Walkthrough alternative */}
          <p className="text-center text-slate-400 text-base mb-8">
            Want to see it first?{' '}
            <a href={CALENDLY_URL} target="_blank" rel="noopener noreferrer" className="text-orange-600 hover:text-orange-700 underline underline-offset-4 decoration-orange-300 transition-colors">
              Book a free 15-min walkthrough →
            </a>
          </p>

          {/* Spot counter */}
          <div className="mb-8 max-w-2xl mx-auto">
            <div className="flex justify-between text-xs mb-2">
              <span className="text-slate-400">{CLAIMED_SPOTS === 0 ? 'Be the first to reserve a spot' : `${CLAIMED_SPOTS} of ${TOTAL_SPOTS} spots claimed`}</span>
              <span className="text-orange-600 font-semibold">{remaining} of {TOTAL_SPOTS} left</span>
            </div>
            <div className="h-2 rounded-full bg-slate-200 overflow-hidden" role="progressbar" aria-valuenow={CLAIMED_SPOTS} aria-valuemin={0} aria-valuemax={TOTAL_SPOTS} aria-label={`${CLAIMED_SPOTS} of ${TOTAL_SPOTS} founding spots claimed`}>
              <div
                className="h-full rounded-full bg-orange-500 motion-safe:transition-all duration-700"
                style={{ width: `${Math.max(pct, CLAIMED_SPOTS === 0 ? 0 : 4)}%` }}
              />
            </div>
          </div>

          {/* Form / success */}
          <div className="rounded-2xl border border-orange-200 bg-white p-7 shadow-sm max-w-2xl mx-auto">
            {submitted ? (
              <div className="text-center py-6">
                <div className="w-14 h-14 rounded-full bg-orange-100 border border-orange-200 flex items-center justify-center mx-auto mb-5">
                  <Check size={24} className="text-orange-600" strokeWidth={2} />
                </div>
                <h3 className="text-lg font-semibold text-slate-900 mb-2">
                  You're in the program.
                </h3>
                <p className="text-slate-500 text-sm leading-relaxed max-w-xs mx-auto">
                  We'll reach out to {form.email} within 24 hours to schedule your setup call.
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Honeypot — hidden from humans, bots fill it */}
                <input
                  type="text"
                  name="website"
                  value={honeypot}
                  onChange={e => setHoneypot(e.target.value)}
                  tabIndex={-1}
                  autoComplete="off"
                  style={{ position: 'absolute', left: '-9999px', opacity: 0, height: 0, width: 0 }}
                  aria-hidden="true"
                />
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="founding-name" className="block text-xs text-slate-500 font-medium mb-1.5 uppercase tracking-wider">Your name</label>
                    <input
                      id="founding-name"
                      type="text"
                      placeholder="Marcus Webb"
                      autoComplete="name"
                      value={form.name}
                      onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                      className="w-full h-11 px-4 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-sm placeholder-slate-400 focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 transition-colors"
                    />
                  </div>
                  <div>
                    <label htmlFor="founding-email" className="block text-xs text-slate-500 font-medium mb-1.5 uppercase tracking-wider">Email</label>
                    <input
                      id="founding-email"
                      type="email"
                      placeholder="marcus@northhoustonauto.com"
                      autoComplete="email"
                      value={form.email}
                      onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                      className="w-full h-11 px-4 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-sm placeholder-slate-400 focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 transition-colors"
                    />
                  </div>
                </div>
                <div>
                  <label htmlFor="founding-locations" className="block text-xs text-slate-500 font-medium mb-1.5 uppercase tracking-wider">How many locations? <span className="text-slate-400 normal-case tracking-normal">(optional)</span></label>
                  <select
                    id="founding-locations"
                    value={form.locations}
                    onChange={e => setForm(f => ({ ...f, locations: e.target.value }))}
                    className="w-full h-11 px-4 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-sm focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 transition-colors appearance-none"
                  >
                    <option value="">Select...</option>
                    <option value="1">1 location</option>
                    <option value="2-3">2-3 locations</option>
                    <option value="4-10">4-10 locations</option>
                    <option value="10+">10+ locations</option>
                  </select>
                </div>
                {error && <p className="text-red-600 text-xs" role="alert">{error}</p>}
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full h-12 rounded-xl text-sm font-semibold bg-orange-500 hover:bg-orange-600 disabled:opacity-60 disabled:cursor-not-allowed text-white transition-colors shadow-sm">
                  {submitting ? 'Reserving your spot…' : 'Apply for the Founding Program →'}
                </button>
                <p className="text-center text-slate-400 text-xs">No credit card. No commitment. We'll schedule your setup call within 24 hours.</p>
              </form>
            )}
          </div>
        </div>
      </div>
    </section>
  )
}

// ─── ROI Calculator ──────────────────────────────────────────────────────────
function ROICalculator() {
  const [locations, setLocations] = useState(2)
  const [managerCalls, setManagerCalls] = useState(4)

  // Each call averages ~8 min. Valued at $50/hr for owner time.
  const minutesSavedPerDay = managerCalls * locations * 8
  const hoursSavedPerMonth = Math.round((minutesSavedPerDay * 22) / 60)
  const timeSavingsPerMonth = Math.round(hoursSavedPerMonth * 50)
  const shopCommandCost = (locations <= 2 ? 100 : 125) * locations

  return (
    <section className="border-t border-slate-200 py-24 px-6">
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-12">
          <div className="text-xs text-slate-400 uppercase tracking-widest font-medium mb-4">See your numbers</div>
          <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4" style={{ letterSpacing: '-0.02em' }}>
            What's this actually worth to you?
          </h2>
          <p className="text-slate-500 text-base max-w-xl mx-auto leading-relaxed">
            Plug in your numbers. No email required, no sales pitch. Just math.
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 md:p-10">
          <div className="space-y-8">
            {/* Locations */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <label htmlFor="roi-locations" className="text-slate-700 text-sm font-medium">How many locations do you run?</label>
                <span className="text-orange-600 text-sm font-semibold tabular-nums w-8 text-right" aria-hidden="true">{locations}</span>
              </div>
              <input
                id="roi-locations"
                type="range" min={1} max={10} step={1} value={locations}
                aria-valuenow={locations}
                onChange={e => setLocations(+e.target.value)}
                className="w-full h-1.5 bg-slate-200 rounded-full appearance-none cursor-pointer accent-orange-500"
              />
              <div className="flex justify-between text-xs text-slate-500 mt-1.5" aria-hidden="true">
                <span>1</span><span>10</span>
              </div>
            </div>

            {/* Manager calls */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <label htmlFor="roi-calls" className="text-slate-700 text-sm font-medium">Check-in calls per location, per day?</label>
                <span className="text-orange-600 text-sm font-semibold tabular-nums w-8 text-right" aria-hidden="true">{managerCalls}</span>
              </div>
              <input
                id="roi-calls"
                type="range" min={0} max={10} step={1} value={managerCalls}
                aria-valuenow={managerCalls}
                onChange={e => setManagerCalls(+e.target.value)}
                className="w-full h-1.5 bg-slate-200 rounded-full appearance-none cursor-pointer accent-orange-500"
              />
              <div className="flex justify-between text-xs text-slate-500 mt-1.5" aria-hidden="true">
                <span>0</span><span>10</span>
              </div>
            </div>

          </div>

          {/* Results */}
          <div className="mt-10 pt-8 border-t border-slate-100">
            <div className="grid sm:grid-cols-2 gap-6">
              <div className="text-center">
                <div className="text-3xl font-bold text-slate-900 tabular-nums">{hoursSavedPerMonth}<span className="text-lg text-slate-400 font-medium ml-1">hrs</span></div>
                <div className="text-slate-500 text-xs mt-1">Owner time saved per month</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-orange-600 tabular-nums">${timeSavingsPerMonth.toLocaleString()}</div>
                <div className="text-slate-500 text-xs mt-1">Value of your time back</div>
              </div>
            </div>
            {timeSavingsPerMonth > 0 && (
              <div className="mt-8 pt-6 border-t border-slate-100 text-center">
                <div className="text-slate-400 text-xs uppercase tracking-widest font-medium mb-2">That's</div>
                <div className="text-4xl md:text-5xl font-bold text-orange-600 tabular-nums">${(timeSavingsPerMonth * 12).toLocaleString()}</div>
                <div className="text-slate-500 text-sm mt-1">in owner time per year</div>
                <p className="text-slate-400 text-xs mt-4">
                  Based on {minutesSavedPerDay} fewer minutes on the phone per day. ShopCommand costs ${shopCommandCost}/mo for {locations} location{locations > 1 ? 's' : ''}.
                </p>
              </div>
            )}
          </div>
        </div>

        <div className="text-center mt-8">
          <a href="#founding" className="inline-flex px-7 py-3.5 rounded-xl text-sm font-semibold bg-orange-500 hover:bg-orange-600 text-white transition-colors shadow-sm">
            Apply for the Founding Program →
          </a>
        </div>
      </div>
    </section>
  )
}

// ─── Component ────────────────────────────────────────────────────────────────
const LANDING_TITLE = 'ShopCommand — Auto Shop Management Software'
const LANDING_DESC = 'Auto repair shop management software. Track repair orders, technician efficiency, and revenue across every location in real time. Apply for the Founding Shop Program: 14-day guided pilot, then $100/mo locked forever.'
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
    <div className="min-h-screen bg-[#FAFAF8] text-slate-900 overflow-x-hidden">

      {/* Skip navigation */}
      <a href="#main-content" className="skip-link">Skip to main content</a>

      {/* Nav */}
      <nav aria-label="Main navigation" className="flex items-center justify-between px-6 md:px-12 h-16 border-b border-slate-200/80 sticky top-0 z-50 backdrop-blur-md bg-[#FAFAF8]/90">
        <Link to="/" aria-label="ShopCommand home" className="flex items-center gap-2.5 hover:opacity-80 transition-opacity flex-shrink-0">
          <HexMark size={28} />
          <span className="text-base font-semibold tracking-tight">
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
          <Link to="/resources" className="px-3 py-1.5 text-sm text-slate-500 hover:text-slate-900 transition-colors rounded-lg hover:bg-slate-100">
            Resources
          </Link>
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
          <Link to="/demo" className="hidden sm:inline-flex px-4 py-1.5 text-sm font-medium text-slate-500 hover:text-slate-900 transition-colors">
            Try the demo
          </Link>
          <Link to="/sign-in" className="hidden sm:inline-flex px-4 py-1.5 text-sm font-medium text-slate-500 hover:text-slate-900 transition-colors">
            Sign in
          </Link>
          <a href="#founding" className="hidden sm:inline-flex px-4 py-1.5 rounded-lg text-sm font-semibold bg-orange-500 hover:bg-orange-600 text-white transition-colors whitespace-nowrap">
            Join the Founding Program
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

      {/* Mobile menu overlay */}
      {mobileMenuOpen && (
        <div className="md:hidden fixed inset-0 top-16 z-40 bg-black/40" onClick={() => setMobileMenuOpen(false)} aria-hidden="true" />
      )}

      {/* Mobile menu panel */}
      <nav
        aria-label="Mobile navigation"
        className="md:hidden fixed inset-x-0 top-16 z-50 bg-white border-b border-slate-200 shadow-xl shadow-slate-900/[0.08]"
        style={{
          transition: 'opacity 200ms ease-out, transform 200ms ease-out',
          opacity: mobileMenuOpen ? 1 : 0,
          transform: mobileMenuOpen ? 'translateY(0)' : 'translateY(-8px)',
          pointerEvents: mobileMenuOpen ? 'auto' : 'none',
        }}
      >
        <div className="px-5 py-4 space-y-1 max-h-[calc(100dvh-4rem)] overflow-y-auto">
          {[
            { href: '#how-it-works', label: 'How it works' },
            { href: '#pricing', label: 'Pricing' },
          ].map(({ href, label }) => (
            <a
              key={href}
              href={href}
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center h-12 px-3 text-sm font-medium text-slate-700 active:text-orange-600 active:bg-orange-50 rounded-xl transition-colors"
            >
              {label}
            </a>
          ))}
          <Link
            to="/resources"
            onClick={() => setMobileMenuOpen(false)}
            className="flex items-center h-12 px-3 text-sm font-medium text-slate-700 active:text-orange-600 active:bg-orange-50 rounded-xl transition-colors"
          >
            Resources
          </Link>
          <Link
            to="/demo"
            onClick={() => setMobileMenuOpen(false)}
            className="flex items-center h-12 px-3 text-sm font-medium text-slate-700 active:text-orange-600 active:bg-orange-50 rounded-xl transition-colors"
          >
            Try the demo
          </Link>
          <Link
            to="/sign-in"
            onClick={() => setMobileMenuOpen(false)}
            className="flex items-center h-12 px-3 text-sm font-medium text-slate-700 active:text-orange-600 active:bg-orange-50 rounded-xl transition-colors"
          >
            Sign in
          </Link>

          {/* Compare section */}
          <div className="pt-2 border-t border-slate-100">
            <div className="px-3 pt-2 pb-1 text-xs font-medium text-slate-400 uppercase tracking-wider">Compare</div>
            {[
              { to: '/compare/tekmetric',  label: 'vs. Tekmetric' },
              { to: '/compare/shopmonkey', label: 'vs. Shopmonkey' },
              { to: '/compare/mitchell1',  label: 'vs. Mitchell1' },
              { to: '/compare/shop-ware',  label: 'vs. Shop-Ware' },
              { to: '/compare/ro-writer',  label: 'vs. R.O. Writer' },
            ].map(({ to, label }) => (
              <Link
                key={to}
                to={to}
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center h-11 px-3 text-sm text-slate-500 active:text-orange-600 active:bg-orange-50 rounded-xl transition-colors"
              >
                {label}
              </Link>
            ))}
          </div>

          {/* Mobile CTA */}
          <div className="pt-3 pb-1 border-t border-slate-100 space-y-2">
            <a
              href="#founding"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center justify-center h-12 rounded-xl text-sm font-semibold bg-orange-500 active:bg-orange-600 text-white transition-colors"
            >
              Join the Founding Program →
            </a>
          </div>
        </div>
      </nav>

      {/* Hero — split layout */}
      <main id="main-content">
      <section className="relative px-6 pt-16 md:pt-20 pb-16 overflow-hidden">
        <div className="max-w-6xl mx-auto grid md:grid-cols-2 gap-10 md:gap-14 items-center">
          {/* Left: copy */}
          <div className="animate-fade-up">
            <a href="#founding" className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-orange-300 bg-orange-50 text-orange-700 text-xs font-medium mb-6 hover:border-orange-400 transition-colors">
              <Car size={12} className="text-orange-500" />
              Early access: auto repair shop management software
            </a>

            <h1
              className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-slate-900 mb-5 leading-[1.1]"
              style={{ letterSpacing: '-0.03em' }}
            >
              Your shops are running right now.
              <br />
              <span className="text-orange-500">Do you know how they're doing?</span>
            </h1>

            <p className="text-slate-500 text-base md:text-lg max-w-lg mb-6 leading-relaxed">
              Know exactly where every shop stands before your first call of the day. Repair orders, tech efficiency, and revenue across every bay and every location. Loads in seconds.
            </p>

            <div className="flex flex-wrap gap-2 mb-7">
              {[
                'Track every RO from estimate to paid',
                'See every tech\'s efficiency across every bay',
                'Replace whiteboards and manager calls',
              ].map(item => (
                <span key={item} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-100 border border-slate-200 text-slate-600 text-xs">
                  <Check size={10} className="text-orange-500 flex-shrink-0" strokeWidth={2.5} />
                  {item}
                </span>
              ))}
            </div>

            <div className="flex flex-col sm:flex-row items-start gap-3">
              <a href="#founding" className="px-6 py-3 rounded-xl text-base font-semibold bg-orange-500 hover:bg-orange-600 text-white transition-colors shadow-sm">
                Apply for the Founding Program →
              </a>
              <a href="#how-it-works" className="px-6 py-3 rounded-xl text-base font-medium text-slate-600 hover:text-slate-900 border border-slate-200 hover:border-slate-300 transition-colors">
                How it works
              </a>
            </div>
            <p className="text-slate-400 text-sm mt-3">
              <Link to="/demo" className="text-orange-600 hover:text-orange-700 underline underline-offset-4 decoration-orange-300 transition-colors">
                Try the live demo →
              </Link>
              <span className="mx-2 text-slate-300">|</span>
              <a href={CALENDLY_URL} target="_blank" rel="noopener noreferrer" className="text-orange-600 hover:text-orange-700 underline underline-offset-4 decoration-orange-300 transition-colors">
                Book a free 15-min walkthrough →
              </a>
            </p>
          </div>

          {/* Right: dashboard preview */}
          <div className="animate-fade-up" style={{ animationDelay: '200ms' }}>
            <DashboardPreview />
          </div>
        </div>
      </section>

      {/* Integration logos */}
      <section className="border-t border-slate-200/60 py-10 px-6">
        <div className="max-w-4xl mx-auto">
          <p className="text-center text-slate-400 text-xs uppercase tracking-widest font-medium mb-6">Planned integrations</p>
          <div className="flex flex-wrap items-center justify-center gap-x-10 gap-y-4">
            {integrations.map(name => (
              <span key={name} className="text-slate-400 text-sm font-semibold tracking-wide select-none" style={{ letterSpacing: '0.05em' }}>{name}</span>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section
        id="how-it-works"
        className="px-6 pt-24 pb-20 relative"
        style={{ backgroundColor: '#F0EDEA' }}
      >
        <div className="max-w-5xl mx-auto grid md:grid-cols-[1fr_1.6fr] gap-12 md:gap-16 items-start">
          <div>
            <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4" style={{ letterSpacing: '-0.02em' }}>
              Up and running in a day
            </h2>
            <p className="text-slate-500 leading-relaxed">No long onboarding calls. No implementation fees. Just connect and go.</p>
          </div>
          <div className="space-y-8">
            {steps.map(({ title, desc }) => (
              <div key={title}>
                <h3 className="text-base font-semibold text-slate-900 mb-1.5">{title}</h3>
                <p className="text-slate-500 text-sm leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features — alternating split layouts */}
      <section className="max-w-6xl mx-auto px-6 py-24">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4" style={{ letterSpacing: '-0.02em' }}>
            One dashboard. Every location. Every tech. Every RO.
          </h2>
          <p className="text-slate-500 max-w-md mx-auto leading-relaxed">Built specifically for auto repair shops. Fast enough that you never wait on a loading screen.</p>
        </div>

        {/* Feature 1: RO tracking — text left, preview right */}
        <div className="grid md:grid-cols-2 gap-10 md:gap-14 items-center mb-20">
          <div>
            <div className="w-10 h-10 rounded-xl bg-orange-50 border border-orange-200 flex items-center justify-center mb-4">
              <ClipboardList size={18} className="text-orange-500" strokeWidth={1.8} />
            </div>
            <h3 className="text-xl font-bold text-slate-900 mb-2" style={{ letterSpacing: '-0.01em' }}>Stop asking "where's that RO?"</h3>
            <p className="text-slate-500 text-sm leading-relaxed mb-4">
              You know the call. It's 2pm, a customer wants a status update, and nobody can find the ticket. Every RO lives here, from the moment it's written to the moment it's paid. Search any customer, any vehicle, any ticket in seconds.
            </p>
          </div>
          <ROPreview />
        </div>

      </section>

      {/* Who it's built for */}
      <section
        className="border-t border-slate-200 py-20 px-6"
        style={{ backgroundColor: '#F0EDEA' }}
      >
        <div className="max-w-3xl mx-auto text-center">
          <div className="text-xs text-slate-400 uppercase tracking-widest font-medium mb-4">Built for every role</div>
          <h2 className="text-2xl md:text-3xl font-bold text-slate-900 mb-10" style={{ letterSpacing: '-0.02em' }}>
            One platform, three views
          </h2>
          <div className="grid sm:grid-cols-3 gap-6 text-left">
            <div className="rounded-2xl border border-slate-200 bg-white p-5">
              <div className="text-orange-600 text-xs uppercase tracking-widest font-semibold mb-2">Owner</div>
              <p className="text-slate-600 text-sm leading-relaxed">Revenue, open ROs, and who's on the clock — all locations, one tab.</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-5">
              <div className="text-slate-400 text-xs uppercase tracking-widest font-semibold mb-2">Service Advisor</div>
              <p className="text-slate-600 text-sm leading-relaxed">Write and track ROs from estimate to payment with instant vehicle history.</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-5">
              <div className="text-slate-400 text-xs uppercase tracking-widest font-semibold mb-2">Technician</div>
              <p className="text-slate-600 text-sm leading-relaxed">Clock in, see assigned jobs, update status — all from your phone.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Comparison */}
      <section className="border-t border-slate-200 py-24 px-6 bg-slate-50/60">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <div className="text-xs text-slate-400 uppercase tracking-widest font-medium mb-4">A different kind of tool</div>
            <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4" style={{ letterSpacing: '-0.02em' }}>
              Most shop software is complex and overpriced.
              <br className="hidden md:block" />
              <span className="text-orange-500"> Ours is built to be neither.</span>
            </h2>
            <p className="text-slate-500 max-w-lg mx-auto leading-relaxed text-sm md:text-base">
              The big platforms hide pricing, charge per seat, and lock basics behind upgrade tiers. ShopCommand is one simple rate for your first shop, a discounted rate for each additional shop, everything included, day one.
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 overflow-hidden bg-white">
            {/* Header row — desktop */}
            <div className="hidden sm:grid grid-cols-3 bg-slate-50 border-b border-slate-200 px-5 md:px-8 py-4">
              <div />
              <div className="text-slate-400 text-xs text-center uppercase tracking-widest font-medium">Typical shop software</div>
              <div className="text-orange-600 text-xs text-center uppercase tracking-widest font-semibold">ShopCommand</div>
            </div>
            {/* Mobile stacked / desktop 3-col */}
            {[
              { label: 'Default view',     them: 'One location at a time',      us: 'All shops, one screen' },
              { label: 'Pricing',          them: 'Per-seat + paid add-ons',     us: 'Per location. Unlimited users.' },
              { label: 'Getting started',  them: 'Days of onboarding calls',    us: 'Up and running same day' },
              { label: 'Built for',        them: 'Advisors and technicians',    us: 'The owner, first' },
              { label: 'Feature access',   them: 'Upgrade tiers to unlock basics', us: 'One plan. Everything in.' },
            ].map(({ label, them, us }, i, arr) => (
              <div key={label}>
                {/* Desktop row */}
                <div className={`hidden sm:grid grid-cols-3 px-5 md:px-8 py-4 items-center ${i < arr.length - 1 ? 'border-b border-slate-100' : ''}`}>
                  <div className="text-slate-700 text-sm font-medium pr-4">{label}</div>
                  <div className="text-slate-400 text-sm text-center px-2 leading-snug">{them}</div>
                  <div className="text-orange-600 text-sm text-center font-semibold px-2 leading-snug">{us}</div>
                </div>
                {/* Mobile stacked card */}
                <div className={`sm:hidden px-5 py-4 ${i < arr.length - 1 ? 'border-b border-slate-100' : ''}`}>
                  <div className="text-slate-700 text-sm font-medium mb-2">{label}</div>
                  <div className="flex items-start gap-2 text-xs text-slate-400 mb-1">
                    <span className="text-slate-300 flex-shrink-0">✕</span> {them}
                  </div>
                  <div className="flex items-start gap-2 text-xs text-orange-600 font-semibold">
                    <Check size={12} className="text-orange-500 flex-shrink-0 mt-0.5" strokeWidth={2.5} /> {us}
                  </div>
                </div>
              </div>
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

      {/* What we hear from shop owners */}
      <section className="border-t border-slate-200 py-24 px-6">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <div className="text-xs text-slate-400 uppercase tracking-widest font-medium mb-4">From our conversations</div>
            <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4" style={{ letterSpacing: '-0.02em' }}>
              What we hear from shop owners
            </h2>
            <p className="text-slate-500 max-w-md mx-auto leading-relaxed text-sm md:text-base">
              We talk to independent shop owners about what frustrates them. These problems keep coming up.
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-5">
            {[
              {
                quote: "I run three locations and I still can't see all of them on one screen. I'm logging in and out of the same software three times a day.",
                attr: 'Multi-location owner, 3 shops',
              },
              {
                quote: "We were paying almost $800 a month and half the features were locked behind an upgrade tier. I didn't even know what we were paying for anymore.",
                attr: 'Independent shop owner',
              },
              {
                quote: "I just want to know if we had a good day without calling my service advisor. That shouldn't require a $300/month add-on.",
                attr: 'Owner-operator, single location',
              },
            ].map(({ quote, attr }, i) => (
              <div key={i} className="rounded-xl border border-slate-200 bg-white p-6 flex flex-col justify-between">
                <p className="text-slate-600 text-sm leading-relaxed mb-5">"{quote}"</p>
                <p className="text-slate-400 text-xs font-medium">{attr}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="border-t border-slate-200 py-24 px-6">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4" style={{ letterSpacing: '-0.02em' }}>
              Per location. No per-seat fees.
            </h2>
            <p className="text-slate-500 leading-relaxed max-w-md mx-auto">
              Pay for the shops you run, not the people who help you run them.
            </p>
          </div>
          <div className="grid md:grid-cols-2 gap-5">
            {/* Founding Member */}
            <div className="relative rounded-2xl border-2 border-orange-400 bg-white p-7 flex flex-col h-full shadow-sm">
                <div className="absolute -top-3 left-6">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-orange-500 text-white text-xs font-semibold">
                    {TOTAL_SPOTS - CLAIMED_SPOTS} spots left
                  </span>
                </div>
                <div className="mb-5 pt-2">
                  <div className="text-orange-600 text-xs uppercase tracking-widest mb-3 font-medium">Founding Shop Program</div>
                  <div className="flex items-end gap-2 mb-1">
                    <span className="text-5xl font-bold text-slate-900" style={{ letterSpacing: '-0.03em' }}>$100</span>
                    <span className="text-slate-500 text-sm mb-2">/mo</span>
                  </div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-lg text-slate-400 line-through font-semibold">$175/mo</span>
                    <span className="text-xs font-semibold text-orange-600 bg-orange-50 border border-orange-200 px-2 py-0.5 rounded-full">Save 43% forever</span>
                  </div>
                  <p className="text-slate-500 text-xs leading-relaxed">First shop. +$50/mo each additional shop. Locked in for life: price never goes up as long as you stay subscribed.</p>
                </div>
                <div className="space-y-2.5 mb-7">
                  {[
                    'No per-seat fees — unlimited users',
                    'Everything in the standard plan',
                    'Founding rate locked forever',
                    'Direct access to the founding team',
                    'Shape the product roadmap',
                  ].map(item => (
                    <div key={item} className="flex items-center gap-2.5">
                      <Check size={14} className="text-orange-500 flex-shrink-0" strokeWidth={2} />
                      <span className="text-slate-600 text-sm">{item}</span>
                    </div>
                  ))}
                </div>
                <a href="#founding"
                  className="mt-auto w-full py-3 rounded-xl text-sm font-semibold bg-orange-500 hover:bg-orange-600 text-white transition-colors text-center shadow-sm">
                  Apply for the Founding Program →
                </a>
              </div>

            {/* Standard */}
            <div className="rounded-2xl border border-slate-200 bg-white p-7 flex flex-col h-full">
                <div className="mb-5">
                  <div className="text-slate-400 text-xs uppercase tracking-widest mb-3 font-medium">Standard: After launch</div>
                  <div className="flex items-end gap-1.5 mb-1">
                    <span className="text-5xl font-bold text-slate-400" style={{ letterSpacing: '-0.03em' }}>$175</span>
                    <span className="text-slate-400 text-sm mb-2">/mo</span>
                  </div>
                  <p className="text-slate-400 text-xs leading-relaxed">First shop. +$100/mo each additional shop. Cancel anytime.</p>
                </div>
                <div className="space-y-2.5 mb-7">
                  {[
                    'No per-seat fees — unlimited users',
                    'All locations in one dashboard',
                    'Repair order tracking',
                    'Real-time revenue and efficiency data',
                  ].map(item => (
                    <div key={item} className="flex items-center gap-2.5">
                      <Check size={14} className="text-slate-400 flex-shrink-0" strokeWidth={2} />
                      <span className="text-slate-400 text-sm">{item}</span>
                    </div>
                  ))}
                </div>
                <div className="mt-auto w-full py-3 rounded-xl text-sm font-medium border border-slate-200 text-slate-400 text-center cursor-default">
                  Available at launch
                </div>
              </div>
          </div>
        </div>
      </section>

      {/* ROI Calculator */}
      <ROICalculator />

      {/* Founder */}
      <section className="border-t border-slate-200 py-24 px-6 bg-slate-50/60">
        <div className="max-w-2xl mx-auto">
          <div className="text-xs text-slate-400 uppercase tracking-widest font-medium mb-10">Why I built this</div>
          <p className="text-slate-800 text-xl md:text-2xl leading-relaxed mb-6" style={{ letterSpacing: '-0.01em' }}>
            "I watched shop owners spend their Fridays driving location to location just to get a picture of how the week went. Calling managers, chasing spreadsheets, guessing at numbers that should have been obvious."
          </p>
          <p className="text-slate-500 text-base leading-relaxed mb-10">
            ShopCommand started as a tool to fix that one problem: give shop owners a real-time view of their business without leaving their desk. One location or ten, it grew from there.
          </p>
          <div className="flex items-center gap-4">
            <div className="w-11 h-11 rounded-full bg-orange-100 border border-orange-200 flex items-center justify-center flex-shrink-0">
              <span className="text-orange-600 text-xs font-bold tracking-wide">RO</span>
            </div>
            <div>
              <div className="text-slate-900 text-sm font-semibold">Rasheed Omar</div>
              <div className="text-slate-400 text-xs mt-0.5">Founder, ShopCommand, Houston TX</div>
            </div>
          </div>
        </div>
      </section>

      {/* Trust & Security */}
      <section className="border-t border-slate-200 py-20 px-6">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <div className="text-xs text-slate-400 uppercase tracking-widest font-medium mb-4">Built to last</div>
            <h2 className="text-2xl md:text-3xl font-bold text-slate-900 mb-4" style={{ letterSpacing: '-0.02em' }}>
              Your shop data is safe with us
            </h2>
            <p className="text-slate-500 text-sm max-w-xl mx-auto leading-relaxed">
              No VC investors. No 200-person sales team. No per-seat fees subsidizing enterprise features you will never use. Just a lean product that costs less because it should.
            </p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { icon: Shield, title: 'Encrypted everything', desc: 'Your data is encrypted in transit and at rest. We never sell or share your shop data with anyone.' },
              { icon: Zap, title: 'Fast by default', desc: 'No legacy desktop app, no server in your back office. Pages load in seconds on any connection.' },
              { icon: Smartphone, title: 'Same app everywhere', desc: 'Phone, tablet, desktop. Same layout, same features, same data. No stripped-down mobile version.' },
              { icon: Clock, title: '99.9% uptime', desc: 'Hosted on Vercel with automatic failover. Your dashboard is up when you need it, not down for maintenance.' },
            ].map(({ icon: Icon, title, desc }) => (
              <div key={title} className="text-center px-2">
                <div className="w-10 h-10 rounded-xl bg-orange-50 border border-orange-100 flex items-center justify-center mx-auto mb-3">
                  <Icon size={18} className="text-orange-500" strokeWidth={1.8} />
                </div>
                <div className="text-slate-900 text-sm font-semibold mb-1.5">{title}</div>
                <p className="text-slate-500 text-xs leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="border-t border-slate-200 py-20 px-6">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-2xl font-bold text-slate-900 mb-8" style={{ letterSpacing: '-0.02em' }}>
            Common questions
          </h2>
          <div className="space-y-0 divide-y divide-slate-200">
            {faqs.map(({ q, a }, i) => (
              <FAQItem key={i} q={q} a={a} delay={i * 50} id={i} />
            ))}
          </div>
        </div>
      </section>

      {/* Founding Shop Program */}
      <FoundingSection />

      {/* CTA */}
      <section className="relative py-28 px-6 text-center overflow-hidden border-t border-slate-200">
          <p className="relative text-orange-600 text-xs uppercase tracking-widest font-medium mb-4">Early access open now</p>
          <h2 className="relative text-4xl md:text-5xl font-bold text-slate-900 mb-5 max-w-xl mx-auto" style={{ letterSpacing: '-0.03em' }}>
            Stop driving to your shops to check on every bay.
          </h2>
          <p className="relative text-slate-500 mb-10 max-w-sm mx-auto leading-relaxed">
            Every repair order, every tech, every location. Right in front of you.
          </p>
          <div className="relative flex flex-col sm:flex-row items-center justify-center gap-3">
            <a
              href="#founding"
              className="px-8 py-3.5 rounded-xl text-base font-semibold bg-orange-500 hover:bg-orange-600 text-white transition-colors shadow-sm">
              Apply for the Founding Program: {TOTAL_SPOTS - CLAIMED_SPOTS} spots left →
            </a>
            <Link
              to="/demo"
              className="px-6 py-3.5 rounded-xl text-base font-medium text-slate-500 hover:text-slate-900 border border-slate-200 hover:border-slate-300 transition-colors">
              Try the demo
            </Link>
          </div>
      </section>

      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-slate-50/60">
        <div className="max-w-5xl mx-auto px-6 md:px-12 py-12">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-12">
            {/* Brand */}
            <div className="col-span-2 md:col-span-1">
              <Link to="/" className="inline-flex items-center gap-2 hover:opacity-70 transition-opacity mb-3">
                <HexMark size={22} />
                <span className="text-slate-900 text-sm font-semibold" style={{ letterSpacing: '-0.02em' }}>
                  Shop<span className="text-orange-500">Command</span>
                </span>
              </Link>
              <p className="text-slate-400 text-xs leading-relaxed mb-4">
                Auto repair shop management software for owners who want to know how every location is running — without the phone calls.
              </p>
              <a href={`mailto:${CONTACT_EMAIL}`} className="inline-flex items-center gap-1.5 text-slate-400 hover:text-slate-600 text-xs transition-colors">
                <Mail size={12} className="flex-shrink-0" />
                {CONTACT_EMAIL}
              </a>
            </div>

            {/* Product */}
            <div>
              <h4 className="text-xs font-semibold text-slate-900 uppercase tracking-wider mb-3">Product</h4>
              <ul className="space-y-2">
                <li><a href="#how-it-works" className="text-slate-400 hover:text-slate-600 text-sm transition-colors">How it works</a></li>
                <li><a href="#pricing" className="text-slate-400 hover:text-slate-600 text-sm transition-colors">Pricing</a></li>
                <li><Link to="/demo" className="text-slate-400 hover:text-slate-600 text-sm transition-colors">Live demo</Link></li>
                <li><Link to="/founding-program" className="text-slate-400 hover:text-slate-600 text-sm transition-colors">Founding Program</Link></li>
              </ul>
            </div>

            {/* Compare */}
            <div>
              <h4 className="text-xs font-semibold text-slate-900 uppercase tracking-wider mb-3">Compare</h4>
              <ul className="space-y-2">
                <li><Link to="/compare/tekmetric" className="text-slate-400 hover:text-slate-600 text-sm transition-colors">vs. Tekmetric</Link></li>
                <li><Link to="/compare/shopmonkey" className="text-slate-400 hover:text-slate-600 text-sm transition-colors">vs. Shopmonkey</Link></li>
                <li><Link to="/compare/mitchell1" className="text-slate-400 hover:text-slate-600 text-sm transition-colors">vs. Mitchell1</Link></li>
                <li><Link to="/compare/shop-ware" className="text-slate-400 hover:text-slate-600 text-sm transition-colors">vs. Shop-Ware</Link></li>
                <li><Link to="/compare/ro-writer" className="text-slate-400 hover:text-slate-600 text-sm transition-colors">vs. R.O. Writer</Link></li>
              </ul>
            </div>

            {/* Resources & Legal */}
            <div>
              <h4 className="text-xs font-semibold text-slate-900 uppercase tracking-wider mb-3">Resources</h4>
              <ul className="space-y-2">
                <li><Link to="/resources" className="text-slate-400 hover:text-slate-600 text-sm transition-colors">Blog</Link></li>
                <li><a href={CALENDLY_URL} target="_blank" rel="noopener noreferrer" className="text-slate-400 hover:text-slate-600 text-sm transition-colors">Book a walkthrough</a></li>
              </ul>
              <h4 className="text-xs font-semibold text-slate-900 uppercase tracking-wider mb-3 mt-6">Legal</h4>
              <ul className="space-y-2">
                <li><Link to="/terms" className="text-slate-400 hover:text-slate-600 text-sm transition-colors">Terms</Link></li>
                <li><Link to="/privacy" className="text-slate-400 hover:text-slate-600 text-sm transition-colors">Privacy</Link></li>
                <li><Link to="/dpa" className="text-slate-400 hover:text-slate-600 text-sm transition-colors">DPA</Link></li>
                <li><Link to="/cookies" className="text-slate-400 hover:text-slate-600 text-sm transition-colors">Cookies</Link></li>
                <li><Link to="/accessibility" className="text-slate-400 hover:text-slate-600 text-sm transition-colors">Accessibility</Link></li>
              </ul>
            </div>
          </div>

          {/* Bottom bar */}
          <div className="mt-10 pt-6 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3">
            <p className="text-slate-400 text-xs">© 2026 ShopCommand. All rights reserved.</p>
            <p className="text-slate-300 text-xs">Built in Tulsa, OK</p>
          </div>
        </div>
      </footer>
      <CookieBanner />
    </div>
  )
}
