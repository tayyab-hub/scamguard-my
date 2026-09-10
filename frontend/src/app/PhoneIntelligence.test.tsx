import { fireEvent, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import type { PhoneAssessment } from '../lib/api'
import { phoneAssessmentSchema } from '../lib/api'
import { riskScorePresentation } from '../lib/resultPresentation'
import { renderApp } from '../test/render'
import { healthFixture } from '../test/fixtures'

const assessment: PhoneAssessment = {
  risk_level: 'INSUFFICIENT_EVIDENCE',
  risk_score: null,
  confidence_score: null,
  confidence_level: 'LOW',
  summary:
    "Insufficient evidence to identify this number as malicious. Valid numbering metadata does not verify the caller's identity or intent.",
  evidence: [
    {
      category: 'VALID_NUMBERING_PATTERN',
      label: 'Valid international numbering format',
      snippet: 'E.164 +442079460958',
      source: 'NUMBERING_METADATA',
      severity: 'CONTEXT',
      explanation: 'The number matches the bundled numbering metadata.',
      family: 'validity',
    },
  ],
  recommended_actions: [
    'Verify unexpected callers using an official number obtained independently.',
  ],
  components: {
    phone_metadata: {
      engine_version: 'phone-intelligence-v1',
      parser_version: 'phone-parser-v1',
      library: 'python-phonenumbers',
      library_version: '9.0.38',
      normalized_e164: '+442079460958',
      international_format: '+44 20 7946 0958',
      country_calling_code: 44,
      region_code: 'GB',
      possible: true,
      valid: true,
      number_type: 'FIXED_LINE',
    },
    phone_rules: { version: 'phone-rules-v1', high_cost_indicator: false },
    fusion: { version: 'phone-fusion-v1' },
  },
  limitations: [
    "A phone number's numbering metadata cannot by itself establish whether the caller is fraudulent.",
    'No call, message, subscriber lookup or external reputation request was performed.',
  ],
  completed_at: '2026-09-10T02:00:00Z',
}

const record = {
  id: '24ed8d8a-146e-4efa-9564-17d667e83903',
  input_type: 'PHONE',
  content: '+442079460958',
  status: 'COMPLETED',
  created_at: assessment.completed_at,
  updated_at: assessment.completed_at,
  assessment,
  failure_code: null,
}

const capabilities = {
  submission_available: true,
  submission_inputs: ['MESSAGE', 'URL', 'PHONE'],
  analysis_available: true,
  supported_inputs: ['MESSAGE', 'URL', 'PHONE'],
  reason: 'Local Message, URL and Phone intelligence is available.',
}

function setup(post: () => Promise<Response> = async () => Response.json(record, { status: 201 })) {
  const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
    if (init?.method === 'POST') return post()
    if (url.endsWith('/health')) return Response.json(healthFixture)
    if (url.endsWith('/capabilities')) return Response.json(capabilities)
    if (url.endsWith('/dashboard'))
      return Response.json({
        status: 'ready',
        total_analyses: 1,
        flagged_analyses: 0,
        last_analysis_at: record.created_at,
        recent_analyses: [{ ...record, preview: record.content, assessment: undefined }],
      })
    if (url.includes('/analyses?'))
      return Response.json({
        items: [{ ...record, preview: record.content, assessment: undefined }],
        total: 1,
        page: 1,
        page_size: 10,
      })
    if (url.endsWith(record.id)) return Response.json(record)
    return new Response(null, { status: 404 })
  })
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

async function selectPhone() {
  await screen.findByLabelText('Message content')
  await userEvent.click(screen.getByRole('tab', { name: 'Phone Number' }))
}

describe('Phone Intelligence', () => {
  it('validates the typed assessment without inventing a numeric score', () => {
    const parsed = phoneAssessmentSchema.parse(assessment)
    expect(riskScorePresentation(parsed)).toMatchObject({
      value: null,
      kind: 'No numeric phone risk score',
    })
  })

  it('switches to Phone, validates, submits, and renders evidence, limitations and actions', async () => {
    const fetchMock = setup()
    renderApp('/analyse')
    await selectPhone()
    const input = screen.getByLabelText('Phone number')
    fireEvent.change(input, { target: { value: '202 555 0123' } })
    fireEvent.blur(input)
    expect(
      screen.getByText('Include the international country calling code, beginning with +.'),
    ).toBeInTheDocument()
    fireEvent.change(input, { target: { value: '+44 (20) 7946-0958' } })
    await userEvent.click(screen.getByRole('button', { name: 'Analyse phone number' }))
    expect(await screen.findByLabelText('Phone assessment')).toBeInTheDocument()
    expect(screen.getByText('Insufficient evidence')).toBeInTheDocument()
    expect(screen.queryByRole('meter')).not.toBeInTheDocument()
    expect(
      screen.getByText('No defensible numeric score from numbering metadata alone.'),
    ).toBeInTheDocument()
    expect(
      within(screen.getByRole('region', { name: 'Phone intelligence details' })).getByText(
        '+442079460958',
      ),
    ).toBeInTheDocument()
    expect(
      within(screen.getByRole('region', { name: 'Phone numbering evidence' })).getByText(
        'Valid international numbering format',
      ),
    ).toBeInTheDocument()
    expect(
      screen.getByText(
        'Verify unexpected callers using an official number obtained independently.',
      ),
    ).toBeInTheDocument()
    await userEvent.click(screen.getByText('Components and limitations'))
    expect(
      screen.getByText(/cannot by itself establish whether the caller is fraudulent/),
    ).toBeInTheDocument()
    expect(screen.getByText(/python-phonenumbers · 9.0.38/)).toBeInTheDocument()
    const post = fetchMock.mock.calls.find(([, init]) => init?.method === 'POST')!
    expect(JSON.parse(post[1]!.body as string)).toEqual({
      input_type: 'PHONE',
      content: '+44 (20) 7946-0958',
    })
  })

  it('keeps the phone draft and reports a safe API failure without retrying', async () => {
    const fetchMock = setup(async () =>
      Response.json(
        { error: { code: 'PHONE_UNAVAILABLE', message: 'Phone analysis is unavailable.' } },
        { status: 503 },
      ),
    )
    renderApp('/analyse')
    await selectPhone()
    const input = screen.getByLabelText('Phone number')
    fireEvent.change(input, { target: { value: '+1 202 555 0123' } })
    await userEvent.click(screen.getByRole('button', { name: 'Analyse phone number' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Phone analysis is unavailable.')
    expect(input).toHaveValue('+1 202 555 0123')
    expect(fetchMock.mock.calls.filter(([, init]) => init?.method === 'POST')).toHaveLength(1)
  })

  it('labels Phone history and renders its stored result without re-analysis', async () => {
    setup()
    renderApp('/')
    expect(await screen.findAllByText('Phone')).not.toHaveLength(0)
    await userEvent.click(screen.getByText('+442079460958').closest('button')!)
    expect(await screen.findByLabelText('Phone assessment')).toBeInTheDocument()
    expect(screen.getByText('Phone Intelligence')).toBeInTheDocument()
  })
})
