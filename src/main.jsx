import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { ThemeProvider } from './contexts/ThemeContext'
import { AuthProvider } from './contexts/AuthContext'
import { DataProvider } from './contexts/DataContext'
import { ConsentGatedAnalytics } from './components/ConsentGatedAnalytics'
import { TooltipProvider } from './components/ui/Tooltip'
import { ErrorBoundary } from './components/ui/ErrorBoundary'
import App from './App.jsx'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      <ThemeProvider>
        <DataProvider>
          <AuthProvider>
            <TooltipProvider>
              <BrowserRouter>
                <App />
                <ConsentGatedAnalytics />
              </BrowserRouter>
            </TooltipProvider>
          </AuthProvider>
        </DataProvider>
      </ThemeProvider>
    </ErrorBoundary>
  </React.StrictMode>,
)
