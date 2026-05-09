import { NavLink, Link } from 'react-router-dom'
import {
  LayoutDashboard,
  Building2,
  ClipboardList,
  Users,
  UserCircle,
  Package,
  BarChart3,
  Settings,
  X,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useTheme } from '@/contexts/ThemeContext'

// Hex socket mark — pointy-top, 0.56 wall ratio, 0.5px optical nudge
function HexMark({ size = 28, bg = '#12131A' }) {
  const pts = (cx, cy, r) => {
    return [90, 30, -30, -90, -150, 150]
      .map(deg => {
        const a = (deg * Math.PI) / 180
        return `${(cx + r * Math.cos(a)).toFixed(2)},${(cy - r * Math.sin(a)).toFixed(2)}`
      })
      .join(' ')
  }
  const R = 28, r = R * 0.56
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">
      <polygon points={pts(32, 32, R)} fill="#F97316" />
      <polygon points={pts(32, 32.5, r)} fill={bg} />
    </svg>
  )
}

const navGroups = [
  {
    label: 'Overview',
    items: [
      { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
      { to: '/shops', label: 'All Shops', icon: Building2 },
      { to: '/reports', label: 'Reports', icon: BarChart3 },
    ],
  },
  {
    label: 'Operations',
    items: [
      { to: '/repair-orders', label: 'Repair Orders', icon: ClipboardList },
      { to: '/technicians', label: 'Technicians', icon: Users },
      { to: '/customers', label: 'Customers', icon: UserCircle },
      { to: '/parts', label: 'Parts', icon: Package },
    ],
  },
]

export function Sidebar({ open, onClose }) {
  const { theme } = useTheme()
  const hexBg = theme === 'light' ? '#FFFFFF' : '#12131A'

  return (
    <>
      {/* Mobile overlay */}
      {open && (
        <div
          className="fixed inset-0 z-30 bg-black/60 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed top-0 left-0 z-40 h-full w-60 bg-surface border-r border-border',
          'flex flex-col',
          'transition-transform duration-300 ease-out-expo',
          'lg:translate-x-0 lg:static lg:z-auto',
          open ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        {/* Logo */}
        <div className="flex items-center justify-between h-14 px-4 border-b border-border flex-shrink-0">
          <Link to="/" className="flex items-center gap-2.5 hover:opacity-80 transition-opacity">
            <HexMark size={28} bg={hexBg} />
            <div className="leading-none" style={{ fontFamily: '"Space Grotesk", system-ui, sans-serif' }}>
              <span className="text-base font-semibold text-text-primary" style={{ letterSpacing: '-0.02em' }}>Shop</span>
              <span className="text-base font-semibold text-orange" style={{ letterSpacing: '-0.02em' }}>Command</span>
            </div>
          </Link>
          <button
            onClick={onClose}
            className="lg:hidden w-11 h-11 rounded-md flex items-center justify-center text-text-muted hover:text-text-primary hover:bg-border transition-colors duration-150"
            aria-label="Close menu"
          >
            <X size={15} />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 overflow-y-auto">
          <div className="space-y-4">
            {navGroups.map(({ label, items }) => (
              <div key={label}>
                <div className="px-3 mb-1 text-xs font-semibold uppercase tracking-widest text-text-muted">
                  {label}
                </div>
                <div className="space-y-0.5">
                  {items.map(({ to, label: itemLabel, icon: Icon }) => (
                    <NavLink
                      key={to}
                      to={to}
                      end={to === '/dashboard'}
                      onClick={onClose}
                      className={({ isActive }) =>
                        cn(
                          'flex items-center gap-2.5 h-9 rounded-md text-sm font-medium border-l-2',
                          'transition-all duration-150 ease-out-quart',
                          'focus-visible:outline focus-visible:outline-2 focus-visible:outline-orange focus-visible:outline-offset-1',
                          isActive
                            ? 'bg-orange-subtle text-orange border-orange pl-[10px] pr-3'
                            : 'text-text-secondary hover:text-text-primary hover:bg-border/60 border-transparent px-3'
                        )
                      }
                    >
                      {({ isActive }) => (
                        <>
                          <Icon size={16} strokeWidth={isActive ? 2.5 : 1.8} />
                          {itemLabel}
                        </>
                      )}
                    </NavLink>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </nav>

        {/* Bottom */}
        <div className="px-3 pb-4 border-t border-border pt-3 flex-shrink-0">
          <NavLink
            to="/settings"
            onClick={onClose}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-2.5 h-9 rounded-md text-sm font-medium border-l-2',
                'transition-all duration-150 ease-out-quart',
                isActive
                  ? 'bg-orange-subtle text-orange border-orange pl-[10px] pr-3'
                  : 'text-text-secondary hover:text-text-primary hover:bg-border/60 border-transparent px-3'
              )
            }
          >
            {({ isActive }) => (
              <>
                <Settings size={16} strokeWidth={isActive ? 2.5 : 1.8} />
                Settings
              </>
            )}
          </NavLink>

          <div className="mt-3 px-3 py-2.5 rounded-md bg-background border border-border">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-full bg-orange/20 flex items-center justify-center flex-shrink-0">
                <span className="text-xs font-semibold text-orange">RO</span>
              </div>
              <div className="min-w-0">
                <div className="text-xs font-medium text-text-primary truncate">Rasheed Omar</div>
                <div className="text-2xs text-text-muted">Owner · 5 Locations</div>
              </div>
            </div>
          </div>
        </div>
      </aside>
    </>
  )
}
