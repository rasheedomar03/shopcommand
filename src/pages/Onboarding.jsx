import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useUser, useAuth as useClerkAuth } from '@clerk/clerk-react'
import { Building2, ClipboardList, Wrench, ArrowLeft, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

const roles = [
  {
    id: 'owner',
    label: 'Owner / Manager',
    description: 'I own the shop and want to set up my business',
    icon: Building2,
    redirect: '/dashboard',
  },
  {
    id: 'advisor',
    label: 'Service Advisor',
    description: 'My shop owner gave me an invite code',
    icon: ClipboardList,
    redirect: '/dashboard',
  },
  {
    id: 'tech',
    label: 'Technician',
    description: 'My shop owner gave me an invite code',
    icon: Wrench,
    redirect: '/tech-board',
  },
]

export default function Onboarding() {
  const { user } = useUser()
  const { getToken } = useClerkAuth()
  const navigate = useNavigate()
  const [selected, setSelected] = useState(null)
  const [step, setStep] = useState('role')
  const [shopName, setShopName] = useState('')
  const [inviteCode, setInviteCode] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  const handleRoleContinue = async () => {
    if (!selected) return
    setError(null)

    if (selected === 'owner') {
      // Check if org already exists — skip shop name if so
      setSaving(true)
      try {
        const token = await getToken()
        const res = await fetch('/api/onboard?action=check', {
          headers: { Authorization: `Bearer ${token}` },
        })
        const data = await res.json()
        if (res.ok && data.exists && data.orgId) {
          await user.update({
            unsafeMetadata: { role: 'owner', onboarded: true, orgId: data.orgId, shopId: data.shopId },
          })
          navigate('/dashboard', { replace: true })
          return
        }
      } catch {}
      setSaving(false)
      setStep('shop')
    } else {
      setStep('invite')
    }
  }

  const handleOwnerSubmit = async () => {
    if (!shopName.trim() || shopName.trim().length < 2 || saving) return
    setSaving(true)
    setError(null)

    try {
      const token = await getToken()
      const res = await fetch('/api/onboard', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ role: 'owner', shopName: shopName.trim() }),
      })

      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Something went wrong')
        setSaving(false)
        return
      }

      // Set metadata on client side to ensure it persists
      await user.update({
        unsafeMetadata: {
          role: 'owner',
          onboarded: true,
          orgId: data.orgId,
          shopId: data.shopId,
        },
      })
      navigate('/dashboard', { replace: true })
    } catch {
      setError('Network error. Please try again.')
      setSaving(false)
    }
  }

  const handleInviteSubmit = async () => {
    if (inviteCode.length < 8 || saving) return
    setSaving(true)
    setError(null)

    try {
      const token = await getToken()
      const res = await fetch('/api/onboard', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ role: selected, inviteCode: inviteCode.trim() }),
      })

      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Invalid invite code')
        setSaving(false)
        return
      }

      await user.update({
        unsafeMetadata: {
          role: data.role,
          onboarded: true,
          orgId: data.orgId,
          shopId: data.shopId,
        },
      })
      navigate(data.role === 'tech' ? '/tech-board' : '/dashboard', { replace: true })
    } catch {
      setError('Network error. Please try again.')
      setSaving(false)
    }
  }

  return (
    <main className="min-h-screen bg-background flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-sm">
        {step === 'role' && (
          <>
            <div className="text-center mb-6">
              <h1 className="text-lg font-semibold text-text-primary">Welcome to ShopCommand</h1>
              <p className="text-xs text-text-muted mt-1">What's your role?</p>
            </div>

            <div className="space-y-3 mb-6">
              {roles.map(({ id, label, description, icon: Icon }) => (
                <button
                  key={id}
                  onClick={() => setSelected(id)}
                  className={cn(
                    'w-full text-left rounded-xl border p-4 transition-all duration-150',
                    selected === id
                      ? 'border-orange bg-orange/5 shadow-[0_0_16px_rgba(249,115,22,0.1)]'
                      : 'border-border bg-surface hover:border-border-hover'
                  )}
                >
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      'w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors',
                      selected === id ? 'bg-orange/15' : 'bg-border'
                    )}>
                      <Icon size={18} className={selected === id ? 'text-orange' : 'text-text-muted'} />
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-text-primary">{label}</div>
                      <div className="text-xs text-text-muted">{description}</div>
                    </div>
                    <div className={cn(
                      'ml-auto w-4 h-4 rounded-full border-2 flex-shrink-0 transition-colors',
                      selected === id ? 'border-orange bg-orange' : 'border-border'
                    )}>
                      {selected === id && (
                        <svg className="w-full h-full" viewBox="0 0 16 16">
                          <polyline points="3,8 6.5,11.5 13,5" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      )}
                    </div>
                  </div>
                </button>
              ))}
            </div>

            <button
              onClick={handleRoleContinue}
              disabled={!selected}
              className="w-full h-11 rounded-lg bg-orange text-white text-sm font-semibold hover:bg-orange/90 active:scale-[0.98] transition-all duration-150 disabled:opacity-40 disabled:cursor-not-allowed disabled:active:scale-100"
            >
              Continue
            </button>
          </>
        )}

        {step === 'shop' && (
          <>
            <button
              onClick={() => { setStep('role'); setError(null) }}
              className="flex items-center gap-1.5 text-xs text-text-muted hover:text-text-secondary transition-colors mb-6"
            >
              <ArrowLeft size={14} />
              Back
            </button>

            <div className="mb-6">
              <h1 className="text-lg font-semibold text-text-primary">Name your shop</h1>
              <p className="text-xs text-text-muted mt-1">You can add more locations later.</p>
            </div>

            <input
              type="text"
              value={shopName}
              onChange={e => setShopName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleOwnerSubmit()}
              placeholder="e.g. Main Street Auto"
              maxLength={100}
              autoFocus
              className="w-full h-11 px-3 rounded-lg border border-border bg-surface text-sm text-text-primary placeholder:text-text-muted/50 focus:outline-none focus:border-orange focus:ring-2 focus:ring-orange/20 transition-all mb-4"
            />

            {error && (
              <p className="text-xs text-red-400 mb-4">{error}</p>
            )}

            <button
              onClick={handleOwnerSubmit}
              disabled={!shopName.trim() || shopName.trim().length < 2 || saving}
              className="w-full h-11 rounded-lg bg-orange text-white text-sm font-semibold hover:bg-orange/90 active:scale-[0.98] transition-all duration-150 disabled:opacity-40 disabled:cursor-not-allowed disabled:active:scale-100 flex items-center justify-center gap-2"
            >
              {saving ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Creating your shop...
                </>
              ) : (
                'Launch ShopCommand'
              )}
            </button>
          </>
        )}

        {step === 'invite' && (
          <>
            <button
              onClick={() => { setStep('role'); setError(null); setInviteCode('') }}
              className="flex items-center gap-1.5 text-xs text-text-muted hover:text-text-secondary transition-colors mb-6"
            >
              <ArrowLeft size={14} />
              Back
            </button>

            <div className="text-center mb-6">
              <div className="w-12 h-12 rounded-xl bg-border flex items-center justify-center mx-auto mb-4">
                {selected === 'advisor' ? <ClipboardList size={20} className="text-text-muted" /> : <Wrench size={20} className="text-text-muted" />}
              </div>
              <h1 className="text-lg font-semibold text-text-primary mb-2">Enter your invite code</h1>
              <p className="text-xs text-text-muted leading-relaxed">
                Your shop owner should have given you an 8-character code.
              </p>
            </div>

            <input
              type="text"
              value={inviteCode}
              onChange={e => setInviteCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8))}
              placeholder="e.g. ABCD1234"
              maxLength={8}
              className="w-full h-12 rounded-xl border border-border bg-surface px-4 text-center text-lg font-mono tracking-widest text-text-primary placeholder:text-text-muted focus:outline-none focus:border-orange focus:ring-2 focus:ring-orange/20"
            />

            {error && <p className="text-xs text-red-500 mt-2 text-center">{error}</p>}

            <button
              onClick={handleInviteSubmit}
              disabled={inviteCode.length < 8 || saving}
              className={cn(
                'w-full mt-4 h-11 rounded-xl text-sm font-semibold transition-all duration-200',
                inviteCode.length >= 8 && !saving
                  ? 'bg-orange text-white hover:bg-orange-600'
                  : 'bg-border text-text-muted cursor-not-allowed'
              )}
            >
              {saving ? <Loader2 size={16} className="animate-spin mx-auto" /> : 'Join shop'}
            </button>

            <p className="text-2xs text-text-muted text-center mt-4">
              Don't have a code? Ask your shop owner to create one from their Settings page.
            </p>
          </>
        )}
      </div>
    </main>
  )
}
