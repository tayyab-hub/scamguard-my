// November improvements: sender context questions on unclear Message results, private result
// feedback, and labelling of links/numbers checked inside a message. Network calls are stubbed.

import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { describe, expect, it, vi } from 'vitest'
import { MessageResult } from '../components/analysis/MessageResult'
import { ResultFeedback } from '../components/ResultFeedback'
import { contextGuidance } from '../lib/senderContext'
import { matchEvidence } from '../lib/resultPresentation'
import { messageAssessmentSchema, setCsrfToken } from '../lib/api'

const base = {
  risk_level: 'LOW',
  risk_score: 0.03,
  confidence_score: 0.7,
  confidence_level: 'MEDIUM',
  summary: 'No known scam pattern was found in this text.',
  evidence: [],
  recommended_actions: ['Verify unexpected requests.'],
  limitations: ['Advisory only.'],
  completed_at: '2026-11-07T00:00:00Z',
  components: {
    local_model: {
      used: true,
      version: 'test',
      class_estimate: 'LEGITIMATE',
      class_probabilities: { LEGITIMATE: 0.9, SPAM: 0.05, SCAM: 0.05 },
      confidence: 0.9,
      matched_features: 4,
    },
    deterministic_rules: {
      used: true,
      version: 'message-rules-v3',
      score: 0,
      indicator_count: 0,
      contextual_suppressions: 0,
    },
    external_ai: { status: 'DISABLED', provider: null, model: null, contributed: false },
    fusion: { version: 'message-fusion-v3', reason: 'CALIBRATED_SIGNALS' },
  },
}

describe('Sender context questions', () => {
  it('maps answers to guidance with requests and pressure dominating', () => {
    expect(contextGuidance({})).toBeNull()
    expect(contextGuidance({ known: 'yes', asks: 'yes' })?.tone).toBe('warning')
    expect(contextGuidance({ known: 'yes', pressure: 'yes' })?.tone).toBe('warning')
    expect(contextGuidance({ known: 'no' })?.tone).toBe('caution')
    expect(contextGuidance({ known: 'yes', asks: 'no', pressure: 'no' })?.tone).toBe('calm')
  })

  it('appears on unclear results, stays local and is absent on High results', async () => {
    const fetchSpy = vi.fn()
    vi.stubGlobal('fetch', fetchSpy)
    const { unmount } = render(<MessageResult assessment={messageAssessmentSchema.parse(base)} />)
    // Shown straight away on unclear results, without opening anything.
    const panel = screen.getByRole('region', { name: 'What you know that the text cannot show' })
    const asks = within(panel).getByRole('group', { name: /ask for money/ })
    await userEvent.click(within(asks).getByLabelText('Yes'))
    expect(within(panel).getByText('Treat this as high risk')).toBeVisible()
    expect(fetchSpy).not.toHaveBeenCalled()
    unmount()
    render(
      <MessageResult
        assessment={messageAssessmentSchema.parse({ ...base, risk_level: 'HIGH', risk_score: 0.9 })}
      />,
    )
    expect(
      screen.queryByRole('region', { name: 'What you know that the text cannot show' }),
    ).not.toBeInTheDocument()
  })

  it('labels links and numbers checked inside the message', () => {
    const assessment = messageAssessmentSchema.parse({
      ...base,
      risk_level: 'HIGH',
      risk_score: 0.7,
      evidence: [
        {
          category: 'EMBEDDED_LINK',
          label: 'Link in the message: high',
          snippet: 'maybank2u-secure-login.com — Brand name in an unofficial domain',
          source: 'EMBEDDED_URL',
        },
      ],
    })
    render(<MessageResult assessment={assessment} />)
    expect(screen.getByText('Offline link check · not opened')).toBeInTheDocument()
  })
})

describe('Result feedback', () => {
  it('saves a private verdict with CSRF and shows it as selected', async () => {
    setCsrfToken('csrf-test')
    const saved = {
      id: '11111111-1111-4111-8111-111111111111',
      input_type: 'MESSAGE',
      status: 'COMPLETED',
      created_at: '2026-11-07T00:00:00Z',
      updated_at: '2026-11-07T00:00:00Z',
      content: 'hello',
      assessment: null,
      failure_code: null,
      user_feedback: 'TOO_LOW',
    }
    const fetchSpy = vi.fn().mockResolvedValue(
      new Response(JSON.stringify(saved), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    )
    vi.stubGlobal('fetch', fetchSpy)
    render(
      <QueryClientProvider client={new QueryClient()}>
        <ResultFeedback analysisId={saved.id} initial={null} />
      </QueryClientProvider>,
    )
    const button = screen.getByRole('button', { name: 'Not worried enough' })
    expect(button).toHaveAttribute('aria-pressed', 'false')
    await userEvent.click(button)
    expect(
      await screen.findByText(/saved privately with this check and does not change/),
    ).toBeVisible()
    expect(button).toHaveAttribute('aria-pressed', 'true')
    const [url, init] = fetchSpy.mock.calls[0] as [
      string,
      RequestInit & { headers: Record<string, string>; body: string },
    ]
    expect(url).toBe(`/api/v1/analyses/${saved.id}/feedback`)
    expect(init.method).toBe('PUT')
    expect(init.headers['X-CSRF-Token']).toBe('csrf-test')
    expect(JSON.parse(init.body)).toEqual({ verdict: 'TOO_LOW' })
    // The card closes after the thanks; the footer keeps the answer and a way to change it.
    await waitFor(
      () => expect(screen.queryByRole('group', { name: 'Rate this result' })).toBeNull(),
      {
        timeout: 3000,
      },
    )
    expect(screen.getByText('Not worried enough')).toBeVisible()
    await userEvent.click(screen.getByRole('button', { name: 'Change' }))
    expect(screen.getByRole('group', { name: 'Rate this result' })).toBeVisible()
    setCsrfToken(null)
  })

  it('closes with × without saving, reopens from the footer, and stays quiet when answered', async () => {
    const fetchSpy = vi.fn()
    vi.stubGlobal('fetch', fetchSpy)
    const { unmount } = render(
      <QueryClientProvider client={new QueryClient()}>
        <ResultFeedback analysisId="11111111-1111-4111-8111-111111111111" initial={null} />
      </QueryClientProvider>,
    )
    await userEvent.click(screen.getByRole('button', { name: 'Close feedback' }))
    expect(screen.queryByRole('group', { name: 'Rate this result' })).toBeNull()
    expect(fetchSpy).not.toHaveBeenCalled()
    await userEvent.click(screen.getByRole('button', { name: 'Rate this result' }))
    expect(screen.getByRole('group', { name: 'Rate this result' })).toBeVisible()
    unmount()
    render(
      <QueryClientProvider client={new QueryClient()}>
        <ResultFeedback analysisId="11111111-1111-4111-8111-111111111111" initial="RIGHT" />
      </QueryClientProvider>,
    )
    expect(screen.queryByRole('group', { name: 'Rate this result' })).toBeNull()
    expect(screen.getByText('Looks right')).toBeVisible()
  })
})

describe('Why this verdict reasons', () => {
  const evidence = [
    {
      category: 'CREDENTIAL_REQUEST',
      label: 'Credential language',
      snippet: '…enter your TAC code within 30 minutes…',
      source: 'DETERMINISTIC_RULE',
    },
    {
      category: 'EMBEDDED_LINK',
      label: 'Link in the message: high',
      snippet: 'shopee-hadiah.top — Brand name in an unofficial domain',
      source: 'EMBEDDED_URL',
    },
  ]

  it('matches reasons to saved evidence by label or checked host, and nothing else', () => {
    expect(matchEvidence('Credential language', evidence as never)?.label).toBe(
      'Credential language',
    )
    expect(
      matchEvidence(
        'Link shopee-hadiah.top assessed as high by the offline URL check',
        evidence as never,
      )?.label,
    ).toBe('Link in the message: high')
    expect(matchEvidence('The local model favours the SCAM class.', evidence as never)).toBeNull()
  })

  it('opens a reason to show its source and matched text; unmatched reasons stay plain', async () => {
    const assessment = messageAssessmentSchema.parse({
      ...base,
      risk_level: 'HIGH',
      risk_score: 0.9,
      evidence,
      components: {
        ...base.components,
        assessment_basis: {
          decision: 'Several warning signs combine.',
          supporting: [
            'Credential language',
            'Link shopee-hadiah.top assessed as high by the offline URL check',
            'The local model favours the SCAM class; this alone cannot establish fraud.',
          ],
          mitigating: [],
          uncertainty: ['Sender identity is unverified.'],
        },
      },
    })
    render(<MessageResult assessment={assessment} />)
    await userEvent.click(screen.getByRole('tab', { name: 'Why this verdict' }))
    const panel = screen.getByRole('tabpanel', { name: 'Why this verdict' })
    const snippet = within(panel).getByText('…enter your TAC code within 30 minutes…')
    expect(snippet).not.toBeVisible()
    await userEvent.click(within(panel).getByText('Credential language'))
    expect(snippet).toBeVisible()
    await userEvent.click(within(panel).getByText(/^Link shopee-hadiah\.top/))
    expect(within(panel).getByText('Offline link check · not opened')).toBeVisible()
    // The model reason has no saved evidence item, so it is not an expandable row.
    expect(
      within(panel)
        .getByText(/local model favours/)
        .closest('summary'),
    ).toBeNull()
    expect(within(panel).getByText('Sender identity is unverified.')).not.toBeVisible()
    await userEvent.click(within(panel).getByText('What remains uncertain (1)'))
    expect(within(panel).getByText('Sender identity is unverified.')).toBeVisible()
  })
})

describe('Feedback card and Quick check', () => {
  it('waits until every Quick check question is answered before popping up', async () => {
    // Simulate the end of the result being on screen immediately (a short result).
    class VisibleObserver {
      constructor(private callback: IntersectionObserverCallback) {}
      observe() {
        this.callback([{ isIntersecting: true } as IntersectionObserverEntry], this as never)
      }
      disconnect() {}
    }
    vi.stubGlobal('IntersectionObserver', VisibleObserver)
    render(
      <QueryClientProvider client={new QueryClient()}>
        <section className="context-check">
          {['one', 'two', 'three'].map((name) => (
            <fieldset key={name}>
              <legend>{name}</legend>
              <label>
                <input type="radio" name={name} value="yes" />
                Yes {name}
              </label>
            </fieldset>
          ))}
        </section>
        <ResultFeedback analysisId="11111111-1111-4111-8111-111111111111" initial={null} />
      </QueryClientProvider>,
    )
    const card = () => screen.queryByRole('group', { name: 'Rate this result' })
    expect(card()).not.toBeInTheDocument()
    await userEvent.click(screen.getByLabelText('Yes one'))
    await userEvent.click(screen.getByLabelText('Yes two'))
    expect(card()).not.toBeInTheDocument()
    await userEvent.click(screen.getByLabelText('Yes three'))
    expect(card()).toBeInTheDocument()
  })
})
