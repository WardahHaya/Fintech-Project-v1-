import { Landmark, ShieldCheck, Store } from 'lucide-react'
import { useDeferredValue, useEffect, useState } from 'react'
import { useOutletContext, useSearchParams } from 'react-router-dom'

import { DecisionBadge } from '../components/DecisionBadge'
import { useLanguage } from '../i18n/useLanguage'
import { fetchComplianceHistory, fetchKycReviews, fetchMerchantReviews } from '../lib/api'
import type {
  AgentKey,
  AppShellContext,
  ComplianceQueryRecord,
  KycReviewRecord,
  MerchantReviewRecord,
} from '../types'


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
  const { isArabic, locale } = useLanguage()
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
        setError(
          isArabic
            ? 'تعذر تحميل سجل التدقيق من الخلفية.'
            : 'Audit history could not be loaded from the backend.',
        )
      }
    }

    void load()

    return () => {
      active = false
    }
  }, [isArabic])

  function formatTimestamp(value: string) {
    return new Intl.DateTimeFormat(locale, {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(new Date(value))
  }

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

  const historyLabels = {
    title: isArabic
      ? 'سجل موحد لعمليات اعرف عميلك والامتثال وانضمام التجار.'
      : 'Unified audit trail across KYC, compliance, and merchant onboarding.',
    subtitle: isArabic
      ? 'بدّل بين المسارات، صفِّ النتائج، وركّز فقط على السجلات التي تهمك.'
      : 'Switch the agent lane, filter the records, and inspect only the details that matter.',
    filterLabel: isArabic ? 'تصفية السجلات' : 'Filter records',
    filterPlaceholder: isArabic
      ? 'ابحث بالمعرف أو القرار أو السؤال أو اسم النشاط'
      : 'Search by ID, decision, question, or business name',
  }

  const tabs = [
    { key: 'kyc' as const, label: isArabic ? 'اعرف عميلك' : 'KYC' },
    { key: 'compliance' as const, label: isArabic ? 'الامتثال' : 'Compliance' },
    { key: 'merchant' as const, label: isArabic ? 'التجار' : 'Merchant' },
  ]

  return (
    <div className="space-y-6">
      <section className="surface-card px-6 py-8 sm:px-8">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="text-start">
            <span className="eyebrow">{isArabic ? 'سجل الإدارة' : 'Admin history'}</span>
            <h2 className="mt-5 text-4xl font-semibold tracking-[-0.04em] text-navy">
              {historyLabels.title}
            </h2>
            <p className="mt-4 max-w-3xl text-sm leading-7 text-slate">
              {historyLabels.subtitle}
            </p>
          </div>

          <label className="block min-w-[280px]">
            <span className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.24em] text-slate">
              {historyLabels.filterLabel}
            </span>
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder={historyLabels.filterPlaceholder}
              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-navy outline-none transition focus:border-primary"
            />
          </label>
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => changeAgent(tab.key)}
              className={['nav-pill', tab.key === agent ? 'is-active' : ''].join(' ')}
            >
              {tab.label}
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
              <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate">
                {isArabic ? 'إجمالي المراجعات' : 'Total reviews'}
              </p>
              <p className="mt-2 text-3xl font-semibold text-navy">{filteredKyc.length}</p>
            </div>
            <div className="metric-chip">
              <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate">
                {isArabic ? 'نسبة القبول' : 'Approval rate'}
              </p>
              <p className="mt-2 text-3xl font-semibold text-navy">{approvalRate(filteredKyc)}</p>
            </div>
            <div className="metric-chip">
              <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate">
                {isArabic ? 'الحالات المعلّمة' : 'Flagged'}
              </p>
              <p className="mt-2 text-3xl font-semibold text-navy">{kycFlagged}</p>
            </div>
          </section>

          <section className="space-y-3">
            {filteredKyc.map((review) => (
              <article key={review.id} className="surface-card p-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="table-dot">
                      <ShieldCheck className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-navy">{review.full_name}</p>
                      <p className="mt-1 text-[11px] uppercase tracking-[0.22em] text-slate">
                        {review.customer_id}
                      </p>
                    </div>
                  </div>
                  <DecisionBadge decision={review.decision} />
                </div>
                <div className="mt-4 flex flex-wrap gap-4 text-sm text-slate">
                  <span>
                    {isArabic ? 'المخاطر' : 'Risk'} {review.risk_score}/100
                  </span>
                  <span>
                    {isArabic ? 'الثقة' : 'Confidence'}{' '}
                    {Math.round(review.confidence_score * 100)}%
                  </span>
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
              <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate">
                {isArabic ? 'إجمالي المراجعات' : 'Total reviews'}
              </p>
              <p className="mt-2 text-3xl font-semibold text-navy">{filteredMerchant.length}</p>
            </div>
            <div className="metric-chip">
              <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate">
                {isArabic ? 'نسبة القبول' : 'Approval rate'}
              </p>
              <p className="mt-2 text-3xl font-semibold text-navy">
                {approvalRate(filteredMerchant)}
              </p>
            </div>
            <div className="metric-chip">
              <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate">
                {isArabic ? 'الحالات المعلّمة' : 'Flagged'}
              </p>
              <p className="mt-2 text-3xl font-semibold text-navy">{merchantFlagged}</p>
            </div>
          </section>

          <section className="space-y-3">
            {filteredMerchant.map((review) => (
              <article key={review.id} className="surface-card p-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="table-dot">
                      <Store className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-navy">{review.business_name}</p>
                      <p className="mt-1 text-[11px] uppercase tracking-[0.22em] text-slate">
                        {review.merchant_id}
                      </p>
                    </div>
                  </div>
                  <DecisionBadge decision={review.decision} />
                </div>
                <div className="mt-4 flex flex-wrap gap-4 text-sm text-slate">
                  <span>
                    {isArabic ? 'المخاطر' : 'Risk'} {review.risk_score}/100
                  </span>
                  <span>
                    {isArabic ? 'الثقة' : 'Confidence'}{' '}
                    {Math.round(review.confidence_score * 100)}%
                  </span>
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
              <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate">
                {isArabic ? 'إجمالي الاستفسارات' : 'Total queries'}
              </p>
              <p className="mt-2 text-3xl font-semibold text-navy">{filteredCompliance.length}</p>
            </div>
            <div className="metric-chip">
              <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate">
                {isArabic ? 'إجابات ذكية' : 'AI drafted'}
              </p>
              <p className="mt-2 text-3xl font-semibold text-navy">{complianceGroq}</p>
            </div>
            <div className="metric-chip">
              <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate">
                {isArabic ? 'إجابات موثقة' : 'Cited answers'}
              </p>
              <p className="mt-2 text-3xl font-semibold text-navy">
                {filteredCompliance.filter((record) => record.source_chunk_ids.length > 0).length}
              </p>
            </div>
          </section>

          <section className="space-y-3">
            {filteredCompliance.map((record) => (
              <article key={record.id} className="surface-card p-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="table-dot">
                      <Landmark className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-navy">{record.query_text}</p>
                      <p className="mt-1 text-[11px] uppercase tracking-[0.22em] text-slate">
                        {record.has_groq
                          ? isArabic
                            ? 'صياغة ذكية'
                            : 'AI drafted'
                          : isArabic
                            ? 'من المصدر مباشرة'
                            : 'Direct source'}
                      </p>
                    </div>
                  </div>
                  <span className="rounded-full border border-primary/10 bg-primary/5 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">
                    {formatTimestamp(record.queried_at)}
                  </span>
                </div>
                <p className="mt-4 text-sm leading-7 text-slate">{record.answer}</p>
                <p className="mt-4 text-xs uppercase tracking-[0.18em] text-slate">
                  {isArabic ? 'المصادر:' : 'Sources:'}{' '}
                  {record.source_chunk_ids.join(', ') || (isArabic ? 'لا يوجد' : 'None')}
                </p>
              </article>
            ))}
          </section>
        </>
      ) : null}
    </div>
  )
}
