import { useState } from 'react'
import { Check, Copy } from 'lucide-react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Input, Select } from '@/components/ui/Input'
import { useData } from '@/contexts/DataContext'
import { useAuth } from '@/contexts/AuthContext'
import { api } from '@/lib/api'

// Technicians join via invite codes — the only path that gives them a real
// login and a working TechBoard. (The old version of this modal posted a
// payload the API always rejected, then closed as if it had succeeded.)

export function NewTechModal({ open, onClose }) {
  const { shops } = useData()
  const { session } = useAuth()
  const [form, setForm] = useState({ name: '', shopId: '' })
  const [errors, setErrors] = useState({})
  const [submitting, setSubmitting] = useState(false)
  const [inviteCode, setInviteCode] = useState(null)
  const [copied, setCopied] = useState(false)
  const [apiError, setApiError] = useState('')

  const set = (field) => (e) => {
    setForm(f => ({ ...f, [field]: e.target.value }))
    if (errors[field]) setErrors(er => ({ ...er, [field]: undefined }))
  }

  const reset = () => {
    setForm({ name: '', shopId: '' })
    setErrors({})
    setInviteCode(null)
    setCopied(false)
    setApiError('')
  }

  const handleSubmit = async (ev) => {
    ev.preventDefault()
    const errs = {}
    if (!form.shopId) errs.shopId = 'Assign a shop'
    if (Object.keys(errs).length) { setErrors(errs); return }
    setSubmitting(true)
    setApiError('')
    try {
      const data = await api('/api/onboard?action=create-invite', {
        method: 'POST',
        body: { role: 'tech', shopId: form.shopId },
      })
      setInviteCode(data.code)
    } catch (err) {
      setApiError(err.message || 'Could not create invite — try again')
    }
    setSubmitting(false)
  }

  const copyCode = () => {
    if (!inviteCode) return
    navigator.clipboard.writeText(inviteCode)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const shopName = shops.find(s => String(s.id) === String(form.shopId))?.name

  return (
    <Modal open={open} onClose={() => { reset(); onClose() }} title="Invite a Technician" subtitle="They get their own login and Tech Board" size="md">
      {session?.demo ? (
        <div className="p-5">
          <p className="text-sm text-text-muted">
            Technician invites are disabled in demo mode. In a real account, this
            generates a one-time code your tech uses to sign up — they land on
            their own Tech Board with a time clock and their assigned jobs.
          </p>
          <div className="flex justify-end pt-4">
            <Button variant="secondary" onClick={onClose}>Close</Button>
          </div>
        </div>
      ) : inviteCode ? (
        <div className="p-5 space-y-4">
          <div className="rounded-lg border border-status-green/30 bg-status-green/5 p-4 text-center">
            <div className="text-xs text-text-muted mb-1.5">One-time invite code{form.name ? ` for ${form.name}` : ''}{shopName ? ` · ${shopName}` : ''}</div>
            <div className="text-2xl font-bold tracking-widest text-text-primary tabular-nums">{inviteCode}</div>
          </div>
          <div className="text-xs text-text-muted leading-relaxed">
            Send this code to your technician. They sign up at{' '}
            <span className="text-text-secondary font-medium">shopcommand.net/sign-in</span>, choose
            "Technician", and enter the code. It expires in 7 days and works once.
          </div>
          <div className="flex items-center justify-end gap-2">
            <Button variant="secondary" onClick={() => { reset() }}>New invite</Button>
            <Button onClick={copyCode}>
              {copied ? <><Check size={13} /> Copied</> : <><Copy size={13} /> Copy code</>}
            </Button>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} noValidate>
          <div className="p-5 space-y-4">
            <Input
              label="Technician name (optional)"
              placeholder="Andre Jackson"
              value={form.name}
              onChange={set('name')}
              helper="Just for your reference on the code screen — their profile comes from their signup"
            />
            <Select label="Shop *" value={form.shopId} onChange={set('shopId')} error={errors.shopId}>
              <option value="">Select shop…</option>
              {shops.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </Select>
            {apiError && (
              <div className="px-3 py-2 rounded-lg bg-status-red/10 border border-status-red/20 text-xs text-status-red">
                {apiError}
              </div>
            )}
          </div>
          <div className="flex items-center justify-end gap-3 px-5 py-4 border-t border-border bg-background/50">
            <Button variant="secondary" type="button" onClick={() => { reset(); onClose() }}>Cancel</Button>
            <Button type="submit" loading={submitting}>Generate invite code</Button>
          </div>
        </form>
      )}
    </Modal>
  )
}
