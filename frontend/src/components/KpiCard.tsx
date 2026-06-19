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
    <div className="metric-chip">
      <div className="mb-4 flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-[0.26em] text-slate-400">{label}</p>
        {accent}
      </div>
      <p className="text-3xl font-semibold tracking-tight text-slate-950">{value}</p>
      <p className="mt-2 max-w-52 text-sm leading-6 text-slate-500">{detail}</p>
    </div>
  )
}
