// Message result composition using the shared compact layout: verdict, next step, then tabs.
// Shows the learned class separately from final risk and reports whether optional review
// actually contributed.

import type { MessageAssessment } from '../../lib/api'
import { AssessmentLayout } from './ResultPresentation'
import { basisTab, evidenceTab, limitsTab, technicalTab } from './resultTabs'
import { SenderContextCheck } from './SenderContextCheck'
import { QUESTIONS } from '../../lib/senderContext'

// Accept a validated MessageAssessment and optional record ID; return the saved decision
// explanation and versions without invoking any model.
export function MessageResult({
  assessment,
  analysisId,
}: {
  assessment: MessageAssessment
  analysisId?: string
}) {
  const { components } = assessment
  // Unclear results open on the sender questions, because text alone cannot settle them; every
  // other section starts closed. Clearer (Elevated/High) results start with all sections closed.
  const unclear = ['LOW', 'CAUTION', 'INSUFFICIENT_EVIDENCE'].includes(assessment.risk_level)
  return (
    <AssessmentLayout
      assessment={assessment}
      label="Message assessment"
      initialTab={unclear ? 'check' : undefined}
      tabs={[
        unclear
          ? {
              id: 'check',
              label: 'Quick check',
              panelLabel: 'Sender questions',
              badge: QUESTIONS.length,
              hint: `${QUESTIONS.length} questions about the sender`,
              content: <SenderContextCheck />,
            }
          : null,
        basisTab(assessment),
        evidenceTab(assessment),
        limitsTab(assessment),
        technicalTab(
          assessment,
          analysisId,
          <>
            <div>
              <dt>Local model</dt>
              <dd>
                {components.local_model.class_estimate} · {components.local_model.version} · used
              </dd>
            </div>
            <div>
              <dt>Rules</dt>
              <dd>
                {components.deterministic_rules.indicator_count} indicators ·{' '}
                {components.deterministic_rules.version} · used
              </dd>
            </div>
            <div>
              <dt>External AI</dt>
              <dd>
                {components.external_ai.status.replaceAll('_', ' ').toLowerCase()}
                {components.external_ai.model ? ` · ${components.external_ai.model}` : ''} ·{' '}
                {components.external_ai.contributed ? 'contributed' : 'no contribution'}
              </dd>
            </div>
            <div>
              <dt>Fusion</dt>
              <dd>{components.fusion.version}</dd>
            </div>
            {components.local_model.matched_features !== undefined && (
              <div>
                <dt>Matched vocabulary features</dt>
                <dd>
                  {components.local_model.matched_features} · support check, not a confidence
                  percentage
                </dd>
              </div>
            )}
          </>,
        ),
      ]}
    />
  )
}
