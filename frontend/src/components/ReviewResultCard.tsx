import { AlertTriangle, CheckCircle2, FileWarning, ShieldAlert } from 'lucide-react'

import type { KycReviewResponse } from '../types'
import { DecisionBadge } from './DecisionBadge'

function pickTone(result: KycReviewResponse) {
  if (result.decision === 'APPROVED') {
    return {
      icon: CheckCircle2,
      shell: 'from-emerald-500/16 via-white to-emerald-500/6',
      accent: 'bg-emerald-500/12 text-emerald-700',
      label: 'Customer can proceed to wallet activation',
    }
  }
  if (result.decision === 'REJECTED') {
    return {
      icon: ShieldAlert,
      shell: 'from-rose-500/16 via-white to-rose-500/6',
      accent: 'bg-rose-500/12 text-rose-700',
      label: 'Compliance controls stopped the onboarding flow',
    }
  }
  return {
    icon: AlertTriangle,
    shell: 'from-amber-500/16 via-white to-amber-500/6',
    accent: 'bg-amber-500/12 text-amber-800',
    label: 'Analyst intervention is needed before activation',
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
      <div className="surface-card flex h-full min-h-[28rem] items-center justify-center p-8 text-center">
        <div className="max-w-sm">
          <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-[22px] bg-teal-800 text-white shadow-[0_18px_45px_rgba(15,77,94,0.24)]">
            <ShieldAlert className="h-6 w-6" />
          </div>
          <h3 className="text-2xl font-semibold tracking-[-0.03em] text-slate-950">
            Decision card stays empty until a review runs
          </h3>
          <p className="mt-3 text-sm leading-7 text-slate-500">
            Choose a KYC record on the left and run screening to load the latest risk outcome,
            reasoning, and follow-up checklist.
          </p>
        </div>
      </div>
    )
  }

  const tone = pickTone(result)
  const ToneIcon = tone.icon

  return (
    <div className={['surface-card h-full bg-gradient-to-br p-6 sm:p-8', tone.shell].join(' ')}>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-[22px] bg-teal-800 text-white shadow-[0_18px_45px_rgba(15,77,94,0.24)]">
            <ToneIcon className="h-6 w-6" />
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-400">
              Decision output
            </p>
            <h3 className="mt-2 text-3xl font-semibold tracking-[-0.04em] text-slate-950">
              {customerId} screened
            </h3>
            <p className={['mt-3 inline-flex rounded-full px-3 py-1.5 text-xs font-medium', tone.accent].join(' ')}>
              {tone.label}
            </p>
          </div>
        </div>
        <DecisionBadge decision={result.decision} />
      </div>

      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        <div className="rounded-[24px] border border-teal-900/10 bg-white/88 p-5">
          <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-400">
            Risk score
          </p>
          <div className="mt-3 flex items-end gap-3">
            <span className="text-5xl font-semibold tracking-tight text-slate-950">{result.risk_score}</span>
            <span className="pb-2 text-sm text-slate-500">/100</span>
          </div>
          <div className="mt-4 h-2 overflow-hidden rounded-full bg-stone-100">
            <div
              className="h-full rounded-full bg-gradient-to-r from-teal-800 via-teal-600 to-amber-400"
              style={{ width: `${Math.max(8, result.risk_score)}%` }}
            />
          </div>
        </div>

        <div className="rounded-[24px] border border-teal-900/10 bg-white/88 p-5">
          <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-400">
            Confidence
          </p>
          <div className="mt-3 flex items-end gap-3">
            <span className="text-5xl font-semibold tracking-tight text-slate-950">
              {Math.round(result.confidence * 100)}
            </span>
            <span className="pb-2 text-sm text-slate-500">%</span>
          </div>
          <p className="mt-4 text-sm leading-7 text-slate-500">
            Confidence reflects how strongly the current ruleset supports the returned decision.
          </p>
        </div>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-[1.2fr_0.95fr]">
        <div className="rounded-[24px] border border-teal-900/10 bg-white/88 p-5">
          <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-400">
            Why this decision happened
          </p>
          <ul className="mt-4 space-y-3">
            {result.reasoning.map((reason) => (
              <li
                key={reason}
                className="rounded-2xl border border-teal-900/10 bg-stone-100/80 px-4 py-3 text-sm leading-6 text-slate-600"
              >
                {reason}
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-[24px] border border-teal-900/10 bg-white/88 p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-950 text-white">
              <FileWarning className="h-5 w-5" />
            </div>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-400">
                Follow-up checklist
              </p>
              <p className="text-sm text-slate-500">Anything still needed before activation</p>
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
              No additional documents are required for this record.
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
