import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AuthProvider } from '../auth/AuthProvider'
import { App } from './App'
import { capabilitiesFixture, dashboardFixture, healthFixture } from '../test/fixtures'

const user = {
  id: 'c9274a91-93f8-4fa2-bad3-8453f1284e36',
  email: 'person@example.com',
  created_at: '2026-09-08T00:00:00Z',
}
const authResponse = { user, csrf_token: 'csrf-token-with-at-least-thirty-two-characters' }

function errorResponse(status: number, code: string, message: string) {
  return Response.json(
    { error: { code, message, request_id: '4a848ff8-3bc3-4baa-aa60-e9dbce215799' } },
    { status },
  )
}

function renderAuthenticatedApp(path = '/') {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } })
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[path]}>
        <AuthProvider>
          <App />
        </AuthProvider>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

function applicationFetch(url: string, options?: RequestInit) {
  if (url.endsWith('/health')) return Promise.resolve(Response.json(healthFixture))
  if (url.endsWith('/dashboard')) return Promise.resolve(Response.json(dashboardFixture))
  if (url.endsWith('/capabilities')) return Promise.resolve(Response.json(capabilitiesFixture))
  if (url.endsWith('/auth/me'))
    return Promise.resolve(errorResponse(401, 'AUTHENTICATION_REQUIRED', 'Sign in to continue.'))
  if (url.endsWith('/auth/login') && options?.method === 'POST')
    return Promise.resolve(Response.json(authResponse))
  return Promise.resolve(new Response(null, { status: 404 }))
}

beforeEach(() => vi.stubGlobal('fetch', vi.fn(applicationFetch)))

describe('authenticated application experience', () => {
  it('redirects a protected route to sign in and preserves a safe destination', async () => {
    renderAuthenticatedApp('/analyse')
    expect(await screen.findByRole('heading', { name: 'Welcome back' })).toBeInTheDocument()
    for (const link of screen.getAllByRole('link', { name: 'Create account' })) {
      expect(link).toHaveAttribute('href', '/signup')
    }
  })

  it('submits login with loading feedback and opens the intended protected page', async () => {
    let resolveLogin!: (response: Response) => void
    vi.stubGlobal(
      'fetch',
      vi.fn((url: string, options?: RequestInit) =>
        url.endsWith('/auth/login') && options?.method === 'POST'
          ? new Promise<Response>((resolve) => {
              resolveLogin = resolve
            })
          : applicationFetch(url, options),
      ),
    )
    const userEventApi = userEvent.setup()
    renderAuthenticatedApp('/analyse')
    await userEventApi.type(await screen.findByLabelText('Email address'), 'person@example.com')
    await userEventApi.type(screen.getByLabelText('Password'), 'correct horse battery staple')
    await userEventApi.click(screen.getByRole('button', { name: 'Sign in' }))
    expect(screen.getByRole('button', { name: 'Signing in…' })).toBeDisabled()
    resolveLogin(Response.json(authResponse))
    expect(
      await screen.findByRole('heading', { name: 'Analyse suspicious content' }),
    ).toBeInTheDocument()
    const loginCall = vi
      .mocked(fetch)
      .mock.calls.find(([url]) => String(url).endsWith('/auth/login'))
    expect(loginCall?.[1]).toMatchObject({
      method: 'POST',
      credentials: 'include',
      body: JSON.stringify({
        email: 'person@example.com',
        password: 'correct horse battery staple',
      }),
    })
  })

  it('shows generic authentication errors without exposing backend structures', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn((url: string, options?: RequestInit) =>
        url.endsWith('/auth/login') && options?.method === 'POST'
          ? Promise.resolve(errorResponse(401, 'INVALID_CREDENTIALS', 'Invalid email or password.'))
          : applicationFetch(url, options),
      ),
    )
    const userEventApi = userEvent.setup()
    renderAuthenticatedApp('/login')
    await userEventApi.type(await screen.findByLabelText('Email address'), 'person@example.com')
    await userEventApi.type(screen.getByLabelText('Password'), 'incorrect password')
    await userEventApi.click(screen.getByRole('button', { name: 'Sign in' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Invalid email or password.')
    expect(screen.getByRole('alert')).not.toHaveTextContent('INVALID_CREDENTIALS')
  })

  it('validates signup confirmation locally before making a request', async () => {
    const userEventApi = userEvent.setup()
    renderAuthenticatedApp('/signup')
    await userEventApi.type(await screen.findByLabelText('Password'), 'long enough password')
    await userEventApi.type(screen.getByLabelText('Confirm password'), 'different password')
    expect(screen.getByRole('alert')).toHaveTextContent('Passwords do not match')
    expect(screen.getByRole('button', { name: 'Create account' })).toBeEnabled()
  })

  it('restores a session, exposes the account menu, and logs out cleanly', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn((url: string, options?: RequestInit) => {
        if (url.endsWith('/auth/me')) return Promise.resolve(Response.json(authResponse))
        if (url.endsWith('/auth/logout') && options?.method === 'POST')
          return Promise.resolve(new Response(null, { status: 204 }))
        return applicationFetch(url, options)
      }),
    )
    const userEventApi = userEvent.setup()
    renderAuthenticatedApp()
    expect(await screen.findByText('person@example.com')).toBeInTheDocument()
    await userEventApi.click(screen.getByRole('button', { name: 'Logout' }))
    expect(await screen.findByRole('heading', { name: 'Welcome back' })).toBeInTheDocument()
    const logoutCall = vi
      .mocked(fetch)
      .mock.calls.find(([url]) => String(url).endsWith('/auth/logout'))
    expect(logoutCall?.[1]?.headers).toMatchObject({
      'X-CSRF-Token': authResponse.csrf_token,
    })
  })

  it('keeps help available when session restoration is unavailable', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn((url: string, options?: RequestInit) =>
        url.endsWith('/auth/me')
          ? Promise.reject(new TypeError('offline'))
          : applicationFetch(url, options),
      ),
    )
    renderAuthenticatedApp('/help')
    expect(await screen.findByRole('heading', { name: 'Help & Support' })).toBeInTheDocument()
    await waitFor(() => expect(screen.getByRole('link', { name: 'Sign in' })).toBeInTheDocument())
  })
})
