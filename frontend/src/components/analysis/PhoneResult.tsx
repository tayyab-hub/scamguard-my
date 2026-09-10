import type { PhoneAssessment } from '../../lib/api'
import {
  AnalysisMetaPanel,
  AnalysisResultHero,
  EvidencePanel,
  RecommendedActionsPanel,
} from './ResultPresentation'

function displayType(value: string) {
  return value.replaceAll('_', ' ').toLowerCase()
}

export function PhoneResult({
  assessment,
  analysisId,
}: {
  assessment: PhoneAssessment
  analysisId?: string
}) {
  const metadata = assessment.components.phone_metadata
  return (
    <div
      className="analysis-result motion-fade"
      data-risk={assessment.risk_level}
      aria-label="Phone assessment"
    >
      <AnalysisResultHero assessment={assessment} />
      <section className="result-section" aria-label="Phone intelligence details">
        <h3 className="text-sm font-semibold">Phone Intelligence</h3>
        <dl className="metadata-grid mt-4">
          <div>
            <dt>Normalized number</dt>
            <dd className="font-mono">{metadata.normalized_e164}</dd>
          </div>
          <div>
            <dt>International format</dt>
            <dd>{metadata.international_format}</dd>
          </div>
          <div>
            <dt>Numbering region</dt>
            <dd>{metadata.region_code ?? 'not identifiable'}</dd>
          </div>
          <div>
            <dt>Country calling code</dt>
            <dd>+{metadata.country_calling_code}</dd>
          </div>
          <div>
            <dt>Number type</dt>
            <dd>{displayType(metadata.number_type)}</dd>
          </div>
          <div>
            <dt>Numbering validity</dt>
            <dd>
              {metadata.possible ? 'possible' : 'not possible'} ·{' '}
              {metadata.valid ? 'valid pattern' : 'invalid pattern'}
            </dd>
          </div>
        </dl>
      </section>
      <EvidencePanel assessment={assessment} />
      <RecommendedActionsPanel actions={assessment.recommended_actions} />
      <AnalysisMetaPanel assessment={assessment} analysisId={analysisId}>
        <div>
          <dt>Phone engine</dt>
          <dd>{metadata.engine_version}</dd>
        </div>
        <div>
          <dt>Parser</dt>
          <dd>{metadata.parser_version}</dd>
        </div>
        <div>
          <dt>Numbering metadata</dt>
          <dd>
            {metadata.library} · {metadata.library_version}
          </dd>
        </div>
        <div>
          <dt>Rules</dt>
          <dd>{assessment.components.phone_rules.version}</dd>
        </div>
        <div>
          <dt>Fusion</dt>
          <dd>{assessment.components.fusion.version}</dd>
        </div>
      </AnalysisMetaPanel>
    </div>
  )
}
