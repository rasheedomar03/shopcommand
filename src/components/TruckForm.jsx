import { useState, useEffect } from 'react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { truckName } from '@/lib/trucks'

const field = 'w-full h-9 px-2.5 rounded-md bg-background border border-border text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-1 focus:ring-orange/40'
const label = 'text-2xs font-semibold text-text-muted uppercase tracking-wider'

/**
 * Add a truck, or edit one. `onSave({ unitNumber, vehicle, vin, mileage })` returns
 * { error } to show a message and keep the window open, or nothing when it worked.
 */
export function TruckForm({ open, truck, onClose, onSave }) {
  const empty = { unitNumber: '', vehicle: '', vin: '', mileage: '' }
  const [v, setV] = useState(empty)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!open) return
    setError(null)
    setV(truck
      ? { unitNumber: truck.unitNumber || '', vehicle: truckName(truck), vin: truck.vin || '', mileage: truck.mileage != null ? String(truck.mileage) : '' }
      : empty)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, truck])

  const submit = async () => {
    if (!v.unitNumber.trim()) { setError('Give the truck a number, so you can find it later.'); return }
    setSaving(true)
    setError(null)
    const r = await onSave(v)
    setSaving(false)
    if (r?.error) setError(r.error)
  }

  return (
    <Modal open={open} onClose={onClose} title={truck ? 'Edit truck' : 'Add a truck'} subtitle="One of your own trucks" size="sm">
      <div className="p-5 space-y-3">
        <div>
          <label className={label}>Truck #</label>
          <input className={`${field} mt-1`} value={v.unitNumber} onChange={e => setV(s => ({ ...s, unitNumber: e.target.value }))} placeholder="e.g. 5500" autoFocus />
        </div>
        <div>
          <label className={label}>Year, make and model</label>
          <input className={`${field} mt-1`} value={v.vehicle} onChange={e => setV(s => ({ ...s, vehicle: e.target.value }))} placeholder="2019 Freightliner Cascadia" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={label}>VIN (optional)</label>
            <input className={`${field} mt-1 font-mono`} maxLength={17} value={v.vin} onChange={e => setV(s => ({ ...s, vin: e.target.value.toUpperCase().replace(/\s/g, '') }))} placeholder="17 characters" />
          </div>
          <div>
            <label className={label}>Mileage (optional)</label>
            <input className={`${field} mt-1`} inputMode="numeric" value={v.mileage} onChange={e => setV(s => ({ ...s, mileage: e.target.value.replace(/[^\d]/g, '') }))} placeholder="e.g. 412000" />
          </div>
        </div>
        {error && <p className="text-xs font-medium text-status-red" role="alert">{error}</p>}
        <div className="flex justify-end gap-2 pt-1">
          <Button variant="secondary" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button onClick={submit} disabled={saving}>{saving ? 'Saving...' : 'Save truck'}</Button>
        </div>
      </div>
    </Modal>
  )
}
