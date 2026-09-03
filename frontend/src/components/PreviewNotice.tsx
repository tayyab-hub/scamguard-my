import { CircleAlert, RefreshCw } from 'lucide-react'
import type { ReactNode } from 'react'
import { ApiError } from '../lib/api'

// Task 1 pages can render their unavailable scaffold without turning a failed query into data.
export function PreviewNotice({
  error,
  onRetry,
  retrying,
  children,
}: {
  error: Error
  onRetry: () => void
  retrying: boolean
  children: ReactNode
}) {
  return (
    <div
      className="motion-fade mb-6 flex flex-wrap items-start gap-3 rounded-lg border border-warning/30 bg-warning-subtle px-5 py-4"
      role="alert"
    >
      <CircleAlert size={18} className="mt-0.5 shrink-0 text-warning" aria-hidden="true" />
      <div className="min-w-0 flex-1 basis-48">
        <p className="text-sm font-medium text-warning">
          Development preview · Service unavailable
        </p>
        <p className="mt-1 text-xs leading-5 text-muted">{children}</p>
        <p className="mt-1 text-xs leading-5 text-muted">{error.message}</p>
        {error instanceof ApiError && error.requestId && (
          <p className="mt-2 break-all font-mono text-xs text-muted">
            Reference: {error.requestId}
          </p>
        )}
      </div>
      <button type="button" className="button-secondary" onClick={onRetry} disabled={retrying}>
        <RefreshCw size={15} className="motion-icon" aria-hidden="true" />
        {retrying ? 'Trying again…' : 'Try again'}
      </button>
    </div>
  )
}
