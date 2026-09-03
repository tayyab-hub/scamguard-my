import { RefreshCw } from 'lucide-react'
import { useHealth } from '../lib/queries'

export function ApiStatus() {
  const health = useHealth()
  const label = health.isPending
    ? 'Connecting to API'
    : health.isError
      ? 'API unavailable'
      : 'API connected'
  return (
    <div
      className="api-status flex min-h-7 items-center gap-2 rounded-full border border-line bg-surface px-2.5 py-1"
      data-state={health.status}
    >
      <span
        role="status"
        aria-atomic="true"
        className={`flex items-center gap-2 text-[11px] ${health.isError ? 'text-warning' : health.isPending ? 'text-muted' : 'text-success'}`}
      >
        <span key={label} className="motion-fade flex items-center gap-2">
          <span
            aria-hidden="true"
            className={`status-dot size-1.5 rounded-full ${health.isPending ? 'bg-muted' : health.isError ? 'bg-warning' : 'bg-success'}`}
          />
          {label}
        </span>
      </span>
      {health.isError && (
        <button
          type="button"
          className="button-quiet flex size-6 items-center justify-center rounded text-muted hover:text-ink"
          onClick={() => void health.refetch()}
          disabled={health.isFetching}
          aria-label="Retry API connection"
        >
          <RefreshCw size={13} className="motion-icon" aria-hidden="true" />
        </button>
      )}
    </div>
  )
}
