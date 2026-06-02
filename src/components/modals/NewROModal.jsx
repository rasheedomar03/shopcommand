import { useState } from 'react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Input, Textarea, Select } from '@/components/ui/Input'
import { useData } from '@/contexts/DataContext'
import { RO_STAGES, sanitizeVin, sanitizeField } from '@/lib/utils'
import { Search, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

export function NewROModal({
  open,
  onClose,
  preShopId,
  preTechId,
  preCustomerName = '',
  preCustomerPhone = '',
  defaultDate,
  onCreated,
}) {
  const { technicians, addRepairOrder, shops, customers } = useData()

  const [form, setForm] = useState({
    shopId: preShopId || '',
    customerId: null,
    customerName: preCustomerName,
    customerPhone: preCustomerPhone,
    vin: '',
    vehicle: '',
    year: '',
    make: '',
    model: '',
    trim: '',
    mileage: '',
    techId: preTechId || '',
    complaint: '',
    stage: preTechId ? 'In Progress' : 'Estimate',
    scheduledAt: defaultDate ? new Date(defaultDate).toISOString().slice(0, 16) : '',
  })
  const [submitting, setSubmitting] = useState(false)
  const [errors, setErrors] = useState({})
  const [vinState, setVinState] = useState('idle') // 'idle' | 'loading' | 'ok' | 'error'
  const [vinError, setVinError] = useState('')
  const [custSuggestions, setCustSuggestions] = useState([])
  const [showSuggestions, setShowSuggestions] = useState(false)

  const availableTechs = technicians.filter(t => String(t.shopId) === String(form.shopId))

  const decodeVin = async (vin) => {
    const clean = sanitizeVin(vin)
    if (clean.length !== 17) {
      setVinState('error')
      setVinError('VIN must be 17 characters')
      return
    }
    setVinState('loading')
    setVinError('')
    try {
      const res = await fetch(`https://vpic.nhtsa.dot.gov/api/vehicles/DecodeVinValues/${clean}?format=json`)
      const data = await res.json()
      const r = data.Results?.[0]
      if (!r || !r.Make || !r.ModelYear) {
        setVinState('error')
        setVinError('VIN not found — enter vehicle details manually')
        return
      }
      setForm(f => ({
        ...f,
        vin: clean,
        year:  r.ModelYear || f.year,
        make:  r.Make ? r.Make.charAt(0) + r.Make.slice(1).toLowerCase() : f.make,
        model: r.Model || f.model,
        trim:  r.Trim  || f.trim,
      }))
      setVinState('ok')
      if (errors.vehicle) setErrors(er => ({ ...er, vehicle: undefined }))
    } catch {
      setVinState('error')
      setVinError('Decode failed — check your connection')
    }
  }
  const isLocked = !!preTechId // tech creating their own RO — shop + tech are fixed

  const validate = () => {
    const e = {}
    if (!form.shopId) e.shopId = 'Select a shop'
    if (!form.customerName.trim()) e.customerName = 'Customer name required'
    if (!form.year || !form.make || !form.model) e.vehicle = 'Enter year, make, and model'
    if (!form.complaint.trim()) e.complaint = 'Describe the customer concern'
    return e
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const errs = validate()
    if (Object.keys(errs).length) { setErrors(errs); return }
    setSubmitting(true)
    await new Promise(r => setTimeout(r, 600))

    const tech = technicians.find(t => String(t.id) === String(form.techId))
    const cleanName  = sanitizeField(form.customerName, 100)
    const cleanPhone = sanitizeField(form.customerPhone, 30)
    const cleanYear  = sanitizeField(form.year, 4)
    const cleanMake  = sanitizeField(form.make, 50)
    const cleanModel = sanitizeField(form.model, 50)
    const cleanTrim  = sanitizeField(form.trim, 50)
    const cleanComplaint = sanitizeField(form.complaint, 1000)
    const vehicle = `${cleanYear} ${cleanMake} ${cleanModel}`.trim()

    try {
      await addRepairOrder({
        shopId: form.shopId,
        customerId: form.customerId,
        techId: form.techId || null,
        complaint: cleanComplaint,
        scheduledAt: form.scheduledAt ? new Date(form.scheduledAt).toISOString() : null,
      })
    } catch (err) {
      setErrors({ submit: err.message || 'Failed to create repair order' })
      setSubmitting(false)
      return
    }

    setSubmitting(false)
    onClose()
    setForm({
      shopId: preShopId || '',
      customerId: null,
      customerName: preCustomerName,
      customerPhone: preCustomerPhone,
      vin: '',
      vehicle: '',
      year: '',
      make: '',
      model: '',
      trim: '',
      mileage: '',
      techId: preTechId || '',
      complaint: '',
      stage: preTechId ? 'In Progress' : 'Estimate',
      scheduledAt: '',
    })
    setErrors({})
    setVinState('idle')
    setVinError('')
    onCreated?.(newRO)
  }

  const set = (field) => (e) => {
    setForm(f => ({ ...f, [field]: e.target.value }))
    if (errors[field]) setErrors(er => ({ ...er, [field]: undefined }))
  }

  return (
    <Modal open={open} onClose={onClose} title="New Repair Order" subtitle="Create a new job ticket" size="lg">
      <form onSubmit={handleSubmit} noValidate>
        <div className="p-5 space-y-5">

          {/* Shop & Stage — hidden when tech is locked to a shop */}
          {!isLocked && (
            <div className="grid grid-cols-2 gap-4">
              <Select label="Shop *" value={form.shopId} onChange={set('shopId')} error={errors.shopId}>
                <option value="">Select shop…</option>
                {shops.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </Select>
              <Select label="Initial Stage" value={form.stage} onChange={set('stage')}>
                {RO_STAGES.map(s => <option key={s} value={s}>{s}</option>)}
              </Select>
            </div>
          )}

          {/* Customer */}
          <div className="space-y-3">
            <div className="text-xs font-medium text-text-muted uppercase tracking-wider">Customer</div>
            <div className="grid grid-cols-2 gap-4">
              {/* Name with autocomplete */}
              <div className="relative">
                <label className="block text-xs font-medium text-text-secondary mb-1">Full Name *</label>
                <input
                  value={form.customerName}
                  onChange={e => {
                    const val = e.target.value
                    setForm(f => ({ ...f, customerName: val, customerId: null }))
                    if (errors.customerName) setErrors(er => ({ ...er, customerName: undefined }))
                    const q = val.trim().toLowerCase()
                    if (q.length >= 1) {
                      const matches = customers.filter(c => c.name.toLowerCase().includes(q)).slice(0, 5)
                      setCustSuggestions(matches)
                      setShowSuggestions(matches.length > 0)
                    } else {
                      setShowSuggestions(false)
                    }
                  }}
                  onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
                  onFocus={() => {
                    if (custSuggestions.length > 0) setShowSuggestions(true)
                  }}
                  placeholder="Gerald Hutchins"
                  className={cn(
                    'w-full h-9 rounded-lg border bg-surface px-3 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-1 focus:border-orange focus:ring-orange/20 transition-colors',
                    errors.customerName ? 'border-red-500' : 'border-border'
                  )}
                />
                {errors.customerName && <p className="text-xs text-red-500 mt-1">{errors.customerName}</p>}
                {showSuggestions && (
                  <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-surface border border-border rounded-lg shadow-xl overflow-hidden">
                    {custSuggestions.map(c => (
                      <button
                        key={c.id}
                        type="button"
                        onMouseDown={() => {
                          setForm(f => ({ ...f, customerName: c.name, customerPhone: c.phone, customerId: c.id }))
                          setShowSuggestions(false)
                          if (errors.customerName) setErrors(er => ({ ...er, customerName: undefined }))
                        }}
                        className="w-full flex items-center justify-between px-3 py-2 hover:bg-background text-left transition-colors border-b border-border/50 last:border-0"
                      >
                        <div>
                          <div className="text-sm font-medium text-text-primary">{c.name}</div>
                          <div className="text-xs text-text-muted">{c.phone}</div>
                        </div>
                        <div className="text-2xs text-text-muted flex-shrink-0 ml-2">{c.roCount} visits</div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <Input label="Phone" placeholder="+1 (713) 881-4472" value={form.customerPhone} onChange={set('customerPhone')} type="tel" />
            </div>
          </div>

          {/* Vehicle */}
          <div className="space-y-3">
            <div className="text-xs font-medium text-text-muted uppercase tracking-wider">Vehicle *</div>

            {/* VIN lookup */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-text-secondary">VIN</label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <input
                    value={form.vin}
                    onChange={e => {
                      const val = e.target.value.toUpperCase().replace(/[^A-HJ-NPR-Z0-9]/g, '')
                      setForm(f => ({ ...f, vin: val }))
                      if (vinState !== 'idle') setVinState('idle')
                    }}
                    onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); decodeVin(form.vin) } }}
                    placeholder="Enter 17-character VIN"
                    maxLength={17}
                    className={cn(
                      'w-full h-9 rounded-lg border bg-surface px-3 text-sm font-mono text-text-primary placeholder:text-text-muted placeholder:font-sans focus:outline-none focus:ring-1 transition-colors',
                      vinState === 'ok'    ? 'border-status-green focus:border-status-green focus:ring-status-green/20' :
                      vinState === 'error' ? 'border-status-red focus:border-status-red focus:ring-red-500/20' :
                                            'border-border focus:border-orange focus:ring-orange/20'
                    )}
                  />
                  {vinState === 'ok' && (
                    <CheckCircle2 size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-status-green pointer-events-none" />
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => decodeVin(form.vin)}
                  disabled={vinState === 'loading' || form.vin.length < 17}
                  className="h-9 px-3.5 rounded-lg border border-border text-xs font-medium text-text-secondary hover:text-orange hover:border-orange/40 disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center gap-1.5 flex-shrink-0"
                >
                  {vinState === 'loading'
                    ? <Loader2 size={13} className="animate-spin" />
                    : <Search size={13} />
                  }
                  {vinState === 'loading' ? 'Decoding…' : 'Decode'}
                </button>
              </div>
              {vinState === 'ok' && (
                <p className="text-xs text-status-green flex items-center gap-1">
                  <CheckCircle2 size={11} /> Vehicle decoded — fields auto-filled below
                </p>
              )}
              {vinState === 'error' && (
                <p className="text-xs text-red-500 flex items-center gap-1">
                  <AlertCircle size={11} /> {vinError}
                </p>
              )}
            </div>

            <div className="grid grid-cols-3 gap-3">
              <Input label="Year" placeholder="2019" value={form.year} onChange={set('year')} error={errors.vehicle} />
              <Input label="Make" placeholder="Ford" value={form.make} onChange={set('make')} />
              <Input label="Model" placeholder="F-150" value={form.model} onChange={set('model')} />
            </div>
            {form.trim && (
              <Input label="Trim" value={form.trim} onChange={set('trim')} placeholder="e.g. XLT, Lariat" />
            )}
            <Input label="Mileage" placeholder="87,422" value={form.mileage} onChange={set('mileage')} />
          </div>

          {/* Technician — hidden when tech is creating their own RO */}
          {!isLocked && (
            <Select label="Assign Technician" value={form.techId} onChange={set('techId')} helper="Select a shop first to see available techs">
              <option value="">Unassigned</option>
              {availableTechs.map(t => (
                <option key={t.id} value={t.id}>{t.name} — {t.specialty}</option>
              ))}
            </Select>
          )}

          {/* Complaint */}
          <Textarea
            label="Customer Concern *"
            placeholder="Describe what the customer reported…"
            value={form.complaint}
            onChange={set('complaint')}
            error={errors.complaint}
            rows={3}
          />

          {/* Schedule — only show when opened from Appointments page */}
          {defaultDate != null && (
            <Input
              label="Schedule Appointment"
              type="datetime-local"
              value={form.scheduledAt}
              onChange={set('scheduledAt')}
            />
          )}
        </div>

        <div className="flex items-center justify-end gap-3 px-5 py-4 border-t border-border bg-background/50">
          <Button variant="secondary" type="button" onClick={onClose}>Cancel</Button>
          <Button type="submit" loading={submitting}>Create RO</Button>
        </div>
      </form>
    </Modal>
  )
}
