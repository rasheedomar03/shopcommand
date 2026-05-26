import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react'

const AuthContext = createContext(null)

const SESSION_TTL_MS = 24 * 60 * 60 * 1000 // 24 hours
const IDLE_TIMEOUT_MS = 2 * 60 * 60 * 1000  // 2 hours of inactivity

function loadSession() {
  try {
    const raw = localStorage.getItem('sc_session')
    if (!raw) return null
    const s = JSON.parse(raw)
    // Check absolute expiry
    if (s.expiresAt && Date.now() > s.expiresAt) {
      localStorage.removeItem('sc_session')
      return null
    }
    // Check idle expiry
    if (s.lastActiveAt && Date.now() - s.lastActiveAt > IDLE_TIMEOUT_MS) {
      localStorage.removeItem('sc_session')
      return null
    }
    return s
  } catch {
    return null
  }
}

export function AuthProvider({ children }) {
  const [session, setSession] = useState(loadSession)
  const sessionRef = useRef(session)
  sessionRef.current = session

  const login = (role, techId = null, name = null, shopId = null) => {
    const s = {
      role,
      techId,
      name,
      shopId,
      expiresAt: Date.now() + SESSION_TTL_MS,
      lastActiveAt: Date.now(),
    }
    setSession(s)
    localStorage.setItem('sc_session', JSON.stringify(s))
  }

  const logout = useCallback(() => {
    setSession(null)
    localStorage.removeItem('sc_session')
  }, [])

  // Update lastActiveAt on user interaction (uses ref to avoid stale closure)
  useEffect(() => {
    if (!session) return
    let last = 0
    const handler = () => {
      if (Date.now() - last > 60_000) {
        last = Date.now()
        const current = sessionRef.current
        if (!current) return
        const updated = { ...current, lastActiveAt: Date.now() }
        setSession(updated)
        localStorage.setItem('sc_session', JSON.stringify(updated))
      }
    }
    window.addEventListener('click', handler)
    window.addEventListener('keydown', handler)
    return () => {
      window.removeEventListener('click', handler)
      window.removeEventListener('keydown', handler)
    }
  }, [session?.expiresAt]) // re-bind only on new login, not every activity update

  // Periodic check for session expiry (every 60s, uses ref for current session)
  useEffect(() => {
    if (!session) return
    const interval = setInterval(() => {
      const current = sessionRef.current
      if (!current) return
      const now = Date.now()
      if ((current.expiresAt && now > current.expiresAt) ||
          (current.lastActiveAt && now - current.lastActiveAt > IDLE_TIMEOUT_MS)) {
        logout()
      }
    }, 60_000)
    return () => clearInterval(interval)
  }, [session?.expiresAt, logout])

  return (
    <AuthContext.Provider value={{ session, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
