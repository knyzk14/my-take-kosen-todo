import { useEffect, useState } from 'react'
import { Navigate, Outlet, Route, Routes, useLocation } from 'react-router-dom'
import { useAuth } from './auth/useAuth'
import { AppShell } from './components/AppShell'
import { LoginPage } from './pages/LoginPage'
import { SettingsPage } from './pages/SettingsPage'
import { TasksPage } from './pages/TasksPage'

function RedirectAfterLogin() {
  const [destination] = useState(() => {
    const storedDestination = sessionStorage.getItem('auth-redirect-destination')
    return storedDestination?.startsWith('/') && !storedDestination.startsWith('//') ? storedDestination : '/'
  })

  useEffect(() => {
    sessionStorage.removeItem('auth-redirect-destination')
  }, [])

  return <Navigate to={destination} replace />
}

function RequireAuth() {
  const { user, loading } = useAuth()
  const location = useLocation()

  if (loading) {
    return <main className="center-state"><span className="loader" />認証状態を確認しています</main>
  }
  if (!user) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />
  }
  return <AppShell><Outlet /></AppShell>
}

export default function App() {
  const { user, loading } = useAuth()

  return (
    <Routes>
      <Route
        path="/login"
        element={loading ? <main className="center-state"><span className="loader" />認証状態を確認しています</main> : user ? <RedirectAfterLogin /> : <LoginPage />}
      />
      <Route element={<RequireAuth />}>
        <Route path="/" element={<TasksPage />} />
        <Route path="/settings" element={<SettingsPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
