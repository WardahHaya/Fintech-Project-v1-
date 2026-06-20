import type { ReviewDecision } from '../types'


const styles: Record<ReviewDecision, string> = {
  APPROVED: 'bg-success/10 text-success ring-success/15',
  ESCALATE: 'bg-accent/10 text-accent ring-accent/15',
  REVIEW_REQUIRED: 'bg-warning/10 text-warning ring-warning/15',
  REJECTED: 'bg-danger/10 text-danger ring-danger/15',
}


export function DecisionBadge({ decision }: { decision: ReviewDecision }) {
  return (
    <span
      className={[
        'inline-flex items-center rounded-full px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.24em] ring-1',
        styles[decision],
      ].join(' ')}
    >
      {decision.replace('_', ' ')}
    </span>
  )
}
