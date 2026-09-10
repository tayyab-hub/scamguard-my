import { useId } from 'react'
import type { CSSProperties, ReactNode } from 'react'
import {
  ArrowUpRight,
  Check,
  CircleHelp,
  Fingerprint,
  ListChecks,
  ShieldAlert,
  ShieldCheck,
  Signal,
} from 'lucide-react'
import type { Assessment } from '../../lib/api'
import {
  isURLAssessment,
  isPhoneAssessment,
  orderedEvidence,
  riskCopy,
  riskScorePresentation,
  SCORE_PRESENTATION_VERSION,
  topSignals,
} from '../../lib/resultPresentation'

export function ConfidenceBadge({ assessment }: { assessment: Assessment }) {
  const unavailable = assessment.confidence_score === null
  return (
    <div className="confidence-block">
      <p className="eyebrow !text-[9px]">CONFIDENCE · SEPARATE FROM RISK</p>
      <p className="mt-2 flex items-center gap-2 text-xs font-semibold text-ink">
        <Signal size={15} aria-hidden="true" />
        Confidence: {unavailable ? 'unavailable' : assessment.confidence_level.toLowerCase()}
      </p>
      <p className="mt-1 text-[11px] leading-5 text-muted">
        {isURLAssessment(assessment)
          ? 'Local classifier strength, not certainty about the website.'
          : isPhoneAssessment(assessment)
            ? 'Unavailable: numbering metadata cannot measure fraudulent intent.'
            : 'Model and evidence strength, not a probability of fraud.'}
      </p>
    </div>
  )
}

export function RiskScoreDisplay({ assessment }: { assessment: Assessment }) {
  const score = riskScorePresentation(assessment)
  const id = useId()
  return (
    <div className="score-block">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <p id={`${id}-label`} className="eyebrow !text-[9px]">
            RISK SCORE
          </p>
          <p className="mt-2 text-[11px] text-muted">{score.kind}</p>
        </div>
        <p className="score-value tabular-nums">
          {score.value === null ? (
            <span className="text-lg">Unavailable</span>
          ) : (
            <>
              {score.value}
              <span className="ml-1 text-sm font-normal text-muted">/ 100</span>
            </>
          )}
        </p>
      </div>
      {score.value !== null ? (
        <div
          role="meter"
          aria-labelledby={`${id}-label`}
          aria-describedby={`${id}-note`}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={score.value}
          aria-valuetext={`${score.value} out of 100; ${score.kind}; ${riskCopy[assessment.risk_level]}; not a probability`}
          className="score-track mt-4"
        >
          <span
            className="score-fill"
            style={{ '--score-scale': score.value / 100 } as CSSProperties}
          />
        </div>
      ) : (
        <p className="mt-3 text-xs text-muted">
          {isPhoneAssessment(assessment)
            ? 'No defensible numeric score from numbering metadata alone.'
            : 'Not enough evidence to score.'}
        </p>
      )}
      <p id={`${id}-note`} className="mt-3 text-[11px] leading-5 text-muted">
        {isURLAssessment(assessment)
          ? 'Category position, not a scam percentage.'
          : isPhoneAssessment(assessment)
            ? 'No invented probability or category-to-number conversion.'
            : 'Combined indicator strength, not a scam percentage.'}
      </p>
      <details className="score-method mt-3 text-[11px]">
        <summary className="inline-flex min-h-8 cursor-pointer items-center gap-2 rounded font-semibold text-body">
          <CircleHelp size={13} aria-hidden="true" /> How to read this score
        </summary>
        <div className="disclosure-content mt-2 space-y-2 leading-5 text-muted">
          <p>{score.explanation}</p>
          <p>
            Score methods are domain-specific and are not comparable across analysis types. Use the
            risk level and evidence to guide your next step.
          </p>
        </div>
      </details>
    </div>
  )
}

export function AnalysisResultHero({ assessment }: { assessment: Assessment }) {
  const signals = topSignals(assessment)
  const Icon =
    assessment.risk_level === 'LOW'
      ? ShieldCheck
      : assessment.risk_level === 'INSUFFICIENT_EVIDENCE'
        ? CircleHelp
        : ShieldAlert
  return (
    <section className="result-hero" aria-label="Result summary">
      <div className="flex items-center justify-between gap-3">
        <p className="eyebrow !text-[9px]">
          {isURLAssessment(assessment)
            ? 'URL'
            : isPhoneAssessment(assessment)
              ? 'PHONE'
              : 'MESSAGE'}{' '}
          / ASSESSMENT
        </p>
        <span className="risk-icon">
          <Icon size={22} strokeWidth={1.6} aria-hidden="true" />
        </span>
      </div>
      <span className="risk-chip motion-fade mt-3">Advisory risk level</span>
      <h3 className="mt-3 font-display text-[30px] leading-tight tracking-tight text-ink">
        {riskCopy[assessment.risk_level]}
      </h3>
      <p className="mt-3 text-xs leading-6 text-body">{assessment.summary}</p>
      <div className="result-summary-grid mt-5">
        <RiskScoreDisplay assessment={assessment} />
        <ConfidenceBadge assessment={assessment} />
      </div>
      {signals.length > 0 && (
        <div className="mt-5" aria-label="Key indicators">
          <p className="eyebrow !text-[9px]">KEY INDICATORS</p>
          <p className="mt-2 text-xs leading-6 text-body">
            {signals.map((item) => item.label).join(' · ')}
          </p>
          <p className="mt-1 text-[10px] leading-5 text-muted">
            {isURLAssessment(assessment)
              ? 'Highest severity first; one signal per evidence family.'
              : isPhoneAssessment(assessment)
                ? 'Numbering metadata ordered by relevance; it does not identify the caller.'
                : 'Selected detected signals in source order; individual contributions are not measured.'}
          </p>
        </div>
      )}
      <p className="mt-4 border-t border-line pt-3 text-[11px] leading-5 text-muted">
        Advisory, not a guarantee. This assessment reflects detected indicators and limited context.
        The risk level remains the primary decision.
      </p>
      {isURLAssessment(assessment) && (
        <p className="mt-2 text-[11px] leading-5 text-muted">
          URL structure was analysed without opening the website. HTTPS does not guarantee safety.
        </p>
      )}
      {isPhoneAssessment(assessment) && (
        <p className="mt-2 text-[11px] leading-5 text-muted">
          The number was not called, messaged or sent to an external reputation service.
        </p>
      )}
    </section>
  )
}

export function EvidenceCard({
  item,
  index,
}: {
  item: Assessment['evidence'][number]
  index: number
}) {
  const severity = 'severity' in item ? item.severity.toLowerCase() : null
  return (
    <li className="evidence-card" data-severity={severity ?? 'indicator'}>
      <div className="flex items-start gap-3">
        <span className="evidence-number" aria-hidden="true">
          {String(index + 1).padStart(2, '0')}
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold leading-5 text-ink">{item.label}</p>
          <p className="mt-1 text-[10px] text-muted">
            {severity
              ? `${severity} evidence`
              : item.source === 'EXTERNAL_AI'
                ? 'Grounded contextual review'
                : 'Local indicator'}
            {item.source === 'REPUTATION' ? ' · Reputation signal' : ''}
            {item.source === 'NUMBERING_METADATA' ? ' · Numbering metadata' : ''}
          </p>
          {'explanation' in item && (
            <p className="mt-2 text-xs leading-6 text-body">{item.explanation}</p>
          )}
          <p className="evidence-snippet mt-3">{item.snippet}</p>
        </div>
      </div>
    </li>
  )
}

export function EvidencePanel({ assessment }: { assessment: Assessment }) {
  const url = isURLAssessment(assessment)
  const phone = isPhoneAssessment(assessment)
  return (
    <section
      className="result-section"
      aria-label={isPhoneAssessment(assessment) ? 'Phone numbering evidence' : 'Detected evidence'}
    >
      <h3 className="flex items-center gap-2 text-sm font-semibold">
        <Fingerprint size={16} className="text-accent" aria-hidden="true" />
        {url
          ? 'URL evidence and structural indicators'
          : phone
            ? 'Phone numbering evidence'
            : 'Detected evidence'}
      </h3>
      {assessment.evidence.length > 0 ? (
        <ul className="mt-4 space-y-3">
          {orderedEvidence(assessment).map((item, index) => (
            <EvidenceCard key={`${item.category}-${index}`} item={item} index={index} />
          ))}
        </ul>
      ) : (
        <p className="mt-4 rounded-lg border border-dashed border-control p-4 text-xs leading-6 text-muted">
          {url
            ? 'No structural warning was found. This does not verify the destination.'
            : phone
              ? 'No usable numbering metadata was found. No caller assessment can be made.'
              : 'No deterministic or grounded contextual indicator was found.'}
        </p>
      )}
    </section>
  )
}

export function RecommendedActionsPanel({ actions }: { actions: string[] }) {
  return (
    <section className="result-section actions-panel">
      <p className="eyebrow mb-2 !text-[9px]">YOUR NEXT STEP</p>
      <h3 className="flex items-center gap-2 text-sm font-semibold">
        <ListChecks size={16} className="text-accent" aria-hidden="true" />
        Recommended actions
      </h3>
      <ul className="mt-4 space-y-3">
        {actions.map((action) => (
          <li key={action} className="flex items-start gap-3 text-xs leading-6 text-body">
            <Check size={15} className="mt-1 shrink-0 text-accent" aria-hidden="true" />
            <span>{action}</span>
          </li>
        ))}
      </ul>
    </section>
  )
}

export function AnalysisMetaPanel({
  assessment,
  analysisId,
  children,
}: {
  assessment: Assessment
  analysisId?: string
  children: ReactNode
}) {
  return (
    <details className="analysis-meta result-section text-[11px]">
      <summary className="flex min-h-8 cursor-pointer items-center justify-between gap-3 rounded font-semibold text-body">
        Components and limitations
        <ArrowUpRight size={15} aria-hidden="true" />
      </summary>
      <div className="disclosure-content">
        <dl className="metadata-grid mt-4">
          {analysisId && (
            <div>
              <dt>Analysis ID</dt>
              <dd className="font-mono">{analysisId}</dd>
            </div>
          )}
          <div>
            <dt>Completed</dt>
            <dd>
              <time dateTime={assessment.completed_at}>
                {new Date(assessment.completed_at).toLocaleString()}
              </time>
            </dd>
          </div>
          {children}
          <div>
            <dt>Score presentation</dt>
            <dd>{SCORE_PRESENTATION_VERSION}</dd>
          </div>
        </dl>
        <ul className="mt-4 list-disc space-y-2 pl-4 leading-5 text-muted">
          {assessment.limitations.map((limitation) => (
            <li key={limitation}>{limitation}</li>
          ))}
        </ul>
      </div>
    </details>
  )
}
