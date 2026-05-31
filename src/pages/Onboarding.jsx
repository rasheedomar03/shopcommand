import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useUser } from '@clerk/clerk-react'
import { Building2, ClipboardList, Wrench } from 'lucide-react'
import { cn } from '@/lib/utils'

const roles = [
  {
    id: 'owner',
    label: 'Owner / Manager',
    description: 'Full dashboard access across all locations',
    icon: Building2,
    redirect: '/dashboard',
  },
  {
    id: 'advisor',
    label: 'Service Advisor',
    description: 'ROs, customers, invoicing, and payments',
    icon: ClipboardList,
    redirect: '/dashboard',
  },
  {
    id: 'tech',
    label: 'Technician',
    description: 'Job board, clock in/out, your ROs only',
    icon: Wrench,
    redirect: '/tech-board',
  },
]

export default function Onboarding() {
  const { user } = useUser()
  const navigate = useNavigate()
  const [selected, setSelected] = useState(null)
  const [saving, setSaving] = useState(false)

  const handleContinue = async () => {
    if (!selected || saving) return
    setSaving(true)

    try {
      await user.update({
        unsafeMetadata: {
          ...user.unsafeMetadata,
          role: selected,
          onboarded: true,
        },
      })

      const role = roles.find(r => r.id === selected)
      navigate(role.redirect, { replace: true })
    } catch {
      setSaving(false)
    }
  }

  return (
    <main className="min-h-screen bg-background flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-sm">
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
          onClick={handleContinue}
          disabled={!selected || saving}
          className="w-full h-11 rounded-lg bg-orange text-white text-sm font-semibold hover:bg-orange/90 active:scale-[0.98] transition-all duration-150 disabled:opacity-40 disabled:cursor-not-allowed disabled:active:scale-100"
        >
          {saving ? 'Setting up...' : 'Continue →'}
        </button>
      </div>
    </main>
  )
}
