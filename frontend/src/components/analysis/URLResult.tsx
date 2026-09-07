import type { Assessment, MessageAssessment, URLAssessment } from '../../lib/api'
import { MessageResult } from './MessageResult'

const riskCopy = {
  LOW: 'Low observed risk',
  CAUTION: 'Caution advised',
  ELEVATED: 'Elevated risk',
  HIGH: 'High risk',
  INSUFFICIENT_EVIDENCE: 'Insufficient evidence',
} as const

export function AssessmentResult({ assessment }: { assessment: Assessment }) {
  return 'url_model' in assessment.components ? (
    <URLResult assessment={assessment as URLAssessment} />
  ) : (
    <MessageResult assessment={assessment as MessageAssessment} />
  )
}

export function URLResult({ assessment }: { assessment: URLAssessment }) {
  const { components } = assessment
  return (
    <div className="motion-fade min-w-0 [overflow-wrap:anywhere]" aria-label="URL assessment">
      <div className="border-b border-line p-5">
        <p className="eyebrow !text-[9px]">RISK LEVEL</p>
        <p className="mt-3 font-display text-2xl text-ink">{riskCopy[assessment.risk_level]}</p>
        <p className="mt-4 text-xs leading-6 text-body">{assessment.summary}</p>
        <p className="mt-3 text-[11px] leading-5 text-muted">
          URL structure was analysed without opening the website. HTTPS does not guarantee safety.
        </p>
      </div>
      <div className="border-b border-line p-5">
        <h3 className="text-xs font-semibold">URL evidence and structural indicators</h3>
        {assessment.evidence.length ? (
          <ul className="mt-3 space-y-3">
            {assessment.evidence.map((item, index) => (
              <li key={`${item.category}-${index}`} className="rounded-md bg-surface-raised p-3">
                <p className="text-[11px] font-semibold text-accent">{item.label}</p>
                <p className="mt-1 text-[11px] leading-5 text-body">{item.explanation}</p>
                <p className="mt-2 text-[11px] leading-5 text-muted">{item.snippet}</p>
                <p className="mt-1 text-[10px] text-muted">
                  {item.severity.toLowerCase()} evidence
                </p>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-3 text-[11px] leading-5 text-muted">
            No structural warning was found. This does not verify the destination.
          </p>
        )}
      </div>
      <div className="border-b border-line p-5">
        <h3 className="text-xs font-semibold">Recommended actions</h3>
        <ul className="mt-3 list-disc space-y-2 pl-4 text-[11px] leading-5 text-body">
          {assessment.recommended_actions.map((action) => (
            <li key={action}>{action}</li>
          ))}
        </ul>
      </div>
      <details className="p-5 text-[11px]">
        <summary className="cursor-pointer font-semibold text-body">
          Components and limitations
        </summary>
        <dl className="mt-3 space-y-3 text-muted">
          <div>
            <dt className="font-semibold">Local URL model</dt>
            <dd>
              {components.url_model.status.toLowerCase()} ·{' '}
              {components.url_model.version ?? 'unavailable'}
            </dd>
          </div>
          <div>
            <dt className="font-semibold">Classifier estimate</dt>
            <dd>
              {components.url_model.class_estimate ?? 'unavailable'} ·{' '}
              {assessment.confidence_level.toLowerCase()} classifier strength (uncalibrated; not a
              scam probability)
            </dd>
          </div>
          <div>
            <dt className="font-semibold">URL evidence engine</dt>
            <dd>
              {components.url_rules.version} · {components.url_rules.indicator_count} indicators
            </dd>
          </div>
          <div>
            <dt className="font-semibold">Optional reputation review</dt>
            <dd>
              {components.reputation.status.toLowerCase()}
              {components.reputation.provider
                ? ` · ${components.reputation.provider} · ${components.reputation.version}`
                : ''}
            </dd>
          </div>
          <div>
            <dt className="font-semibold">Registrable domain</dt>
            <dd>{components.url_structure.registrable_domain ?? 'not identifiable'}</dd>
          </div>
          <div>
            <dt className="font-semibold">Hostname</dt>
            <dd>{components.url_structure.hostname}</dd>
          </div>
          <div>
            <dt className="font-semibold">URL fusion</dt>
            <dd>{components.fusion.version}</dd>
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
