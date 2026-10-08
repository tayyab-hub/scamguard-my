import { render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { MessageResult } from '../components/analysis/MessageResult'
import { messageAssessmentSchema } from '../lib/api'

const historical = {
  risk_level: 'LOW',
  risk_score: 0.1,
  confidence_score: 0.7,
  confidence_level: 'MEDIUM',
  summary: 'No strong indicators were found.',
  evidence: [],
  recommended_actions: ['Verify independently.'],
  limitations: ['Advisory only.'],
  completed_at: '2026-10-08T12:00:00Z',
  components: {
    local_model: {
      used: true,
      version: 'message-tfidf-logreg-v1',
      class_estimate: 'LEGITIMATE',
      class_probabilities: { LEGITIMATE: 0.9, SCAM: 0.05, SPAM: 0.05 },
      confidence: 0.9,
    },
    deterministic_rules: {
      used: true,
      version: 'message-rules-v1',
      score: 0,
      indicator_count: 0,
      contextual_suppressions: 0,
    },
    external_ai: { status: 'DISABLED', provider: null, model: null, contributed: false },
    fusion: { version: 'message-fusion-v1' },
  },
}

describe('Reviewed evidence presentation', () => {
  it('preserves historical results without inventing an explanation trace', () => {
    render(<MessageResult assessment={messageAssessmentSchema.parse(historical)} />)
    expect(screen.getByRole('meter')).toHaveAttribute('aria-valuenow', '10')
    expect(screen.queryByText('Why this verdict')).not.toBeInTheDocument()
  })

  it('accepts abstention with unavailable confidence and shows actual evidence balance', () => {
    const assessment = messageAssessmentSchema.parse({
      ...historical,
      risk_level: 'INSUFFICIENT_EVIDENCE',
      risk_score: null,
      confidence_score: null,
      confidence_level: 'LOW',
      components: {
        ...historical.components,
        assessment_basis: {
          decision: 'No trained vocabulary matched this input.',
          supporting: [],
          mitigating: [],
          uncertainty: [
            'No supported model evidence.',
            '<script>untrusted text stays inert</script>',
          ],
        },
      },
    })
    const { container } = render(<MessageResult assessment={assessment} />)
    expect(screen.getByText('Confidence: unavailable')).toBeVisible()
    expect(screen.queryByRole('meter')).not.toBeInTheDocument()
    const explanation = screen.getByRole('region', { name: 'Why this verdict' })
    expect(within(explanation).getByText(/Absence of a warning/)).toBeVisible()
    expect(within(explanation).getByText(/No specific mitigating evidence/)).toBeVisible()
    expect(container.querySelector('script')).toBeNull()
  })
})
