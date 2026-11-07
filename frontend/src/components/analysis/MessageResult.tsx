// Message result composition using shared hero, actions, evidence and metadata panels. Shows
// the learned class separately from final risk and reports whether optional review actually
// contributed.

import type { MessageAssessment } from '../../lib/api'
import {
  AnalysisMetaPanel,
  AnalysisResultHero,
  AssessmentBasisPanel,
  EvidencePanel,
  RecommendedActionsPanel,
} from './ResultPresentation'
import { SenderContextCheck } from './SenderContextCheck'

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
  return (
    <div
      className="analysis-result motion-fade"
      data-risk={assessment.risk_level}
      aria-label="Message assessment"
    >
      <AnalysisResultHero assessment={assessment} />
      <RecommendedActionsPanel actions={assessment.recommended_actions} />
      {['LOW', 'CAUTION', 'INSUFFICIENT_EVIDENCE'].includes(assessment.risk_level) && (
        <SenderContextCheck />
      )}
      <AssessmentBasisPanel assessment={assessment} />
      <EvidencePanel assessment={assessment} />
      <AnalysisMetaPanel assessment={assessment} analysisId={analysisId}>
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
              {components.local_model.matched_features} · support check, not a confidence percentage
            </dd>
          </div>
        )}
      </AnalysisMetaPanel>
    </div>
  )
}
