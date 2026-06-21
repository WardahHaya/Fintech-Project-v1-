import { Navigate, Outlet } from 'react-router-dom'

import { useAuth } from './useAuth'


export function ProtectedRoute() {
  const { isHydrating, isAuthenticated } = useAuth()

  if (isHydrating) {
    return null
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  return <Outlet />
}
