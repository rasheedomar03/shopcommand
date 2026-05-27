import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Wrench, CheckCircle2, Clock, PlayCircle, Flag, LogOut, Square,
  LayoutDashboard, Users, Package, Briefcase, Search,
  AlertCircle, MapPin, ChevronDown, ChevronRight as ChevronRightIcon,
  Truck, ExternalLink, CheckCheck, Camera, DollarSign, ClipboardCheck,
  TrendingUp, Zap,
} from 'lucide-react'
import { shops, customers } from '@/data/mock'
import { useAuth } from '@/contexts/AuthContext'
import { useData } from '@/contexts/DataContext'
import { RODetailModal } from '@/components/modals/RODetailModal'
import { StageBadge } from '@/components/ui/Badge'
import { formatCurrency, formatDate, computeHoursMs, formatHours, startOfToday, startOfWeek } from '@/lib/utils'
import { cn } from '@/lib/utils'

// ── parts order config ────────────────────────────────────────────────────────

const PART_STATUS = {
  requested: { label: 'Requested', color: 'text-text-muted',    bg: 'bg-border' },
  ordered:   { label: 'Ordered',   color: 'text-orange',        bg: 'bg-orange/10' },
  shipped:   { label: 'In Transit',color: 'text-blue-400',      bg: 'bg-blue-500/10' },
  arrived:   { label: 'Arrived',   color: 'text-status-yellow', bg: 'bg-status-yellow/10' },
  ready:     { label: 'Ready ✓',   color: 'text-status-green',  bg: 'bg-status-green/10' },
}

function getTrackingUrl(carrier, trackingNumber) {
  if (!trackingNumber) return null
  const map = {
    UPS:   `https://www.ups.com/track?tracknum=${trackingNumber}`,
    FedEx: `https://www.fedex.com/fedextrack/?tracknums=${trackingNumber}`,
    USPS:  `https://tools.usps.com/go/TrackConfirmAction?tLabels=${trackingNumber}`,
  }
  return map[carrier] || null
}

// ── helpers ───────────────────────────────────────────────────────────────────

function formatElapsed(startMs, now) {
  const s = Math.floor((now - startMs) / 1000)
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = s % 60
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`
  return `${m}:${String(sec).padStart(2, '0')}`
}

function deriveStatus(ro) {
  if (['Paid', 'Invoiced', 'Complete'].includes(ro.stage)) return 'done'
  if (ro.stage === 'In Progress') return 'active'
  if (ro.stage === 'Waiting Parts') return 'waiting'
  return 'queued'
}

// ── hex mark ──────────────────────────────────────────────────────────────────

function HexMark({ size = 26 }) {
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
      <polygon points={pts(32, 32.5, r)} fill="#0D0E14" />
    </svg>
  )
}

// ── nav item ──────────────────────────────────────────────────────────────────

function NavItem({ icon: Icon, label, active, onClick, badge }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full flex items-center gap-2.5 h-9 rounded-md text-sm font-medium border-l-2 px-3 transition-all duration-150',
        active
          ? 'bg-orange-subtle text-orange border-orange pl-[10px] pr-3'
          : 'text-text-secondary hover:text-text-primary hover:bg-border/60 border-transparent'
      )}
    >
      <Icon size={16} strokeWidth={active ? 2.5 : 1.8} />
      {label}
      {badge > 0 && (
        <span className="ml-auto text-2xs px-1.5 py-0.5 rounded-full bg-orange/10 text-orange font-medium tabular-nums">
          {badge}
        </span>
      )}
    </button>
  )
}

// ── job card ──────────────────────────────────────────────────────────────────

function JobCard({ ro, status, onStart, onDone, onResume, onOpen, startTime, now, jobTimers, startJobTimer, stopJobTimer, onRequestPart, photoCount, onPhoto, onInspect, clockedIn = true }) {
  const isQueued  = status === 'queued'
  const isActive  = status === 'active'
  const isWaiting = status === 'waiting'
  const isDone    = status === 'done'

  const [partReqOpen, setPartReqOpen] = useState(false)
  const [partDraft, setPartDraft] = useState({ name: '', partNumber: '', qty: 1 })

  const getTimerMs = (svcIdx) => {
    const t = jobTimers?.[`${ro.id}_${svcIdx}`]
    if (!t) return 0
    return t.totalMs + (t.startedAt ? now - new Date(t.startedAt).getTime() : 0)
  }
  const isTimerRunning = (svcIdx) => !!jobTimers?.[`${ro.id}_${svcIdx}`]?.startedAt
  const fmtMs = (ms) => {
    const s = Math.floor(ms / 1000)
    const h = Math.floor(s / 3600)
    const m = Math.floor((s % 3600) / 60)
    const sec = s % 60
    if (h > 0) return `${h}:${String(m).padStart(2,'0')}:${String(sec).padStart(2,'0')}`
    return `${m}:${String(sec).padStart(2,'0')}`
  }

  const totalActual = ro.services?.reduce((sum, _, i) => sum + getTimerMs(i), 0) || 0
  const totalBook = ro.services?.reduce((sum, svc) => sum + (svc.bookTimeMin || 0), 0) || 0
  const effPct = totalBook > 0 && totalActual > 0 ? Math.round((totalBook * 60000) / totalActual * 100) : null

  return (
    <div
      onClick={onOpen}
      className={cn(
        'rounded-xl border p-4 transition-all duration-200 cursor-pointer',
        isActive  ? 'bg-orange/5 border-orange/30 shadow-[0_0_16px_rgba(249,115,22,0.08)] hover:border-orange/50' :
        isWaiting ? 'bg-status-yellow/5 border-status-yellow/30 hover:border-status-yellow/50' :
        isDone    ? 'bg-surface border-border opacity-60 hover:opacity-80' :
                    'bg-surface border-border hover:border-orange/30',
      )}
    >
      <div className="flex items-start justify-between gap-2 mb-3">
        <div>
          <div className="text-xs font-mono text-orange mb-0.5">{ro.id}</div>
          <div className="text-base font-semibold text-text-primary leading-snug">{ro.vehicle}</div>
          <div className="text-xs text-text-muted mt-0.5">{ro.customerName}</div>
        </div>
        {isActive && startTime && (
          <div className="flex items-center gap-1.5 flex-shrink-0">
            <div className="w-2 h-2 rounded-full bg-orange animate-pulse" />
            <span className="text-sm font-mono font-semibold text-orange tabular-nums">
              {formatElapsed(startTime, now)}
            </span>
          </div>
        )}
        {isWaiting && <Package size={14} className="text-status-yellow flex-shrink-0 mt-0.5" />}
        {isDone && <CheckCircle2 size={18} className="text-status-green flex-shrink-0 mt-0.5" />}
      </div>

      <p className="text-xs text-text-muted leading-relaxed mb-3 line-clamp-2">{ro.complaint}</p>

      {ro.services?.length > 0 && (
        <div className="space-y-1.5 mb-3">
          {ro.services.map((svc, i) => {
            const running = isTimerRunning(i)
            const ms = getTimerMs(i)
            const bookMs = (svc.bookTimeMin || 0) * 60000
            const svcEff = bookMs > 0 && ms > 0 ? Math.round(bookMs / ms * 100) : null
            return (
              <div key={i}>
                <div className="flex items-center gap-2">
                  <div className="w-1 h-1 rounded-full bg-text-muted flex-shrink-0 mt-0.5" />
                  <span className="text-xs text-text-secondary leading-snug flex-1 truncate">{svc.name}</span>
                  {svc.bookTimeMin > 0 && (
                    <span className="text-2xs text-text-muted flex-shrink-0">{svc.bookTimeMin}m book</span>
                  )}
                  {ms > 0 && (
                    <span className={cn('text-xs font-mono tabular-nums flex-shrink-0', running ? 'text-orange' : 'text-text-muted')}>
                      {fmtMs(ms)}
                    </span>
                  )}
                  {svcEff !== null && !running && (
                    <span className={cn('text-2xs font-semibold flex-shrink-0', svcEff >= 100 ? 'text-status-green' : svcEff >= 80 ? 'text-status-yellow' : 'text-status-red')}>
                      {svcEff}%
                    </span>
                  )}
                  {!isDone && (
                    <button
                      disabled={!clockedIn}
                      onClick={e => { e.stopPropagation(); running ? stopJobTimer(ro.id, i) : startJobTimer(ro.id, i) }}
                      className={cn('flex-shrink-0 transition-colors', !clockedIn ? 'text-text-muted/40 cursor-not-allowed' : running ? 'text-orange hover:text-orange/70' : 'text-text-muted hover:text-orange')}
                      title={!clockedIn ? 'Clock in to use timers' : running ? 'Stop' : 'Start timer'}
                    >
                      {running ? <Square size={9} fill="currentColor" /> : <PlayCircle size={12} />}
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Efficiency bar + photo/inspect actions */}
      {(effPct !== null || !isDone) && (
        <div className="flex items-center gap-2 mb-3 pt-1">
          {effPct !== null && (
            <div className="flex items-center gap-1.5 flex-1 min-w-0">
              <Zap size={10} className={cn(effPct >= 100 ? 'text-status-green' : effPct >= 80 ? 'text-status-yellow' : 'text-status-red')} />
              <div className="flex-1 h-1.5 rounded-full bg-border overflow-hidden">
                <div
                  className={cn('h-full rounded-full transition-all', effPct >= 100 ? 'bg-status-green' : effPct >= 80 ? 'bg-status-yellow' : 'bg-status-red')}
                  style={{ width: `${Math.min(effPct, 150)}%` }}
                />
              </div>
              <span className={cn('text-2xs font-semibold tabular-nums', effPct >= 100 ? 'text-status-green' : effPct >= 80 ? 'text-status-yellow' : 'text-status-red')}>
                {effPct}%
              </span>
            </div>
          )}
          {!isDone && (
            <div className="flex items-center gap-1 flex-shrink-0">
              <button
                onClick={e => { e.stopPropagation(); onPhoto?.(ro) }}
                className="w-7 h-7 rounded-md flex items-center justify-center text-text-muted hover:text-orange hover:bg-orange/10 transition-colors relative"
                title="Add photo"
              >
                <Camera size={13} />
                {(photoCount?.[ro.id] || 0) > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-orange text-white text-[8px] font-bold flex items-center justify-center">
                    {photoCount[ro.id]}
                  </span>
                )}
              </button>
              <button
                onClick={e => { e.stopPropagation(); onInspect?.(ro) }}
                className="w-7 h-7 rounded-md flex items-center justify-center text-text-muted hover:text-blue-400 hover:bg-blue-500/10 transition-colors"
                title="Run inspection"
              >
                <ClipboardCheck size={13} />
              </button>
            </div>
          )}
        </div>
      )}

      {isQueued && (
        <button disabled={!clockedIn} onClick={e => { e.stopPropagation(); onStart() }} className={cn("w-full h-10 rounded-lg text-sm font-semibold flex items-center justify-center gap-2 transition-all duration-150", clockedIn ? "bg-orange text-white hover:bg-orange/90 active:scale-[0.98]" : "bg-orange/30 text-white/50 cursor-not-allowed")}>
          <PlayCircle size={15} /> {clockedIn ? 'Start Job' : 'Clock in to start'}
        </button>
      )}
      {isWaiting && (
        <button disabled={!clockedIn} onClick={e => { e.stopPropagation(); onResume() }} className={cn("w-full h-10 rounded-lg border text-sm font-semibold flex items-center justify-center gap-2 transition-all duration-150", clockedIn ? "border-status-yellow/30 bg-status-yellow/10 text-status-yellow hover:bg-status-yellow/20 active:scale-[0.98]" : "border-border bg-border/30 text-text-muted cursor-not-allowed")}>
          <PlayCircle size={15} /> {clockedIn ? 'Parts In — Resume' : 'Clock in to resume'}
        </button>
      )}
      {isActive && (
        <button disabled={!clockedIn} onClick={e => { e.stopPropagation(); onDone() }} className={cn("w-full h-10 rounded-lg text-sm font-semibold flex items-center justify-center gap-2 transition-all duration-150", clockedIn ? "bg-status-green text-white hover:opacity-90 active:scale-[0.98]" : "bg-status-green/30 text-white/50 cursor-not-allowed")}>
          <Flag size={14} /> {clockedIn ? 'Mark Done' : 'Clock in to complete'}
        </button>
      )}
      {isDone && (
        <div className="w-full h-10 rounded-lg bg-border/50 text-text-muted text-sm font-medium flex items-center justify-center gap-2">
          <CheckCircle2 size={14} /> Completed
        </div>
      )}

      {/* Request Part — only before In Progress */}
      {!isDone && !isActive && (
        <div className="mt-3 pt-3 border-t border-border/60">
          {!partReqOpen ? (
            <button
              onClick={e => { e.stopPropagation(); setPartReqOpen(true) }}
              className="w-full flex items-center justify-center gap-1.5 h-7 rounded-md border border-border text-xs text-text-muted hover:text-orange hover:border-orange/40 transition-colors"
            >
              <Package size={11} /> Request Part
            </button>
          ) : (
            <div onClick={e => e.stopPropagation()} className="space-y-2">
              <div className="text-2xs font-semibold text-text-muted uppercase tracking-wider">Request Part</div>
              <input
                autoFocus
                value={partDraft.name}
                onChange={e => setPartDraft(p => ({ ...p, name: e.target.value }))}
                placeholder="Part name *"
                className="w-full h-7 rounded-md border border-border bg-background px-2.5 text-xs text-text-primary placeholder:text-text-muted focus:outline-none focus:border-orange transition-colors"
              />
              <div className="flex gap-2">
                <input
                  value={partDraft.partNumber}
                  onChange={e => setPartDraft(p => ({ ...p, partNumber: e.target.value }))}
                  placeholder="Part # (optional)"
                  className="flex-1 h-7 rounded-md border border-border bg-background px-2.5 text-xs text-text-primary placeholder:text-text-muted focus:outline-none focus:border-orange transition-colors"
                />
                <input
                  type="number"
                  min="1"
                  value={partDraft.qty}
                  onChange={e => setPartDraft(p => ({ ...p, qty: Math.max(1, Number(e.target.value)) }))}
                  className="w-14 h-7 rounded-md border border-border bg-background px-2 text-xs text-text-primary focus:outline-none focus:border-orange transition-colors text-center"
                />
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => { setPartReqOpen(false); setPartDraft({ name: '', partNumber: '', qty: 1 }) }}
                  className="flex-1 h-7 rounded-md border border-border text-xs text-text-muted hover:text-text-primary transition-colors"
                >
                  Cancel
                </button>
                <button
                  disabled={!partDraft.name.trim()}
                  onClick={() => {
                    onRequestPart(ro, partDraft)
                    setPartReqOpen(false)
                    setPartDraft({ name: '', partNumber: '', qty: 1 })
                  }}
                  className="flex-1 h-7 rounded-md bg-orange text-white text-xs font-medium hover:bg-orange/90 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  Submit
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ── col header ────────────────────────────────────────────────────────────────

function ColHeader({ label, count, accent }) {
  return (
    <div className="flex items-center gap-2 mb-4">
      <span className="text-sm font-semibold text-text-primary">{label}</span>
      <span className={cn(
        'text-xs px-2 py-0.5 rounded-full font-medium tabular-nums',
        accent === 'orange' ? 'bg-orange/10 text-orange' :
        accent === 'green'  ? 'bg-status-green/10 text-status-green' :
        accent === 'yellow' ? 'bg-status-yellow/10 text-status-yellow' :
        'bg-border text-text-muted'
      )}>
        {count}
      </span>
    </div>
  )
}

// ── tabs ──────────────────────────────────────────────────────────────────────

function JobsTab({ techROs, startTimes, now, onStart, onDone, onResume, onOpen, onRequestPart, jobTimers, startJobTimer, stopJobTimer, photoCount, onPhoto, onInspect, clockedIn }) {
  const queued  = techROs.filter(ro => deriveStatus(ro) === 'queued')
  const waiting = techROs.filter(ro => deriveStatus(ro) === 'waiting')
  const active  = techROs.filter(ro => deriveStatus(ro) === 'active')
  const done    = techROs.filter(ro => deriveStatus(ro) === 'done')
  const timerProps = { jobTimers, startJobTimer, stopJobTimer, onRequestPart, photoCount, onPhoto, onInspect, clockedIn }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-5 items-start">
      <div>
        <ColHeader label="Up Next" count={queued.length} accent="neutral" />
        {queued.length === 0
          ? <EmptyCol icon={Wrench} text="No jobs queued" />
          : <div className="space-y-3">{queued.map(ro => <JobCard key={ro.id} ro={ro} status="queued" onStart={() => onStart(ro)} onOpen={() => onOpen(ro)} now={now} {...timerProps} />)}</div>
        }
      </div>
      <div>
        <ColHeader label="Waiting Parts" count={waiting.length} accent="yellow" />
        {waiting.length === 0
          ? <EmptyCol icon={Package} text="No jobs waiting on parts" />
          : <div className="space-y-3">{waiting.map(ro => <JobCard key={ro.id} ro={ro} status="waiting" onResume={() => onResume(ro)} onOpen={() => onOpen(ro)} now={now} {...timerProps} />)}</div>
        }
      </div>
      <div>
        <ColHeader label="Working On" count={active.length} accent="orange" />
        {active.length === 0
          ? <EmptyCol icon={PlayCircle} text="Start a job to see it here" />
          : <div className="space-y-3">{active.map(ro => <JobCard key={ro.id} ro={ro} status="active" onDone={() => onDone(ro)} onOpen={() => onOpen(ro)} startTime={startTimes[ro.id] ?? (now - 8 * 60 * 1000)} now={now} {...timerProps} />)}</div>
        }
      </div>
      <div>
        <ColHeader label="Done Today" count={done.length} accent="green" />
        {done.length === 0
          ? <EmptyCol icon={CheckCircle2} text="Completed jobs appear here" />
          : <div className="space-y-3">{done.map(ro => <JobCard key={ro.id} ro={ro} status="done" onOpen={() => onOpen(ro)} now={now} {...timerProps} />)}</div>
        }
      </div>
    </div>
  )
}

function EmptyCol({ icon: Icon, text }) {
  return (
    <div className="rounded-xl border border-border border-dashed py-10 text-center">
      <Icon size={18} className="text-text-muted mx-auto mb-2" />
      <p className="text-xs text-text-muted">{text}</p>
    </div>
  )
}

function StoreDashboard({ shop, repairOrders }) {
  if (!shop) return null
  const shopROs = repairOrders.filter(ro => ro.shopId === shop.id)
  const openROs   = shopROs.filter(ro => !['Paid', 'Invoiced'].includes(ro.stage))
  const todayPaid = shopROs.filter(ro => ro.stage === 'Paid')
  const todayRev  = todayPaid.reduce((s, ro) => s + (ro.total || 0), 0)

  return (
    <div className="space-y-5">
      {/* Shop hero */}
      <div className="bg-surface border border-border rounded-xl p-5">
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 rounded-lg bg-orange/10 flex items-center justify-center flex-shrink-0">
            <Briefcase size={18} className="text-orange" />
          </div>
          <div>
            <div className="text-base font-semibold text-text-primary">{shop.name}</div>
            <div className="flex items-center gap-1.5 text-xs text-text-muted mt-0.5">
              <MapPin size={10} />
              {shop.address}
            </div>
            <div className="text-xs text-text-muted mt-0.5">Manager: {shop.manager}</div>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3">
        {[
          { label: 'Open ROs',     value: openROs.length },
          { label: 'Active Techs', value: shop.activeTechs },
          { label: 'Revenue (MTD)', value: formatCurrency(shop.revenue.mtd), wide: true },
          { label: 'Avg Ticket',   value: formatCurrency(shop.avgTicket) },
          { label: 'Efficiency',   value: `${shop.efficiency}%` },
        ].map(s => (
          <div key={s.label} className={cn('bg-surface border border-border rounded-lg px-4 py-3', s.wide && 'col-span-2')}>
            <div className="text-xs text-text-muted uppercase tracking-wider mb-1">{s.label}</div>
            <div className="text-xl font-semibold text-text-primary tabular-nums">{s.value}</div>
          </div>
        ))}
      </div>

      {/* Recent open ROs at this shop — view only */}
      {openROs.length > 0 && (
        <div className="bg-surface border border-border rounded-xl overflow-hidden">
          <div className="px-5 py-3.5 border-b border-border flex items-center justify-between">
            <div className="text-sm font-semibold text-text-primary">Active Jobs at This Location</div>
            <span className="text-2xs text-text-muted px-1.5 py-0.5 rounded bg-border">View only</span>
          </div>
          <div className="divide-y divide-border">
            {openROs.slice(0, 8).map(ro => (
              <div key={ro.id} className="flex items-center gap-3 px-5 py-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono text-orange">{ro.id}</span>
                    <StageBadge stage={ro.stage} />
                  </div>
                  <div className="text-xs text-text-muted truncate mt-0.5">{ro.vehicle} · {ro.customerName}</div>
                </div>
                <div className="text-xs text-text-muted flex-shrink-0">{ro.techName || 'Unassigned'}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function StoreCustomers({ shopId, repairOrders, onOpenRO }) {
  const [search, setSearch] = useState('')
  const [expandedId, setExpandedId] = useState(null)

  const storeCustomers = customers.filter(c => c.shopId === shopId)
  const filtered = storeCustomers.filter(c => {
    const q = search.toLowerCase()
    return !q || c.name.toLowerCase().includes(q) || c.phone.includes(q)
  })

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none" />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search customers…"
          className="h-8 w-full rounded-md border border-border bg-surface pl-8 pr-3 text-xs text-text-primary placeholder:text-text-muted focus:outline-none focus:border-orange focus:ring-1 focus:ring-orange/30 transition-colors"
        />
      </div>

      <div className="bg-surface border border-border rounded-xl overflow-hidden">
        {filtered.length === 0 ? (
          <div className="py-12 text-center">
            <Users size={20} className="text-text-muted mx-auto mb-2" />
            <p className="text-sm text-text-muted">No customers found.</p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {filtered.map(c => {
              const customerROs = repairOrders
                .filter(ro => ro.customerId === c.id && ro.shopId === shopId)
                .sort((a, b) => new Date(b.updated) - new Date(a.updated))
              const lastRO = customerROs[0]
              const isExpanded = expandedId === c.id

              return (
                <div key={c.id}>
                  {/* Customer row */}
                  <button
                    onClick={() => setExpandedId(isExpanded ? null : c.id)}
                    className="w-full flex items-center gap-3 px-5 py-3.5 hover:bg-border/30 transition-colors duration-100 text-left"
                  >
                    <div className="w-8 h-8 rounded-full bg-border flex items-center justify-center flex-shrink-0">
                      <span className="text-xs font-medium text-text-secondary">
                        {c.name.split(' ').map(n => n[0]).join('')}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-text-primary">{c.name}</div>
                      <div className="text-xs text-text-muted">{c.phone}</div>
                    </div>
                    <div className="text-right flex-shrink-0 mr-2">
                      <div className="text-xs text-text-muted">{c.roCount} visit{c.roCount !== 1 ? 's' : ''}</div>
                      {lastRO && (
                        <div className="text-2xs text-text-muted">Last: {formatDate(lastRO.updated)}</div>
                      )}
                    </div>
                    {isExpanded
                      ? <ChevronDown size={14} className="text-text-muted flex-shrink-0" />
                      : <ChevronRightIcon size={14} className="text-text-muted flex-shrink-0" />
                    }
                  </button>

                  {/* Expanded RO list */}
                  {isExpanded && (
                    <div className="bg-background border-t border-border">
                      {customerROs.length === 0 ? (
                        <div className="px-5 py-4 text-xs text-text-muted">No repair orders on record.</div>
                      ) : (
                        <div className="divide-y divide-border/60">
                          {customerROs.map(ro => (
                            <button
                              key={ro.id}
                              onClick={() => onOpenRO?.(ro)}
                              className="w-full flex items-center gap-3 pl-16 pr-5 py-3 hover:bg-border/30 transition-colors duration-100 text-left"
                            >
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-0.5">
                                  <span className="text-xs font-mono text-orange">{ro.id}</span>
                                  <StageBadge stage={ro.stage} />
                                </div>
                                <div className="text-xs text-text-muted truncate">{ro.vehicle}</div>
                                {ro.complaint && (
                                  <div className="text-2xs text-text-muted truncate mt-0.5">{ro.complaint}</div>
                                )}
                              </div>
                              <div className="text-right flex-shrink-0">
                                {ro.total > 0
                                  ? <div className="text-xs font-semibold text-text-primary tabular-nums">{formatCurrency(ro.total)}</div>
                                  : <div className="text-2xs text-text-muted">Pending</div>
                                }
                                <div className="text-2xs text-text-muted mt-0.5">{formatDate(ro.updated)}</div>
                              </div>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

function TechPartsTab({ techROs, shopId, updateRepairOrder }) {
  const { parts } = useData()
  const [invSearch, setInvSearch] = useState('')
  const [filter, setFilter] = useState('all')

  // Aggregate all parts orders across the tech's ROs
  const allOrders = techROs
    .flatMap(ro => (ro.partsRequests || []).map(req => ({ ...req, ro })))
    .sort((a, b) => new Date(b.requestedAt) - new Date(a.requestedAt))

  const filtered = filter === 'all' ? allOrders : allOrders.filter(o => o.status === filter)

  const counts = ['requested', 'ordered', 'shipped', 'arrived', 'ready'].reduce((acc, s) => {
    acc[s] = allOrders.filter(o => o.status === s).length
    return acc
  }, {})

  // Parts that need attention (arrived but not ready)
  const actionable = allOrders.filter(o => o.status === 'arrived').length

  const markReady = (req, ro) => {
    const updated = (ro.partsRequests || []).map(r => r.id === req.id ? { ...r, status: 'ready' } : r)
    updateRepairOrder(ro.id, { partsRequests: updated })
  }

  // Shop inventory
  const shopParts = parts.filter(p => p.shopId === shopId)
  const filteredInv = shopParts.filter(p => {
    const q = invSearch.toLowerCase()
    return !q || p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q) || p.category.toLowerCase().includes(q)
  })
  const lowStock = shopParts.filter(p => p.qty <= p.minQty)

  return (
    <div className="space-y-8">

      {/* ── Parts Orders ── */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-semibold text-text-primary">Parts Orders</h3>
          {actionable > 0 && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-status-yellow/10 text-status-yellow font-medium">
              {actionable} arrived — confirm receipt
            </span>
          )}
        </div>

        {/* Status filter pills */}
        {allOrders.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-4">
            <button
              onClick={() => setFilter('all')}
              className={cn('text-xs px-2.5 py-1 rounded-full font-medium border transition-colors', filter === 'all' ? 'border-orange bg-orange/10 text-orange' : 'border-border text-text-muted hover:border-orange/40')}
            >
              All ({allOrders.length})
            </button>
            {Object.entries(counts).map(([status, count]) => count > 0 && (
              <button
                key={status}
                onClick={() => setFilter(filter === status ? 'all' : status)}
                className={cn(
                  'text-xs px-2.5 py-1 rounded-full font-medium border transition-colors',
                  filter === status
                    ? `border-current ${PART_STATUS[status].color} ${PART_STATUS[status].bg}`
                    : 'border-border text-text-muted hover:border-orange/40'
                )}
              >
                {PART_STATUS[status].label} ({count})
              </button>
            ))}
          </div>
        )}

        {allOrders.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border py-14 text-center">
            <Truck size={20} className="text-text-muted mx-auto mb-2" />
            <p className="text-sm text-text-muted">No parts on order</p>
            <p className="text-xs text-text-muted mt-1">Parts you request from job cards will appear here</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border py-10 text-center">
            <p className="text-xs text-text-muted">No parts with that status</p>
          </div>
        ) : (
          <div className="bg-surface border border-border rounded-xl overflow-hidden">
            <div className="divide-y divide-border">
              {filtered.map((item, idx) => {
                const { ro, ...req } = item
                const cfg = PART_STATUS[req.status] || PART_STATUS.requested
                const trackUrl = getTrackingUrl(req.carrier, req.trackingNumber)
                return (
                  <div key={`${req.id}-${idx}`} className={cn('px-4 py-4', req.status === 'arrived' && 'bg-status-yellow/5')}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-sm font-medium text-text-primary">{req.name}</span>
                          {req.qty > 1 && <span className="text-xs text-text-muted">×{req.qty}</span>}
                          {req.partNumber && <span className="text-2xs text-text-muted font-mono">#{req.partNumber}</span>}
                        </div>
                        <div className="flex items-center gap-2 flex-wrap mb-1.5">
                          <span className="text-2xs font-mono text-orange">{ro.id}</span>
                          <span className="text-2xs text-text-muted">·</span>
                          <span className="text-2xs text-text-muted truncate">{ro.vehicle}</span>
                        </div>
                        {req.supplier && (
                          <div className="text-2xs text-text-muted">
                            {req.supplier}{req.eta && ` · ETA ${req.eta}`}
                          </div>
                        )}
                        {trackUrl ? (
                          <a
                            href={trackUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-2xs text-blue-400 hover:underline mt-1"
                          >
                            <ExternalLink size={9} />
                            Track with {req.carrier}
                          </a>
                        ) : req.trackingNumber ? (
                          <div className="text-2xs text-text-muted font-mono mt-1">
                            {req.carrier && `${req.carrier} · `}#{req.trackingNumber}
                          </div>
                        ) : null}
                      </div>

                      <div className="flex flex-col items-end gap-2 flex-shrink-0">
                        <span className={cn('text-2xs px-2 py-0.5 rounded-full font-medium', cfg.bg, cfg.color)}>
                          {cfg.label}
                        </span>
                        {req.status === 'arrived' && (
                          <button
                            onClick={() => markReady(req, ro)}
                            className="flex items-center gap-1 text-2xs px-2 py-0.5 rounded border border-status-green/30 text-status-green hover:bg-status-green/10 transition-colors font-medium"
                          >
                            <CheckCheck size={10} /> Got it
                          </button>
                        )}
                        {req.status === 'ready' && (
                          <span className="text-2xs text-status-green">In hand</span>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>

      {/* ── Shop Inventory ── */}
      <div>
        <h3 className="text-base font-semibold text-text-primary mb-4">Shop Inventory</h3>

        {lowStock.length > 0 && (
          <div className="flex items-center gap-2 p-3 rounded-lg bg-red-500/5 border border-red-500/20 mb-4">
            <AlertCircle size={14} className="text-red-500 flex-shrink-0" />
            <span className="text-xs text-red-500 font-medium">{lowStock.length} part{lowStock.length !== 1 ? 's' : ''} at or below minimum stock</span>
          </div>
        )}

        <div className="relative mb-4">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none" />
          <input
            value={invSearch}
            onChange={e => setInvSearch(e.target.value)}
            placeholder="Search inventory…"
            className="h-8 w-full rounded-md border border-border bg-surface pl-8 pr-3 text-xs text-text-primary placeholder:text-text-muted focus:outline-none focus:border-orange focus:ring-1 focus:ring-orange/30 transition-colors"
          />
        </div>

        <div className="bg-surface border border-border rounded-xl overflow-hidden">
          {filteredInv.length === 0 ? (
            <div className="py-12 text-center">
              <Package size={20} className="text-text-muted mx-auto mb-2" />
              <p className="text-sm text-text-muted">No parts found.</p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {filteredInv.map(p => {
                const isLow = p.qty <= p.minQty
                return (
                  <div key={p.id} className="flex items-center gap-3 px-5 py-3.5">
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-text-primary truncate">{p.name}</div>
                      <div className="text-xs text-text-muted">{p.sku} · {p.category}</div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <div className={cn('text-sm font-semibold tabular-nums', isLow ? 'text-red-500' : 'text-text-primary')}>
                        {p.qty} in stock
                      </div>
                      <div className="text-2xs text-text-muted">min {p.minQty}</div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ── pay tab ──────────────────────────────────────────────────────────────────

function PayTab({ techROs, tech, timeEntries, now }) {
  const RATE = 28.00
  const BOOK_RATE = 0.30

  const paidROs = techROs.filter(ro => ro.stage === 'Paid')
  const activeROs = techROs.filter(ro => !['Paid', 'Invoiced'].includes(ro.stage))

  const totalBookMin = paidROs.reduce((sum, ro) =>
    sum + (ro.services?.reduce((s, svc) => s + (svc.bookTimeMin || 0), 0) || 0), 0)
  const totalBookHrs = totalBookMin / 60

  const weekMs = computeHoursMs(timeEntries, tech?.id, startOfWeek())
  const todayMs = computeHoursMs(timeEntries, tech?.id, startOfToday())
  const clockedHrs = weekMs / 3600000
  const todayHrs = todayMs / 3600000

  const efficiency = clockedHrs > 0 ? Math.round((totalBookHrs / clockedHrs) * 100) : 0

  const hourlyEarnings = RATE * clockedHrs
  const bookBonus = totalBookHrs * BOOK_RATE * RATE
  const projectedPay = hourlyEarnings + bookBonus

  const totalLaborGenerated = paidROs.reduce((sum, ro) => sum + (ro.labor || 0), 0)

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between mb-1">
        <div>
          <h2 className="text-lg font-semibold text-text-primary">My Earnings</h2>
          <p className="text-xs text-text-muted">This pay period</p>
        </div>
        <div className="text-right">
          <div className="text-2xl font-semibold text-orange tabular-nums">{formatCurrency(projectedPay)}</div>
          <div className="text-xs text-text-muted">projected this week</div>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-surface border border-border rounded-lg px-4 py-3">
          <div className="text-xs text-text-muted uppercase tracking-wider mb-1">Hours Clocked</div>
          <div className="text-xl font-semibold text-text-primary tabular-nums">{clockedHrs.toFixed(1)}h</div>
          <div className="text-2xs text-text-muted">{todayHrs.toFixed(1)}h today</div>
        </div>
        <div className="bg-surface border border-border rounded-lg px-4 py-3">
          <div className="text-xs text-text-muted uppercase tracking-wider mb-1">Hours Flagged</div>
          <div className="text-xl font-semibold text-text-primary tabular-nums">{totalBookHrs.toFixed(1)}h</div>
          <div className="text-2xs text-text-muted">{totalBookMin} min book time</div>
        </div>
        <div className="bg-surface border border-border rounded-lg px-4 py-3">
          <div className="text-xs text-text-muted uppercase tracking-wider mb-1">Efficiency</div>
          <div className={cn('text-xl font-semibold tabular-nums', efficiency >= 100 ? 'text-status-green' : efficiency >= 80 ? 'text-status-yellow' : 'text-text-primary')}>
            {efficiency}%
          </div>
          <div className="text-2xs text-text-muted">flagged vs clocked</div>
        </div>
        <div className="bg-surface border border-border rounded-lg px-4 py-3">
          <div className="text-xs text-text-muted uppercase tracking-wider mb-1">Labor Generated</div>
          <div className="text-xl font-semibold text-text-primary tabular-nums">{formatCurrency(totalLaborGenerated)}</div>
          <div className="text-2xs text-text-muted">across {paidROs.length} jobs</div>
        </div>
      </div>

      {/* Earnings breakdown */}
      <div className="bg-surface border border-border rounded-xl p-5">
        <div className="text-sm font-semibold text-text-primary mb-4">Earnings Breakdown</div>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-md bg-blue-500/10 flex items-center justify-center">
                <Clock size={13} className="text-blue-400" />
              </div>
              <div>
                <div className="text-sm text-text-primary">Hourly ({clockedHrs.toFixed(1)}h x ${RATE.toFixed(2)})</div>
                <div className="text-2xs text-text-muted">Base pay for clocked hours</div>
              </div>
            </div>
            <div className="text-sm font-semibold text-text-primary tabular-nums">{formatCurrency(hourlyEarnings)}</div>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-md bg-status-green/10 flex items-center justify-center">
                <TrendingUp size={13} className="text-status-green" />
              </div>
              <div>
                <div className="text-sm text-text-primary">Book time bonus ({totalBookHrs.toFixed(1)}h flagged)</div>
                <div className="text-2xs text-text-muted">{(BOOK_RATE * 100).toFixed(0)}% of hourly rate per flagged hour</div>
              </div>
            </div>
            <div className="text-sm font-semibold text-status-green tabular-nums">+{formatCurrency(bookBonus)}</div>
          </div>
          <div className="pt-3 mt-3 border-t border-border flex items-center justify-between">
            <div className="text-sm font-semibold text-text-primary">Projected Total</div>
            <div className="text-lg font-semibold text-orange tabular-nums">{formatCurrency(projectedPay)}</div>
          </div>
        </div>
      </div>

      {/* Completed jobs */}
      <div className="bg-surface border border-border rounded-xl overflow-hidden">
        <div className="px-5 py-3.5 border-b border-border">
          <div className="text-sm font-semibold text-text-primary">Completed Jobs This Period</div>
        </div>
        {paidROs.length === 0 ? (
          <div className="py-12 text-center">
            <DollarSign size={20} className="text-text-muted mx-auto mb-2" />
            <p className="text-sm text-text-muted">No completed jobs yet this period</p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {paidROs.map(ro => {
              const bookMin = ro.services?.reduce((s, svc) => s + (svc.bookTimeMin || 0), 0) || 0
              const bookHrs = bookMin / 60
              return (
                <div key={ro.id} className="flex items-center gap-3 px-5 py-3.5">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-xs font-mono text-orange">{ro.id}</span>
                      <span className="text-2xs px-1.5 py-0.5 rounded bg-status-green/10 text-status-green font-medium">Paid</span>
                    </div>
                    <div className="text-xs text-text-muted truncate">{ro.vehicle} · {ro.customerName}</div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <div className="text-xs font-semibold text-text-primary tabular-nums">{formatCurrency(ro.labor || 0)} labor</div>
                    <div className="text-2xs text-text-muted">{bookHrs.toFixed(1)}h flagged</div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Active jobs in progress */}
      {activeROs.length > 0 && (
        <div className="bg-surface border border-border rounded-xl overflow-hidden">
          <div className="px-5 py-3.5 border-b border-border">
            <div className="text-sm font-semibold text-text-primary">In Progress (not yet paid)</div>
          </div>
          <div className="divide-y divide-border">
            {activeROs.map(ro => {
              const bookMin = ro.services?.reduce((s, svc) => s + (svc.bookTimeMin || 0), 0) || 0
              return (
                <div key={ro.id} className="flex items-center gap-3 px-5 py-3.5">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-xs font-mono text-orange">{ro.id}</span>
                      <span className="text-2xs text-text-muted">{ro.stage}</span>
                    </div>
                    <div className="text-xs text-text-muted truncate">{ro.vehicle}</div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <div className="text-xs text-text-muted tabular-nums">{bookMin}min book</div>
                    <div className="text-2xs text-text-muted">{formatCurrency(ro.labor || 0)} labor</div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

// ── inspection quick-start modal ─────────────────────────────────────────────

function QuickInspectionModal({ ro, onClose }) {
  const [items, setItems] = useState([
    { category: 'Tires', label: 'Front Left', condition: null, note: '' },
    { category: 'Tires', label: 'Front Right', condition: null, note: '' },
    { category: 'Tires', label: 'Rear Left', condition: null, note: '' },
    { category: 'Tires', label: 'Rear Right', condition: null, note: '' },
    { category: 'Brakes', label: 'Front Pads', condition: null, note: '' },
    { category: 'Brakes', label: 'Rear Pads', condition: null, note: '' },
    { category: 'Brakes', label: 'Rotors', condition: null, note: '' },
    { category: 'Fluids', label: 'Engine Oil', condition: null, note: '' },
    { category: 'Fluids', label: 'Coolant', condition: null, note: '' },
    { category: 'Fluids', label: 'Brake Fluid', condition: null, note: '' },
    { category: 'Battery', label: 'Battery', condition: null, note: '' },
    { category: 'Filters', label: 'Engine Air Filter', condition: null, note: '' },
    { category: 'Filters', label: 'Cabin Air Filter', condition: null, note: '' },
    { category: 'Exterior', label: 'Lights', condition: null, note: '' },
    { category: 'Exterior', label: 'Wiper Blades', condition: null, note: '' },
  ])

  if (!ro) return null

  const setCondition = (idx, cond) => {
    setItems(prev => prev.map((item, i) => i === idx ? { ...item, condition: item.condition === cond ? null : cond } : item))
  }

  const completed = items.filter(i => i.condition !== null).length
  const categories = [...new Set(items.map(i => i.category))]

  const COND_COLORS = {
    green: 'bg-status-green text-white',
    yellow: 'bg-status-yellow text-white',
    red: 'bg-status-red text-white',
  }
  const COND_OUTLINE = {
    green: 'border-status-green/30 text-status-green hover:bg-status-green/10',
    yellow: 'border-status-yellow/30 text-status-yellow hover:bg-status-yellow/10',
    red: 'border-status-red/30 text-status-red hover:bg-status-red/10',
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div
        onClick={e => e.stopPropagation()}
        className="relative w-full sm:max-w-lg bg-surface border border-border shadow-2xl rounded-t-2xl sm:rounded-xl flex flex-col max-h-[92dvh] sm:max-h-[85vh] animate-slide-in"
      >
        <div className="sm:hidden flex justify-center pt-3 pb-1 flex-shrink-0">
          <div className="w-10 h-1 rounded-full bg-border" />
        </div>
        <div className="flex items-start justify-between px-5 py-4 border-b border-border flex-shrink-0">
          <div>
            <h2 className="text-base font-semibold text-text-primary">Quick Inspection</h2>
            <p className="text-xs text-text-muted mt-0.5">{ro.vehicle} · {ro.id}</p>
          </div>
          <div className="text-right">
            <div className="text-xs text-text-muted">{completed}/{items.length} checked</div>
            <div className="w-20 h-1.5 rounded-full bg-border mt-1 overflow-hidden">
              <div className="h-full rounded-full bg-orange transition-all" style={{ width: `${(completed / items.length) * 100}%` }} />
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          {categories.map(cat => (
            <div key={cat}>
              <div className="text-2xs font-semibold text-text-muted uppercase tracking-wider mb-2">{cat}</div>
              <div className="space-y-2">
                {items.map((item, idx) => {
                  if (item.category !== cat) return null
                  return (
                    <div key={idx} className="flex items-center gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="text-sm text-text-primary">{item.label}</div>
                      </div>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        {(['green', 'yellow', 'red']).map(c => (
                          <button
                            key={c}
                            onClick={() => setCondition(idx, c)}
                            className={cn(
                              'w-7 h-7 rounded-md border text-2xs font-bold flex items-center justify-center transition-all',
                              item.condition === c ? COND_COLORS[c] : COND_OUTLINE[c]
                            )}
                          >
                            {c === 'green' ? '✓' : c === 'yellow' ? '!' : '✗'}
                          </button>
                        ))}
                        <button className="w-7 h-7 rounded-md border border-border text-text-muted hover:text-orange hover:border-orange/40 flex items-center justify-center transition-colors">
                          <Camera size={11} />
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>

        <div className="px-5 py-4 border-t border-border flex items-center justify-between flex-shrink-0">
          <button onClick={onClose} className="h-9 px-4 rounded-lg border border-border text-sm text-text-muted hover:text-text-primary transition-colors">
            Cancel
          </button>
          <button className="h-9 px-5 rounded-lg bg-orange text-white text-sm font-semibold hover:bg-orange/90 transition-colors">
            Save Inspection
          </button>
        </div>
      </div>
    </div>
  )
}

// ── main ──────────────────────────────────────────────────────────────────────

export default function TechBoard() {
  const { session, logout } = useAuth()
  const { technicians, repairOrders, updateRepairOrder, clockedInTechs, clockIn, clockOut, timeEntries, jobTimers, startJobTimer, stopJobTimer } = useData()
  const navigate = useNavigate()

  const [activeTab, setActiveTab] = useState(
    () => localStorage.getItem('sc_tech_tab') || 'dashboard'
  )

  const switchTab = (id) => {
    setActiveTab(id)
    localStorage.setItem('sc_tech_tab', id)
  }
  const [startTimes, setStartTimes] = useState(() => {
    try { return JSON.parse(localStorage.getItem('sc_start_times') || '{}') } catch { return {} }
  })
  const [now, setNow] = useState(Date.now())
  const [selectedRO, setSelectedRO] = useState(null)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [clockError, setClockError]   = useState(null)
  const [photoCount, setPhotoCount] = useState({})
  const [inspectRO, setInspectRO] = useState(null)

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(interval)
  }, [])

  const clockedIn = session?.techId ? clockedInTechs.has(session.techId) : false

  const tech = technicians.find(t => t.id === session?.techId)
  const shop = shops.find(s => s.id === tech?.shopId)

  const techROs = repairOrders
    .filter(ro => ro.techId === session?.techId)
    .sort((a, b) => new Date(b.updated) - new Date(a.updated))

  const getStatus = (ro) => deriveStatus(ro)
  const activeCount = techROs.filter(ro => getStatus(ro) === 'active').length

  const handleStart = (ro) => {
    updateRepairOrder(ro.id, { stage: 'In Progress' })
    const next = { ...startTimes, [ro.id]: Date.now() }
    setStartTimes(next)
    try { localStorage.setItem('sc_start_times', JSON.stringify(next)) } catch {}
  }
  const handleResume = (ro) => updateRepairOrder(ro.id, { stage: 'In Progress' })
  const handleDone = (ro) => updateRepairOrder(ro.id, { stage: 'Complete' })
  const handleToggleClock = () => {
    if (clockedIn) {
      clockOut(session.techId)
      setClockError(null)
    } else {
      const result = clockIn(session.techId)
      if (result?.error) setClockError(result.error)
      else setClockError(null)
    }
  }
  const handleLogout = () => { logout(); navigate('/login') }

  const initials = tech?.name.split(' ').map(n => n[0]).join('') ?? '?'

  // Parts badge: count arrived orders that tech hasn't confirmed yet
  const arrivedPartsCount = techROs
    .flatMap(ro => ro.partsRequests || [])
    .filter(r => r.status === 'arrived').length

  const tabs = [
    { id: 'dashboard', label: 'My Store',   icon: LayoutDashboard },
    { id: 'jobs',      label: 'My Jobs',    icon: Briefcase, badge: activeCount },
    { id: 'pay',       label: 'My Pay',     icon: DollarSign },
    { id: 'customers', label: 'Customers',  icon: Users },
    { id: 'parts',     label: 'Parts',      icon: Package, badge: arrivedPartsCount },
  ]

  return (
    <div className="min-h-screen bg-background flex flex-col">

      {/* Top header */}
      <header className="h-14 bg-surface border-b border-border flex items-center px-4 gap-4 flex-shrink-0 z-20">
        {/* Mobile menu toggle */}
        <button
          onClick={() => setSidebarOpen(v => !v)}
          className="lg:hidden w-8 h-8 rounded-md flex items-center justify-center text-text-muted hover:text-text-primary hover:bg-border transition-colors"
        >
          <svg width="14" height="12" viewBox="0 0 14 12" fill="none">
            <rect width="14" height="1.5" rx="0.75" fill="currentColor"/>
            <rect y="5.25" width="10" height="1.5" rx="0.75" fill="currentColor"/>
            <rect y="10.5" width="14" height="1.5" rx="0.75" fill="currentColor"/>
          </svg>
        </button>

        <div className="flex items-center gap-2">
          <HexMark size={24} />
          <span className="text-base font-semibold text-text-primary" style={{ letterSpacing: '-0.02em' }}>
            Shop<span className="text-orange">Command</span>
          </span>
          <span className="text-xs text-text-muted hidden sm:inline ml-1">· Tech Board</span>
        </div>

        <div className="flex-1" />

        {/* Clock in/out */}
        <div className="flex flex-col items-end">
          <button
            onClick={handleToggleClock}
            title={clockError || undefined}
            className={cn(
              'h-8 px-3 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-all duration-150',
              clockedIn
                ? 'bg-status-green/10 text-status-green hover:bg-status-green/20'
                : clockError
                  ? 'bg-status-red/10 text-status-red hover:bg-status-red/20'
                  : 'bg-border text-text-muted hover:text-text-primary'
            )}
          >
            <div className={cn('w-1.5 h-1.5 rounded-full', clockedIn ? 'bg-status-green' : clockError ? 'bg-status-red' : 'bg-text-muted')} />
            {clockedIn ? 'Clocked In' : 'Clocked Out'}
          </button>
        </div>

        <button
          onClick={handleLogout}
          className="h-8 w-8 rounded-md flex items-center justify-center text-text-muted hover:text-text-primary hover:bg-border transition-colors duration-150"
          title="Sign out"
        >
          <LogOut size={14} />
        </button>
      </header>

      <div className="flex flex-1 overflow-hidden">

        {/* Sidebar */}
        {sidebarOpen && (
          <div className="fixed inset-0 z-30 bg-black/60 lg:hidden" onClick={() => setSidebarOpen(false)} />
        )}
        <aside className={cn(
          'w-56 bg-surface border-r border-border flex flex-col flex-shrink-0',
          'fixed top-14 bottom-0 left-0 z-40 transition-transform duration-300',
          'lg:static lg:translate-x-0 lg:z-auto',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        )}>
          {/* Tech identity */}
          <div className="px-4 py-4 border-b border-border">
            <div className="flex items-center gap-2.5 mb-3">
              <div className="w-9 h-9 rounded-full bg-orange/10 flex items-center justify-center flex-shrink-0">
                <span className="text-sm font-semibold text-orange">{initials}</span>
              </div>
              <div className="min-w-0">
                <div className="text-sm font-medium text-text-primary truncate">{tech?.name}</div>
                <div className="text-2xs text-text-muted">{tech?.specialty}</div>
              </div>
            </div>
            {/* Hours this week */}
            {(() => {
              const todayMs   = computeHoursMs(timeEntries, session?.techId, startOfToday())
              const weekMs    = computeHoursMs(timeEntries, session?.techId, startOfWeek())
              const openEntry = timeEntries.filter(e => e.techId === session?.techId && !e.clockOutAt).at(-1)
              const sinceStr  = openEntry
                ? new Date(openEntry.clockInAt).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
                : null
              return (
                <div className="space-y-1">
                  {sinceStr && (
                    <div className="flex items-center gap-1.5 text-2xs text-status-green">
                      <div className="w-1.5 h-1.5 rounded-full bg-status-green animate-pulse flex-shrink-0" />
                      Since {sinceStr}
                    </div>
                  )}
                  <div className="grid grid-cols-2 gap-1.5">
                    <div className="rounded-md bg-background px-2 py-1.5 text-center">
                      <div className="text-xs font-semibold tabular-nums text-text-primary">{formatHours(todayMs)}</div>
                      <div className="text-2xs text-text-muted">Today</div>
                    </div>
                    <div className="rounded-md bg-background px-2 py-1.5 text-center">
                      <div className="text-xs font-semibold tabular-nums text-text-primary">{formatHours(weekMs)}</div>
                      <div className="text-2xs text-text-muted">This week</div>
                    </div>
                  </div>
                </div>
              )
            })()}
          </div>

          {/* Nav */}
          <nav className="flex-1 px-3 py-3 space-y-0.5">
            {tabs.map(tab => (
              <NavItem
                key={tab.id}
                icon={tab.icon}
                label={tab.label}
                active={activeTab === tab.id}
                onClick={() => { switchTab(tab.id); setSidebarOpen(false) }}
                badge={tab.badge}
              />
            ))}
          </nav>
        </aside>

        {/* Main content */}
        <main className="flex-1 overflow-y-auto">
            <div className="p-4 sm:p-5 lg:p-6">

              {/* Clocked-out banner */}
              {!clockedIn && (
                <div className="flex items-center gap-3 p-3 rounded-lg bg-status-yellow/5 border border-status-yellow/20 mb-5">
                  <Clock size={15} className="text-status-yellow flex-shrink-0" />
                  <span className="text-sm text-text-secondary flex-1">You're clocked out — clock in to start or move jobs.</span>
                  <button onClick={handleToggleClock} className="h-7 px-3 rounded-md bg-orange text-white text-xs font-semibold hover:bg-orange/90 transition-colors flex-shrink-0">
                    Clock In
                  </button>
                  {clockError && <span className="text-2xs text-status-red flex-shrink-0">{clockError}</span>}
                </div>
              )}
              {activeTab === 'jobs' && (() => {
                const paidROs    = techROs.filter(ro => ro.stage === 'Paid')
                const totalRev   = paidROs.reduce((s, ro) => s + (ro.total || 0), 0)
                const avgTicket  = paidROs.length > 0 ? Math.round(totalRev / paidROs.length) : 0
                const queuedCnt  = techROs.filter(ro => deriveStatus(ro) === 'queued').length
                const waitingCnt = techROs.filter(ro => deriveStatus(ro) === 'waiting').length
                const activeCnt  = techROs.filter(ro => deriveStatus(ro) === 'active').length
                const doneCnt    = techROs.filter(ro => deriveStatus(ro) === 'done').length
                return (
                <>
                  {/* Header */}
                  <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
                    <div>
                      <div className="flex items-center gap-2.5 mb-0.5">
                        <h2 className="text-lg font-semibold text-text-primary">My Jobs</h2>
                      </div>
                      <p className="text-xs text-text-muted">{shop?.name}</p>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-semibold text-orange tabular-nums">{formatCurrency(totalRev)}</div>
                      <div className="text-xs text-text-muted">Revenue generated</div>
                    </div>
                  </div>

                  {/* Stats grid */}
                  <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mb-6">
                    {[
                      { label: 'Up Next',       value: queuedCnt,                accent: false },
                      { label: 'Waiting Parts', value: waitingCnt,               accent: false },
                      { label: 'Active',        value: activeCnt,                accent: true  },
                      { label: 'Done Today',    value: doneCnt,                  accent: false },
                      { label: 'Avg Ticket',    value: formatCurrency(avgTicket), accent: false },
                    ].map(s => (
                      <div key={s.label} className="bg-surface border border-border rounded-lg px-4 py-3">
                        <div className="text-xs text-text-muted uppercase tracking-wider mb-1">{s.label}</div>
                        <div className={cn('text-xl font-semibold tabular-nums', s.accent ? 'text-orange' : 'text-text-primary')}>
                          {s.value}
                        </div>
                      </div>
                    ))}
                  </div>

                  <JobsTab
                    techROs={techROs}
                    startTimes={startTimes}
                    now={now}
                    onStart={handleStart}
                    onDone={handleDone}
                    onResume={handleResume}
                    onOpen={setSelectedRO}
                    jobTimers={jobTimers}
                    startJobTimer={startJobTimer}
                    stopJobTimer={stopJobTimer}
                    photoCount={photoCount}
                    onPhoto={(ro) => setPhotoCount(prev => ({ ...prev, [ro.id]: (prev[ro.id] || 0) + 1 }))}
                    onInspect={(ro) => setInspectRO(ro)}
                    clockedIn={clockedIn}
                    onRequestPart={(ro, draft) => {
                      const req = {
                        id: crypto.randomUUID(),
                        name: draft.name.trim(),
                        partNumber: draft.partNumber.trim(),
                        qty: draft.qty,
                        requestedAt: new Date().toISOString(),
                        requestedBy: tech.name,
                        status: 'requested',
                        supplier: '', eta: '',
                      }
                      updateRepairOrder(ro.id, {
                        partsRequests: [...(ro.partsRequests || []), req],
                      })
                    }}
                  />
                </>
                )
              })()}

              {activeTab === 'dashboard' && (
                <>
                  <h2 className="text-lg font-semibold text-text-primary mb-5">My Store</h2>
                  <StoreDashboard shop={shop} repairOrders={repairOrders} />
                </>
              )}

              {activeTab === 'customers' && (
                <>
                  <h2 className="text-lg font-semibold text-text-primary mb-5">Customers</h2>
                  <StoreCustomers shopId={tech?.shopId} repairOrders={repairOrders} onOpenRO={setSelectedRO} />
                </>
              )}

              {activeTab === 'parts' && (
                <>
                  <h2 className="text-lg font-semibold text-text-primary mb-5">Parts</h2>
                  <TechPartsTab techROs={techROs} shopId={tech?.shopId} updateRepairOrder={updateRepairOrder} />
                </>
              )}

              {activeTab === 'pay' && (
                <PayTab techROs={techROs} tech={tech} timeEntries={timeEntries} now={now} />
              )}
            </div>
        </main>
      </div>

      {inspectRO && (
        <QuickInspectionModal ro={inspectRO} onClose={() => setInspectRO(null)} />
      )}

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
