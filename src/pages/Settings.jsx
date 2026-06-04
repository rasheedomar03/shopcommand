import { useState } from 'react'
import { Building2, Bell, Shield, CreditCard, Users, UserPlus, ChevronRight, Phone, MessageSquare, Pencil, Check, X, Clock, Calendar, Plus, Trash2, Target, Info } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { useData } from '@/contexts/DataContext'
import { useAuth } from '@/contexts/AuthContext'
import { cn, sanitizeField } from '@/lib/utils'
import { startCheckout } from '@/lib/billing'

const SECTIONS = [
  { id: 'profile', label: 'Account', icon: Users },
  { id: 'team', label: 'Team Invites', icon: UserPlus },
  { id: 'notifications', label: 'Notifications', icon: Bell },
  { id: 'locations', label: 'Locations', icon: Building2 },
  { id: 'schedule', label: 'Schedule', icon: Clock },
  { id: 'security', label: 'Security', icon: Shield },
  { id: 'billing', label: 'Billing', icon: CreditCard },
]

export default function Settings() {
  const { shops, updateShop, addShop, removeShop } = useData()
  const { session } = useAuth()
  const [active, setActive] = useState('profile')
  const [saved, setSaved] = useState(false)

  const [profile, setProfile] = useState(() => {
    try {
      const raw = localStorage.getItem('sc_profile')
      if (raw) return JSON.parse(raw)
    } catch {}
    const parts = (session?.name || '').split(' ')
    return { firstName: parts[0] || '', lastName: parts.slice(1).join(' '), email: '', phone: '', businessName: '', taxId: '' }
  })

  const handleSave = async () => {
    setSaved(true)
    await new Promise(r => setTimeout(r, 1200))
    setSaved(false)
  }

  const handleProfileSave = async () => {
    const cleaned = {
      firstName:    sanitizeField(profile.firstName, 100),
      lastName:     sanitizeField(profile.lastName, 100),
      email:        sanitizeField(profile.email, 150),
      phone:        sanitizeField(profile.phone, 30),
      businessName: sanitizeField(profile.businessName, 150),
      taxId:        sanitizeField(profile.taxId, 20),
    }
    setProfile(cleaned)
    localStorage.setItem('sc_profile', JSON.stringify(cleaned))
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
            <SettingsPanel title="Account Settings" onSave={handleProfileSave} saving={saved}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input label="First Name" value={profile.firstName} onChange={e => setProfile(p => ({ ...p, firstName: e.target.value }))} placeholder="First name" />
                <Input label="Last Name" value={profile.lastName} onChange={e => setProfile(p => ({ ...p, lastName: e.target.value }))} placeholder="Last name" />
                <Input label="Email" type="email" value={profile.email} onChange={e => setProfile(p => ({ ...p, email: e.target.value }))} placeholder="you@example.com" />
                <Input label="Phone" type="tel" value={profile.phone} onChange={e => setProfile(p => ({ ...p, phone: e.target.value }))} placeholder="+1 (555) 000-0000" />
              </div>
              <div className="pt-4 border-t border-border">
                <div className="text-xs font-medium text-text-muted uppercase tracking-wider mb-3">Business</div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input label="Business Name" value={profile.businessName} onChange={e => setProfile(p => ({ ...p, businessName: e.target.value }))} placeholder="Your shop group name" />
                  <Input label="Tax ID" type="password" value={profile.taxId} onChange={e => setProfile(p => ({ ...p, taxId: e.target.value }))} placeholder="XX-XXXXXXX" />
                </div>
              </div>
            </SettingsPanel>
          )}

          {active === 'team' && (
            <TeamInvites shops={shops} session={session} />
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
            <LocationsPanel
              shops={shops}
              onUpdate={(id, patch) => updateShop(id, patch)}
              onAdd={addShop}
              onRemove={removeShop}
            />
          )}

          {active === 'schedule' && (
            <SchedulePanel shops={shops} onSave={(shopId, patch) => updateShop(shopId, patch)} />
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
              <div className="rounded-xl border border-orange/20 bg-orange/[0.04] p-5">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-8 h-8 rounded-full bg-orange/10 flex items-center justify-center flex-shrink-0">
                    <span className="text-orange font-bold text-base leading-none">✦</span>
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-text-primary">Founding Member</div>
                    <div className="text-xs text-text-muted mt-0.5">$100/mo + $50/shop · locked forever (normally $175 + $100/shop)</div>
                  </div>
                </div>
                <p className="text-xs text-text-muted leading-relaxed mb-4">
                  Billing begins at public launch. Lock in your founding rate now and your card will only be charged when we go live. You'll receive an email before your first charge.
                </p>
                {!session?.demo && (
                  <button
                    onClick={async (e) => { e.currentTarget.disabled = true; e.currentTarget.textContent = 'Redirecting to Stripe…'; await startCheckout() }}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold bg-orange text-white hover:bg-orange-600 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
                  >
                    <CreditCard size={14} />
                    Lock in $100/mo rate
                  </button>
                )}
              </div>
              <div className="rounded-lg border border-border p-4 flex items-start gap-3">
                <Info size={13} className="flex-shrink-0 mt-0.5 text-text-muted" />
                <p className="text-xs text-text-muted leading-relaxed">
                  Questions about billing? Email{' '}
                  <a href="mailto:rasheed.omar@outlook.com" className="text-orange hover:underline">rasheed.omar@outlook.com</a>
                </p>
              </div>
            </SettingsPanel>
          )}
        </div>
      </div>
    </div>
  )
}

function TeamInvites({ shops, session }) {
  const [role, setRole] = useState('tech')
  const [shopId, setShopId] = useState(shops[0]?.id || '')
  const [generatedCode, setGeneratedCode] = useState(null)
  const [loading, setLoading] = useState(false)
  const [copied, setCopied] = useState(false)

  const handleCreate = async () => {
    if (!shopId || loading) return
    setLoading(true)
    setGeneratedCode(null)

    try {
      const { api } = await import('@/lib/api')
      const data = await api('/api/onboard?action=create-invite', {
        method: 'POST',
        body: { role, shopId },
      })
      setGeneratedCode(data.code)
    } catch {
      setGeneratedCode(null)
    }
    setLoading(false)
  }

  const copyCode = () => {
    if (!generatedCode) return
    navigator.clipboard.writeText(generatedCode)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (session?.demo) {
    return (
      <div className="bg-surface border border-border rounded-lg p-5">
        <p className="text-xs text-text-muted">Invite management is disabled in demo mode.</p>
      </div>
    )
  }

  return (
    <div className="bg-surface border border-border rounded-lg overflow-hidden">
      <div className="px-5 py-4 border-b border-border">
        <h2 className="text-sm font-semibold text-text-primary">Invite Team Members</h2>
      </div>
      <div className="p-5 space-y-4">
        <p className="text-xs text-text-muted">Generate an invite code for advisors or technicians to join your shop.</p>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-text-secondary mb-1 block">Role</label>
            <select
              value={role}
              onChange={e => setRole(e.target.value)}
              className="w-full h-9 rounded-lg border border-border bg-surface px-3 text-sm text-text-primary focus:outline-none focus:border-orange"
            >
              <option value="tech">Technician</option>
              <option value="advisor">Service Advisor</option>
            </select>
          </div>
          <div>
            <label className="text-xs text-text-secondary mb-1 block">Shop</label>
            <select
              value={shopId}
              onChange={e => setShopId(e.target.value)}
              className="w-full h-9 rounded-lg border border-border bg-surface px-3 text-sm text-text-primary focus:outline-none focus:border-orange"
            >
              {shops.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
        </div>

        <button
          onClick={handleCreate}
          disabled={loading}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold bg-orange text-white hover:bg-orange-600 transition-colors disabled:opacity-50"
        >
          {loading ? 'Generating...' : 'Generate Invite Code'}
        </button>

        {generatedCode && (
          <div className="rounded-xl border border-orange/20 bg-orange/[0.04] p-4">
            <p className="text-xs text-text-muted mb-2">Share this code with your team member:</p>
            <div className="flex items-center gap-3">
              <code className="text-xl font-mono font-bold tracking-widest text-orange">{generatedCode}</code>
              <button
                onClick={copyCode}
                className="text-xs text-text-muted hover:text-orange transition-colors"
              >
                {copied ? 'Copied!' : 'Copy'}
              </button>
            </div>
            <p className="text-2xs text-text-muted mt-2">Expires in 7 days. One-time use.</p>
          </div>
        )}
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

const EMPTY_SHOP = { name: '', address: '', phone: '', twilioPhone: '', manager: '', bays: '', monthlyTarget: '' }

function LocationsPanel({ shops, onUpdate, onAdd, onRemove }) {
  const [adding, setAdding] = useState(false)
  const [draft, setDraft] = useState(EMPTY_SHOP)
  const [confirmRemove, setConfirmRemove] = useState(null)
  const [saved, setSaved] = useState(false)

  const handleAdd = () => {
    if (!draft.name.trim() || !draft.address.trim()) return
    onAdd({
      name:          sanitizeField(draft.name, 100),
      address:       sanitizeField(draft.address, 200),
      phone:         sanitizeField(draft.phone, 30),
      twilioPhone:   sanitizeField(draft.twilioPhone, 30),
      manager:       sanitizeField(draft.manager, 100),
      bays:          Number(draft.bays) || 0,
      monthlyTarget: Number(draft.monthlyTarget) || 0,
    })
    setDraft(EMPTY_SHOP)
    setAdding(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div className="bg-surface border border-border rounded-lg overflow-hidden">
      <div className="px-5 py-4 border-b border-border flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold text-text-primary">Locations</h2>
          <p className="text-xs text-text-muted mt-0.5">{shops.length} shop{shops.length !== 1 ? 's' : ''} · manage phone numbers and details</p>
        </div>
        <button
          onClick={() => { setAdding(v => !v); setDraft(EMPTY_SHOP) }}
          className={cn(
            'flex items-center gap-1.5 h-8 px-3 rounded-md text-xs font-semibold transition-all duration-150',
            adding ? 'bg-border text-text-muted' : 'bg-orange text-white hover:bg-orange/90'
          )}
        >
          <Plus size={12} />
          {adding ? 'Cancel' : 'Add Location'}
        </button>
      </div>

      {/* Add form */}
      {adding && (
        <div className="p-5 border-b border-border space-y-4">
          <div className="text-xs font-medium text-text-muted uppercase tracking-wider mb-1">New Location</div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Input
              label="Shop Name *"
              value={draft.name}
              onChange={e => setDraft(d => ({ ...d, name: e.target.value }))}
              placeholder="e.g. North Houston Auto"
            />
            <Input
              label="Manager Name"
              value={draft.manager}
              onChange={e => setDraft(d => ({ ...d, manager: e.target.value }))}
              placeholder="e.g. Marcus Webb"
            />
            <div className="md:col-span-2">
              <Input
                label="Address *"
                value={draft.address}
                onChange={e => setDraft(d => ({ ...d, address: e.target.value }))}
                placeholder="e.g. 8421 N Sam Houston Pkwy, Houston, TX 77044"
              />
            </div>
            <Input
              label="Business Phone"
              type="tel"
              value={draft.phone}
              onChange={e => setDraft(d => ({ ...d, phone: e.target.value }))}
              placeholder="+1 (281) 555-0100"
            />
            <Input
              label="SMS / Twilio Number"
              type="tel"
              value={draft.twilioPhone}
              onChange={e => setDraft(d => ({ ...d, twilioPhone: e.target.value }))}
              placeholder="+17135550100"
            />
            <Input
              label="Number of Bays"
              type="number"
              value={draft.bays}
              onChange={e => setDraft(d => ({ ...d, bays: e.target.value }))}
              placeholder="e.g. 8"
            />
            <Input
              label="Monthly Revenue Target ($)"
              type="number"
              value={draft.monthlyTarget}
              onChange={e => setDraft(d => ({ ...d, monthlyTarget: e.target.value }))}
              placeholder="e.g. 100000"
            />
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <button
              onClick={() => { setAdding(false); setDraft(EMPTY_SHOP) }}
              className="h-8 px-4 rounded-md border border-border text-xs font-medium text-text-secondary hover:text-text-primary transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleAdd}
              disabled={!draft.name.trim() || !draft.address.trim()}
              className="h-8 px-4 rounded-md bg-orange text-white text-xs font-semibold hover:bg-orange/90 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              Add Location
            </button>
          </div>
        </div>
      )}

      {saved && (
        <div className="px-5 py-2 bg-status-green/10 border-b border-status-green/20 text-xs text-status-green font-medium">
          ✓ Location added successfully
        </div>
      )}

      {/* Shop list */}
      <div className="divide-y divide-border">
        {shops.map(shop => (
          <ShopLocationCard key={shop.id} shop={shop} onUpdate={onUpdate} onRemove={() => setConfirmRemove(shop.id)} />
        ))}
      </div>

      {/* Remove confirm */}
      {confirmRemove && (() => {
        const shop = shops.find(s => s.id === confirmRemove)
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
            <div className="bg-surface border border-border rounded-xl p-6 max-w-sm w-full shadow-xl">
              <div className="text-sm font-semibold text-text-primary mb-1">Remove location?</div>
              <p className="text-xs text-text-muted mb-5">
                <span className="font-medium text-text-primary">{shop?.name}</span> will be removed from your account. This can't be undone.
              </p>
              <div className="flex gap-2 justify-end">
                <button
                  onClick={() => setConfirmRemove(null)}
                  className="h-8 px-4 rounded-md border border-border text-xs font-medium text-text-secondary hover:text-text-primary transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => { onRemove(confirmRemove); setConfirmRemove(null) }}
                  className="h-8 px-4 rounded-md bg-status-red/10 border border-status-red/30 text-xs font-semibold text-status-red hover:bg-status-red/20 transition-colors"
                >
                  Remove Location
                </button>
              </div>
            </div>
          </div>
        )
      })()}
    </div>
  )
}

function ShopLocationCard({ shop, onUpdate, onRemove }) {
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState({ name: shop.name || '', address: shop.address || '', phone: shop.phone || '' })
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    setSaving(true)
    await onUpdate(shop.id, {
      name: sanitizeField(form.name, 100),
      address: sanitizeField(form.address, 300),
      phone: sanitizeField(form.phone, 30),
    })
    setSaving(false)
    setEditing(false)
  }

  return (
    <div className="group p-4 relative">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex-1 min-w-0">
          {editing ? (
            <div className="space-y-2.5">
              <Input
                label="Shop Name"
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                placeholder="Shop name"
              />
              <Input
                label="Address"
                value={form.address}
                onChange={e => setForm(f => ({ ...f, address: e.target.value }))}
                placeholder="123 Main St, City, State ZIP"
              />
              <Input
                label="Phone"
                type="tel"
                value={form.phone}
                onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                placeholder="+1 (555) 000-0000"
              />
              <div className="flex items-center gap-2 pt-1">
                <button
                  onClick={handleSave}
                  disabled={!form.name.trim() || saving}
                  className="h-7 px-3 rounded-md bg-orange text-white text-xs font-semibold hover:bg-orange/90 disabled:opacity-40 transition-colors"
                >
                  {saving ? 'Saving...' : 'Save'}
                </button>
                <button
                  onClick={() => { setEditing(false); setForm({ name: shop.name || '', address: shop.address || '', phone: shop.phone || '' }) }}
                  className="h-7 px-3 rounded-md border border-border text-xs text-text-muted hover:text-text-primary transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <>
              <div className="text-sm font-semibold text-text-primary">{shop.name}</div>
              <div className="text-xs text-text-muted mt-0.5">{shop.address || 'No address set'}</div>
              {shop.phone && <div className="text-xs text-text-muted mt-0.5">{shop.phone}</div>}
            </>
          )}
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {!editing && (
            <>
              <button
                onClick={() => setEditing(true)}
                className="w-6 h-6 rounded-md flex items-center justify-center text-text-muted hover:text-orange hover:bg-orange/10 transition-all opacity-0 group-hover:opacity-100"
                title="Edit location"
              >
                <Pencil size={12} />
              </button>
              <button
                onClick={onRemove}
                className="w-6 h-6 rounded-md flex items-center justify-center text-text-muted hover:text-status-red hover:bg-status-red/10 transition-all opacity-0 group-hover:opacity-100"
                title="Remove location"
              >
                <Trash2 size={12} />
              </button>
            </>
          )}
        </div>
      </div>
      {!editing && (
        <>
          <div className="grid grid-cols-2 gap-3">
            <ShopPhoneField field="phone" icon={Phone} iconClass="text-text-muted" label="Business Phone" shop={shop} onSave={(patch) => onUpdate(shop.id, patch)} />
            <ShopPhoneField field="twilioPhone" icon={MessageSquare} iconClass="text-orange" label="SMS Number" shop={shop} onSave={(patch) => onUpdate(shop.id, patch)} />
          </div>
          <ShopTargetField shop={shop} onSave={(patch) => onUpdate(shop.id, patch)} />
        </>
      )}
    </div>
  )
}

function ShopPhoneField({ field, icon: Icon, iconClass, label, shop, onSave }) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState('')

  const startEdit = () => { setDraft(shop[field] || ''); setEditing(true) }
  const commit = () => { if (draft.trim()) onSave({ [field]: sanitizeField(draft, 30) }); setEditing(false) }
  const cancel = () => setEditing(false)

  return (
    <div className="flex items-center gap-2 rounded-md bg-surface border border-border px-3 py-2">
      <Icon size={12} className={cn('flex-shrink-0', iconClass)} />
      <div className="flex-1 min-w-0">
        <div className="text-2xs text-text-muted uppercase tracking-wider font-medium mb-0.5">{label}</div>
        {editing ? (
          <div className="flex items-center gap-1">
            <input
              autoFocus
              value={draft}
              onChange={e => setDraft(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') commit(); if (e.key === 'Escape') cancel() }}
              className="flex-1 min-w-0 text-xs bg-background border border-orange rounded px-1.5 py-0.5 text-text-primary focus:outline-none"
            />
            <button onClick={commit} className="text-status-green hover:opacity-70 flex-shrink-0"><Check size={12} /></button>
            <button onClick={cancel} className="text-text-muted hover:text-text-primary flex-shrink-0"><X size={12} /></button>
          </div>
        ) : (
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-text-primary font-medium truncate">{shop[field] || <span className="text-text-muted italic">Not set</span>}</span>
            <button onClick={startEdit} className="text-text-muted hover:text-orange flex-shrink-0"><Pencil size={10} /></button>
          </div>
        )}
      </div>
    </div>
  )
}

function ShopTargetField({ shop, onSave }) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState('')

  const startEdit = () => { setDraft(String(shop.monthlyTarget || '')); setEditing(true) }
  const commit = () => {
    const val = Number(draft)
    if (!isNaN(val) && val >= 0) onSave({ monthlyTarget: val })
    setEditing(false)
  }
  const cancel = () => setEditing(false)

  const formatted = shop.monthlyTarget
    ? `$${Number(shop.monthlyTarget).toLocaleString()}/mo`
    : null

  return (
    <div className="flex items-center gap-2 rounded-md bg-surface border border-border px-3 py-2 mt-1">
      <Target size={12} className="flex-shrink-0 text-orange" />
      <div className="flex-1 min-w-0">
        <div className="text-2xs text-text-muted uppercase tracking-wider font-medium mb-0.5">Monthly Revenue Target</div>
        {editing ? (
          <div className="flex items-center gap-1">
            <span className="text-xs text-text-muted">$</span>
            <input
              autoFocus
              type="number"
              min="0"
              value={draft}
              onChange={e => setDraft(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') commit(); if (e.key === 'Escape') cancel() }}
              className="flex-1 min-w-0 text-xs bg-background border border-orange rounded px-1.5 py-0.5 text-text-primary focus:outline-none"
              placeholder="e.g. 100000"
            />
            <button onClick={commit} className="text-status-green hover:opacity-70 flex-shrink-0"><Check size={12} /></button>
            <button onClick={cancel} className="text-text-muted hover:text-text-primary flex-shrink-0"><X size={12} /></button>
          </div>
        ) : (
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-text-primary font-medium truncate">
              {formatted || <span className="text-text-muted italic">Not set</span>}
            </span>
            <button onClick={startEdit} className="text-text-muted hover:text-orange flex-shrink-0"><Pencil size={10} /></button>
          </div>
        )}
      </div>
    </div>
  )
}

const DAYS = [
  { key: 'mon', label: 'Monday' },
  { key: 'tue', label: 'Tuesday' },
  { key: 'wed', label: 'Wednesday' },
  { key: 'thu', label: 'Thursday' },
  { key: 'fri', label: 'Friday' },
  { key: 'sat', label: 'Saturday' },
  { key: 'sun', label: 'Sunday' },
]

const DEFAULT_HOURS = {
  mon: { open: '08:00', close: '18:00', closed: false },
  tue: { open: '08:00', close: '18:00', closed: false },
  wed: { open: '08:00', close: '18:00', closed: false },
  thu: { open: '08:00', close: '18:00', closed: false },
  fri: { open: '08:00', close: '18:00', closed: false },
  sat: { open: '09:00', close: '14:00', closed: false },
  sun: { open: '09:00', close: '14:00', closed: true },
}

function SchedulePanel({ shops, onSave }) {
  const [activeShop, setActiveShop] = useState(shops[0]?.id)
  const shop = shops.find(s => s.id === activeShop)
  const [draft, setDraft]   = useState(() => ({
    hours:             shop?.hours             || DEFAULT_HOURS,
    clockInBufferMins: shop?.clockInBufferMins ?? 15,
    maxShiftHours:     shop?.maxShiftHours     ?? 12,
    maxShiftAction:    shop?.maxShiftAction    || 'alert',
  }))
  const [saved, setSaved] = useState(false)

  const switchShop = (id) => {
    const s = shops.find(x => x.id === id)
    setActiveShop(id)
    setDraft({
      hours:             s?.hours             || DEFAULT_HOURS,
      clockInBufferMins: s?.clockInBufferMins ?? 15,
      maxShiftHours:     s?.maxShiftHours     ?? 12,
      maxShiftAction:    s?.maxShiftAction    || 'alert',
    })
    setSaved(false)
  }

  const setDay = (key, field, value) => {
    setDraft(d => ({
      ...d,
      hours: { ...d.hours, [key]: { ...d.hours[key], [field]: value } },
    }))
  }

  const handleSave = async () => {
    onSave(activeShop, {
      hours:             draft.hours,
      clockInBufferMins: draft.clockInBufferMins,
      maxShiftHours:     draft.maxShiftHours,
      maxShiftAction:    draft.maxShiftAction,
    })
    setSaved(true)
    await new Promise(r => setTimeout(r, 1500))
    setSaved(false)
  }

  return (
    <div className="bg-surface border border-border rounded-lg overflow-hidden">
      <div className="px-5 py-4 border-b border-border">
        <h2 className="text-sm font-semibold text-text-primary">Schedule & Clock Rules</h2>
        <p className="text-xs text-text-muted mt-0.5">Set shop hours and configure when techs can clock in</p>
      </div>

      {/* Shop tabs */}
      {shops.length > 1 && (
        <div className="px-5 pt-4 flex gap-2 flex-wrap">
          {shops.map(s => (
            <button
              key={s.id}
              onClick={() => switchShop(s.id)}
              className={cn(
                'h-7 px-3 rounded-md text-xs font-medium transition-all duration-150',
                activeShop === s.id
                  ? 'bg-orange-subtle text-orange'
                  : 'text-text-muted hover:text-text-primary hover:bg-background border border-border'
              )}
            >
              {s.name.split(' ').slice(0, 2).join(' ')}
            </button>
          ))}
        </div>
      )}

      <div className="p-5 space-y-6">
        {/* Hours grid */}
        <div>
          <div className="text-xs font-medium text-text-muted uppercase tracking-wider mb-3 flex items-center gap-2">
            <Calendar size={12} />
            Shop Hours
          </div>
          <div className="rounded-lg border border-border overflow-hidden">
            <div className="hidden sm:grid grid-cols-[120px_1fr_1fr_80px] gap-0 text-2xs text-text-muted font-medium uppercase tracking-wider px-4 py-2 bg-background border-b border-border">
              <span>Day</span>
              <span>Opens</span>
              <span>Closes</span>
              <span className="text-center">Status</span>
            </div>
            {DAYS.map(({ key, label }) => {
              const day = draft.hours[key] || { open: '08:00', close: '18:00', closed: false }
              return (
                <div key={key} className="grid sm:grid-cols-[120px_1fr_1fr_80px] grid-cols-[1fr_auto] items-center gap-3 px-4 py-3 border-b border-border last:border-0">
                  <span className={cn('text-sm font-medium col-span-1', day.closed ? 'text-text-muted' : 'text-text-primary')}>
                    {label}
                  </span>
                  <div className="hidden sm:flex items-center gap-2">
                    <input
                      type="time"
                      value={day.open || '08:00'}
                      disabled={day.closed}
                      onChange={e => setDay(key, 'open', e.target.value)}
                      className="h-7 rounded-md border border-border bg-background px-2 text-xs text-text-primary focus:outline-none focus:border-orange disabled:opacity-40 disabled:cursor-not-allowed"
                    />
                  </div>
                  <div className="hidden sm:flex items-center gap-2">
                    <input
                      type="time"
                      value={day.close || '18:00'}
                      disabled={day.closed}
                      onChange={e => setDay(key, 'close', e.target.value)}
                      className="h-7 rounded-md border border-border bg-background px-2 text-xs text-text-primary focus:outline-none focus:border-orange disabled:opacity-40 disabled:cursor-not-allowed"
                    />
                  </div>
                  {/* Mobile: show open–close inline */}
                  <div className="sm:hidden flex items-center gap-1 text-xs text-text-muted col-start-1">
                    {day.closed ? '—' : `${day.open} – ${day.close}`}
                  </div>
                  <div className="flex justify-end sm:justify-center">
                    <button
                      onClick={() => setDay(key, 'closed', !day.closed)}
                      className={cn(
                        'text-2xs px-2 py-1 rounded-md font-medium border transition-colors',
                        day.closed
                          ? 'border-border text-text-muted hover:border-orange/40 hover:text-orange'
                          : 'border-status-green/30 bg-status-green/10 text-status-green hover:bg-status-green/20'
                      )}
                    >
                      {day.closed ? 'Closed' : 'Open'}
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Clock-in rules */}
        <div>
          <div className="text-xs font-medium text-text-muted uppercase tracking-wider mb-3 flex items-center gap-2">
            <Clock size={12} />
            Clock-In Rules
          </div>
          <div className="rounded-lg border border-border divide-y divide-border">
            {/* Buffer */}
            <div className="flex items-center justify-between px-4 py-3 gap-4">
              <div>
                <div className="text-sm text-text-primary">Early clock-in window</div>
                <div className="text-xs text-text-muted mt-0.5">How many minutes before opening techs are allowed to clock in</div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <input
                  type="number"
                  min="0"
                  max="60"
                  value={draft.clockInBufferMins}
                  onChange={e => setDraft(d => ({ ...d, clockInBufferMins: Math.max(0, Math.min(60, Number(e.target.value))) }))}
                  className="w-16 h-7 rounded-md border border-border bg-background px-2 text-xs text-center text-text-primary focus:outline-none focus:border-orange"
                />
                <span className="text-xs text-text-muted">min</span>
              </div>
            </div>

            {/* Max shift */}
            <div className="flex items-center justify-between px-4 py-3 gap-4">
              <div>
                <div className="text-sm text-text-primary">Maximum shift length</div>
                <div className="text-xs text-text-muted mt-0.5">Flag or auto-clock-out techs who exceed this limit</div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <input
                  type="number"
                  min="4"
                  max="24"
                  value={draft.maxShiftHours}
                  onChange={e => setDraft(d => ({ ...d, maxShiftHours: Math.max(4, Math.min(24, Number(e.target.value))) }))}
                  className="w-16 h-7 rounded-md border border-border bg-background px-2 text-xs text-center text-text-primary focus:outline-none focus:border-orange"
                />
                <span className="text-xs text-text-muted">hrs</span>
              </div>
            </div>

            {/* Action */}
            <div className="px-4 py-3">
              <div className="text-sm text-text-primary mb-1">When max shift is exceeded</div>
              <div className="text-xs text-text-muted mb-3">Choose how ShopCommand responds when a tech goes over the limit</div>
              <div className="flex flex-col gap-2">
                {[
                  { value: 'alert',       label: 'Alert only',       sub: 'Flag the entry in the audit log for your review' },
                  { value: 'auto-clockout', label: 'Auto clock-out', sub: 'Automatically clock the tech out and flag it in the audit log' },
                ].map(opt => (
                  <label key={opt.value} className="flex items-start gap-3 cursor-pointer">
                    <div className="relative flex-shrink-0 mt-0.5">
                      <input
                        type="radio"
                        name={`maxShiftAction-${activeShop}`}
                        value={opt.value}
                        checked={draft.maxShiftAction === opt.value}
                        onChange={() => setDraft(d => ({ ...d, maxShiftAction: opt.value }))}
                        className="sr-only"
                      />
                      <div className={cn(
                        'w-4 h-4 rounded-full border-2 flex items-center justify-center transition-colors',
                        draft.maxShiftAction === opt.value ? 'border-orange' : 'border-border'
                      )}>
                        {draft.maxShiftAction === opt.value && (
                          <div className="w-2 h-2 rounded-full bg-orange" />
                        )}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs font-medium text-text-primary">{opt.label}</div>
                      <div className="text-2xs text-text-muted">{opt.sub}</div>
                    </div>
                  </label>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex justify-end px-5 py-4 border-t border-border bg-background/40">
        <button
          onClick={handleSave}
          disabled={saved}
          className={cn(
            'h-8 px-4 rounded-md text-xs font-semibold transition-all duration-150',
            saved
              ? 'bg-status-green/10 border border-status-green/30 text-status-green'
              : 'bg-orange text-white hover:bg-orange/90'
          )}
        >
          {saved ? '✓ Saved' : 'Save Changes'}
        </button>
      </div>
    </div>
  )
}
