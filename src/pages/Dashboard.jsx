import { useState } from 'react'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'
import { DollarSign, ClipboardList, Users, TrendingUp, Plus, ChevronRight } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { StatCard } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { StageBadge } from '@/components/ui/Badge'
import { NewROModal } from '@/components/modals/NewROModal'
import { RODetailModal } from '@/components/modals/RODetailModal'
import { shops, repairOrders, revenueData, stageBreakdown } from '@/data/mock'
import { formatCurrency, formatRelativeTime } from '@/lib/utils'
import { useTheme } from '@/contexts/ThemeContext'
import { cn } from '@/lib/utils'

const totalRevToday = shops.reduce((s, sh) => s + sh.revenue.today, 0)
const totalRevMTD = shops.reduce((s, sh) => s + sh.revenue.mtd, 0)
const totalOpenROs = shops.reduce((s, sh) => s + sh.openROs, 0)
const avgEfficiency = Math.round(shops.reduce((s, sh) => s + sh.efficiency, 0) / shops.length)

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
  const [newROOpen, setNewROOpen] = useState(false)
  const [selectedRO, setSelectedRO] = useState(null)
  const navigate = useNavigate()
  const { theme } = useTheme()
  const gridColor = theme === 'dark' ? '#1E2028' : '#E2E8F0'
  const tickColor = theme === 'dark' ? '#64748B' : '#94A3B8'
  const targetStroke = theme === 'dark' ? '#2A2D3A' : '#CBD5E1'

  const activeROs = repairOrders.filter(ro => !['Invoiced'].includes(ro.stage)).slice(0, 5)

  return (
    <div className="p-5 lg:p-6 space-y-6 animate-fade-in">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-text-primary">Dashboard</h1>
          <p className="text-xs text-text-muted mt-0.5">Thursday, November 7 · All 5 locations</p>
        </div>
        <Button onClick={() => setNewROOpen(true)}>
          <Plus size={15} />
          New RO
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          label="Revenue Today"
          value={formatCurrency(totalRevToday)}
          sub={`MTD: ${formatCurrency(totalRevMTD)}`}
          icon={DollarSign}
          trend={8.4}
        />
        <StatCard
          label="Open ROs"
          value={totalOpenROs}
          sub="Across all shops"
          icon={ClipboardList}
        />
        <StatCard
          label="Active Techs"
          value={shops.reduce((s, sh) => s + sh.activeTechs, 0)}
          sub="Clocked in now"
          icon={Users}
        />
        <StatCard
          label="Avg Efficiency"
          value={`${avgEfficiency}%`}
          sub="This week"
          icon={TrendingUp}
          trend={2.1}
        />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Revenue chart */}
        <div className="lg:col-span-2 bg-surface border border-border rounded-lg p-5">
          <div className="flex items-center justify-between mb-5">
            <div>
              <div className="text-xs font-medium text-text-muted uppercase tracking-wider">Daily Revenue</div>
              <div className="text-lg font-semibold text-text-primary mt-0.5">Last 11 Days</div>
            </div>
            <div className="text-right">
              <div className="text-2xl font-semibold text-orange tabular-nums">{formatCurrency(totalRevToday)}</div>
              <div className="text-xs text-status-green">↑ 14% vs last week</div>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={180}>
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

      {/* Bottom row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Active ROs */}
        <div className="bg-surface border border-border rounded-lg">
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
            {activeROs.map(ro => (
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
                {ro.total > 0 && (
                  <div className="text-sm font-semibold tabular-nums text-text-primary flex-shrink-0">
                    {formatCurrency(ro.total)}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Shop summary */}
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
            {shops.slice(0, 5).map(shop => (
              <div
                key={shop.id}
                className="flex items-center justify-between px-5 py-3 hover:bg-border/30 cursor-pointer transition-colors duration-100"
                onClick={() => navigate(`/shops/${shop.id}`)}
              >
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-text-primary truncate">{shop.name}</div>
                  <div className="text-xs text-text-muted">{shop.openROs} open ROs · {shop.activeTechs} techs active</div>
                </div>
                <div className="text-right flex-shrink-0">
                  <div className="text-sm font-semibold tabular-nums text-text-primary">{formatCurrency(shop.revenue.today)}</div>
                  <div className={cn(
                    'text-xs tabular-nums',
                    shop.efficiency >= 85 ? 'text-status-green' : shop.efficiency >= 75 ? 'text-status-yellow' : 'text-status-red'
                  )}>
                    {shop.efficiency}% eff.
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <NewROModal open={newROOpen} onClose={() => setNewROOpen(false)} />
      {selectedRO && <RODetailModal open={!!selectedRO} onClose={() => setSelectedRO(null)} ro={selectedRO} />}
    </div>
  )
}
