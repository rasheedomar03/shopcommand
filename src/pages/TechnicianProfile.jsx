import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, MapPin, Wrench, Clock, TrendingUp, CheckCircle2, Star, Award } from 'lucide-react'
import { shops } from '@/data/mock'
import { useData } from '@/contexts/DataContext'
import { Badge, StageBadge } from '@/components/ui/Badge'
import { RODetailModal } from '@/components/modals/RODetailModal'
import { formatCurrency, formatDate, computeHoursMs, formatHours, startOfToday, startOfWeek } from '@/lib/utils'
import { cn } from '@/lib/utils'

const LEVEL_CONFIG = {
  Master: { bg: 'bg-amber-500/20',   text: 'text-amber-500',    badge: 'bg-orange-subtle text-orange' },
  Senior: { bg: 'bg-blue-500/10',    text: 'text-blue-500',     badge: 'bg-status-blue-subtle text-status-blue' },
  Mid:    { bg: 'bg-purple-500/10',  text: 'text-purple-500',   badge: 'bg-status-purple-subtle text-status-purple' },
  Junior: { bg: 'bg-border',         text: 'text-text-secondary', badge: 'bg-border text-text-secondary' },
}

export default function TechnicianProfile() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [selectedRO, setSelectedRO] = useState(null)

  const { technicians, repairOrders, timeEntries, clockedInTechs } = useData()
  const tech = technicians.find(t => String(t.id) === String(id))
  if (!tech) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="text-4xl font-bold text-text-muted mb-2">404</div>
          <div className="text-sm text-text-muted">Technician not found</div>
          <button onClick={() => navigate('/technicians')} className="mt-4 text-xs text-orange hover:underline">
            ← Back to technicians
          </button>
        </div>
      </div>
    )
  }

  const shop  = shops.find(s => s.id === tech.shopId)
  const level = LEVEL_CONFIG[tech.level] || LEVEL_CONFIG.Junior

  const techROs = repairOrders
    .filter(ro => ro.techId === tech.id)
    .sort((a, b) => new Date(b.updated) - new Date(a.updated))

  const activeROs  = techROs.filter(ro => !['Paid', 'Invoiced'].includes(ro.stage))
  const historyROs = techROs.filter(ro => ['Paid', 'Invoiced'].includes(ro.stage))

  const totalEarned = historyROs.reduce((sum, ro) => sum + (ro.total || 0), 0)
  const avgTicket = historyROs.length > 0 ? Math.round(totalEarned / historyROs.length) : 0

  const hoursToday = computeHoursMs(timeEntries, tech.id, startOfToday())
  const hoursWeek  = computeHoursMs(timeEntries, tech.id, startOfWeek())
  const isClockedIn = clockedInTechs.has(tech.id)
  const openEntry = timeEntries.filter(e => e.techId === tech.id && !e.clockOutAt).at(-1)
  const sinceStr = openEntry
    ? new Date(openEntry.clockInAt).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
    : null

  const effColor = tech.efficiency >= 90 ? 'text-status-green' : tech.efficiency >= 80 ? 'text-status-yellow' : 'text-status-red'
  const effBg    = tech.efficiency >= 90 ? 'bg-status-green'   : tech.efficiency >= 80 ? 'bg-status-yellow'   : 'bg-status-red'

  const initials = tech.name.split(' ').map(n => n[0]).join('').toUpperCase()

  return (
    <div className="p-5 lg:p-6 space-y-6 animate-fade-in">

      {/* Back nav */}
      <button
        onClick={() => navigate('/technicians')}
        className="flex items-center gap-1.5 text-xs text-text-muted hover:text-text-primary transition-colors"
      >
        <ArrowLeft size={13} />
        All technicians
      </button>

      {/* Hero */}
      <div className="bg-surface border border-border rounded-xl p-6">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-5">
            {/* Avatar */}
            <div className={cn(
              'w-16 h-16 rounded-full flex items-center justify-center flex-shrink-0 text-xl font-bold',
              level.bg, level.text
            )}>
              {initials}
            </div>

            {/* Name + details */}
            <div>
              <div className="flex items-center gap-2 mb-1">
                <h1 className="text-xl font-semibold text-text-primary">{tech.name}</h1>
                <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium', level.badge)}>
                  {tech.level}
                </span>
                {/* Status dot */}
                <div className="flex items-center gap-1.5 ml-1">
                  <div className={cn(
                    'w-2 h-2 rounded-full',
                    tech.status === 'clocked-in' ? 'bg-status-green' : 'bg-text-muted'
                  )} />
                  <span className="text-xs text-text-muted">
                    {tech.status === 'clocked-in' ? 'Clocked in' : 'Off duty'}
                  </span>
                </div>
              </div>
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-text-muted">
                <span className="flex items-center gap-1.5">
                  <Wrench size={11} />
                  {tech.specialty}
                </span>
                {shop && (
                  <span className="flex items-center gap-1.5">
                    <MapPin size={11} />
                    {shop.name}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Stats strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-5 border-t border-border">
          {[
            { icon: TrendingUp,   label: 'Efficiency',     value: `${tech.efficiency}%` },
            { icon: Clock,        label: 'Hours Today',    value: hoursToday > 0 ? formatHours(hoursToday) : `${tech.hoursWorked}h` },
            { icon: Clock,        label: 'Hours This Week', value: hoursWeek > 0 ? formatHours(hoursWeek) : '—' },
            { icon: Wrench,       label: 'Active Jobs',    value: activeROs.length },
          ].map(({ icon: Icon, label, value }) => (
            <div key={label}>
              <div className="flex items-center gap-1.5 text-2xs text-text-muted uppercase tracking-wider mb-1">
                <Icon size={10} />
                {label}
              </div>
              <div className="text-lg font-semibold text-text-primary tabular-nums">{value}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Body */}
      <div className="grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-5 items-start">

        {/* Left column: jobs */}
        <div className="space-y-5">

          {/* Active Jobs */}
          <div className="bg-surface border border-border rounded-xl overflow-hidden">
            <div className="px-5 py-3.5 border-b border-border flex items-center justify-between">
              <div className="text-sm font-semibold text-text-primary">Active Jobs</div>
              {activeROs.length > 0 && (
                <span className="text-2xs px-2 py-0.5 rounded-full bg-orange/10 text-orange font-medium">
                  {activeROs.length} open
                </span>
              )}
            </div>

            {activeROs.length === 0 ? (
              <div className="py-12 text-center">
                <CheckCircle2 size={22} className="text-text-muted mx-auto mb-2" />
                <p className="text-sm text-text-muted">No active jobs right now.</p>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {activeROs.map(ro => (
                  <RORow key={ro.id} ro={ro} onClick={() => setSelectedRO(ro)} />
                ))}
              </div>
            )}
          </div>

          {/* History */}
          {historyROs.length > 0 && (
            <div className="bg-surface border border-border rounded-xl overflow-hidden">
              <div className="px-5 py-3.5 border-b border-border flex items-center justify-between">
                <div className="text-sm font-semibold text-text-primary">Completed Jobs</div>
                <span className="text-xs text-text-muted tabular-nums">{formatCurrency(totalEarned)} total</span>
              </div>
              <div className="divide-y divide-border">
                {historyROs.map(ro => (
                  <RORow key={ro.id} ro={ro} onClick={() => setSelectedRO(ro)} />
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right sidebar */}
        <div className="space-y-4">

          {/* Efficiency */}
          <div className="bg-surface border border-border rounded-xl p-5">
            <div className="text-xs font-medium text-text-muted uppercase tracking-wider mb-4">Performance</div>
            <div className="space-y-3">
              <div>
                <div className="flex justify-between text-xs mb-1.5">
                  <span className="text-text-muted">Efficiency rating</span>
                  <span className={cn('font-semibold tabular-nums', effColor)}>{tech.efficiency}%</span>
                </div>
                <div className="h-2 bg-border rounded-full overflow-hidden">
                  <div
                    className={cn('h-full rounded-full transition-all duration-700', effBg)}
                    style={{ width: `${tech.efficiency}%` }}
                  />
                </div>
              </div>

              {sinceStr && (
                <div className="flex items-center gap-1.5 text-xs text-status-green mb-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-status-green animate-pulse flex-shrink-0" />
                  Clocked in since {sinceStr}
                </div>
              )}
              <div className="grid grid-cols-2 gap-2 pt-1">
                {[
                  { label: 'Revenue generated', value: formatCurrency(totalEarned) },
                  { label: 'Avg ticket',        value: formatCurrency(avgTicket) },
                  { label: 'Hours today',       value: hoursToday > 0 ? formatHours(hoursToday) : `${tech.hoursWorked}h` },
                  { label: 'Hours this week',   value: hoursWeek > 0 ? formatHours(hoursWeek) : '—' },
                  { label: 'ROs closed',        value: historyROs.length },
                  { label: 'Active ROs',        value: activeROs.length },
                ].map(s => (
                  <div key={s.label} className="p-2.5 rounded-lg bg-background text-center">
                    <div className="text-sm font-semibold tabular-nums text-text-primary">{s.value}</div>
                    <div className="text-2xs text-text-muted mt-0.5">{s.label}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Certifications */}
          {tech.certifications.length > 0 && (
            <div className="bg-surface border border-border rounded-xl p-5">
              <div className="text-xs font-medium text-text-muted uppercase tracking-wider mb-3">Certifications</div>
              <div className="space-y-2">
                {tech.certifications.map(cert => (
                  <div key={cert} className="flex items-center gap-2.5">
                    <div className="w-6 h-6 rounded-md bg-orange/10 flex items-center justify-center flex-shrink-0">
                      <Award size={11} className="text-orange" />
                    </div>
                    <span className="text-xs text-text-primary">{cert}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Shop */}
          {shop && (
            <div className="bg-surface border border-border rounded-xl p-5">
              <div className="text-xs font-medium text-text-muted uppercase tracking-wider mb-3">Location</div>
              <div className="text-sm font-medium text-text-primary mb-1">{shop.name}</div>
              <div className="text-xs text-text-muted leading-relaxed">{shop.address}</div>
              <div className="text-xs text-text-muted mt-1">{shop.phone}</div>
            </div>
          )}
        </div>
      </div>

      {/* RO Detail Modal */}
      {selectedRO && (
        <RODetailModal
          key={selectedRO?.id}
          open={!!selectedRO}
          onClose={() => setSelectedRO(null)}
          ro={selectedRO}
        />
      )}
    </div>
  )
}

function RORow({ ro, onClick }) {
  return (
    <button
      onClick={onClick}
      className="w-full text-left px-5 py-4 hover:bg-background transition-colors duration-100 group"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 min-w-0">
          <div className="flex-shrink-0 pt-0.5">
            <div className="text-xs font-mono text-orange">{ro.id}</div>
            <div className="text-2xs text-text-muted mt-0.5">{formatDate(ro.updated)}</div>
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 mb-0.5">
              <span className="text-sm font-medium text-text-primary truncate">{ro.vehicle}</span>
              <StageBadge stage={ro.stage} />
            </div>
            <div className="text-xs text-text-muted truncate">{ro.customerName}</div>
            <div className="text-xs text-text-muted truncate opacity-75">{ro.complaint}</div>
          </div>
        </div>
        <div className="flex-shrink-0 text-right">
          {ro.total > 0 ? (
            <div className="text-sm font-semibold text-text-primary tabular-nums">
              {formatCurrency(ro.total)}
            </div>
          ) : (
            <div className="text-xs text-text-muted">Pending</div>
          )}
        </div>
      </div>
    </button>
  )
}
