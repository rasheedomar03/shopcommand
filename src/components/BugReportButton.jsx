import { useState, useRef } from 'react'
import { Bug, X, Send, CheckCircle } from 'lucide-react'

export function BugReportButton() {
  const [open, setOpen] = useState(false)
  const [status, setStatus] = useState('idle') // idle | sending | sent | error
  const [description, setDescription] = useState('')
  const textareaRef = useRef(null)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!description.trim()) return

    setStatus('sending')

    try {
      const payload = {
        description: description.trim(),
        page: window.location.pathname,
        url: window.location.href,
        userAgent: navigator.userAgent,
        screenWidth: window.innerWidth,
        screenHeight: window.innerHeight,
        timestamp: new Date().toISOString(),
      }

      const res = await fetch('/api/health?action=bug-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (!res.ok) throw new Error('Failed to submit')

      setStatus('sent')
      setDescription('')
      setTimeout(() => { setStatus('idle'); setOpen(false) }, 2000)
    } catch {
      setStatus('error')
      setTimeout(() => setStatus('idle'), 3000)
    }
  }

  return (
    <>
      {/* Floating trigger button */}
      <button
        onClick={() => { setOpen(o => !o); setStatus('idle') }}
        aria-label={open ? 'Close bug report' : 'Report a bug'}
        className="fixed bottom-5 right-5 z-[9999] flex items-center gap-2 px-3.5 py-2.5 rounded-full bg-slate-900 text-white shadow-lg hover:bg-slate-800 transition-all text-sm font-medium"
      >
        {open ? <X size={16} /> : <Bug size={16} />}
        <span className="hidden sm:inline">{open ? 'Close' : 'Report a bug'}</span>
      </button>

      {/* Popover form */}
      {open && (
        <div className="fixed bottom-16 right-5 z-[9999] w-80 rounded-xl border border-slate-200 bg-white shadow-2xl p-5">
          <div className="flex items-center gap-2 mb-3">
            <Bug size={18} className="text-orange-500" />
            <h3 className="text-sm font-semibold text-slate-900">Report a Bug</h3>
          </div>

          {status === 'sent' ? (
            <div className="flex flex-col items-center py-4 gap-2">
              <CheckCircle size={28} className="text-emerald-500" />
              <p className="text-sm text-slate-700 font-medium">Thanks! Bug reported.</p>
              <p className="text-xs text-slate-400">Rasheed will look into it.</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit}>
              <p className="text-xs text-slate-500 mb-3 leading-relaxed">
                Found something broken? Describe what happened and we'll fix it.
              </p>
              <textarea
                ref={textareaRef}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="What went wrong? What did you expect to happen?"
                rows={4}
                maxLength={2000}
                required
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-400 placeholder:text-slate-400"
              />
              <div className="flex items-center justify-between mt-3">
                <span className="text-[11px] text-slate-400">
                  {status === 'error' ? 'Failed — try again' : `Page: ${window.location.pathname}`}
                </span>
                <button
                  type="submit"
                  disabled={status === 'sending' || !description.trim()}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-orange-500 hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium transition-colors"
                >
                  <Send size={14} />
                  {status === 'sending' ? 'Sending...' : 'Submit'}
                </button>
              </div>
              <p className="text-[11px] text-slate-400 mt-2 text-center">
                Goes directly to Rasheed — no ticket queue
              </p>
            </form>
          )}
        </div>
      )}
    </>
  )
}
