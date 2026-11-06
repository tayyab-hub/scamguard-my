// Phone result presentation of E.164, numbering metadata and conservative advice. No caller
// identity, reputation lookup or numeric fraud confidence is inferred from valid formatting.

import type { PhoneAssessment } from '../../lib/api'
import {
  AnalysisMetaPanel,
  AnalysisResultHero,
  EvidencePanel,
  RecommendedActionsPanel,
} from './ResultPresentation'

// Convert stored enum spelling to a readable label; this changes display text only.
function displayType(value: string) {
  return value.replaceAll('_', ' ').toLowerCase()
}

// Render the validated Phone assessment and metadata versions using shared evidence/actions
// panels, retaining null numeric scores.
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
      <RecommendedActionsPanel actions={assessment.recommended_actions} />
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
