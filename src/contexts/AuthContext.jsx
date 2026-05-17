import { createContext, useContext, useState } from 'react'

const AuthContext = createContext(null)

function loadSession() {
  try {
    const raw = localStorage.getItem('sc_session')
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

export function AuthProvider({ children }) {
  const [session, setSession] = useState(loadSession)

  const login = (role, techId = null, name = null, shopId = null) => {
    const s = { role, techId, name, shopId }
    setSession(s)
    localStorage.setItem('sc_session', JSON.stringify(s))
  }

  const logout = () => {
    setSession(null)
    localStorage.removeItem('sc_session')
  }

  return (
    <AuthContext.Provider value={{ session, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
