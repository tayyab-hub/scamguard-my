// Shared advisory-result building blocks across all modalities. These components receive
// validated assessment props; scores are display transformations only, confidence remains
// separate and evidence stays inert text.

import { useId, useState } from 'react'
import type { CSSProperties, ReactNode } from 'react'
import {
  Check,
  ChevronDown,
  CircleHelp,
  FileCog,
  Info,
  Scale,
  Fingerprint,
  ListChecks,
  ShieldAlert,
  ShieldCheck,
  Signal,
} from 'lucide-react'
import { assessmentBasisSchema, type Assessment } from '../../lib/api'
import {
  isCalibratedMessageScore,
  isURLAssessment,
  isPhoneAssessment,
  isQRAssessment,
  orderedEvidence,
  riskCopy,
  riskGuidance,
  riskScorePresentation,
  SCORE_PRESENTATION_VERSION,
  topSignals,
} from '../../lib/resultPresentation'

// Collapsible result section (WAI-ARIA accordion pattern: a heading containing a button). The
// summary row stays visible with a short hint so people can see what is inside before opening it;
// supporting detail is kept out of the way rather than removed.
export function ResultDisclosure({
  title,
  label,
  icon,
  hint,
  className = '',
  children,
}: {
  title: string
  label?: string
  icon?: ReactNode
  hint?: string
  className?: string
  children: ReactNode
}) {
  const [open, setOpen] = useState(false)
  const id = useId()
  return (
    <section
      className={`result-section result-disclosure ${className}`}
      aria-label={label ?? title}
      data-open={open}
    >
      <h3 className="text-sm font-semibold">
        <button
          type="button"
          className="disclosure-trigger"
          aria-expanded={open}
          aria-controls={`${id}-panel`}
          aria-describedby={hint ? `${id}-hint` : undefined}
          onClick={() => setOpen((value) => !value)}
        >
          {icon}
          <span className="disclosure-title">{title}</span>
          {hint && (
            <span id={`${id}-hint`} aria-hidden="true" className="disclosure-hint">
              {hint}
            </span>
          )}
          <ChevronDown size={16} className="disclosure-chevron" aria-hidden="true" />
        </button>
      </h3>
      <div id={`${id}-panel`} hidden={!open} className="disclosure-content mt-4">
        {children}
      </div>
    </section>
  )
}

// Pluralise a count for disclosure hints.
function count(value: number, noun: string) {
  return `${value} ${noun}${value === 1 ? '' : 's'}`
}

// Show unavailable when confidence_score is null; otherwise display the stored strength label
// with the relevant modality limitation.
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
        {isQRAssessment(assessment)
          ? 'QR decoding and routed-engine evidence strength, not certainty about the code.'
          : isURLAssessment(assessment)
            ? 'Local classifier strength, not certainty about the website.'
            : isPhoneAssessment(assessment)
              ? 'Unavailable: numbering metadata cannot measure fraudulent intent.'
              : unavailable
                ? 'There is not enough supported evidence to report confidence.'
                : 'Uncalibrated model and evidence strength, not a probability of fraud.'}
      </p>
    </div>
  )
}

// Use riskScorePresentation for Message scaling or URL category index and omit the meter when
// unscored. Accessible meter text explicitly says this is not a probability.
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
        {score.kind === 'URL category index'
          ? 'Category position, not a scam percentage.'
          : isPhoneAssessment(assessment)
            ? 'No invented probability or category-to-number conversion.'
            : isCalibratedMessageScore(assessment)
              ? 'Calibrated on historical SMS; not a guarantee for this message.'
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

// Combine stored risk/category guidance, summary, score, confidence and a small diverse signal
// selection; no frontend classification occurs.
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
          {isQRAssessment(assessment)
            ? 'QR'
            : isURLAssessment(assessment)
              ? 'URL'
              : isPhoneAssessment(assessment)
                ? 'PHONE'
                : 'MESSAGE'}{' '}
          · ADVISORY RISK LEVEL
        </p>
        <span className="risk-icon">
          <Icon size={22} strokeWidth={1.6} aria-hidden="true" />
        </span>
      </div>
      <h3 className="mt-2 font-display text-[30px] leading-tight tracking-tight text-ink">
        {riskCopy[assessment.risk_level]}
      </h3>
      <p className="risk-guidance mt-2 text-xs font-medium leading-6 text-body">
        {riskGuidance[assessment.risk_level]}
      </p>
      <p className="mt-2 text-xs leading-6 text-muted">{assessment.summary}</p>
      <div className="result-summary-grid mt-4">
        <RiskScoreDisplay assessment={assessment} />
        <ConfidenceBadge assessment={assessment} />
      </div>
      {signals.length > 0 && (
        <div className="mt-4" aria-label="Key indicators">
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
      {isQRAssessment(assessment) && (
        <p className="mt-2 text-[11px] leading-5 text-muted">
          The QR code was decoded locally. Its content was not opened, executed, contacted or
          fetched.
        </p>
      )}
    </section>
  )
}

// Validate optional decision/support/mitigation/uncertainty data before rendering. Older
// immutable records without this field simply omit the panel.
export function AssessmentBasisPanel({ assessment }: { assessment: Assessment }) {
  // Optional for immutable historical records and QR results with an underlying engine.
  const basis = assessmentBasisSchema.safeParse(
    'assessment_basis' in assessment.components ? assessment.components.assessment_basis : null,
  )
  if (!basis.success) return null
  const { supporting, mitigating } = basis.data
  return (
    <ResultDisclosure
      title="Why this verdict"
      className="assessment-basis"
      icon={<Scale size={16} className="text-accent" aria-hidden="true" />}
      hint={
        supporting.length || mitigating.length
          ? `${count(supporting.length, 'concern')} · ${mitigating.length} tempering`
          : 'No warning recorded'
      }
    >
      <p className="text-sm leading-6 text-body">{basis.data.decision}</p>
      <div className="evidence-balance mt-5">
        <div>
          <h4 className="text-xs font-semibold text-ink">What raises concern</h4>
          {basis.data.supporting.length ? (
            <ul className="mt-3 space-y-2 text-xs leading-6 text-body">
              {basis.data.supporting.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          ) : (
            <p className="mt-3 text-xs leading-6 text-muted">
              No corroborating warning is recorded. Absence of a warning does not establish safety.
            </p>
          )}
        </div>
        <div>
          <h4 className="text-xs font-semibold text-ink">What tempers the result</h4>
          {basis.data.mitigating.length ? (
            <ul className="mt-3 space-y-2 text-xs leading-6 text-body">
              {basis.data.mitigating.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          ) : (
            <p className="mt-3 text-xs leading-6 text-muted">
              No specific mitigating evidence is recorded. Sender identity and intent remain
              unverified.
            </p>
          )}
        </div>
      </div>
      <ul
        className="mt-5 space-y-2 border-t border-line pt-4 text-xs leading-6 text-muted"
        aria-label="Evidence uncertainty"
      >
        {basis.data.uncertainty.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </ResultDisclosure>
  )
}

// Display one evidence item and its available source/severity/explanation. React text
// interpolation escapes untrusted snippets instead of interpreting HTML.
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
                : item.source === 'EMBEDDED_URL'
                  ? 'Offline link check · not opened'
                  : item.source === 'EMBEDDED_PHONE'
                    ? 'Offline number check · not contacted'
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

// Present sorted copies of evidence where severity exists and explain an empty evidence list;
// sorting never mutates the saved assessment.
export function EvidencePanel({ assessment }: { assessment: Assessment }) {
  const url = isURLAssessment(assessment)
  const phone = isPhoneAssessment(assessment)
  const items = assessment.evidence.length
  return (
    <ResultDisclosure
      label={
        isQRAssessment(assessment)
          ? 'QR decoding and security evidence'
          : phone
            ? 'Phone numbering evidence'
            : 'Detected evidence'
      }
      title={
        isQRAssessment(assessment)
          ? 'QR decoding and routed intelligence evidence'
          : url
            ? 'URL evidence and structural indicators'
            : phone
              ? 'Phone numbering evidence'
              : 'Detected evidence'
      }
      icon={<Fingerprint size={16} className="text-accent" aria-hidden="true" />}
      hint={items ? count(items, 'item') : 'None found'}
    >
      {assessment.evidence.length > 0 ? (
        <ul className="space-y-3">
          {orderedEvidence(assessment).map((item, index) => (
            <EvidenceCard key={`${item.category}-${index}`} item={item} index={index} />
          ))}
        </ul>
      ) : (
        <p className="rounded-lg border border-dashed border-control p-4 text-xs leading-6 text-muted">
          {url
            ? 'No structural warning was found. This does not verify the destination.'
            : phone
              ? 'No usable numbering metadata was found. No caller assessment can be made.'
              : 'No deterministic or grounded contextual indicator was found.'}
        </p>
      )}
    </ResultDisclosure>
  )
}

// Render the backend's recommended action strings as an ordered list without executing them.
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

// Show stored limitations, completion time, optional record ID and caller-specific version
// rows, plus the display-method version.
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
    <>
      <ResultDisclosure
        title="What this assessment cannot tell you"
        label="Assessment limitations"
        icon={<Info size={16} className="text-accent" aria-hidden="true" />}
        hint={count(assessment.limitations.length, 'note')}
      >
        <ul className="list-disc space-y-2 pl-4 text-xs leading-6 text-muted">
          {assessment.limitations.map((limitation) => (
            <li key={limitation}>{limitation}</li>
          ))}
        </ul>
      </ResultDisclosure>
      <ResultDisclosure
        title="Technical details"
        className="analysis-meta"
        icon={<FileCog size={16} className="text-accent" aria-hidden="true" />}
      >
        <dl className="metadata-grid">
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
      </ResultDisclosure>
    </>
  )
}
