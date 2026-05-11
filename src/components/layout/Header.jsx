import { Bell, Menu, Search, Sun, Moon } from 'lucide-react'
import { useState } from 'react'
import { alerts } from '@/data/mock'
import { AlertsModal } from '@/components/modals/AlertsModal'
import { useTheme } from '@/contexts/ThemeContext'
import { cn } from '@/lib/utils'

export function Header({ onMenuOpen }) {
  const [alertsOpen, setAlertsOpen] = useState(false)
  const { theme, toggleTheme } = useTheme()
  const unreadCount = alerts.filter(a => !a.read).length

  return (
    <>
      <header className="h-14 flex items-center gap-3 px-4 border-b border-border bg-background/95 backdrop-blur-sm sticky top-0 z-20 flex-shrink-0">
        {/* Mobile menu button */}
        <button
          onClick={onMenuOpen}
          className="lg:hidden w-9 h-9 rounded-md flex items-center justify-center text-text-muted hover:text-text-primary hover:bg-surface transition-colors duration-150 focus-visible:outline focus-visible:outline-2 focus-visible:outline-orange"
          aria-label="Open menu"
        >
          <Menu size={18} />
        </button>

        {/* Search */}
        <div className="flex-1 max-w-sm relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none" />
          <input
            type="search"
            placeholder="Search shops, ROs, customers…"
            className={cn(
              'h-8 w-full rounded-md border border-border bg-surface pl-8 pr-3 text-xs text-text-primary',
              'placeholder:text-text-muted',
              'transition-colors duration-150',
              'hover:border-border-hover',
              'focus:outline-none focus:border-orange focus:ring-1 focus:ring-orange/30',
            )}
          />
        </div>

        <div className="flex-1" />

        {/* Theme toggle */}
        <button
          onClick={toggleTheme}
          className="w-9 h-9 rounded-md flex items-center justify-center text-text-muted hover:text-text-primary hover:bg-surface transition-colors duration-150 focus-visible:outline focus-visible:outline-2 focus-visible:outline-orange"
          aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
          title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
        >
          {theme === 'dark'
            ? <Sun size={17} />
            : <Moon size={17} />
          }
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
      </header>

      <AlertsModal open={alertsOpen} onClose={() => setAlertsOpen(false)} />
    </>
  )
}
