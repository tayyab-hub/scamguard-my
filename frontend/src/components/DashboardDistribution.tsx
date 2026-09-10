import { Link } from 'react-router-dom'
import type { RiskLevel } from '../lib/api'
import { riskCopy } from '../lib/resultPresentation'

export function DashboardDistribution({
  types,
  risks,
  unassessed,
  total,
}: {
  types: Record<'MESSAGE' | 'URL' | 'PHONE' | 'QR', number>
  risks: Record<RiskLevel, number>
  unassessed: number
  total: number
}) {
  return (
    <section className="panel mb-6 overflow-hidden" aria-labelledby="distribution-heading">
      <div className="section-heading">
        <h2 id="distribution-heading" className="text-sm font-semibold">
          Your analysis patterns
        </h2>
      </div>
      <div className="grid gap-6 p-5 sm:p-6 md:grid-cols-2">
        <Distribution
          title="Checks by type"
          total={total}
          items={Object.entries(types).map(([key, count]) => ({
            label: key === 'QR' || key === 'URL' ? key : key === 'PHONE' ? 'Phone' : 'Message',
            count,
            to: `/history?type=${key}`,
          }))}
        />
        <Distribution
          title="Recorded risk levels"
          total={total}
          items={Object.entries(risks).map(([key, count]) => ({
            label: riskCopy[key as RiskLevel],
            count,
            to: `/history?risk=${key}`,
            risk: key,
          }))}
        />
      </div>
      <p className="border-t border-line px-5 py-4 text-[11px] leading-5 text-muted">
        All-time saved records in your account. Bar lengths show record counts, not scam
        probabilities.{' '}
        {unassessed > 0 &&
          `${unassessed} ${unassessed === 1 ? 'record has' : 'records have'} no completed assessment.`}{' '}
        Select a row to review its history.
      </p>
    </section>
  )
}

function Distribution({
  title,
  items,
  total,
}: {
  title: string
  total: number
  items: { label: string; count: number; to: string; risk?: string }[]
}) {
  return (
    <div className="min-w-0">
      <h3 className="mb-3 text-xs font-semibold text-body">{title}</h3>
      <ul className="space-y-1">
        {items.map((item) => (
          <li key={item.label}>
            <Link
              to={item.to}
              className="distribution-row block rounded px-2 py-2"
              aria-label={`${item.label}: ${item.count} analyses. View history.`}
            >
              <span className="flex justify-between gap-3 text-xs">
                <span>{item.label}</span>
                <span className="font-mono tabular-nums">{item.count.toLocaleString()}</span>
              </span>
              <span
                aria-hidden="true"
                className="distribution-track mt-2 block h-1.5 overflow-hidden rounded-sm bg-surface-raised"
              >
                <span
                  data-risk={item.risk}
                  className="distribution-bar block h-full bg-accent"
                  style={{ width: `${total ? (item.count / total) * 100 : 0}%` }}
                />
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}
