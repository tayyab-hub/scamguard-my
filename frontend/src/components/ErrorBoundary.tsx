import { Component } from 'react'
import type { ErrorInfo, ReactNode } from 'react'
import { ShieldAlert } from 'lucide-react'

export class ErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean }> {
  state = { hasError: false }

  static getDerivedStateFromError() {
    return { hasError: true }
  }

  componentDidCatch(_error: Error, info: ErrorInfo) {
    if (import.meta.env.DEV) console.error('SCAMGUARD view failed to render.', info.componentStack)
  }

  render() {
    if (!this.state.hasError) return this.props.children
    return (
      <main className="grid min-h-dvh place-items-center p-6">
        <div role="alert" className="panel max-w-lg p-8">
          <ShieldAlert className="mb-4 text-warning" aria-hidden="true" />
          <h1 className="text-2xl font-semibold">The workspace hit a problem</h1>
          <p className="my-4 text-muted">
            Reload the page to try again. If the problem continues, contact your administrator.
          </p>
          <button type="button" className="button-primary" onClick={() => window.location.reload()}>
            Reload workspace
          </button>
        </div>
      </main>
    )
  }
}
