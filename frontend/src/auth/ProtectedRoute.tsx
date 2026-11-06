// Private-page navigation guard used by App.tsx. It shows restoration progress before
// redirecting unauthenticated users and records the internal destination for login. Hiding a
// page is not API authorization.

import { Navigate, useLocation } from 'react-router-dom'
import { LoadingState } from '../components/States'
import { useAuth } from './AuthContext'

// Return children only with a restored user, otherwise loading UI or a replacement redirect.
// replace avoids leaving a useless protected-route entry in navigation history.
export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const auth = useAuth()
  const location = useLocation()
  if (auth.loading)
    return (
      <LoadingState
        label={
          auth.waking
            ? 'Waking the SCAMGUARD server — this can take up to a minute after a quiet period'
            : 'Restoring secure session'
        }
      />
    )
  if (!auth.user) {
    return (
      <Navigate to="/login" replace state={{ from: `${location.pathname}${location.search}` }} />
    )
  }
  return children
}
