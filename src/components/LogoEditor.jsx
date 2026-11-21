import { useState } from 'react'
import { Upload, Trash2 } from 'lucide-react'
import { logoFromFile, clampLogoSize, LOGO_SIZE_MIN, LOGO_SIZE_MAX, LOGO_SIZE_DEFAULT } from '@/lib/shopLogo'

/**
 * Pick a shop logo and the size it prints at. The picture is shrunk in the
 * browser; `onChange({ logo, logoWidth, logoChanged })` reports the new values.
 * The preview sits on white because invoices print on white paper.
 */
export function LogoEditor({ logo, width, onChange }) {
  const [error, setError] = useState(null)
  const [busy, setBusy] = useState(false)
  const size = clampLogoSize(width || LOGO_SIZE_DEFAULT)

  const pick = async (e) => {
    const file = e.target.files?.[0]
    e.target.value = '' // lets the same file be picked again
    if (!file) return
    setBusy(true)
    setError(null)
    const r = await logoFromFile(file)
    setBusy(false)
    if (r.error) { setError(r.error); return }
    onChange({ logo: r.src, logoWidth: size, logoChanged: true })
  }

  return (
    <div className="space-y-2">
      <div className="text-2xs font-semibold text-text-muted uppercase tracking-wider">Logo (prints on invoices)</div>
      {logo ? (
        <div className="rounded-md border border-border bg-white p-3">
          <img src={logo} alt="Your logo" style={{ width: size, maxWidth: '100%', height: 'auto' }} />
        </div>
      ) : (
        <div className="rounded-md border border-dashed border-border px-3 py-4 text-xs text-text-muted">No logo yet. Choose a picture to add one.</div>
      )}
      <div className="flex items-center gap-2 flex-wrap">
        <label className="inline-flex items-center gap-1.5 h-7 px-3 rounded-md border border-border text-xs text-text-primary hover:bg-surface cursor-pointer">
          <Upload size={12} /> {busy ? 'Reading...' : logo ? 'Change picture' : 'Choose picture'}
          <input type="file" accept="image/png,image/jpeg,image/webp" className="sr-only" onChange={pick} disabled={busy} />
        </label>
        {logo && (
          <button
            type="button"
            onClick={() => onChange({ logo: null, logoWidth: size, logoChanged: true })}
            className="inline-flex items-center gap-1.5 h-7 px-3 rounded-md border border-status-red/30 text-xs text-status-red hover:bg-status-red/10"
          >
            <Trash2 size={12} /> Remove logo
          </button>
        )}
      </div>
      {logo && (
        <label className="block text-xs text-text-secondary">
          Printed size: {size}px wide
          <input
            type="range"
            min={LOGO_SIZE_MIN}
            max={LOGO_SIZE_MAX}
            step={5}
            value={size}
            onChange={e => onChange({ logo, logoWidth: clampLogoSize(e.target.value), logoChanged: false })}
            className="mt-1 w-full"
            aria-label="Logo printed size"
          />
        </label>
      )}
      {error && <p className="text-xs font-medium text-status-red" role="alert">{error}</p>}
      <p className="text-2xs text-text-muted">PNG, JPEG or WebP. A wide picture works best. Shown at the top of printed and saved invoices.</p>
    </div>
  )
}
