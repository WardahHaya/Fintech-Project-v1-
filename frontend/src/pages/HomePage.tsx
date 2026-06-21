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

import { DashboardCharts } from '../components/DashboardCharts'
import { useLanguage } from '../i18n/useLanguage'
import {
  fetchComplianceHistory,
  fetchHealth,
  fetchKycReviews,
  fetchMerchantReviews,
} from '../lib/api'
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
  const { isArabic, locale } = useLanguage()
  const navigate = useNavigate()
  const localizedRole = role === 'admin' || !role ? (isArabic ? 'إداري' : 'Admin') : role

  const kycReduction = useCountUp(97)
  const fasterProcessing = useCountUp(83)
  const complianceLow = useCountUp(42)
  const complianceHigh = useCountUp(68)

  useEffect(() => {
    let active = true

    async function load() {
      try {
        const [healthResponse, kycResponse, complianceResponse, merchantResponse] =
          await Promise.all([
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
        setError(
          isArabic
            ? 'تعذر تحميل بعض المؤشرات الحية، لكن مساحة العمل ما زالت متاحة.'
            : 'Some live metrics could not be loaded. The workspace is still available.',
        )
      }
    }

    void load()

    return () => {
      active = false
    }
  }, [isArabic])

  function formatTimestamp(value: string | null) {
    if (!value) {
      return isArabic ? 'لا يوجد نشاط بعد' : 'No activity yet'
    }

    return new Intl.DateTimeFormat(locale, {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(new Date(value))
  }

  const latestKycTime = kycReviews[0]?.reviewed_at ?? null
  const latestComplianceTime = complianceHistory[0]?.queried_at ?? null
  const latestMerchantTime = merchantReviews[0]?.reviewed_at ?? null
  const kycApprovalRate = computeApprovalRate(kycReviews)
  const merchantApprovalRate = computeApprovalRate(merchantReviews)
  const complianceGroundedRate =
    complianceHistory.length === 0
      ? '0%'
      : `${Math.round(
          (complianceHistory.filter((item) => item.has_groq).length / complianceHistory.length)
            * 100,
        )}%`

  const agentCards = [
    {
      key: 'kyc' as const,
      label: isArabic ? 'وكيل قرارات اعرف عميلك' : 'KYC Decision Agent',
      icon: ShieldCheck,
      detail: isArabic
        ? 'فحص ملف العميل، التحقق من الهوية، وتفسير القرار بصورة واضحة.'
        : 'Customer profile screening, risk checks, and explainable decisions.',
      countLabel: isArabic ? 'عدد المراجعات' : 'Reviews run',
      countValue: String(kycReviews.length),
      metricLabel: isArabic ? 'نسبة القبول' : 'Approval rate',
      metricValue: kycApprovalRate,
      timestamp: latestKycTime,
    },
    {
      key: 'compliance' as const,
      label: isArabic ? 'وكيل امتثال ساما' : 'SAMA Compliance RAG Agent',
      icon: Landmark,
      detail: isArabic
        ? 'إجابات تنظيمية مؤصلة مع إسناد للمصادر والمواد ذات الصلة.'
        : 'Grounded regulatory answers with article-level source context.',
      countLabel: isArabic ? 'عدد الاستفسارات' : 'Queries logged',
      countValue: String(complianceHistory.length),
      metricLabel: isArabic ? 'مُدعّم عبر Groq' : 'Groq-assisted',
      metricValue: complianceGroundedRate,
      timestamp: latestComplianceTime,
    },
    {
      key: 'merchant' as const,
      label: isArabic ? 'وكيل انضمام التجار' : 'Merchant Onboarding Agent',
      icon: Store,
      detail: isArabic
        ? 'تقييم مخاطر التاجر، التحقق من المستندات، وقرار الانضمام.'
        : 'Merchant risk scoring, document checks, and onboarding outcomes.',
      countLabel: isArabic ? 'عدد المراجعات' : 'Reviews run',
      countValue: String(merchantReviews.length),
      metricLabel: isArabic ? 'نسبة القبول' : 'Approval rate',
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
          <div className="text-start">
            <span className="eyebrow">
              {isArabic ? 'شريط مؤشرات مرجعية' : 'Benchmark banner'}
            </span>
            <h2 className="mt-4 text-3xl font-semibold tracking-[-0.04em] text-navy">
              {isArabic
                ? 'مؤشرات القيمة التشغيلية للذكاء الاصطناعي داخل نموذج تيقمو.'
                : 'AI economics for the Tiqmo operating model.'}
            </h2>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-slate">
              {isArabic
                ? 'مؤشرات السوق المرجعية تظهر هنا إلى جانب مؤشرات الأداء الحية الخاصة بمنصة تيقمو.'
                : 'Market benchmark indicators sit here alongside Tiqmo’s live operational signals.'}
            </p>
          </div>

          <div className="text-sm text-slate">
            {isArabic ? 'مسجل الدخول:' : 'Signed in as'}{' '}
            <span className="font-semibold text-navy">{fullName}</span>
            {' · '}
            {isArabic ? 'الدور' : 'Role'}: {localizedRole}
          </div>
        </div>

        <div className="mt-8 grid gap-6 xl:grid-cols-4">
          {[
            {
              value: `${kycReduction}%`,
              label: isArabic ? 'خفض تكلفة اعرف عميلك' : 'KYC cost reduction',
            },
            {
              value: `${fasterProcessing}%`,
              label: isArabic ? 'تسريع المعالجة' : 'Faster processing',
            },
            {
              value: `${complianceLow}-${complianceHigh}%`,
              label: isArabic ? 'توفير في الامتثال' : 'Compliance savings',
            },
            {
              value: isArabic ? 'من أيام إلى دقائق' : 'Days to Minutes',
              label: isArabic ? 'تفعيل التجار' : 'Merchant activation',
            },
          ].map((item, index) => (
            <div key={item.label} className="relative">
              {index > 0 ? (
                <div className="absolute -start-3 top-2 hidden h-16 w-px bg-slate-200 xl:block" />
              ) : null}
              <p className="text-4xl font-semibold tracking-[-0.05em] text-navy">{item.value}</p>
              <p className="mt-2 text-sm text-slate">{item.label}</p>
            </div>
          ))}
        </div>
      </motion.section>

      <section className="hero-shell surface-card grid gap-6 overflow-hidden px-6 py-8 sm:px-8 lg:grid-cols-[1.08fr_0.92fr]">
        <div className="relative z-10 text-start">
          <span className="eyebrow">
            {isArabic ? 'منصة العمليات الذكية' : 'Three-agent platform'}
          </span>
          <h2 className="mt-5 max-w-3xl text-4xl font-semibold tracking-[-0.05em] text-navy sm:text-5xl">
            {isArabic
              ? 'طبقة تشغيل واحدة لقرارات اعرف عميلك، امتثال ساما، وانضمام التجار.'
              : 'One fintech control layer for KYC, SAMA guidance, and merchant onboarding.'}
          </h2>
          <p className="mt-4 max-w-2xl text-base leading-7 text-slate">
            {isArabic
              ? 'صُممت هذه الواجهة لفرق تيقمو الإدارية والرقابية حتى تدير قرارات الهوية والامتثال وانضمام التجار من مكان واحد.'
              : 'This command center helps Tiqmo’s management, compliance, and operations teams handle identity, regulatory, and merchant decisions from one place.'}
          </p>

          <div className="mt-7 flex flex-wrap gap-3">
            <button type="button" onClick={() => openReview('kyc')} className="action-primary">
              {isArabic ? 'افتح مساحة المراجعة' : 'Open review workspace'}
              <ArrowRight className="h-4 w-4 rtl:rotate-180" />
            </button>
            <button type="button" onClick={() => navigate('/staff')} className="action-secondary">
              {isArabic ? 'إدارة الفريق' : 'Open staff console'}
              <UsersRound className="h-4 w-4" />
            </button>
          </div>

          <div className="mt-8 flex flex-wrap gap-3 text-sm">
            <div className="rounded-full border border-primary/10 bg-primary/5 px-4 py-2 text-slate">
              {isArabic ? 'الوصول:' : 'Access:'}{' '}
              <span className="font-semibold text-navy">
                {isArabic ? 'إداري' : 'Admin'}
              </span>
            </div>
            <div className="rounded-full border border-primary/10 bg-primary/5 px-4 py-2 text-slate">
              API:{' '}
              <span className="font-semibold text-navy">
                {health?.status === 'ok'
                  ? isArabic
                    ? 'جاهز'
                    : 'Healthy'
                  : isArabic
                    ? 'جار الفحص'
                    : 'Checking'}
              </span>
            </div>
          </div>
        </div>

        <div className="relative z-10">
          <div className="tiqmo-stage-card sky-card min-h-full">
            <div className="max-w-[14rem] rounded-[1.8rem] border border-sky-100 bg-white/90 p-4 shadow-[0_18px_46px_rgba(76,161,255,0.16)]">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate">
                    {isArabic ? 'العمليات اليوم' : 'Ops today'}
                  </p>
                  <p className="mt-2 text-3xl font-semibold text-navy">
                    {kycReviews.length + merchantReviews.length + complianceHistory.length}
                  </p>
                </div>
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                  <BriefcaseBusiness className="h-5 w-5" />
                </div>
              </div>
              <div className="mt-4 grid gap-3">
                <div className="rounded-2xl border border-slate-100 bg-background px-4 py-3">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate">
                    KYC
                  </p>
                  <p className="mt-1 text-lg font-semibold text-navy">{kycReviews.length}</p>
                </div>
                <div className="rounded-2xl border border-slate-100 bg-background px-4 py-3">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate">
                    SAMA
                  </p>
                  <p className="mt-1 text-lg font-semibold text-navy">{complianceHistory.length}</p>
                </div>
              </div>
            </div>

            <div className="promo-card absolute -bottom-2 end-0 w-full max-w-[20rem] rounded-[2rem] p-5 text-white md:bottom-6">
              <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-white/70">
                {isArabic ? 'المؤشر التشغيلي' : 'Operations pulse'}
              </p>
              <h3 className="mt-3 text-3xl font-semibold leading-tight">
                {isArabic ? 'امتثال أسرع. قرارات أوضح.' : 'Faster compliance. Clearer decisions.'}
              </h3>
              <p className="mt-3 text-sm leading-6 text-white/84">
                {isArabic
                  ? 'نفس بيئة العمل تربط بين المراجعة، الإسناد التنظيمي، وتتبع النتائج في مكان واحد.'
                  : 'One workspace now connects live reviews, grounded regulatory answers, and auditable outcomes.'}
              </p>
            </div>
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
                <div className="table-dot">
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

              <p className="mt-4 text-sm text-slate">
                {isArabic ? 'آخر نشاط:' : 'Latest activity:'} {formatTimestamp(agent.timestamp)}
              </p>

              <div className="mt-5 flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => openReview(agent.key)}
                  className="action-primary"
                >
                  {isArabic ? 'افتح الوكيل' : 'Open workspace'}
                  <ArrowRight className="h-4 w-4 rtl:rotate-180" />
                </button>
                <button
                  type="button"
                  onClick={() => navigate(`/history?agent=${agent.key}`)}
                  className="action-secondary"
                >
                  {isArabic ? 'عرض السجل' : 'View history'}
                </button>
              </div>
            </article>
          )
        })}
      </section>

      <DashboardCharts
        kycReviews={kycReviews}
        merchantReviews={merchantReviews}
        complianceHistory={complianceHistory}
      />

      <section className="grid gap-5 lg:grid-cols-2">
        <div className="surface-card p-6">
          <div className="flex items-center gap-3">
            <div className="table-dot">
              <BriefcaseBusiness className="h-5 w-5" />
            </div>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate">
                {isArabic ? 'مسار الوصول' : 'Your access lane'}
              </p>
              <h3 className="text-2xl font-semibold text-navy">
                {isArabic ? 'وصول الإدارة والتشغيل' : 'Admin operations access'}
              </h3>
            </div>
          </div>
          <p className="mt-4 text-sm leading-7 text-slate">
            {isArabic
              ? 'يمكنك تشغيل الوكلاء مباشرة، مراجعة السجل، وإدارة حسابات الفريق من نفس الواجهة دون التنقل بين أدوات متفرقة.'
              : 'You can run live agent reviews, inspect audit history, and manage administrative access without switching interfaces.'}
          </p>
        </div>

        <div className="surface-card p-6">
          <div className="flex items-center gap-3">
            <div className="table-dot bg-accent/10 text-accent">
              <Store className="h-5 w-5" />
            </div>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate">
                {isArabic ? 'حالة النظام الفعلية' : 'Live backend status'}
              </p>
              <h3 className="text-2xl font-semibold text-navy">
                {isArabic ? 'العدادات الحقيقية ما زالت ظاهرة.' : 'The real counts remain visible.'}
              </h3>
            </div>
          </div>
          <p className="mt-4 text-sm leading-7 text-slate">
            {isArabic
              ? 'تجتمع المؤشرات المرجعية مع النشاط التشغيلي اليومي في شاشة واحدة واضحة وسهلة القراءة.'
              : 'Strategic benchmarks and day-to-day operating activity now sit together in one clear view.'}
          </p>
        </div>
      </section>
    </div>
  )
}
