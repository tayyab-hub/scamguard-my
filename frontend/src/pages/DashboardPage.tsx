import {
  Activity,
  ArrowRight,
  ArrowUpRight,
  Clock3,
  FileSearch,
  Inbox,
  Info,
  ScanLine,
  ShieldAlert,
  ShieldCheck,
} from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { SubmissionRows } from '../components/SubmissionHistory'
import { DashboardDistribution } from '../components/DashboardDistribution'
import { analysisModes } from '../components/analysis/modes'
import { EmptyState, LoadingState } from '../components/States'
import { PreviewNotice } from '../components/PreviewNotice'
import { PageHeading } from '../components/PageHeading'
import { useCapabilities, useDashboard } from '../lib/queries'

const metrics = [
  { label: 'Total analyses', hint: 'Your analysis activity', icon: FileSearch },
  { label: 'Flagged for review', hint: 'Results that need a closer look', icon: ShieldAlert },
  { label: 'Latest analysis', hint: 'Your most recent check', icon: Clock3 },
]

const inputLabels = { MESSAGE: 'Message', URL: 'URL', PHONE: 'Phone', QR: 'QR' } as const

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
                <div className="flex items-center justify-between gap-2">
                  <h2 className="text-xs font-semibold text-body">{label}</h2>
                  <span className="metric-icon flex size-8 items-center justify-center rounded-md border border-line bg-surface-raised">
                    <Icon size={16} className="text-muted" strokeWidth={1.6} aria-hidden="true" />
                  </span>
                </div>
                <div className="mb-2 mt-6 flex items-center gap-3">
                  <span
                    className={`font-display leading-none text-ink ${label === 'Latest analysis' && latest ? 'text-2xl' : 'text-4xl'}`}
                    aria-label={
                      (data && label === 'Total analyses') ||
                      (data && label === 'Flagged for review' && data.flagged_analyses !== null) ||
                      (latest && label === 'Latest analysis')
                        ? undefined
                        : 'Not available'
                    }
                  >
                    {label === 'Total analyses' && data
                      ? data.total_analyses.toLocaleString()
                      : label === 'Flagged for review' && data && data.flagged_analyses !== null
                        ? data.flagged_analyses.toLocaleString()
                        : label === 'Latest analysis' && latest
                          ? inputLabels[latest.input_type]
                          : '—'}
                  </span>
                  <span className="status-chip">
                    {label === 'Total analyses' && data
                      ? 'Recorded'
                      : label === 'Flagged for review' && data && data.flagged_analyses !== null
                        ? 'Evidence-based'
                        : label === 'Latest analysis' && data
                          ? latest
                            ? latest.status.replace('_', ' ')
                            : 'No submissions'
                          : 'Not available yet'}
                  </span>
                </div>
                <p className="border-t border-line/70 pt-3 text-[11px] text-muted">
                  {label === 'Latest analysis' && latest
                    ? new Date(latest.created_at).toLocaleString()
                    : label === 'Total analyses' && data
                      ? 'Persisted Message, URL, Phone and QR submissions'
                      : label === 'Flagged for review' && data && data.flagged_analyses !== null
                        ? 'Owned results at elevated or high risk'
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
                <div className="section-heading justify-between">
                  <div className="flex items-center gap-2.5">
                    <Activity size={17} className="text-accent" aria-hidden="true" />
                    <h2 id="recent-heading" className="text-sm font-semibold">
                      Recent analyses
                    </h2>
                  </div>
                  <span className="eyebrow !text-[9px]">ACTIVITY</span>
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
                      : 'Analysis history is not enabled yet. Once available, your recorded submissions will appear here.'}
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
                <div className="flex items-start gap-2.5 border-t border-line bg-surface-raised/40 px-5 py-3.5 text-[11px] leading-5 text-muted sm:px-6">
                  <Info size={14} className="mt-0.5 shrink-0" aria-hidden="true" />
                  {data
                    ? 'Private account history. Results are decision support, not proof of fraud or safety.'
                    : 'No live statistics are being collected or displayed.'}
                </div>
              </section>
              <section className="flex items-start gap-4 rounded-lg border border-line bg-surface-raised/60 px-5 py-5">
                <ShieldCheck
                  className="mt-1 shrink-0 text-accent"
                  size={22}
                  strokeWidth={1.5}
                  aria-hidden="true"
                />
                <div>
                  <h2 className="text-sm font-semibold">Make space for a second look</h2>
                  <p className="mt-2 text-xs leading-6 text-muted">
                    Unexpected request? Take a moment before sharing information, opening a link, or
                    making a payment.
                  </p>
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
              <section className="relative overflow-hidden rounded-lg border border-accent/25 bg-accent-subtle p-6">
                <div className="mb-6 flex items-center justify-between">
                  <span className="eyebrow !text-accent">A SAFER NEXT STEP</span>
                  <ScanLine
                    size={23}
                    className="text-accent"
                    strokeWidth={1.4}
                    aria-hidden="true"
                  />
                </div>
                <h2 className="max-w-[230px] font-display text-[29px] font-normal leading-[1.15] tracking-tight text-ink">
                  Uncertain?
                  <br />
                  Start with a check.
                </h2>
                <p className="mb-7 mt-3 text-xs leading-6 text-body">
                  A dedicated place to review messages, links, phone numbers and QR codes.
                  {availableModes.length > 0
                    ? ` ${intelligenceLabel} intelligence is available.`
                    : ' Intelligence availability depends on the connected service.'}
                </p>
                <Link
                  to="/analyse"
                  className="action-link flex min-h-11 items-center justify-between rounded-sm border-t border-accent/25 pt-4 text-xs font-semibold text-accent"
                >
                  Visit Analyse
                  <ArrowRight size={16} className="motion-arrow" aria-hidden="true" />
                </Link>
              </section>
              <section className="panel p-5">
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="text-sm font-semibold">Workspace status</h2>
                  <span className="size-1.5 rounded-full bg-warning" aria-hidden="true" />
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
