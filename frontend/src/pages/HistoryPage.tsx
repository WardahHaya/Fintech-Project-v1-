import { useDeferredValue, useEffect, useState } from 'react'
import { useOutletContext, useSearchParams } from 'react-router-dom'

import { DecisionBadge } from '../components/DecisionBadge'
import { fetchComplianceHistory, fetchKycReviews, fetchMerchantReviews } from '../lib/api'
import type {
  AgentKey,
  AppShellContext,
  ComplianceQueryRecord,
  KycReviewRecord,
  MerchantReviewRecord,
} from '../types'


function formatTimestamp(value: string) {
  return new Intl.DateTimeFormat('en-GB', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value))
}


function normalizeAgent(rawValue: string | null): AgentKey {
  if (rawValue === 'compliance' || rawValue === 'merchant') {
    return rawValue
  }
  return 'kyc'
}


function approvalRate(reviews: KycReviewRecord[] | MerchantReviewRecord[]) {
  if (reviews.length === 0) {
    return '0%'
  }
  const approved = reviews.filter((review) => review.decision === 'APPROVED').length
  return `${Math.round((approved / reviews.length) * 100)}%`
}


export function HistoryPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const agent = normalizeAgent(searchParams.get('agent'))
  const [kycReviews, setKycReviews] = useState<KycReviewRecord[]>([])
  const [merchantReviews, setMerchantReviews] = useState<MerchantReviewRecord[]>([])
  const [complianceHistory, setComplianceHistory] = useState<ComplianceQueryRecord[]>([])
  const [search, setSearch] = useState('')
  const [error, setError] = useState('')
  const deferredSearch = useDeferredValue(search)
  useOutletContext<AppShellContext>()

  useEffect(() => {
    let active = true

    async function load() {
      try {
        const [kycResponse, merchantResponse, complianceResponse] = await Promise.all([
          fetchKycReviews(),
          fetchMerchantReviews(),
          fetchComplianceHistory(),
        ])
        if (!active) {
          return
        }

        setKycReviews(kycResponse)
        setMerchantReviews(merchantResponse)
        setComplianceHistory(complianceResponse)
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

  function changeAgent(nextAgent: AgentKey) {
    const nextParams = new URLSearchParams(searchParams)
    nextParams.set('agent', nextAgent)
    setSearchParams(nextParams)
  }

  const query = deferredSearch.trim().toLowerCase()

  const filteredKyc = kycReviews.filter((review) => {
    if (!query) {
      return true
    }
    return (
      review.customer_id.toLowerCase().includes(query)
      || review.full_name.toLowerCase().includes(query)
      || review.decision.toLowerCase().includes(query)
    )
  })

  const filteredMerchant = merchantReviews.filter((review) => {
    if (!query) {
      return true
    }
    return (
      review.merchant_id.toLowerCase().includes(query)
      || review.business_name.toLowerCase().includes(query)
      || review.decision.toLowerCase().includes(query)
    )
  })

  const filteredCompliance = complianceHistory.filter((record) => {
    if (!query) {
      return true
    }
    return (
      record.query_text.toLowerCase().includes(query)
      || record.answer.toLowerCase().includes(query)
      || record.source_chunk_ids.join(' ').toLowerCase().includes(query)
    )
  })

  const kycFlagged = filteredKyc.filter((review) => review.decision !== 'APPROVED').length
  const merchantFlagged = filteredMerchant.filter((review) => review.decision !== 'APPROVED').length
  const complianceGroq = filteredCompliance.filter((record) => record.has_groq).length

  return (
    <div className="space-y-6">
      <section className="surface-card px-6 py-8 sm:px-8">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <span className="eyebrow">Admin history</span>
            <h2 className="mt-5 text-4xl font-semibold tracking-[-0.04em] text-navy">
              Unified audit trail across KYC, compliance, and merchant onboarding.
            </h2>
            <p className="mt-4 max-w-3xl text-sm leading-7 text-slate">
              Switch the agent lane, filter the records, and inspect only the details that matter.
            </p>
          </div>

          <label className="block min-w-[280px]">
            <span className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.24em] text-slate">
              Filter records
            </span>
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search by ID, decision, question, or business name"
              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-navy outline-none transition focus:border-primary"
            />
          </label>
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          {(['kyc', 'compliance', 'merchant'] as AgentKey[]).map((agentKey) => (
            <button
              key={agentKey}
              type="button"
              onClick={() => changeAgent(agentKey)}
              className={['nav-pill', agentKey === agent ? 'is-active' : ''].join(' ')}
            >
              {agentKey}
            </button>
          ))}
        </div>

        {error ? (
          <div className="mt-6 rounded-2xl border border-danger/15 bg-danger/5 px-4 py-3 text-sm text-danger">
            {error}
          </div>
        ) : null}
      </section>

      {agent === 'kyc' ? (
        <>
          <section className="grid gap-5 md:grid-cols-3">
            <div className="metric-chip">
              <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate">Total reviews</p>
              <p className="mt-2 text-3xl font-semibold text-navy">{filteredKyc.length}</p>
            </div>
            <div className="metric-chip">
              <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate">Approval rate</p>
              <p className="mt-2 text-3xl font-semibold text-navy">{approvalRate(filteredKyc)}</p>
            </div>
            <div className="metric-chip">
              <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate">Flagged</p>
              <p className="mt-2 text-3xl font-semibold text-navy">{kycFlagged}</p>
            </div>
          </section>

          <section className="space-y-3">
            {filteredKyc.map((review) => (
              <article key={review.id} className="surface-card p-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-navy">{review.full_name}</p>
                    <p className="mt-1 text-[11px] uppercase tracking-[0.22em] text-slate">{review.customer_id}</p>
                  </div>
                  <DecisionBadge decision={review.decision} />
                </div>
                <div className="mt-4 flex flex-wrap gap-4 text-sm text-slate">
                  <span>Risk {review.risk_score}/100</span>
                  <span>Confidence {Math.round(review.confidence_score * 100)}%</span>
                  <span>{formatTimestamp(review.reviewed_at)}</span>
                </div>
                <p className="mt-4 text-sm leading-7 text-slate">{review.reasoning[0]}</p>
              </article>
            ))}
          </section>
        </>
      ) : null}

      {agent === 'merchant' ? (
        <>
          <section className="grid gap-5 md:grid-cols-3">
            <div className="metric-chip">
              <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate">Total reviews</p>
              <p className="mt-2 text-3xl font-semibold text-navy">{filteredMerchant.length}</p>
            </div>
            <div className="metric-chip">
              <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate">Approval rate</p>
              <p className="mt-2 text-3xl font-semibold text-navy">{approvalRate(filteredMerchant)}</p>
            </div>
            <div className="metric-chip">
              <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate">Flagged</p>
              <p className="mt-2 text-3xl font-semibold text-navy">{merchantFlagged}</p>
            </div>
          </section>

          <section className="space-y-3">
            {filteredMerchant.map((review) => (
              <article key={review.id} className="surface-card p-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-navy">{review.business_name}</p>
                    <p className="mt-1 text-[11px] uppercase tracking-[0.22em] text-slate">{review.merchant_id}</p>
                  </div>
                  <DecisionBadge decision={review.decision} />
                </div>
                <div className="mt-4 flex flex-wrap gap-4 text-sm text-slate">
                  <span>Risk {review.risk_score}/100</span>
                  <span>Confidence {Math.round(review.confidence_score * 100)}%</span>
                  <span>{formatTimestamp(review.reviewed_at)}</span>
                </div>
                <p className="mt-4 text-sm leading-7 text-slate">{review.reasoning[0]}</p>
              </article>
            ))}
          </section>
        </>
      ) : null}

      {agent === 'compliance' ? (
        <>
          <section className="grid gap-5 md:grid-cols-3">
            <div className="metric-chip">
              <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate">Total queries</p>
              <p className="mt-2 text-3xl font-semibold text-navy">{filteredCompliance.length}</p>
            </div>
            <div className="metric-chip">
              <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate">Groq assisted</p>
              <p className="mt-2 text-3xl font-semibold text-navy">{complianceGroq}</p>
            </div>
            <div className="metric-chip">
              <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate">Cited answers</p>
              <p className="mt-2 text-3xl font-semibold text-navy">
                {filteredCompliance.filter((record) => record.source_chunk_ids.length > 0).length}
              </p>
            </div>
          </section>

          <section className="space-y-3">
            {filteredCompliance.map((record) => (
              <article key={record.id} className="surface-card p-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-navy">{record.query_text}</p>
                    <p className="mt-1 text-[11px] uppercase tracking-[0.22em] text-slate">
                      {record.has_groq ? 'Groq assisted' : 'Corpus fallback'}
                    </p>
                  </div>
                  <span className="rounded-full border border-primary/10 bg-primary/5 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">
                    {formatTimestamp(record.queried_at)}
                  </span>
                </div>
                <p className="mt-4 text-sm leading-7 text-slate">{record.answer}</p>
                <p className="mt-4 text-xs uppercase tracking-[0.18em] text-slate">
                  Sources: {record.source_chunk_ids.join(', ') || 'None'}
                </p>
              </article>
            ))}
          </section>
        </>
      ) : null}
    </div>
  )
}
