import { createContext, useContext, useMemo, useCallback, useEffect } from 'react'
import { useUser, useClerk } from '@clerk/clerk-react'

const AuthContext = createContext(null)
const CACHE_KEY = 'sc_auth_cache'

function getCachedSession() {
  try {
    const raw = sessionStorage.getItem(CACHE_KEY)
    return raw ? JSON.parse(raw) : null
  } catch { return null }
}

export function AuthProvider({ children }) {
  const { user, isLoaded, isSignedIn } = useUser()
  const { signOut } = useClerk()

  const session = useMemo(() => {
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
  }, [user, isLoaded, isSignedIn])

  useEffect(() => {
    if (!isLoaded) return
    if (session) {
      sessionStorage.setItem(CACHE_KEY, JSON.stringify(session))
    } else {
      sessionStorage.removeItem(CACHE_KEY)
    }
  }, [session, isLoaded])

  const logout = useCallback(() => {
    sessionStorage.removeItem(CACHE_KEY)
    signOut({ redirectUrl: '/' })
  }, [signOut])

  const login = useCallback(() => {}, [])

  return (
    <AuthContext.Provider value={{ session, login, logout, isLoaded }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
