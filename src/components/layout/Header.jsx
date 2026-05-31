import { Bell, Menu, Search, Sun, Moon, X, Plus, LogOut, Settings } from 'lucide-react'
import { useState, useRef, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { customers } from '@/data/mock'
import { AlertsModal } from '@/components/modals/AlertsModal'
import { NewROModal } from '@/components/modals/NewROModal'
import { useTheme } from '@/contexts/ThemeContext'
import { useData } from '@/contexts/DataContext'
import { useAuth } from '@/contexts/AuthContext'
import { StageBadge } from '@/components/ui/Badge'
import { cn, sanitizeField } from '@/lib/utils'

function SearchDropdown({ query, onClose }) {
  const { repairOrders } = useData()
  const navigate = useNavigate()
  const q = query.toLowerCase()

  const matchedROs = repairOrders
    .filter(ro =>
      ro.id.toLowerCase().includes(q) ||
      ro.customerName.toLowerCase().includes(q) ||
      ro.vehicle.toLowerCase().includes(q)
    )
    .slice(0, 4)

  const matchedCustomers = customers
    .filter(c => c.name.toLowerCase().includes(q) || c.phone.includes(q))
    .slice(0, 3)

  const total = matchedROs.length + matchedCustomers.length

  const go = (path) => {
    navigate(path)
    onClose()
  }

  return (
    <div className="absolute top-full left-0 right-0 mt-1.5 bg-surface border border-border rounded-lg shadow-xl z-50 overflow-hidden">
      {total === 0 ? (
        <div className="px-4 py-6 text-center text-xs text-text-muted">No results for "{query}"</div>
      ) : (
        <>
          {matchedROs.length > 0 && (
            <div>
              <div className="px-3 pt-2.5 pb-1 text-2xs font-semibold uppercase tracking-wider text-text-muted">Repair Orders</div>
              {matchedROs.map(ro => (
                <button
                  key={ro.id}
                  onClick={() => go('/repair-orders')}
                  className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-border/50 transition-colors text-left"
                >
                  <span className="text-xs font-mono text-orange w-16 flex-shrink-0">{ro.id}</span>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-medium text-text-primary truncate">{ro.customerName}</div>
                    <div className="text-2xs text-text-muted truncate">{ro.vehicle}</div>
                  </div>
                  <StageBadge stage={ro.stage} />
                </button>
              ))}
            </div>
          )}
          {matchedCustomers.length > 0 && (
            <div className={cn(matchedROs.length > 0 && 'border-t border-border')}>
              <div className="px-3 pt-2.5 pb-1 text-2xs font-semibold uppercase tracking-wider text-text-muted">Customers</div>
              {matchedCustomers.map(c => (
                <button
                  key={c.id}
                  onClick={() => go(`/customers/${c.id}`)}
                  className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-border/50 transition-colors text-left"
                >
                  <div className="w-7 h-7 rounded-full bg-orange/10 flex items-center justify-center flex-shrink-0">
                    <span className="text-xs font-semibold text-orange">{c.name.split(' ').map(n => n[0]).join('').slice(0, 2)}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-medium text-text-primary truncate">{c.name}</div>
                    <div className="text-2xs text-text-muted">{c.phone}</div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}

export function Header({ onMenuOpen }) {
  const [alertsOpen, setAlertsOpen] = useState(false)
  const [newROOpen, setNewROOpen] = useState(false)
  const [avatarOpen, setAvatarOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [focused, setFocused] = useState(false)
  const wrapperRef = useRef(null)
  const avatarRef = useRef(null)
  const { theme, toggleTheme } = useTheme()
  const { parts, notifications, shops } = useData()
  const { session, logout } = useAuth()
  const navigate = useNavigate()
  const isAdvisor = session?.role === 'advisor'
  const isOwner = session?.role === 'owner'
  const scopedParts = isAdvisor ? parts.filter(p => p.shopId === session.shopId) : parts
  const lowStockCount = scopedParts.filter(p => p.qty <= p.minQty).length
  const unreadNotifications = notifications.filter(n => !n.read && (!isAdvisor || n.shopId === session?.shopId)).length
  const unreadCount = lowStockCount + unreadNotifications

  // Advisor shop context
  const advisorShop = isAdvisor && session?.shopId ? shops.find(s => s.id === session.shopId) : null

  // Avatar initials
  const initials = session?.name
    ? session.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
    : (session?.role?.[0] ?? '?').toUpperCase()

  const showDropdown = focused && query.length >= 2

  useEffect(() => {
    const handler = (e) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) setFocused(false)
      if (avatarRef.current && !avatarRef.current.contains(e.target)) setAvatarOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') { setFocused(false); setQuery(''); setAvatarOpen(false) } }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [])

  const handleLogout = () => {
    logout()
    navigate('/')
  }

  return (
    <>
      <header className="h-14 flex items-center gap-3 px-4 border-b border-border bg-background/95 backdrop-blur-sm sticky top-0 z-20 flex-shrink-0">
        <button
          onClick={onMenuOpen}
          className="lg:hidden w-9 h-9 rounded-md flex items-center justify-center text-text-muted hover:text-text-primary hover:bg-surface transition-colors duration-150 focus-visible:outline focus-visible:outline-2 focus-visible:outline-orange"
          aria-label="Open menu"
        >
          <Menu size={18} />
        </button>

        {/* Search */}
        <div ref={wrapperRef} className="flex-1 max-w-sm relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none z-10" />
          <input
            type="search"
            value={query}
            onChange={e => setQuery(sanitizeField(e.target.value, 100))}
            onFocus={() => setFocused(true)}
            placeholder="Search ROs, customers, vehicles…"
            className={cn(
              'h-8 w-full rounded-md border border-border bg-surface pl-8 pr-8 text-xs text-text-primary',
              'placeholder:text-text-muted',
              'transition-colors duration-150',
              'hover:border-border-hover',
              'focus:outline-none focus:border-orange focus:ring-1 focus:ring-orange/30',
            )}
          />
          {query && (
            <button
              onClick={() => { setQuery(''); setFocused(false) }}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary transition-colors"
              aria-label="Clear search"
            >
              <X size={13} />
            </button>
          )}
          {showDropdown && (
            <SearchDropdown query={query} onClose={() => { setQuery(''); setFocused(false) }} />
          )}
        </div>

        {/* Advisor shop pill */}
        {advisorShop && (
          <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-surface border border-border text-xs text-text-secondary flex-shrink-0">
            <span className="w-1.5 h-1.5 rounded-full bg-orange flex-shrink-0" />
            {advisorShop.name}
          </div>
        )}

        <div className="flex-1" />

        {/* New RO */}
        {(isOwner || isAdvisor) && (
          <button
            onClick={() => setNewROOpen(true)}
            className="hidden sm:flex items-center gap-1.5 h-8 px-3 rounded-md bg-orange text-white text-xs font-semibold hover:bg-orange-600 transition-colors duration-150 flex-shrink-0"
          >
            <Plus size={14} strokeWidth={2.5} />
            New RO
          </button>
        )}

        {/* Theme toggle */}
        <button
          onClick={toggleTheme}
          className="w-9 h-9 rounded-md flex items-center justify-center text-text-muted hover:text-text-primary hover:bg-surface transition-colors duration-150 focus-visible:outline focus-visible:outline-2 focus-visible:outline-orange"
          aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
          title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
        >
          {theme === 'dark' ? <Sun size={17} /> : <Moon size={17} />}
        </button>

        {/* Alerts */}
        <button
          onClick={() => setAlertsOpen(true)}
          className="relative w-9 h-9 rounded-md flex items-center justify-center text-text-muted hover:text-text-primary hover:bg-surface transition-colors duration-150 focus-visible:outline focus-visible:outline-2 focus-visible:outline-orange"
          aria-label={`${unreadCount} unread alerts`}
        >
          <Bell size={17} />
          {unreadCount > 0 && (
            <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-orange" />
          )}
        </button>

        {/* Avatar */}
        <div className="relative" ref={avatarRef}>
          <button
            onClick={() => setAvatarOpen(o => !o)}
            className="flex items-center gap-2 pl-1 pr-2 py-1 rounded-md hover:bg-surface transition-colors duration-150"
            aria-label="Account menu"
          >
            <div className="w-7 h-7 rounded-full bg-orange/20 border border-orange/30 flex items-center justify-center flex-shrink-0">
              <span className="text-orange text-xs font-bold leading-none">{initials}</span>
            </div>
            <div className="hidden sm:block text-left">
              <div className="text-xs font-medium text-text-primary leading-none mb-0.5">
                {session?.name ?? session?.role}
              </div>
              <div className="text-2xs text-text-muted capitalize leading-none">{session?.role}</div>
            </div>
          </button>

          {avatarOpen && (
            <div className="absolute top-full right-0 mt-1.5 w-48 bg-surface border border-border rounded-xl shadow-xl z-50 overflow-hidden py-1">
              <div className="px-3 py-2.5 border-b border-border mb-1">
                <div className="text-xs font-semibold text-text-primary">{session?.name ?? session?.role}</div>
                <div className="text-2xs text-text-muted capitalize mt-0.5">{session?.role}</div>
              </div>
              <Link
                to="/settings"
                onClick={() => setAvatarOpen(false)}
                className="flex items-center gap-2.5 w-full px-3 py-2 text-xs text-text-secondary hover:text-text-primary hover:bg-border/40 transition-colors"
              >
                <Settings size={13} />
                Settings
              </Link>
              <button
                onClick={handleLogout}
                className="flex items-center gap-2.5 w-full px-3 py-2 text-xs text-text-secondary hover:text-red-400 hover:bg-border/40 transition-colors"
              >
                <LogOut size={13} />
                Sign out
              </button>
            </div>
          )}
        </div>
      </header>

      <AlertsModal open={alertsOpen} onClose={() => setAlertsOpen(false)} />
      <NewROModal open={newROOpen} onClose={() => setNewROOpen(false)} />
    </>
  )
}
