import { createContext, useContext, useMemo, useCallback, useEffect, useState } from 'react'
import { useUser, useClerk } from '@clerk/clerk-react'

const AuthContext = createContext(null)
const CACHE_KEY = 'sc_auth_cache'
const DEMO_KEY = 'sc_demo'

const DEMO_SESSION = {
  clerkId: null,
  role: 'owner',
  onboarded: true,
  name: 'Demo User',
  email: null,
  shopId: null,
  techId: null,
  demo: true,
}

function getCachedSession() {
  try {
    const raw = sessionStorage.getItem(CACHE_KEY)
    return raw ? JSON.parse(raw) : null
  } catch { return null }
}

export function AuthProvider({ children }) {
  const { user, isLoaded, isSignedIn } = useUser()
  const { signOut } = useClerk()
  const [demoActive, setDemoActive] = useState(() => sessionStorage.getItem(DEMO_KEY) === '1')

  const session = useMemo(() => {
    if (demoActive) return DEMO_SESSION
    if (!isLoaded) return getCachedSession()
    if (!isSignedIn || !user) return null

    const meta = user.unsafeMetadata || {}
    return {
      clerkId: user.id,
      role: meta.role || null,
      onboarded: meta.onboarded || false,
      name: user.fullName || user.firstName || 'User',
      email: user.primaryEmailAddress?.emailAddress,
      shopId: meta.shopId || null,
      techId: meta.techId || null,
    }
  }, [user, isLoaded, isSignedIn, demoActive])

  useEffect(() => {
    if (demoActive || !isLoaded) return
    if (session) {
      sessionStorage.setItem(CACHE_KEY, JSON.stringify(session))
    } else {
      sessionStorage.removeItem(CACHE_KEY)
    }
  }, [session, isLoaded, demoActive])

  const demoLogin = useCallback(() => {
    sessionStorage.setItem(DEMO_KEY, '1')
    setDemoActive(true)
  }, [])

  const logout = useCallback(() => {
    sessionStorage.removeItem(CACHE_KEY)
    sessionStorage.removeItem(DEMO_KEY)
    setDemoActive(false)
    if (isSignedIn) signOut({ redirectUrl: '/' })
  }, [signOut, isSignedIn])

  const login = useCallback(() => {}, [])

  return (
    <AuthContext.Provider value={{ session, login, logout, demoLogin, isLoaded: demoActive || isLoaded }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
