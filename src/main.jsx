import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { ClerkProvider } from '@clerk/clerk-react'
import { ThemeProvider } from './contexts/ThemeContext'
import { AuthProvider } from './contexts/AuthContext'
import { DataProvider } from './contexts/DataContext'
import { ConsentGatedAnalytics } from './components/ConsentGatedAnalytics'
import { TooltipProvider } from './components/ui/Tooltip'
import { ErrorBoundary } from './components/ui/ErrorBoundary'
import App from './App.jsx'
import './index.css'

const clerkPubKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY

// After a new version goes live, a tab that was already open still asks for page files
// of the old version, which no longer exist ("Failed to fetch dynamically imported
// module"). Reload once to pick up the new version. The flag keeps this from ever
// looping, and it is cleared a little after a good load so the next update can do it again.
window.addEventListener('vite:preloadError', () => {
  try {
    if (sessionStorage.getItem('sc_chunk_reload')) return
    sessionStorage.setItem('sc_chunk_reload', '1')
  } catch {
    return // cannot remember that we tried, so do not risk a reload loop
  }
  window.location.reload()
})
try { setTimeout(() => sessionStorage.removeItem('sc_chunk_reload'), 15000) } catch { /* ignore */ }

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      <ClerkProvider publishableKey={clerkPubKey}>
        <ThemeProvider>
          <AuthProvider>
            <DataProvider>
              <TooltipProvider>
                <BrowserRouter>
                  <App />
                  <ConsentGatedAnalytics />
                </BrowserRouter>
              </TooltipProvider>
            </DataProvider>
          </AuthProvider>
        </ThemeProvider>
      </ClerkProvider>
    </ErrorBoundary>
  </React.StrictMode>,
)
