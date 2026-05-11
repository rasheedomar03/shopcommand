import { useState } from 'react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Input, Textarea, Select } from '@/components/ui/Input'
import { shops, technicians } from '@/data/mock'
import { RO_STAGES } from '@/lib/utils'

export function NewROModal({ open, onClose, preShopId, preCustomerName = '', preCustomerPhone = '' }) {
  const [form, setForm] = useState({
    shopId: preShopId || '',
    customerName: preCustomerName,
    customerPhone: preCustomerPhone,
    vehicle: '',
    year: '',
    make: '',
    model: '',
    mileage: '',
    techId: '',
    complaint: '',
    stage: 'Estimate',
  })
  const [submitting, setSubmitting] = useState(false)
  const [errors, setErrors] = useState({})

  const availableTechs = technicians.filter(t => String(t.shopId) === String(form.shopId))

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
    if (Object.keys(errs).length) {
      setErrors(errs)
      return
    }
    setSubmitting(true)
    // Simulate API call
    await new Promise(r => setTimeout(r, 800))
    setSubmitting(false)
    onClose()
    setForm({ shopId: preShopId || '', customerName: preCustomerName, customerPhone: preCustomerPhone, vehicle: '', year: '', make: '', model: '', mileage: '', techId: '', complaint: '', stage: 'Estimate' })
    setErrors({})
  }

  const set = (field) => (e) => {
    setForm(f => ({ ...f, [field]: e.target.value }))
    if (errors[field]) setErrors(er => ({ ...er, [field]: undefined }))
  }

  return (
    <Modal open={open} onClose={onClose} title="New Repair Order" subtitle="Create a new job ticket" size="lg">
      <form onSubmit={handleSubmit} noValidate>
        <div className="p-5 space-y-5">

          {/* Shop & Stage */}
          <div className="grid grid-cols-2 gap-4">
            <Select label="Shop *" value={form.shopId} onChange={set('shopId')} error={errors.shopId}>
              <option value="">Select shop…</option>
              {shops.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </Select>
            <Select label="Initial Stage" value={form.stage} onChange={set('stage')}>
              {RO_STAGES.map(s => <option key={s} value={s}>{s}</option>)}
            </Select>
          </div>

          {/* Customer */}
          <div className="space-y-3">
            <div className="text-xs font-medium text-text-muted uppercase tracking-wider">Customer</div>
            <div className="grid grid-cols-2 gap-4">
              <Input label="Full Name *" placeholder="Gerald Hutchins" value={form.customerName} onChange={set('customerName')} error={errors.customerName} />
              <Input label="Phone" placeholder="+1 (713) 881-4472" value={form.customerPhone} onChange={set('customerPhone')} type="tel" />
            </div>
          </div>

          {/* Vehicle */}
          <div className="space-y-3">
            <div className="text-xs font-medium text-text-muted uppercase tracking-wider">Vehicle *</div>
            <div className="grid grid-cols-3 gap-3">
              <Input label="Year" placeholder="2019" value={form.year} onChange={set('year')} error={errors.vehicle} />
              <Input label="Make" placeholder="Ford" value={form.make} onChange={set('make')} />
              <Input label="Model" placeholder="F-150" value={form.model} onChange={set('model')} />
            </div>
            <Input label="Mileage" placeholder="87,422" value={form.mileage} onChange={set('mileage')} />
          </div>

          {/* Technician */}
          <Select label="Assign Technician" value={form.techId} onChange={set('techId')} helper="Select a shop first to see available techs">
            <option value="">Unassigned</option>
            {availableTechs.map(t => (
              <option key={t.id} value={t.id}>{t.name} — {t.specialty}</option>
            ))}
          </Select>

          {/* Complaint */}
          <Textarea
            label="Customer Concern *"
            placeholder="Describe what the customer reported…"
            value={form.complaint}
            onChange={set('complaint')}
            error={errors.complaint}
            rows={3}
          />
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-5 py-4 border-t border-border bg-background/50">
          <Button variant="secondary" type="button" onClick={onClose}>Cancel</Button>
          <Button type="submit" loading={submitting}>Create RO</Button>
        </div>
      </form>
    </Modal>
  )
}
