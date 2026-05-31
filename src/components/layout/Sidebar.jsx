import { NavLink, Link, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard,
  Building2,
  ClipboardList,
  CalendarDays,
  Users,
  UserCircle,
  Package,
  BarChart3,
  Settings,
  LogOut,
  X,
  ArrowRightLeft,
  FileText,
  Receipt,
  MessageSquare,
  ClipboardCheck,
  CreditCard,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useTheme } from '@/contexts/ThemeContext'
import { useAuth } from '@/contexts/AuthContext'
import { useData } from '@/contexts/DataContext'

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
    <svg width={size} height={size} viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg" role="img" aria-hidden="true">
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
      { to: '/estimates',      label: 'Estimates',      icon: FileText       },
      { to: '/repair-orders',  label: 'Repair Orders',  icon: ClipboardList  },
      { to: '/inspections',    label: 'Inspections',    icon: ClipboardCheck },
      { to: '/invoices',       label: 'Invoices',       icon: Receipt        },
      { to: '/payments',       label: 'Payments',       icon: CreditCard     },
      { to: '/appointments',   label: 'Appointments',   icon: CalendarDays   },
      { to: '/dispatch',       label: 'Dispatch',       icon: ArrowRightLeft },
      { to: '/technicians',    label: 'Technicians',    icon: Users          },
      { to: '/customers',      label: 'Customers',      icon: UserCircle     },
      { to: '/messages',       label: 'Messages',       icon: MessageSquare  },
      { to: '/parts',          label: 'Parts',          icon: Package        },
    ],
  },
]

const ADVISOR_HIDDEN = new Set(['/shops', '/technicians', '/reports'])

export function Sidebar({ open, onClose }) {
  const { theme } = useTheme()
  const { logout, session } = useAuth()
  const { parts, shops } = useData()
  const navigate = useNavigate()
  const hexBg = theme === 'light' ? '#FFFFFF' : '#12131A'
  const isAdvisor = session?.role === 'advisor'
  const advisorShop = isAdvisor && session?.shopId ? shops.find(s => s.id === session.shopId) : null
  const scopedParts = isAdvisor ? parts.filter(p => p.shopId === session.shopId) : parts
  const lowStockCount = scopedParts.filter(p => p.qty <= p.minQty).length

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <>
      {/* Mobile overlay */}
      {open && (
        <div
          className="fixed inset-0 z-30 bg-black/60 lg:hidden"
          onClick={onClose}
          aria-hidden="true"
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
            <div className="leading-none">
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
        <nav aria-label="Sidebar navigation" className="flex-1 px-3 py-4 overflow-y-auto">
          <div className="space-y-4">
            {navGroups.map(({ label, items }) => {
              const visibleItems = isAdvisor ? items.filter(i => !ADVISOR_HIDDEN.has(i.to)) : items
              if (visibleItems.length === 0) return null
              return (
              <div key={label}>
                <div className="px-3 mb-1 text-xs font-semibold uppercase tracking-widest text-text-muted">
                  {label}
                </div>
                <div className="space-y-0.5">
                  {visibleItems.map(({ to, label: itemLabel, icon: Icon }) => (
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
                          {to === '/parts' && lowStockCount > 0 && (
                            <span className="ml-auto text-2xs px-1.5 py-0.5 rounded-full bg-status-yellow/15 text-status-yellow font-medium tabular-nums">
                              {lowStockCount}
                            </span>
                          )}
                        </>
                      )}
                    </NavLink>
                  ))}
                </div>
              </div>
              )
            })}
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
                <span className="text-xs font-semibold text-orange">
                  {session?.name ? session.name.split(' ').map(n => n[0]).join('').slice(0, 2) : '?'}
                </span>
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-xs font-medium text-text-primary truncate">{session?.name || 'User'}</div>
                <div className="text-2xs text-text-muted">
                  {isAdvisor
                    ? advisorShop ? `Service Advisor · ${advisorShop.name.split(' ').slice(0, 2).join(' ')}` : 'Service Advisor'
                    : 'Owner · 5 Locations'
                  }
                </div>
              </div>
              <button
                onClick={handleLogout}
                className="w-6 h-6 flex items-center justify-center rounded text-text-muted hover:text-text-primary transition-colors flex-shrink-0"
                title="Sign out"
              >
                <LogOut size={13} />
              </button>
            </div>
          </div>
        </div>
      </aside>
    </>
  )
}
