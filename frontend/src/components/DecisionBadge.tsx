import type { ReviewDecision } from '../types'
import { useLanguage } from '../i18n/useLanguage'


const styles: Record<ReviewDecision, string> = {
  APPROVED: 'bg-success/10 text-success ring-success/15',
  ESCALATE: 'bg-accent/10 text-accent ring-accent/15',
  REVIEW_REQUIRED: 'bg-warning/10 text-warning ring-warning/15',
  REJECTED: 'bg-danger/10 text-danger ring-danger/15',
}


export function DecisionBadge({ decision }: { decision: ReviewDecision }) {
  const { isArabic } = useLanguage()

  const label = isArabic
    ? {
        APPROVED: 'مقبول',
        ESCALATE: 'تصعيد',
        REVIEW_REQUIRED: 'مراجعة مطلوبة',
        REJECTED: 'مرفوض',
      }[decision]
    : decision.replace('_', ' ')

  return (
    <span
      className={[
        'inline-flex items-center rounded-full px-3 py-1.5 text-[11px] font-semibold ring-1',
        isArabic ? 'tracking-normal' : 'uppercase tracking-[0.24em]',
        styles[decision],
      ].join(' ')}
    >
      {label}
    </span>
  )
}
