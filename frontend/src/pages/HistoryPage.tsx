import { useDeferredValue, useEffect, useState } from 'react'
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

import { ReviewTimeline } from '../components/ReviewTimeline'
import { fetchKycReviews } from '../lib/api'
import type { KycReviewRecord } from '../types'

const decisionColors = {
  APPROVED: '#10b981',
  REVIEW_REQUIRED: '#f59e0b',
  REJECTED: '#f43f5e',
} as const

export function HistoryPage() {
  const [reviews, setReviews] = useState<KycReviewRecord[]>([])
  const [search, setSearch] = useState('')
  const [error, setError] = useState('')
  const deferredSearch = useDeferredValue(search)

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
        setError('Unable to load KYC review history from the backend.')
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

  const decisionCounts = [
    'APPROVED',
    'REVIEW_REQUIRED',
    'REJECTED',
  ].map((decision) => ({
    name: decision.replace('_', ' '),
    value: filteredReviews.filter((review) => review.decision === decision).length,
    color: decisionColors[decision as keyof typeof decisionColors],
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

  return (
    <div className="space-y-6">
      <section className="surface-card px-6 py-8 sm:px-8">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <span className="eyebrow">Persisted KYC decisions</span>
            <h2 className="mt-5 text-4xl font-semibold tracking-[-0.04em] text-slate-950">
              Decision history with analyst-friendly signal density.
            </h2>
            <p className="mt-4 max-w-3xl text-sm leading-7 text-slate-600">
              This view turns the SQLite or Postgres audit trail into quick pattern recognition:
              which decisions dominate, how risk scores are trending, and where documentation gaps
              are clustering.
            </p>
          </div>

          <label className="block min-w-[280px]">
            <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">
              Filter reviews
            </span>
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search by customer, ID, or decision"
              className="w-full rounded-[20px] border border-slate-200 bg-white px-4 py-3 text-sm text-slate-950 outline-none transition focus:border-indigo-400"
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
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">
            Risk and confidence trend
          </p>
          <h3 className="mt-2 text-2xl font-semibold text-slate-950">
            Latest decision trajectory
          </h3>
          <div className="mt-6 h-80">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={recentRiskTrend}>
                <defs>
                  <linearGradient id="riskFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#06b6d4" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="customer" tick={{ fill: '#64748b', fontSize: 12 }} />
                <YAxis tick={{ fill: '#64748b', fontSize: 12 }} />
                <Tooltip />
                <Area
                  dataKey="risk"
                  stroke="#4f46e5"
                  fillOpacity={1}
                  fill="url(#riskFill)"
                  strokeWidth={3}
                />
                <Area
                  dataKey="confidence"
                  stroke="#0ea5e9"
                  fillOpacity={0}
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="surface-card p-6">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">
            Decision split
          </p>
          <h3 className="mt-2 text-2xl font-semibold text-slate-950">Portfolio mix</h3>
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
              <div key={entry.name} className="rounded-2xl bg-slate-50 px-4 py-3">
                <div className="mb-2 flex items-center gap-2">
                  <span className="status-dot" style={{ backgroundColor: entry.color }} />
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
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
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">
          Missing document pressure
        </p>
        <h3 className="mt-2 text-2xl font-semibold text-slate-950">
          Documentation gaps by review
        </h3>
        <div className="mt-6 h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={missingDocumentData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="customer" tick={{ fill: '#64748b', fontSize: 12 }} />
              <YAxis tick={{ fill: '#64748b', fontSize: 12 }} allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="missing" radius={[10, 10, 0, 0]} fill="#0f172a" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>

      <section className="surface-card p-6">
        <div className="mb-6">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">
            Full decision log
          </p>
          <h3 className="mt-2 text-2xl font-semibold text-slate-950">Analyst timeline</h3>
        </div>
        <ReviewTimeline
          reviews={filteredReviews}
          emptyLabel="No reviews match the current filter."
        />
      </section>
    </div>
  )
}
