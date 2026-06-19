import {
  Activity,
  ArrowRight,
  BadgeCheck,
  ChartNoAxesCombined,
  Shield,
  Zap,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'

import { KpiCard } from '../components/KpiCard'
import { ReviewTimeline } from '../components/ReviewTimeline'
import { fetchHealth, fetchKycReviews } from '../lib/api'
import type { HealthResponse, KycReviewRecord } from '../types'

function computeApprovalRate(reviews: KycReviewRecord[]) {
  if (reviews.length === 0) {
    return '0%'
  }
  const approved = reviews.filter((review) => review.decision === 'APPROVED').length
  return `${Math.round((approved / reviews.length) * 100)}%`
}

function computeAverageRisk(reviews: KycReviewRecord[]) {
  if (reviews.length === 0) {
    return '0'
  }
  const total = reviews.reduce((sum, review) => sum + review.risk_score, 0)
  return `${Math.round(total / reviews.length)}`
}

export function HomePage() {
  const [health, setHealth] = useState<HealthResponse | null>(null)
  const [reviews, setReviews] = useState<KycReviewRecord[]>([])
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true

    async function load() {
      try {
        const [healthResponse, reviewsResponse] = await Promise.all([
          fetchHealth(),
          fetchKycReviews(),
        ])
        if (!active) {
          return
        }
        setHealth(healthResponse)
        setReviews(reviewsResponse)
      } catch {
        if (!active) {
          return
        }
        setError('Unable to reach the Tiqmo KYC backend. Start the API to unlock live metrics.')
      }
    }

    void load()

    return () => {
      active = false
    }
  }, [])

  const latestReviews = reviews.slice(0, 3)

  return (
    <div className="space-y-8">
      <section className="hero-shell surface-card grid gap-8 overflow-hidden px-6 py-8 sm:px-8 lg:grid-cols-[1.15fr_0.85fr] lg:px-10 lg:py-12">
        <div className="relative z-10">
          <span className="eyebrow">Saudi fintech operations intelligence</span>
          <h2 className="mt-6 max-w-3xl text-5xl font-semibold tracking-[-0.05em] text-slate-950 sm:text-6xl">
            Build trust at the first touchpoint with a{' '}
            <span className="gradient-wordmark">decision-grade KYC command center.</span>
          </h2>
          <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-600">
            Tiqmo Intelligence Layer brings together deterministic policy checks, live review
            history, and analyst-ready explanations in a single Stripe-inspired operating surface.
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Link
              to="/review"
              className="inline-flex items-center gap-2 rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-slate-900/20 transition hover:translate-y-[-1px]"
            >
              Review a customer
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              to="/history"
              className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/90 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:text-slate-950"
            >
              Explore decision history
            </Link>
          </div>

          <div className="mt-10 grid gap-4 sm:grid-cols-3">
            <div className="rounded-3xl border border-white/70 bg-white/85 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">
                Review date
              </p>
              <p className="mt-2 text-lg font-semibold text-slate-950">18 Jun 2026</p>
            </div>
            <div className="rounded-3xl border border-white/70 bg-white/85 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">
                Engine mode
              </p>
              <p className="mt-2 text-lg font-semibold text-slate-950">Deterministic + Groq QA</p>
            </div>
            <div className="rounded-3xl border border-white/70 bg-white/85 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">
                Data source
              </p>
              <p className="mt-2 text-lg font-semibold text-slate-950">Local KYC corpus</p>
            </div>
          </div>
        </div>

        <div className="stripe-panel relative z-10 p-6 sm:p-7">
          <div className="flex items-center justify-between gap-3 text-sm text-slate-300">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.26em] text-sky-200/70">
                Live system posture
              </p>
              <h3 className="mt-2 text-2xl font-semibold text-white">Tiqmo KYC runtime</h3>
            </div>
            <span className="rounded-full border border-sky-400/30 bg-sky-400/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-sky-200">
              {health?.status === 'ok' ? 'Online' : 'Waiting'}
            </span>
          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <div className="rounded-3xl border border-white/10 bg-white/5 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">
                API surface
              </p>
              <p className="mt-3 text-3xl font-semibold text-white">
                {health?.service ? 'Ready' : 'Offline'}
              </p>
              <p className="mt-2 text-sm leading-6 text-slate-300/90">
                Health, review execution, and review history endpoints are exposed to the UI.
              </p>
            </div>
            <div className="rounded-3xl border border-white/10 bg-white/5 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">
                Recent volume
              </p>
              <p className="mt-3 text-3xl font-semibold text-white">{reviews.length}</p>
              <p className="mt-2 text-sm leading-6 text-slate-300/90">
                Persisted KYC reviews available for analyst follow-up and audit trail inspection.
              </p>
            </div>
          </div>

          <div className="mt-6 rounded-[28px] border border-white/10 bg-slate-900/70 p-4">
            <div className="mb-4 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">
              <span className="status-dot bg-emerald-400" />
              Recent decision feed
            </div>
            <div className="space-y-3">
              {latestReviews.length > 0 ? (
                latestReviews.map((review) => (
                  <div
                    key={review.id}
                    className="flex items-center justify-between rounded-2xl border border-white/8 bg-white/5 px-4 py-3"
                  >
                    <div>
                      <p className="text-sm font-semibold text-white">{review.full_name}</p>
                      <p className="mt-1 text-xs text-slate-400">{review.customer_id}</p>
                    </div>
                    <p className="text-xs font-semibold uppercase tracking-[0.22em] text-sky-200">
                      {review.decision.replace('_', ' ')}
                    </p>
                  </div>
                ))
              ) : (
                <p className="rounded-2xl border border-dashed border-white/12 px-4 py-6 text-sm text-slate-400">
                  No reviews yet. Trigger the first KYC decision to populate this feed.
                </p>
              )}
            </div>
          </div>
        </div>
      </section>

      {error ? (
        <div className="rounded-[28px] border border-amber-300/70 bg-amber-50 px-6 py-4 text-sm text-amber-800">
          {error}
        </div>
      ) : null}

      <section className="grid gap-4 lg:grid-cols-4">
        <KpiCard
          label="Decision volume"
          value={String(reviews.length)}
          detail="Persisted review records available to the frontend right now."
          accent={<Activity className="h-5 w-5 text-indigo-500" />}
        />
        <KpiCard
          label="Approval rate"
          value={computeApprovalRate(reviews)}
          detail="Share of executed KYC reviews that cleared without manual intervention."
          accent={<BadgeCheck className="h-5 w-5 text-emerald-500" />}
        />
        <KpiCard
          label="Average risk"
          value={computeAverageRisk(reviews)}
          detail="Mean risk score across the current review history feed."
          accent={<ChartNoAxesCombined className="h-5 w-5 text-sky-500" />}
        />
        <KpiCard
          label="Runtime status"
          value={health?.status === 'ok' ? 'Healthy' : 'Pending'}
          detail="Backend liveness and API availability for the KYC review workspace."
          accent={<Shield className="h-5 w-5 text-cyan-500" />}
        />
      </section>

      <section className="grid gap-5 lg:grid-cols-3">
        <div className="surface-card p-6">
          <div className="mb-5 flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-950 text-white">
              <Shield className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">
                Deterministic policy
              </p>
              <h3 className="text-xl font-semibold text-slate-950">Rule-first risk scoring</h3>
            </div>
          </div>
          <p className="text-sm leading-7 text-slate-600">
            Missing fields, expired credentials, sanctions exposure, PEP status, and watchlist
            hits all feed the returned score before any model-assisted QA layer is considered.
          </p>
        </div>

        <div className="surface-card p-6">
          <div className="mb-5 flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-950 text-white">
              <Zap className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">
                Analyst throughput
              </p>
              <h3 className="text-xl font-semibold text-slate-950">Fast triage workspace</h3>
            </div>
          </div>
          <p className="text-sm leading-7 text-slate-600">
            Operators can launch a fresh KYC review from sample customer IDs, inspect the exact
            reasoning returned by the backend, and move immediately into manual follow-up.
          </p>
        </div>

        <div className="surface-card p-6">
          <div className="mb-5 flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-950 text-white">
              <ChartNoAxesCombined className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">
                Audit confidence
              </p>
              <h3 className="text-xl font-semibold text-slate-950">Persisted review trail</h3>
            </div>
          </div>
          <p className="text-sm leading-7 text-slate-600">
            Every executed decision lands in the database and becomes immediately visible in the
            history analytics view for replay, inspection, and reporting.
          </p>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <div className="surface-card p-6">
          <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">
                Recent analyst activity
              </p>
              <h3 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">
                Decision timeline
              </h3>
            </div>
            <Link
              to="/history"
              className="inline-flex items-center gap-2 text-sm font-semibold text-indigo-600"
            >
              View full history
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          <ReviewTimeline
            reviews={latestReviews}
            emptyLabel="Run a KYC review to populate the recent activity timeline."
          />
        </div>

        <div className="stripe-panel p-6">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-sky-200/70">
            Operator guidance
          </p>
          <h3 className="mt-3 text-3xl font-semibold tracking-tight text-white">
            Best used as a live review cockpit.
          </h3>
          <div className="mt-6 space-y-4 text-sm leading-7 text-slate-300">
            <p>
              Start with the review workspace, trigger a known sample ID, then validate that the
              reasoning and missing documents line up with the policy outcome you expect.
            </p>
            <p>
              Once you like the flow, move to the history tab to verify that each decision is
              persisting and that the analytics visualizations match the audit trail.
            </p>
          </div>

          <div className="mt-8 rounded-[28px] border border-white/10 bg-white/5 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">
              Suggested smoke tests
            </p>
            <ul className="mt-4 space-y-3 text-sm text-slate-200">
              <li>`cust-1001` should approve cleanly.</li>
              <li>`cust-1003` should require review due to sanctions/PEP exposure.</li>
              <li>`cust-1004` should reject on watchlist match.</li>
            </ul>
          </div>
        </div>
      </section>
    </div>
  )
}
