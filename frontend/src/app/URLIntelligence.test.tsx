import { fireEvent, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { renderApp } from '../test/render'
import { healthFixture } from '../test/fixtures'
import { submissionError } from '../lib/submission'
import type { URLAssessment } from '../lib/api'
import { orderedEvidence, riskScorePresentation, topSignals } from '../lib/resultPresentation'

const assessment: URLAssessment = {
  risk_level: 'CAUTION',
  risk_score: null,
  confidence_score: 0.8,
  confidence_level: 'MEDIUM',
  summary: 'Some URL patterns warrant caution.',
  evidence: [
    {
      category: 'IP_ADDRESS_HOST',
      label: 'IP address host',
      snippet: '192.0.2.10',
      source: 'DETERMINISTIC_RULE',
      severity: 'WEAK',
      explanation: 'A numeric host reduces recognisable context.',
      family: 'host',
    },
  ],
  recommended_actions: ['Verify the destination independently.'],
  components: {
    url_model: {
      status: 'COMPLETED',
      version: 'url_ml_v1',
      class_estimate: 'PHISHING',
      confidence: 0.8,
    },
    url_rules: { status: 'COMPLETED', version: 'url_rules_v1', indicator_count: 1 },
    reputation: { status: 'DISABLED', provider: null, version: null, verdict: 'UNKNOWN' },
    fusion: { version: 'url_fusion_v1' },
    url_structure: {
      parser_version: 'url_parser_v1',
      hostname: '192.0.2.10',
      registrable_domain: null,
      scheme: 'http',
      credentials_removed: false,
      fragment_excluded: false,
    },
  },
  limitations: ['No website content was fetched.'],
  completed_at: '2026-09-07T10:00:00Z',
}
const base = {
  id: '01d97d2d-e1f8-45af-91e5-c7f2df98758b',
  input_type: 'URL',
  content: 'http://192.0.2.10/login',
  created_at: assessment.completed_at,
  updated_at: assessment.completed_at,
}
function setup(post: () => Promise<Response>) {
  const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
    if (init?.method === 'POST') return post()
    if (url.endsWith('/health')) return Response.json(healthFixture)
    if (url.endsWith('/capabilities'))
      return Response.json({
        submission_available: true,
        submission_inputs: ['MESSAGE', 'URL'],
        analysis_available: true,
        supported_inputs: ['MESSAGE', 'URL'],
        reason: 'Local intelligence available',
      })
    return new Response(null, { status: 404 })
  })
  vi.stubGlobal('fetch', fetchMock)
  renderApp('/analyse')
  return fetchMock
}
async function submit() {
  await screen.findByLabelText('Message content')
  await userEvent.click(screen.getByRole('tab', { name: 'URL' }))
  fireEvent.change(screen.getByLabelText('Website URL'), { target: { value: base.content } })
  await userEvent.click(screen.getByRole('button', { name: 'Analyse content' }))
}

describe('URL intelligence results', () => {
  it.each([
    ['LOW', 'Low observed risk'],
    ['CAUTION', 'Caution advised'],
    ['ELEVATED', 'Elevated risk'],
    ['HIGH', 'High risk'],
    ['INSUFFICIENT_EVIDENCE', 'Insufficient evidence'],
  ] as const)('renders %s with evidence, actions and component status', async (risk, label) => {
    const mock = setup(async () =>
      Response.json({
        ...base,
        status: 'COMPLETED',
        assessment: { ...assessment, risk_level: risk },
      }),
    )
    await submit()
    expect(await screen.findByText('Analysis completed.')).toBeInTheDocument()
    expect(screen.getByText(label)).toBeInTheDocument()
    if (risk === 'INSUFFICIENT_EVIDENCE') {
      expect(screen.queryByRole('meter')).not.toBeInTheDocument()
      expect(screen.getByText('Not enough evidence to score.')).toBeInTheDocument()
    } else {
      const expected = { LOW: 0, CAUTION: 33, ELEVATED: 67, HIGH: 100 }[risk]
      expect(screen.getByRole('meter', { name: 'RISK SCORE' })).toHaveAttribute(
        'aria-valuenow',
        String(expected),
      )
      expect(screen.getByRole('meter')).toHaveAttribute(
        'aria-valuetext',
        expect.stringContaining('not a probability'),
      )
    }
    await userEvent.click(screen.getByText('How to read this score'))
    expect(
      screen.getByText(/0 does not mean safe; 100 does not mean certain fraud/),
    ).toBeInTheDocument()
    expect(
      within(screen.getByRole('region', { name: 'Detected evidence' })).getByText(
        'IP address host',
      ),
    ).toBeInTheDocument()
    expect(screen.getByText('Verify the destination independently.')).toBeInTheDocument()
    await userEvent.click(screen.getByText('Technical details'))
    expect(screen.getByText('Optional reputation review')).toBeInTheDocument()
    expect(screen.getByText('disabled')).toBeInTheDocument()
    expect(screen.getByText(/uncalibrated; not a scam probability/)).toBeInTheDocument()
    expect(screen.queryByText(/Observed risk score/)).not.toBeInTheDocument()
    expect(document.querySelector('a[href^="http://192.0.2.10"]')).toBeNull()
    expect(mock.mock.calls.every(([url]) => url.startsWith('/api/v1/'))).toBe(true)
  })
  it('announces loading and a persisted failure without fabricating an assessment', async () => {
    let resolve!: (r: Response) => void
    setup(
      () =>
        new Promise((done) => {
          resolve = done
        }),
    )
    await submit()
    expect(await screen.findByText('Running local URL assessment…')).toBeInTheDocument()
    expect(screen.getByLabelText('Website URL')).toBeDisabled()
    resolve(
      Response.json({
        ...base,
        status: 'FAILED',
        failure_code: 'URL_ANALYSIS_FAILED',
        assessment: null,
      }),
    )
    expect(await screen.findByRole('alert')).toHaveTextContent('URL_ANALYSIS_FAILED')
    expect(screen.queryByLabelText('URL assessment')).not.toBeInTheDocument()
  })
  it('permits userinfo for backend redaction and rejects encoded/control/malformed input', () => {
    expect(submissionError('URL', 'https://user:password@example.com/')).toBeNull()
    for (const value of [
      'https://example.com/%zz',
      '\nhttps://example.com',
      'https://example.com/\u202e',
      'https://example.com/\ud800',
      'data:text/plain,test',
    ]) {
      expect(submissionError('URL', value)).not.toBeNull()
    }
  })
  it('orders URL severity stably, groups related top signals and never alters the stored assessment', () => {
    const weak = assessment.evidence[0]!
    const meaningful = {
      ...weak,
      category: 'CREDENTIALS',
      family: 'credentials',
      severity: 'MEANINGFUL' as const,
    }
    const related = { ...meaningful, category: 'AT_SIGN' }
    const context = { ...weak, category: 'PUNYCODE', severity: 'CONTEXT' as const }
    const value = { ...assessment, evidence: [context, weak, meaningful, related] }
    const before = structuredClone(value)
    expect(orderedEvidence(value).map((item) => item.category)).toEqual([
      'CREDENTIALS',
      'AT_SIGN',
      'IP_ADDRESS_HOST',
      'PUNYCODE',
    ])
    expect(topSignals(value).map((item) => item.category)).toEqual([
      'CREDENTIALS',
      'IP_ADDRESS_HOST',
    ])
    expect(riskScorePresentation(value).value).toBe(33)
    expect(value).toEqual(before)
    expect(value.risk_score).toBeNull()
  })
  it('shows unavailable confidence when the URL model is missing without suppressing rule risk', async () => {
    setup(async () =>
      Response.json({
        ...base,
        status: 'COMPLETED',
        assessment: {
          ...assessment,
          confidence_score: null,
          confidence_level: 'LOW',
          components: {
            ...assessment.components,
            url_model: {
              status: 'UNAVAILABLE',
              version: null,
              class_estimate: null,
              confidence: null,
            },
          },
        },
      }),
    )
    await submit()
    expect(await screen.findByText('Confidence: unavailable')).toBeInTheDocument()
    expect(screen.getByRole('meter')).toHaveAttribute('aria-valuenow', '33')
  })
})
