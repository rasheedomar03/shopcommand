import { useState, useRef, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { ChevronDown, Menu, X } from 'lucide-react'

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

const compareLinks = [
  { to: '/compare/tekmetric', label: 'ShopCommand vs. Tekmetric' },
  { to: '/compare/shopmonkey', label: 'ShopCommand vs. Shopmonkey' },
  { to: '/compare/mitchell1', label: 'ShopCommand vs. Mitchell1' },
  { to: '/compare/shop-ware', label: 'ShopCommand vs. Shop-Ware' },
  { to: '/compare/ro-writer', label: 'ShopCommand vs. R.O. Writer' },
]

export function PublicNav() {
  const [compareOpen, setCompareOpen] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
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

  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') setMobileOpen(false) }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [])

  return (
    <>
      <nav aria-label="Main navigation" className="flex items-center justify-between px-6 md:px-12 h-16 border-b border-slate-200/80 sticky top-0 z-50 backdrop-blur-md bg-[#FAFAF8]/90">
        <Link to="/" aria-label="ShopCommand home" className="flex items-center gap-2.5 hover:opacity-80 transition-opacity flex-shrink-0">
          <HexMark size={28} />
          <span className="text-base font-semibold tracking-tight">
            <span className="text-slate-900">Shop</span>
            <span className="text-orange-500">Command</span>
          </span>
        </Link>

        <div className="hidden md:flex items-center gap-1 absolute left-1/2 -translate-x-1/2">
          <a href="/#how-it-works" className="px-3 py-1.5 text-sm text-slate-500 hover:text-slate-900 transition-colors rounded-lg hover:bg-slate-100">
            How it works
          </a>
          <a href="/#pricing" className="px-3 py-1.5 text-sm text-slate-500 hover:text-slate-900 transition-colors rounded-lg hover:bg-slate-100">
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
              <ChevronDown size={13} className={`transition-transform duration-200 ${compareOpen ? 'rotate-180' : ''}`} />
            </button>
            {compareOpen && (
              <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 bg-white border border-slate-200 rounded-xl overflow-hidden shadow-lg shadow-slate-900/[0.08] z-50 w-52">
                {compareLinks.map(({ to, label }, i) => (
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
          <Link to="/founding-program" className="hidden sm:inline-flex px-4 py-1.5 rounded-lg text-sm font-semibold bg-orange-500 hover:bg-orange-600 text-white transition-colors whitespace-nowrap">
            Join the Founding Program
          </Link>
          <button
            className="md:hidden p-2 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors"
            onClick={() => setMobileOpen(o => !o)}
            aria-expanded={mobileOpen}
            aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
          >
            {mobileOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </nav>

      {mobileOpen && (
        <div className="md:hidden fixed inset-0 top-16 z-40 bg-black/40" onClick={() => setMobileOpen(false)} aria-hidden="true" />
      )}

      <div
        className="md:hidden fixed inset-x-0 top-16 z-50 bg-white border-b border-slate-200 shadow-xl shadow-slate-900/[0.08]"
        style={{
          transition: 'opacity 200ms ease-out, transform 200ms ease-out',
          opacity: mobileOpen ? 1 : 0,
          transform: mobileOpen ? 'translateY(0)' : 'translateY(-8px)',
          pointerEvents: mobileOpen ? 'auto' : 'none',
        }}
      >
        <div className="px-5 py-4 space-y-1 max-h-[calc(100dvh-4rem)] overflow-y-auto">
          <a href="/#how-it-works" className="flex items-center h-12 px-3 text-sm font-medium text-slate-700 active:text-orange-600 active:bg-orange-50 rounded-xl transition-colors">
            How it works
          </a>
          <a href="/#pricing" className="flex items-center h-12 px-3 text-sm font-medium text-slate-700 active:text-orange-600 active:bg-orange-50 rounded-xl transition-colors">
            Pricing
          </a>
          <Link to="/resources" onClick={() => setMobileOpen(false)} className="flex items-center h-12 px-3 text-sm font-medium text-slate-700 active:text-orange-600 active:bg-orange-50 rounded-xl transition-colors">
            Resources
          </Link>
          <Link to="/demo" onClick={() => setMobileOpen(false)} className="flex items-center h-12 px-3 text-sm font-medium text-slate-700 active:text-orange-600 active:bg-orange-50 rounded-xl transition-colors">
            Try the demo
          </Link>
          <Link to="/sign-in" onClick={() => setMobileOpen(false)} className="flex items-center h-12 px-3 text-sm font-medium text-slate-700 active:text-orange-600 active:bg-orange-50 rounded-xl transition-colors">
            Sign in
          </Link>

          <div className="pt-2 border-t border-slate-100">
            <div className="px-3 pt-2 pb-1 text-xs font-medium text-slate-400 uppercase tracking-wider">Compare</div>
            {compareLinks.map(({ to, label }) => (
              <Link
                key={to}
                to={to}
                onClick={() => setMobileOpen(false)}
                className="flex items-center h-11 px-3 text-sm text-slate-500 active:text-orange-600 active:bg-orange-50 rounded-xl transition-colors"
              >
                {label}
              </Link>
            ))}
          </div>

          <div className="pt-3 pb-1 border-t border-slate-100">
            <Link
              to="/founding-program"
              onClick={() => setMobileOpen(false)}
              className="flex items-center justify-center h-12 rounded-xl text-sm font-semibold bg-orange-500 active:bg-orange-600 text-white transition-colors"
            >
              Join the Founding Program →
            </Link>
          </div>
        </div>
      </div>
    </>
  )
}
