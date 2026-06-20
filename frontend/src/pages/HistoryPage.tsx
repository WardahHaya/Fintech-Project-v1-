import { useDeferredValue, useEffect, useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

import { DecisionBadge } from '../components/DecisionBadge'
import { ReviewTimeline } from '../components/ReviewTimeline'
import { fetchKycReviews } from '../lib/api'
import type { AppShellContext, KycReviewRecord } from '../types'

const decisionColors = {
  APPROVED: '#0f8f77',
  REVIEW_REQUIRED: '#d39c3f',
  REJECTED: '#d15a5a',
} as const

function formatTimestamp(value: string) {
  return new Intl.DateTimeFormat('en-GB', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value))
}

export function HistoryPage() {
  const [reviews, setReviews] = useState<KycReviewRecord[]>([])
  const [search, setSearch] = useState('')
  const [error, setError] = useState('')
  const deferredSearch = useDeferredValue(search)
  const { role, setRole } = useOutletContext<AppShellContext>()

  useEffect(() => {
    let active = true

    async function load() {
      try {
        const response = await fetchKycReviews()
        if (!active) {
          return
        }
        setReviews(response)
      } catch {
        if (!active) {
          return
        }
        setError('Audit history could not be loaded from the backend.')
      }
    }

    void load()

    return () => {
      active = false
    }
  }, [])

  const filteredReviews = reviews.filter((review) => {
    const query = deferredSearch.trim().toLowerCase()
    if (!query) {
      return true
    }
    return (
      review.customer_id.toLowerCase().includes(query) ||
      review.full_name.toLowerCase().includes(query) ||
      review.decision.toLowerCase().includes(query)
    )
  })

  const decisionCounts = (['APPROVED', 'REVIEW_REQUIRED', 'REJECTED'] as const).map((decision) => ({
    name: decision.replace('_', ' '),
    value: filteredReviews.filter((review) => review.decision === decision).length,
    color: decisionColors[decision],
  }))

  const recentRiskTrend = filteredReviews
    .slice()
    .reverse()
    .slice(-8)
    .map((review) => ({
      customer: review.customer_id,
      risk: review.risk_score,
      confidence: Math.round(review.confidence_score * 100),
    }))

  const missingDocumentData = filteredReviews.map((review) => ({
    customer: review.customer_id,
    missing: review.missing_documents.length,
  }))

  if (role === 'user') {
    return (
      <div className="space-y-6">
        <section className="surface-card px-6 py-8 sm:px-8">
          <span className="eyebrow">User access</span>
          <h2 className="mt-5 text-4xl font-semibold tracking-[-0.04em] text-slate-950">
            Internal audit analytics stay inside the admin lane.
          </h2>
          <p className="mt-4 max-w-3xl text-sm leading-7 text-slate-600">
            Customer mode keeps the story simple: status, confidence, and timing. Deep reasoning,
            queue analytics, and internal review history are reserved for operations teams.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <button type="button" onClick={() => setRole('admin')} className="action-primary">
              Switch to admin access
            </button>
          </div>
        </section>

        <section className="surface-card p-6">
          <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-400">
            Customer-safe status feed
          </p>
          <h3 className="mt-2 text-2xl font-semibold text-slate-950">Recent onboarding outcomes</h3>
          <div className="mt-6 space-y-3">
            {filteredReviews.slice(0, 8).map((review) => (
              <div
                key={review.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-[24px] border border-teal-900/10 bg-white/85 px-4 py-4"
              >
                <div>
                  <p className="text-sm font-semibold text-slate-950">{review.full_name}</p>
                  <p className="mt-1 text-[11px] uppercase tracking-[0.22em] text-slate-400">
                    {review.customer_id}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <DecisionBadge decision={review.decision} />
                  <span className="text-sm text-slate-500">{formatTimestamp(review.reviewed_at)}</span>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <section className="surface-card px-6 py-8 sm:px-8">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <span className="eyebrow">Admin audit trail</span>
            <h2 className="mt-5 text-4xl font-semibold tracking-[-0.04em] text-slate-950">
              Internal decision history, queue pressure, and screening patterns.
            </h2>
            <p className="mt-4 max-w-3xl text-sm leading-7 text-slate-600">
              This view is intentionally operator-facing: it keeps the analytics, reasoning, and
              documentation gaps visible for the compliance desk without leaking that language into
              the customer journey.
            </p>
          </div>

          <label className="block min-w-[280px]">
            <span className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-400">
              Filter reviews
            </span>
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search by name, ID, or decision"
              className="w-full rounded-[20px] border border-teal-900/10 bg-white px-4 py-3 text-sm text-slate-950 outline-none transition focus:border-teal-700"
            />
          </label>
        </div>

        {error ? (
          <div className="mt-6 rounded-2xl border border-rose-300/70 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {error}
          </div>
        ) : null}
      </section>

      <section className="grid gap-5 xl:grid-cols-[1.15fr_0.85fr]">
        <div className="surface-card p-6">
          <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-400">
            Risk trajectory
          </p>
          <h3 className="mt-2 text-2xl font-semibold text-slate-950">Latest screening movement</h3>
          <div className="mt-6 h-80">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={recentRiskTrend}>
                <defs>
                  <linearGradient id="riskFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0f8f77" stopOpacity={0.36} />
                    <stop offset="95%" stopColor="#0f8f77" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#d7dfda" />
                <XAxis dataKey="customer" tick={{ fill: '#64748b', fontSize: 12 }} />
                <YAxis tick={{ fill: '#64748b', fontSize: 12 }} />
                <Tooltip />
                <Area dataKey="risk" stroke="#0f8f77" fillOpacity={1} fill="url(#riskFill)" strokeWidth={3} />
                <Area dataKey="confidence" stroke="#b07d2f" fillOpacity={0} strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="surface-card p-6">
          <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-400">
            Portfolio mix
          </p>
          <h3 className="mt-2 text-2xl font-semibold text-slate-950">Decision distribution</h3>
          <div className="mt-6 h-80">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={decisionCounts}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={70}
                  outerRadius={110}
                  paddingAngle={4}
                >
                  {decisionCounts.map((entry) => (
                    <Cell key={entry.name} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            {decisionCounts.map((entry) => (
              <div key={entry.name} className="rounded-2xl border border-teal-900/10 bg-stone-100/70 px-4 py-3">
                <div className="mb-2 flex items-center gap-2">
                  <span className="status-dot" style={{ backgroundColor: entry.color }} />
                  <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">
                    {entry.name}
                  </p>
                </div>
                <p className="text-2xl font-semibold text-slate-950">{entry.value}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="surface-card p-6">
        <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-400">
          Documentation pressure
        </p>
        <h3 className="mt-2 text-2xl font-semibold text-slate-950">Missing document count by record</h3>
        <div className="mt-6 h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={missingDocumentData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#d7dfda" />
              <XAxis dataKey="customer" tick={{ fill: '#64748b', fontSize: 12 }} />
              <YAxis tick={{ fill: '#64748b', fontSize: 12 }} allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="missing" radius={[10, 10, 0, 0]} fill="#123844" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>

      <section className="surface-card p-6">
        <div className="mb-6">
          <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-400">
            Full review log
          </p>
          <h3 className="mt-2 text-2xl font-semibold text-slate-950">Internal audit timeline</h3>
        </div>
        <ReviewTimeline
          reviews={filteredReviews}
          emptyLabel="No reviews match the current filter."
        />
      </section>
    </div>
  )
}
