// Browser entry point: mount React into index.html, install the shared query cache, router,
// authentication provider and render-error boundary, then load the design system. Provider
// order makes query/router services available to AuthProvider and every page.

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { domAnimation, LazyMotion } from 'motion/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { App } from './app/App'
import { AuthProvider } from './auth/AuthProvider'
import { ErrorBoundary } from './components/ErrorBoundary'
import { shouldRetryWhileWaking, wakeRetryDelay } from './lib/api'
import './styles.css'

// Queries cache server data for 30 seconds and refetch on window focus. Reads retry only while
// the hosted API is waking from idle (timeouts, unreachable host, 502/504 gateway errors); every
// other error stays explicit. Mutations keep retries disabled to avoid duplicate submissions.
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: shouldRetryWhileWaking,
      retryDelay: wakeRetryDelay,
      refetchOnWindowFocus: true,
    },
  },
})

// StrictMode enables development checks, including effect setup/cleanup checks. Components must
// therefore release subscriptions and camera resources correctly; it does not deliberately
// duplicate user submissions.
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          {/* Animation features (reveals, springs, in-view) load with the page, so results never
              wait hidden for them. */}
          <LazyMotion features={domAnimation} strict>
            <AuthProvider>
              <App />
            </AuthProvider>
          </LazyMotion>
        </BrowserRouter>
      </QueryClientProvider>
    </ErrorBoundary>
  </StrictMode>,
)
