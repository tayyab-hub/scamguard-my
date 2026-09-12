import { fireEvent, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { renderApp } from '../test/render'
import { capabilitiesFixture, healthFixture } from '../test/fixtures'
import { submissionError } from '../lib/submission'
import { dashboardSchema } from '../lib/api'
import { messageAssessmentSchema } from '../lib/api'
import { riskScorePresentation } from '../lib/resultPresentation'

// Explicit test fixtures; never imported by application code.
const record = {
  id: '01d97d2d-e1f8-45af-91e5-c7f2df98758b',
  input_type: 'MESSAGE',
  status: 'SUBMITTED',
  content: '<b>Test-only message</b>',
  created_at: '2026-09-04T07:00:00Z',
  updated_at: '2026-09-04T07:00:00Z',
}
const summary = { ...record, preview: record.content }
const caps = {
  ...capabilitiesFixture,
  submission_available: true,
  submission_inputs: ['MESSAGE', 'URL', 'PHONE'],
}
const dashboard = {
  status: 'ready',
  total_analyses: 1,
  flagged_analyses: null,
  last_analysis_at: record.created_at,
  recent_analyses: [summary],
}
const assessment = {
  risk_level: 'HIGH',
  risk_score: 0.86,
  confidence_score: 0.81,
  confidence_level: 'HIGH',
  summary: 'Strong combined indicators suggest a high social-engineering risk.',
  evidence: [
    {
      category: 'CREDENTIAL',
      label: 'Credential request',
      snippet: 'provide your OTP now',
      source: 'DETERMINISTIC_RULE',
    },
  ],
  recommended_actions: ['Do not send money, credentials or verification codes.'],
  components: {
    local_model: {
      used: true,
      version: 'message-tfidf-logreg-v1',
      class_estimate: 'SCAM',
      class_probabilities: { LEGITIMATE: 0.1, SPAM: 0.1, SCAM: 0.8 },
      confidence: 0.8,
    },
    deterministic_rules: {
      used: true,
      version: 'message-rules-v1',
      score: 0.9,
      indicator_count: 1,
      contextual_suppressions: 0,
    },
    external_ai: { status: 'DISABLED', provider: null, model: null, contributed: false },
    fusion: { version: 'message-fusion-v1' },
  },
  limitations: ['This is decision support, not proof of fraud or safety.'],
  completed_at: '2026-09-05T08:00:01Z',
}

function setup(
  post: () => Promise<Response> = async () => Response.json(record, { status: 201 }),
  empty = false,
  capabilityResponse: Record<string, unknown> = caps,
) {
  const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
    if (init?.method === 'POST') return post()
    if (url.endsWith('/health')) return Response.json(healthFixture)
    if (url.endsWith('/capabilities')) return Response.json(capabilityResponse)
    if (url.endsWith('/dashboard'))
      return Response.json(
        empty
          ? { ...dashboard, total_analyses: 0, last_analysis_at: null, recent_analyses: [] }
          : dashboard,
      )
    if (url.includes('/analyses?'))
      return Response.json({ items: [summary], total: 1, page: 1, page_size: 10 })
    if (url.endsWith(record.id)) return Response.json(record)
    return new Response(null, { status: 404 })
  })
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

describe('persistent submission UI', () => {
  it.each([
    [
      'MESSAGE',
      'Original private message',
      'Edited private message',
      'Message content',
      'Analyse content',
    ],
    [
      'URL',
      'https://example.com/original',
      'https://example.com/edited',
      'Website URL',
      'Analyse content',
    ],
    ['PHONE', '+442079460958', '+12025550123', 'Phone number', 'Analyse phone number'],
  ] as const)(
    'copies a completed %s record into an editable draft and creates a new immutable record',
    async (mode, originalContent, editedContent, fieldLabel, submitLabel) => {
      const saved = {
        ...record,
        input_type: mode,
        content: originalContent,
        preview: originalContent,
        status: 'COMPLETED',
        assessment: null,
        failure_code: null,
      }
      const originalSnapshot = structuredClone(saved)
      const newId = '71ea83b5-e4dc-4af3-aeca-01167761d103'
      const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
        if (url.endsWith('/health')) return Response.json(healthFixture)
        if (url.endsWith('/capabilities')) return Response.json(caps)
        if (url.endsWith('/dashboard')) {
          return Response.json({
            ...dashboard,
            recent_analyses: [saved],
            total_analyses: 1,
          })
        }
        if (url.endsWith(saved.id)) return Response.json(saved)
        if (init?.method === 'POST') {
          const input = JSON.parse(init.body as string)
          return Response.json({ ...saved, ...input, id: newId }, { status: 201 })
        }
        return new Response(null, { status: 404 })
      })
      vi.stubGlobal('fetch', fetchMock)
      renderApp('/')
      await userEvent.click(await screen.findByRole('button', { name: /View submission/ }))
      await userEvent.click(await screen.findByRole('button', { name: 'Analyse again' }))
      const input = await screen.findByLabelText(fieldLabel)
      expect(input).toHaveValue(originalContent)
      expect(screen.getByText(/original record remains unchanged/i)).toBeInTheDocument()
      fireEvent.change(input, { target: { value: editedContent } })
      await userEvent.click(screen.getByRole('button', { name: submitLabel }))
      expect(await screen.findByText('Submission recorded.')).toBeInTheDocument()
      const post = fetchMock.mock.calls.find(([, init]) => init?.method === 'POST')
      expect(JSON.parse(post?.[1]?.body as string)).toEqual({
        input_type: mode,
        content: editedContent,
      })
      expect(saved).toEqual(originalSnapshot)
      expect(newId).not.toBe(saved.id)
    },
  )

  it.each([
    [['MESSAGE', 'URL', 'PHONE', 'QR'], 'Message, URL, Phone and QR enabled'],
    [['MESSAGE', 'URL', 'PHONE'], 'Message, URL and Phone enabled'],
    [['MESSAGE', 'URL'], 'Message and URL enabled'],
    [['MESSAGE'], 'Message enabled'],
    [['URL'], 'URL enabled'],
    [[], 'Not enabled'],
  ])('Overview reports only advertised intelligence modes %s', async (inputs, label) => {
    setup(undefined, false, { ...caps, analysis_available: true, supported_inputs: inputs })
    renderApp('/')
    expect(await screen.findByText(label as string)).toBeInTheDocument()
  })
  it.each([0, 0.1999, 0.2, 0.4199, 0.42, 0.6499, 0.65, 0.86, 1, null])(
    'presents the stored Message score %s without recomputing fusion or confidence',
    (score) => {
      const value = messageAssessmentSchema.parse({ ...assessment, risk_score: score })
      const before = structuredClone(value)
      expect(riskScorePresentation(value).value).toBe(
        score === null ? null : Math.round(score * 100),
      )
      expect(value).toEqual(before)
      expect(
        riskScorePresentation({ ...value, risk_level: 'INSUFFICIENT_EVIDENCE' }).value,
      ).toBeNull()
    },
  )
  it('renders a real message result with risk, confidence, evidence, actions and components', async () => {
    const completed = { ...record, status: 'COMPLETED', assessment, failure_code: null }
    setup(async () => Response.json(completed, { status: 201 }), false, {
      ...caps,
      analysis_available: true,
      supported_inputs: ['MESSAGE'],
      reason: 'Local message intelligence is available.',
    })
    renderApp('/analyse')
    fireEvent.change(await screen.findByLabelText('Message content'), {
      target: { value: 'Provide your OTP now' },
    })
    await userEvent.click(screen.getByRole('button', { name: 'Analyse content' }))
    expect(await screen.findByText('Analysis completed.')).toBeInTheDocument()
    expect(screen.getByText('High risk')).toBeInTheDocument()
    expect(screen.getByText('Confidence: high')).toBeInTheDocument()
    expect(
      within(screen.getByRole('region', { name: 'Detected evidence' })).getByText(
        'Credential request',
      ),
    ).toBeInTheDocument()
    expect(
      screen.getByText('Do not send money, credentials or verification codes.'),
    ).toBeInTheDocument()
    await userEvent.click(screen.getByText('Technical details'))
    expect(screen.getByText(/SCAM · message-tfidf-logreg-v1/)).toBeInTheDocument()
    expect(screen.getByText('disabled · no contribution')).toBeInTheDocument()
    expect(screen.getByRole('meter')).toHaveAttribute('aria-valuenow', '86')
    expect(screen.getByText(record.id)).toBeInTheDocument()
  })

  it('validates Message, records once, shows pending/success, and clears only after acknowledgement', async () => {
    let resolve!: (response: Response) => void
    const fetchMock = setup(
      () =>
        new Promise((done) => {
          resolve = done
        }),
    )
    renderApp('/analyse')
    const input = await screen.findByLabelText('Message content')
    const button = screen.getByRole('button', { name: 'Analyse content' })
    expect(button).toBeDisabled()
    fireEvent.change(input, { target: { value: '  ' } })
    expect(button).toBeDisabled()
    fireEvent.change(input, { target: { value: '  Test-only message  ' } })
    expect(screen.getByText(/stored in your private account history/)).toBeInTheDocument()
    await userEvent.click(button)
    expect(await screen.findByText('Recording your submission…')).toBeInTheDocument()
    expect(input).toHaveValue('  Test-only message  ')
    expect(input).toBeDisabled()
    expect(screen.getByRole('tab', { name: 'URL' })).toBeDisabled()
    resolve(Response.json(record, { status: 201 }))
    expect(await screen.findByText('Submission recorded.')).toBeInTheDocument()
    expect(input).toHaveValue('')
    const posts = fetchMock.mock.calls.filter(([, init]) => init?.method === 'POST')
    expect(posts).toHaveLength(1)
    expect(JSON.parse(posts[0]![1]!.body as string)).toEqual({
      input_type: 'MESSAGE',
      content: 'Test-only message',
    })
    expect(posts[0]![1]).toMatchObject({
      credentials: 'include',
      cache: 'no-store',
      headers: { 'Content-Type': 'application/json' },
    })
    expect(screen.getByText('No assessment yet')).toBeInTheDocument()
  })

  it('validates and records URL without visiting it', async () => {
    const fetchMock = setup(async () =>
      Response.json({ ...record, input_type: 'URL', content: 'https://example.com' }),
    )
    renderApp('/analyse')
    await screen.findByLabelText('Message content')
    await userEvent.click(screen.getByRole('tab', { name: 'URL' }))
    const input = screen.getByLabelText('Website URL')
    fireEvent.change(input, { target: { value: 'javascript:alert(1)' } })
    fireEvent.blur(input)
    expect(screen.getByRole('button', { name: 'Analyse content' })).toBeDisabled()
    expect(
      screen.getByText('Enter a valid URL starting with http:// or https://.'),
    ).toBeInTheDocument()
    fireEvent.change(input, { target: { value: 'https://example.com' } })
    await userEvent.click(screen.getByRole('button', { name: 'Analyse content' }))
    await screen.findByText('Submission recorded.')
    expect(fetchMock.mock.calls.some(([url]) => url === 'https://example.com')).toBe(false)
    const post = fetchMock.mock.calls.find(([, init]) => init?.method === 'POST')!
    expect(JSON.parse(post[1]!.body as string)).toEqual({
      input_type: 'URL',
      content: 'https://example.com',
    })
  })

  it('keeps drafts on failure, shows safe reference, and does not retry a write automatically', async () => {
    const fetchMock = setup(async () =>
      Response.json(
        { secret: 'not-for-ui' },
        { status: 503, headers: { 'X-Request-ID': 'test-reference' } },
      ),
    )
    renderApp('/analyse')
    const input = await screen.findByLabelText('Message content')
    fireEvent.change(input, { target: { value: 'Retain this draft' } })
    await userEvent.click(screen.getByRole('button', { name: 'Analyse content' }))
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Check your history before trying again',
    )
    expect(screen.getByRole('alert')).toHaveTextContent('test-reference')
    expect(screen.getByRole('alert')).not.toHaveTextContent('not-for-ui')
    expect(input).toHaveValue('Retain this draft')
    expect(fetchMock.mock.calls.filter(([, init]) => init?.method === 'POST')).toHaveLength(1)
    expect(screen.queryByText('Submission recorded.')).not.toBeInTheDocument()
  })

  it('submits Phone through the shared analysis API but keeps QR unavailable', async () => {
    const fetchMock = setup()
    renderApp('/analyse')
    await screen.findByLabelText('Message content')
    expect(screen.getAllByRole('tab')).toHaveLength(4)
    await userEvent.click(screen.getByRole('tab', { name: 'Phone Number' }))
    fireEvent.change(screen.getByRole('textbox', { name: 'Phone number' }), {
      target: { value: '+44 20 7946 0958' },
    })
    expect(screen.getByRole('button', { name: 'Analyse phone number' })).toBeEnabled()
    await userEvent.click(screen.getByRole('button', { name: 'Analyse phone number' }))
    await screen.findByText('Submission recorded.')
    await userEvent.click(screen.getByRole('tab', { name: 'QR Code' }))
    expect(screen.getByRole('button', { name: 'Analyse QR' })).toBeDisabled()
    fireEvent.submit(screen.getByRole('button', { name: 'Analyse QR' }).closest('form')!)
    const posts = fetchMock.mock.calls.filter(([, init]) => init?.method === 'POST')
    expect(posts).toHaveLength(1)
    expect(JSON.parse(posts[0]![1]!.body as string)).toEqual({
      input_type: 'PHONE',
      content: '+44 20 7946 0958',
    })
  })

  it('shows real count/latest/preview and loads safe escaped detail and bounded history', async () => {
    const fetchMock = setup()
    renderApp()
    await screen.findByText(record.content)
    expect(
      within(screen.getByRole('region', { name: 'Total analyses' })).getByText('1'),
    ).toBeInTheDocument()
    expect(
      within(screen.getByRole('region', { name: 'Latest analysis' })).getByText('Message'),
    ).toBeInTheDocument()
    expect(
      within(screen.getByRole('region', { name: 'Flagged for review' })).getByText(
        'Not available yet',
      ),
    ).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: /View submission/ }))
    await screen.findByText('Saved content · SUBMITTED')
    expect(document.querySelector('b')).toBeNull()
    await userEvent.click(screen.getByRole('button', { name: 'Browse history' }))
    await screen.findByText('Page 1 · 1 submissions')
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/v1/analyses?page=1&page_size=10',
      expect.anything(),
    )
    expect(screen.getByRole('button', { name: 'Next' })).toBeDisabled()
  })

  it('shows a measured zero only for a connected empty database', async () => {
    setup(undefined, true)
    renderApp()
    await screen.findByText(
      'You have not analysed anything yet. Check a suspicious message, URL, phone number or QR code to start building your private history.',
    )
    expect(
      within(screen.getByRole('region', { name: 'Total analyses' })).getByText('0'),
    ).toBeInTheDocument()
    expect(screen.getByText('No submissions')).toBeInTheDocument()
  })

  it('invalidates the dashboard after a successful record', async () => {
    const fetchMock = setup()
    renderApp()
    await screen.findByText(record.content)
    await userEvent.click(screen.getByRole('link', { name: 'Open analyser' }))
    fireEvent.change(await screen.findByLabelText('Message content'), {
      target: { value: 'Test invalidation' },
    })
    await userEvent.click(screen.getByRole('button', { name: 'Analyse content' }))
    await screen.findByText('Submission recorded.')
    await userEvent.click(
      within(screen.getByRole('navigation', { name: 'Desktop navigation' })).getByRole('link', {
        name: 'Overview',
      }),
    )
    await waitFor(() =>
      expect(fetchMock.mock.calls.filter(([url]) => url.endsWith('/dashboard'))).toHaveLength(2),
    )
  })
})

describe('submission boundaries', () => {
  it('shows exact Message, URL and Phone feedback only after interaction', async () => {
    setup()
    renderApp('/analyse')
    const message = await screen.findByLabelText('Message content')
    expect(screen.queryByText('Enter a message to analyse.')).not.toBeInTheDocument()
    fireEvent.blur(message)
    expect(screen.getByText('Enter a message to analyse.')).toBeInTheDocument()
    fireEvent.change(message, { target: { value: 'x'.repeat(5001) } })
    expect(screen.getByText('Message must be 5,000 characters or fewer.')).toBeInTheDocument()
    expect(message).toHaveAttribute('aria-invalid', 'true')

    await userEvent.click(screen.getByRole('tab', { name: 'URL' }))
    const url = screen.getByLabelText('Website URL')
    expect(screen.queryByText('Enter a URL to analyse.')).not.toBeInTheDocument()
    fireEvent.submit(url.closest('form')!)
    expect(screen.getByText('Enter a URL to analyse.')).toBeInTheDocument()
    fireEvent.change(url, { target: { value: 'https://example.com/' + 'x'.repeat(2048) } })
    expect(screen.getByText('URL must be 2,048 characters or fewer.')).toBeInTheDocument()
    fireEvent.change(url, { target: { value: 'example.com' } })
    expect(
      screen.getByText('Enter a valid URL starting with http:// or https://.'),
    ).toBeInTheDocument()

    await userEvent.click(screen.getByRole('tab', { name: 'Phone Number' }))
    const phone = screen.getByLabelText('Phone number')
    fireEvent.blur(phone)
    expect(screen.getByText('Enter an international phone number to analyse.')).toBeInTheDocument()
    fireEvent.change(phone, { target: { value: '0123456789' } })
    expect(
      screen.getByText('Include the international country calling code, beginning with +.'),
    ).toBeInTheDocument()
    fireEvent.change(phone, { target: { value: '+44 CALL NOW' } })
    expect(
      screen.getByText('Use only digits, spaces, hyphens and parentheses.'),
    ).toBeInTheDocument()
  })

  it.each([
    'https://example.com:99999',
    'https://example.com/a b',
    'https:example.com',
    'file:///tmp/a',
  ])('rejects invalid URL %s', (content) => {
    expect(submissionError('URL', content)).not.toBeNull()
  })
  it('enforces existing input limits and rejects invented dashboard metrics', () => {
    expect(submissionError('MESSAGE', 'x'.repeat(5001))).not.toBeNull()
    expect(submissionError('URL', 'https://example.com/' + 'x'.repeat(2048))).not.toBeNull()
    expect(submissionError('MESSAGE', 'x'.repeat(5000))).toBeNull()
    expect(submissionError('PHONE', '+44 20 7946 0958')).toBeNull()
    expect(submissionError('PHONE', '+12')).not.toBeNull()
    expect(submissionError('PHONE', '+' + '1'.repeat(16))).not.toBeNull()
    expect(dashboardSchema.safeParse({ ...dashboard, total_analyses: -1 }).success).toBe(false)
    expect(dashboardSchema.safeParse({ ...dashboard, flagged_analyses: 2 }).success).toBe(true)
  })
})
