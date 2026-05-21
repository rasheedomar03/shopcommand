import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Building2, Wrench, ClipboardList, ChevronDown } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { useData } from '@/contexts/DataContext'
import { shops } from '@/data/mock'
import { cn } from '@/lib/utils'

function HexMark({ size = 32 }) {
  const pts = (cx, cy, r) =>
    [90, 30, -30, -90, -150, 150]
      .map(deg => {
        const a = (deg * Math.PI) / 180
        return `${(cx + r * Math.cos(a)).toFixed(2)},${(cy - r * Math.sin(a)).toFixed(2)}`
      })
      .join(' ')
  const R = 28, r = R * 0.56
  return (
    <svg width={size} height={size} viewBox="0 0 64 64">
      <polygon points={pts(32, 32, R)} fill="#F97316" />
      <polygon points={pts(32, 32.5, r)} fill="#0D0E14" />
    </svg>
  )
}

export default function Login() {
  const { login } = useAuth()
  const { technicians } = useData()
  const navigate = useNavigate()
  const [role, setRole] = useState(null)          // null | 'owner' | 'advisor' | 'tech'
  const [selectedTechId, setSelectedTechId] = useState('')
  const [selectedShopId, setSelectedShopId] = useState('')

  const handleOwner = () => {
    login('owner', null, 'Rasheed Omar')
    navigate('/dashboard')
  }

  const handleAdvisor = () => {
    if (!selectedShopId) return
    login('advisor', null, 'Alex Rivera', Number(selectedShopId))
    navigate('/dashboard')
  }

  const handleTech = () => {
    if (!selectedTechId) return
    const tech = technicians.find(t => t.id === Number(selectedTechId))
    login('tech', Number(selectedTechId), tech?.name || 'Technician')
    navigate('/tech-board')
  }

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6">

      {/* Logo */}
      <div className="flex items-center gap-3 mb-10">
        <HexMark size={32} />
        <span
          className="text-2xl font-semibold tracking-tight"
          style={{ fontFamily: '"Bricolage Grotesque", system-ui, sans-serif', letterSpacing: '-0.02em' }}
        >
          <span className="text-text-primary">Shop</span>
          <span className="text-orange">Command</span>
        </span>
      </div>

      {/* Card */}
      <div className="w-full max-w-sm">
        <div className="text-center mb-6">
          <h1 className="text-lg font-semibold text-text-primary">Who are you?</h1>
          <p className="text-xs text-text-muted mt-1">Select your role to continue</p>
        </div>

        {/* Role cards */}
        <div className="space-y-3 mb-6">

          {/* Owner card */}
          <button
            onClick={() => setRole('owner')}
            className={cn(
              'w-full text-left rounded-xl border p-4 transition-all duration-150',
              role === 'owner'
                ? 'border-orange bg-orange/5 shadow-[0_0_16px_rgba(249,115,22,0.1)]'
                : 'border-border bg-surface hover:border-border-hover'
            )}
          >
            <div className="flex items-center gap-3">
              <div className={cn(
                'w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors',
                role === 'owner' ? 'bg-orange/15' : 'bg-border'
              )}>
                <Building2 size={18} className={role === 'owner' ? 'text-orange' : 'text-text-muted'} />
              </div>
              <div>
                <div className="text-sm font-semibold text-text-primary">Owner / Manager</div>
                <div className="text-xs text-text-muted">Full dashboard access · All locations</div>
              </div>
              <div className={cn(
                'ml-auto w-4 h-4 rounded-full border-2 flex-shrink-0 transition-colors',
                role === 'owner' ? 'border-orange bg-orange' : 'border-border'
              )}>
                {role === 'owner' && (
                  <svg className="w-full h-full" viewBox="0 0 16 16">
                    <polyline points="3,8 6.5,11.5 13,5" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </div>
            </div>
          </button>

          {/* Advisor card */}
          <button
            onClick={() => setRole('advisor')}
            className={cn(
              'w-full text-left rounded-xl border p-4 transition-all duration-150',
              role === 'advisor'
                ? 'border-orange bg-orange/5 shadow-[0_0_16px_rgba(249,115,22,0.1)]'
                : 'border-border bg-surface hover:border-border-hover'
            )}
          >
            <div className="flex items-center gap-3">
              <div className={cn(
                'w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors',
                role === 'advisor' ? 'bg-orange/15' : 'bg-border'
              )}>
                <ClipboardList size={18} className={role === 'advisor' ? 'text-orange' : 'text-text-muted'} />
              </div>
              <div>
                <div className="text-sm font-semibold text-text-primary">Service Advisor</div>
                <div className="text-xs text-text-muted">ROs · Customers · Invoicing · Payments</div>
              </div>
              <div className={cn(
                'ml-auto w-4 h-4 rounded-full border-2 flex-shrink-0 transition-colors',
                role === 'advisor' ? 'border-orange bg-orange' : 'border-border'
              )}>
                {role === 'advisor' && (
                  <svg className="w-full h-full" viewBox="0 0 16 16">
                    <polyline points="3,8 6.5,11.5 13,5" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </div>
            </div>
          </button>

          {/* Tech card */}
          <button
            onClick={() => setRole('tech')}
            className={cn(
              'w-full text-left rounded-xl border p-4 transition-all duration-150',
              role === 'tech'
                ? 'border-orange bg-orange/5 shadow-[0_0_16px_rgba(249,115,22,0.1)]'
                : 'border-border bg-surface hover:border-border-hover'
            )}
          >
            <div className="flex items-center gap-3">
              <div className={cn(
                'w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors',
                role === 'tech' ? 'bg-orange/15' : 'bg-border'
              )}>
                <Wrench size={18} className={role === 'tech' ? 'text-orange' : 'text-text-muted'} />
              </div>
              <div>
                <div className="text-sm font-semibold text-text-primary">Technician</div>
                <div className="text-xs text-text-muted">Job board · Clock in/out · Your ROs only</div>
              </div>
              <div className={cn(
                'ml-auto w-4 h-4 rounded-full border-2 flex-shrink-0 transition-colors',
                role === 'tech' ? 'border-orange bg-orange' : 'border-border'
              )}>
                {role === 'tech' && (
                  <svg className="w-full h-full" viewBox="0 0 16 16">
                    <polyline points="3,8 6.5,11.5 13,5" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </div>
            </div>
          </button>
        </div>

        {/* Advisor shop picker */}
        {role === 'advisor' && (
          <div className="mb-5 animate-fade-in">
            <label className="block text-xs font-medium text-text-muted mb-1.5">
              Which location are you at?
            </label>
            <div className="relative">
              <select
                value={selectedShopId}
                onChange={e => setSelectedShopId(e.target.value)}
                className="w-full h-10 rounded-lg border border-border bg-surface pl-3 pr-8 text-sm text-text-primary focus:outline-none focus:border-orange focus:ring-1 focus:ring-orange/30 appearance-none [&>option]:bg-surface"
              >
                <option value="">Select your shop…</option>
                {shops.map(s => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
              <ChevronDown size={13} className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none" />
            </div>
          </div>
        )}

        {/* Tech picker (shown when tech role selected) */}
        {role === 'tech' && (
          <div className="mb-5 animate-fade-in">
            <label className="block text-xs font-medium text-text-muted mb-1.5">
              Which technician are you?
            </label>
            <div className="relative">
              <select
                value={selectedTechId}
                onChange={e => setSelectedTechId(e.target.value)}
                className="w-full h-10 rounded-lg border border-border bg-surface pl-3 pr-8 text-sm text-text-primary focus:outline-none focus:border-orange focus:ring-1 focus:ring-orange/30 appearance-none [&>option]:bg-surface"
              >
                <option value="">Select your name…</option>
                {technicians.map(t => {
                  const s = shops.find(sh => sh.id === t.shopId)
                  return (
                    <option key={t.id} value={t.id}>
                      {t.name} — {s?.name}
                    </option>
                  )
                })}
              </select>
              <ChevronDown size={13} className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none" />
            </div>
          </div>
        )}

        {/* CTA */}
        {role === 'owner' && (
          <button
            onClick={handleOwner}
            className="w-full h-11 rounded-lg bg-orange text-white text-sm font-semibold hover:bg-orange/90 active:scale-[0.98] transition-all duration-150"
          >
            Enter Dashboard →
          </button>
        )}

        {role === 'advisor' && (
          <button
            onClick={handleAdvisor}
            disabled={!selectedShopId}
            className="w-full h-11 rounded-lg bg-orange text-white text-sm font-semibold hover:bg-orange/90 active:scale-[0.98] transition-all duration-150 disabled:opacity-40 disabled:cursor-not-allowed disabled:active:scale-100"
          >
            Enter Dashboard →
          </button>
        )}

        {role === 'tech' && (
          <button
            onClick={handleTech}
            disabled={!selectedTechId}
            className="w-full h-11 rounded-lg bg-orange text-white text-sm font-semibold hover:bg-orange/90 active:scale-[0.98] transition-all duration-150 disabled:opacity-40 disabled:cursor-not-allowed disabled:active:scale-100"
          >
            Clock In & Open Board →
          </button>
        )}
      </div>
    </div>
  )
}
