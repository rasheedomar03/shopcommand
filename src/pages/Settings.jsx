import { useState } from 'react'
import { Building2, Bell, Shield, CreditCard, Users, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { cn } from '@/lib/utils'

const SECTIONS = [
  { id: 'profile', label: 'Account', icon: Users },
  { id: 'notifications', label: 'Notifications', icon: Bell },
  { id: 'locations', label: 'Locations', icon: Building2 },
  { id: 'security', label: 'Security', icon: Shield },
  { id: 'billing', label: 'Billing', icon: CreditCard },
]

export default function Settings() {
  const [active, setActive] = useState('profile')
  const [saved, setSaved] = useState(false)

  const handleSave = async () => {
    setSaved(true)
    await new Promise(r => setTimeout(r, 1200))
    setSaved(false)
  }

  return (
    <div className="p-5 lg:p-6 animate-fade-in">
      <h1 className="text-xl font-semibold text-text-primary mb-6">Settings</h1>

      <div className="flex gap-6 flex-col lg:flex-row">
        {/* Sidebar nav */}
        <div className="w-full lg:w-48 flex-shrink-0">
          <nav className="space-y-0.5">
            {SECTIONS.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setActive(id)}
                className={cn(
                  'w-full flex items-center gap-2.5 h-9 px-3 rounded-md text-sm font-medium text-left',
                  'transition-all duration-150',
                  active === id
                    ? 'bg-orange-subtle text-orange'
                    : 'text-text-secondary hover:text-text-primary hover:bg-surface'
                )}
              >
                <Icon size={15} />
                {label}
              </button>
            ))}
          </nav>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {active === 'profile' && (
            <SettingsPanel title="Account Settings" onSave={handleSave} saving={saved}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input label="First Name" defaultValue="Rasheed" />
                <Input label="Last Name" defaultValue="Omar" />
                <Input label="Email" type="email" defaultValue="rasheed.omar@outlook.com" />
                <Input label="Phone" type="tel" defaultValue="+1 (832) 555-0192" />
              </div>
              <div className="pt-4 border-t border-border">
                <div className="text-xs font-medium text-text-muted uppercase tracking-wider mb-3">Business</div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input label="Business Name" defaultValue="Omar Auto Group" />
                  <Input label="Tax ID" defaultValue="**-*******" type="password" />
                </div>
              </div>
            </SettingsPanel>
          )}

          {active === 'notifications' && (
            <SettingsPanel title="Notification Preferences" onSave={handleSave} saving={saved}>
              <div className="space-y-0">
                {[
                  { label: 'Low inventory alerts', sub: 'When parts fall below minimum quantity', defaultChecked: true },
                  { label: 'New repair order', sub: 'When a customer RO is created', defaultChecked: true },
                  { label: 'RO stage changes', sub: 'When status updates to complete or invoiced', defaultChecked: true },
                  { label: 'Unanswered estimates', sub: 'Estimates pending for 4+ hours', defaultChecked: false },
                  { label: 'Daily revenue summary', sub: 'End-of-day revenue recap for all shops', defaultChecked: true },
                  { label: 'Technician clock-in/out', sub: 'When a tech starts or ends their shift', defaultChecked: false },
                ].map((item, i) => (
                  <ToggleRow key={i} {...item} />
                ))}
              </div>
            </SettingsPanel>
          )}

          {active === 'locations' && (
            <SettingsPanel title="Locations" onSave={handleSave} saving={saved}>
              <p className="text-sm text-text-muted mb-4">Manage your shop locations and their Tekmetric connection status.</p>
              {[
                { name: 'North Houston Auto', status: 'connected', id: '#1044' },
                { name: 'Katy Road Service', status: 'connected', id: '#1087' },
                { name: 'Southwest Tire & Auto', status: 'connected', id: '#1102' },
                { name: 'Clear Lake Auto Clinic', status: 'pending', id: '#1134' },
                { name: 'The Woodlands Garage', status: 'connected', id: '#1155' },
              ].map((loc, i) => (
                <div key={i} className="flex items-center justify-between py-3 border-b border-border/60 last:border-0">
                  <div>
                    <div className="text-sm font-medium text-text-primary">{loc.name}</div>
                    <div className="text-xs text-text-muted">Tekmetric {loc.id}</div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={cn(
                      'text-xs px-2 py-0.5 rounded-full',
                      loc.status === 'connected' ? 'bg-status-green-subtle text-status-green' : 'bg-status-yellow-subtle text-status-yellow'
                    )}>
                      {loc.status === 'connected' ? 'Connected' : 'Pending'}
                    </span>
                    <ChevronRight size={14} className="text-text-muted" />
                  </div>
                </div>
              ))}
            </SettingsPanel>
          )}

          {active === 'security' && (
            <SettingsPanel title="Security" onSave={handleSave} saving={saved}>
              <div className="space-y-4">
                <Input label="Current Password" type="password" placeholder="••••••••••" />
                <Input label="New Password" type="password" placeholder="••••••••••" />
                <Input label="Confirm New Password" type="password" placeholder="••••••••••" />
              </div>
              <div className="pt-4 border-t border-border">
                <div className="text-xs font-medium text-text-muted uppercase tracking-wider mb-3">Two-Factor Authentication</div>
                <ToggleRow label="Enable 2FA" sub="Use an authenticator app for additional security" defaultChecked={false} />
              </div>
            </SettingsPanel>
          )}

          {active === 'billing' && (
            <SettingsPanel title="Billing" hideFooter>
              <div className="bg-background border border-border rounded-lg p-4 mb-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-text-primary">Pro Plan</span>
                  <span className="text-sm font-semibold text-orange">$149/mo</span>
                </div>
                <div className="text-xs text-text-muted">5 locations · Unlimited ROs · Tekmetric sync</div>
                <div className="text-xs text-text-muted mt-1">Next billing: December 1, 2024</div>
              </div>
              <div className="text-xs font-medium text-text-muted uppercase tracking-wider mb-3">Payment Method</div>
              <div className="flex items-center justify-between py-3 border border-border rounded-lg px-4">
                <div className="flex items-center gap-2.5">
                  <CreditCard size={16} className="text-text-muted" />
                  <span className="text-sm text-text-primary">Visa •••• 4291</span>
                </div>
                <Button variant="ghost" size="sm">Update</Button>
              </div>
            </SettingsPanel>
          )}
        </div>
      </div>
    </div>
  )
}

function SettingsPanel({ title, children, onSave, saving, hideFooter }) {
  return (
    <div className="bg-surface border border-border rounded-lg overflow-hidden">
      <div className="px-5 py-4 border-b border-border">
        <h2 className="text-sm font-semibold text-text-primary">{title}</h2>
      </div>
      <div className="p-5 space-y-4">
        {children}
      </div>
      {!hideFooter && (
        <div className="flex justify-end px-5 py-4 border-t border-border bg-background/40">
          <Button onClick={onSave} loading={saving}>
            {saving ? 'Saving…' : 'Save Changes'}
          </Button>
        </div>
      )}
    </div>
  )
}

function ToggleRow({ label, sub, defaultChecked }) {
  const [checked, setChecked] = useState(defaultChecked)

  return (
    <div className="flex items-center justify-between py-3 border-b border-border/60 last:border-0">
      <div className="flex-1 mr-4">
        <div className="text-sm text-text-primary">{label}</div>
        {sub && <div className="text-xs text-text-muted mt-0.5">{sub}</div>}
      </div>
      <button
        role="switch"
        aria-checked={checked}
        onClick={() => setChecked(c => !c)}
        className={cn(
          'relative inline-flex h-5 w-9 items-center rounded-full',
          'transition-colors duration-200',
          'focus-visible:outline focus-visible:outline-2 focus-visible:outline-orange focus-visible:outline-offset-2',
          checked ? 'bg-orange' : 'bg-border'
        )}
      >
        <span
          className={cn(
            'inline-block h-3.5 w-3.5 rounded-full bg-white shadow',
            'transition-transform duration-200',
            checked ? 'translate-x-5' : 'translate-x-1'
          )}
        />
      </button>
    </div>
  )
}
