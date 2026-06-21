import {
  FileText,
  Landmark,
  Search,
  Send,
  ShieldCheck,
  Store,
} from 'lucide-react'
import { AnimatePresence, motion } from 'framer-motion'
import { startTransition, useEffect, useRef, useState } from 'react'
import { useOutletContext, useSearchParams } from 'react-router-dom'

import { DecisionBadge } from '../components/DecisionBadge'
import { PipelineStepper } from '../components/PipelineStepper'
import { useLanguage } from '../i18n/useLanguage'
import { sampleCustomers } from '../data/sampleCustomers'
import {
  fetchComplianceHistory,
  fetchKycReviews,
  fetchMerchantReviews,
  queryCompliance,
  runKycReview,
  runMerchantReview,
} from '../lib/api'
import type {
  AgentKey,
  AppShellContext,
  ComplianceQueryRecord,
  ComplianceQueryResponse,
  KycReviewRecord,
  KycReviewResponse,
  MerchantReviewRecord,
  MerchantReviewResponse,
  ReviewDecision,
} from '../types'


const merchantSamples = [
  {
    id: 'MER-0001',
    name: 'Al Faisaliah Griffin LLC',
    highlight: 'High volume restaurant profile with valid core documentation',
  },
  {
    id: 'MER-0004',
    name: 'Swift Anderson Group',
    highlight: 'Services category that should route through an elevated review lens',
  },
  {
    id: 'MER-0005',
    name: 'Shifa Long Est.',
    highlight: 'Healthcare record with missing licensing documents and micro-transaction risk',
  },
] as const

const complianceSamples = [
  'What documents are acceptable for expatriates during KYC?',
  'What does SAMA require for selfie or liveness verification?',
  'How should customer data be protected under SAMA guidance?',
] as const

const localizedCustomerHighlights: Record<string, string> = {
  'KYC-00002': 'تفعيل محفظة قياسي دون مؤشرات مخاطرة جوهرية',
  'KYC-00011': 'درجة مطابقة الصورة الذاتية تستدعي مراجعة يدوية',
  'KYC-00005': 'عوامل العمر والجنسية توقف التفعيل',
  'KYC-00006': 'حالة عناية واجبة معززة لعبور الحدود',
  'KYC-00010': 'انتهاء صلاحية الهوية يمنع المتابعة',
}

const localizedMerchantHighlights: Record<string, string> = {
  'MER-0001': 'ملف مطعم بحجم مرتفع مع اكتمال المستندات الأساسية',
  'MER-0004': 'فئة خدمات تستلزم عدسة مراجعة أكثر تحفظًا',
  'MER-0005': 'سجل رعاية صحية مع نواقص ترخيص ومؤشر معاملات متناهية الصغر',
}

const localizedComplianceSamples: Record<(typeof complianceSamples)[number], string> = {
  'What documents are acceptable for expatriates during KYC?':
    'ما المستندات المقبولة للمقيمين أثناء اعرف عميلك؟',
  'What does SAMA require for selfie or liveness verification?':
    'ما متطلبات ساما للصورة الذاتية أو التحقق من الحيوية؟',
  'How should customer data be protected under SAMA guidance?':
    'كيف يجب حماية بيانات العملاء وفق إرشادات ساما؟',
}

const pipelineTiming: Record<AgentKey, number> = {
  kyc: 650,
  merchant: 650,
  compliance: 900,
}

function normalizeAgent(rawValue: string | null): AgentKey {
  if (rawValue === 'compliance' || rawValue === 'merchant') {
    return rawValue
  }
  return 'kyc'
}

function delay(milliseconds: number) {
  return new Promise((resolve) => {
    window.setTimeout(resolve, milliseconds)
  })
}

function glowTone(decision: ReviewDecision) {
  if (decision === 'APPROVED') {
    return 'from-success/25 via-success/10 to-transparent'
  }
  if (decision === 'REJECTED') {
    return 'from-danger/25 via-danger/10 to-transparent'
  }
  if (decision === 'ESCALATE') {
    return 'from-accent/25 via-accent/10 to-transparent'
  }
  return 'from-warning/25 via-warning/10 to-transparent'
}

export function ReviewPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const agent = normalizeAgent(searchParams.get('agent'))
  const [customerId, setCustomerId] = useState<string>(sampleCustomers[0].id)
  const [merchantId, setMerchantId] = useState<string>(merchantSamples[0].id)
  const [complianceQueryText, setComplianceQueryText] = useState<string>(complianceSamples[0])
  const [kycResult, setKycResult] = useState<KycReviewResponse | null>(null)
  const [merchantResult, setMerchantResult] = useState<MerchantReviewResponse | null>(null)
  const [complianceResult, setComplianceResult] = useState<ComplianceQueryResponse | null>(null)
  const [kycReviews, setKycReviews] = useState<KycReviewRecord[]>([])
  const [merchantReviews, setMerchantReviews] = useState<MerchantReviewRecord[]>([])
  const [complianceHistory, setComplianceHistory] = useState<ComplianceQueryRecord[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [activeStage, setActiveStage] = useState(0)
  const [showPipeline, setShowPipeline] = useState(false)
  const [error, setError] = useState('')
  const { role } = useOutletContext<AppShellContext>()
  const { isArabic } = useLanguage()
  const localizedRole = role === 'admin' || !role ? (isArabic ? 'إداري' : 'Admin') : role

  const stageTimerRef = useRef<number | null>(null)
  const stageIndexRef = useRef(0)

  const agentCopy = {
    kyc: {
      label: isArabic ? 'وكيل قرارات اعرف عميلك' : 'KYC Decision Agent',
      description: isArabic
        ? 'فحص هوية العميل وملفه ومؤشرات المخاطر.'
        : 'Customer profile and identity screening.',
      icon: ShieldCheck,
      idleTitle: isArabic ? 'ابدأ مراجعة عميل' : 'Run a customer screening',
      idleText: isArabic
        ? 'اختر سجل عميل أو أدخل المعرف ثم شغّل الوكيل لعرض القرار، الدرجة، والمستندات المطلوبة.'
        : 'Choose a KYC record and run the review to load the decision, score, and follow-up checklist.',
      inputLabel: isArabic ? 'معرّف العميل' : 'Customer ID',
      inputPlaceholder: 'KYC-00002',
      submitLabel: isArabic ? 'تشغيل مراجعة اعرف عميلك' : 'Run KYC review',
      samplesLabel: isArabic ? 'عينات العملاء' : 'Sample customers',
      decisionReady: isArabic ? 'قرار اعرف عميلك جاهز' : 'KYC decision ready',
      stages: [
        isArabic ? 'تحميل سجل العميل' : 'Loading customer record',
        isArabic ? 'تشغيل فحوصات المخاطر' : 'Running risk checks',
        isArabic ? 'المطابقة مع Groq' : 'Cross-checking with Groq',
        isArabic ? 'اعتماد القرار النهائي' : 'Finalizing decision',
      ],
    },
    compliance: {
      label: isArabic ? 'وكيل امتثال ساما' : 'SAMA Compliance RAG Agent',
      description: isArabic
        ? 'إجابة مؤصلة اعتمادًا على مواد الامتثال المخزنة.'
        : 'Grounded answers from the compliance corpus.',
      icon: Landmark,
      idleTitle: isArabic ? 'اسأل سؤال امتثال' : 'Ask a SAMA compliance question',
      idleText: isArabic
        ? 'أرسل سؤالاً من الجهة اليسرى لعرض الإجابة والمصادر النظامية المطابقة.'
        : 'Run a query from the left to load a grounded answer and the matched regulatory sources.',
      inputLabel: isArabic ? 'سؤال الامتثال' : 'Compliance question',
      inputPlaceholder: isArabic ? 'اكتب سؤال امتثال متعلق بساما' : 'Ask a SAMA compliance question',
      submitLabel: isArabic ? 'تشغيل استعلام الامتثال' : 'Run compliance query',
      samplesLabel: isArabic ? 'أسئلة جاهزة' : 'Sample questions',
      stages: [
        isArabic ? 'تضمين السؤال' : 'Embedding your question',
        isArabic ? 'البحث في لوائح ساما' : 'Searching SAMA regulations',
        isArabic ? 'توليد الإجابة' : 'Generating answer',
      ],
    },
    merchant: {
      label: isArabic ? 'وكيل انضمام التجار' : 'Merchant Onboarding Agent',
      description: isArabic
        ? 'التحقق من المستندات، حساب المخاطر، وقرار الانضمام.'
        : 'Merchant scoring, documents, and onboarding decisions.',
      icon: Store,
      idleTitle: isArabic ? 'ابدأ مراجعة تاجر' : 'Run a merchant onboarding review',
      idleText: isArabic
        ? 'اختر سجل تاجر أو أدخل المعرّف لمشاهدة قرار الانضمام، درجة المخاطر، ونواقص المستندات.'
        : 'Select a merchant record to see the onboarding outcome, risk posture, and document gaps.',
      inputLabel: isArabic ? 'معرّف التاجر' : 'Merchant ID',
      inputPlaceholder: 'MER-0005',
      submitLabel: isArabic ? 'تشغيل مراجعة التاجر' : 'Run merchant review',
      samplesLabel: isArabic ? 'عينات التجار' : 'Sample merchants',
      decisionReady: isArabic ? 'قرار التاجر جاهز' : 'Merchant decision ready',
      stages: [
        isArabic ? 'تحميل سجل التاجر' : 'Loading merchant record',
        isArabic ? 'التحقق من المستندات' : 'Validating documents',
        isArabic ? 'حساب درجة المخاطر' : 'Computing risk score',
        isArabic ? 'توليد التفسير' : 'Generating explanation',
      ],
    },
  } as const

  useEffect(() => {
    return () => {
      if (stageTimerRef.current !== null) {
        window.clearTimeout(stageTimerRef.current)
      }
    }
  }, [])

  useEffect(() => {
    let active = true

    async function loadActivity() {
      try {
        const [kycResponse, merchantResponse, complianceResponse] = await Promise.all([
          fetchKycReviews(),
          fetchMerchantReviews(),
          fetchComplianceHistory(),
        ])
        if (!active) {
          return
        }

        startTransition(() => {
          setKycReviews(kycResponse)
          setMerchantReviews(merchantResponse)
          setComplianceHistory(complianceResponse)
        })
      } catch {
        if (!active) {
          return
        }
        setError(
          isArabic ? 'تعذر تحميل النشاط الأخير.' : 'Recent activity could not be loaded.',
        )
      }
    }

    void loadActivity()

    return () => {
      active = false
    }
  }, [isArabic])

  function clearStageTimer() {
    if (stageTimerRef.current !== null) {
      window.clearTimeout(stageTimerRef.current)
      stageTimerRef.current = null
    }
  }

  function scheduleStageAdvance(activeAgent: AgentKey) {
    clearStageTimer()
    const stages = agentCopy[activeAgent].stages
    if (stageIndexRef.current >= stages.length - 1) {
      return
    }

    stageTimerRef.current = window.setTimeout(() => {
      stageIndexRef.current += 1
      setActiveStage(stageIndexRef.current)
      scheduleStageAdvance(activeAgent)
    }, pipelineTiming[activeAgent])
  }

  function startPipeline(activeAgent: AgentKey) {
    clearStageTimer()
    stageIndexRef.current = 0
    setActiveStage(0)
    setShowPipeline(true)
    scheduleStageAdvance(activeAgent)
  }

  async function fastForwardPipeline(activeAgent: AgentKey) {
    clearStageTimer()
    const lastStageIndex = agentCopy[activeAgent].stages.length - 1
    while (stageIndexRef.current < lastStageIndex) {
      await delay(120)
      stageIndexRef.current += 1
      setActiveStage(stageIndexRef.current)
    }
    await delay(180)
  }

  async function refreshActivity() {
    const [kycResponse, merchantResponse, complianceResponse] = await Promise.all([
      fetchKycReviews(),
      fetchMerchantReviews(),
      fetchComplianceHistory(),
    ])
    startTransition(() => {
      setKycReviews(kycResponse)
      setMerchantReviews(merchantResponse)
      setComplianceHistory(complianceResponse)
    })
  }

  function clearCurrentResult() {
    if (agent === 'kyc') {
      setKycResult(null)
      return
    }
    if (agent === 'merchant') {
      setMerchantResult(null)
      return
    }
    setComplianceResult(null)
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setIsSubmitting(true)
    setError('')
    clearCurrentResult()
    startPipeline(agent)

    try {
      if (agent === 'kyc') {
        const result = await runKycReview(customerId.trim())
        await fastForwardPipeline('kyc')
        setKycResult(result)
      } else if (agent === 'merchant') {
        const result = await runMerchantReview(merchantId.trim())
        await fastForwardPipeline('merchant')
        setMerchantResult(result)
      } else {
        const result = await queryCompliance(complianceQueryText.trim())
        await fastForwardPipeline('compliance')
        setComplianceResult(result)
      }

      setShowPipeline(false)
      await refreshActivity()
    } catch {
      clearStageTimer()
      setShowPipeline(false)
      setError(
        isArabic
          ? 'تعذر إكمال الطلب. تحقق من الإدخال ثم حاول مرة أخرى.'
          : 'The request could not be completed. Check the input and try again.',
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  function changeAgent(nextAgent: AgentKey) {
    const nextParams = new URLSearchParams(searchParams)
    nextParams.set('agent', nextAgent)
    setSearchParams(nextParams)
    setError('')
    setShowPipeline(false)
    clearStageTimer()
  }

  function renderSamples() {
    if (agent === 'kyc') {
      return (
        <div className="space-y-3">
          {sampleCustomers.map((customer) => (
            <button
              key={customer.id}
              type="button"
              onClick={() => setCustomerId(customer.id)}
              className={[
                'w-full rounded-2xl border px-4 py-4 text-start transition hover:-translate-y-0.5',
                customerId === customer.id
                  ? 'border-primary/25 bg-navy text-white shadow-panel'
                  : 'border-slate-200 bg-white hover:border-primary/25',
              ].join(' ')}
            >
              <p className="text-sm font-semibold">{customer.name}</p>
              <p
                className={[
                  'mt-1 text-[11px] uppercase tracking-[0.22em]',
                  customerId === customer.id ? 'text-white/70' : 'text-slate',
                ].join(' ')}
              >
                {customer.id}
              </p>
              <p
                className={[
                  'mt-2 text-sm',
                  customerId === customer.id ? 'text-white/82' : 'text-slate',
                ].join(' ')}
              >
                {isArabic ? localizedCustomerHighlights[customer.id] ?? customer.highlight : customer.highlight}
              </p>
            </button>
          ))}
        </div>
      )
    }

    if (agent === 'merchant') {
      return (
        <div className="space-y-3">
          {merchantSamples.map((merchant) => (
            <button
              key={merchant.id}
              type="button"
              onClick={() => setMerchantId(merchant.id)}
              className={[
                'w-full rounded-2xl border px-4 py-4 text-start transition hover:-translate-y-0.5',
                merchantId === merchant.id
                  ? 'border-primary/25 bg-navy text-white shadow-panel'
                  : 'border-slate-200 bg-white hover:border-primary/25',
              ].join(' ')}
            >
              <p className="text-sm font-semibold">{merchant.name}</p>
              <p
                className={[
                  'mt-1 text-[11px] uppercase tracking-[0.22em]',
                  merchantId === merchant.id ? 'text-white/70' : 'text-slate',
                ].join(' ')}
              >
                {merchant.id}
              </p>
              <p
                className={[
                  'mt-2 text-sm',
                  merchantId === merchant.id ? 'text-white/82' : 'text-slate',
                ].join(' ')}
              >
                {isArabic ? localizedMerchantHighlights[merchant.id] ?? merchant.highlight : merchant.highlight}
              </p>
            </button>
          ))}
        </div>
      )
    }

    return (
      <div className="space-y-3">
        {complianceSamples.map((query) => (
          <button
            key={query}
            type="button"
            onClick={() => setComplianceQueryText(query)}
            className={[
              'w-full rounded-2xl border px-4 py-4 text-start transition hover:-translate-y-0.5',
              complianceQueryText === query
                ? 'border-primary/25 bg-navy text-white shadow-panel'
                : 'border-slate-200 bg-white hover:border-primary/25',
            ].join(' ')}
          >
            <p className="text-sm font-semibold">
              {isArabic ? 'سؤال امتثال جاهز' : 'Sample compliance question'}
            </p>
            <p
              className={[
                'mt-2 text-sm',
                complianceQueryText === query ? 'text-white/82' : 'text-slate',
              ].join(' ')}
            >
              {isArabic ? localizedComplianceSamples[query] ?? query : query}
            </p>
          </button>
        ))}
      </div>
    )
  }

  function renderRecentActivity() {
    if (agent === 'kyc') {
      const items = kycReviews.slice(0, 4)
      return items.length > 0 ? (
        <div className="space-y-3">
          {items.map((review) => (
            <article key={review.id} className="rounded-2xl border border-slate-200 bg-white px-4 py-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-navy">{review.full_name}</p>
                  <p className="mt-1 text-[11px] uppercase tracking-[0.22em] text-slate">
                    {review.customer_id}
                  </p>
                </div>
                <DecisionBadge decision={review.decision} />
              </div>
              <p className="mt-3 text-sm text-slate">{review.reasoning[0]}</p>
            </article>
          ))}
        </div>
      ) : (
        <p className="rounded-2xl border border-dashed border-slate-200 bg-background px-4 py-8 text-sm text-slate">
          {isArabic ? 'لا توجد مراجعات KYC بعد.' : 'No KYC activity yet.'}
        </p>
      )
    }

    if (agent === 'merchant') {
      const items = merchantReviews.slice(0, 4)
      return items.length > 0 ? (
        <div className="space-y-3">
          {items.map((review) => (
            <article key={review.id} className="rounded-2xl border border-slate-200 bg-white px-4 py-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-navy">{review.business_name}</p>
                  <p className="mt-1 text-[11px] uppercase tracking-[0.22em] text-slate">
                    {review.merchant_id}
                  </p>
                </div>
                <DecisionBadge decision={review.decision} />
              </div>
              <p className="mt-3 text-sm text-slate">{review.reasoning[0]}</p>
            </article>
          ))}
        </div>
      ) : (
        <p className="rounded-2xl border border-dashed border-slate-200 bg-background px-4 py-8 text-sm text-slate">
          {isArabic ? 'لا توجد مراجعات تجار بعد.' : 'No merchant activity yet.'}
        </p>
      )
    }

    const items = complianceHistory.slice(0, 4)
    return items.length > 0 ? (
      <div className="space-y-3">
        {items.map((record) => (
          <article key={record.id} className="rounded-2xl border border-slate-200 bg-white px-4 py-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm font-semibold text-navy">{record.query_text}</p>
              <span className="rounded-full border border-primary/10 bg-primary/5 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">
                {record.has_groq
                  ? isArabic
                    ? 'Groq'
                    : 'Groq'
                  : isArabic
                    ? 'المحتوى'
                    : 'Corpus'}
              </span>
            </div>
            <p className="mt-3 text-sm text-slate">{record.answer}</p>
          </article>
        ))}
      </div>
    ) : (
      <p className="rounded-2xl border border-dashed border-slate-200 bg-background px-4 py-8 text-sm text-slate">
        {isArabic ? 'لا توجد استفسارات امتثال بعد.' : 'No compliance activity yet.'}
      </p>
    )
  }

  function renderDecisionResult(
    result: KycReviewResponse | MerchantReviewResponse,
    primaryId: string,
    primaryLabel: string,
  ) {
    return (
      <motion.div
        key={`${primaryId}-${result.decision}-${result.risk_score}`}
        initial={{ opacity: 0, scale: 0.96, y: 14 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.98, y: -8 }}
        transition={{ duration: 0.28, ease: 'easeOut' }}
        className="surface-card relative overflow-hidden p-6 sm:p-8"
      >
        <motion.div
          initial={{ opacity: 0.45, scale: 0.88 }}
          animate={{ opacity: [0.45, 0.16, 0], scale: [0.88, 1.02, 1.08] }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
          className={['pointer-events-none absolute inset-0 bg-gradient-to-br', glowTone(result.decision)].join(' ')}
        />

        <div className="relative">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate">
                {isArabic ? 'النتيجة المباشرة' : 'Live outcome'}
              </p>
              <h3 className="mt-2 text-3xl font-semibold tracking-[-0.04em] text-navy">
                {primaryLabel}
              </h3>
              <p className="mt-2 text-sm text-slate">{primaryId}</p>
            </div>
            <DecisionBadge decision={result.decision} />
          </div>

          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            <div className="metric-chip">
              <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate">
                {isArabic ? 'درجة المخاطر' : 'Risk score'}
              </p>
              <div className="mt-3 flex items-end gap-3">
                <span className="text-5xl font-semibold tracking-tight text-navy">
                  {result.risk_score}
                </span>
                <span className="pb-2 text-sm text-slate">/100</span>
              </div>
            </div>
            <div className="metric-chip">
              <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate">
                {isArabic ? 'الثقة' : 'Confidence'}
              </p>
              <div className="mt-3 flex items-end gap-3">
                <span className="text-5xl font-semibold tracking-tight text-navy">
                  {Math.round(result.confidence * 100)}
                </span>
                <span className="pb-2 text-sm text-slate">%</span>
              </div>
            </div>
          </div>

          <div className="mt-6 grid gap-4 xl:grid-cols-[1.22fr_0.9fr]">
            <div className="rounded-2xl border border-slate-200 bg-white p-5">
              <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate">
                {isArabic ? 'أسباب القرار' : 'Reasoning'}
              </p>
              <ul className="mt-4 space-y-3">
                {result.reasoning.map((reason) => (
                  <li
                    key={reason}
                    className="rounded-2xl border border-slate-200 bg-background px-4 py-3 text-sm leading-6 text-slate"
                  >
                    {reason}
                  </li>
                ))}
              </ul>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                  <FileText className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate">
                    {isArabic ? 'المستندات الناقصة' : 'Missing documents'}
                  </p>
                  <p className="text-sm text-slate">
                    {isArabic ? 'المتطلبات اللاحقة' : 'Follow-up requirements'}
                  </p>
                </div>
              </div>
              {result.missing_documents.length > 0 ? (
                <div className="mt-4 flex flex-wrap gap-2">
                  {result.missing_documents.map((document) => (
                    <span
                      key={document}
                      className="rounded-full border border-warning/20 bg-warning/8 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-warning"
                    >
                      {document.replaceAll('_', ' ')}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="mt-4 rounded-2xl border border-success/15 bg-success/5 px-4 py-3 text-sm text-success">
                  {isArabic
                    ? 'لا توجد مستندات إضافية مطلوبة حاليًا.'
                    : 'No additional documents are currently required.'}
                </p>
              )}
            </div>
          </div>
        </div>
      </motion.div>
    )
  }

  function renderComplianceResult() {
    if (!complianceResult) {
      return (
        <div className="surface-card flex h-full min-h-[28rem] items-center justify-center p-8 text-center">
          <div className="max-w-md">
            <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <Landmark className="h-6 w-6" />
            </div>
            <h3 className="text-2xl font-semibold tracking-[-0.03em] text-navy">
              {agentCopy.compliance.idleTitle}
            </h3>
            <p className="mt-3 text-sm leading-7 text-slate">
              {agentCopy.compliance.idleText}
            </p>
          </div>
        </div>
      )
    }

    return (
      <motion.div
        key={`${complianceResult.answer}-${complianceResult.sources[0]?.chunk_id ?? 'none'}`}
        initial={{ opacity: 0, scale: 0.97, y: 14 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.99, y: -8 }}
        transition={{ duration: 0.28, ease: 'easeOut' }}
        className="surface-card relative overflow-hidden p-6 sm:p-8"
      >
        <motion.div
          initial={{ opacity: 0.32, scale: 0.92 }}
          animate={{ opacity: [0.32, 0.12, 0], scale: [0.92, 1.02, 1.08] }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
          className="pointer-events-none absolute inset-0 bg-gradient-to-br from-primary/22 via-primary/8 to-transparent"
        />

        <div className="relative">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate">
                {isArabic ? 'إجابة الامتثال' : 'Compliance answer'}
              </p>
              <h3 className="mt-2 text-3xl font-semibold tracking-[-0.04em] text-navy">
                {isArabic ? 'استجابة مؤصلة بالمصادر' : 'Context-grounded response'}
              </h3>
              <p className="mt-2 text-sm text-slate">
                {isArabic ? 'نمط الاستجابة:' : 'Response mode:'}{' '}
                {complianceResult.has_groq
                  ? isArabic
                    ? 'صياغة ذكية مدعومة بالمصادر'
                    : 'AI-drafted with source grounding'
                  : isArabic
                    ? 'نص مباشر من المصدر'
                    : 'Direct source response'}
              </p>
            </div>
            <span className="rounded-full border border-primary/10 bg-primary/5 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.2em] text-primary">
              {complianceResult.has_groq
                ? isArabic
                  ? 'صياغة ذكية'
                  : 'AI drafted'
                : isArabic
                  ? 'من المصدر مباشرة'
                  : 'Source direct'}
            </span>
          </div>

          <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-5">
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate">
              {isArabic ? 'الإجابة' : 'Answer'}
            </p>
            <p className="mt-4 text-sm leading-7 text-slate">{complianceResult.answer}</p>
          </div>

          <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-5">
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate">
              {isArabic ? 'المصادر' : 'Source trail'}
            </p>
            <div className="mt-4 space-y-3">
              {complianceResult.sources.map((source) => (
                <article
                  key={source.chunk_id}
                  className="rounded-2xl border border-slate-200 bg-background px-4 py-4"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-navy">{source.title}</p>
                      <p className="mt-1 text-[11px] uppercase tracking-[0.22em] text-slate">
                        {source.source}
                      </p>
                    </div>
                    <span className="rounded-full border border-primary/10 bg-white px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">
                      {isArabic ? 'الدرجة' : 'Score'} {source.score.toFixed(2)}
                    </span>
                  </div>
                  <p className="mt-3 text-sm text-slate">
                    {source.article ?? (isArabic ? 'المادة غير مذكورة' : 'Article not provided')}
                    {' · '}
                    {source.domain}
                  </p>
                </article>
              ))}
            </div>
          </div>
        </div>
      </motion.div>
    )
  }

  function renderResultPanel() {
    if (showPipeline) {
      return (
        <PipelineStepper
          title={agentCopy[agent].label}
          stages={agentCopy[agent].stages}
          activeStage={activeStage}
        />
      )
    }

    if (agent === 'kyc') {
      return kycResult ? (
        renderDecisionResult(kycResult, customerId, agentCopy.kyc.decisionReady)
      ) : (
        <div className="surface-card flex h-full min-h-[28rem] items-center justify-center p-8 text-center">
          <div className="max-w-sm">
            <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <h3 className="text-2xl font-semibold tracking-[-0.03em] text-navy">
              {agentCopy.kyc.idleTitle}
            </h3>
            <p className="mt-3 text-sm leading-7 text-slate">{agentCopy.kyc.idleText}</p>
          </div>
        </div>
      )
    }

    if (agent === 'merchant') {
      return merchantResult ? (
        renderDecisionResult(merchantResult, merchantId, agentCopy.merchant.decisionReady)
      ) : (
        <div className="surface-card flex h-full min-h-[28rem] items-center justify-center p-8 text-center">
          <div className="max-w-sm">
            <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <Store className="h-6 w-6" />
            </div>
            <h3 className="text-2xl font-semibold tracking-[-0.03em] text-navy">
              {agentCopy.merchant.idleTitle}
            </h3>
            <p className="mt-3 text-sm leading-7 text-slate">{agentCopy.merchant.idleText}</p>
          </div>
        </div>
      )
    }

    return renderComplianceResult()
  }

  const activeAgent = agentCopy[agent]
  const AgentIcon = activeAgent.icon

  return (
    <div className="grid gap-6 xl:grid-cols-[0.98fr_1.02fr]">
      <div className="space-y-6">
        <section className="surface-card p-6 sm:p-8">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="text-start">
              <span className="eyebrow">{isArabic ? 'مساحة المراجعة' : 'Review workspace'}</span>
              <h2 className="mt-5 text-4xl font-semibold tracking-[-0.04em] text-navy">
                {isArabic ? 'شغّل وكلاء تيقمو المباشرين.' : 'Run the live Tiqmo agents.'}
              </h2>
              <p className="mt-4 max-w-2xl text-sm leading-7 text-slate">
                {isArabic
                  ? 'اختر الوكيل المطلوب ثم نفّذ المراجعة من نفس السطح الإداري. كل الطلبات موثقة ومحمية بالمصادقة الخلفية.'
                  : 'Choose the agent you need and launch a review from one admin surface. Every request is authenticated and logged by the backend.'}
              </p>
            </div>
            <div className="rounded-2xl border border-primary/10 bg-primary/5 px-4 py-3 text-sm text-slate">
              {isArabic ? 'الدور النشط:' : 'Signed in as'}{' '}
              <span className="font-semibold text-navy">{localizedRole}</span>
            </div>
          </div>

          <div className="mt-6 grid gap-3 md:grid-cols-3">
            {(Object.keys(agentCopy) as AgentKey[]).map((agentKey) => {
              const meta = agentCopy[agentKey]
              const Icon = meta.icon
              const active = agentKey === agent

              return (
                <button
                  key={agentKey}
                  type="button"
                  onClick={() => changeAgent(agentKey)}
                  className={[
                    'rounded-2xl border px-4 py-4 text-start transition hover:-translate-y-0.5',
                    active
                      ? 'border-primary/25 bg-navy text-white shadow-panel'
                      : 'border-slate-200 bg-white hover:border-primary/25',
                  ].join(' ')}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={[
                        'flex h-10 w-10 items-center justify-center rounded-2xl',
                        active ? 'bg-white/12 text-white' : 'bg-primary/10 text-primary',
                      ].join(' ')}
                    >
                      <Icon className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold">{meta.label}</p>
                      <p className={['mt-1 text-xs', active ? 'text-white/70' : 'text-slate'].join(' ')}>
                        {meta.description}
                      </p>
                    </div>
                  </div>
                </button>
              )
            })}
          </div>

          <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
            <div className="rounded-2xl border border-slate-200 bg-background p-4">
              <div className="mb-3 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                  <AgentIcon className="h-5 w-5" />
                </div>
                <div className="text-start">
                  <p className="text-sm font-semibold text-navy">{activeAgent.label}</p>
                  <p className="text-sm text-slate">{activeAgent.description}</p>
                </div>
              </div>

              {agent === 'compliance' ? (
                <label className="block">
                  <span className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.24em] text-slate">
                    {activeAgent.inputLabel}
                  </span>
                  <textarea
                    value={complianceQueryText}
                    onChange={(event) => setComplianceQueryText(event.target.value)}
                    rows={5}
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-navy outline-none transition focus:border-primary"
                    placeholder={activeAgent.inputPlaceholder}
                  />
                </label>
              ) : (
                <label className="block">
                  <span className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.24em] text-slate">
                    {activeAgent.inputLabel}
                  </span>
                  <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 focus-within:border-primary">
                    <Search className="h-5 w-5 text-slate" />
                    <input
                      value={agent === 'kyc' ? customerId : merchantId}
                      onChange={(event) => {
                        if (agent === 'kyc') {
                          setCustomerId(event.target.value)
                        } else {
                          setMerchantId(event.target.value)
                        }
                      }}
                      placeholder={activeAgent.inputPlaceholder}
                      className="w-full border-0 bg-transparent text-base text-navy outline-none placeholder:text-slate"
                    />
                  </div>
                </label>
              )}
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="action-primary w-full justify-center"
            >
              {isSubmitting
                ? isArabic
                  ? 'جار التنفيذ...'
                  : 'Running...'
                : activeAgent.submitLabel}
              <Send className="h-4 w-4" />
            </button>
          </form>

          {error ? (
            <div className="mt-4 rounded-2xl border border-danger/15 bg-danger/5 px-4 py-3 text-sm text-danger">
              {error}
            </div>
          ) : null}
        </section>

        <section className="surface-card p-6 sm:p-8">
          <div className="flex items-center gap-3">
            <div className="table-dot">
              <Search className="h-5 w-5" />
            </div>
            <div className="text-start">
              <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate">
                {isArabic ? 'إدخال موجّه' : 'Guided input'}
              </p>
              <h3 className="text-2xl font-semibold text-navy">
                {isArabic ? 'ابدأ من عينة جاهزة' : 'Start from a sample'}
              </h3>
            </div>
          </div>
          <div className="mt-5">{renderSamples()}</div>
        </section>

        <section className="surface-card p-6">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h3 className="text-xl font-semibold text-navy">
              {isArabic ? 'أحدث النشاطات' : 'Recent activity'}
            </h3>
            <p className="text-sm text-slate">
              {isArabic ? 'عرض تدقيق داخلي' : 'Internal audit view'}
            </p>
          </div>
          {renderRecentActivity()}
        </section>
      </div>

      <AnimatePresence mode="wait">{renderResultPanel()}</AnimatePresence>
    </div>
  )
}
