import { AlertTriangle, CheckCircle2, Info, XCircle, Building2 } from 'lucide-react'
import { Modal } from '@/components/ui/Modal'
import { alerts } from '@/data/mock'
import { cn } from '@/lib/utils'

const ALERT_CONFIG = {
  warning: { icon: AlertTriangle, bg: 'bg-status-yellow-subtle', text: 'text-status-yellow', label: 'Warning' },
  info: { icon: Info, bg: 'bg-status-blue-subtle', text: 'text-status-blue', label: 'Info' },
  success: { icon: CheckCircle2, bg: 'bg-status-green-subtle', text: 'text-status-green', label: 'Success' },
  error: { icon: XCircle, bg: 'bg-status-red-subtle', text: 'text-status-red', label: 'Alert' },
}

export function AlertsModal({ open, onClose }) {
  const unread = alerts.filter(a => !a.read)
  const read = alerts.filter(a => a.read)

  return (
    <Modal open={open} onClose={onClose} title="Alerts" subtitle={`${unread.length} unread`} size="md">
      <div className="divide-y divide-border">
        {unread.length > 0 && (
          <div className="p-4">
            <div className="text-xs font-medium text-text-muted uppercase tracking-wider mb-3">New</div>
            <div className="space-y-2">
              {unread.map(alert => (
                <AlertItem key={alert.id} alert={alert} />
              ))}
            </div>
          </div>
        )}
        {read.length > 0 && (
          <div className="p-4">
            <div className="text-xs font-medium text-text-muted uppercase tracking-wider mb-3">Earlier</div>
            <div className="space-y-2 opacity-60">
              {read.map(alert => (
                <AlertItem key={alert.id} alert={alert} />
              ))}
            </div>
          </div>
        )}
      </div>
    </Modal>
  )
}

function AlertItem({ alert }) {
  const config = ALERT_CONFIG[alert.type] || ALERT_CONFIG.info
  const Icon = config.icon

  return (
    <div className={cn('flex gap-3 p-3 rounded-lg', alert.read ? 'bg-background' : 'bg-background border border-border')}>
      <div className={cn('w-8 h-8 rounded-md flex items-center justify-center flex-shrink-0 mt-0.5', config.bg)}>
        <Icon size={14} className={config.text} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <Building2 size={11} className="text-text-muted flex-shrink-0" />
          <span className="text-xs text-text-muted truncate">{alert.shopName}</span>
        </div>
        <p className="text-sm text-text-primary leading-snug">{alert.message}</p>
        <span className="text-xs text-text-muted mt-1 block">{alert.time}</span>
      </div>
    </div>
  )
}
