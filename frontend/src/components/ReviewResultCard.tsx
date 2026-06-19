import { AlertTriangle, CheckCircle2, FileWarning, ShieldAlert } from 'lucide-react'

import type { KycReviewResponse } from '../types'
import { DecisionBadge } from './DecisionBadge'

function pickTone(result: KycReviewResponse) {
  if (result.decision === 'APPROVED') {
    return {
      icon: CheckCircle2,
      shell: 'from-emerald-500/16 via-white to-emerald-500/4',
      label: 'Low-friction onboarding path',
    }
  }
  if (result.decision === 'REJECTED') {
    return {
      icon: ShieldAlert,
      shell: 'from-rose-500/16 via-white to-rose-500/4',
      label: 'Hard stop triggered by KYC policy',
    }
  }
  return {
    icon: AlertTriangle,
    shell: 'from-amber-500/16 via-white to-amber-500/4',
    label: 'Analyst review required before activation',
  }
}

export function ReviewResultCard({
  result,
  customerId,
}: {
  result: KycReviewResponse | null
  customerId: string
}) {
  if (!result) {
    return (
      <div className="surface-card flex h-full min-h-[26rem] items-center justify-center p-8 text-center">
        <div className="max-w-sm">
          <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-950 text-white shadow-lg shadow-slate-900/20">
            <ShieldAlert className="h-6 w-6" />
          </div>
          <h3 className="text-2xl font-semibold text-slate-950">Decision output appears here</h3>
          <p className="mt-3 text-sm leading-7 text-slate-500">
            Submit a sample customer ID to see the deterministic KYC verdict, confidence score,
            triggered rules, and missing document flags returned by the backend.
          </p>
        </div>
      </div>
    )
  }

  const tone = pickTone(result)
  const ToneIcon = tone.icon

  return (
    <div
      className={[
        'surface-card h-full bg-gradient-to-br p-6 sm:p-8',
        tone.shell,
      ].join(' ')}
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-950 text-white shadow-lg shadow-slate-900/20">
            <ToneIcon className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.26em] text-slate-400">
              Latest decision
            </p>
            <h3 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">
              {customerId || 'Sample'} review completed
            </h3>
            <p className="mt-2 text-sm text-slate-500">{tone.label}</p>
          </div>
        </div>
        <DecisionBadge decision={result.decision} />
      </div>

      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        <div className="rounded-3xl border border-white/70 bg-white/85 p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">
            Risk score
          </p>
          <div className="mt-3 flex items-end gap-3">
            <span className="text-5xl font-semibold tracking-tight text-slate-950">
              {result.risk_score}
            </span>
            <span className="pb-2 text-sm text-slate-500">/100</span>
          </div>
          <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full rounded-full bg-gradient-to-r from-indigo-600 via-blue-500 to-cyan-400"
              style={{ width: `${Math.max(8, result.risk_score)}%` }}
            />
          </div>
        </div>

        <div className="rounded-3xl border border-white/70 bg-white/85 p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">
            Confidence
          </p>
          <div className="mt-3 flex items-end gap-3">
            <span className="text-5xl font-semibold tracking-tight text-slate-950">
              {Math.round(result.confidence * 100)}
            </span>
            <span className="pb-2 text-sm text-slate-500">%</span>
          </div>
          <p className="mt-4 text-sm leading-7 text-slate-500">
            Model-assisted QA is layered on top of deterministic rules, but the returned decision
            remains policy-driven.
          </p>
        </div>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-[1.25fr_0.9fr]">
        <div className="rounded-3xl border border-white/70 bg-white/85 p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">
            Rules triggered
          </p>
          <ul className="mt-4 space-y-3">
            {result.reasoning.map((reason) => (
              <li
                key={reason}
                className="rounded-2xl border border-slate-100 bg-slate-50/80 px-4 py-3 text-sm leading-6 text-slate-600"
              >
                {reason}
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-3xl border border-white/70 bg-white/85 p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-950 text-white">
              <FileWarning className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">
                Missing documents
              </p>
              <p className="text-sm text-slate-500">Checklist for analyst follow-up</p>
            </div>
          </div>
          {result.missing_documents.length > 0 ? (
            <div className="mt-4 flex flex-wrap gap-2">
              {result.missing_documents.map((document) => (
                <span
                  key={document}
                  className="rounded-full border border-amber-300/70 bg-amber-500/10 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-amber-700"
                >
                  {document.replace('_', ' ')}
                </span>
              ))}
            </div>
          ) : (
            <p className="mt-4 rounded-2xl border border-emerald-300/60 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-700">
              No missing documents detected for this review.
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
