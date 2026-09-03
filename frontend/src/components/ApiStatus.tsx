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
    <div className="flex min-h-7 items-center gap-2 rounded-full border border-line bg-surface px-2.5 py-1">
      <span
        role="status"
        className={`flex items-center gap-2 text-[11px] ${health.isError ? 'text-warning' : health.isPending ? 'text-muted' : 'text-success'}`}
      >
        <span
          aria-hidden="true"
          className={`size-1.5 rounded-full ${health.isPending ? 'bg-muted animate-pulse' : health.isError ? 'bg-warning' : 'bg-success'}`}
        />
        {label}
      </span>
      {health.isError && (
        <button
          type="button"
          className="flex size-6 items-center justify-center rounded text-muted hover:text-ink"
          onClick={() => void health.refetch()}
          disabled={health.isFetching}
          aria-label="Retry API connection"
        >
          <RefreshCw size={13} aria-hidden="true" />
        </button>
      )}
    </div>
  )
}
