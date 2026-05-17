import { useState } from 'react'
import { shops } from '@/data/mock'
import { useData } from '@/contexts/DataContext'
import { useAuth } from '@/contexts/AuthContext'
import { StageBadge } from '@/components/ui/Badge'
import { cn } from '@/lib/utils'
import { Inbox, GripVertical } from 'lucide-react'

const DISPATCH_STAGES = ['Estimate', 'Approved', 'Waiting Parts', 'In Progress']

function DispatchCard({ ro, isDragging, onDragStart, onDragEnd }) {
  return (
    <div
      draggable
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      className={cn(
        'rounded-lg border bg-background p-3 cursor-grab active:cursor-grabbing',
        'transition-all duration-150 select-none',
        isDragging
          ? 'opacity-40 scale-95 shadow-none'
          : 'hover:border-orange/30 hover:shadow-sm'
      )}
    >
      <div className="flex items-center gap-1.5 mb-1.5">
        <GripVertical size={12} className="text-text-muted flex-shrink-0 -ml-0.5" />
        <span className="text-xs font-mono text-orange">{ro.id}</span>
        <StageBadge stage={ro.stage} />
      </div>
      <div className="text-sm font-medium text-text-primary leading-snug truncate">{ro.vehicle}</div>
      <div className="text-xs text-text-muted truncate mt-0.5">{ro.customerName}</div>
      {ro.complaint && (
        <div className="text-2xs text-text-muted mt-1.5 line-clamp-2 leading-relaxed">{ro.complaint}</div>
      )}
    </div>
  )
}

function DropColumn({ id, header, children, isOver, onDragOver, onDragLeave, onDrop }) {
  return (
    <div
      className={cn(
        'flex-shrink-0 w-64 rounded-xl border-2 transition-colors duration-150',
        isOver ? 'border-orange/40 bg-orange/5' : 'border-border bg-surface'
      )}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
    >
      {header}
      <div className="p-3 space-y-2 min-h-28">
        {children}
        {isOver && (
          <div className="py-3 rounded-lg border border-dashed border-orange/40 text-center text-xs text-orange">
            Drop to assign
          </div>
        )}
      </div>
    </div>
  )
}

export default function Dispatch() {
  const { repairOrders, technicians, updateRepairOrder, clockedInTechs } = useData()
  const { session } = useAuth()
  const isAdvisor = session?.role === 'advisor'
  const [draggedROId, setDraggedROId] = useState(null)
  const [dragOverCol, setDragOverCol]  = useState(null)

  const scopedTechs = isAdvisor
    ? technicians.filter(t => t.shopId === session.shopId)
    : technicians

  const openROs    = repairOrders.filter(ro =>
    DISPATCH_STAGES.includes(ro.stage) && (!isAdvisor || ro.shopId === session.shopId)
  )
  const unassigned = openROs.filter(ro => !ro.techId)

  const doAssign = (roId, techId) => {
    if (!roId) return
    const tech = techId ? technicians.find(t => t.id === techId) : null
    updateRepairOrder(roId, {
      techId:   techId  ?? null,
      techName: tech?.name ?? null,
    })
  }

  const makeDropProps = (colId) => ({
    onDragOver:  (e) => { e.preventDefault(); setDragOverCol(colId) },
    onDragLeave: (e) => { if (!e.currentTarget.contains(e.relatedTarget)) setDragOverCol(null) },
    onDrop:      (e) => {
      e.preventDefault()
      doAssign(draggedROId, colId === 'unassigned' ? null : colId)
      setDraggedROId(null)
      setDragOverCol(null)
    },
  })

  const totalOpen = openROs.length

  return (
    <div className="p-5 lg:p-6 space-y-5 animate-fade-in">
      <div>
        <h1 className="text-xl font-semibold text-text-primary">Dispatch Board</h1>
        <p className="text-xs text-text-muted mt-0.5">
          {totalOpen} open {totalOpen === 1 ? 'job' : 'jobs'} · drag to assign or reassign
        </p>
      </div>

      <div className="flex gap-4 overflow-x-auto pb-4 items-start">

        {/* Unassigned queue */}
        <DropColumn
          id="unassigned"
          isOver={dragOverCol === 'unassigned'}
          {...makeDropProps('unassigned')}
          header={
            <div className="px-4 py-3.5 border-b border-border flex items-center gap-2">
              <Inbox size={14} className="text-text-muted" />
              <span className="text-sm font-semibold text-text-primary">Unassigned</span>
              <span className="ml-auto text-xs px-2 py-0.5 rounded-full bg-border text-text-muted font-medium tabular-nums">
                {unassigned.length}
              </span>
            </div>
          }
        >
          {unassigned.length === 0 ? (
            <div className="py-8 text-center">
              <p className="text-xs text-text-muted">All jobs are assigned</p>
            </div>
          ) : (
            unassigned.map(ro => (
              <DispatchCard
                key={ro.id}
                ro={ro}
                isDragging={draggedROId === ro.id}
                onDragStart={() => setDraggedROId(ro.id)}
                onDragEnd={() => { setDraggedROId(null); setDragOverCol(null) }}
              />
            ))
          )}
        </DropColumn>

        {/* One column per tech */}
        {scopedTechs.map(tech => {
          const shop    = shops.find(s => s.id === tech.shopId)
          const techROs = openROs.filter(ro => ro.techId === tech.id)
          const isActive = clockedInTechs.has(tech.id)
          const isOver   = dragOverCol === tech.id

          return (
            <DropColumn
              key={tech.id}
              id={tech.id}
              isOver={isOver}
              {...makeDropProps(tech.id)}
              header={
                <div className="px-4 py-3.5 border-b border-border">
                  <div className="flex items-center gap-2">
                    <div className={cn(
                      'w-2 h-2 rounded-full flex-shrink-0',
                      isActive ? 'bg-status-green' : 'bg-text-muted/40'
                    )} />
                    <span className="text-sm font-semibold text-text-primary truncate">{tech.name}</span>
                    <span className="ml-auto text-xs px-2 py-0.5 rounded-full bg-border text-text-muted font-medium tabular-nums flex-shrink-0">
                      {techROs.length}
                    </span>
                  </div>
                  <div className="text-2xs text-text-muted mt-0.5 pl-4">
                    {tech.specialty} · {shop?.name}
                  </div>
                </div>
              }
            >
              {techROs.length === 0 ? (
                <div className={cn(
                  'py-6 rounded-lg border border-dashed text-center text-xs transition-colors',
                  isOver ? 'border-orange/40 text-orange' : 'border-border text-text-muted'
                )}>
                  {isOver ? 'Drop to assign' : 'No jobs assigned'}
                </div>
              ) : (
                techROs.map(ro => (
                  <DispatchCard
                    key={ro.id}
                    ro={ro}
                    isDragging={draggedROId === ro.id}
                    onDragStart={() => setDraggedROId(ro.id)}
                    onDragEnd={() => { setDraggedROId(null); setDragOverCol(null) }}
                  />
                ))
              )}
            </DropColumn>
          )
        })}
      </div>
    </div>
  )
}
