import { Navigate, Outlet } from 'react-router-dom'

import { useAuth } from './useAuth'


export function AdminRoute() {
  const { isHydrating, isAuthenticated, role } = useAuth()

  if (isHydrating) {
    return null
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  if (role !== 'admin') {
    return <Navigate to="/login" replace />
  }

  return <Outlet />
}
