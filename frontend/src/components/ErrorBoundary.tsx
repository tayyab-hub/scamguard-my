// React class error boundary around the application tree. It catches descendant
// rendering/lifecycle failures and offers reload; request failures are handled separately in
// query/form state.

import { Component } from 'react'
import type { ErrorInfo, ReactNode } from 'react'
import { ShieldAlert } from 'lucide-react'

// Store whether rendering failed and show a recovery view instead of a blank screen. This does
// not catch every asynchronous event-handler error.
export class ErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean }> {
  state = { hasError: false }

  // Tell React to switch to the recovery view when a descendant render throws.
  static getDerivedStateFromError() {
    return { hasError: true }
  }

  // In development only, log the component stack for diagnosis; omit the exception message
  // itself.
  componentDidCatch(_error: Error, info: ErrorInfo) {
    if (import.meta.env.DEV) console.error('SCAMGUARD view failed to render.', info.componentStack)
  }

  // Return children until a rendering failure, then a reload action that starts a fresh
  // application session restoration.
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
