import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, Users, Plus, Trash2, Clock, AlertTriangle, Flag } from 'lucide-react'
import { useData } from '@/contexts/DataContext'
import { useAuth } from '@/contexts/AuthContext'
import { NewTechModal } from '@/components/modals/NewTechModal'
import { cn, computeHoursMs, formatHours, startOfToday, startOfWeek } from '@/lib/utils'

export default function Technicians() {
  const navigate = useNavigate()
  const { technicians, removeTechnician, clockedInTechs, timeEntries, shops } = useData()
  const { session } = useAuth()
  const isOwner = session?.role === 'owner'
  const [search, setSearch] = useState('')
  const [shopFilter, setShopFilter] = useState('All')
  const [statusFilter, setStatusFilter] = useState('All')
  const [newTechOpen, setNewTechOpen] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(null) // tech id
  const [timeLogTab, setTimeLogTab] = useState('log') // 'log' | 'audit'

  const filtered = technicians.filter(t => {
    const q = search.toLowerCase()
    const matchSearch = !q || t.name.toLowerCase().includes(q) || t.specialty.toLowerCase().includes(q)
    const matchShop = shopFilter === 'All' || String(t.shopId) === String(shopFilter)
    const isIn = clockedInTechs.has(t.id)
    const matchStatus = statusFilter === 'All'
      || (statusFilter === 'clocked-in'  && isIn)
      || (statusFilter === 'clocked-out' && !isIn)
    return matchSearch && matchShop && matchStatus
  })

  const clockedIn = clockedInTechs.size
  const todayStart = startOfToday()
  const weekStart  = startOfWeek()
  const avgEff = technicians.length
    ? Math.round(technicians.reduce((s, t) => s + t.efficiency, 0) / technicians.length)
    : 0

  const handleDelete = (techId) => {
    removeTechnician(techId)
    setConfirmDelete(null)
  }

  return (
    <div className="p-5 lg:p-6 space-y-5 animate-fade-in">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-text-primary">Technicians</h1>
          <p className="text-xs text-text-muted mt-0.5">
            {technicians.length} total · {clockedIn} clocked in
          </p>
        </div>
        <button
          onClick={() => setNewTechOpen(true)}
          className="flex items-center gap-2 h-8 px-3 rounded-md bg-orange text-white text-xs font-semibold hover:bg-orange/90 transition-colors flex-shrink-0"
        >
          <Plus size={13} />
          New Technician
        </button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Total Techs', value: technicians.length },
          { label: 'Active Now', value: clockedIn },
          { label: 'Avg Efficiency', value: `${avgEff}%` },
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
            <TechCard
              key={tech.id}
              tech={tech}
              isIn={clockedInTechs.has(tech.id)}
              timeEntries={timeEntries}
              onClick={() => navigate(`/technicians/${tech.id}`)}
              onDelete={() => setConfirmDelete(tech.id)}
              shops={shops}
            />
          ))}
        </div>
      )}

      {/* Delete confirm */}
      {confirmDelete && (() => {
        const t = technicians.find(x => x.id === confirmDelete)
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
            <div className="bg-surface border border-border rounded-xl p-6 max-w-sm w-full shadow-xl">
              <div className="text-sm font-semibold text-text-primary mb-1">Remove technician?</div>
              <p className="text-xs text-text-muted mb-5">
                <span className="font-medium text-text-primary">{t?.name}</span>'s account will be deleted and they'll lose access to the Tech Board. This can't be undone.
              </p>
              <div className="flex gap-2 justify-end">
                <button
                  onClick={() => setConfirmDelete(null)}
                  className="h-8 px-4 rounded-md border border-border text-xs font-medium text-text-secondary hover:text-text-primary transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleDelete(confirmDelete)}
                  className="h-8 px-4 rounded-md bg-red-500/10 border border-red-500/30 text-xs font-semibold text-red-500 hover:bg-red-500/20 transition-colors"
                >
                  Remove Account
                </button>
              </div>
            </div>
          </div>
        )
      })()}

      {/* Time Log + Audit */}
      <div className="bg-surface border border-border rounded-xl overflow-hidden">
        {/* Tab header */}
        <div className="flex items-center gap-0 px-5 py-0 border-b border-border">
          {(['log', ...(isOwner ? ['audit'] : [])]).map(tab => (
            <button
              key={tab}
              onClick={() => setTimeLogTab(tab)}
              className={cn(
                'flex items-center gap-1.5 h-11 px-3 text-xs font-medium border-b-2 transition-all duration-150',
                timeLogTab === tab
                  ? 'text-text-primary border-orange'
                  : 'text-text-muted border-transparent hover:text-text-primary'
              )}
            >
              {tab === 'log'   && <><Clock size={12} />Time Log<span className="text-text-muted ml-1">· This Week</span></>}
              {tab === 'audit' && <><AlertTriangle size={12} />Audit</>}
            </button>
          ))}
        </div>

        {timeLogTab === 'log' && (
          <>
            {/* Mobile time log */}
            <div className="sm:hidden divide-y divide-border">
              {technicians.map(tech => {
                const shop = shops.find(s => s.id === tech.shopId)
                const isIn = clockedInTechs.has(tech.id)
                const todayMs = computeHoursMs(timeEntries, tech.id, todayStart)
                const weekMs  = computeHoursMs(timeEntries, tech.id, weekStart)
                const openEntry = timeEntries.filter(e => e.techId === tech.id && !e.clockOutAt).at(-1)
                const sinceStr  = openEntry ? new Date(openEntry.clockInAt).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }) : null
                return (
                  <div key={tech.id} onClick={() => navigate(`/technicians/${tech.id}`)} className="flex items-center gap-3 px-5 py-3.5 cursor-pointer hover:bg-background transition-colors">
                    <div className="relative flex-shrink-0">
                      <div className="w-8 h-8 rounded-full bg-border flex items-center justify-center">
                        <span className="text-xs font-semibold text-text-secondary">{tech.name.split(' ').map(n => n[0]).join('')}</span>
                      </div>
                      <div className={cn('absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-surface', isIn ? 'bg-status-green' : 'bg-text-muted/40')} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-text-primary truncate">{tech.name}</div>
                      <div className="text-xs text-text-muted">{shop?.name}</div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      {isIn ? (
                        <div className="text-xs font-medium text-status-green">{sinceStr ? `Since ${sinceStr}` : 'Active'}</div>
                      ) : (
                        <div className="text-xs text-text-muted">Off</div>
                      )}
                      {todayMs > 0 && <div className="text-xs text-text-muted tabular-nums">{formatHours(todayMs)} today</div>}
                    </div>
                  </div>
                )
              })}
            </div>

            <div className="hidden sm:block overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left px-5 py-2.5 text-text-muted font-medium uppercase tracking-wider text-2xs">Technician</th>
                    <th className="text-left px-4 py-2.5 text-text-muted font-medium uppercase tracking-wider text-2xs">Location</th>
                    <th className="text-right px-4 py-2.5 text-text-muted font-medium uppercase tracking-wider text-2xs">Today</th>
                    <th className="text-right px-4 py-2.5 text-text-muted font-medium uppercase tracking-wider text-2xs">This Week</th>
                    <th className="text-right px-5 py-2.5 text-text-muted font-medium uppercase tracking-wider text-2xs">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {technicians.map(tech => {
                    const shop    = shops.find(s => s.id === tech.shopId)
                    const isIn    = clockedInTechs.has(tech.id)
                    const todayMs = computeHoursMs(timeEntries, tech.id, todayStart)
                    const weekMs  = computeHoursMs(timeEntries, tech.id, weekStart)
                    const openEntry = timeEntries.filter(e => e.techId === tech.id && !e.clockOutAt).at(-1)
                    const sinceStr  = openEntry
                      ? new Date(openEntry.clockInAt).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
                      : null
                    return (
                      <tr
                        key={tech.id}
                        onClick={() => navigate(`/technicians/${tech.id}`)}
                        className="hover:bg-background transition-colors duration-100 cursor-pointer"
                      >
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-2.5">
                            <div className="relative flex-shrink-0">
                              <div className="w-7 h-7 rounded-full bg-border flex items-center justify-center">
                                <span className="text-2xs font-semibold text-text-secondary">
                                  {tech.name.split(' ').map(n => n[0]).join('')}
                                </span>
                              </div>
                              <div className={cn(
                                'absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-surface',
                                isIn ? 'bg-status-green' : 'bg-text-muted/40'
                              )} />
                            </div>
                            <span className="font-medium text-text-primary">{tech.name}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-text-muted">{shop?.name ?? '—'}</td>
                        <td className="px-4 py-3 text-right tabular-nums text-text-primary font-medium">
                          {todayMs > 0 ? formatHours(todayMs) : <span className="text-text-muted">—</span>}
                        </td>
                        <td className="px-4 py-3 text-right tabular-nums text-text-primary font-medium">
                          {weekMs > 0 ? formatHours(weekMs) : <span className="text-text-muted">—</span>}
                        </td>
                        <td className="px-5 py-3 text-right">
                          {isIn ? (
                            <span className="inline-flex items-center gap-1.5 text-status-green">
                              <span className="w-1.5 h-1.5 rounded-full bg-status-green" />
                              {sinceStr ? `Since ${sinceStr}` : 'Active'}
                            </span>
                          ) : (
                            <span className="text-text-muted">Off</span>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}

        {timeLogTab === 'audit' && isOwner && (
          <AuditTab technicians={technicians} timeEntries={timeEntries} shops={shops} clockedInTechs={clockedInTechs} now={Date.now()} />
        )}
      </div>

      <NewTechModal open={newTechOpen} onClose={() => setNewTechOpen(false)} />
    </div>
  )
}

function TechCard({ tech, isIn, timeEntries, onClick, onDelete, shops }) {
  const shop = shops.find(s => s.id === tech.shopId)
  const effColor = tech.efficiency >= 90 ? 'text-status-green' : tech.efficiency >= 80 ? 'text-status-yellow' : 'text-status-red'
  const effBg    = tech.efficiency >= 90 ? 'bg-status-green'   : tech.efficiency >= 80 ? 'bg-status-yellow'   : 'bg-status-red'

  const levelColors = {
    Master: 'bg-orange-subtle text-orange',
    Senior: 'bg-status-blue-subtle text-status-blue',
    Mid:    'bg-status-purple-subtle text-status-purple',
    Junior: 'bg-border text-text-secondary',
  }

  const openEntry = timeEntries?.filter(e => e.techId === tech.id && !e.clockOutAt).at(-1)
  const sinceStr  = openEntry
    ? new Date(openEntry.clockInAt).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
    : null

  return (
    <div className={cn(
      'relative group bg-surface border rounded-lg p-4 transition-colors duration-150',
      isIn
        ? 'border-status-green/30 hover:border-status-green/60 hover:shadow-[0_0_12px_rgba(34,197,94,0.08)]'
        : 'border-border hover:border-orange/40 hover:shadow-[0_0_12px_rgba(249,115,22,0.08)]'
    )}>
      {/* Delete button */}
      <button
        onClick={(e) => { e.stopPropagation(); onDelete() }}
        className="absolute top-3 right-3 w-6 h-6 rounded-md flex items-center justify-center text-text-muted hover:text-red-500 hover:bg-red-500/10 transition-all duration-150 opacity-0 group-hover:opacity-100"
        title="Remove technician"
      >
        <Trash2 size={12} />
      </button>

      {/* Card body — clickable */}
      <div onClick={onClick} className="cursor-pointer">
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
                isIn ? 'bg-status-green' : 'bg-text-muted/50'
              )} />
            </div>
            <div>
              <div className="text-sm font-medium text-text-primary">{tech.name}</div>
              <div className="text-xs text-text-muted">{tech.specialty}</div>
            </div>
          </div>
          <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium mr-6', levelColors[tech.level] || levelColors.Junior)}>
            {tech.level}
          </span>
        </div>

        <div className="mb-3">
          <div className="flex justify-between text-xs mb-1.5">
            <span className="text-text-muted">Efficiency</span>
            <span className={cn('font-medium tabular-nums', effColor)}>{tech.efficiency}%</span>
          </div>
          <div className="h-1 bg-border rounded-full overflow-hidden">
            <div className={cn('h-full rounded-full transition-all duration-500', effBg)} style={{ width: `${tech.efficiency}%` }} />
          </div>
        </div>

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

        <div className="flex items-center justify-between mt-1">
          <div className="text-xs text-text-muted truncate">{shop?.name}</div>
          {isIn ? (
            <span className="flex items-center gap-1 text-2xs font-medium text-status-green flex-shrink-0">
              <span className="w-1.5 h-1.5 rounded-full bg-status-green" />
              {sinceStr ? `Since ${sinceStr}` : 'Clocked In'}
            </span>
          ) : (
            <span className="flex items-center gap-1 text-2xs text-text-muted flex-shrink-0">
              <span className="w-1.5 h-1.5 rounded-full bg-text-muted/40" />
              Off
            </span>
          )}
        </div>
        {tech.certifications?.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {tech.certifications.map(cert => (
              <span key={cert} className="text-2xs px-1.5 py-0.5 rounded bg-border text-text-muted">{cert}</span>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function AuditTab({ technicians, timeEntries, shops, clockedInTechs, now }) {
  // Build flagged entries
  const flags = []

  for (const tech of technicians) {
    const shop = shops.find(s => s.id === tech.shopId)
    const maxShiftMs = (shop?.maxShiftHours ?? 12) * 3600000
    const bufferMins = shop?.clockInBufferMins ?? 15
    const techEntries = timeEntries
      .filter(e => e.techId === tech.id)
      .sort((a, b) => new Date(a.clockInAt) - new Date(b.clockInAt))

    for (let i = 0; i < techEntries.length; i++) {
      const entry = techEntries[i]
      const clockIn  = new Date(entry.clockInAt)
      const clockOut = entry.clockOutAt ? new Date(entry.clockOutAt) : null
      const shiftMs  = (clockOut ?? new Date(now)) - clockIn
      const entryFlags = []

      // Off-hours clock-in check
      if (shop?.hours) {
        const keys = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat']
        const dayIn = shop.hours[keys[clockIn.getDay()]]
        if (dayIn?.closed) {
          entryFlags.push({ type: 'off-hours', label: 'Clocked in on closed day' })
        } else if (dayIn?.open) {
          const [openH, openM] = dayIn.open.split(':').map(Number)
          const [closeH, closeM] = dayIn.close.split(':').map(Number)
          const allowedTotalM = openH * 60 + openM - bufferMins
          const allowedAt = new Date(clockIn)
          allowedAt.setHours(Math.floor(allowedTotalM / 60), allowedTotalM % 60, 0, 0)
          const closeAt = new Date(clockIn)
          closeAt.setHours(closeH, closeM, 0, 0)
          if (clockIn < allowedAt) {
            entryFlags.push({ type: 'off-hours', label: `Clocked in before window (${dayIn.open})` })
          } else if (clockIn > closeAt) {
            entryFlags.push({ type: 'off-hours', label: `Clocked in after close (${dayIn.close})` })
          }
        }
      }

      // Long shift
      if (shiftMs > maxShiftMs) {
        const hrs = (shiftMs / 3600000).toFixed(1)
        entryFlags.push({ type: 'long-shift', label: `Shift ${hrs}h — exceeds ${shop?.maxShiftHours ?? 12}h limit${!clockOut ? ' (still active)' : ''}` })
      }

      // Short gap between shifts
      const prev = techEntries[i - 1]
      if (prev?.clockOutAt) {
        const gapMs = clockIn - new Date(prev.clockOutAt)
        if (gapMs < 30 * 60000) {
          const gapMin = Math.round(gapMs / 60000)
          entryFlags.push({ type: 'short-gap', label: `Only ${gapMin}min between shifts` })
        }
      }

      if (entryFlags.length > 0) {
        flags.push({ tech, entry, flags: entryFlags, shiftMs, clockOut })
      }
    }
  }

  const FLAG_CFG = {
    'off-hours':  { color: 'text-status-red',    bg: 'bg-status-red/10',    dot: 'bg-status-red'    },
    'long-shift': { color: 'text-orange',         bg: 'bg-orange/10',        dot: 'bg-orange'        },
    'short-gap':  { color: 'text-status-yellow',  bg: 'bg-status-yellow/10', dot: 'bg-status-yellow' },
  }

  if (flags.length === 0) {
    return (
      <div className="py-16 text-center">
        <div className="w-10 h-10 rounded-xl bg-status-green/10 border border-status-green/20 mx-auto mb-3 flex items-center justify-center">
          <Flag size={16} className="text-status-green" />
        </div>
        <p className="text-sm font-medium text-text-primary">No flags</p>
        <p className="text-xs text-text-muted mt-1">No suspicious time entries detected.</p>
      </div>
    )
  }

  return (
    <div className="divide-y divide-border">
      {flags.map(({ tech, entry, flags: entryFlags, shiftMs, clockOut }, i) => {
        const clockInDate  = new Date(entry.clockInAt)
        const clockOutDate = clockOut
        const dateStr = clockInDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
        const inStr   = clockInDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
        const outStr  = clockOutDate
          ? clockOutDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
          : 'Active'
        const hrs = (shiftMs / 3600000).toFixed(1)

        return (
          <div key={i} className="px-5 py-4">
            <div className="flex items-start gap-3">
              <div className="w-7 h-7 rounded-full bg-border flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-2xs font-semibold text-text-secondary">
                  {tech.name.split(' ').map(n => n[0]).join('')}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <span className="text-sm font-medium text-text-primary">{tech.name}</span>
                  <span className="text-xs text-text-muted">{dateStr}</span>
                  <span className="text-xs text-text-muted tabular-nums">{inStr} → {outStr}</span>
                  <span className="text-xs text-text-muted tabular-nums">({hrs}h)</span>
                  {!clockOut && <span className="text-2xs px-1.5 py-0.5 rounded-full bg-orange/10 text-orange font-medium">Active</span>}
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {entryFlags.map((f, fi) => {
                    const cfg = FLAG_CFG[f.type] || FLAG_CFG['off-hours']
                    return (
                      <span key={fi} className={cn('flex items-center gap-1 text-2xs px-2 py-0.5 rounded-full font-medium', cfg.bg, cfg.color)}>
                        <span className={cn('w-1 h-1 rounded-full flex-shrink-0', cfg.dot)} />
                        {f.label}
                      </span>
                    )
                  })}
                </div>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
