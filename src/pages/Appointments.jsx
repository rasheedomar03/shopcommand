import { useState } from 'react'
import { ChevronLeft, ChevronRight, Plus, Calendar } from 'lucide-react'
import { useData } from '@/contexts/DataContext'
import { useAuth } from '@/contexts/AuthContext'
import { StageBadge } from '@/components/ui/Badge'
import { RODetailModal } from '@/components/modals/RODetailModal'
import { NewROModal } from '@/components/modals/NewROModal'
import { cn } from '@/lib/utils'
import { Tooltip } from '@/components/ui/Tooltip'

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December']

function getWeekStart(date) {
  const d = new Date(date)
  const day = d.getDay()
  const diff = day === 0 ? -6 : 1 - day  // start on Monday
  d.setDate(d.getDate() + diff)
  d.setHours(0, 0, 0, 0)
  return d
}

function addDays(date, n) {
  const d = new Date(date)
  d.setDate(d.getDate() + n)
  return d
}

function sameDay(a, b) {
  return a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
}

function formatTime(isoStr) {
  const d = new Date(isoStr)
  const h = d.getHours()
  const m = d.getMinutes()
  const ampm = h >= 12 ? 'pm' : 'am'
  const hour = h % 12 || 12
  return m === 0 ? `${hour}${ampm}` : `${hour}:${String(m).padStart(2, '0')}${ampm}`
}

function stageColor(stage) {
  const map = {
    'Estimate':      'border-l-blue-400',
    'Approved':      'border-l-purple-400',
    'In Progress':   'border-l-orange',
    'Waiting Parts': 'border-l-yellow-400',
    'Complete':      'border-l-green-500',
    'Invoiced':      'border-l-slate-400',
    'Paid':          'border-l-green-600',
  }
  return map[stage] || 'border-l-border'
}

export default function Appointments() {
  const { repairOrders } = useData()
  const { session } = useAuth()
  const isAdvisor = session?.role === 'advisor'
  const [weekStart, setWeekStart] = useState(() => getWeekStart(new Date()))
  const [selectedRO, setSelectedRO] = useState(null)
  const [newROOpen, setNewROOpen] = useState(false)
  const [newRODate, setNewRODate] = useState(null)

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const days = Array.from({ length: 5 }, (_, i) => addDays(weekStart, i))

  const scheduledROs = repairOrders.filter(ro =>
    ro.scheduledAt && (!isAdvisor || ro.shopId === session.shopId)
  )

  const rosForDay = (day) =>
    scheduledROs
      .filter(ro => sameDay(new Date(ro.scheduledAt), day))
      .sort((a, b) => new Date(a.scheduledAt) - new Date(b.scheduledAt))

  const prevWeek = () => setWeekStart(d => addDays(d, -7))
  const nextWeek = () => setWeekStart(d => addDays(d, 7))
  const goToday  = () => setWeekStart(getWeekStart(new Date()))

  const weekLabel = () => {
    const end = addDays(weekStart, 4)
    if (weekStart.getMonth() === end.getMonth()) {
      return `${MONTH_NAMES[weekStart.getMonth()]} ${weekStart.getFullYear()}`
    }
    return `${MONTH_NAMES[weekStart.getMonth()]} – ${MONTH_NAMES[end.getMonth()]} ${end.getFullYear()}`
  }

  const totalThisWeek = days.reduce((sum, d) => sum + rosForDay(d).length, 0)

  return (
    <div className="p-4 sm:p-5 lg:p-6 flex flex-col gap-4 sm:gap-5 animate-fade-in h-full">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-lg sm:text-xl font-semibold text-text-primary">Appointments</h1>
          <p className="text-xs text-text-muted mt-0.5">{totalThisWeek} scheduled this week</p>
        </div>
        <button
          onClick={() => { setNewRODate(null); setNewROOpen(true) }}
          className="flex items-center gap-1.5 h-8 sm:h-9 px-3 sm:px-4 rounded-lg bg-orange text-white text-xs sm:text-sm font-semibold hover:bg-orange/90 active:scale-[0.98] transition-all duration-150 flex-shrink-0"
        >
          <Plus size={14} />
          <span className="hidden sm:inline">New Appointment</span>
          <span className="sm:hidden">New</span>
        </button>
      </div>

      {/* Week nav */}
      <div className="flex items-center gap-2 sm:gap-3">
        <button
          onClick={goToday}
          className="h-8 px-3 rounded-md border border-border text-xs font-medium text-text-secondary hover:text-text-primary hover:border-border-hover transition-colors"
        >
          Today
        </button>
        <div className="flex items-center gap-1">
          <button onClick={prevWeek} className="w-7 h-7 flex items-center justify-center rounded-md border border-border text-text-muted hover:text-text-primary hover:border-border-hover transition-colors">
            <ChevronLeft size={13} />
          </button>
          <button onClick={nextWeek} className="w-7 h-7 flex items-center justify-center rounded-md border border-border text-text-muted hover:text-text-primary hover:border-border-hover transition-colors">
            <ChevronRight size={13} />
          </button>
        </div>
        <span className="text-sm font-medium text-text-primary">{weekLabel()}</span>
      </div>

      {/* Calendar — vertical list on mobile, 5-col grid on md+ */}
      <div className="flex flex-col md:grid md:grid-cols-5 gap-3 flex-1 min-h-0">
        {days.map((day, i) => {
          const isToday = sameDay(day, today)
          const isPast  = day < today
          const ros     = rosForDay(day)

          return (
            <div key={i} className={cn(
              'flex flex-col gap-2 rounded-xl border p-3',
              isToday ? 'border-orange/40 bg-orange/[0.03]' : 'border-border bg-surface'
            )}>
              {/* Day header */}
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2 md:block">
                  <div className={cn('text-xs font-medium uppercase tracking-wider', isToday ? 'text-orange' : 'text-text-muted')}>
                    {DAY_NAMES[day.getDay()]}
                  </div>
                  <div className={cn(
                    'text-xl font-semibold leading-none md:mt-0.5',
                    isToday ? 'text-orange' : isPast ? 'text-text-muted' : 'text-text-primary'
                  )}>
                    {day.getDate()}
                  </div>
                  {ros.length > 0 && (
                    <span className="md:hidden text-2xs text-text-muted ml-1">{ros.length} appt{ros.length !== 1 ? 's' : ''}</span>
                  )}
                </div>
                <Tooltip content="Add appointment">
                  <button
                    onClick={() => { setNewRODate(day.toISOString()); setNewROOpen(true) }}
                    className="w-7 h-7 flex items-center justify-center rounded-md text-text-muted hover:text-orange hover:bg-orange/10 transition-colors"
                  >
                    <Plus size={13} />
                  </button>
                </Tooltip>
              </div>

              {/* RO cards */}
              <div className="flex flex-col gap-1.5 overflow-y-auto">
                {ros.length === 0 ? (
                  <div className="flex items-center justify-center py-4 md:py-6 text-center">
                    <span className="text-2xs text-text-muted">No appointments</span>
                  </div>
                ) : (
                  ros.map(ro => (
                    <button
                      key={ro.id}
                      onClick={() => setSelectedRO(ro)}
                      className={cn(
                        'w-full text-left rounded-lg border-l-2 bg-background border border-border hover:border-orange/30 p-2.5 transition-all duration-150 hover:-translate-y-px hover:shadow-sm',
                        stageColor(ro.stage)
                      )}
                    >
                      <div className="flex items-center justify-between gap-1 mb-1">
                        <span className="text-2xs font-mono text-orange">{ro.id}</span>
                        <span className="text-2xs text-text-muted">{formatTime(ro.scheduledAt)}</span>
                      </div>
                      <div className="text-xs font-medium text-text-primary truncate leading-snug">{ro.customerName}</div>
                      <div className="text-2xs text-text-muted truncate mt-0.5">{ro.vehicle}</div>
                      <div className="mt-1.5">
                        <StageBadge stage={ro.stage} />
                      </div>
                    </button>
                  ))
                )}
              </div>
            </div>
          )
        })}
      </div>

      {selectedRO && (
        <RODetailModal key={selectedRO?.id} open={!!selectedRO} onClose={() => setSelectedRO(null)} ro={selectedRO} />
      )}
      {newROOpen && (
        <NewROModal open={newROOpen} onClose={() => setNewROOpen(false)} defaultDate={newRODate} />
      )}
    </div>
  )
}
