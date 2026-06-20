import { Navigate, Outlet, useLocation } from 'react-router-dom'

import { useAuth } from './useAuth'


function AuthLoader() {
  return (
    <div className="mx-auto mt-24 max-w-md">
      <div className="surface-card flex min-h-[16rem] items-center justify-center p-8 text-center">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate">Loading session</p>
          <div className="mx-auto mt-4 h-10 w-10 animate-spin rounded-full border-2 border-slate-200 border-t-primary" />
        </div>
      </div>
    </div>
  )
}


export function ProtectedRoute() {
  const { token, isHydrating, isAuthenticated } = useAuth()
  const location = useLocation()

  if (isHydrating) {
    return <AuthLoader />
  }

  if (!token || !isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />
  }

  return <Outlet />
}
