import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import type { QRAssessment } from '../lib/api'
import { qrAssessmentSchema } from '../lib/api'
import { renderApp } from '../test/render'
import { healthFixture } from '../test/fixtures'
import { QrResult } from '../components/analysis/QrResult'

const assessment: QRAssessment = {
  risk_level: 'INSUFFICIENT_EVIDENCE',
  risk_score: null,
  confidence_score: null,
  confidence_level: 'LOW',
  summary:
    'The QR code decoded as text content, but no compatible intelligence engine can make a defensible risk assessment.',
  evidence: [
    {
      category: 'QR_DECODED',
      label: 'QR code decoded successfully',
      explanation: 'A single QR symbol was decoded locally.',
      snippet: 'Decoded type: TEXT',
      source: 'QR_DECODER',
      severity: 'CONTEXT',
      family: 'qr-decoding',
    },
  ],
  recommended_actions: [
    'Do not act on unknown encoded instructions without independent verification.',
  ],
  components: {
    qr: {
      source: 'UPLOAD',
      engine_version: 'qr-intelligence-v1',
      decoder_library: 'zxing-cpp',
      decoder_version: '3.1.1',
      classifier_version: 'qr-payload-classifier-v1',
      fusion_version: 'qr-risk-fusion-v1',
      payload_type: 'TEXT',
      routed_engine: null,
      payload_bytes: 35,
      image_format: 'PNG',
      image_width: 280,
      image_height: 280,
      file_sha256: 'a'.repeat(64),
      original_image_retained: false,
    },
  },
  limitations: [
    'A QR code is a data carrier, not an intrinsic indicator of fraud.',
    'The decoded content was never opened, executed, contacted or fetched.',
  ],
  completed_at: '2026-09-10T06:00:00Z',
}

const hostileContent = '<script>alert(1)</script> javascript:do-not-open'
const record = {
  id: 'a1f6c03e-a978-46c2-a11f-e40c5c4cd872',
  input_type: 'QR',
  content: hostileContent,
  status: 'COMPLETED',
  created_at: assessment.completed_at,
  updated_at: assessment.completed_at,
  assessment,
  failure_code: null,
}

const capabilities = {
  submission_available: true,
  submission_inputs: ['MESSAGE', 'URL', 'PHONE', 'QR'],
  analysis_available: true,
  supported_inputs: ['MESSAGE', 'URL', 'PHONE', 'QR'],
  reason: 'Local Message, URL, Phone and QR intelligence is available.',
}

function setup(post = async () => Response.json(record, { status: 201 })) {
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
        recent_analyses: [{ ...record, preview: hostileContent, payload_type: 'TEXT' }],
      })
    if (url.includes('/analyses?'))
      return Response.json({
        items: [{ ...record, preview: hostileContent, payload_type: 'TEXT' }],
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

async function selectQR() {
  await screen.findByLabelText('Message content')
  await userEvent.click(screen.getByRole('tab', { name: 'QR Code' }))
}

describe('QR Intelligence', () => {
  it('validates the typed QR contract and avoids an invented numeric score', () => {
    const parsed = qrAssessmentSchema.parse(assessment)
    expect(parsed.components.qr.payload_type).toBe('TEXT')
    expect(parsed.risk_score).toBeNull()
    expect(parsed.confidence_score).toBeNull()
    for (const payloadType of [
      'URL',
      'PHONE',
      'TEXT',
      'EMAIL',
      'SMS',
      'WIFI',
      'GEO',
      'PAYMENT',
      'OTHER',
    ]) {
      expect(
        qrAssessmentSchema.parse({
          ...assessment,
          components: { qr: { ...assessment.components.qr, payload_type: payloadType } },
        }).components.qr.payload_type,
      ).toBe(payloadType)
    }
  })

  it('renders only present payment metadata with the integrity limitation', () => {
    const paymentAssessment = {
      ...assessment,
      components: {
        qr: { ...assessment.components.qr, payload_type: 'PAYMENT' as const },
        payment: {
          standard: 'EMVCo merchant-presented QR (generic structural subset)',
          payload_format_indicator: '01',
          transaction_currency_code: '458',
          transaction_amount: '12.34',
          merchant_name: 'SCAMGUARD',
          merchant_account_information_ids: ['26'],
          crc_valid: true,
        },
      },
    }
    render(<QrResult assessment={paymentAssessment} content="000201…" />)
    expect(screen.getByRole('region', { name: 'Payment QR structure' })).toHaveTextContent(
      'SCAMGUARD',
    )
    expect(screen.getByText('26')).toBeInTheDocument()
    expect(screen.getByText(/do not prove recipient identity/i)).toBeInTheDocument()
    expect(screen.queryByText('Merchant city')).not.toBeInTheDocument()
  })

  it('previews, clears, uploads multipart once, and renders escaped decoded content', async () => {
    const fetchMock = setup()
    renderApp('/analyse')
    await selectQR()
    const input = screen.getByLabelText('Upload a QR screenshot or image')
    const file = new File(['controlled-image-bytes'], 'controlled.png', { type: 'image/png' })
    await userEvent.upload(input, file)
    expect(await screen.findByAltText('Selected QR image preview')).toBeInTheDocument()
    expect(screen.getByText('controlled.png')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Remove' }))
    expect(screen.queryByText('controlled.png')).not.toBeInTheDocument()
    await userEvent.upload(input, file)
    await userEvent.click(screen.getByRole('button', { name: 'Analyse QR' }))
    expect(await screen.findByLabelText('QR assessment')).toBeInTheDocument()
    expect(screen.getByText(hostileContent)).toBeInTheDocument()
    expect(document.querySelector('script')).toBeNull()
    expect(screen.queryByRole('link', { name: /javascript/i })).not.toBeInTheDocument()
    expect(screen.getByText(/ScamGuard never opens it automatically/)).toBeInTheDocument()
    const call = fetchMock.mock.calls.find(
      ([url, init]) => url.endsWith('/analyses/qr') && init?.method === 'POST',
    )!
    expect(call).toBeDefined()
    expect(call[1]!.body).toBeInstanceOf(FormData)
    expect((call[1]!.body as FormData).get('file')).toBeInstanceOf(File)
    expect((call[1]!.headers as Record<string, string>)['Content-Type']).toBeUndefined()
    expect(fetchMock.mock.calls.some(([url]) => url === hostileContent)).toBe(false)
  })

  it('keeps the selected file and shows a decoding error without retrying', async () => {
    const fetchMock = setup(async () =>
      Response.json(
        {
          error: {
            code: 'QR_NOT_DETECTED',
            message: 'No readable QR code was detected. Try a clearer image.',
          },
        },
        { status: 422 },
      ),
    )
    renderApp('/analyse')
    await selectQR()
    const input = screen.getByLabelText('Upload a QR screenshot or image')
    await userEvent.upload(input, new File(['white-image'], 'blank.png', { type: 'image/png' }))
    await userEvent.click(screen.getByRole('button', { name: 'Analyse QR' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('No readable QR code was detected')
    expect(screen.getByText('blank.png')).toBeInTheDocument()
    expect(fetchMock.mock.calls.filter(([, init]) => init?.method === 'POST')).toHaveLength(1)
  })

  it('labels persisted QR subtype and explains why image-based Analyse again is omitted', async () => {
    setup()
    renderApp('/')
    expect(await screen.findByText('QR · text')).toBeInTheDocument()
    await userEvent.click(screen.getByText(hostileContent).closest('button')!)
    expect(await screen.findByLabelText('QR assessment')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Analyse again' })).not.toBeInTheDocument()
    expect(screen.getByText(/Scan the code or upload its image again/)).toBeInTheDocument()
    expect(
      within(screen.getByLabelText('QR decoding result')).getByText('text'),
    ).toBeInTheDocument()
  })

  it('accepts drag and drop and keeps tab keyboard navigation accessible', async () => {
    setup()
    renderApp('/analyse')
    await selectQR()
    const input = screen.getByLabelText('Upload a QR screenshot or image')
    const file = new File(['controlled'], 'drop.webp', { type: 'image/webp' })
    fireEvent.drop(input, { dataTransfer: { files: [file] } })
    await waitFor(() => expect(screen.getByText('drop.webp')).toBeInTheDocument())
    screen.getByRole('tab', { name: 'QR Code' }).focus()
    await userEvent.keyboard('{Home}')
    expect(screen.getByRole('tab', { name: 'Message' })).toHaveFocus()
  })
})
