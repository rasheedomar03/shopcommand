import { useState, useEffect, useMemo } from 'react'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'
import { DollarSign, ClipboardList, Users, TrendingUp, Plus, ChevronRight, AlertTriangle, Info, CheckCircle2, X } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { StatCard } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { StageBadge } from '@/components/ui/Badge'
import { NewROModal } from '@/components/modals/NewROModal'
import { RODetailModal } from '@/components/modals/RODetailModal'
import { useData } from '@/contexts/DataContext'
import { formatCurrency } from '@/lib/utils'
import { useTheme } from '@/contexts/ThemeContext'
import { Tooltip as AppTooltip } from '@/components/ui/Tooltip'
import { cn } from '@/lib/utils'

const REVENUE_STAGES = new Set(['Paid', 'Invoiced', 'Complete'])

function getWeekStart() {
  const d = new Date()
  const day = d.getDay()
  d.setDate(d.getDate() + (day === 0 ? -6 : 1 - day))
  return d.toISOString().slice(0, 10)
}
const STAGE_COLORS = { Estimate: '#3B82F6', Approved: '#A855F7', 'In Progress': '#F97316', Complete: '#22C55E', Invoiced: '#EAB308', Paid: '#10B981', Warranty: '#EC4899' }

function computeStats(repairOrders, shops, shopId = null) {
  const ros = shopId ? repairOrders.filter(ro => ro.shopId === shopId) : repairOrders
  const today   = new Date().toISOString().slice(0, 10)
  const month   = today.slice(0, 7)

  const revToday = ros
    .filter(ro => REVENUE_STAGES.has(ro.stage) && (ro.updated || '').slice(0, 10) === today)
    .reduce((s, ro) => s + (ro.total || 0), 0)

  const revMTD = ros
    .filter(ro => REVENUE_STAGES.has(ro.stage) && (ro.updated || '').slice(0, 7) === month)
    .reduce((s, ro) => s + (ro.total || 0), 0)

  const openROs = ros.filter(ro => !REVENUE_STAGES.has(ro.stage)).length

  const avgEff = shops.length
    ? Math.round(shops.reduce((s, sh) => s + (sh.efficiency || 0), 0) / shops.length)
    : 0

  return { revToday, revMTD, openROs, avgEff }
}

function buildRevenueChart(repairOrders, shops) {
  const today = new Date()
  const PAID_STAGES = new Set(['Paid', 'Invoiced', 'Complete'])
  const totalMonthlyTarget = shops.reduce((s, sh) => s + (sh.monthlyTarget || 0), 0)
  const dailyTarget = Math.round(totalMonthlyTarget / 30)

  return Array.from({ length: 11 }, (_, i) => {
    const d = new Date(today)
    d.setDate(d.getDate() - (10 - i))
    const label = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    const ymd = d.toISOString().slice(0, 10)

    const revenue = repairOrders
      .filter(ro =>
        PAID_STAGES.has(ro.stage) &&
        ro.total > 0 &&
        (ro.updated || '').slice(0, 10) === ymd
      )
      .reduce((sum, ro) => sum + (ro.total || 0), 0)

    return { date: label, revenue, target: dailyTarget }
  })
}

function dynamicDate() {
  return new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })
}

const ALERT_CONFIG = {
  warning: { icon: AlertTriangle, color: 'text-status-yellow', bg: 'bg-status-yellow/5 border-status-yellow/20' },
  error:   { icon: AlertTriangle, color: 'text-status-red',    bg: 'bg-status-red/5 border-status-red/20' },
  info:    { icon: Info,          color: 'text-status-blue',   bg: 'bg-status-blue/5 border-status-blue/20' },
  success: { icon: CheckCircle2,  color: 'text-status-green',  bg: 'bg-status-green/5 border-status-green/20' },
}

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-surface border border-border rounded-lg px-3 py-2 shadow-xl">
      <div className="text-xs text-text-muted mb-1">{label}</div>
      <div className="text-sm font-semibold text-orange">{formatCurrency(payload[0]?.value)}</div>
      {payload[1] && <div className="text-xs text-text-muted">Target: {formatCurrency(payload[1]?.value)}</div>}
    </div>
  )
}

export default function Dashboard() {
  const { repairOrders, clockedInTechs, parts, shops, loading } = useData()
  const [newROOpen, setNewROOpen] = useState(false)
  const [selectedRO, setSelectedRO] = useState(null)
  const [dismissedAlerts, setDismissedAlerts] = useState(new Set())
  const [showAllAlerts, setShowAllAlerts] = useState(false)
  const navigate = useNavigate()
  const { session } = useAuth()
  const isAdvisor = session?.role === 'advisor'
  const advisorShop = isAdvisor ? shops.find(s => s.id === session.shopId) || shops[0] : null
  const { theme } = useTheme()

  const revenueData = buildRevenueChart(repairOrders, shops)
  const { revToday, revMTD, openROs, avgEff } = computeStats(repairOrders, shops, isAdvisor ? session?.shopId : null)
  const activeTechs = clockedInTechs.size || shops.reduce((s, sh) => s + (sh.activeTechs || 0), 0)
  const gridColor = theme === 'dark' ? '#1E2028' : '#E2E8F0'
  const tickColor = theme === 'dark' ? '#64748B' : '#94A3B8'
  const targetStroke = theme === 'dark' ? '#2A2D3A' : '#CBD5E1'

  const weekStart = useMemo(() => getWeekStart(), [])
  const month = new Date().toISOString().slice(0, 7)

  const mtdByShop = useMemo(() => {
    const result = {}
    shops.forEach(shop => {
      result[shop.id] = repairOrders
        .filter(ro => REVENUE_STAGES.has(ro.stage) && ro.shopId === shop.id && (ro.updated || '').slice(0, 7) === month)
        .reduce((s, ro) => s + (ro.total || 0), 0)
    })
    return result
  }, [repairOrders, shops, month])

  const weekByShop = useMemo(() => {
    const result = {}
    shops.forEach(shop => {
      result[shop.id] = repairOrders
        .filter(ro => REVENUE_STAGES.has(ro.stage) && ro.shopId === shop.id && (ro.updated || '').slice(0, 10) >= weekStart)
        .reduce((s, ro) => s + (ro.total || 0), 0)
    })
    return result
  }, [repairOrders, shops, weekStart])

  const [lastWeekByShop] = useState(() => {
    try {
      const curr = JSON.parse(localStorage.getItem('sc_week_revenue') || 'null')
      const ws = getWeekStart()
      if (curr && curr.weekStart !== ws) {
        localStorage.setItem('sc_last_week_revenue', JSON.stringify(curr))
        return curr.byShop || {}
      }
      return JSON.parse(localStorage.getItem('sc_last_week_revenue') || 'null')?.byShop || {}
    } catch { return {} }
  })

  useEffect(() => {
    try {
      localStorage.setItem('sc_week_revenue', JSON.stringify({ weekStart, byShop: weekByShop }))
    } catch {}
  }, [weekByShop, weekStart])

  const scopedROs = isAdvisor ? repairOrders.filter(ro => ro.shopId === session?.shopId) : repairOrders
  const stageBreakdown = Object.entries(
    scopedROs.reduce((acc, ro) => { acc[ro.stage] = (acc[ro.stage] || 0) + 1; return acc }, {})
  ).map(([name, value]) => ({ name, value, fill: STAGE_COLORS[name] ?? '#64748B' }))

  const activeROs = repairOrders
    .filter(ro => !REVENUE_STAGES.has(ro.stage) && (!isAdvisor || ro.shopId === session?.shopId))
    .slice(0, 5)
  // Parts order tracking
  const allPartsOrders = scopedROs
    .flatMap(ro => (ro.partsRequests || []).map(req => ({ ...req, ro })))
  const activePartsOrders = allPartsOrders.filter(o => !['arrived', 'returned', 'credited'].includes(o.status))
  const overduePartsOrders = allPartsOrders.filter(o => {
    if (o.status !== 'ordered' && o.status !== 'shipped') return false
    const diff = (Date.now() - new Date(o.requestedAt).getTime()) / (1000 * 60 * 60 * 24)
    return diff >= 3
  })

  // Declined work: services customers said no to — money that walked out the door
  const THIRTY_DAYS = 30 * 24 * 60 * 60 * 1000
  const declinedWork = scopedROs.flatMap(ro =>
    (ro.declinedServices || [])
      .filter(s => {
        const when = s.declinedAt || ro.updated || ro.created
        return when && (Date.now() - new Date(when).getTime()) <= THIRTY_DAYS
      })
      .map(s => ({ ...s, ro }))
  )
  const declinedTotal = declinedWork.reduce((sum, s) => sum + (s.price || 0), 0)
  const declinedVehicles = new Set(declinedWork.map(s => s.ro.id)).size

  const scopedParts = isAdvisor ? parts.filter(p => p.shopId === session?.shopId) : parts
  const partsAlerts = overduePartsOrders.map(o => ({
    id: `parts-order-${o.id}`,
    type: 'warning',
    shopId: o.ro?.shopId,
    shopName: shops.find(s => s.id === o.ro?.shopId)?.name || '',
    message: `${o.name} for ${o.ro?.vehicle || 'unknown vehicle'} (${o.ro?.customerName}) has been ${o.status} for ${Math.floor((Date.now() - new Date(o.requestedAt).getTime()) / (1000 * 60 * 60 * 24))} days`,
    time: 'overdue',
    read: false,
  }))
  const liveAlerts = [...partsAlerts, ...scopedParts
    .filter(p => p.qty <= p.minQty)
    .map(p => {
      const shop = shops.find(s => s.id === p.shopId)
      return {
        id: `parts-${p.id}`,
        type: p.qty === 0 ? 'error' : 'warning',
        shopId: p.shopId,
        shopName: shop?.name || '',
        message: p.qty === 0
          ? `${p.name} is out of stock at ${shop?.name}`
          : `${p.name} is low — ${p.qty} left (min ${p.minQty}) at ${shop?.name}`,
        time: 'now',
        read: false,
      }
    })]
  const allVisibleAlerts = liveAlerts.filter(a => !dismissedAlerts.has(a.id))
  const ALERT_PREVIEW = 3
  const visibleAlerts = showAllAlerts ? allVisibleAlerts : allVisibleAlerts.slice(0, ALERT_PREVIEW)
  const hiddenAlertCount = allVisibleAlerts.length - ALERT_PREVIEW

  return (
    <div className="p-5 lg:p-6 space-y-6 animate-fade-in">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-text-primary">Dashboard</h1>
          <p className="text-xs text-text-muted mt-0.5">{dynamicDate()}{isAdvisor ? ` · ${advisorShop?.name}` : shops.length > 0 ? ` · ${shops.length === 1 ? '1 location' : `All ${shops.length} locations`}` : ''}</p>
        </div>
        <Button onClick={() => setNewROOpen(true)}>
          <Plus size={15} />
          New RO
        </Button>
      </div>

      {/* Notifications strip */}
      {allVisibleAlerts.length > 0 && (
        <div className="space-y-2">
          {visibleAlerts.map(alert => {
            const cfg = ALERT_CONFIG[alert.type] || ALERT_CONFIG.info
            const AlertIcon = cfg.icon
            return (
              <div key={alert.id} className={cn('flex items-start gap-3 px-4 py-3 rounded-lg border', cfg.bg)}>
                <AlertIcon size={14} className={cn('flex-shrink-0 mt-0.5', cfg.color)} />
                <div className="flex-1 min-w-0">
                  <span className="text-xs font-medium text-text-primary">{alert.shopName}</span>
                  <span className="text-xs text-text-muted ml-2">{alert.message}</span>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                  <span className="text-2xs text-text-muted">{alert.time}</span>
                  <button
                    onClick={() => setDismissedAlerts(s => new Set([...s, alert.id]))}
                    className="p-3.5 -m-3.5 rounded-md text-text-muted hover:text-text-primary transition-colors"
                    aria-label="Dismiss notification"
                  >
                    <X size={12} />
                  </button>
                </div>
              </div>
            )
          })}
          {!showAllAlerts && hiddenAlertCount > 0 && (
            <button
              onClick={() => setShowAllAlerts(true)}
              className="w-full h-8 rounded-lg border border-border bg-surface text-xs font-medium text-text-muted hover:text-text-primary hover:border-border-hover transition-colors"
            >
              +{hiddenAlertCount} more notification{hiddenAlertCount !== 1 ? 's' : ''}
            </button>
          )}
          {showAllAlerts && allVisibleAlerts.length > ALERT_PREVIEW && (
            <button
              onClick={() => setShowAllAlerts(false)}
              className="w-full h-8 rounded-lg border border-border bg-surface text-xs font-medium text-text-muted hover:text-text-primary hover:border-border-hover transition-colors"
            >
              Show less
            </button>
          )}
        </div>
      )}

      {/* Parts tracking summary */}
      {activePartsOrders.length > 0 && (
        <button
          onClick={() => navigate('/parts')}
          className="w-full flex items-center gap-4 px-4 py-3 rounded-lg border border-border bg-surface hover:border-orange/40 transition-colors text-left"
        >
          <div className="w-8 h-8 rounded-lg bg-orange/10 flex items-center justify-center flex-shrink-0">
            <TrendingUp size={15} className="text-orange" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-xs font-medium text-text-primary">
              {activePartsOrders.length} part{activePartsOrders.length !== 1 ? 's' : ''} on order
              {overduePartsOrders.length > 0 && (
                <span className="text-status-red ml-2">· {overduePartsOrders.length} overdue</span>
              )}
            </div>
            <div className="text-2xs text-text-muted mt-0.5">
              {allPartsOrders.filter(o => o.status === 'ordered').length} ordered · {allPartsOrders.filter(o => o.status === 'shipped').length} in transit · {allPartsOrders.filter(o => o.status === 'arrived').length} arrived
            </div>
          </div>
          <ChevronRight size={14} className="text-text-muted flex-shrink-0" />
        </button>
      )}

      {/* Declined work — revenue that walked out the door */}
      {declinedTotal > 0 && (
        <button
          onClick={() => navigate('/customers')}
          className="w-full flex items-center gap-4 px-4 py-3 rounded-lg border border-status-red/25 bg-status-red/5 hover:border-status-red/50 transition-colors text-left"
        >
          <div className="w-8 h-8 rounded-lg bg-status-red/10 flex items-center justify-center flex-shrink-0">
            <DollarSign size={15} className="text-status-red" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-xs font-medium text-text-primary">
              {formatCurrency(declinedTotal)} in declined work
              <span className="text-text-muted font-normal ml-2">last 30 days</span>
            </div>
            <div className="text-2xs text-text-muted mt-0.5">
              {declinedWork.length} service{declinedWork.length !== 1 ? 's' : ''} declined across {declinedVehicles} vehicle{declinedVehicles !== 1 ? 's' : ''} — follow up before they book elsewhere
            </div>
          </div>
          <ChevronRight size={14} className="text-text-muted flex-shrink-0" />
        </button>
      )}

      {/* Stats */}
      {isAdvisor ? (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <AppTooltip content="Total from Paid, Invoiced, and Complete ROs updated today" side="bottom">
            <div>
              <StatCard
                label="Revenue Today"
                value={formatCurrency(revToday)}
                sub={`MTD: ${formatCurrency(revMTD)}`}
                icon={DollarSign}
                loading={loading}
              />
            </div>
          </AppTooltip>
          <AppTooltip content="Repair orders not yet in Paid, Invoiced, or Complete stage" side="bottom">
            <div>
              <StatCard
                label="Open ROs"
                value={openROs}
                sub={advisorShop?.name || 'Your shop'}
                icon={ClipboardList}
                loading={loading}
              />
            </div>
          </AppTooltip>
          <AppTooltip content="Technicians currently clocked in at your shop" side="bottom">
            <div>
              <StatCard
                label="Active Techs"
                value={activeTechs}
                sub="Clocked in now"
                icon={Users}
                loading={loading}
              />
            </div>
          </AppTooltip>
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <AppTooltip content="Total from Paid, Invoiced, and Complete ROs updated today" side="bottom">
            <div>
              <StatCard
                label="Revenue Today"
                value={formatCurrency(revToday)}
                sub={`MTD: ${formatCurrency(revMTD)}`}
                icon={DollarSign}
                loading={loading}
              />
            </div>
          </AppTooltip>
          <AppTooltip content="Repair orders not yet in Paid, Invoiced, or Complete stage" side="bottom">
            <div>
              <StatCard
                label="Open ROs"
                value={openROs}
                sub="Across all shops"
                icon={ClipboardList}
                loading={loading}
              />
            </div>
          </AppTooltip>
          <AppTooltip content="Technicians currently clocked in across all shops" side="bottom">
            <div>
              <StatCard
                label="Active Techs"
                value={activeTechs}
                sub="Clocked in now"
                icon={Users}
                loading={loading}
              />
            </div>
          </AppTooltip>
          <AppTooltip content="Average shop efficiency score for the current week" side="bottom">
            <div>
              <StatCard
                label="Avg Efficiency"
                value={`${avgEff}%`}
                sub="This week"
                icon={TrendingUp}
                loading={loading}
              />
            </div>
          </AppTooltip>
        </div>
      )}

      {/* Charts row */}
      {isAdvisor ? null : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Revenue chart */}
          <div className="lg:col-span-2 bg-surface border border-border rounded-lg p-5 flex flex-col">
            <div className="flex items-center justify-between mb-5">
              <div>
                <div className="text-xs font-medium text-text-muted uppercase tracking-wider">Daily Revenue</div>
                <div className="text-lg font-semibold text-text-primary mt-0.5">Last 11 Days</div>
              </div>
              <div className="text-right">
                <div className="text-2xl font-semibold text-orange tabular-nums">{formatCurrency(revToday)}</div>
                <div className="text-xs text-text-muted">Today</div>
              </div>
            </div>
            <ResponsiveContainer width="100%" height="100%" minHeight={160} className="flex-1">
              <AreaChart data={revenueData} margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
                <defs>
                  <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#F97316" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#F97316" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
                <XAxis dataKey="date" tick={{ fill: tickColor, fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: tickColor, fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => `$${v/1000}k`} width={40} />
                <Tooltip content={<CustomTooltip />} />
                <Area type="monotone" dataKey="revenue" stroke="#F97316" strokeWidth={2} fill="url(#revGrad)" dot={false} activeDot={{ r: 4, fill: '#F97316' }} />
                <Area type="monotone" dataKey="target" stroke={targetStroke} strokeWidth={1.5} fill="none" dot={false} strokeDasharray="4 3" />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Stage breakdown */}
          <div className="bg-surface border border-border rounded-lg p-5">
            <div className="text-xs font-medium text-text-muted uppercase tracking-wider mb-1">RO Pipeline</div>
            <div className="text-lg font-semibold text-text-primary mb-4">By Stage</div>
            <div className="flex justify-center mb-3">
              <PieChart width={130} height={130}>
                <Pie data={stageBreakdown} cx={65} cy={65} innerRadius={38} outerRadius={58} paddingAngle={3} dataKey="value">
                  {stageBreakdown.map((entry, i) => (
                    <Cell key={i} fill={entry.fill} />
                  ))}
                </Pie>
              </PieChart>
            </div>
            <div className="space-y-1.5">
              {stageBreakdown.map(s => (
                <div key={s.name} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: s.fill }} />
                    <span className="text-text-secondary">{s.name}</span>
                  </div>
                  <span className="tabular-nums text-text-primary font-medium">{s.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Bottom row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Active ROs */}
        <div className="bg-surface border border-border rounded-lg lg:col-span-2">
          <div className="flex items-center justify-between px-5 py-4 border-b border-border">
            <div className="text-sm font-medium text-text-primary">Active Repair Orders</div>
            <button
              onClick={() => navigate('/repair-orders')}
              className="text-xs text-text-muted hover:text-orange transition-colors duration-150 flex items-center gap-1"
            >
              View all <ChevronRight size={12} />
            </button>
          </div>
          <div className="divide-y divide-border/60">
            {loading && Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="px-5 py-3 space-y-2">
                <div className="skeleton h-3 w-24" />
                <div className="skeleton h-4 w-48" />
                <div className="skeleton h-3 w-32" />
              </div>
            ))}
            {!loading && activeROs.length === 0 && (
              <div className="py-12 text-center">
                <div className="w-12 h-12 rounded-xl bg-border mx-auto mb-3 flex items-center justify-center">
                  <ClipboardList size={20} className="text-text-muted" />
                </div>
                <p className="text-sm text-text-muted">No active repair orders.</p>
                <button
                  onClick={() => setNewROOpen(true)}
                  className="mt-2 text-xs text-orange hover:underline"
                >
                  Create your first RO
                </button>
              </div>
            )}
            {!loading && activeROs.map(ro => (
              <div
                key={ro.id}
                className="flex items-center gap-3 px-5 py-3 hover:bg-border/30 cursor-pointer transition-colors duration-100"
                onClick={() => setSelectedRO(ro)}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-xs font-mono text-text-muted">{ro.id}</span>
                    <StageBadge stage={ro.stage} />
                  </div>
                  <div className="text-sm text-text-primary truncate">{ro.customerName} · {ro.vehicle}</div>
                  <div className="text-xs text-text-muted mt-0.5">{ro.techName || 'Unassigned'}</div>
                </div>
                {!isAdvisor && ro.total > 0 && (
                  <div className="text-sm font-semibold tabular-nums text-text-primary flex-shrink-0">
                    {formatCurrency(ro.total)}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* RO Pipeline — advisor sees it here; owner sees it in charts row */}
        {isAdvisor && (
          <div className="bg-surface border border-border rounded-lg p-5">
            <div className="text-xs font-medium text-text-muted uppercase tracking-wider mb-1">RO Pipeline</div>
            <div className="text-lg font-semibold text-text-primary mb-4">By Stage</div>
            <div className="flex justify-center mb-3">
              <PieChart width={130} height={130}>
                <Pie data={stageBreakdown} cx={65} cy={65} innerRadius={38} outerRadius={58} paddingAngle={3} dataKey="value">
                  {stageBreakdown.map((entry, i) => (
                    <Cell key={i} fill={entry.fill} />
                  ))}
                </Pie>
              </PieChart>
            </div>
            <div className="space-y-1.5">
              {stageBreakdown.map(s => (
                <div key={s.name} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: s.fill }} />
                    <span className="text-text-secondary">{s.name}</span>
                  </div>
                  <span className="tabular-nums text-text-primary font-medium">{s.value}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Shop summary — owner only */}
        {!isAdvisor && (
          <div className="bg-surface border border-border rounded-lg">
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <div className="text-sm font-medium text-text-primary">Shop Snapshot</div>
              <button
                onClick={() => navigate('/shops')}
                className="text-xs text-text-muted hover:text-orange transition-colors duration-150 flex items-center gap-1"
              >
                View all <ChevronRight size={12} />
              </button>
            </div>
            <div className="divide-y divide-border/60">
              {loading && Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="px-5 py-3 space-y-2">
                  <div className="skeleton h-4 w-32" />
                  <div className="skeleton h-3 w-40" />
                </div>
              ))}
              {!loading && shops.length === 0 && (
                <div className="py-12 text-center">
                  <div className="w-12 h-12 rounded-xl bg-border mx-auto mb-3 flex items-center justify-center">
                    <TrendingUp size={20} className="text-text-muted" />
                  </div>
                  <p className="text-sm text-text-muted">No shops yet.</p>
                </div>
              )}
              {!loading && shops.slice(0, 5).map(shop => {
                const mtd = mtdByShop[shop.id] || 0
                const thisWeek = weekByShop[shop.id] || 0
                const lastWeek = lastWeekByShop[shop.id] ?? null
                const trendPct = lastWeek !== null && lastWeek > 0
                  ? Math.round(((thisWeek - lastWeek) / lastWeek) * 100)
                  : null
                const monthlyPct = shop.monthlyTarget > 0
                  ? Math.min(100, Math.round((mtd / shop.monthlyTarget) * 100))
                  : 0
                return (
                  <div
                    key={shop.id}
                    className="px-5 py-3 hover:bg-border/30 cursor-pointer transition-colors duration-100"
                    onClick={() => navigate(`/shops/${shop.id}`)}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex-1 min-w-0">
                        <div className="text-sm text-text-primary truncate">{shop.name}</div>
                        <div className="text-xs text-text-muted">{shop.openROs} open ROs · {shop.activeTechs} techs active</div>
                      </div>
                      <div className="text-right flex-shrink-0 ml-3">
                        <div className="flex items-center justify-end gap-1.5">
                          <div className="text-sm font-semibold tabular-nums text-text-primary">{formatCurrency(mtd)}</div>
                          {trendPct !== null && (
                            <span className={cn(
                              'text-xs font-semibold tabular-nums',
                              trendPct >= 0 ? 'text-status-green' : 'text-status-red'
                            )}>
                              {trendPct >= 0 ? '↑' : '↓'}{Math.abs(trendPct)}%
                            </span>
                          )}
                        </div>
                        <div className="text-2xs text-text-muted text-right">MTD revenue</div>
                      </div>
                    </div>
                    {shop.monthlyTarget > 0 && (
                      <div className="space-y-0.5">
                        <div className="flex justify-between text-2xs text-text-muted">
                          <span>Monthly goal</span>
                          <span className="tabular-nums">{formatCurrency(mtd)} of {formatCurrency(shop.monthlyTarget)}</span>
                        </div>
                        <div className="h-1 rounded-full bg-border overflow-hidden">
                          <div
                            className={cn(
                              'h-full rounded-full transition-[width] duration-500',
                              monthlyPct >= 100 ? 'bg-status-green' : monthlyPct >= 60 ? 'bg-orange' : 'bg-status-yellow'
                            )}
                            style={{ width: `${monthlyPct}%` }}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>

      <NewROModal open={newROOpen} onClose={() => setNewROOpen(false)} />
      {selectedRO && <RODetailModal key={selectedRO.id} open={!!selectedRO} onClose={() => setSelectedRO(null)} ro={selectedRO} />}
    </div>
  )
}
