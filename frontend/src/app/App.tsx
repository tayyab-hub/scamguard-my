import { Route, Routes } from 'react-router-dom'
import { AppShell } from '../layout/AppShell'
import { AnalysePage } from '../pages/AnalysePage'
import { DashboardPage } from '../pages/DashboardPage'
import { NotFoundPage } from '../pages/NotFoundPage'

export function App() {
  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route index element={<DashboardPage />} />
        <Route path="analyse" element={<AnalysePage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  )
}
