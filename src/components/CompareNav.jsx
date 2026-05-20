import { useState, useRef, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { ChevronDown } from 'lucide-react'

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
      <polygon points={pts(32, 32.5, r)} fill="#FAFAF8" />
    </svg>
  )
}

const compareLinks = [
  { to: '/compare/tekmetric',  label: 'ShopCommand vs. Tekmetric'  },
  { to: '/compare/shopmonkey', label: 'ShopCommand vs. Shopmonkey' },
  { to: '/compare/mitchell1',  label: 'ShopCommand vs. Mitchell1'  },
  { to: '/compare/shop-ware',  label: 'ShopCommand vs. Shop-Ware'  },
  { to: '/compare/ro-writer',  label: 'ShopCommand vs. R.O. Writer'},
]

export function CompareNav() {
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
    <nav className="flex items-center px-6 md:px-12 h-16 border-b border-slate-200 sticky top-0 z-50 backdrop-blur-md bg-[#FAFAF8]/80">
      <div className="flex-1 flex items-center">
        <Link to="/" className="flex items-center gap-2.5 hover:opacity-80 transition-opacity">
          <HexMark size={28} />
          <span style={{ fontFamily: '"Bricolage Grotesque", system-ui, sans-serif', letterSpacing: '-0.02em' }} className="text-base font-semibold">
            <span className="text-slate-900">Shop</span><span className="text-orange-400">Command</span>
          </span>
        </Link>
      </div>

      <div className="hidden md:flex items-center gap-1">
        <a href="/#how-it-works" className="px-3 py-1.5 text-sm text-slate-500 hover:text-slate-900 transition-colors rounded-lg hover:bg-slate-50">
          How it works
        </a>
        <a href="/#pricing" className="px-3 py-1.5 text-sm text-slate-500 hover:text-slate-900 transition-colors rounded-lg hover:bg-slate-50">
          Pricing
        </a>
        <div className="relative" ref={compareRef}>
          <button
            onClick={() => setCompareOpen(o => !o)}
            className="flex items-center gap-1 px-3 py-1.5 text-sm text-slate-500 hover:text-slate-900 transition-colors rounded-lg hover:bg-slate-50"
          >
            Compare
            <ChevronDown size={13} className={`transition-transform duration-200 ${compareOpen ? 'rotate-180' : ''}`} />
          </button>
          {compareOpen && (
            <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 bg-white border border-slate-200 rounded-xl overflow-hidden shadow-2xl shadow-slate-200/60 z-50 w-60">
              {compareLinks.map(({ to, label }, i) => (
                <Link
                  key={to}
                  to={to}
                  onClick={() => setCompareOpen(false)}
                  className={`flex items-center px-4 py-3 text-sm text-slate-500 hover:text-slate-900 hover:bg-slate-50 transition-colors ${i > 0 ? 'border-t border-slate-100' : ''}`}
                >
                  {label}
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="flex-1 flex items-center justify-end gap-3">
        <Link to="/login" className="px-4 py-1.5 text-sm font-medium text-slate-500 hover:text-slate-900 transition-colors">Log in</Link>
        <a href="/#founding" className="px-4 py-1.5 rounded-lg text-sm font-semibold bg-orange-500 hover:bg-orange-600 text-white transition-colors shadow-sm whitespace-nowrap">Reserve your spot</a>
      </div>
    </nav>
  )
}
