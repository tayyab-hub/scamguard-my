import { Route, Routes } from 'react-router-dom'
import { AppShell } from '../layout/AppShell'
import { AnalysePage } from '../pages/AnalysePage'
import { DashboardPage } from '../pages/DashboardPage'
import { NotFoundPage } from '../pages/NotFoundPage'
import { HelpPage } from '../pages/HelpPage'
import { AuthPage } from '../pages/AuthPage'
import { AccountPage } from '../pages/AccountPage'
import { ProtectedRoute } from '../auth/ProtectedRoute'

export function App() {
  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route
          index
          element={
            <ProtectedRoute>
              <DashboardPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="analyse"
          element={
            <ProtectedRoute>
              <AnalysePage />
            </ProtectedRoute>
          }
        />
        <Route
          path="account"
          element={
            <ProtectedRoute>
              <AccountPage />
            </ProtectedRoute>
          }
        />
        <Route path="login" element={<AuthPage mode="login" />} />
        <Route path="signup" element={<AuthPage mode="signup" />} />
        <Route path="help" element={<HelpPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  )
}
