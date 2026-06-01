import { useState } from 'react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Input, Select } from '@/components/ui/Input'
import { useData } from '@/contexts/DataContext'

const LEVELS = ['Junior', 'Mid', 'Senior', 'Master']
const SPECIALTIES = [
  'Engine & Drivetrain',
  'Electrical & Diagnostics',
  'Brakes & Suspension',
  'Transmission',
  'Maintenance',
  'HVAC & Electrical',
  'General Repair',
  'Diagnostics',
  'Hybrid / EV',
]
const CERTS = ['ASE A1', 'ASE A2', 'ASE A4', 'ASE A5', 'ASE A6', 'ASE A7', 'ASE L1', 'ASE L3', 'ASE Master', 'BMW Certified', 'Ford Certified', 'GM Service', 'Toyota Certified', 'ATRA', 'Hybrid/EV']

export function NewTechModal({ open, onClose }) {
  const { addTechnician, shops } = useData()
  const [form, setForm] = useState({
    name: '',
    shopId: '',
    specialty: '',
    level: 'Junior',
    certifications: [],
    status: 'clocked-out',
    efficiency: 80,
  })
  const [errors, setErrors] = useState({})
  const [submitting, setSubmitting] = useState(false)

  const set = (field) => (e) => {
    setForm(f => ({ ...f, [field]: e.target.value }))
    if (errors[field]) setErrors(er => ({ ...er, [field]: undefined }))
  }

  const toggleCert = (cert) => {
    setForm(f => ({
      ...f,
      certifications: f.certifications.includes(cert)
        ? f.certifications.filter(c => c !== cert)
        : [...f.certifications, cert],
    }))
  }

  const validate = () => {
    const e = {}
    if (!form.name.trim()) e.name = 'Name required'
    if (!form.shopId) e.shopId = 'Assign a shop'
    if (!form.specialty) e.specialty = 'Select a specialty'
    return e
  }

  const handleSubmit = async (ev) => {
    ev.preventDefault()
    const errs = validate()
    if (Object.keys(errs).length) { setErrors(errs); return }
    setSubmitting(true)
    await new Promise(r => setTimeout(r, 600))
    addTechnician({ ...form, shopId: Number(form.shopId), efficiency: Number(form.efficiency) })
    setSubmitting(false)
    onClose()
    setForm({ name: '', shopId: '', specialty: '', level: 'Junior', certifications: [], status: 'clocked-out', efficiency: 80 })
    setErrors({})
  }

  return (
    <Modal open={open} onClose={onClose} title="New Technician" subtitle="Add a team member account" size="md">
      <form onSubmit={handleSubmit} noValidate>
        <div className="p-5 space-y-4">

          <Input
            label="Full Name *"
            placeholder="Andre Jackson"
            value={form.name}
            onChange={set('name')}
            error={errors.name}
          />

          <div className="grid grid-cols-2 gap-4">
            <Select label="Shop *" value={form.shopId} onChange={set('shopId')} error={errors.shopId}>
              <option value="">Select shop…</option>
              {shops.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </Select>
            <Select label="Level" value={form.level} onChange={set('level')}>
              {LEVELS.map(l => <option key={l} value={l}>{l}</option>)}
            </Select>
          </div>

          <Select label="Specialty *" value={form.specialty} onChange={set('specialty')} error={errors.specialty}>
            <option value="">Select specialty…</option>
            {SPECIALTIES.map(s => <option key={s} value={s}>{s}</option>)}
          </Select>

          {/* Certifications */}
          <div>
            <div className="text-xs font-medium text-text-secondary mb-2">Certifications</div>
            <div className="flex flex-wrap gap-1.5">
              {CERTS.map(cert => (
                <button
                  key={cert}
                  type="button"
                  onClick={() => toggleCert(cert)}
                  className={`text-xs px-2.5 py-1 rounded-full border transition-all duration-100 ${
                    form.certifications.includes(cert)
                      ? 'bg-orange/10 border-orange/40 text-orange'
                      : 'border-border text-text-muted hover:border-border-hover hover:text-text-secondary'
                  }`}
                >
                  {cert}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 px-5 py-4 border-t border-border bg-background/50">
          <Button variant="secondary" type="button" onClick={onClose}>Cancel</Button>
          <Button type="submit" loading={submitting}>Create Account</Button>
        </div>
      </form>
    </Modal>
  )
}
