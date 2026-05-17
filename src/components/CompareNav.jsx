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
      <polygon points={pts(32, 32.5, r)} fill="#0A0B12" />
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
    <nav className="flex items-center px-6 md:px-12 h-16 border-b border-white/[0.06] sticky top-0 z-50 backdrop-blur-md bg-[#0A0B12]/80">
      <div className="flex-1 flex items-center">
        <Link to="/" className="flex items-center gap-2.5 hover:opacity-80 transition-opacity">
          <HexMark size={28} />
          <span style={{ fontFamily: '"Space Grotesk", system-ui', letterSpacing: '-0.02em' }} className="text-base font-semibold">
            <span className="text-white">Shop</span><span className="text-orange-400">Command</span>
          </span>
        </Link>
      </div>

      <div className="hidden md:flex items-center gap-1">
        <a href="/#how-it-works" className="px-3 py-1.5 text-sm text-white/45 hover:text-white transition-colors rounded-lg hover:bg-white/[0.05]">
          How it works
        </a>
        <a href="/#pricing" className="px-3 py-1.5 text-sm text-white/45 hover:text-white transition-colors rounded-lg hover:bg-white/[0.05]">
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
            <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 bg-[#13141F] border border-white/[0.08] rounded-xl overflow-hidden shadow-2xl shadow-black/60 z-50 w-60">
              {compareLinks.map(({ to, label }, i) => (
                <Link
                  key={to}
                  to={to}
                  onClick={() => setCompareOpen(false)}
                  className={`flex items-center px-4 py-3 text-sm text-white/55 hover:text-white hover:bg-white/[0.05] transition-colors ${i > 0 ? 'border-t border-white/[0.06]' : ''}`}
                >
                  {label}
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="flex-1 flex items-center justify-end gap-3">
        <Link to="/login" className="px-4 py-1.5 text-sm font-medium text-white/60 hover:text-white transition-colors">Log in</Link>
        <a href="/#founding" className="px-4 py-1.5 rounded-lg text-sm font-semibold bg-orange-500 hover:bg-orange-400 text-white transition-colors whitespace-nowrap">Reserve your spot</a>
      </div>
    </nav>
  )
}
