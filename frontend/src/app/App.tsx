import { Route, Routes } from 'react-router-dom'
import { lazy } from 'react'
import { AppShell } from '../layout/AppShell'
import { AnalysePage } from '../pages/AnalysePage'
import { DashboardPage } from '../pages/DashboardPage'
import { NotFoundPage } from '../pages/NotFoundPage'
import { AuthPage } from '../pages/AuthPage'
import { ProtectedRoute } from '../auth/ProtectedRoute'
import { HistoryPage } from '../pages/HistoryPage'

const HelpPage = lazy(() =>
  import('../pages/HelpPage').then((module) => ({ default: module.HelpPage })),
)
const AccountPage = lazy(() =>
  import('../pages/AccountPage').then((module) => ({ default: module.AccountPage })),
)
const ForgotPasswordPage = lazy(() =>
  import('../pages/PasswordResetPages').then((module) => ({ default: module.ForgotPasswordPage })),
)
const ResetPasswordPage = lazy(() =>
  import('../pages/PasswordResetPages').then((module) => ({ default: module.ResetPasswordPage })),
)

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
        <Route
          path="history"
          element={
            <ProtectedRoute>
              <HistoryPage />
            </ProtectedRoute>
          }
        />
        <Route path="login" element={<AuthPage mode="login" />} />
        <Route path="signup" element={<AuthPage mode="signup" />} />
        <Route path="forgot-password" element={<ForgotPasswordPage />} />
        <Route path="reset-password" element={<ResetPasswordPage />} />
        <Route path="help" element={<HelpPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  )
}
