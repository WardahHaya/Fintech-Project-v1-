import type { KycDecision } from '../types'

const styles: Record<KycDecision, string> = {
  APPROVED: 'bg-emerald-500/12 text-emerald-700 ring-emerald-500/20',
  REVIEW_REQUIRED: 'bg-amber-500/12 text-amber-700 ring-amber-500/20',
  REJECTED: 'bg-rose-500/12 text-rose-700 ring-rose-500/20',
}

export function DecisionBadge({ decision }: { decision: KycDecision }) {
  return (
    <span
      className={[
        'inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] ring-1',
        styles[decision],
      ].join(' ')}
    >
      {decision.replace('_', ' ')}
    </span>
  )
}
