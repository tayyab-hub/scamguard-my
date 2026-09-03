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
import { Link } from 'react-router-dom'
import { EmptyState, LoadingState } from '../components/States'
import { PreviewNotice } from '../components/PreviewNotice'
import { PageHeading } from '../components/PageHeading'
import { useDashboard } from '../lib/queries'

const metrics = [
  { label: 'Total analyses', hint: 'Your analysis activity', icon: FileSearch },
  { label: 'Flagged for review', hint: 'Results that need a closer look', icon: ShieldAlert },
  { label: 'Latest analysis', hint: 'Your most recent check', icon: Clock3 },
]

export function DashboardPage() {
  const dashboard = useDashboard()
  return (
    <>
      <PageHeading
        eyebrow="FORENSIC INTELLIGENCE / OVERVIEW"
        title="Security overview"
        description="A clearer view of your digital safety, all in one place."
        action={
          <Link to="/analyse" className="button-primary">
            <ScanLine size={17} aria-hidden="true" />
            Open analyser
            <ArrowUpRight size={16} aria-hidden="true" />
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
                className="panel relative overflow-hidden px-5 py-5"
                key={label}
                aria-label={label}
              >
                <div className="flex items-center justify-between gap-2">
                  <h2 className="text-xs font-semibold text-body">{label}</h2>
                  <span className="flex size-8 items-center justify-center rounded-md border border-line bg-surface-raised">
                    <Icon size={16} className="text-muted" strokeWidth={1.6} aria-hidden="true" />
                  </span>
                </div>
                <div className="mb-2 mt-6 flex items-center gap-3">
                  <span
                    className="font-display text-4xl leading-none text-ink"
                    aria-label="Not available"
                  >
                    —
                  </span>
                  <span className="status-chip">Not available yet</span>
                </div>
                <p className="border-t border-line/70 pt-3 text-[11px] text-muted">{hint}</p>
              </section>
            ))}
          </div>
          <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
            <div className="min-w-0 space-y-6">
              <section className="panel overflow-hidden" aria-labelledby="recent-heading">
                <div className="section-heading justify-between">
                  <div className="flex items-center gap-2.5">
                    <Activity size={17} className="text-accent" aria-hidden="true" />
                    <h2 id="recent-heading" className="text-sm font-semibold">
                      Recent analyses
                    </h2>
                  </div>
                  <span className="eyebrow !text-[9px]">ACTIVITY</span>
                </div>
                <EmptyState
                  icon={Inbox}
                  title="Your activity starts here"
                  action={
                    <Link to="/analyse" className="button-secondary">
                      Explore the analyser
                      <ArrowRight size={15} aria-hidden="true" />
                    </Link>
                  }
                >
                  Analysis history is not enabled yet. Once available, your completed checks will
                  appear here.
                </EmptyState>
                <div className="flex items-start gap-2.5 border-t border-line bg-surface-raised/40 px-5 py-3.5 text-[11px] leading-5 text-muted sm:px-6">
                  <Info size={14} className="mt-0.5 shrink-0" aria-hidden="true" />
                  No live statistics are being collected or displayed.
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
            <aside className="space-y-5">
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
                  A dedicated place to review suspicious messages and links. Analysis will be
                  available in a future release.
                </p>
                <Link
                  to="/analyse"
                  className="flex min-h-11 items-center justify-between rounded-sm border-t border-accent/25 pt-4 text-xs font-semibold text-accent"
                >
                  Visit Analyse
                  <ArrowRight size={16} aria-hidden="true" />
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
                    <dd className="text-warning">Not enabled</dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt className="text-muted">Activity history</dt>
                    <dd className="text-muted">Not connected</dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt className="text-muted">Data source</dt>
                    <dd className="text-body">None configured</dd>
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
