import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { App } from '../app/App'
import { AuthContext, type AuthContextValue } from '../auth/AuthContext'

const testUser = {
  id: 'c9274a91-93f8-4fa2-bad3-8453f1284e36',
  email: 'test@example.com',
  created_at: '2026-09-08T00:00:00Z',
}

export function renderApp(path = '/', authOverrides: Partial<AuthContextValue> = {}) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } })
  const auth: AuthContextValue = {
    user: testUser,
    loading: false,
    error: null,
    signIn: async () => undefined,
    signUp: async () => undefined,
    signOut: async () => undefined,
    deleteAccount: async () => undefined,
    ...authOverrides,
  }
  return render(
    <QueryClientProvider client={client}>
      <AuthContext.Provider value={auth}>
        <MemoryRouter initialEntries={[path]}>
          <App />
        </MemoryRouter>
      </AuthContext.Provider>
    </QueryClientProvider>,
  )
}
