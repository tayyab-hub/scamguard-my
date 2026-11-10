// Overview of the authenticated user's measured history and current engine capabilities.
// Totals/distributions come from API queries; unavailable data stays unavailable rather than
// becoming a misleading zero.

import {
  ArrowRight,
  ArrowUpRight,
  Clock3,
  FileSearch,
  Inbox,
  Info,
  ScanLine,
  ShieldAlert,
} from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { SubmissionRows } from '../components/SubmissionHistory'
import { DashboardDistribution } from '../components/DashboardDistribution'
import { analysisModes } from '../components/analysis/modes'
import { EmptyState, LoadingState } from '../components/States'
import { PreviewNotice } from '../components/PreviewNotice'
import { PageHeading } from '../components/PageHeading'
import { CountUp } from '../components/motion/CountUp'
import { useCapabilities, useDashboard } from '../lib/queries'

const metrics = [
  { label: 'Total analyses', hint: 'Your analysis activity', icon: FileSearch },
  { label: 'Flagged for review', hint: 'Results that need a closer look', icon: ShieldAlert },
  { label: 'Latest analysis', hint: 'Your most recent check', icon: Clock3 },
]

const inputLabels = { MESSAGE: 'Message', URL: 'URL', PHONE: 'Phone', QR: 'QR' } as const

// Render count cards, recent rows and mode shortcuts from validated query data. Distribution
// bars appear only with available counts and a nonempty history.
export function DashboardPage() {
  const dashboard = useDashboard()
  const capabilities = useCapabilities()
  const navigate = useNavigate()
  const data = !dashboard.isError && dashboard.data?.status === 'ready' ? dashboard.data : null
  const availableModes =
    !capabilities.isError && capabilities.data?.analysis_available
      ? capabilities.data.supported_inputs.map((input) => inputLabels[input])
      : []
  const intelligenceLabel = availableModes.join(', ').replace(/, ([^,]*)$/, ' and $1')
  const latest = data?.recent_analyses[0]
  return (
    <>
      <PageHeading
        eyebrow="FORENSIC INTELLIGENCE / OVERVIEW"
        title="Security overview"
        description="Review your checks, find past evidence and decide what needs a closer look."
        action={
          <Link to="/analyse" className="button-primary">
            <ScanLine size={17} aria-hidden="true" />
            Open analyser
            <ArrowUpRight size={16} className="motion-arrow" aria-hidden="true" />
          </Link>
        }
      />
      {dashboard.isPending ? (
        <LoadingState />
      ) : (
        <>
          {dashboard.isError && (
            <PreviewNotice
              error={dashboard.error}
              onRetry={() => void dashboard.refetch()}
              retrying={dashboard.isFetching}
            >
              Live data is unavailable. This workspace shows no statistics or history.
            </PreviewNotice>
          )}
          <div className="mb-7 grid gap-4 md:grid-cols-3">
            {metrics.map(({ label, hint, icon: Icon }) => (
              <section
                className="panel metric-card motion-enter relative overflow-hidden px-5 py-5"
                key={label}
                aria-label={label}
              >
                <div className="flex items-center justify-between gap-3">
                  <h2 className="text-[13px] font-medium text-muted">{label}</h2>
                  <span className="metric-icon">
                    <Icon size={17} strokeWidth={1.8} aria-hidden="true" />
                  </span>
                </div>
                <div className="mb-1.5 mt-3 flex items-center gap-3">
                  <span
                    className={`font-display leading-none text-ink ${label === 'Latest analysis' && latest ? 'text-[28px]' : 'text-[40px]'}`}
                    aria-label={
                      (data && label === 'Total analyses') ||
                      (data && label === 'Flagged for review' && data.flagged_analyses !== null) ||
                      (latest && label === 'Latest analysis')
                        ? undefined
                        : 'Not available'
                    }
                  >
                    {label === 'Total analyses' && data ? (
                      <CountUp value={data.total_analyses} />
                    ) : label === 'Flagged for review' && data && data.flagged_analyses !== null ? (
                      <CountUp value={data.flagged_analyses} />
                    ) : label === 'Latest analysis' && latest ? (
                      inputLabels[latest.input_type]
                    ) : (
                      '—'
                    )}
                  </span>
                  {/* A chip only when there is something to explain: no data, or an unfinished
                      latest analysis. */}
                  {(label === 'Total analyses' && data) ||
                  (label === 'Flagged for review' && data && data.flagged_analyses !== null) ||
                  (label === 'Latest analysis' && latest?.status === 'COMPLETED') ? null : (
                    <span className="status-chip">
                      {label === 'Latest analysis' && data
                        ? latest
                          ? latest.status.replace('_', ' ').toLowerCase()
                          : 'No submissions'
                        : 'Not available yet'}
                    </span>
                  )}
                </div>
                <p className="text-[12px] text-muted">
                  {label === 'Latest analysis' && latest
                    ? new Date(latest.created_at).toLocaleString()
                    : label === 'Total analyses' && data
                      ? 'Messages, links, numbers and QR codes you have checked'
                      : label === 'Flagged for review' && data && data.flagged_analyses !== null
                        ? 'Your results at elevated or high risk'
                        : hint}
                </p>
              </section>
            ))}
          </div>
          {data?.type_counts &&
            data.risk_counts &&
            data.unassessed_analyses !== null &&
            data.total_analyses > 0 && (
              <DashboardDistribution
                types={data.type_counts}
                risks={data.risk_counts}
                unassessed={data.unassessed_analyses}
                total={data.total_analyses}
              />
            )}
          <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
            <div className="min-w-0 space-y-6">
              <section
                className="panel motion-enter motion-delay-3 overflow-hidden"
                aria-labelledby="recent-heading"
              >
                <div className="section-heading">
                  <h2 id="recent-heading" className="text-sm font-semibold">
                    Recent analyses
                  </h2>
                </div>
                {data && data.recent_analyses.length > 0 ? (
                  <SubmissionRows items={data.recent_analyses} />
                ) : (
                  <EmptyState
                    icon={Inbox}
                    title="Your activity starts here"
                    action={
                      <Link to="/analyse" className="button-secondary">
                        Explore the analyser
                        <ArrowRight size={15} className="motion-arrow" aria-hidden="true" />
                      </Link>
                    }
                  >
                    {data
                      ? 'You have not analysed anything yet. Check a suspicious message, URL, phone number or QR code to start building your private history.'
                      : 'Your history is currently unavailable. Retry the connection to load your saved submissions.'}
                  </EmptyState>
                )}
                {data && (
                  <div className="border-t border-line px-5 py-3">
                    <button
                      type="button"
                      className="button-secondary"
                      onClick={() => navigate('/history')}
                    >
                      Browse history
                    </button>
                  </div>
                )}
                <div className="flex items-start gap-2.5 border-t border-line bg-surface-raised/40 px-5 py-3.5 text-[12px] leading-5 text-muted sm:px-6">
                  <Info size={14} className="mt-0.5 shrink-0" aria-hidden="true" />
                  {data
                    ? 'Private account history. Results are decision support, not proof of fraud or safety.'
                    : 'No live statistics are being collected or displayed.'}
                </div>
              </section>
            </div>
            <aside className="motion-enter motion-delay-4 space-y-5">
              <section className="panel p-5" aria-label="Quick analysis actions">
                <h2 className="text-sm font-semibold">What would you like to check?</h2>
                <div className="mt-4 grid gap-2">
                  {analysisModes.map(({ type, label, icon: Icon }) => (
                    <Link
                      key={type}
                      to={`/analyse?mode=${type}`}
                      className="button-secondary justify-start"
                    >
                      <Icon size={16} aria-hidden="true" />
                      {label}
                      <ArrowRight size={14} className="ml-auto motion-arrow" aria-hidden="true" />
                    </Link>
                  ))}
                </div>
              </section>
              <section className="panel p-5" aria-labelledby="reading-results-heading">
                <h2 id="reading-results-heading" className="text-sm font-semibold text-ink">
                  How to read a result
                </h2>
                <ol className="mt-4 space-y-4 text-xs leading-6 text-body">
                  <li>
                    <strong className="block text-ink">1. Start with the verdict</strong>Risk
                    describes the observed warning signs. It never proves fraud or safety.
                  </li>
                  <li>
                    <strong className="block text-ink">2. Check the evidence</strong>Read the
                    detected indicators and any uncertainty before deciding what to do.
                  </li>
                  <li>
                    <strong className="block text-ink">3. Verify independently</strong>Use an
                    official contact channel you locate yourself, especially before sharing codes or
                    paying.
                  </li>
                </ol>
                <Link
                  to="/help"
                  className="action-link mt-4 inline-flex min-h-11 items-center gap-2 text-xs font-semibold text-accent"
                >
                  Understanding assessments <ArrowRight size={15} aria-hidden="true" />
                </Link>
              </section>
              <section className="panel p-5">
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="text-sm font-semibold">Workspace status</h2>
                  <span
                    className={`size-1.5 rounded-full ${availableModes.length > 0 && data ? 'bg-success' : 'bg-warning'}`}
                    aria-hidden="true"
                  />
                </div>
                <dl className="space-y-4 text-xs">
                  <div className="flex justify-between gap-3">
                    <dt className="text-muted">Analysis service</dt>
                    <dd
                      className={`min-w-0 text-right ${availableModes.length > 0 ? 'text-accent' : 'text-warning'}`}
                    >
                      {availableModes.length > 0 ? `${intelligenceLabel} enabled` : 'Not enabled'}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt className="text-muted">Activity history</dt>
                    <dd className="text-muted">{data ? 'Connected' : 'Not connected'}</dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt className="text-muted">History visibility</dt>
                    <dd className="text-body">Your account only</dd>
                  </div>
                </dl>
              </section>
            </aside>
          </div>
        </>
      )}
    </>
  )
}
