import { useState } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, Legend
} from 'recharts'
import { shops, shopRevenueComparison, efficiencyTrend } from '@/data/mock'
import { formatCurrency } from '@/lib/utils'
import { useTheme } from '@/contexts/ThemeContext'
import { cn } from '@/lib/utils'

const CHART_COLORS = ['#F97316', '#3B82F6', '#22C55E', '#A855F7', '#EAB308']

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-surface border border-border rounded-lg px-3 py-2 shadow-xl text-xs">
      <div className="text-text-muted mb-1.5">{label}</div>
      {payload.map((p, i) => (
        <div key={i} className="flex items-center gap-2 mb-0.5">
          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: p.color }} />
          <span className="text-text-secondary">{p.name}:</span>
          <span className="font-medium text-text-primary tabular-nums">
            {typeof p.value === 'number' && p.value > 1000 ? formatCurrency(p.value) : `${p.value}%`}
          </span>
        </div>
      ))}
    </div>
  )
}

const TABS = ['Revenue', 'Efficiency', 'Tickets']

export default function Reports() {
  const [tab, setTab] = useState('Revenue')
  const { theme } = useTheme()
  const gridColor = theme === 'dark' ? '#1E2028' : '#E2E8F0'
  const tickColor = theme === 'dark' ? '#64748B' : '#94A3B8'
  const barBg = theme === 'dark' ? '#1E2028' : '#E2E8F0'

  return (
    <div className="p-5 lg:p-6 space-y-5 animate-fade-in">
      <div>
        <h1 className="text-xl font-semibold text-text-primary">Reports</h1>
        <p className="text-xs text-text-muted mt-0.5">Performance overview · November 2024</p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        {shops.map(shop => (
          <div key={shop.id} className="bg-surface border border-border rounded-lg px-4 py-3">
            <div className="text-xs text-text-muted truncate mb-1">{shop.name.split(' ').slice(0, 2).join(' ')}</div>
            <div className="text-base font-semibold tabular-nums text-text-primary">{formatCurrency(shop.revenue.mtd)}</div>
            <div className="text-xs text-text-muted">MTD</div>
          </div>
        ))}
      </div>

      {/* Tab nav */}
      <div className="flex gap-1 border-b border-border">
        {TABS.map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={cn(
              'h-9 px-4 text-sm font-medium transition-all duration-150',
              'border-b-2 -mb-px',
              tab === t
                ? 'text-orange border-orange'
                : 'text-text-muted hover:text-text-primary border-transparent'
            )}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Revenue tab */}
      {tab === 'Revenue' && (
        <div className="space-y-5 animate-fade-in">
          <div className="bg-surface border border-border rounded-lg p-5">
            <div className="text-xs font-medium text-text-muted uppercase tracking-wider mb-1">MTD Revenue by Shop</div>
            <div className="text-base font-semibold text-text-primary mb-4">vs Target</div>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={shopRevenueComparison} margin={{ top: 0, right: 0, bottom: 0, left: 0 }} barGap={4}>
                <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
                <XAxis dataKey="name" tick={{ fill: tickColor, fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: tickColor, fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => `$${(v/1000).toFixed(0)}k`} width={42} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="mtd" name="Actual" fill="#F97316" radius={[4, 4, 0, 0]} maxBarSize={40} />
                <Bar dataKey="target" name="Target" fill={barBg} radius={[4, 4, 0, 0]} maxBarSize={40} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Table */}
          <div className="bg-surface border border-border rounded-lg overflow-hidden">
            <div className="px-5 py-4 border-b border-border text-sm font-medium text-text-primary">Revenue Breakdown</div>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  {['Shop', 'Today', 'MTD', 'YTD', 'Avg Ticket'].map(h => (
                    <th key={h} className="px-5 py-2.5 text-left text-xs font-medium text-text-muted uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {shops.map(shop => (
                  <tr key={shop.id} className="border-b border-border/60 last:border-0 hover:bg-border/30 transition-colors duration-100">
                    <td className="px-5 py-3 font-medium text-text-primary">{shop.name}</td>
                    <td className="px-5 py-3 tabular-nums">{formatCurrency(shop.revenue.today)}</td>
                    <td className="px-5 py-3 tabular-nums text-orange font-medium">{formatCurrency(shop.revenue.mtd)}</td>
                    <td className="px-5 py-3 tabular-nums text-text-secondary">{formatCurrency(shop.revenue.ytd)}</td>
                    <td className="px-5 py-3 tabular-nums">{formatCurrency(shop.avgTicket)}</td>
                  </tr>
                ))}
                {/* Totals */}
                <tr className="bg-background border-t border-border">
                  <td className="px-5 py-3 font-semibold text-text-primary">Total</td>
                  <td className="px-5 py-3 tabular-nums font-semibold">{formatCurrency(shops.reduce((s, sh) => s + sh.revenue.today, 0))}</td>
                  <td className="px-5 py-3 tabular-nums font-semibold text-orange">{formatCurrency(shops.reduce((s, sh) => s + sh.revenue.mtd, 0))}</td>
                  <td className="px-5 py-3 tabular-nums font-semibold text-text-secondary">{formatCurrency(shops.reduce((s, sh) => s + sh.revenue.ytd, 0))}</td>
                  <td className="px-5 py-3 tabular-nums font-semibold">{formatCurrency(Math.round(shops.reduce((s, sh) => s + sh.avgTicket, 0) / shops.length))}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Efficiency tab */}
      {tab === 'Efficiency' && (
        <div className="space-y-5 animate-fade-in">
          <div className="bg-surface border border-border rounded-lg p-5">
            <div className="text-xs font-medium text-text-muted uppercase tracking-wider mb-1">Technician Efficiency</div>
            <div className="text-base font-semibold text-text-primary mb-4">Weekly Trend — All Shops</div>
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={efficiencyTrend} margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
                <XAxis dataKey="week" tick={{ fill: tickColor, fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: tickColor, fontSize: 11 }} axisLine={false} tickLine={false} domain={[65, 100]} tickFormatter={v => `${v}%`} width={36} />
                <Tooltip content={<CustomTooltip />} />
                <Legend formatter={v => <span className="text-xs text-text-secondary">{v}</span>} />
                {['North Houston', 'Katy Road', 'Southwest', 'Clear Lake', 'Woodlands'].map((name, i) => (
                  <Line
                    key={name}
                    type="monotone"
                    dataKey={name}
                    stroke={CHART_COLORS[i]}
                    strokeWidth={2}
                    dot={false}
                    activeDot={{ r: 4 }}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Tickets tab */}
      {tab === 'Tickets' && (
        <div className="bg-surface border border-border rounded-lg p-5 animate-fade-in">
          <div className="text-xs font-medium text-text-muted uppercase tracking-wider mb-1">Average Ticket Size</div>
          <div className="text-base font-semibold text-text-primary mb-4">By Location</div>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart
              data={shops.map(s => ({ name: s.name.split(' ').slice(0, 2).join(' '), value: s.avgTicket }))}
              layout="vertical"
              margin={{ top: 0, right: 24, bottom: 0, left: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke={gridColor} horizontal={false} />
              <XAxis type="number" tick={{ fill: tickColor, fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => `$${v}`} />
              <YAxis dataKey="name" type="category" tick={{ fill: tickColor, fontSize: 11 }} axisLine={false} tickLine={false} width={130} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="value" name="Avg Ticket" fill="#F97316" radius={[0, 4, 4, 0]} maxBarSize={28} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  )
}
