import { screen, waitFor, within } from '@testing-library/react'
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
    for (const value of screen.getAllByLabelText('Not available')) expect(value).toHaveTextContent('—')
    expect(screen.getAllByText('Not available yet')).toHaveLength(3)
    expect(screen.getByText('Your activity starts here')).toBeInTheDocument()
    expect(screen.getByText('Workspace status')).toBeInTheDocument()
    expect(screen.getByText('None configured')).toBeInTheDocument()
    expect(screen.getByText('No live statistics are being collected or displayed.')).toBeInTheDocument()
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
    expect(document.title).toBe('Analyse · SCAMGUARD MY')
  })

  it('allows local drafting, content switching and clearing without submitting anything', async () => {
    const user = userEvent.setup()
    renderApp('/analyse')
    const message = await screen.findByLabelText('Message content')
    await user.type(message, 'A message to check')
    await user.click(screen.getByRole('radio', { name: 'Website link' }))
    await user.type(screen.getByLabelText('Website URL'), 'https://example.com')
    await user.click(screen.getByRole('radio', { name: 'Message' }))
    expect(screen.getByLabelText('Message content')).toHaveValue('A message to check')
    expect(screen.getByRole('button', { name: 'Analyse content' })).toBeDisabled()
    await user.click(screen.getByRole('button', { name: 'Clear' }))
    expect(screen.getByLabelText('Message content')).toHaveValue('')
    for (const [, options] of vi.mocked(fetch).mock.calls) expect(options?.method).toBeUndefined()
  })

  it('keeps drafts local and submission disabled offline, then retries capabilities without losing a draft', async () => {
    let failed = true
    vi.stubGlobal(
      'fetch',
      vi.fn((url: string) =>
        failed
          ? Promise.reject(new TypeError('offline'))
          : healthyFetch(url),
      ),
    )
    renderApp('/analyse')
    expect(await screen.findByRole('alert')).toHaveTextContent('could not reach')
    expect(screen.getAllByText('API unavailable')).toHaveLength(2)
    expect(screen.getByText('Analysis is not enabled in this release.')).toBeInTheDocument()
    expect(screen.getByText('No assessment yet')).toBeInTheDocument()
    const user = userEvent.setup()
    await user.type(screen.getByLabelText('Message content'), 'Private local draft')
    await user.click(screen.getByRole('radio', { name: 'Website link' }))
    await user.type(screen.getByLabelText('Website URL'), 'https://example.com')
    await user.click(screen.getByRole('radio', { name: 'Message' }))
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
    ['unsupported capabilities', () => Response.json({ analysis_available: true, supported_inputs: ['message'], reason: 'Enabled' })],
  ])('rejects %s without enabling analysis or hiding the validation error', async (_label, response) => {
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
  })

  it('shows a real not-found route with a working way back', async () => {
    renderApp('/missing')
    expect(screen.getByRole('heading', { name: 'This page is off the map' })).toBeInTheDocument()
    await userEvent.click(screen.getByRole('link', { name: 'Back to dashboard' }))
    await waitFor(() =>
      expect(screen.getByRole('heading', { name: 'Security overview' })).toBeInTheDocument(),
    )
    await screen.findByText('Your activity starts here')
  })
})
