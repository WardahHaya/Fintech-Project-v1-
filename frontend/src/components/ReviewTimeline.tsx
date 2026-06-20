import { Clock3 } from 'lucide-react'

import type { KycReviewRecord } from '../types'
import { DecisionBadge } from './DecisionBadge'

function formatTimestamp(value: string) {
  return new Intl.DateTimeFormat('en-GB', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value))
}

export function ReviewTimeline({
  reviews,
  emptyLabel,
}: {
  reviews: KycReviewRecord[]
  emptyLabel: string
}) {
  if (reviews.length === 0) {
    return (
      <div className="rounded-[26px] border border-dashed border-teal-900/10 bg-white/80 px-5 py-12 text-center text-sm text-slate-500">
        {emptyLabel}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {reviews.map((review) => (
        <article
          key={review.id}
          className="rounded-[26px] border border-teal-900/10 bg-white/88 p-5 shadow-[0_20px_60px_rgba(18,35,45,0.08)] transition hover:-translate-y-0.5"
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-400">
                {review.customer_id}
              </p>
              <h3 className="mt-1 text-xl font-semibold text-slate-950">{review.full_name}</h3>
            </div>
            <DecisionBadge decision={review.decision} />
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-4 text-sm text-slate-500">
            <span>Risk {review.risk_score}/100</span>
            <span>Confidence {Math.round(review.confidence_score * 100)}%</span>
            <span className="inline-flex items-center gap-2">
              <Clock3 className="h-4 w-4" />
              {formatTimestamp(review.reviewed_at)}
            </span>
          </div>

          <div className="mt-4 grid gap-3 xl:grid-cols-[1.45fr_0.9fr]">
            <div className="rounded-2xl border border-teal-900/10 bg-stone-100/80 px-4 py-4 text-sm leading-6 text-slate-600">
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">
                Reasoning
              </p>
              <ul className="space-y-2">
                {review.reasoning.map((reason) => (
                  <li key={reason}>{reason}</li>
                ))}
              </ul>
            </div>
            <div className="rounded-2xl border border-teal-900/10 bg-white/75 px-4 py-4 text-sm leading-6 text-slate-600">
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">
                Missing documents
              </p>
              {review.missing_documents.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {review.missing_documents.map((document) => (
                    <span
                      key={document}
                      className="rounded-full border border-amber-300/70 bg-amber-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-amber-700"
                    >
                      {document.replace('_', ' ')}
                    </span>
                  ))}
                </div>
              ) : (
                <p>No missing documents.</p>
              )}
            </div>
          </div>
        </article>
      ))}
    </div>
  )
}
