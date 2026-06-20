import type { ReactNode } from 'react'

export function KpiCard({
  label,
  value,
  detail,
  accent,
}: {
  label: string
  value: string
  detail: string
  accent: ReactNode
}) {
  return (
    <div className="metric-chip group">
      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-400">
            {label}
          </p>
        </div>
        <div className="rounded-2xl border border-teal-900/10 bg-stone-100 px-3 py-3 text-teal-700 transition group-hover:-translate-y-0.5">
          {accent}
        </div>
      </div>
      <p className="text-3xl font-semibold tracking-tight text-slate-950">{value}</p>
      <p className="mt-2 max-w-64 text-sm leading-6 text-slate-500">{detail}</p>
    </div>
  )
}
