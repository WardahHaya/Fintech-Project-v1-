import { lazy, Suspense } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'

import { AdminRoute } from './auth/AdminRoute'
import { ProtectedRoute } from './auth/ProtectedRoute'
import { AppFrame } from './components/AppFrame'


const HomePage = lazy(() =>
  import('./pages/HomePage').then((module) => ({ default: module.HomePage })),
)
const ReviewPage = lazy(() =>
  import('./pages/ReviewPage').then((module) => ({ default: module.ReviewPage })),
)
const HistoryPage = lazy(() =>
  import('./pages/HistoryPage').then((module) => ({ default: module.HistoryPage })),
)
const StaffPage = lazy(() =>
  import('./pages/StaffPage').then((module) => ({ default: module.StaffPage })),
)
const LoginPage = lazy(() =>
  import('./pages/Login').then((module) => ({ default: module.LoginPage })),
)


function PageFallback() {
  return (
    <div className="mx-auto mt-24 max-w-md">
      <div className="surface-card flex min-h-[18rem] items-center justify-center p-8 text-center">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate">
            Loading workspace
          </p>
          <div className="mx-auto mt-4 h-10 w-10 animate-spin rounded-full border-2 border-slate-200 border-t-primary" />
        </div>
      </div>
    </div>
  )
}


function App() {
  return (
    <Suspense fallback={<PageFallback />}>
      <Routes>
        <Route path="/login" element={<LoginPage />} />

        <Route element={<ProtectedRoute />}>
          <Route element={<AppFrame />}>
            <Route index element={<HomePage />} />
            <Route path="/review" element={<ReviewPage />} />
            <Route path="/history" element={<HistoryPage />} />

            <Route element={<AdminRoute />}>
              <Route path="/staff" element={<StaffPage />} />
            </Route>
          </Route>
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  )
}


export default App
