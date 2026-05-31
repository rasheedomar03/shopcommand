import { useState, useEffect } from 'react'
import { Analytics } from '@vercel/analytics/react'
import { SpeedInsights } from '@vercel/speed-insights/react'

/**
 * Only loads Vercel Analytics and Speed Insights if the user has consented.
 * Checks both the legacy sc_cookie_consent key and the new granular preferences.
 */
export function ConsentGatedAnalytics() {
  const [allowed, setAllowed] = useState(false)

  useEffect(() => {
    try {
      const prefs = localStorage.getItem('sc_cookie_preferences')
      if (prefs) {
        const parsed = JSON.parse(prefs)
        setAllowed(parsed.analytics === true)
        return
      }
      // Fallback to legacy consent key
      const consent = localStorage.getItem('sc_cookie_consent')
      setAllowed(consent === 'accepted')
    } catch {
      setAllowed(false)
    }
  }, [])

  // Re-check when storage changes (e.g., user updates preferences on cookie page)
  useEffect(() => {
    const handler = (e) => {
      if (e.key === 'sc_cookie_preferences' || e.key === 'sc_cookie_consent') {
        try {
          const prefs = localStorage.getItem('sc_cookie_preferences')
          if (prefs) {
            setAllowed(JSON.parse(prefs).analytics === true)
          } else {
            setAllowed(localStorage.getItem('sc_cookie_consent') === 'accepted')
          }
        } catch {
          setAllowed(false)
        }
      }
    }
    window.addEventListener('storage', handler)
    return () => window.removeEventListener('storage', handler)
  }, [])

  if (!allowed) return null

  return (
    <>
      <Analytics />
      <SpeedInsights />
    </>
  )
}
