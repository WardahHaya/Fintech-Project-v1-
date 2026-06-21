import {
  ArrowRight,
  BriefcaseBusiness,
  Landmark,
  ShieldCheck,
  Store,
  UsersRound,
} from 'lucide-react'
import { motion } from 'framer-motion'
import { useEffect, useState } from 'react'
import { useNavigate, useOutletContext } from 'react-router-dom'

import { fetchComplianceHistory, fetchHealth, fetchKycReviews, fetchMerchantReviews } from '../lib/api'
import type {
  AgentKey,
  AppShellContext,
  ComplianceQueryRecord,
  HealthResponse,
  KycReviewRecord,
  MerchantReviewRecord,
} from '../types'


function computeApprovalRate(reviews: KycReviewRecord[] | MerchantReviewRecord[]) {
  if (reviews.length === 0) {
    return '0%'
  }

  const approved = reviews.filter((review) => review.decision === 'APPROVED').length
  return `${Math.round((approved / reviews.length) * 100)}%`
}


function formatTimestamp(value: string | null) {
  if (!value) {
    return 'No activity yet'
  }

  return new Intl.DateTimeFormat('en-GB', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value))
}


function useCountUp(target: number, duration = 1600) {
  const [value, setValue] = useState(0)

  useEffect(() => {
    let frameId = 0
    const start = performance.now()

    function tick(now: number) {
      const progress = Math.min((now - start) / duration, 1)
      const eased = 1 - (1 - progress) * (1 - progress)
      setValue(Math.round(target * eased))
      if (progress < 1) {
        frameId = window.requestAnimationFrame(tick)
      }
    }

    frameId = window.requestAnimationFrame(tick)
    return () => {
      window.cancelAnimationFrame(frameId)
    }
  }, [duration, target])

  return value
}


export function HomePage() {
  const [health, setHealth] = useState<HealthResponse | null>(null)
  const [kycReviews, setKycReviews] = useState<KycReviewRecord[]>([])
  const [complianceHistory, setComplianceHistory] = useState<ComplianceQueryRecord[]>([])
  const [merchantReviews, setMerchantReviews] = useState<MerchantReviewRecord[]>([])
  const [error, setError] = useState('')
  const { role, fullName } = useOutletContext<AppShellContext>()
  const navigate = useNavigate()

  const kycReduction = useCountUp(97)
  const fasterProcessing = useCountUp(83)
  const complianceLow = useCountUp(42)
  const complianceHigh = useCountUp(68)

  useEffect(() => {
    let active = true

    async function load() {
      try {
        const [healthResponse, kycResponse, complianceResponse, merchantResponse] = await Promise.all([
          fetchHealth(),
          fetchKycReviews(),
          fetchComplianceHistory(),
          fetchMerchantReviews(),
        ])
        if (!active) {
          return
        }

        setHealth(healthResponse)
        setKycReviews(kycResponse)
        setComplianceHistory(complianceResponse)
        setMerchantReviews(merchantResponse)
      } catch {
        if (!active) {
          return
        }
        setError('Some live metrics could not be loaded. The workspace is still available.')
      }
    }

    void load()

    return () => {
      active = false
    }
  }, [])

  const latestKycTime = kycReviews[0]?.reviewed_at ?? null
  const latestComplianceTime = complianceHistory[0]?.queried_at ?? null
  const latestMerchantTime = merchantReviews[0]?.reviewed_at ?? null
  const kycApprovalRate = computeApprovalRate(kycReviews)
  const merchantApprovalRate = computeApprovalRate(merchantReviews)
  const complianceGroundedRate =
    complianceHistory.length === 0
      ? '0%'
      : `${Math.round((complianceHistory.filter((item) => item.has_groq).length / complianceHistory.length) * 100)}%`

  const agentCards = [
    {
      key: 'kyc' as const,
      label: 'KYC Decision Agent',
      icon: ShieldCheck,
      detail: 'Customer profile screening, risk checks, and explainable decisions.',
      countLabel: 'Reviews run',
      countValue: String(kycReviews.length),
      metricLabel: 'Approval rate',
      metricValue: kycApprovalRate,
      timestamp: latestKycTime,
    },
    {
      key: 'compliance' as const,
      label: 'SAMA Compliance RAG Agent',
      icon: Landmark,
      detail: 'Grounded regulatory answers with article-level source context.',
      countLabel: 'Queries logged',
      countValue: String(complianceHistory.length),
      metricLabel: 'Groq-assisted',
      metricValue: complianceGroundedRate,
      timestamp: latestComplianceTime,
    },
    {
      key: 'merchant' as const,
      label: 'Merchant Onboarding Agent',
      icon: Store,
      detail: 'Merchant risk scoring, document checks, and onboarding outcomes.',
      countLabel: 'Reviews run',
      countValue: String(merchantReviews.length),
      metricLabel: 'Approval rate',
      metricValue: merchantApprovalRate,
      timestamp: latestMerchantTime,
    },
  ]

  function openReview(agent: AgentKey) {
    navigate(`/review?agent=${agent}`)
  }

  return (
    <div className="space-y-6">
      <motion.section
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05, duration: 0.28 }}
        className="surface-card overflow-hidden px-6 py-6 sm:px-8"
      >
        <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <span className="eyebrow">Benchmark banner</span>
            <h2 className="mt-4 text-3xl font-semibold tracking-[-0.04em] text-navy">
              AI economics for the Tiqmo operating model.
            </h2>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-slate">
              These benchmark counters sit above the live platform telemetry below. Your real backend counts and latest activity stay intact.
            </p>
          </div>

          <div className="text-sm text-slate">
            Signed in as <span className="font-semibold text-navy">{fullName}</span> | {role ?? 'admin'}
          </div>
        </div>

        <div className="mt-8 grid gap-6 xl:grid-cols-4">
          {[
            { value: `${kycReduction}%`, label: 'KYC cost reduction' },
            { value: `${fasterProcessing}%`, label: 'Faster processing' },
            { value: `${complianceLow}-${complianceHigh}%`, label: 'Compliance savings' },
            { value: 'Days to Minutes', label: 'Merchant activation' },
          ].map((item, index) => (
            <div key={item.label} className="relative">
              {index > 0 ? <div className="absolute -left-3 top-2 hidden h-16 w-px bg-slate-200 xl:block" /> : null}
              <p className="text-4xl font-semibold tracking-[-0.05em] text-navy">{item.value}</p>
              <p className="mt-2 text-sm text-slate">{item.label}</p>
            </div>
          ))}
        </div>
      </motion.section>

      <section className="hero-shell surface-card grid gap-6 overflow-hidden px-6 py-8 sm:px-8 lg:grid-cols-[1.08fr_0.92fr]">
        <div className="relative z-10">
          <span className="eyebrow">Three-agent platform</span>
          <h2 className="mt-5 max-w-3xl text-4xl font-semibold tracking-[-0.05em] text-navy sm:text-5xl">
            One fintech control layer for KYC, SAMA guidance, and merchant onboarding.
          </h2>
          <p className="mt-4 max-w-2xl text-base leading-7 text-slate">
            Real authentication is now active across the platform. This workspace is reserved for Tiqmo administrators managing the full operations stack.
          </p>

          <div className="mt-7 flex flex-wrap gap-3">
            <button type="button" onClick={() => openReview('kyc')} className="action-primary">
              Open review workspace
              <ArrowRight className="h-4 w-4" />
            </button>
            <button type="button" onClick={() => navigate('/staff')} className="action-secondary">
              Open staff console
              <UsersRound className="h-4 w-4" />
            </button>
          </div>

          <div className="mt-8 flex flex-wrap gap-3 text-sm">
            <div className="rounded-full border border-primary/10 bg-primary/5 px-4 py-2 text-slate">
              Access: <span className="font-semibold text-navy">Admin</span>
            </div>
            <div className="rounded-full border border-primary/10 bg-primary/5 px-4 py-2 text-slate">
              API: <span className="font-semibold text-navy">{health?.status === 'ok' ? 'Healthy' : 'Checking'}</span>
            </div>
          </div>
        </div>

        <div className="signal-panel relative z-10 p-6">
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border border-white/10 bg-white/8 p-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-white/60">
                KYC
              </p>
              <p className="mt-2 text-3xl font-semibold text-white">{kycReviews.length}</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/8 p-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-white/60">
                Compliance
              </p>
              <p className="mt-2 text-3xl font-semibold text-white">{complianceHistory.length}</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/8 p-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-white/60">
                Merchant
              </p>
              <p className="mt-2 text-3xl font-semibold text-white">{merchantReviews.length}</p>
            </div>
          </div>

          <div className="mt-5 rounded-2xl border border-white/10 bg-white/6 p-4">
            <div className="mb-3 flex items-center justify-between gap-3">
              <p className="text-sm font-semibold text-white">Current workspace status</p>
              <span className="text-xs uppercase tracking-[0.22em] text-white/70">
                Operations
              </span>
            </div>
            <p className="text-sm leading-7 text-white/72">
              You can access all agent workflows, audit history, and administrative account controls from one console.
            </p>
          </div>
        </div>
      </section>

      {error ? (
        <div className="rounded-2xl border border-warning/20 bg-warning/5 px-5 py-3 text-sm text-warning">
          {error}
        </div>
      ) : null}

      <section className="grid gap-5 xl:grid-cols-3">
        {agentCards.map((agent) => {
          const Icon = agent.icon

          return (
            <article key={agent.key} className="surface-card p-6">
              <div className="flex items-start justify-between gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                  <Icon className="h-5 w-5" />
                </div>
                <span className="rounded-full border border-primary/10 bg-primary/5 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.2em] text-primary">
                  {agent.key}
                </span>
              </div>

              <h3 className="mt-5 text-2xl font-semibold text-navy">{agent.label}</h3>
              <p className="mt-3 text-sm leading-7 text-slate">{agent.detail}</p>

              <div className="mt-5 grid grid-cols-2 gap-3">
                <div className="metric-chip">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate">
                    {agent.countLabel}
                  </p>
                  <p className="mt-2 text-2xl font-semibold text-navy">{agent.countValue}</p>
                </div>
                <div className="metric-chip">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate">
                    {agent.metricLabel}
                  </p>
                  <p className="mt-2 text-2xl font-semibold text-navy">{agent.metricValue}</p>
                </div>
              </div>

              <p className="mt-4 text-sm text-slate">Latest activity: {formatTimestamp(agent.timestamp)}</p>

              <div className="mt-5 flex flex-wrap gap-3">
                <button type="button" onClick={() => openReview(agent.key)} className="action-primary">
                  Open workspace
                  <ArrowRight className="h-4 w-4" />
                </button>
                <button type="button" onClick={() => navigate(`/history?agent=${agent.key}`)} className="action-secondary">
                  View history
                </button>
              </div>
            </article>
          )
        })}
      </section>

      <section className="grid gap-5 lg:grid-cols-2">
        <div className="surface-card p-6">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <BriefcaseBusiness className="h-5 w-5" />
            </div>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate">
                Your access lane
              </p>
              <h3 className="text-2xl font-semibold text-navy">Admin operations access</h3>
            </div>
          </div>
          <p className="mt-4 text-sm leading-7 text-slate">
            You can run live agent reviews, inspect audit history, and manage administrative access without switching interfaces.
          </p>
        </div>

        <div className="surface-card p-6">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-accent/10 text-accent">
              <Store className="h-5 w-5" />
            </div>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate">
                Live backend status
              </p>
              <h3 className="text-2xl font-semibold text-navy">The real counts remain visible.</h3>
            </div>
          </div>
          <p className="mt-4 text-sm leading-7 text-slate">
            The benchmark banner above adds product storytelling, while the cards and activity feeds here still reflect real requests stored by the backend.
          </p>
        </div>
      </section>
    </div>
  )
}
