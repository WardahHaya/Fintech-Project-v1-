import { useMemo } from 'react'
import { BarChart3, PieChart as PieChartIcon, Activity, GaugeCircle } from 'lucide-react'
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

import { useLanguage } from '../i18n/useLanguage'
import type {
  ComplianceQueryRecord,
  KycReviewRecord,
  MerchantReviewRecord,
  ReviewDecision,
} from '../types'


const COLORS = {
  navy: '#0A2540',
  slate: '#697386',
  primary: '#635BFF',
  primaryLight: '#7E6BFD',
  accent: '#FF6B47',
  success: '#057a55',
  warning: '#b45309',
  danger: '#c81e1e',
}

const DECISION_COLORS: Record<ReviewDecision, string> = {
  APPROVED: COLORS.success,
  REVIEW_REQUIRED: COLORS.warning,
  ESCALATE: COLORS.accent,
  REJECTED: COLORS.danger,
}

interface DashboardChartsProps {
  kycReviews: KycReviewRecord[]
  merchantReviews: MerchantReviewRecord[]
  complianceHistory: ComplianceQueryRecord[]
}

function ChartCard({
  icon: Icon,
  title,
  subtitle,
  isEmpty,
  emptyLabel,
  children,
}: {
  icon: typeof BarChart3
  title: string
  subtitle: string
  isEmpty: boolean
  emptyLabel: string
  children: React.ReactNode
}) {
  return (
    <article className="surface-card p-6">
      <div className="flex items-center gap-3 text-start">
        <div className="table-dot">
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate">
            {subtitle}
          </p>
          <h3 className="text-xl font-semibold text-navy">{title}</h3>
        </div>
      </div>

      <div className="mt-5 h-[260px] w-full">
        {isEmpty ? (
          <div className="flex h-full items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-background text-sm text-slate">
            {emptyLabel}
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            {children as React.ReactElement}
          </ResponsiveContainer>
        )}
      </div>
    </article>
  )
}

export function DashboardCharts({
  kycReviews,
  merchantReviews,
  complianceHistory,
}: DashboardChartsProps) {
  const { isArabic, locale, dir } = useLanguage()

  const allReviews = useMemo(
    () => [...kycReviews, ...merchantReviews],
    [kycReviews, merchantReviews],
  )

  const volumeData = useMemo(
    () => [
      {
        key: 'kyc',
        name: isArabic ? 'اعرف عميلك' : 'KYC',
        value: kycReviews.length,
        color: COLORS.primary,
      },
      {
        key: 'compliance',
        name: isArabic ? 'ساما' : 'SAMA',
        value: complianceHistory.length,
        color: COLORS.primaryLight,
      },
      {
        key: 'merchant',
        name: isArabic ? 'التجار' : 'Merchant',
        value: merchantReviews.length,
        color: COLORS.accent,
      },
    ],
    [isArabic, kycReviews.length, complianceHistory.length, merchantReviews.length],
  )

  const decisionData = useMemo(() => {
    const labels: Record<ReviewDecision, string> = {
      APPROVED: isArabic ? 'مقبول' : 'Approved',
      REVIEW_REQUIRED: isArabic ? 'يتطلب مراجعة' : 'Review required',
      ESCALATE: isArabic ? 'تصعيد' : 'Escalate',
      REJECTED: isArabic ? 'مرفوض' : 'Rejected',
    }
    const order: ReviewDecision[] = ['APPROVED', 'REVIEW_REQUIRED', 'ESCALATE', 'REJECTED']
    const counts = new Map<ReviewDecision, number>()
    for (const review of allReviews) {
      counts.set(review.decision, (counts.get(review.decision) ?? 0) + 1)
    }
    return order
      .map((decision) => ({
        name: labels[decision],
        value: counts.get(decision) ?? 0,
        color: DECISION_COLORS[decision],
      }))
      .filter((item) => item.value > 0)
  }, [allReviews, isArabic])

  const riskData = useMemo(() => {
    const buckets = [
      { label: '0-20', min: 0, max: 20 },
      { label: '21-40', min: 21, max: 40 },
      { label: '41-60', min: 41, max: 60 },
      { label: '61-80', min: 61, max: 80 },
      { label: '81-100', min: 81, max: 100 },
    ]
    return buckets.map((bucket) => ({
      name: bucket.label,
      value: allReviews.filter(
        (review) => review.risk_score >= bucket.min && review.risk_score <= bucket.max,
      ).length,
    }))
  }, [allReviews])

  const trendData = useMemo(() => {
    const dayFormatter = new Intl.DateTimeFormat(locale, { month: 'short', day: 'numeric' })
    const localDayKey = (date: Date) => {
      const year = date.getFullYear()
      const month = `${date.getMonth() + 1}`.padStart(2, '0')
      const day = `${date.getDate()}`.padStart(2, '0')
      return `${year}-${month}-${day}`
    }
    const days: { key: string; label: string; value: number }[] = []
    const today = new Date()
    for (let i = 6; i >= 0; i -= 1) {
      const date = new Date(today)
      date.setHours(0, 0, 0, 0)
      date.setDate(date.getDate() - i)
      days.push({
        key: localDayKey(date),
        label: dayFormatter.format(date),
        value: 0,
      })
    }
    const index = new Map(days.map((day) => [day.key, day]))
    for (const review of allReviews) {
      const entry = index.get(localDayKey(new Date(review.reviewed_at)))
      if (entry) {
        entry.value += 1
      }
    }
    return days
  }, [allReviews, locale])

  const tooltipStyle = {
    borderRadius: 16,
    border: '1px solid rgba(10, 37, 64, 0.08)',
    boxShadow: '0 18px 48px rgba(10, 37, 64, 0.12)',
    fontSize: 13,
  }

  const axisTick = { fill: COLORS.slate, fontSize: 12 }
  const hasReviews = allReviews.length > 0
  const hasVolume = volumeData.some((item) => item.value > 0)
  const emptyLabel = isArabic
    ? 'لا توجد بيانات كافية للعرض بعد. شغّل بعض المراجعات لرؤية الرسوم البيانية.'
    : 'Not enough data yet. Run a few reviews to populate the charts.'

  return (
    <section className="space-y-5" dir={dir}>
      <div className="text-start">
        <span className="eyebrow">{isArabic ? 'لوحة التحليلات' : 'Analytics board'}</span>
        <h2 className="mt-3 text-2xl font-semibold tracking-[-0.04em] text-navy">
          {isArabic ? 'تمثيل بياني للنشاط التشغيلي' : 'Visual breakdown of operational activity'}
        </h2>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <ChartCard
          icon={BarChart3}
          subtitle={isArabic ? 'حجم العمليات' : 'Operations volume'}
          title={isArabic ? 'النشاط حسب الوكيل' : 'Activity by agent'}
          isEmpty={!hasVolume}
          emptyLabel={emptyLabel}
        >
          <BarChart data={volumeData} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
            <XAxis
              dataKey="name"
              tick={axisTick}
              axisLine={false}
              tickLine={false}
              reversed={isArabic}
            />
            <YAxis tick={axisTick} axisLine={false} tickLine={false} allowDecimals={false} orientation={isArabic ? 'right' : 'left'} />
            <Tooltip cursor={{ fill: 'rgba(99, 91, 255, 0.06)' }} contentStyle={tooltipStyle} />
            <Bar dataKey="value" radius={[10, 10, 0, 0]} maxBarSize={64}>
              {volumeData.map((entry) => (
                <Cell key={entry.key} fill={entry.color} />
              ))}
            </Bar>
          </BarChart>
        </ChartCard>

        <ChartCard
          icon={PieChartIcon}
          subtitle={isArabic ? 'نتائج القرارات' : 'Decision outcomes'}
          title={isArabic ? 'توزيع قرارات المراجعة' : 'Review decision mix'}
          isEmpty={decisionData.length === 0}
          emptyLabel={emptyLabel}
        >
          <PieChart>
            <Pie
              data={decisionData}
              dataKey="value"
              nameKey="name"
              innerRadius={62}
              outerRadius={94}
              paddingAngle={2}
              stroke="none"
            >
              {decisionData.map((entry) => (
                <Cell key={entry.name} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip contentStyle={tooltipStyle} />
            <Legend
              iconType="circle"
              wrapperStyle={{ fontSize: 13, color: COLORS.slate }}
            />
          </PieChart>
        </ChartCard>

        <ChartCard
          icon={GaugeCircle}
          subtitle={isArabic ? 'توزيع المخاطر' : 'Risk distribution'}
          title={isArabic ? 'درجات المخاطر للمراجعات' : 'Review risk score spread'}
          isEmpty={!hasReviews}
          emptyLabel={emptyLabel}
        >
          <BarChart data={riskData} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
            <XAxis
              dataKey="name"
              tick={axisTick}
              axisLine={false}
              tickLine={false}
              reversed={isArabic}
            />
            <YAxis tick={axisTick} axisLine={false} tickLine={false} allowDecimals={false} orientation={isArabic ? 'right' : 'left'} />
            <Tooltip cursor={{ fill: 'rgba(99, 91, 255, 0.06)' }} contentStyle={tooltipStyle} />
            <Bar dataKey="value" radius={[10, 10, 0, 0]} fill={COLORS.primary} maxBarSize={56} />
          </BarChart>
        </ChartCard>

        <ChartCard
          icon={Activity}
          subtitle={isArabic ? 'آخر 7 أيام' : 'Last 7 days'}
          title={isArabic ? 'اتجاه نشاط المراجعات' : 'Review activity trend'}
          isEmpty={!hasReviews}
          emptyLabel={emptyLabel}
        >
          <AreaChart data={trendData} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
            <defs>
              <linearGradient id="trendFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={COLORS.primary} stopOpacity={0.28} />
                <stop offset="100%" stopColor={COLORS.primary} stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis
              dataKey="label"
              tick={axisTick}
              axisLine={false}
              tickLine={false}
              reversed={isArabic}
            />
            <YAxis tick={axisTick} axisLine={false} tickLine={false} allowDecimals={false} orientation={isArabic ? 'right' : 'left'} />
            <Tooltip contentStyle={tooltipStyle} />
            <Area
              type="monotone"
              dataKey="value"
              stroke={COLORS.primary}
              strokeWidth={2.5}
              fill="url(#trendFill)"
            />
          </AreaChart>
        </ChartCard>
      </div>
    </section>
  )
}
