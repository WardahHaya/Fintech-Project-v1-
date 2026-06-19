import { lazy, Suspense } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'

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

function PageFallback() {
  return (
    <div className="surface-card flex min-h-[24rem] items-center justify-center p-8">
      <div className="text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-400">
          Loading workspace
        </p>
        <div className="mx-auto mt-4 h-10 w-10 animate-spin rounded-full border-2 border-slate-200 border-t-slate-950" />
      </div>
    </div>
  )
}

function App() {
  return (
    <Suspense fallback={<PageFallback />}>
      <Routes>
        <Route element={<AppFrame />}>
          <Route index element={<HomePage />} />
          <Route path="/review" element={<ReviewPage />} />
          <Route path="/history" element={<HistoryPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </Suspense>
  )
}

export default App
