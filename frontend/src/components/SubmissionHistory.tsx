import { useId, useState } from 'react'
import type { AnalysisSummary } from '../lib/api'
import { useAnalysisDetail, useHistory } from '../lib/queries'
import { ErrorState, LoadingState } from './States'
import { MessageResult } from './analysis/MessageResult'

export function SubmissionRows({ items }: { items: AnalysisSummary[] }) {
  const prefix = useId()
  const [selected, setSelected] = useState<string | null>(null)
  const detail = useAnalysisDetail(selected)
  return (
    <ul className="divide-y divide-line">
      {items.map((item) => (
        <li key={item.id} className="min-w-0 p-5 sm:px-6">
          <button
            type="button"
            className="button-quiet block w-full rounded text-left"
            aria-expanded={selected === item.id}
            aria-controls={`${prefix}-detail-${item.id}`}
            onClick={() => setSelected(selected === item.id ? null : item.id)}
          >
            <span className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-sm font-semibold">
                {item.input_type === 'MESSAGE' ? 'Message' : 'URL'}
              </span>
              <span className="status-chip">{item.status.replace('_', ' ')}</span>
            </span>
            <time dateTime={item.created_at} className="mt-2 block text-[11px] text-muted">
              {new Date(item.created_at).toLocaleString()}
            </time>
            <span className="mt-3 block break-words text-xs leading-6 text-body [overflow-wrap:anywhere]">
              {item.preview}
            </span>
            <span className="mt-2 block text-[11px] font-medium text-accent">
              {selected === item.id ? 'Hide submission' : 'View submission'}
            </span>
          </button>
          <div id={`${prefix}-detail-${item.id}`} hidden={selected !== item.id}>
            {selected === item.id &&
              (detail.isPending ? (
                <LoadingState label="Loading submission" />
              ) : detail.isError ? (
                <ErrorState
                  error={detail.error}
                  onRetry={() => void detail.refetch()}
                  retrying={detail.isFetching}
                />
              ) : (
                <div className="motion-fade mt-4 rounded-lg border border-line bg-surface-raised p-4">
                  <p className="mb-3 text-xs text-muted">
                    Saved content · {detail.data.status.replace('_', ' ')}
                  </p>
                  <p className="whitespace-pre-wrap break-words text-sm leading-6 [overflow-wrap:anywhere]">
                    {detail.data.content}
                  </p>
                  <p className="mt-4 break-all font-mono text-[10px] text-muted">
                    Reference: {detail.data.id}
                  </p>
                  {detail.data.assessment && (
                    <div className="mt-4 overflow-hidden rounded-lg border border-line bg-surface">
                      <MessageResult assessment={detail.data.assessment} />
                    </div>
                  )}
                  {detail.data.failure_code && (
                    <p role="alert" className="mt-4 text-xs text-warning">
                      The saved message could not be assessed. Reference: {detail.data.failure_code}
                    </p>
                  )}
                </div>
              ))}
          </div>
        </li>
      ))}
    </ul>
  )
}

export function SubmissionHistory() {
  const [page, setPage] = useState(1)
  const history = useHistory(page)
  return (
    <section className="border-t border-line" aria-label="Submission history">
      <h3 className="px-5 pt-5 text-sm font-semibold">Submission history</h3>
      {history.isPending ? (
        <LoadingState label="Loading history" />
      ) : history.isError ? (
        <ErrorState
          error={history.error}
          onRetry={() => void history.refetch()}
          retrying={history.isFetching}
        />
      ) : (
        <>
          {history.data.items.length ? (
            <SubmissionRows key={page} items={history.data.items} />
          ) : (
            <p role="status" className="p-5 text-sm text-muted">
              No submissions on this page.
            </p>
          )}
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line p-5">
            <button
              type="button"
              className="button-secondary"
              disabled={page === 1}
              onClick={() => setPage(page - 1)}
            >
              Previous
            </button>
            <span role="status" className="text-xs text-muted">
              Page {page} · {history.data.total} submissions
            </span>
            <button
              type="button"
              className="button-secondary"
              disabled={page * history.data.page_size >= history.data.total || page >= 10000}
              onClick={() => setPage(page + 1)}
            >
              Next
            </button>
          </div>
        </>
      )}
    </section>
  )
}
