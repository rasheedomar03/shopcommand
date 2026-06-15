import { useState, useRef } from 'react'
import { Link } from 'react-router-dom'
import { Check, Mail, Clock, Wrench, BarChart3, Package, Users, ArrowRight } from 'lucide-react'

const TOTAL_SPOTS = 25
const CLAIMED_SPOTS = 1
const CALENDLY_URL = 'https://calendly.com/rasheed-omar/30min'
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

function sanitizeField(val) {
  return String(val).replace(/[<>"'&]/g, '').trim().slice(0, 200)
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

const pilotSteps = [
  { num: '1', title: 'Apply', desc: 'Tell us about your shop — size, locations, and the workflow problem you want to solve.' },
  { num: '2', title: 'Setup call', desc: 'We map your current workflow together and import (or seed) your customers, vehicles, techs, and open ROs.' },
  { num: '3', title: 'Run the pilot', desc: '14 days of real usage against your actual workflow. Weekly check-ins to make sure nothing is stuck.' },
  { num: '4', title: 'Decide', desc: 'If the fit is proven, you convert to the $100/mo founding rate — locked for life. If not, you walk away.' },
]

const included = [
  '14-day guided pilot mapped to your current service, parts, and invoice workflow.',
  'Setup call to import or seed your customers, vehicles, technicians, and open ROs.',
  'Weekly 20-minute check-in focused on invoice readiness, parts visibility, and labor capture.',
  'Direct access to Rasheed — real answers, no support portal, no ticket queue.',
  'Conversion to $100/mo founding rate (locked for life) when the workflow fit is proven.',
]

const qualifiers = [
  'Independent or multi-location auto repair, fleet, or parts-heavy operation.',
  'Enough service and parts volume to feel workflow friction today.',
  'Owner or service manager who can name the current handoff, billing, or visibility problem.',
  'Team can commit one manager plus one tech or parts user during the pilot.',
]

const whatYouGet = [
  { icon: Wrench, title: 'Full RO lifecycle', desc: 'Intake to invoice in one system. No re-typing, no lost tickets.' },
  { icon: Clock, title: 'Built-in time clock', desc: 'Techs clock in/out, job timers track billable hours, overtime alerts fire early.' },
  { icon: Package, title: 'Parts & inventory', desc: 'Auto-deduct on RO, QR labels, reorder alerts, usage history.' },
  { icon: BarChart3, title: 'Multi-location dashboard', desc: 'Revenue, open ROs, and tech status across every shop in one tab.' },
  { icon: Users, title: 'Unlimited users', desc: 'Every owner, advisor, and tech gets their own login. No per-seat fees.' },
]

export default function FoundingProgram() {
  const [form, setForm] = useState({ name: '', email: '', locations: '', pain: '' })
  const [submitted, setSubmitted] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [honeypot, setHoneypot] = useState('')
  const lastSubmitRef = useRef(0)

  const remaining = TOTAL_SPOTS - CLAIMED_SPOTS
  const pct = (CLAIMED_SPOTS / TOTAL_SPOTS) * 100

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    if (honeypot) return

    const now = Date.now()
    if (now - lastSubmitRef.current < 30000) {
      setError('Please wait before submitting again.')
      return
    }

    const name = sanitizeField(form.name)
    const email = sanitizeField(form.email)
    if (!name || !email) { setError('Name and email are required.'); return }
    if (!isValidEmail(email)) { setError('Please enter a valid email.'); return }

    setSubmitting(true)
    lastSubmitRef.current = now

    try {
      const res = await fetch('/api/health', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'founding-signup', name, email, locations: sanitizeField(form.locations), pain: sanitizeField(form.pain) }),
      })
      if (!res.ok) throw new Error('Network error')
      setSubmitted(true)
    } catch {
      setError('Something went wrong. Please email us directly.')
    } finally {
      setSubmitting(false)
    }
  }

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
            Resources
          </Link>
          <Link to="/demo" className="px-4 py-1.5 rounded-lg text-sm font-semibold text-slate-600 hover:text-slate-900 border border-slate-200 hover:border-slate-300 transition-colors">
            Try the demo
          </Link>
        </div>
      </nav>

      <main id="main-content">
        {/* Hero */}
        <section className="px-6 py-20 bg-orange-50/40 border-b border-slate-200">
          <div className="max-w-3xl mx-auto text-center">
            <div className="text-xs text-orange-600 uppercase tracking-widest font-semibold mb-4">Founding Shop Program</div>
            <h1 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4" style={{ letterSpacing: '-0.02em' }}>
              A guided 14-day pilot before you commit.
            </h1>
            <p className="text-slate-500 leading-relaxed max-w-lg mx-auto mb-8">
              Prove that ShopCommand fits your workflow — repair orders, technician time, parts handoff, and invoice readiness — against your real day-to-day before choosing a paid plan.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <a href="#apply" className="px-6 py-3 rounded-xl text-sm font-semibold bg-orange-500 hover:bg-orange-600 text-white transition-colors shadow-sm">
                Apply for the Founding Program →
              </a>
              <a href={CALENDLY_URL} target="_blank" rel="noopener noreferrer" className="px-6 py-3 rounded-xl text-sm font-semibold text-slate-600 hover:text-slate-900 border border-slate-200 hover:border-slate-300 transition-colors">
                Book a 15-min walkthrough
              </a>
            </div>
          </div>
        </section>

        {/* How it works */}
        <section className="px-6 py-20 border-b border-slate-100">
          <div className="max-w-3xl mx-auto">
            <h2 className="text-2xl font-bold text-slate-900 mb-10 text-center" style={{ letterSpacing: '-0.02em' }}>
              How the pilot works
            </h2>
            <div className="grid sm:grid-cols-2 gap-6">
              {pilotSteps.map(step => (
                <div key={step.num} className="flex gap-4 p-5 rounded-2xl border border-slate-200">
                  <div className="w-8 h-8 rounded-full bg-orange-500 text-white text-sm font-bold flex items-center justify-center shrink-0">
                    {step.num}
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-slate-900 mb-1">{step.title}</h3>
                    <p className="text-slate-500 text-sm leading-relaxed">{step.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* What's included + Who should apply */}
        <section className="px-6 py-20 border-b border-slate-100 bg-slate-50/40">
          <div className="max-w-3xl mx-auto">
            <div className="grid md:grid-cols-2 gap-8">
              <div className="rounded-2xl border border-slate-200 bg-white p-6">
                <h3 className="text-sm font-semibold text-slate-900 uppercase tracking-wider mb-4">What the pilot includes</h3>
                <ul className="space-y-3">
                  {included.map((item, i) => (
                    <li key={i} className="flex gap-3 text-sm text-slate-600 leading-relaxed">
                      <Check size={16} className="text-orange-500 mt-0.5 shrink-0" strokeWidth={2.5} />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white p-6">
                <h3 className="text-sm font-semibold text-slate-900 uppercase tracking-wider mb-4">Who should apply</h3>
                <ul className="space-y-3">
                  {qualifiers.map((item, i) => (
                    <li key={i} className="flex gap-3 text-sm text-slate-600 leading-relaxed">
                      <span className="w-4 h-4 rounded-full border-2 border-orange-300 mt-0.5 shrink-0" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* What you get */}
        <section className="px-6 py-20 border-b border-slate-100">
          <div className="max-w-3xl mx-auto">
            <h2 className="text-2xl font-bold text-slate-900 mb-3 text-center" style={{ letterSpacing: '-0.02em' }}>
              What's included at $100/mo
            </h2>
            <p className="text-slate-500 text-sm text-center mb-10 max-w-md mx-auto">
              Founding rate locks for life. After launch, pricing goes to $175/mo for your first shop and $100/mo per additional.
            </p>
            <div className="grid sm:grid-cols-2 gap-5">
              {whatYouGet.map(item => {
                const Icon = item.icon
                return (
                  <div key={item.title} className="flex gap-4 p-5 rounded-2xl border border-slate-200">
                    <div className="w-9 h-9 rounded-xl bg-orange-50 border border-orange-200 flex items-center justify-center shrink-0">
                      <Icon size={16} className="text-orange-500" strokeWidth={1.8} />
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-slate-900 mb-0.5">{item.title}</h3>
                      <p className="text-slate-500 text-xs leading-relaxed">{item.desc}</p>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </section>

        {/* Pricing comparison */}
        <section className="px-6 py-20 border-b border-slate-100 bg-slate-50/40">
          <div className="max-w-2xl mx-auto text-center">
            <h2 className="text-2xl font-bold text-slate-900 mb-8" style={{ letterSpacing: '-0.02em' }}>
              Simple, per-location pricing
            </h2>
            <div className="inline-flex flex-col sm:flex-row gap-6">
              <div className="rounded-2xl border-2 border-orange-300 bg-white p-6 text-left min-w-[220px]">
                <div className="text-xs text-orange-600 font-semibold uppercase tracking-wider mb-2">Founding Rate</div>
                <div className="text-3xl font-bold text-slate-900 mb-1">$100<span className="text-base font-normal text-slate-400">/mo</span></div>
                <p className="text-slate-500 text-xs mb-4">First shop, unlimited users</p>
                <ul className="space-y-2 text-sm text-slate-600">
                  <li className="flex gap-2"><Check size={14} className="text-orange-500 mt-0.5 shrink-0" /> Unlimited techs & advisors</li>
                  <li className="flex gap-2"><Check size={14} className="text-orange-500 mt-0.5 shrink-0" /> Unlimited repair orders</li>
                  <li className="flex gap-2"><Check size={14} className="text-orange-500 mt-0.5 shrink-0" /> Rate locked for life</li>
                </ul>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white p-6 text-left min-w-[220px]">
                <div className="text-xs text-slate-400 font-semibold uppercase tracking-wider mb-2">Each Additional Shop</div>
                <div className="text-3xl font-bold text-slate-900 mb-1">$50<span className="text-base font-normal text-slate-400">/mo</span></div>
                <p className="text-slate-500 text-xs mb-4">Per additional location</p>
                <ul className="space-y-2 text-sm text-slate-600">
                  <li className="flex gap-2"><Check size={14} className="text-orange-500 mt-0.5 shrink-0" /> Same full feature set</li>
                  <li className="flex gap-2"><Check size={14} className="text-orange-500 mt-0.5 shrink-0" /> Cross-location dashboard</li>
                  <li className="flex gap-2"><Check size={14} className="text-orange-500 mt-0.5 shrink-0" /> Same locked rate</li>
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* Application form */}
        <section id="apply" className="px-6 py-20">
          <div className="max-w-2xl mx-auto">
            <h2 className="text-2xl font-bold text-slate-900 mb-3 text-center" style={{ letterSpacing: '-0.02em' }}>
              Apply for the Founding Shop Program
            </h2>
            <p className="text-slate-500 text-sm text-center mb-8">
              No credit card. No commitment. We'll schedule your setup call within 24 hours.
            </p>

            {/* Spot counter */}
            <div className="mb-8">
              <div className="flex justify-between text-xs mb-2">
                <span className="text-slate-400">{CLAIMED_SPOTS === 0 ? 'Be the first to reserve a spot' : `${CLAIMED_SPOTS} of ${TOTAL_SPOTS} spots claimed`}</span>
                <span className="text-orange-600 font-semibold">{remaining} of {TOTAL_SPOTS} left</span>
              </div>
              <div className="h-2 rounded-full bg-slate-200 overflow-hidden" role="progressbar" aria-valuenow={CLAIMED_SPOTS} aria-valuemin={0} aria-valuemax={TOTAL_SPOTS}>
                <div
                  className="h-full rounded-full bg-orange-500 motion-safe:transition-all duration-700"
                  style={{ width: `${Math.max(pct, CLAIMED_SPOTS === 0 ? 0 : 4)}%` }}
                />
              </div>
            </div>

            <div className="rounded-2xl border border-orange-200 bg-white p-7 shadow-sm">
              {submitted ? (
                <div className="text-center py-6">
                  <div className="w-14 h-14 rounded-full bg-orange-100 border border-orange-200 flex items-center justify-center mx-auto mb-5">
                    <Check size={24} className="text-orange-600" strokeWidth={2} />
                  </div>
                  <h3 className="text-lg font-semibold text-slate-900 mb-2">You're in the program.</h3>
                  <p className="text-slate-500 text-sm leading-relaxed max-w-xs mx-auto">
                    We'll reach out to {form.email} within 24 hours to schedule your setup call.
                  </p>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
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
                      <label htmlFor="fp-name" className="block text-xs text-slate-500 font-medium mb-1.5 uppercase tracking-wider">Your name</label>
                      <input
                        id="fp-name"
                        type="text"
                        placeholder="Marcus Webb"
                        autoComplete="name"
                        value={form.name}
                        onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                        className="w-full h-11 px-4 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-sm placeholder-slate-400 focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 transition-colors"
                      />
                    </div>
                    <div>
                      <label htmlFor="fp-email" className="block text-xs text-slate-500 font-medium mb-1.5 uppercase tracking-wider">Email</label>
                      <input
                        id="fp-email"
                        type="email"
                        placeholder="marcus@northhoustonauto.com"
                        autoComplete="email"
                        value={form.email}
                        onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                        className="w-full h-11 px-4 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-sm placeholder-slate-400 focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 transition-colors"
                      />
                    </div>
                  </div>
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="fp-locations" className="block text-xs text-slate-500 font-medium mb-1.5 uppercase tracking-wider">How many locations? <span className="text-slate-400 normal-case tracking-normal">(optional)</span></label>
                      <select
                        id="fp-locations"
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
                    <div>
                      <label htmlFor="fp-pain" className="block text-xs text-slate-500 font-medium mb-1.5 uppercase tracking-wider">Biggest pain point <span className="text-slate-400 normal-case tracking-normal">(optional)</span></label>
                      <input
                        id="fp-pain"
                        type="text"
                        placeholder="e.g. Invoicing takes too long"
                        value={form.pain}
                        onChange={e => setForm(f => ({ ...f, pain: e.target.value }))}
                        className="w-full h-11 px-4 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-sm placeholder-slate-400 focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 transition-colors"
                      />
                    </div>
                  </div>
                  {error && <p className="text-red-600 text-xs" role="alert">{error}</p>}
                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full h-12 rounded-xl text-sm font-semibold bg-orange-500 hover:bg-orange-600 disabled:opacity-60 disabled:cursor-not-allowed text-white transition-colors shadow-sm"
                  >
                    {submitting ? 'Reserving your spot…' : 'Apply for the Founding Program →'}
                  </button>
                  <p className="text-center text-slate-400 text-xs">No credit card. No commitment. We'll schedule your setup call within 24 hours.</p>
                </form>
              )}
            </div>

            <p className="text-center text-slate-400 text-sm mt-6">
              Want to see it first?{' '}
              <a href={CALENDLY_URL} target="_blank" rel="noopener noreferrer" className="text-orange-600 hover:text-orange-700 underline underline-offset-4 decoration-orange-300 transition-colors">
                Book a free 15-min walkthrough →
              </a>
            </p>
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
