// Shared advisory-result building blocks across all modalities. These components receive
// validated assessment props; scores are display transformations only, confidence remains
// separate and evidence stays inert text.
//
// Layout (compact): a verdict block (risk level, score and confidence together), a highlighted
// next step, then one bar of collapsible sections so at most one detail view is open at a time.
// Nothing is removed compared with the stacked layout; supporting detail moves into tabs.

import { useEffect, useId, useRef, useState } from 'react'
import type { ResultTab } from './resultTabs'
import { CountUp } from '../motion/CountUp'
import { Pop, Reveal } from '../motion/Reveal'
import type { CSSProperties, KeyboardEvent } from 'react'
import { ChevronDown, CircleHelp, ListChecks, ShieldAlert, ShieldCheck, Signal } from 'lucide-react'
import type { Assessment } from '../../lib/api'
import {
  isCalibratedMessageScore,
  isURLAssessment,
  isPhoneAssessment,
  isQRAssessment,
  matchEvidence,
  riskCopy,
  riskGuidance,
  riskScorePresentation,
  topSignals,
} from '../../lib/resultPresentation'

// Collapsible tabs: one section open at a time, and none open unless `initial` names one.
// Clicking a tab opens its section; clicking the open tab closes it again (aria-expanded tells
// assistive technology which). Arrow keys, Home and End move between tabs and open the target.
// All panels stay mounted (hidden when closed) so local state such as sender-question answers
// survives switching or closing.
export function ResultTabs({ tabs, initial }: { tabs: ResultTab[]; initial?: string }) {
  const id = useId()
  const [selected, setSelected] = useState<string | null>(
    () => tabs.find((tab) => tab.id === initial)?.id ?? null,
  )
  const refs = useRef<(HTMLButtonElement | null)[]>([])
  const current = tabs.some((tab) => tab.id === selected) ? selected : null
  const currentIndex = tabs.findIndex((tab) => tab.id === current)
  // The tab reachable with Tab: the open one, otherwise the first.
  const focusIndex = Math.max(currentIndex, 0)

  // On narrow screens the tab bar scrolls sideways; keep the open tab in view.
  useEffect(() => {
    const tab = refs.current[currentIndex]
    const list = tab?.parentElement
    if (!tab || !list || list.scrollWidth <= list.clientWidth) return
    const left = tab.offsetLeft - list.offsetLeft
    if (left < list.scrollLeft || left + tab.offsetWidth > list.scrollLeft + list.clientWidth)
      list.scrollTo({ left: Math.max(0, left - 16) })
  }, [currentIndex])

  if (tabs.length === 0) return null

  function onKeyDown(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    const last = tabs.length - 1
    const next =
      event.key === 'ArrowRight'
        ? index === last
          ? 0
          : index + 1
        : event.key === 'ArrowLeft'
          ? index === 0
            ? last
            : index - 1
          : event.key === 'Home'
            ? 0
            : event.key === 'End'
              ? last
              : null
    const target = next === null ? undefined : tabs[next]
    if (next === null || !target) return
    event.preventDefault()
    setSelected(target.id)
    refs.current[next]?.focus()
  }

  return (
    <section className="result-details" aria-label="Result details" data-open={current !== null}>
      <div role="tablist" aria-label="Result details" className="result-tablist">
        {tabs.map((tab, index) => {
          const active = tab.id === current
          return (
            <button
              key={tab.id}
              ref={(node) => {
                refs.current[index] = node
              }}
              type="button"
              role="tab"
              id={`${id}-${tab.id}-tab`}
              aria-selected={active}
              aria-expanded={active}
              aria-controls={`${id}-${tab.id}-panel`}
              aria-describedby={tab.hint ? `${id}-${tab.id}-hint` : undefined}
              tabIndex={index === focusIndex ? 0 : -1}
              className="result-tab"
              onClick={() => setSelected((value) => (value === tab.id ? null : tab.id))}
              onKeyDown={(event) => onKeyDown(event, index)}
            >
              {tab.label}
              {tab.badge !== undefined && tab.badge > 0 && (
                <span className="result-tab-badge" aria-hidden="true">
                  {tab.badge}
                </span>
              )}
              <ChevronDown size={12} className="result-tab-chevron" aria-hidden="true" />
            </button>
          )
        })}
      </div>
      {tabs.map(
        (tab) =>
          tab.hint && (
            <span key={tab.id} id={`${id}-${tab.id}-hint`} hidden>
              {tab.hint}
            </span>
          ),
      )}
      {current === null && (
        <p className="result-tabs-hint">
          Open a section above to see the details behind this result.
        </p>
      )}
      {tabs.map((tab) => (
        <div
          key={tab.id}
          role="tabpanel"
          id={`${id}-${tab.id}-panel`}
          aria-label={tab.panelLabel ?? tab.label}
          hidden={tab.id !== current}
          tabIndex={0}
          className="result-tabpanel"
        >
          {tab.content}
        </div>
      ))}
    </section>
  )
}

// Modality-specific explanation of what confidence measures.
function confidenceNote(assessment: Assessment) {
  const unavailable = assessment.confidence_score === null
  return isQRAssessment(assessment)
    ? 'QR decoding and routed-engine evidence strength, not certainty about the code.'
    : isURLAssessment(assessment)
      ? 'Local classifier strength, not certainty about the website.'
      : isPhoneAssessment(assessment)
        ? 'Unavailable: numbering metadata cannot measure fraudulent intent.'
        : unavailable
          ? 'There is not enough supported evidence to report confidence.'
          : 'Uncalibrated model and evidence strength, not a probability of fraud.'
}

// Show unavailable when confidence_score is null; otherwise display the stored strength label.
// The explanation of what it measures lives in "How to read this score".
export function ConfidenceBadge({ assessment }: { assessment: Assessment }) {
  const unavailable = assessment.confidence_score === null
  return (
    <p className="confidence-line">
      <Signal size={13} aria-hidden="true" />
      Confidence: {unavailable ? 'unavailable' : assessment.confidence_level.toLowerCase()}
    </p>
  )
}

// Compact score card: score, score kind, meter and confidence together. Accessible meter text
// explicitly says this is not a probability; the meter is omitted when unscored.
export function RiskScoreDisplay({
  assessment,
  noteId,
}: {
  assessment: Assessment
  noteId: string
}) {
  const score = riskScorePresentation(assessment)
  const id = useId()
  return (
    <div className="score-card">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p id={`${id}-label`} className="eyebrow !text-[12px]">
            Risk score
          </p>
        </div>
        <p className="score-value tabular-nums">
          {score.value === null ? (
            <span className="text-sm">Unavailable</span>
          ) : (
            <>
              <CountUp value={score.value} duration={0.9} delay={0.2} />
              <span className="ml-0.5 whitespace-nowrap text-[12px] font-normal text-muted">
                /100
              </span>
            </>
          )}
        </p>
      </div>
      <p className="text-[12px] leading-4 text-muted">{score.kind}</p>
      {score.value !== null ? (
        <div
          role="meter"
          aria-labelledby={`${id}-label`}
          aria-describedby={noteId}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={score.value}
          aria-valuetext={`${score.value} out of 100; ${score.kind}; ${riskCopy[assessment.risk_level]}; not a probability`}
          className="score-track mt-2"
        >
          <span
            className="score-fill"
            style={{ '--score-scale': score.value / 100 } as CSSProperties}
          />
        </div>
      ) : (
        <p className="mt-1 text-[12px] leading-4 text-muted">
          {isPhoneAssessment(assessment)
            ? 'No defensible numeric score from numbering metadata alone.'
            : 'Not enough evidence to score.'}
        </p>
      )}
      <div className="mt-2">
        <ConfidenceBadge assessment={assessment} />
      </div>
    </div>
  )
}

// Combine stored risk/category guidance, summary, score, confidence and a small diverse signal
// selection; no frontend classification occurs.
export function AnalysisResultHero({ assessment }: { assessment: Assessment }) {
  const signals = topSignals(assessment)
  const score = riskScorePresentation(assessment)
  const noteId = useId()
  const Icon =
    assessment.risk_level === 'LOW'
      ? ShieldCheck
      : assessment.risk_level === 'INSUFFICIENT_EVIDENCE'
        ? CircleHelp
        : ShieldAlert
  return (
    <section className="result-hero" aria-label="Result summary">
      <div className="hero-top">
        <div className="min-w-0 flex-1">
          <p className="eyebrow flex items-center gap-2 !text-[12px]">
            <Pop className="risk-icon" delay={0.12}>
              <Icon size={15} strokeWidth={1.8} aria-hidden="true" />
            </Pop>
            {isQRAssessment(assessment)
              ? 'QR'
              : isURLAssessment(assessment)
                ? 'URL'
                : isPhoneAssessment(assessment)
                  ? 'Phone'
                  : 'Message'}{' '}
            · advisory risk level
          </p>
          <h3 className="mt-1.5 font-display text-[26px] leading-tight tracking-tight text-ink">
            {riskCopy[assessment.risk_level]}
          </h3>
          <p className="risk-guidance mt-2 text-xs font-medium leading-5 text-body">
            {riskGuidance[assessment.risk_level]}
          </p>
          <p className="mt-1.5 text-[12px] leading-5 text-muted">{assessment.summary}</p>
        </div>
        <RiskScoreDisplay assessment={assessment} noteId={noteId} />
      </div>
      {signals.length > 0 && (
        <div className="indicator-row mt-3" aria-label="Key indicators">
          <p className="eyebrow !text-[12px]">Key indicators</p>
          {signals.map((item) => (
            <span key={item.label} className="indicator-chip">
              {item.label}
            </span>
          ))}
        </div>
      )}
      <div className="hero-footnote mt-3">
        <p className="text-[12px] leading-5 text-muted">
          <span id={noteId}>
            {score.kind === 'URL category index'
              ? 'Category position, not a scam percentage.'
              : isPhoneAssessment(assessment)
                ? 'No invented probability or category-to-number conversion.'
                : isCalibratedMessageScore(assessment)
                  ? 'Calibrated on historical SMS; not a guarantee for this message.'
                  : 'Combined indicator strength, not a scam percentage.'}
          </span>{' '}
          {isURLAssessment(assessment)
            ? 'The website was not opened; HTTPS does not guarantee safety. '
            : isPhoneAssessment(assessment)
              ? 'The number was not called, messaged or sent to a reputation service. '
              : isQRAssessment(assessment)
                ? 'The QR content was decoded locally and not opened or contacted. '
                : ''}
          Advisory, not a guarantee.
        </p>
        <details className="score-method text-[12px]">
          <summary className="inline-flex min-h-8 cursor-pointer items-center gap-1.5 rounded font-semibold text-accent">
            <CircleHelp size={13} aria-hidden="true" /> How to read this score
          </summary>
          <div className="disclosure-content mt-2 space-y-2 leading-5 text-muted">
            <p>{score.explanation}</p>
            <p>Confidence is separate from risk: {confidenceNote(assessment)}</p>
            {signals.length > 0 && (
              <p>
                Key indicators:{' '}
                {isURLAssessment(assessment)
                  ? 'highest severity first; one signal per evidence family.'
                  : isPhoneAssessment(assessment)
                    ? 'numbering metadata ordered by relevance; it does not identify the caller.'
                    : 'selected detected signals in source order; individual contributions are not measured.'}
              </p>
            )}
            <p>
              Score methods are domain-specific and are not comparable across analysis types. This
              assessment reflects detected indicators and limited context; the risk level remains
              the primary decision.
            </p>
          </div>
        </details>
      </div>
    </section>
  )
}

// Where an evidence item came from, in plain words.
function evidenceSource(item: Assessment['evidence'][number]) {
  const severity = 'severity' in item ? item.severity.toLowerCase() : null
  return (
    (severity
      ? `${severity} evidence`
      : item.source === 'EXTERNAL_AI'
        ? 'Grounded contextual review'
        : item.source === 'EMBEDDED_URL'
          ? 'Offline link check · not opened'
          : item.source === 'EMBEDDED_PHONE'
            ? 'Offline number check · not contacted'
            : 'Local indicator') +
    (item.source === 'REPUTATION' ? ' · Reputation signal' : '') +
    (item.source === 'NUMBERING_METADATA' ? ' · Numbering metadata' : '')
  )
}

// One evidence item as a compact row: label and source always visible; the snippet is one line
// until the list is expanded, when the explanation and full snippet show. React text
// interpolation escapes untrusted snippets instead of interpreting HTML.
export function EvidenceCard({
  item,
  index,
  expanded = true,
}: {
  item: Assessment['evidence'][number]
  index: number
  expanded?: boolean
}) {
  const severity = 'severity' in item ? item.severity.toLowerCase() : null
  return (
    <li className="evidence-card" data-severity={severity ?? 'indicator'}>
      <span className="evidence-number" aria-hidden="true">
        {String(index + 1).padStart(2, '0')}
      </span>
      <div className="min-w-0 flex-1">
        <p className="evidence-head">
          <span className="font-semibold text-ink">{item.label}</span>
          <span className="evidence-source">{evidenceSource(item)}</span>
        </p>
        {'explanation' in item && (
          <p className="mt-1 text-xs leading-5 text-body" hidden={!expanded}>
            {item.explanation}
          </p>
        )}
        {expanded && (
          <p className="mt-1 text-[12px] text-muted">Matched text (untrusted, shown as text):</p>
        )}
        <p className="evidence-snippet" data-expanded={expanded}>
          {item.snippet}
        </p>
      </div>
    </li>
  )
}

// Evidence rows with one toggle for the full text, so many items stay short by default.
export function EvidenceList({ items }: { items: Assessment['evidence'] }) {
  const [expanded, setExpanded] = useState(false)
  const id = useId()
  return (
    <>
      <div className="mb-2 flex items-center justify-between gap-2">
        <p className="text-[12px] text-muted">
          {items.length} {items.length === 1 ? 'item' : 'items'}
        </p>
        <button
          type="button"
          className="text-link"
          aria-expanded={expanded}
          aria-controls={id}
          onClick={() => setExpanded((value) => !value)}
        >
          {expanded ? 'Show less' : 'Show full text'}
        </button>
      </div>
      <ul id={id} className="evidence-list">
        {items.map((item, index) => (
          <EvidenceCard
            key={`${item.category}-${index}`}
            item={item}
            index={index}
            expanded={expanded}
          />
        ))}
      </ul>
    </>
  )
}

// One reason in "Why this verdict". When a saved evidence item backs it, the row opens to show
// that item's source, explanation and matched text; otherwise it is a plain row.
function ReasonRow({
  text,
  tone,
  evidence,
}: {
  text: string
  tone: 'concern' | 'temper'
  evidence: Assessment['evidence']
}) {
  const match = matchEvidence(text, evidence)
  if (!match)
    return (
      <li className="reason-row" data-tone={tone}>
        <div className="reason-summary">
          <span className="reason-dot" aria-hidden="true" />
          <span className="min-w-0 flex-1">{text}</span>
        </div>
      </li>
    )
  return (
    <li className="reason-row" data-tone={tone}>
      <details className="reason-details">
        <summary className="reason-summary">
          <span className="reason-dot" aria-hidden="true" />
          <span className="min-w-0 flex-1">{text}</span>
          <ChevronDown size={14} className="reason-chevron" aria-hidden="true" />
        </summary>
        <div className="reason-body">
          <p className="text-[12px] font-medium uppercase tracking-wide text-muted">
            {evidenceSource(match)}
          </p>
          {match.label.trim().toLowerCase() !== text.trim().toLowerCase() && (
            <p className="mt-1 text-xs font-semibold text-ink">{match.label}</p>
          )}
          {'explanation' in match && typeof match.explanation === 'string' && (
            <p className="mt-1 text-xs leading-5 text-body">{match.explanation}</p>
          )}
          <p className="mt-2 text-[12px] text-muted">Matched text (untrusted, shown as text):</p>
          <p className="evidence-snippet" data-expanded="true">
            {match.snippet}
          </p>
        </div>
      </details>
    </li>
  )
}

// "Why this verdict": the decision, then reasons that raise concern and reasons that temper it,
// each row opening to its evidence; remaining uncertainty is one collapsed row.
export function VerdictBasis({
  decision,
  supporting,
  mitigating,
  uncertainty,
  evidence,
}: {
  decision: string
  supporting: string[]
  mitigating: string[]
  uncertainty: string[]
  evidence: Assessment['evidence']
}) {
  return (
    <div className="space-y-3">
      <p className="text-xs leading-5 text-body">{decision}</p>
      <div>
        <h4 className="reason-heading">
          <span>What raises concern</span>
          <span className="reason-count">{supporting.length}</span>
        </h4>
        {supporting.length ? (
          <ul className="reason-list">
            {supporting.map((item) => (
              <ReasonRow key={item} text={item} tone="concern" evidence={evidence} />
            ))}
          </ul>
        ) : (
          <p className="text-xs leading-5 text-muted">
            No corroborating warning is recorded. Absence of a warning does not establish safety.
          </p>
        )}
      </div>
      <div>
        <h4 className="reason-heading">
          <span>What tempers the result</span>
          <span className="reason-count">{mitigating.length}</span>
        </h4>
        {mitigating.length ? (
          <ul className="reason-list">
            {mitigating.map((item) => (
              <ReasonRow key={item} text={item} tone="temper" evidence={evidence} />
            ))}
          </ul>
        ) : (
          <p className="text-xs leading-5 text-muted">
            No specific mitigating evidence is recorded. Sender identity and intent remain
            unverified.
          </p>
        )}
      </div>
      {uncertainty.length > 0 && (
        <details className="reason-details reason-uncertainty">
          <summary className="reason-summary">
            <CircleHelp size={13} className="shrink-0 text-muted" aria-hidden="true" />
            <span className="min-w-0 flex-1">What remains uncertain ({uncertainty.length})</span>
            <ChevronDown size={14} className="reason-chevron" aria-hidden="true" />
          </summary>
          <ul
            className="reason-body space-y-1.5 text-xs leading-5 text-muted"
            aria-label="Evidence uncertainty"
          >
            {uncertainty.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </details>
      )}
    </div>
  )
}

// Render the backend's recommended action strings as a highlighted next-step strip without
// executing them. The first two are always shown; the rest are one click away.
const VISIBLE_ACTIONS = 2
export function RecommendedActionsPanel({ actions }: { actions: string[] }) {
  const [all, setAll] = useState(false)
  const id = useId()
  const extra = actions.length - VISIBLE_ACTIONS
  return (
    <section className="actions-panel" aria-label="Your next step">
      <ListChecks size={17} className="mt-0.5 shrink-0 text-accent" aria-hidden="true" />
      <div className="min-w-0 flex-1">
        <h3 className="text-[13px] font-semibold text-accent">Recommended actions</h3>
        <ul id={id} className="mt-1 space-y-1">
          {actions.map((action, index) => (
            <li
              key={action}
              className="text-[12.5px] font-medium leading-5 text-ink"
              hidden={!all && index >= VISIBLE_ACTIONS}
            >
              {action}
            </li>
          ))}
        </ul>
        {extra > 0 && (
          <button
            type="button"
            className="text-link mt-1"
            aria-expanded={all}
            aria-controls={id}
            onClick={() => setAll((value) => !value)}
          >
            {all
              ? 'Show fewer actions'
              : `Show ${extra} more ${extra === 1 ? 'action' : 'actions'}`}
          </button>
        )}
      </div>
    </section>
  )
}

// Shared result shell used by every modality: verdict, next step, then the tabbed details, each
// revealed in turn (no animation under reduced motion).
export function AssessmentLayout({
  assessment,
  label,
  tabs,
  initialTab,
}: {
  assessment: Assessment
  label: string
  tabs: (ResultTab | null)[]
  initialTab?: string
}) {
  const present = tabs.filter((tab): tab is ResultTab => tab !== null)
  return (
    <div
      className="analysis-result motion-fade"
      data-risk={assessment.risk_level}
      aria-label={label}
    >
      {/* Staged reveal: verdict, then the next step, then the details (still when reduced). */}
      <Reveal>
        <AnalysisResultHero assessment={assessment} />
      </Reveal>
      <Reveal delay={0.16}>
        <RecommendedActionsPanel actions={assessment.recommended_actions} />
      </Reveal>
      <Reveal delay={0.26}>
        <ResultTabs tabs={present} initial={initialTab} />
      </Reveal>
    </div>
  )
}
