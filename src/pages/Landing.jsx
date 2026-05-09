import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { Building2, Wrench, Users } from 'lucide-react'

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
    title: 'Connect your shops',
    desc: 'Add all your locations in minutes. No IT required, no hardware to install. Just log in and link up.',
  },
  {
    num: '02',
    title: 'Track everything live',
    desc: 'Revenue, open ROs, technician clock-ins, and parts inventory update in real time across every location.',
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
    title: 'Multi-Shop Command Center',
    desc: 'Manage all your locations from a single dashboard. Revenue, open ROs, and technician status — everything at a glance.',
    stat: '$375K',
    statLabel: 'Revenue MTD',
  },
  {
    icon: Wrench,
    title: 'Repair Order Tracking',
    desc: 'Create, assign, and track repair orders through every stage. No more clipboards or lost tickets.',
    stat: '73',
    statLabel: 'Open ROs',
  },
  {
    icon: Users,
    title: 'Team & Tech Management',
    desc: 'Clock-in status, efficiency scores, and customer histories — all the data your team needs to perform.',
    stat: '34',
    statLabel: 'Active Techs',
  },
]

const testimonials = [
  {
    quote: "I used to drive to each shop on Friday afternoons just to see how the week went. Haven't done that in three months.",
    name: 'Chris P.',
    title: 'Owner · Mesa Performance Group',
    shops: '2 locations',
    initials: 'CP',
  },
  {
    quote: "The technician efficiency scores alone paid for themselves in the first month. I had no idea two of my best guys were carrying the whole crew.",
    name: 'Denise R.',
    title: 'Owner · Gulf Coast Tire & Lube',
    shops: '4 locations',
    initials: 'DR',
  },
  {
    quote: "We were running everything through a group text and a shared spreadsheet. ShopCommand gave me actual visibility for the first time.",
    name: 'Marcus T.',
    title: 'Owner · Tulsa Auto Works',
    shops: '3 locations',
    initials: 'MT',
  },
]

const stats = [
  { value: '1,400+', label: 'Shops onboarded' },
  { value: '$340M', label: 'Revenue tracked' },
  { value: '2.4 hrs', label: 'Saved per tech per week' },
  { value: '99.9%', label: 'Uptime' },
]

const trustedBy = [
  'Desert Auto Collective', 'Precision Tire & Lube', 'Gulf Coast Motors',
  'Tulsa Auto Works', 'Mesa Performance Group', 'Bricktown Auto',
]

// ─── Component ────────────────────────────────────────────────────────────────
export default function Landing() {
  return (
    <div className="min-h-screen bg-[#0A0B12] text-white overflow-x-hidden" style={{ fontFamily: '"Inter", system-ui, sans-serif' }}>

      {/* Nav */}
      <nav className="flex items-center justify-between px-6 md:px-12 h-16 border-b border-white/[0.06] sticky top-0 z-50 backdrop-blur-md bg-[#0A0B12]/80">
        <Link to="/" className="flex items-center gap-2.5 hover:opacity-80 transition-opacity">
          <HexMark size={30} />
          <span style={{ fontFamily: '"Space Grotesk", system-ui, sans-serif', letterSpacing: '-0.02em' }} className="text-base font-semibold">
            <span className="text-white">Shop</span>
            <span className="text-orange-400">Command</span>
          </span>
        </Link>
        <div className="flex items-center gap-3">
          <Link to="/dashboard" className="px-4 py-1.5 text-sm font-medium text-white/60 hover:text-white transition-colors">
            Log in
          </Link>
          <Link to="/dashboard" className="px-4 py-1.5 rounded-lg text-sm font-semibold bg-orange-500 hover:bg-orange-400 text-white transition-colors">
            Get early access
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative flex flex-col items-center text-center px-6 pt-24 pb-20 overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[500px] rounded-full bg-orange-500/10 blur-[120px] pointer-events-none animate-glow-pulse" />

        <div className="animate-fade-up" style={{ animationDelay: '0ms' }}>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-orange-500/30 bg-orange-500/10 text-orange-400 text-xs font-medium mb-6">
            <span className="w-1.5 h-1.5 rounded-full bg-orange-400 animate-pulse" />
            Now in early access · 1,400+ shops onboarding
          </div>
        </div>

        <h1
          className="text-4xl md:text-6xl font-bold text-white mb-5 max-w-3xl leading-tight animate-fade-up"
          style={{ fontFamily: '"Space Grotesk", system-ui, sans-serif', letterSpacing: '-0.03em', animationDelay: '80ms' }}
        >
          Stop flying blind.
          <br />
          <span className="text-orange-400">Run your shops smarter.</span>
        </h1>

        <p className="text-white/65 text-lg max-w-xl mb-10 leading-relaxed animate-fade-up" style={{ animationDelay: '160ms' }}>
          ShopCommand gives multi-location auto repair owners a real-time view of every shop — revenue, repair orders, technicians, and parts — from one place.
        </p>

        <div className="flex flex-col sm:flex-row items-center gap-3 animate-fade-up" style={{ animationDelay: '240ms' }}>
          <Link to="/dashboard" className="px-6 py-3 rounded-xl text-base font-semibold bg-orange-500 hover:bg-orange-400 text-white transition-colors shadow-lg shadow-orange-500/20">
            See the dashboard →
          </Link>
          <a href="#how-it-works" className="px-6 py-3 rounded-xl text-base font-medium text-white/60 hover:text-white border border-white/10 hover:border-white/20 transition-colors">
            How it works
          </a>
        </div>

        {/* Multi-shop comparison table */}
        <div className="relative mt-16 w-full max-w-3xl mx-auto rounded-2xl overflow-hidden border border-white/10 shadow-2xl shadow-black/60 animate-fade-up" style={{ animationDelay: '360ms' }}>
          <div className="flex items-center justify-between px-5 py-3 bg-white/[0.04] border-b border-white/[0.06]">
            <span className="text-white/30 text-xs uppercase tracking-wider">All Locations — Today</span>
            <span className="text-orange-400 text-xs font-semibold">$25,870 total</span>
          </div>
          <div className="bg-[#0F1018]">
            <div className="grid grid-cols-4 gap-4 px-5 py-2.5 border-b border-white/[0.06]">
              {['Shop', 'Revenue', 'Open ROs', 'Techs'].map((h, i) => (
                <div key={h} className={`text-white/25 text-xs ${i > 0 ? 'text-right' : ''}`}>{h}</div>
              ))}
            </div>
            {[
              { name: 'Tulsa Main', sub: '8 techs clocked in', revenue: '$8,240', ros: 21, techs: '8 / 10', best: false },
              { name: 'Broken Arrow', sub: '6 techs clocked in', revenue: '$6,180', ros: 17, techs: '6 / 8', best: false },
              { name: 'Owasso', sub: '↑ Best day this month', revenue: '$11,450', ros: 35, techs: '10 / 10', best: true },
            ].map(({ name, sub, revenue, ros, techs, best }) => (
              <div key={name} className="grid grid-cols-4 gap-4 px-5 py-3.5 border-b border-white/[0.04] last:border-0 items-center">
                <div>
                  <div className="text-white text-sm font-medium">{name}</div>
                  <div className={`text-xs mt-0.5 ${best ? 'text-green-400/80' : 'text-white/35'}`}>{sub}</div>
                </div>
                <div className="text-orange-400 text-sm font-bold text-right">{revenue}</div>
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
      </section>

      {/* Trusted by */}
      <Reveal>
        <div className="border-y border-white/[0.06] py-6 overflow-hidden">
          <p className="text-center text-white/30 text-xs uppercase tracking-widest mb-5">Trusted by independent shops across the country</p>
          <div className="flex flex-wrap justify-center gap-x-10 gap-y-3 px-6">
            {trustedBy.map(name => (
              <span key={name} className="text-white/25 text-sm font-medium">{name}</span>
            ))}
          </div>
        </div>
      </Reveal>

      {/* Stats */}
      <Reveal>
        <section className="border-b border-white/[0.06] py-14">
          <div className="max-w-4xl mx-auto px-6 grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            {stats.map(({ value, label }, i) => (
              <Reveal key={label} delay={i * 80}>
                <div>
                  <div className="text-3xl font-bold text-white mb-1" style={{ fontFamily: '"Space Grotesk", system-ui', letterSpacing: '-0.02em' }}>{value}</div>
                  <div className="text-white/65 text-sm">{label}</div>
                </div>
              </Reveal>
            ))}
          </div>
        </section>
      </Reveal>

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
          <div className="hidden md:block absolute top-8 left-[calc(16.67%+1rem)] right-[calc(16.67%+1rem)] h-px bg-gradient-to-r from-transparent via-orange-500/30 to-transparent" />
          {steps.map(({ num, title, desc }, i) => (
            <Reveal key={num} delay={i * 100}>
              <div className="relative flex flex-col items-start md:items-center text-left md:text-center">
                <div className="w-14 h-14 rounded-2xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center mb-5 flex-shrink-0">
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
              Everything your shops need
            </h2>
            <p className="text-white/65 max-w-md mx-auto leading-relaxed">Built specifically for multi-location auto repair — not a generic tool bolted onto your workflow.</p>
          </div>
        </Reveal>
        <div className="divide-y divide-white/[0.06]">
          {features.map(({ icon: Icon, title, desc, stat, statLabel }, i) => (
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
                  <div className="text-orange-400 text-lg font-bold leading-none mb-1" style={{ fontFamily: '"Space Grotesk", system-ui' }}>{stat}</div>
                  <div className="text-white/40 text-xs">{statLabel}</div>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* Testimonials */}
      <section className="border-t border-white/[0.06] py-24 px-6">
        <div className="max-w-5xl mx-auto">
          <Reveal>
            <div className="text-center mb-14">
              <h2 className="text-3xl md:text-4xl font-bold text-white mb-4" style={{ fontFamily: '"Space Grotesk", system-ui', letterSpacing: '-0.02em' }}>
                Shop owners get it immediately
              </h2>
              <p className="text-white/65">Real feedback from multi-location owners in our early access program.</p>
            </div>
          </Reveal>
          <div className="grid md:grid-cols-3 gap-6">
            {testimonials.map(({ quote, name, title, shops, initials }, i) => (
              <Reveal key={name} delay={i * 100}>
                <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-6 flex flex-col h-full hover:border-white/[0.14] transition-all duration-300">
                  {/* Stars */}
                  <div className="flex gap-0.5 mb-4">
                    {[...Array(5)].map((_, j) => (
                      <svg key={j} width="14" height="14" viewBox="0 0 24 24" fill="#F97316"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" /></svg>
                    ))}
                  </div>
                  <p className="text-white/70 text-sm leading-relaxed flex-1 mb-6">"{quote}"</p>
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-orange-500/20 flex items-center justify-center flex-shrink-0">
                      <span className="text-orange-400 text-xs font-semibold">{initials}</span>
                    </div>
                    <div>
                      <div className="text-white text-sm font-medium">{name}</div>
                      <div className="text-white/30 text-xs">{title} · {shops}</div>
                    </div>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing teaser */}
      <section className="border-t border-white/[0.06] py-24 px-6">
        <div className="max-w-3xl mx-auto">
          <Reveal>
            <div className="text-center mb-10">
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
          <Reveal delay={80}>
            <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-8 flex flex-col md:flex-row items-center md:items-start gap-8">
              <div className="flex-1 text-center md:text-left">
                <div className="text-white/40 text-xs uppercase tracking-widest mb-2">Early access</div>
                <div className="flex items-end gap-1.5 justify-center md:justify-start mb-1">
                  <span className="text-5xl font-bold text-white" style={{ fontFamily: '"Space Grotesk", system-ui', letterSpacing: '-0.03em' }}>$149</span>
                  <span className="text-white/40 text-sm mb-2">/location/mo</span>
                </div>
                <p className="text-white/40 text-xs">Price locked in for your first year. Cancel anytime.</p>
              </div>
              <div className="w-px self-stretch bg-white/[0.06] hidden md:block" />
              <div className="flex-1 space-y-3">
                {[
                  'Unlimited technicians and users',
                  'All locations in one dashboard',
                  'Repair order tracking',
                  'Real-time revenue and efficiency data',
                ].map(item => (
                  <div key={item} className="flex items-center gap-2.5">
                    <div className="w-4 h-4 rounded-full bg-orange-500/15 flex items-center justify-center flex-shrink-0">
                      <svg width="8" height="8" viewBox="0 0 8 8" fill="none"><path d="M1.5 4L3.5 6L6.5 2" stroke="#F97316" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                    </div>
                    <span className="text-white/65 text-sm">{item}</span>
                  </div>
                ))}
              </div>
            </div>
          </Reveal>
        </div>
      </section>

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
            <Link
              to="/dashboard"
              className="px-8 py-3.5 rounded-xl text-base font-semibold bg-orange-500 hover:bg-orange-400 text-white transition-colors shadow-lg shadow-orange-500/25"
            >
              See the dashboard →
            </Link>
            <span className="text-white/25 text-sm">No credit card required</span>
          </div>
        </Reveal>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/[0.06] px-6 md:px-12 py-8 flex flex-col md:flex-row items-center justify-between gap-4">
        <Link to="/" className="flex items-center gap-2 hover:opacity-70 transition-opacity">
          <HexMark size={22} />
          <span className="text-white/40 text-sm" style={{ fontFamily: '"Space Grotesk", system-ui' }}>ShopCommand</span>
        </Link>
        <p className="text-white/20 text-xs">© 2026 ShopCommand. All rights reserved.</p>
      </footer>
    </div>
  )
}
