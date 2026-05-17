import { AlertTriangle, CheckCircle2, Info, XCircle, Building2, Truck, Bell, BellOff } from 'lucide-react'
import { useState } from 'react'
import { Modal } from '@/components/ui/Modal'
import { useData } from '@/contexts/DataContext'
import { useAuth } from '@/contexts/AuthContext'
import { cn } from '@/lib/utils'

const ALERT_CONFIG = {
  warning: { icon: AlertTriangle, bg: 'bg-status-yellow-subtle', text: 'text-status-yellow', label: 'Warning' },
  info:    { icon: Info,          bg: 'bg-status-blue-subtle',   text: 'text-status-blue',   label: 'Info'    },
  success: { icon: CheckCircle2,  bg: 'bg-status-green-subtle',  text: 'text-status-green',  label: 'Success' },
  error:   { icon: XCircle,       bg: 'bg-status-red-subtle',    text: 'text-status-red',    label: 'Alert'   },
}

const PART_STATUS_LABELS = {
  requested: { label: 'Part Requested',  color: 'text-text-muted',    bg: 'bg-border/50',           dot: 'bg-text-muted'     },
  ordered:   { label: 'Part Ordered',    color: 'text-orange',        bg: 'bg-orange/10',           dot: 'bg-orange'         },
  shipped:   { label: 'In Transit',      color: 'text-blue-400',      bg: 'bg-blue-500/10',         dot: 'bg-blue-400'       },
  arrived:   { label: 'Part Arrived',    color: 'text-status-yellow', bg: 'bg-status-yellow/10',   dot: 'bg-status-yellow'  },
  ready:     { label: 'Part Ready',      color: 'text-status-green',  bg: 'bg-status-green/10',    dot: 'bg-status-green'   },
}

const PREVIEW_COUNT = 3

export function AlertsModal({ open, onClose }) {
  const { parts, shops, notifications, markNotificationsRead, clearNotifications } = useData()
  const { session } = useAuth()
  const [showAllAlerts, setShowAllAlerts] = useState(false)
  const [showAllNotifs, setShowAllNotifs] = useState(false)
  const isAdvisor = session?.role === 'advisor'
  const scopedParts = isAdvisor ? parts.filter(p => p.shopId === session.shopId) : parts

  const liveAlerts = scopedParts
    .filter(p => p.qty <= p.minQty)
    .map(p => {
      const shop = shops.find(s => s.id === p.shopId)
      return {
        id:       `parts-${p.id}`,
        type:     p.qty === 0 ? 'error' : 'warning',
        shopName: shop?.name || '',
        message:  p.qty === 0
          ? `${p.name} is out of stock`
          : `${p.name} is low — ${p.qty} left (min ${p.minQty})`,
        detail:   p.sku,
      }
    })
    .sort((a, b) => (a.type === 'error' ? -1 : 1) - (b.type === 'error' ? -1 : 1))

  const partNotifications = notifications
    .filter(n => (n.type === 'part_status' || n.type === 'low_stock') && (!isAdvisor || n.shopId === session?.shopId))

  const unreadCount = partNotifications.filter(n => !n.read).length

  const visibleAlerts = showAllAlerts ? liveAlerts : liveAlerts.slice(0, PREVIEW_COUNT)
  const visibleNotifs = showAllNotifs ? partNotifications : partNotifications.slice(0, PREVIEW_COUNT)

  const totalCount = liveAlerts.length + (unreadCount > 0 ? unreadCount : 0)

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Alerts & Updates"
      subtitle={totalCount > 0 ? `${totalCount} unread` : 'All clear'}
      size="md"
    >
      <div className="divide-y divide-border">

        {/* Part Updates section */}
        {partNotifications.length > 0 && (
          <div className="p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Truck size={13} className="text-text-muted" />
                <span className="text-xs font-medium text-text-muted uppercase tracking-wider">Part Updates</span>
                {unreadCount > 0 && (
                  <span className="text-2xs px-1.5 py-0.5 rounded-full bg-orange/10 text-orange font-semibold">
                    {unreadCount} new
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                {unreadCount > 0 && (
                  <button
                    onClick={markNotificationsRead}
                    className="text-2xs text-text-muted hover:text-orange transition-colors"
                  >
                    Mark all read
                  </button>
                )}
                <button
                  onClick={clearNotifications}
                  className="text-2xs text-text-muted hover:text-status-red transition-colors"
                >
                  Clear
                </button>
              </div>
            </div>
            <div className="space-y-2">
              {visibleNotifs.map(n => (
                <NotifItem key={n.id} notif={n} />
              ))}
            </div>
            {!showAllNotifs && partNotifications.length > PREVIEW_COUNT && (
              <button
                onClick={() => setShowAllNotifs(true)}
                className="mt-3 w-full h-8 rounded-lg border border-border text-xs font-medium text-text-muted hover:text-text-primary hover:border-border-hover transition-colors"
              >
                +{partNotifications.length - PREVIEW_COUNT} more
              </button>
            )}
            {showAllNotifs && partNotifications.length > PREVIEW_COUNT && (
              <button
                onClick={() => setShowAllNotifs(false)}
                className="mt-3 w-full h-8 rounded-lg border border-border text-xs font-medium text-text-muted hover:text-text-primary hover:border-border-hover transition-colors"
              >
                Show less
              </button>
            )}
          </div>
        )}

        {/* Parts stock alerts */}
        <div className="p-4">
          <div className="text-xs font-medium text-text-muted uppercase tracking-wider mb-3 flex items-center gap-2">
            <AlertTriangle size={13} className="text-text-muted" />
            Inventory Alerts
          </div>
          {liveAlerts.length === 0 ? (
            <div className="py-6 text-center">
              <div className="w-10 h-10 rounded-xl bg-status-green/10 border border-status-green/20 mx-auto mb-2 flex items-center justify-center">
                <CheckCircle2 size={17} className="text-status-green" />
              </div>
              <p className="text-xs font-medium text-text-primary">All stocked up</p>
              <p className="text-2xs text-text-muted mt-0.5">No parts are low or out of stock.</p>
            </div>
          ) : (
            <>
              <div className="space-y-2">
                {visibleAlerts.map(alert => (
                  <AlertItem key={alert.id} alert={alert} />
                ))}
              </div>
              {!showAllAlerts && liveAlerts.length > PREVIEW_COUNT && (
                <button
                  onClick={() => setShowAllAlerts(true)}
                  className="mt-3 w-full h-8 rounded-lg border border-border text-xs font-medium text-text-muted hover:text-text-primary hover:border-border-hover transition-colors"
                >
                  +{liveAlerts.length - PREVIEW_COUNT} more alert{liveAlerts.length - PREVIEW_COUNT !== 1 ? 's' : ''}
                </button>
              )}
              {showAllAlerts && liveAlerts.length > PREVIEW_COUNT && (
                <button
                  onClick={() => setShowAllAlerts(false)}
                  className="mt-3 w-full h-8 rounded-lg border border-border text-xs font-medium text-text-muted hover:text-text-primary hover:border-border-hover transition-colors"
                >
                  Show less
                </button>
              )}
            </>
          )}
        </div>

        {/* Empty state — nothing at all */}
        {liveAlerts.length === 0 && partNotifications.length === 0 && (
          <div className="p-4 py-10 text-center">
            <div className="w-12 h-12 rounded-xl bg-status-green/10 border border-status-green/20 mx-auto mb-3 flex items-center justify-center">
              <BellOff size={20} className="text-status-green" />
            </div>
            <p className="text-sm font-medium text-text-primary">All clear</p>
            <p className="text-xs text-text-muted mt-1">No alerts or updates right now.</p>
          </div>
        )}
      </div>
    </Modal>
  )
}

function NotifItem({ notif }) {
  const timeStr = new Date(notif.createdAt).toLocaleString('en-US', {
    month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit'
  })

  if (notif.type === 'low_stock') {
    const isOut = notif.qty === 0
    return (
      <div className={cn(
        'flex gap-3 p-3 rounded-lg border transition-colors',
        notif.read ? 'bg-background border-border' : 'bg-surface border-border-hover'
      )}>
        <div className={cn('w-2 h-2 rounded-full flex-shrink-0 mt-1.5', isOut ? 'bg-status-red' : 'bg-status-yellow')} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5 flex-wrap">
            <span className={cn(
              'text-2xs font-semibold px-1.5 py-0.5 rounded-full',
              isOut ? 'bg-status-red/10 text-status-red' : 'bg-status-yellow/10 text-status-yellow'
            )}>
              {isOut ? 'Out of Stock' : 'Low Stock'}
            </span>
            {!notif.read && <span className="w-1.5 h-1.5 rounded-full bg-orange flex-shrink-0" />}
          </div>
          <p className="text-xs text-text-primary leading-snug">
            <span className="font-medium">{notif.partName}</span>
            <span className="text-text-muted"> — {notif.qty} left (min {notif.minQty})</span>
          </p>
          <p className="text-2xs text-text-muted mt-0.5">{timeStr}</p>
        </div>
      </div>
    )
  }

  const cfg = PART_STATUS_LABELS[notif.status] || PART_STATUS_LABELS.requested
  return (
    <div className={cn(
      'flex gap-3 p-3 rounded-lg border transition-colors',
      notif.read ? 'bg-background border-border' : 'bg-surface border-border-hover'
    )}>
      <div className={cn('w-2 h-2 rounded-full flex-shrink-0 mt-1.5', cfg.dot)} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5 flex-wrap">
          <span className={cn('text-2xs font-semibold px-1.5 py-0.5 rounded-full', cfg.bg, cfg.color)}>
            {cfg.label}
          </span>
          {!notif.read && (
            <span className="w-1.5 h-1.5 rounded-full bg-orange flex-shrink-0" />
          )}
        </div>
        <p className="text-xs text-text-primary leading-snug">
          <span className="font-medium">{notif.partName}</span>
          {notif.vehicle && <span className="text-text-muted"> · {notif.vehicle}</span>}
        </p>
        {notif.customerName && (
          <p className="text-2xs text-text-muted mt-0.5">{notif.customerName} · <span className="font-mono text-orange">{notif.roId}</span></p>
        )}
        <p className="text-2xs text-text-muted mt-0.5">{timeStr}</p>
      </div>
    </div>
  )
}

function AlertItem({ alert }) {
  const config = ALERT_CONFIG[alert.type] || ALERT_CONFIG.info
  const Icon = config.icon

  return (
    <div className="flex gap-3 p-3 rounded-lg bg-background border border-border">
      <div className={cn('w-8 h-8 rounded-md flex items-center justify-center flex-shrink-0 mt-0.5', config.bg)}>
        <Icon size={14} className={config.text} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <Building2 size={11} className="text-text-muted flex-shrink-0" />
          <span className="text-xs text-text-muted truncate">{alert.shopName}</span>
        </div>
        <p className="text-sm text-text-primary leading-snug">{alert.message}</p>
        {alert.detail && (
          <span className="text-xs font-mono text-text-muted mt-0.5 block">{alert.detail}</span>
        )}
      </div>
    </div>
  )
}
