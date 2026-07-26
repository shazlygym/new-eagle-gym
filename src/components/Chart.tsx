import type { ReactNode } from 'react'

// Shared chart chrome. Every chart in the app is single-series, so none of them
// carry a legend — the card title names the measure. Colours come from the brand
// ramp; text stays on ink tokens so identity is never carried by coloured type.

export const CHART = {
  series: '#3B82F6',
  grid: '#2A3A5F',
  axis: '#7C8CB0',
  surface: '#16203A',
} as const

export function ChartCard({
  title,
  subtitle,
  children,
  action,
}: {
  title: string
  subtitle?: string
  children: ReactNode
  action?: ReactNode
}) {
  return (
    <section className="card p-4">
      <div className="mb-4 flex items-start gap-2">
        <div className="min-w-0 flex-1">
          <h2 className="text-sm font-semibold text-ink-50">{title}</h2>
          {subtitle && <p className="mt-0.5 text-xs text-ink-300">{subtitle}</p>}
        </div>
        {action}
      </div>
      {children}
    </section>
  )
}

export function ChartTooltip({
  active,
  payload,
  label,
  suffix,
}: {
  active?: boolean
  payload?: Array<{ value?: number | string }>
  label?: string | number
  suffix?: string
}) {
  if (!active || !payload?.length) return null

  return (
    <div className="rounded-xl border border-ink-500 bg-ink-800/95 px-3 py-2 shadow-xl backdrop-blur">
      <p className="text-[11px] text-ink-300">{label}</p>
      <p className="tabular text-sm font-semibold text-ink-50">
        {payload[0]?.value}
        {suffix ? ` ${suffix}` : ''}
      </p>
    </div>
  )
}
