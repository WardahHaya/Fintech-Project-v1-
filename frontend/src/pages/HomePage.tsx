import { ArrowRight, BriefcaseBusiness, UserRound } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useNavigate, useOutletContext } from 'react-router-dom'

import { fetchHealth, fetchKycReviews } from '../lib/api'
import type { AppShellContext, HealthResponse, KycReviewRecord } from '../types'

function computeApprovalRate(reviews: KycReviewRecord[]) {
  if (reviews.length === 0) {
    return '0%'
  }

  const approved = reviews.filter((review) => review.decision === 'APPROVED').length
  return `${Math.round((approved / reviews.length) * 100)}%`
}

function computeReviewRequired(reviews: KycReviewRecord[]) {
  return reviews.filter((review) => review.decision === 'REVIEW_REQUIRED').length
}

export function HomePage() {
  const [health, setHealth] = useState<HealthResponse | null>(null)
  const [reviews, setReviews] = useState<KycReviewRecord[]>([])
  const [error, setError] = useState('')
  const { role, setRole } = useOutletContext<AppShellContext>()
  const navigate = useNavigate()

  useEffect(() => {
    let active = true

    async function load() {
      try {
        const [healthResponse, reviewsResponse] = await Promise.all([fetchHealth(), fetchKycReviews()])
        if (!active) {
          return
        }

        setHealth(healthResponse)
        setReviews(reviewsResponse)
      } catch {
        if (!active) {
          return
        }

        setError('Live data is not available right now.')
      }
    }

    void load()

    return () => {
      active = false
    }
  }, [])

  const latestReviews = reviews.slice(0, 3)
  const approvalRate = computeApprovalRate(reviews)
  const reviewRequired = computeReviewRequired(reviews)

  return (
    <div className="space-y-6">
      <section className="hero-shell surface-card grid gap-6 overflow-hidden px-6 py-8 sm:px-8 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="relative z-10">
          <span className="eyebrow">KYC platform</span>
          <h2 className="mt-5 max-w-2xl text-4xl font-semibold tracking-[-0.05em] text-slate-950 sm:text-5xl">
            Review KYC decisions fast.
          </h2>
          <p className="mt-4 max-w-xl text-base leading-7 text-slate-600">
            Clear admin tools for compliance teams and a separate user-facing journey for demos.
          </p>

          <div className="mt-7 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => {
                setRole('admin')
                navigate('/review')
              }}
              className="action-primary"
            >
              Open admin view
              <ArrowRight className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => {
                setRole('user')
                navigate('/review')
              }}
              className="action-secondary"
            >
              Open user view
            </button>
          </div>

          <div className="mt-8 flex flex-wrap gap-3 text-sm">
            <div className="rounded-full border border-teal-900/10 bg-white/75 px-4 py-2 text-slate-600">
              Mode: <span className="font-semibold text-slate-950">{role === 'admin' ? 'Admin' : 'User'}</span>
            </div>
            <div className="rounded-full border border-teal-900/10 bg-white/75 px-4 py-2 text-slate-600">
              API: <span className="font-semibold text-slate-950">{health?.status === 'ok' ? 'Healthy' : 'Waiting'}</span>
            </div>
          </div>
        </div>

        <div className="signal-panel relative z-10 p-6">
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-[22px] border border-white/10 bg-white/8 p-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">
                Reviews
              </p>
              <p className="mt-2 text-3xl font-semibold text-white">{reviews.length}</p>
            </div>
            <div className="rounded-[22px] border border-white/10 bg-white/8 p-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">
                Approved
              </p>
              <p className="mt-2 text-3xl font-semibold text-white">{approvalRate}</p>
            </div>
            <div className="rounded-[22px] border border-white/10 bg-white/8 p-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">
                Review
              </p>
              <p className="mt-2 text-3xl font-semibold text-white">{reviewRequired}</p>
            </div>
          </div>

          <div className="mt-5 rounded-[24px] border border-white/10 bg-slate-950/30 p-4">
            <div className="mb-3 flex items-center justify-between gap-3">
              <p className="text-sm font-semibold text-white">Latest decisions</p>
              <span className="text-xs uppercase tracking-[0.22em] text-emerald-200">
                {health?.status === 'ok' ? 'Live' : 'Idle'}
              </span>
            </div>

            <div className="space-y-2">
              {latestReviews.length > 0 ? (
                latestReviews.map((review) => (
                  <div
                    key={review.id}
                    className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/6 px-4 py-3"
                  >
                    <div>
                      <p className="text-sm font-semibold text-white">{review.full_name}</p>
                      <p className="text-xs text-slate-400">{review.customer_id}</p>
                    </div>
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-200">
                      {review.decision.replace('_', ' ')}
                    </p>
                  </div>
                ))
              ) : (
                <p className="rounded-2xl border border-dashed border-white/12 px-4 py-5 text-sm text-slate-400">
                  No reviews yet.
                </p>
              )}
            </div>
          </div>
        </div>
      </section>

      {error ? (
        <div className="rounded-[24px] border border-amber-300/70 bg-amber-50 px-5 py-3 text-sm text-amber-800">
          {error}
        </div>
      ) : null}

      <section className="grid gap-5 lg:grid-cols-2">
        <button
          type="button"
          onClick={() => {
            setRole('admin')
            navigate('/history')
          }}
          className={[
            'surface-card text-left transition hover:-translate-y-0.5',
            role === 'admin' ? 'ring-2 ring-teal-700/30' : '',
          ].join(' ')}
        >
          <div className="p-6">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-[20px] bg-teal-800 text-white">
                <BriefcaseBusiness className="h-5 w-5" />
              </div>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-400">
                  Admin
                </p>
                <h3 className="text-2xl font-semibold text-slate-950">Compliance workspace</h3>
              </div>
            </div>
            <p className="mt-4 text-sm leading-7 text-slate-600">
              Run reviews, inspect results, and check history.
            </p>
          </div>
        </button>

        <button
          type="button"
          onClick={() => {
            setRole('user')
            navigate('/review')
          }}
          className={[
            'surface-card text-left transition hover:-translate-y-0.5',
            role === 'user' ? 'ring-2 ring-amber-400/40' : '',
          ].join(' ')}
        >
          <div className="p-6">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-[20px] bg-slate-950 text-white">
                <UserRound className="h-5 w-5" />
              </div>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-400">
                  User
                </p>
                <h3 className="text-2xl font-semibold text-slate-950">Status view</h3>
              </div>
            </div>
            <p className="mt-4 text-sm leading-7 text-slate-600">
              Show a simple onboarding journey without internal review language.
            </p>
          </div>
        </button>
      </section>
    </div>
  )
}
