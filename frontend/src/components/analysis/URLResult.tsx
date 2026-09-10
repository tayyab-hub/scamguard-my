import type { Assessment, URLAssessment } from '../../lib/api'
import { isPhoneAssessment, isURLAssessment } from '../../lib/resultPresentation'
import { MessageResult } from './MessageResult'
import { PhoneResult } from './PhoneResult'
import {
  AnalysisMetaPanel,
  AnalysisResultHero,
  EvidencePanel,
  RecommendedActionsPanel,
} from './ResultPresentation'

export function AssessmentResult({
  assessment,
  analysisId,
}: {
  assessment: Assessment
  analysisId?: string
}) {
  return isURLAssessment(assessment) ? (
    <URLResult assessment={assessment} analysisId={analysisId} />
  ) : isPhoneAssessment(assessment) ? (
    <PhoneResult assessment={assessment} analysisId={analysisId} />
  ) : (
    <MessageResult assessment={assessment} analysisId={analysisId} />
  )
}

export function URLResult({
  assessment,
  analysisId,
}: {
  assessment: URLAssessment
  analysisId?: string
}) {
  const { components } = assessment
  return (
    <div
      className="analysis-result motion-fade"
      data-risk={assessment.risk_level}
      aria-label="URL assessment"
    >
      <AnalysisResultHero assessment={assessment} />
      <EvidencePanel assessment={assessment} />
      <RecommendedActionsPanel actions={assessment.recommended_actions} />
      <AnalysisMetaPanel assessment={assessment} analysisId={analysisId}>
        <div>
          <dt>Local URL model</dt>
          <dd>
            {components.url_model.status.toLowerCase()} ·{' '}
            {components.url_model.version ?? 'unavailable'}
          </dd>
        </div>
        <div>
          <dt>Classifier estimate</dt>
          <dd>
            {components.url_model.class_estimate ?? 'unavailable'} ·{' '}
            {assessment.confidence_score === null
              ? 'unavailable'
              : assessment.confidence_level.toLowerCase()}{' '}
            classifier strength (uncalibrated; not a scam probability)
          </dd>
        </div>
        <div>
          <dt>URL evidence engine</dt>
          <dd>
            {components.url_rules.version} · {components.url_rules.indicator_count} indicators ·{' '}
            {components.url_rules.status.toLowerCase()}
          </dd>
        </div>
        <div>
          <dt>Optional reputation review</dt>
          <dd>
            {components.reputation.status.toLowerCase()}
            {components.reputation.provider
              ? ` · ${components.reputation.provider} · ${components.reputation.version}`
              : ''}
          </dd>
        </div>
        <div>
          <dt>Registrable domain</dt>
          <dd>{components.url_structure.registrable_domain ?? 'not identifiable'}</dd>
        </div>
        <div>
          <dt>Hostname</dt>
          <dd>{components.url_structure.hostname}</dd>
        </div>
        <div>
          <dt>URL parser</dt>
          <dd>{components.url_structure.parser_version}</dd>
        </div>
        <div>
          <dt>URL fusion</dt>
          <dd>{components.fusion.version}</dd>
        </div>
      </AnalysisMetaPanel>
    </div>
  )
}
