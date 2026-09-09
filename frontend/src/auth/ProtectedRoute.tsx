import { Navigate, useLocation } from 'react-router-dom'
import { LoadingState } from '../components/States'
import { useAuth } from './AuthContext'

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const auth = useAuth()
  const location = useLocation()
  if (auth.loading) return <LoadingState label="Restoring secure session" />
  if (!auth.user) {
    return (
      <Navigate
        to="/login"
        replace
        state={{ from: `${location.pathname}${location.search}` }}
      />
    )
  }
  return children
}
