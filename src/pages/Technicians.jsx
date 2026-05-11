import { useState } from 'react'
import { Search, Users } from 'lucide-react'
import { technicians, shops } from '@/data/mock'
import { cn } from '@/lib/utils'

export default function Technicians() {
  const [search, setSearch] = useState('')
  const [shopFilter, setShopFilter] = useState('All')
  const [statusFilter, setStatusFilter] = useState('All')

  const filtered = technicians.filter(t => {
    const q = search.toLowerCase()
    const matchSearch = !q || t.name.toLowerCase().includes(q) || t.specialty.toLowerCase().includes(q)
    const matchShop = shopFilter === 'All' || String(t.shopId) === shopFilter
    const matchStatus = statusFilter === 'All' || t.status === statusFilter
    return matchSearch && matchShop && matchStatus
  })

  const clockedIn = technicians.filter(t => t.status === 'clocked-in').length

  return (
    <div className="p-5 lg:p-6 space-y-5 animate-fade-in">
      <div>
        <h1 className="text-xl font-semibold text-text-primary">Technicians</h1>
        <p className="text-xs text-text-muted mt-0.5">
          {technicians.length} total · {clockedIn} clocked in
        </p>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Total Techs', value: technicians.length },
          { label: 'Active Now', value: clockedIn },
          { label: 'Avg Efficiency', value: `${Math.round(technicians.reduce((s, t) => s + t.efficiency, 0) / technicians.length)}%` },
        ].map(s => (
          <div key={s.label} className="bg-surface border border-border rounded-lg px-4 py-3">
            <div className="text-xs text-text-muted uppercase tracking-wider mb-1">{s.label}</div>
            <div className="text-xl font-semibold text-text-primary tabular-nums">{s.value}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search technicians…"
            className="h-8 w-full rounded-md border border-border bg-surface pl-8 pr-3 text-xs text-text-primary placeholder:text-text-muted focus:outline-none focus:border-orange focus:ring-1 focus:ring-orange/30 transition-colors"
          />
        </div>
        <select
          value={shopFilter}
          onChange={e => setShopFilter(e.target.value)}
          className="h-8 rounded-md border border-border bg-surface px-3 text-xs text-text-primary focus:outline-none focus:border-orange [&>option]:bg-surface"
        >
          <option value="All">All shops</option>
          {shops.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
        <div className="flex gap-1">
          {['All', 'clocked-in', 'clocked-out'].map(s => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={cn(
                'h-8 px-3 rounded-md text-xs font-medium transition-all duration-150',
                statusFilter === s
                  ? 'bg-orange-subtle text-orange'
                  : 'text-text-muted hover:text-text-primary hover:bg-surface border border-border'
              )}
            >
              {s === 'clocked-in' ? 'Active' : s === 'clocked-out' ? 'Off' : 'All'}
            </button>
          ))}
        </div>
      </div>

      {/* Grid */}
      {filtered.length === 0 ? (
        <div className="bg-surface border border-border rounded-lg py-16 text-center">
          <div className="w-12 h-12 rounded-xl bg-border mx-auto mb-3 flex items-center justify-center">
            <Users size={20} className="text-text-muted" />
          </div>
          <p className="text-sm text-text-muted">No technicians found.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map(tech => (
            <TechCard key={tech.id} tech={tech} />
          ))}
        </div>
      )}
    </div>
  )
}

function TechCard({ tech }) {
  const shop = shops.find(s => s.id === tech.shopId)
  const effColor = tech.efficiency >= 90 ? 'text-status-green' : tech.efficiency >= 80 ? 'text-status-yellow' : 'text-status-red'
  const effBg = tech.efficiency >= 90 ? 'bg-status-green' : tech.efficiency >= 80 ? 'bg-status-yellow' : 'bg-status-red'

  const levelColors = {
    Master: 'bg-orange-subtle text-orange',
    Senior: 'bg-status-blue-subtle text-status-blue',
    Mid: 'bg-status-purple-subtle text-status-purple',
    Junior: 'bg-border text-text-secondary',
  }

  return (
    <div className="bg-surface border border-border rounded-lg p-4 hover:border-border-hover transition-colors duration-150">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-10 h-10 rounded-full bg-border flex items-center justify-center">
              <span className="text-sm font-semibold text-text-secondary">
                {tech.name.split(' ').map(n => n[0]).join('')}
              </span>
            </div>
            <div className={cn(
              'absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-surface',
              tech.status === 'clocked-in' ? 'bg-status-green' : 'bg-text-muted'
            )} />
          </div>
          <div>
            <div className="text-sm font-medium text-text-primary">{tech.name}</div>
            <div className="text-xs text-text-muted">{tech.specialty}</div>
          </div>
        </div>
        <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium', levelColors[tech.level] || levelColors.Junior)}>
          {tech.level}
        </span>
      </div>

      {/* Efficiency bar */}
      <div className="mb-3">
        <div className="flex justify-between text-xs mb-1.5">
          <span className="text-text-muted">Efficiency</span>
          <span className={cn('font-medium tabular-nums', effColor)}>{tech.efficiency}%</span>
        </div>
        <div className="h-1 bg-border rounded-full overflow-hidden">
          <div
            className={cn('h-full rounded-full transition-all duration-500', effBg)}
            style={{ width: `${tech.efficiency}%` }}
          />
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-2 mb-3">
        {[
          { label: 'Active', value: tech.activeROs },
          { label: 'Done Today', value: tech.completedToday },
          { label: 'Hours', value: `${tech.hoursWorked}h` },
        ].map(s => (
          <div key={s.label} className="text-center p-2 rounded-md bg-background">
            <div className="text-base font-semibold tabular-nums text-text-primary">{s.value}</div>
            <div className="text-2xs text-text-muted">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Shop & certs */}
      <div className="text-xs text-text-muted truncate">{shop?.name}</div>
      {tech.certifications.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-2">
          {tech.certifications.map(cert => (
            <span key={cert} className="text-2xs px-1.5 py-0.5 rounded bg-border text-text-muted">{cert}</span>
          ))}
        </div>
      )}
    </div>
  )
}
