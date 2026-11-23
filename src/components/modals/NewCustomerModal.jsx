import { useState } from 'react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { useData } from '@/contexts/DataContext'
import { sanitizeField } from '@/lib/utils'

// Add a customer without making a repair order or an invoice first. A customer is a
// company or a person; they can then have invoices, trucks and credit on account.
// onCreated(customer) is called with the saved customer.
export function NewCustomerModal({ open, onClose, onCreated, initialName = '' }) {
  const { addCustomer } = useData()
  const [form, setForm] = useState({ name: initialName, phone: '', email: '', address: '' })
  const [error, setError] = useState(null)
  const [saving, setSaving] = useState(false)

  const set = (k) => (e) => { setForm(f => ({ ...f, [k]: e.target.value })); setError(null) }

  const submit = async (e) => {
    e.preventDefault()
    const name = sanitizeField(form.name, 100).trim()
    const email = sanitizeField(form.email, 200).trim()
    if (name.length < 2) { setError('Enter the customer or company name'); return }
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { setError('That email address does not look right'); return }
    setSaving(true)
    setError(null)
    try {
      const body = { name }
      const phone = sanitizeField(form.phone, 30).trim()
      const address = sanitizeField(form.address, 300).trim()
      if (phone) body.phone = phone
      if (email) body.email = email
      if (address) body.address = address
      const cust = await addCustomer(body)
      setForm({ name: '', phone: '', email: '', address: '' })
      onCreated?.(cust)
      onClose()
    } catch (err) {
      setError(err.message || 'Could not save the customer')
    }
    setSaving(false)
  }

  return (
    <Modal open={open} onClose={onClose} title="New customer" subtitle="A person or a company" size="sm">
      <form onSubmit={submit} noValidate className="p-5 space-y-3">
        <Input label="Name *" value={form.name} onChange={set('name')} placeholder="Zain Freight LLC" autoFocus />
        <Input label="Phone" value={form.phone} onChange={set('phone')} placeholder="(713) 555-0142" type="tel" />
        <Input label="Email" value={form.email} onChange={set('email')} placeholder="So you can email them invoices" type="email" />
        <Input label="Address" value={form.address} onChange={set('address')} placeholder="Optional" />
        {error && <p className="text-xs text-status-red">{error}</p>}
        <div className="flex justify-end gap-2 pt-1">
          <Button type="button" variant="secondary" size="sm" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button type="submit" size="sm" disabled={saving}>{saving ? 'Saving…' : 'Add customer'}</Button>
        </div>
      </form>
    </Modal>
  )
}
