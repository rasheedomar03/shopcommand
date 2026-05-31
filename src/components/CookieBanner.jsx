import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'

export function CookieBanner() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const consent = localStorage.getItem('sc_cookie_consent')
    if (!consent) setVisible(true)
  }, [])

  const accept = () => {
    localStorage.setItem('sc_cookie_consent', 'accepted')
    localStorage.setItem('sc_cookie_preferences', JSON.stringify({
      essential: true,
      analytics: true,
      functional: true,
    }))
    setVisible(false)
  }

  const decline = () => {
    localStorage.setItem('sc_cookie_consent', 'declined')
    localStorage.setItem('sc_cookie_preferences', JSON.stringify({
      essential: true,
      analytics: false,
      functional: false,
    }))
    setVisible(false)
  }

  if (!visible) return null

  return (
    <div role="region" aria-label="Cookie consent" className="fixed bottom-0 left-0 right-0 z-[100] p-4 flex justify-center">
      <div className="max-w-2xl w-full bg-[#13141f] border border-white/[0.10] rounded-xl px-5 py-4 flex flex-col sm:flex-row items-start sm:items-center gap-4 shadow-2xl">
        <p className="text-white/60 text-xs leading-relaxed flex-1">
          We use cookies to keep you logged in and improve the product. See our{' '}
          <Link to="/cookies" className="text-orange-400 hover:underline">Cookie Policy</Link>.
        </p>
        <div className="flex gap-2 flex-shrink-0">
          <Link
            to="/cookies"
            className="h-7 px-3 rounded-md border border-white/10 text-white/60 hover:text-white/90 text-xs font-medium transition-colors inline-flex items-center"
          >
            Manage
          </Link>
          <button
            onClick={decline}
            className="h-7 px-3 rounded-md border border-white/10 text-white/60 hover:text-white/90 text-xs font-medium transition-colors"
          >
            Decline
          </button>
          <button
            onClick={accept}
            className="h-7 px-4 rounded-md bg-orange-500 hover:bg-orange-400 text-white text-xs font-semibold transition-colors"
          >
            Accept all
          </button>
        </div>
      </div>
    </div>
  )
}
