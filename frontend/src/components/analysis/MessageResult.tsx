import { AlertTriangle, CheckCircle2, CircleHelp, ListChecks, ShieldAlert } from 'lucide-react'
import type { MessageAssessment } from '../../lib/api'

const riskCopy = {
  LOW: 'Low observed risk',
  CAUTION: 'Caution advised',
  ELEVATED: 'Elevated risk',
  HIGH: 'High risk',
  INSUFFICIENT_EVIDENCE: 'Insufficient evidence',
} as const

export function MessageResult({ assessment }: { assessment: MessageAssessment }) {
  const Icon =
    assessment.risk_level === 'HIGH' || assessment.risk_level === 'ELEVATED'
      ? ShieldAlert
      : assessment.risk_level === 'INSUFFICIENT_EVIDENCE'
        ? CircleHelp
        : assessment.risk_level === 'CAUTION'
          ? AlertTriangle
          : CheckCircle2
  return (
    <div className="motion-fade" aria-label="Message assessment">
      <div className="border-b border-line p-5">
        <p className="eyebrow !text-[9px]">RISK LEVEL</p>
        <div className="mt-3 flex items-start gap-3">
          <Icon size={22} className="mt-0.5 shrink-0 text-accent" aria-hidden="true" />
          <div>
            <p className="font-display text-2xl text-ink">{riskCopy[assessment.risk_level]}</p>
            <p className="mt-1 text-[11px] text-muted">
              Confidence: {assessment.confidence_level.toLowerCase()} (
              {Math.round(assessment.confidence_score * 100)}%)
            </p>
            <p className="mt-1 text-[11px] text-muted">
              Observed risk score:{' '}
              {assessment.risk_score === null
                ? 'not enough evidence to score'
                : `${Math.round(assessment.risk_score * 100)}%`}
            </p>
          </div>
        </div>
        <p className="mt-4 text-xs leading-6 text-body">{assessment.summary}</p>
      </div>

      <div className="border-b border-line p-5">
        <h3 className="text-xs font-semibold">Detected evidence</h3>
        {assessment.evidence.length ? (
          <ul className="mt-3 space-y-3">
            {assessment.evidence.map((item, index) => (
              <li key={`${item.category}-${index}`} className="rounded-md bg-surface-raised p-3">
                <p className="text-[11px] font-semibold text-accent">{item.label}</p>
                <p className="mt-1 break-words text-[11px] leading-5 text-muted">“{item.snippet}”</p>
                <p className="mt-1 text-[10px] uppercase tracking-wide text-muted">
                  {item.source === 'EXTERNAL_AI' ? 'Grounded contextual review' : 'Local indicator'}
                </p>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-2 text-[11px] leading-5 text-muted">
            No deterministic or grounded contextual indicator was found.
          </p>
        )}
      </div>

      <div className="border-b border-line p-5">
        <h3 className="flex items-center gap-2 text-xs font-semibold">
          <ListChecks size={15} className="text-accent" aria-hidden="true" /> Recommended actions
        </h3>
        <ul className="mt-3 space-y-2 text-[11px] leading-5 text-body">
          {assessment.recommended_actions.map((action) => (
            <li key={action} className="flex gap-2">
              <span className="text-accent" aria-hidden="true">
                •
              </span>
              {action}
            </li>
          ))}
        </ul>
      </div>

      <details className="p-5 text-[11px]">
        <summary className="cursor-pointer font-semibold text-body">Components and limitations</summary>
        <dl className="mt-3 space-y-2 text-muted">
          <div className="flex justify-between gap-3">
            <dt>Local model</dt>
            <dd className="min-w-0 break-all text-right">
              {assessment.components.local_model.class_estimate} ·{' '}
              {assessment.components.local_model.version}
            </dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt>Rules</dt>
            <dd className="min-w-0 break-all text-right">
              {assessment.components.deterministic_rules.indicator_count} indicators ·{' '}
              {assessment.components.deterministic_rules.version}
            </dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt>External AI</dt>
            <dd className="min-w-0 break-all text-right">
              {assessment.components.external_ai.status.replace('_', ' ').toLowerCase()}
              {assessment.components.external_ai.model
                ? ` · ${assessment.components.external_ai.model}`
                : ''}
            </dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt>Fusion</dt>
            <dd className="min-w-0 break-all text-right">{assessment.components.fusion.version}</dd>
          </div>
        </dl>
        <ul className="mt-4 list-disc space-y-2 pl-4 leading-5 text-muted">
          {assessment.limitations.map((limitation) => (
            <li key={limitation}>{limitation}</li>
          ))}
        </ul>
      </details>
    </div>
  )
}
