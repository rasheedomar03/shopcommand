import { Component } from 'react'

export class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null, errorInfo: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, errorInfo) {
    this.setState({ errorInfo })
    // Log to console with full detail for debugging
    console.error('[ErrorBoundary] Caught error:', error?.message || error)
    console.error('[ErrorBoundary] Component stack:', errorInfo?.componentStack)
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback

      const errorMsg = this.state.error?.message || 'Unknown error'
      const isDev = import.meta.env.DEV

      return (
        <div className="flex items-center justify-center min-h-[200px] p-8">
          <div className="text-center max-w-md">
            <div className="text-3xl font-bold text-text-muted mb-2">Something went wrong</div>
            <p className="text-sm text-text-secondary mb-4">
              An unexpected error occurred. Try refreshing the page.
            </p>
            {isDev && (
              <pre className="text-left text-xs text-red-400 bg-red-500/5 border border-red-500/20 rounded-lg p-3 mb-4 overflow-auto max-h-40">
                {errorMsg}
              </pre>
            )}
            <div className="flex items-center justify-center gap-3">
              <button
                onClick={() => this.setState({ hasError: false, error: null, errorInfo: null })}
                className="px-4 py-2 text-sm font-medium rounded-lg bg-orange text-white hover:bg-orange-hover transition-colors"
              >
                Try again
              </button>
              <button
                onClick={() => window.location.reload()}
                className="px-4 py-2 text-sm font-medium rounded-lg border border-border text-text-secondary hover:text-text-primary hover:bg-surface transition-colors"
              >
                Reload page
              </button>
            </div>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
