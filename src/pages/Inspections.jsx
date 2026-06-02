import { useState } from 'react'
import { Search, Plus, Camera, Send, Eye, CheckCircle, Clock, AlertTriangle, Paperclip } from 'lucide-react'
import { FileUpload, FileList } from '@/components/ui/FileUpload'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/Button'
import { NewROModal } from '@/components/modals/NewROModal'
import { Modal } from '@/components/ui/Modal'
import { formatRelativeTime } from '@/lib/utils'
import { cn } from '@/lib/utils'
import { useData } from '@/contexts/DataContext'

const CONDITION = {
  green:  { label: 'Good',         color: 'text-status-green',  bg: 'bg-status-green/10', ring: 'ring-status-green/30' },
  yellow: { label: 'Fair',         color: 'text-status-yellow', bg: 'bg-status-yellow/10', ring: 'ring-status-yellow/30' },
  red:    { label: 'Needs Repair', color: 'text-status-red',    bg: 'bg-status-red/10', ring: 'ring-status-red/30' },
}

const INSPECTION_STATUS = {
  draft:    { label: 'In Progress', color: 'text-text-muted',   bg: 'bg-border' },
  complete: { label: 'Complete',    color: 'text-blue-400',     bg: 'bg-blue-500/10' },
  sent:     { label: 'Sent',        color: 'text-status-green', bg: 'bg-status-green/10' },
}

const mockInspections = [
  {
    id: 'DVI-301', shopId: 1, roId: 'RO-8841', techName: 'Andre Jackson',
    customerName: 'Gerald Hutchins', vehicle: '2019 Ford F-150',
    status: 'sent', created: '2026-05-17T08:30:00', sentAt: '2026-05-17T09:00:00',
    items: [
      { category: 'Tires', label: 'Front Left', detail: '7/32" tread · 36 PSI', condition: 'green', photo: true },
      { category: 'Tires', label: 'Front Right', detail: '7/32" tread · 36 PSI', condition: 'green', photo: true },
      { category: 'Tires', label: 'Rear Left', detail: '4/32" tread · 34 PSI', condition: 'yellow', photo: true },
      { category: 'Tires', label: 'Rear Right', detail: '4/32" tread · 35 PSI', condition: 'yellow', photo: true },
      { category: 'Brakes', label: 'Front Pads', detail: '7mm remaining', condition: 'green', photo: false },
      { category: 'Brakes', label: 'Rear Pads', detail: '3mm remaining', condition: 'red', photo: true },
      { category: 'Brakes', label: 'Rotors', detail: 'Scoring visible on rear', condition: 'yellow', photo: true },
      { category: 'Fluids', label: 'Engine Oil', detail: 'Dark, due for change', condition: 'yellow', photo: false },
      { category: 'Fluids', label: 'Coolant', detail: 'Good level, clear', condition: 'green', photo: false },
      { category: 'Fluids', label: 'Brake Fluid', detail: 'Good', condition: 'green', photo: false },
      { category: 'Filters', label: 'Engine Air Filter', detail: 'Dirty, recommend replace', condition: 'red', photo: true },
      { category: 'Filters', label: 'Cabin Air Filter', detail: 'Acceptable', condition: 'green', photo: false },
      { category: 'Battery', label: 'Battery', detail: '12.4V · 680/750 CCA', condition: 'yellow', photo: false },
      { category: 'Exterior', label: 'Wiper Blades', detail: 'Streaking', condition: 'yellow', photo: true },
      { category: 'Exterior', label: 'Lights', detail: 'All operational', condition: 'green', photo: false },
    ],
  },
  {
    id: 'DVI-302', shopId: 5, roId: 'RO-8845', techName: 'Chris Nakamura',
    customerName: 'Derek Williamson', vehicle: '2022 BMW X5',
    status: 'complete', created: '2026-05-16T10:00:00', sentAt: null,
    items: [
      { category: 'Tires', label: 'Front Left', detail: '6/32" · 35 PSI', condition: 'green', photo: true },
      { category: 'Tires', label: 'Front Right', detail: '6/32" · 35 PSI', condition: 'green', photo: true },
      { category: 'Tires', label: 'Rear Left', detail: '5/32" · 34 PSI', condition: 'green', photo: true },
      { category: 'Tires', label: 'Rear Right', detail: '5/32" · 34 PSI', condition: 'green', photo: true },
      { category: 'Brakes', label: 'Front Pads', detail: '2mm — metal on metal', condition: 'red', photo: true },
      { category: 'Brakes', label: 'Rear Pads', detail: '4mm', condition: 'yellow', photo: true },
      { category: 'Brakes', label: 'Rotors', detail: 'Front scored, needs replacement', condition: 'red', photo: true },
      { category: 'Fluids', label: 'Engine Oil', detail: 'Good', condition: 'green', photo: false },
      { category: 'Fluids', label: 'Coolant', detail: 'Good', condition: 'green', photo: false },
      { category: 'Battery', label: 'Battery', detail: '12.6V · 720/750 CCA', condition: 'green', photo: false },
      { category: 'Exterior', label: 'Lights', detail: 'All operational', condition: 'green', photo: false },
    ],
  },
  {
    id: 'DVI-303', shopId: 2, roId: 'RO-8844', techName: 'Lamar Osei',
    customerName: 'Tanya Reeves', vehicle: '2020 Honda Civic',
    status: 'draft', created: '2026-05-17T09:30:00', sentAt: null,
    items: [
      { category: 'Tires', label: 'Front Left', detail: '5/32" · 33 PSI', condition: 'green', photo: false },
      { category: 'Tires', label: 'Front Right', detail: '5/32" · 33 PSI', condition: 'green', photo: false },
      { category: 'Tires', label: 'Rear Left', detail: '5/32" · 33 PSI', condition: 'green', photo: false },
      { category: 'Tires', label: 'Rear Right', detail: '5/32" · 33 PSI', condition: 'green', photo: false },
      { category: 'Steering', label: 'CV Axle (Left)', detail: 'Boot torn, clicking on turn', condition: 'red', photo: true },
    ],
  },
  {
    id: 'DVI-304', shopId: 3, roId: 'RO-8843', techName: 'Marcus Green',
    customerName: 'Sandra Montoya', vehicle: '2018 Chevrolet Equinox',
    status: 'sent', created: '2026-05-14T11:00:00', sentAt: '2026-05-14T11:30:00',
    items: [
      { category: 'Tires', label: 'Front Left', detail: '6/32"', condition: 'green', photo: false },
      { category: 'Tires', label: 'Front Right', detail: '6/32"', condition: 'green', photo: false },
      { category: 'Tires', label: 'Rear Left', detail: '6/32"', condition: 'green', photo: false },
      { category: 'Tires', label: 'Rear Right', detail: '6/32"', condition: 'green', photo: false },
      { category: 'Brakes', label: 'Front Pads', detail: '5mm', condition: 'green', photo: false },
      { category: 'Brakes', label: 'Rear Pads', detail: '5mm', condition: 'green', photo: false },
      { category: 'Electrical', label: 'Alternator', detail: 'Failing — 11.8V under load', condition: 'red', photo: true },
      { category: 'Battery', label: 'Battery', detail: '12.1V — weak', condition: 'yellow', photo: false },
      { category: 'Fluids', label: 'Engine Oil', detail: 'Good', condition: 'green', photo: false },
    ],
  },
]

function StatusBadge({ status }) {
  const cfg = INSPECTION_STATUS[status] || INSPECTION_STATUS.draft
  return (
    <span className={cn('inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-2xs font-semibold', cfg.bg, cfg.color)}>
      {cfg.label}
    </span>
  )
}

function ConditionDot({ condition }) {
  const cfg = CONDITION[condition]
  return (
    <span className={cn('w-2.5 h-2.5 rounded-full ring-2', cfg.bg, cfg.ring, cfg.color.replace('text-', 'bg-'))} />
  )
}

function InspectionDetail({ inspection, onClose, shops }) {
  if (!inspection) return null
  const shop = shops.find(s => s.id === inspection.shopId)
  const categories = [...new Set(inspection.items.map(i => i.category))]
  const redCount = inspection.items.filter(i => i.condition === 'red').length
  const yellowCount = inspection.items.filter(i => i.condition === 'yellow').length

  return (
    <Modal open={!!inspection} onClose={onClose} title={inspection.id} subtitle={`${inspection.vehicle} · ${inspection.customerName}`} size="xl">
      <div className="p-5 space-y-5">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <StatusBadge status={inspection.status} />
            <span className="text-xs text-text-muted">Inspected by {inspection.techName}</span>
          </div>
          <div className="flex items-center gap-4 text-xs">
            {redCount > 0 && (
              <span className="flex items-center gap-1.5 text-status-red font-medium">
                <AlertTriangle size={12} /> {redCount} needs repair
              </span>
            )}
            {yellowCount > 0 && (
              <span className="flex items-center gap-1.5 text-status-yellow font-medium">
                <Clock size={12} /> {yellowCount} monitor
              </span>
            )}
            <span className="flex items-center gap-1.5 text-status-green font-medium">
              <CheckCircle size={12} /> {inspection.items.filter(i => i.condition === 'green').length} good
            </span>
          </div>
        </div>

        <div className="space-y-4">
          {categories.map(cat => (
            <div key={cat}>
              <div className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-2">{cat}</div>
              <div className="rounded-lg border border-border overflow-hidden">
                {inspection.items.filter(i => i.category === cat).map((item, i, arr) => (
                  <div key={i} className={cn('flex items-center gap-3 px-4 py-2.5', i < arr.length - 1 && 'border-b border-border')}>
                    <ConditionDot condition={item.condition} />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm text-text-primary">{item.label}</div>
                      <div className="text-2xs text-text-muted">{item.detail}</div>
                    </div>
                    {item.photo && (
                      <div className="w-10 h-10 rounded-md bg-background border border-border flex items-center justify-center flex-shrink-0">
                        <Camera size={14} className="text-text-muted" />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* MPI Photos */}
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-text-primary mb-2">
            <Paperclip size={13} />
            MPI Photos
          </div>
          <FileUpload
            roId={inspection.roId || inspection.id}
            category="mpi"
            onUpload={(files) => {}}
          />
        </div>

        <div className="flex items-center justify-between pt-2">
          <div className="text-xs text-text-muted">
            {shop?.name} · {formatRelativeTime(inspection.created)}
          </div>
          <div className="flex items-center gap-2">
            {inspection.status === 'complete' && (
              <Button size="sm"><Send size={13} /> Send to customer</Button>
            )}
            {inspection.status === 'sent' && (
              <Button size="sm" variant="secondary"><Eye size={13} /> Customer view</Button>
            )}
          </div>
        </div>
      </div>
    </Modal>
  )
}

export default function Inspections() {
  const { shops } = useData()
  const { session } = useAuth()
  const isAdvisor = session?.role === 'advisor'
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('All')
  const [selected, setSelected] = useState(null)
  const [newOpen, setNewOpen] = useState(false)

  const allInspections = session?.demo ? mockInspections : []
  const scoped = isAdvisor
    ? allInspections.filter(i => i.shopId === session.shopId)
    : allInspections

  const filtered = scoped.filter(i => {
    const q = search.toLowerCase()
    const matchesSearch = !q ||
      i.id.toLowerCase().includes(q) ||
      i.customerName.toLowerCase().includes(q) ||
      i.vehicle.toLowerCase().includes(q) ||
      i.techName.toLowerCase().includes(q)
    const matchesStatus = statusFilter === 'All' || i.status === statusFilter
    return matchesSearch && matchesStatus
  })

  return (
    <div className="p-4 sm:p-5 lg:p-6 space-y-4 sm:space-y-5 animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-semibold text-text-primary">Inspections</h1>
          <p className="text-xs text-text-muted mt-0.5">{scoped.length} total · {scoped.filter(i => i.status === 'draft').length} in progress</p>
        </div>
        <Button onClick={() => setNewOpen(true)}>
          <Plus size={15} />
          New Inspection
        </Button>
      </div>

      <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-hide pb-1 -mx-4 px-4 sm:mx-0 sm:px-0">
        {['All', ...Object.keys(INSPECTION_STATUS)].map(s => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={cn(
              'flex items-center gap-1.5 h-7 px-3 rounded-md text-xs font-medium whitespace-nowrap',
              'transition-all duration-150',
              statusFilter === s
                ? 'bg-orange-subtle text-orange'
                : 'text-text-muted hover:text-text-primary hover:bg-surface'
            )}
          >
            {s === 'All' ? 'All' : INSPECTION_STATUS[s].label}
          </button>
        ))}
      </div>

      <div className="relative">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search inspections..."
          className="w-full h-9 pl-9 pr-3 rounded-lg bg-background border border-border text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-1 focus:ring-orange/40 transition-shadow"
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map(insp => {
          const shop = shops.find(s => s.id === insp.shopId)
          const redCount = insp.items.filter(i => i.condition === 'red').length
          const yellowCount = insp.items.filter(i => i.condition === 'yellow').length
          const greenCount = insp.items.filter(i => i.condition === 'green').length

          return (
            <button
              key={insp.id}
              onClick={() => setSelected(insp)}
              className="text-left bg-surface border border-border rounded-lg p-4 hover:border-border-hover transition-colors duration-150"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-text-muted">{insp.id}</span>
                <StatusBadge status={insp.status} />
              </div>
              <div className="text-sm font-medium text-text-primary mb-0.5">{insp.customerName}</div>
              <div className="text-2xs text-text-muted mb-3">{insp.vehicle} · {shop?.name}</div>

              <div className="flex items-center gap-1 mb-2">
                {insp.items.map((item, i) => (
                  <div
                    key={i}
                    className={cn(
                      'h-1.5 rounded-full flex-1',
                      item.condition === 'green' ? 'bg-status-green/40' :
                      item.condition === 'yellow' ? 'bg-status-yellow/40' :
                      'bg-status-red/40'
                    )}
                  />
                ))}
              </div>

              <div className="flex items-center gap-3 text-2xs">
                {redCount > 0 && <span className="text-status-red font-medium">{redCount} red</span>}
                {yellowCount > 0 && <span className="text-status-yellow font-medium">{yellowCount} yellow</span>}
                <span className="text-status-green">{greenCount} good</span>
                <span className="ml-auto text-text-muted">{insp.techName.split(' ')[0]}</span>
              </div>
            </button>
          )
        })}
      </div>

      {filtered.length === 0 && (
        <div className="py-12 text-center text-sm text-text-muted">No inspections found</div>
      )}

      <InspectionDetail inspection={selected} onClose={() => setSelected(null)} shops={shops} />
      {newOpen && <NewROModal open={newOpen} onClose={() => setNewOpen(false)} />}
    </div>
  )
}
