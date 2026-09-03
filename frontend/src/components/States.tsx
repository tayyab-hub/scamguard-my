import { CircleAlert, LoaderCircle, RefreshCw } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import { ApiError } from '../lib/api'

export function LoadingState({ label = 'Loading workspace' }: { label?: string }) {
  return (
    <div className="panel p-8 sm:p-12" role="status" aria-live="polite">
      <div className="flex items-center gap-3 text-sm text-muted">
        <LoaderCircle className="animate-spin text-accent" size={18} aria-hidden="true" />
        {label}…
      </div>
      <div aria-hidden="true" className="mt-8 space-y-4 motion-safe:animate-pulse">
        <div className="h-3 w-2/3 rounded bg-line" />
        <div className="h-3 w-1/2 rounded bg-line" />
        <div className="h-24 rounded-lg bg-surface-raised" />
      </div>
    </div>
  )
}

export function ErrorState({
  error,
  onRetry,
  retrying = false,
}: {
  error: Error
  onRetry: () => void
  retrying?: boolean
}) {
  return (
    <div className="panel flex flex-col items-start gap-4 p-7" role="alert">
      <CircleAlert className="text-warning" size={24} aria-hidden="true" />
      <div>
        <h2 className="text-lg font-semibold">We couldn’t load this view</h2>
        <p className="mt-2 max-w-lg text-sm leading-6 text-muted">{error.message}</p>
      </div>
      <button type="button" className="button-secondary" onClick={onRetry} disabled={retrying}>
        <RefreshCw size={15} aria-hidden="true" />
        {retrying ? 'Trying again…' : 'Try again'}
      </button>
      {error instanceof ApiError && error.requestId && (
        <p className="break-all font-mono text-xs text-muted">Reference: {error.requestId}</p>
      )}
    </div>
  )
}

export function EmptyState({
  icon: Icon,
  title,
  children,
  action,
}: {
  icon: LucideIcon
  title: string
  children: ReactNode
  action?: ReactNode
}) {
  return (
    <div className="flex flex-col items-center px-6 py-14 text-center">
      <div className="mb-5 flex size-14 items-center justify-center rounded-2xl border border-line bg-surface-raised text-accent">
        <Icon size={25} strokeWidth={1.5} aria-hidden="true" />
      </div>
      <h3 className="font-display text-[23px] font-medium tracking-tight text-ink">{title}</h3>
      <p className="mt-2 max-w-sm text-sm leading-6 text-muted">{children}</p>
      {action && <div className="mt-6">{action}</div>}
    </div>
  )
}
