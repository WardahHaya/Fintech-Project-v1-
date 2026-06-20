import type { KycDecision } from '../types'

const styles: Record<KycDecision, string> = {
  APPROVED: 'bg-emerald-500/10 text-emerald-700 ring-emerald-500/20',
  REVIEW_REQUIRED: 'bg-amber-500/14 text-amber-800 ring-amber-500/20',
  REJECTED: 'bg-rose-500/10 text-rose-700 ring-rose-500/20',
}

export function DecisionBadge({ decision }: { decision: KycDecision }) {
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
