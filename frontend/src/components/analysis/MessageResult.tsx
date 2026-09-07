import type { MessageAssessment } from '../../lib/api'
import {
  AnalysisMetaPanel,
  AnalysisResultHero,
  EvidencePanel,
  RecommendedActionsPanel,
} from './ResultPresentation'

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
      <EvidencePanel assessment={assessment} />
      <RecommendedActionsPanel actions={assessment.recommended_actions} />
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
      </AnalysisMetaPanel>
    </div>
  )
}
