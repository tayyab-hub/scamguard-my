import { fireEvent, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { capabilitiesFixture, dashboardFixture, healthFixture } from '../test/fixtures'
import { renderApp } from '../test/render'

function healthyFetch(url: string) {
  if (url.endsWith('/health')) return Promise.resolve(Response.json(healthFixture))
  if (url.endsWith('/dashboard')) return Promise.resolve(Response.json(dashboardFixture))
  if (url.endsWith('/capabilities')) return Promise.resolve(Response.json(capabilitiesFixture))
  return Promise.resolve(new Response(null, { status: 404 }))
}

beforeEach(() => vi.stubGlobal('fetch', vi.fn(healthyFetch)))

describe('application routes and API states', () => {
  it('renders the loading state while the dashboard request is pending', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn((url: string) => (url.endsWith('/health') ? healthyFetch(url) : new Promise(() => {}))),
    )
    renderApp()
    expect(screen.getByText('Loading workspace…')).toBeInTheDocument()
    expect(screen.queryByText('Your activity starts here')).not.toBeInTheDocument()
    await screen.findAllByText('API connected')
  })

  it('shows unavailable metrics and explicit empty history without invented totals', async () => {
    renderApp()
    expect(await screen.findByText('Your activity starts here')).toBeInTheDocument()
    expect(screen.getAllByLabelText('Not available')).toHaveLength(3)
    expect(
      screen.getByText('No live statistics are being collected or displayed.'),
    ).toBeInTheDocument()
  })

  it('keeps the unconfigured dashboard visible during failure and recovers through retry', async () => {
    let failed = true
    vi.stubGlobal(
      'fetch',
      vi.fn((url: string) =>
        url.endsWith('/dashboard') && failed
          ? Promise.resolve(new Response(null, { status: 503 }))
          : healthyFetch(url),
      ),
    )
    renderApp()
    expect(await screen.findByRole('alert')).toHaveTextContent('temporarily unavailable')
    expect(screen.getByText('Your activity starts here')).toBeInTheDocument()
    expect(screen.getAllByLabelText('Not available')).toHaveLength(3)
    expect(screen.getAllByText('API connected')).toHaveLength(2)
    failed = false
    await userEvent.click(screen.getByRole('button', { name: 'Try again' }))
    await waitFor(() => expect(screen.queryByRole('alert')).not.toBeInTheDocument())
    expect(await screen.findByText('Your activity starts here')).toBeInTheDocument()
  })

  it('renders honest unavailable metrics offline and keeps health recovery independent', async () => {
    let healthRecovered = false
    vi.stubGlobal(
      'fetch',
      vi.fn((url: string) =>
        url.endsWith('/health') && healthRecovered
          ? healthyFetch(url)
          : Promise.reject(new TypeError('offline')),
      ),
    )
    renderApp()
    expect(await screen.findByRole('alert')).toHaveTextContent('could not reach')
    expect(screen.getAllByText('API unavailable')).toHaveLength(2)
    expect(screen.queryByText('API connected')).not.toBeInTheDocument()
    expect(screen.getAllByLabelText('Not available')).toHaveLength(3)
    for (const value of screen.getAllByLabelText('Not available'))
      expect(value).toHaveTextContent('—')
    expect(screen.getAllByText('Not available yet')).toHaveLength(3)
    expect(screen.getByText('Your activity starts here')).toBeInTheDocument()
    expect(screen.getByText('Workspace status')).toBeInTheDocument()
    expect(screen.getByText('None configured')).toBeInTheDocument()
    expect(
      screen.getByText('No live statistics are being collected or displayed.'),
    ).toBeInTheDocument()
    healthRecovered = true
    await userEvent.click(screen.getAllByRole('button', { name: 'Retry API connection' })[0]!)
    await screen.findAllByText('API connected')
    expect(screen.getByRole('alert')).toHaveTextContent('could not reach')
  })

  it('navigates to Analyse and marks the active desktop and mobile links', async () => {
    renderApp()
    await userEvent.click(
      within(screen.getByRole('navigation', { name: 'Desktop navigation' })).getByRole('link', {
        name: 'Analyse',
      }),
    )
    expect(
      await screen.findByRole('heading', { name: 'Analyse suspicious content' }),
    ).toBeInTheDocument()
    expect(
      within(screen.getByRole('navigation', { name: 'Mobile navigation' })).getByRole('link', {
        name: 'Analyse',
      }),
    ).toHaveAttribute('aria-current', 'page')
    await screen.findByText('Analysis is not enabled in this release.')
    expect(document.title).toBe('Analyse · SCAMGUARD')
  })

  it.each([
    ['/login', 'Sign in', 'Welcome back'],
    ['/signup', 'Create account', 'Create your account'],
  ])('recognizes the public auth route %s in page metadata', async (path, label, heading) => {
    renderApp(path, { user: null })
    expect(await screen.findByRole('heading', { name: heading })).toBeInTheDocument()
    expect(screen.getByLabelText('Current page')).toHaveTextContent(label)
    await waitFor(() => expect(document.title).toBe(`${label} · SCAMGUARD`))
  })

  it('recognizes the protected account route in page metadata', async () => {
    renderApp('/account')
    expect(await screen.findByRole('heading', { name: 'Account controls' })).toBeInTheDocument()
    expect(screen.getByLabelText('Current page')).toHaveTextContent('Account')
    await waitFor(() => expect(document.title).toBe('Account · SCAMGUARD'))
  })

  it('allows local drafting, content switching and clearing without submitting anything', async () => {
    const user = userEvent.setup()
    renderApp('/analyse')
    const message = await screen.findByLabelText('Message content')
    await user.type(message, 'A message to check')
    await user.click(screen.getByRole('tab', { name: 'URL' }))
    await user.type(screen.getByLabelText('Website URL'), 'https://example.com')
    await user.click(screen.getByRole('tab', { name: 'Message' }))
    expect(screen.getByLabelText('Message content')).toHaveValue('A message to check')
    expect(screen.getByRole('button', { name: 'Analyse content' })).toBeDisabled()
    await user.click(screen.getByRole('button', { name: 'Clear' }))
    expect(screen.getByLabelText('Message content')).toHaveValue('')
    for (const [, options] of vi.mocked(fetch).mock.calls) expect(options?.method).toBeUndefined()
  })

  it('offers four typed modes while unavailable capabilities and QR remain disabled', async () => {
    const user = userEvent.setup({ applyAccept: false })
    renderApp('/analyse')
    await screen.findByLabelText('Message content')
    const choices = screen.getAllByRole('tab')
    expect(choices.map((choice) => choice.textContent)).toEqual([
      'Message',
      'URL',
      'Phone Number',
      'QR Code',
    ])

    await user.click(screen.getByRole('tab', { name: 'Phone Number' }))
    const phone = screen.getByLabelText('Phone number')
    expect(phone).toHaveAttribute('type', 'tel')
    expect(phone).toHaveAttribute('inputmode', 'tel')
    expect(phone).toHaveAttribute('placeholder', '+60 12-345 6789')
    await user.type(phone, '+44 20 7946 0958')
    expect(screen.getByRole('button', { name: 'Analyse phone number' })).toBeDisabled()
    expect(screen.getByText(/ScamGuard checks numbering-plan metadata only/)).toBeInTheDocument()

    await user.click(screen.getByRole('tab', { name: 'QR Code' }))
    const input = screen.getByLabelText('Upload a QR screenshot or image')
    await user.upload(input, new File(['not-an-image'], 'payload.txt', { type: 'text/plain' }))
    expect(screen.getByRole('alert')).toHaveTextContent('PNG, JPG, JPEG or WEBP')
    await user.upload(input, new File(['image-bytes'], 'example-qr.png', { type: 'image/png' }))
    expect(screen.getByText('example-qr.png')).toBeInTheDocument()
    expect(screen.getByText(/not read, uploaded or saved/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Analyse QR' })).toBeDisabled()
    await user.click(screen.getByRole('button', { name: 'Remove' }))
    expect(screen.queryByText('example-qr.png')).not.toBeInTheDocument()

    for (const [url, options] of vi.mocked(fetch).mock.calls) {
      expect(url).toMatch(/^\/api\/v1\/(health|capabilities)$/)
      expect(options?.method).toBeUndefined()
      expect(options?.body).toBeUndefined()
    }
  })

  it('supports arrow/Home/End tab selection and preserves each draft across all modes', async () => {
    const user = userEvent.setup()
    renderApp('/analyse')
    await user.type(await screen.findByLabelText('Message content'), 'Local message')
    await user.click(screen.getByRole('tab', { name: 'Message' }))
    await user.keyboard('{ArrowRight}')
    expect(screen.getByRole('tab', { name: 'URL' })).toHaveFocus()
    await user.type(screen.getByLabelText('Website URL'), 'https://example.com')
    await user.click(screen.getByRole('tab', { name: 'Phone Number' }))
    await user.type(screen.getByLabelText('Phone number'), '+60 (12) 345-6789')
    await user.click(screen.getByRole('tab', { name: 'Phone Number' }))
    await user.keyboard('{End}')
    expect(screen.getByRole('tabpanel', { name: 'QR Code' })).toBeInTheDocument()
    await user.keyboard('{ArrowRight}')
    expect(screen.getByRole('tab', { name: 'Message' })).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByLabelText('Message content')).toHaveValue('Local message')
    await user.keyboard('{ArrowLeft}{ArrowLeft}')
    expect(screen.getByLabelText('Phone number')).toHaveValue('+60 (12) 345-6789')
    await user.keyboard('{Home}{ArrowRight}')
    expect(screen.getByLabelText('Website URL')).toHaveValue('https://example.com')
  })

  it('keeps phone and QR local through offline capability recovery, Enter and form submit', async () => {
    let failed = true
    vi.stubGlobal(
      'fetch',
      vi.fn((url: string) => (failed ? Promise.reject(new Error('offline')) : healthyFetch(url))),
    )
    const user = userEvent.setup()
    const view = renderApp('/analyse')
    await screen.findByRole('alert')
    await user.click(screen.getByRole('tab', { name: 'Phone Number' }))
    await user.type(screen.getByLabelText('Phone number'), '+1 202 555 0100{Enter}')
    await user.click(screen.getByRole('button', { name: 'Analyse phone number' }))
    fireEvent.submit(screen.getByLabelText('Phone number').closest('form')!)
    await user.click(screen.getByRole('tab', { name: 'QR Code' }))
    await user.upload(
      screen.getByLabelText('Upload a QR screenshot or image'),
      new File(['fixture'], 'local.webp', { type: 'image/webp' }),
    )
    await user.click(screen.getByRole('button', { name: 'Analyse QR' }))
    fireEvent.submit(screen.getByLabelText('Upload a QR screenshot or image').closest('form')!)
    failed = false
    await user.click(screen.getByRole('button', { name: 'Try again' }))
    await waitFor(() => expect(screen.queryByRole('alert')).not.toBeInTheDocument())
    expect(screen.getByText('local.webp')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Analyse QR' })).toBeDisabled()
    for (const [url, options] of vi.mocked(fetch).mock.calls) {
      expect(url).toMatch(/^\/api\/v1\/(health|capabilities)$/)
      expect(options?.body).toBeUndefined()
      expect(options?.method).toBeUndefined()
    }
    view.unmount()
    renderApp('/analyse')
    await user.click(await screen.findByRole('tab', { name: 'Phone Number' }))
    expect(screen.getByLabelText('Phone number')).toHaveValue('')
    await user.click(screen.getByRole('tab', { name: 'QR Code' }))
    expect(screen.queryByText('local.webp')).not.toBeInTheDocument()
  })

  it('validates local image limits and supports replacement, drop and removal without reading files', async () => {
    const user = userEvent.setup({ applyAccept: false })
    renderApp('/analyse')
    await user.click(await screen.findByRole('tab', { name: 'QR Code' }))
    const input = screen.getByLabelText('Upload a QR screenshot or image')
    const first = new File(['fixture'], 'first.png', { type: 'image/png' })
    await user.upload(input, first)
    for (const invalid of [
      new File([], 'empty.png', { type: 'image/png' }),
      new File([new Uint8Array(5 * 1024 * 1024 + 1)], 'large.png', { type: 'image/png' }),
    ]) {
      await user.upload(input, invalid)
      expect(screen.getByRole('alert')).toHaveTextContent(
        invalid.size === 0 ? 'non-empty image' : '5 MB or smaller',
      )
      expect(screen.getByText('first.png')).toBeInTheDocument()
    }
    await user.upload(input, new File(['<svg/>'], 'script.svg', { type: 'image/svg+xml' }))
    expect(input).toHaveAttribute('aria-invalid', 'true')
    expect(screen.getByText('first.png')).toBeInTheDocument()
    const second = new File(['fixture'], 'second.JPEG', { type: 'image/jpeg' })
    fireEvent.drop(input, { dataTransfer: { files: [first, second] } })
    expect(screen.getByRole('alert')).toHaveTextContent('one QR image')
    fireEvent.drop(input, { dataTransfer: { files: [second] } })
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    expect(screen.queryByText('first.png')).not.toBeInTheDocument()
    expect(screen.getByText('second.JPEG')).toBeInTheDocument()
    await user.click(screen.getByRole('tab', { name: 'Message' }))
    await user.click(screen.getByRole('tab', { name: 'QR Code' }))
    expect(screen.getByText('second.JPEG')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Remove' }))
    expect(screen.queryByText('second.JPEG')).not.toBeInTheDocument()
    expect(screen.queryByRole('img')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Analyse QR' })).toBeDisabled()
  })

  it('keeps drafts local and submission disabled offline, then retries capabilities without losing a draft', async () => {
    let failed = true
    vi.stubGlobal(
      'fetch',
      vi.fn((url: string) =>
        failed ? Promise.reject(new TypeError('offline')) : healthyFetch(url),
      ),
    )
    renderApp('/analyse')
    expect(await screen.findByRole('alert')).toHaveTextContent('could not reach')
    expect(screen.getAllByText('API unavailable')).toHaveLength(2)
    expect(screen.getByText('Analysis is not enabled in this release.')).toBeInTheDocument()
    expect(screen.getByText('No assessment yet')).toBeInTheDocument()
    const user = userEvent.setup()
    await user.type(screen.getByLabelText('Message content'), 'Private local draft')
    await user.click(screen.getByRole('tab', { name: 'URL' }))
    await user.type(screen.getByLabelText('Website URL'), 'https://example.com')
    await user.click(screen.getByRole('tab', { name: 'Message' }))
    expect(screen.getByLabelText('Message content')).toHaveValue('Private local draft')
    expect(screen.getByRole('button', { name: 'Analyse content' })).toBeDisabled()
    await user.click(screen.getByRole('button', { name: 'Analyse content' }))
    failed = false
    await user.click(screen.getByRole('button', { name: 'Try again' }))
    await waitFor(() => expect(screen.queryByRole('alert')).not.toBeInTheDocument())
    expect(screen.getByLabelText('Message content')).toHaveValue('Private local draft')
    expect(screen.getByRole('button', { name: 'Analyse content' })).toBeDisabled()
    // Capabilities recovery must not falsify the independently failed health query.
    expect(screen.getAllByText('API unavailable')).toHaveLength(2)
    await user.click(screen.getByRole('button', { name: 'Clear' }))
    expect(screen.getByLabelText('Message content')).toHaveValue('')
    for (const [url, options] of vi.mocked(fetch).mock.calls) {
      expect(url).toMatch(/^\/api\/v1\/(health|capabilities)$/)
      expect(options?.method).toBeUndefined()
      expect(options?.body).toBeUndefined()
    }
  })

  it('keeps a genuine loading state while capabilities are pending', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn((url: string) =>
        url.endsWith('/capabilities') ? new Promise(() => {}) : healthyFetch(url),
      ),
    )
    renderApp('/analyse')
    expect(screen.getByText('Checking analysis availability…')).toBeInTheDocument()
    expect(screen.queryByLabelText('Message content')).not.toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    await screen.findAllByText('API connected')
  })

  it.each([
    ['HTML fallback', () => new Response('<html>Static preview</html>')],
    [
      'unsupported capabilities',
      () =>
        Response.json({
          analysis_available: true,
          supported_inputs: ['message'],
          reason: 'Enabled',
        }),
    ],
  ])(
    'rejects %s without enabling analysis or hiding the validation error',
    async (_label, response) => {
      vi.stubGlobal(
        'fetch',
        vi.fn((url: string) =>
          url.endsWith('/capabilities') ? Promise.resolve(response()) : healthyFetch(url),
        ),
      )
      renderApp('/analyse')
      expect(await screen.findByRole('alert')).toHaveTextContent('unexpected response')
      expect(screen.getByLabelText('Message content')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Analyse content' })).toBeDisabled()
      expect(screen.getByText('No assessment yet')).toBeInTheDocument()
      expect(screen.queryByText('Enabled')).not.toBeInTheDocument()
      expect(screen.getAllByText('API connected')).toHaveLength(2)
    },
  )

  it('shows a real not-found route with working Overview and Analyse actions', async () => {
    renderApp('/missing')
    expect(screen.getByRole('heading', { name: 'Page not found' })).toBeInTheDocument()
    expect(screen.getByLabelText('Current page')).toHaveTextContent('Page not found')
    await waitFor(() => expect(document.title).toBe('Page not found · SCAMGUARD'))
    expect(screen.getByRole('link', { name: 'Open Analyse' })).toHaveAttribute('href', '/analyse')
    await userEvent.click(screen.getByRole('link', { name: 'Return to Overview' }))
    await waitFor(() =>
      expect(screen.getByRole('heading', { name: 'Security overview' })).toBeInTheDocument(),
    )
    await screen.findByText('Your activity starts here')
  })

  it('provides searchable help, accessible FAQs and honest local feedback preparation', async () => {
    const user = userEvent.setup()
    renderApp('/help')
    expect(await screen.findByRole('heading', { name: 'Help & Support' })).toBeInTheDocument()
    expect(screen.getAllByRole('group')).toHaveLength(20)
    await user.type(screen.getByLabelText('Search help'), 'QR')
    expect(screen.getByText('3 answers available')).toBeInTheDocument()
    await user.clear(screen.getByLabelText('Search help'))
    await user.click(screen.getByRole('button', { name: 'Prepare feedback' }))
    expect(screen.getByText('Choose a feedback category.')).toBeInTheDocument()
    expect(screen.getByText('Enter a short summary.')).toBeInTheDocument()
    expect(screen.getByText(/Online feedback is being prepared/)).toBeInTheDocument()
    expect(document.title).toBe('Help & Support · SCAMGUARD')
  })
})
