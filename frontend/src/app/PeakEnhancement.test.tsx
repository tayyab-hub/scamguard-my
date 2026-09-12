import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import { renderApp } from '../test/render'
import { capabilitiesFixture, dashboardFixture, healthFixture } from '../test/fixtures'
import { AuthProvider } from '../auth/AuthProvider'
import { useAuth } from '../auth/AuthContext'
import { App } from './App'
import { ModalDialog } from '../components/ModalDialog'
import { DashboardDistribution } from '../components/DashboardDistribution'

const user = {
  id: 'c9274a91-93f8-4fa2-bad3-8453f1284e36',
  full_name: 'Test User',
  username: 'test_user',
  email: 'test@example.com',
  created_at: '2026-09-01T00:00:00Z',
}
const auth = { user, csrf_token: 'test-token-at-least-thirty-two-characters' }
function fallback(url: string) {
  if (url.endsWith('/health')) return Response.json(healthFixture)
  if (url.endsWith('/capabilities')) return Response.json(capabilitiesFixture)
  if (url.endsWith('/dashboard')) return Response.json(dashboardFixture)
  if (url.endsWith('/auth/me')) return Response.json(auth)
  return Response.json({ items: [], total: 0, page: 1, page_size: 10 })
}

describe('Task 8 product improvements', () => {
  it('ignores inherited property names in the mode query parameter', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string) => fallback(url)),
    )
    renderApp('/analyse?mode=toString')
    expect(await screen.findByLabelText('Message content')).toBeVisible()
  })

  it('does not restore a stale identity after a cross-tab invalidation', async () => {
    let resolve!: (value: Response) => void
    vi.stubGlobal(
      'fetch',
      vi.fn(
        () =>
          new Promise<Response>((done) => {
            resolve = done
          }),
      ),
    )
    function Identity() {
      const { user, loading } = useAuth()
      return <span>{loading ? 'Restoring' : user ? user.email : 'Signed out'}</span>
    }
    render(
      <QueryClientProvider client={new QueryClient()}>
        <AuthProvider>
          <Identity />
        </AuthProvider>
      </QueryClientProvider>,
    )
    await act(async () => {
      window.dispatchEvent(new Event('scamguard:unauthorized'))
      resolve(Response.json(auth))
    })
    expect(await screen.findByText('Signed out')).toBeVisible()
    expect(screen.queryByText(user.email)).not.toBeInTheDocument()
  })
  it('keeps search out of URLs and applies server filters with a clear empty state', async () => {
    const fetcher = vi.fn(async (url: string) => fallback(url))
    vi.stubGlobal('fetch', fetcher)
    renderApp('/history')
    await userEvent.type(await screen.findByLabelText('Search your analyses'), 'private phrase')
    await userEvent.selectOptions(screen.getByLabelText('Analysis type'), 'QR')
    await userEvent.selectOptions(screen.getByLabelText('Risk level'), 'INSUFFICIENT_EVIDENCE')
    await userEvent.selectOptions(screen.getByLabelText('Sort by'), 'oldest')
    await userEvent.click(screen.getByRole('button', { name: 'Search history' }))
    await screen.findByText('No matching analyses')
    await waitFor(() =>
      expect(
        vi.mocked(fetch).mock.calls.some(([, options]) => {
          if (!options?.body) return false
          return JSON.parse(options.body as string).query === 'private phrase'
        }),
      ).toBe(true),
    )
    const last = vi
      .mocked(fetch)
      .mock.calls.filter(([url]) => String(url).endsWith('/analyses/search'))
      .at(-1)!
    expect(last[1]?.method).toBe('POST')
    expect(JSON.parse(last[1]?.body as string)).toMatchObject({
      query: 'private phrase',
      input_type: 'QR',
      risk_level: 'INSUFFICIENT_EVIDENCE',
      sort: 'oldest',
      page: 1,
    })
    expect(fetcher.mock.calls.every(([url]) => !url.includes('private'))).toBe(true)
    await userEvent.click(screen.getByRole('button', { name: 'Clear filters' }))
    await screen.findByText('Your private history starts here')
  })

  it('populates labelled examples without submitting until the user chooses Analyse', async () => {
    const fetcher = vi.fn(async (url: string) => fallback(url))
    vi.stubGlobal('fetch', fetcher)
    renderApp('/analyse')
    await userEvent.click(await screen.findByRole('button', { name: 'Try an example' }))
    expect((screen.getByLabelText('Message content') as HTMLTextAreaElement).value).toContain(
      'example.com',
    )
    expect(screen.getByText(/Example input/)).toBeVisible()
    expect(vi.mocked(fetch).mock.calls.some(([, options]) => options?.method === 'POST')).toBe(
      false,
    )
  })

  it('clears all old private cache data before restoring identity', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string) => fallback(url)),
    )
    const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } })
    client.setQueryData(['analyses', 'former-user'], { private: 'former account content' })
    client.setQueryData(['analysis', 'former-id'], { private: 'former details' })
    render(
      <QueryClientProvider client={client}>
        <MemoryRouter initialEntries={['/account']}>
          <AuthProvider>
            <App />
          </AuthProvider>
        </MemoryRouter>
      </QueryClientProvider>,
    )
    await screen.findByText('Profile details')
    expect(client.getQueryData(['analyses', 'former-user'])).toBeUndefined()
    expect(client.getQueryData(['analysis', 'former-id'])).toBeUndefined()
  })

  it('does not pretend a failed logout revoked the session', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string) =>
        url.endsWith('/auth/logout') ? new Response(null, { status: 503 }) : fallback(url),
      ),
    )
    const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } })
    render(
      <QueryClientProvider client={client}>
        <MemoryRouter initialEntries={['/account']}>
          <AuthProvider>
            <App />
          </AuthProvider>
        </MemoryRouter>
      </QueryClientProvider>,
    )
    await screen.findByText('Profile details')
    await userEvent.click(screen.getByRole('button', { name: 'Logout' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Logout could not be confirmed')
    expect(screen.getByText('Profile details')).toBeVisible()
  })

  it('uses a native modal and protects a pending destructive action from Escape', () => {
    const cancel = vi.fn()
    const { rerender } = render(
      <ModalDialog headingId="heading" onCancel={cancel} busy>
        <h2 id="heading">Confirm</h2>
        <button data-dialog-initial>Cancel</button>
      </ModalDialog>,
    )
    const dialog = screen.getByRole('dialog')
    expect(dialog).toHaveAttribute('open')
    expect(screen.getByRole('button')).toHaveFocus()
    fireEvent(dialog, new Event('cancel', { cancelable: true }))
    expect(cancel).not.toHaveBeenCalled()
    rerender(
      <ModalDialog headingId="heading" onCancel={cancel}>
        <h2 id="heading">Confirm</h2>
        <button>Cancel</button>
      </ModalDialog>,
    )
    fireEvent(dialog, new Event('cancel', { cancelable: true }))
    expect(cancel).toHaveBeenCalledOnce()
  })

  it('shows measured distributions as labelled history actions including uncertainty', () => {
    render(
      <MemoryRouter>
        <DashboardDistribution
          total={4}
          unassessed={0}
          types={{ MESSAGE: 1, URL: 1, PHONE: 1, QR: 1 }}
          risks={{ LOW: 0, CAUTION: 1, ELEVATED: 0, HIGH: 1, INSUFFICIENT_EVIDENCE: 2 }}
        />
      </MemoryRouter>,
    )
    expect(
      screen.getByRole('link', { name: 'Insufficient evidence: 2 analyses. View history.' }),
    ).toHaveAttribute('href', '/history?risk=INSUFFICIENT_EVIDENCE')
    expect(screen.getByText(/not scam probabilities/)).toBeVisible()
  })
})
