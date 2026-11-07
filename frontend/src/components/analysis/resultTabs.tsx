// Builders for the result tab bar: each returns one tab (label, description, panel content)
// from a saved assessment. Kept separate from the components so they can be shared by every
// modality. They only rearrange stored data; nothing is recalculated.

import type { ReactNode } from 'react'
import { assessmentBasisSchema, type Assessment } from '../../lib/api'
import {
  isPhoneAssessment,
  isQRAssessment,
  isURLAssessment,
  orderedEvidence,
  SCORE_PRESENTATION_VERSION,
} from '../../lib/resultPresentation'
import { EvidenceList, VerdictBasis } from './ResultPresentation'

// One entry in the result tab bar. `panelLabel` names the panel for assistive technology (kept
// close to the former section names); `hint` is read as the tab's description.
export type ResultTab = {
  id: string
  label: string
  panelLabel?: string
  badge?: number
  hint?: string
  content: ReactNode
}

// Pluralise a count for tab descriptions.
function count(value: number, noun: string) {
  return `${value} ${noun}${value === 1 ? '' : 's'}`
}

// Validate optional decision/support/mitigation/uncertainty data. Older immutable records
// without this field simply have no "Why this verdict" tab.
export function basisTab(assessment: Assessment): ResultTab | null {
  // Optional for immutable historical records and QR results with an underlying engine.
  const basis = assessmentBasisSchema.safeParse(
    'assessment_basis' in assessment.components ? assessment.components.assessment_basis : null,
  )
  if (!basis.success) return null
  const { supporting, mitigating } = basis.data
  return {
    id: 'why',
    label: 'Why this verdict',
    badge: supporting.length + mitigating.length,
    hint:
      supporting.length || mitigating.length
        ? `${count(supporting.length, 'concern')} · ${mitigating.length} tempering`
        : 'No warning recorded',
    content: (
      <VerdictBasis
        decision={basis.data.decision}
        supporting={supporting}
        mitigating={mitigating}
        uncertainty={basis.data.uncertainty}
        evidence={assessment.evidence}
      />
    ),
  }
}

// Present sorted copies of evidence where severity exists and explain an empty evidence list;
// sorting never mutates the saved assessment.
export function evidenceTab(assessment: Assessment): ResultTab {
  const url = isURLAssessment(assessment)
  const phone = isPhoneAssessment(assessment)
  const items = assessment.evidence.length
  return {
    id: 'evidence',
    label: 'Evidence',
    panelLabel: isQRAssessment(assessment)
      ? 'QR decoding and security evidence'
      : phone
        ? 'Phone numbering evidence'
        : 'Detected evidence',
    badge: items,
    hint: items ? count(items, 'item') : 'None found',
    content:
      items > 0 ? (
        <EvidenceList items={orderedEvidence(assessment)} />
      ) : (
        <p className="rounded-lg border border-dashed border-control p-4 text-xs leading-6 text-muted">
          {url
            ? 'No structural warning was found. This does not verify the destination.'
            : phone
              ? 'No usable numbering metadata was found. No caller assessment can be made.'
              : 'No deterministic or grounded contextual indicator was found.'}
        </p>
      ),
  }
}

// Stored limitations of this assessment.
export function limitsTab(assessment: Assessment): ResultTab {
  return {
    id: 'limits',
    label: 'Limits',
    panelLabel: 'Assessment limitations',
    badge: assessment.limitations.length,
    hint: count(assessment.limitations.length, 'note'),
    content: (
      <>
        <p className="mb-2 text-xs font-semibold text-ink">What this assessment cannot tell you</p>
        <ul className="list-disc space-y-1.5 pl-4 text-xs leading-5 text-muted">
          {assessment.limitations.map((limitation) => (
            <li key={limitation}>{limitation}</li>
          ))}
        </ul>
      </>
    ),
  }
}

// Completion time, optional record ID and caller-specific version rows, plus the display-method
// version.
export function technicalTab(
  assessment: Assessment,
  analysisId: string | undefined,
  rows: ReactNode,
): ResultTab {
  return {
    id: 'technical',
    label: 'Technical',
    panelLabel: 'Technical details',
    content: (
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
        {rows}
        <div>
          <dt>Score presentation</dt>
          <dd>{SCORE_PRESENTATION_VERSION}</dd>
        </div>
      </dl>
    ),
  }
}
