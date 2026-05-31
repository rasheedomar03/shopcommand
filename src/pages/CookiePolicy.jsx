import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'

function Toggle({ checked, onChange, label, description, disabled }) {
  return (
    <div className="flex items-start justify-between gap-4 py-4 border-b border-white/[0.06] last:border-b-0">
      <div className="flex-1 min-w-0">
        <p className="text-white text-sm font-medium">{label}</p>
        <p className="text-white/50 text-xs mt-1 leading-relaxed">{description}</p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => !disabled && onChange(!checked)}
        className={`relative flex-shrink-0 inline-flex h-5 w-9 items-center rounded-full transition-colors ${
          checked ? 'bg-orange-500' : 'bg-white/10'
        } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
      >
        <span className={`inline-block h-3.5 w-3.5 rounded-full bg-white shadow transition-transform ${
          checked ? 'translate-x-[18px]' : 'translate-x-[3px]'
        }`} />
      </button>
    </div>
  )
}

export default function CookiePolicy() {
  const [preferences, setPreferences] = useState({
    essential: true,
    analytics: false,
    functional: false,
  })
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    try {
      const raw = localStorage.getItem('sc_cookie_preferences')
      if (raw) {
        setPreferences(JSON.parse(raw))
      } else {
        const consent = localStorage.getItem('sc_cookie_consent')
        if (consent === 'accepted') {
          setPreferences({ essential: true, analytics: true, functional: true })
        }
      }
    } catch {}
  }, [])

  const savePreferences = () => {
    localStorage.setItem('sc_cookie_preferences', JSON.stringify(preferences))
    localStorage.setItem('sc_cookie_consent', preferences.analytics ? 'accepted' : 'declined')
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  return (
    <div className="min-h-screen bg-[#0A0B12] text-white">
      {/* Nav */}
      <nav className="flex items-center justify-between px-6 md:px-12 h-16 border-b border-white/[0.06] sticky top-0 z-50 backdrop-blur-md bg-[#0A0B12]/80">
        <Link to="/" className="flex items-center gap-2 hover:opacity-70 transition-opacity">
          <svg width="26" height="26" viewBox="0 0 64 64">
            <polygon points="32.00,4.00 56.25,18.00 56.25,46.00 32.00,60.00 7.75,46.00 7.75,18.00" fill="#F97316" />
            <polygon points="32.00,16.82 45.58,24.66 45.58,40.34 32.00,48.18 18.42,40.34 18.42,24.66" fill="#0A0B12" />
          </svg>
          <span style={{ letterSpacing: '-0.02em' }} className="text-sm font-semibold">
            Shop<span className="text-orange-500">Command</span>
          </span>
        </Link>
        <Link to="/login" className="px-4 py-1.5 rounded-lg text-sm font-semibold bg-orange-500 hover:bg-orange-400 text-white transition-colors">
          Log in
        </Link>
      </nav>

      {/* Content */}
      <div className="max-w-3xl mx-auto px-6 py-16">
        <div className="mb-10">
          <h1 style={{ letterSpacing: '-0.02em' }} className="text-3xl font-bold text-white mb-2">Cookie Policy</h1>
          <p className="text-white/40 text-sm">Last updated: May 31, 2026</p>
        </div>

        <div className="prose prose-invert prose-sm max-w-none space-y-8 text-white/70 leading-relaxed">

          <section>
            <h2 className="text-white text-base font-semibold mb-2">What are cookies?</h2>
            <p>
              Cookies are small text files stored on your device when you visit a website. They help websites remember your preferences and understand how you use the site. ShopCommand also uses localStorage (browser-based storage) for similar purposes.
            </p>
          </section>

          <section>
            <h2 className="text-white text-base font-semibold mb-2">Cookies we use</h2>

            <div className="mt-4 space-y-4">
              <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-4">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-white text-sm font-medium">Essential</p>
                  <span className="text-[10px] font-medium uppercase tracking-wider text-orange-400 bg-orange-400/10 px-2 py-0.5 rounded-full">Always active</span>
                </div>
                <p className="text-white/55 text-sm">Required for the application to function. Includes your login session, theme preference, and cookie consent choice. These cannot be disabled.</p>
                <div className="mt-3 space-y-1.5">
                  <div className="flex justify-between text-xs">
                    <span className="text-white/40 font-mono">sc_session</span>
                    <span className="text-white/30">Authentication session</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-white/40 font-mono">sc-theme</span>
                    <span className="text-white/30">Light/dark theme preference</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-white/40 font-mono">sc_cookie_consent</span>
                    <span className="text-white/30">Your cookie choice</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-white/40 font-mono">sc_cookie_preferences</span>
                    <span className="text-white/30">Granular cookie preferences</span>
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-4">
                <p className="text-white text-sm font-medium mb-2">Analytics</p>
                <p className="text-white/55 text-sm">Help us understand how users interact with the platform so we can improve it. We use Vercel Analytics, which is cookieless and privacy-friendly. No personal data is collected or shared with third parties.</p>
                <div className="mt-3 space-y-1.5">
                  <div className="flex justify-between text-xs">
                    <span className="text-white/40 font-mono">Vercel Analytics</span>
                    <span className="text-white/30">Cookieless page view tracking</span>
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-4">
                <p className="text-white text-sm font-medium mb-2">Functional</p>
                <p className="text-white/55 text-sm">Remember your in-app preferences like selected tabs, sidebar state, and local draft data. These make the app feel more responsive but are not strictly required.</p>
                <div className="mt-3 space-y-1.5">
                  <div className="flex justify-between text-xs">
                    <span className="text-white/40 font-mono">sc_tech_tab</span>
                    <span className="text-white/30">Last viewed technician tab</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-white/40 font-mono">sc_start_times</span>
                    <span className="text-white/30">Job timer start timestamps</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-white/40 font-mono">sc_week_revenue</span>
                    <span className="text-white/30">Cached revenue calculations</span>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-white text-base font-semibold mb-2">Third-party cookies</h2>
            <p>
              ShopCommand does not use any third-party advertising cookies or tracking pixels. We do not sell your data to advertisers. The only third-party service that may set cookies is Stripe (for payment processing), which sets its own strictly necessary cookies during the checkout process.
            </p>
          </section>

          <section>
            <h2 className="text-white text-base font-semibold mb-2">How long do cookies last?</h2>
            <p>
              All ShopCommand cookies and localStorage items persist until you log out, clear your browser storage, or change your preferences below. There are no time-expiring cookies set by our application.
            </p>
          </section>

          <section>
            <h2 className="text-white text-base font-semibold mb-2">How to control cookies</h2>
            <p>
              You can manage your preferences using the controls below, or through your browser settings. Most browsers allow you to block or delete cookies. Note that blocking essential cookies will prevent you from logging into ShopCommand.
            </p>
          </section>

          {/* Preferences Panel */}
          <section>
            <h2 className="text-white text-base font-semibold mb-4">Your preferences</h2>
            <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-5">
              <Toggle
                checked={preferences.essential}
                onChange={() => {}}
                disabled
                label="Essential cookies"
                description="Login, session, theme, and consent storage. Required for the app to work."
              />
              <Toggle
                checked={preferences.analytics}
                onChange={(v) => setPreferences(p => ({ ...p, analytics: v }))}
                label="Analytics"
                description="Cookieless page view tracking via Vercel Analytics. No personal data collected."
              />
              <Toggle
                checked={preferences.functional}
                onChange={(v) => setPreferences(p => ({ ...p, functional: v }))}
                label="Functional"
                description="Remember your tab selections, timer states, and cached calculations."
              />
              <div className="mt-5 flex items-center gap-3">
                <button
                  onClick={savePreferences}
                  className="px-5 py-2 rounded-lg text-sm font-semibold bg-orange-500 hover:bg-orange-400 text-white transition-colors"
                >
                  Save preferences
                </button>
                {saved && (
                  <span className="text-xs text-emerald-400 font-medium">Preferences saved</span>
                )}
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-white text-base font-semibold mb-2">Contact</h2>
            <p>
              If you have questions about our use of cookies, contact us at{' '}
              <a href="mailto:privacy@shopcommand.io" className="text-orange-400 hover:underline">privacy@shopcommand.io</a>.
            </p>
          </section>
        </div>

        {/* Footer links */}
        <div className="mt-16 pt-8 border-t border-white/[0.06] flex flex-wrap gap-6 text-xs text-white/30">
          <Link to="/privacy" className="hover:text-white/60 transition-colors">Privacy Policy</Link>
          <Link to="/terms" className="hover:text-white/60 transition-colors">Terms of Service</Link>
          <Link to="/dpa" className="hover:text-white/60 transition-colors">DPA</Link>
          <Link to="/accessibility" className="hover:text-white/60 transition-colors">Accessibility</Link>
        </div>
      </div>
    </div>
  )
}
