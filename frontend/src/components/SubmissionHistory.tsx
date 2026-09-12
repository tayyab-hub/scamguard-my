import { useId, useState } from 'react'
import type { AnalysisSummary, HistoryFilters, RiskLevel } from '../lib/api'
import { Inbox, RotateCcw, Search, Trash2 } from 'lucide-react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useAnalysisDetail, useDeleteAnalysis, useHistory } from '../lib/queries'
import { EmptyState, ErrorState, LoadingState } from './States'
import { ModalDialog } from './ModalDialog'
import { AssessmentResult } from './analysis/URLResult'
import { riskCopy } from '../lib/resultPresentation'

const inputLabels = { MESSAGE: 'Message', URL: 'URL', PHONE: 'Phone', QR: 'QR' } as const

export function SubmissionRows({
  items,
  onDeleted,
}: {
  items: AnalysisSummary[]
  onDeleted?: () => void
}) {
  const navigate = useNavigate()
  const prefix = useId()
  const [selected, setSelected] = useState<string | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null)
  const detail = useAnalysisDetail(selected)
  const deletion = useDeleteAnalysis()
  return (
    <ul className="divide-y divide-line">
      {items.map((item) => (
        <li key={item.id} className="min-w-0 p-5 sm:px-6">
          <button
            type="button"
            className="history-trigger button-quiet block w-full rounded text-left"
            aria-expanded={selected === item.id}
            aria-controls={`${prefix}-detail-${item.id}`}
            onClick={() => setSelected(selected === item.id ? null : item.id)}
          >
            <span className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-sm font-semibold">
                {inputLabels[item.input_type]}
                {item.input_type === 'QR' && item.payload_type
                  ? ` · ${item.payload_type.toLowerCase()}`
                  : ''}
              </span>
              <span className="status-chip">{item.status.replace('_', ' ')}</span>
            </span>
            {item.risk_level && (
              <span className="history-risk mt-2 inline-block" data-risk={item.risk_level}>
                {riskCopy[item.risk_level]}
              </span>
            )}
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
                      <AssessmentResult
                        assessment={detail.data.assessment}
                        analysisId={detail.data.id}
                        content={detail.data.content}
                      />
                    </div>
                  )}
                  {detail.data.failure_code && (
                    <p role="alert" className="mt-4 text-xs text-warning">
                      The saved submission could not be assessed. Reference:{' '}
                      {detail.data.failure_code}
                    </p>
                  )}
                  <div className="mt-5 border-t border-line pt-4">
                    {detail.data.status === 'COMPLETED' && detail.data.input_type !== 'QR' && (
                      <button
                        type="button"
                        className="button-secondary mr-3"
                        onClick={() =>
                          navigate('/analyse', {
                            state: {
                              analysisDraft: {
                                inputType: detail.data.input_type,
                                content: detail.data.content,
                                sourceId: detail.data.id,
                              },
                            },
                          })
                        }
                      >
                        <RotateCcw size={14} aria-hidden="true" /> Analyse again
                      </button>
                    )}
                    {detail.data.status === 'COMPLETED' && detail.data.input_type === 'QR' && (
                      <p className="mb-3 text-[11px] leading-5 text-muted">
                        Scan the code or upload its image again for a new analysis. Original images
                        and camera frames are not retained.
                      </p>
                    )}
                    <button
                      type="button"
                      className="button-quiet flex min-h-9 items-center gap-2 rounded px-2 text-xs font-semibold text-danger"
                      onClick={() => setDeleteTarget(detail.data.id)}
                    >
                      <Trash2 size={14} aria-hidden="true" /> Delete this analysis
                    </button>
                  </div>
                </div>
              ))}
          </div>
        </li>
      ))}
      {deleteTarget && (
        <ModalDialog
          headingId="delete-analysis-heading"
          busy={deletion.isPending}
          onCancel={() => {
            deletion.reset()
            setDeleteTarget(null)
          }}
        >
          <h2 id="delete-analysis-heading" className="text-lg font-semibold">
            Delete this analysis?
          </h2>
          <p className="mt-3 text-sm leading-6 text-muted">
            Its submitted content and assessment will be permanently removed from your history.
          </p>
          {deletion.isError && (
            <p role="alert" className="mt-3 text-xs text-danger">
              {deletion.error.message}
            </p>
          )}
          <div className="mt-6 flex justify-end gap-3">
            <button
              type="button"
              data-dialog-initial
              className="button-secondary"
              disabled={deletion.isPending}
              onClick={() => {
                deletion.reset()
                setDeleteTarget(null)
              }}
            >
              Cancel
            </button>
            <button
              type="button"
              className="button-primary bg-danger"
              disabled={deletion.isPending}
              onClick={() =>
                void deletion
                  .mutateAsync(deleteTarget)
                  .then(() => {
                    setSelected(null)
                    setDeleteTarget(null)
                    onDeleted?.()
                  })
                  .catch(() => undefined)
              }
            >
              {deletion.isPending ? 'Deleting…' : 'Delete analysis'}
            </button>
          </div>
        </ModalDialog>
      )}
    </ul>
  )
}

export function SubmissionHistory() {
  const [params] = useSearchParams()
  const [page, setPage] = useState(1)
  const [query, setQuery] = useState('')
  const [filters, setFilters] = useState<HistoryFilters>(() => ({
    query: '',
    input_type: (['MESSAGE', 'URL', 'PHONE', 'QR'].includes(params.get('type') || '')
      ? params.get('type')
      : null) as HistoryFilters['input_type'],
    risk_level: Object.keys(riskCopy).includes(params.get('risk') || '')
      ? (params.get('risk') as RiskLevel)
      : null,
    sort: 'newest',
  }))
  const filtered =
    filters.query || filters.input_type || filters.risk_level || filters.sort !== 'newest'
  const history = useHistory(page, filtered ? filters : undefined)
  function updateFilters(update: Partial<HistoryFilters>) {
    setFilters((current) => ({ ...current, ...update }))
    setPage(1)
  }
  return (
    <section className="border-t border-line" aria-label="Submission history">
      <h3 className="px-5 pt-5 text-sm font-semibold">Submission history</h3>
      <form
        className="history-filters space-y-4 p-5"
        onSubmit={(event) => {
          event.preventDefault()
          updateFilters({ query: query.trim() })
        }}
      >
        <div>
          <label htmlFor="history-search" className="mb-2 block text-xs font-medium">
            Search your analyses
          </label>
          <div className="flex gap-2">
            <input
              id="history-search"
              className="input-field min-w-0 flex-1"
              type="search"
              maxLength={200}
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search saved content or assessment summaries"
            />
            <button type="submit" className="button-secondary" aria-label="Search history">
              <Search size={16} aria-hidden="true" />
              <span className="hidden sm:inline">Search</span>
            </button>
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          <label className="text-xs font-medium">
            Analysis type
            <select
              className="input-field mt-2"
              value={filters.input_type || ''}
              onChange={(event) =>
                updateFilters({
                  input_type: (event.target.value as HistoryFilters['input_type']) || null,
                })
              }
            >
              <option value="">All types</option>
              {Object.entries(inputLabels).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <label className="text-xs font-medium">
            Risk level
            <select
              className="input-field mt-2"
              value={filters.risk_level || ''}
              onChange={(event) =>
                updateFilters({ risk_level: (event.target.value as RiskLevel) || null })
              }
            >
              <option value="">All risk levels</option>
              {Object.entries(riskCopy).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <label className="text-xs font-medium">
            Sort by
            <select
              className="input-field mt-2"
              value={filters.sort}
              onChange={(event) =>
                updateFilters({ sort: event.target.value as HistoryFilters['sort'] })
              }
            >
              <option value="newest">Newest first</option>
              <option value="oldest">Oldest first</option>
              <option value="risk">Highest risk first</option>
            </select>
          </label>
        </div>
        {filters.sort === 'risk' && (
          <p className="text-[11px] leading-5 text-muted">
            High to Low, followed by unranked insufficient-evidence and unassessed records. Unranked
            does not mean safe.
          </p>
        )}
        {Boolean(filtered) && (
          <button
            type="button"
            className="button-secondary"
            onClick={() => {
              setQuery('')
              updateFilters({ query: '', input_type: null, risk_level: null, sort: 'newest' })
            }}
          >
            Clear filters
          </button>
        )}
      </form>
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
            <SubmissionRows
              key={`${page}-${JSON.stringify(filters)}`}
              items={history.data.items}
              onDeleted={() => {
                if (history.data.items.length === 1 && page > 1) setPage(page - 1)
              }}
            />
          ) : (
            <EmptyState
              icon={Inbox}
              title={filtered ? 'No matching analyses' : 'Your private history starts here'}
              action={
                !filtered && (
                  <Link to="/analyse" className="button-secondary">
                    Start an analysis
                  </Link>
                )
              }
            >
              {filtered
                ? 'Try a shorter search or clear your filters to see more results.'
                : 'Check a suspicious message, URL, phone number or QR code. Your saved assessments will appear here.'}
            </EmptyState>
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
