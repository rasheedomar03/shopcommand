import { useState } from 'react'
import { Bug, X } from 'lucide-react'

const CONTACT_EMAIL = 'rasheed.omar@outlook.com'

export function BugReportButton() {
  const [open, setOpen] = useState(false)

  const currentPage = typeof window !== 'undefined' ? window.location.pathname : ''

  const subject = encodeURIComponent(`[Bug Report] ShopCommand — ${currentPage}`)
  const body = encodeURIComponent(
    `Hi Rasheed,\n\nI found a bug on ShopCommand.\n\n` +
    `Page: ${currentPage}\n` +
    `Browser: ${navigator.userAgent}\n\n` +
    `What happened:\n\n\n` +
    `What I expected:\n\n\n` +
    `Steps to reproduce:\n1. \n2. \n3. \n`
  )

  const mailtoLink = `mailto:${CONTACT_EMAIL}?subject=${subject}&body=${body}`

  return (
    <>
      {/* Floating trigger button */}
      <button
        onClick={() => setOpen(o => !o)}
        aria-label={open ? 'Close bug report' : 'Report a bug'}
        className="fixed bottom-5 right-5 z-[9999] flex items-center gap-2 px-3.5 py-2.5 rounded-full bg-slate-900 text-white shadow-lg hover:bg-slate-800 transition-all text-sm font-medium group"
      >
        {open ? <X size={16} /> : <Bug size={16} />}
        <span className="hidden sm:inline">{open ? 'Close' : 'Report a bug'}</span>
      </button>

      {/* Popover */}
      {open && (
        <div className="fixed bottom-16 right-5 z-[9999] w-80 rounded-xl border border-slate-200 bg-white shadow-2xl p-5 animate-in fade-in slide-in-from-bottom-2">
          <div className="flex items-center gap-2 mb-3">
            <Bug size={18} className="text-orange-500" />
            <h3 className="text-sm font-semibold text-slate-900">Report a Bug</h3>
          </div>
          <p className="text-xs text-slate-500 mb-4 leading-relaxed">
            Found something broken? We're in early access and every bug report helps us build a better product. Your email opens pre-filled with useful context.
          </p>
          <a
            href={mailtoLink}
            onClick={() => setOpen(false)}
            className="block w-full text-center px-4 py-2.5 rounded-lg bg-orange-500 hover:bg-orange-600 text-white text-sm font-medium transition-colors"
          >
            Open email to report →
          </a>
          <p className="text-[11px] text-slate-400 mt-3 text-center">
            Goes directly to Rasheed — no ticket queue
          </p>
        </div>
      )}
    </>
  )
}
