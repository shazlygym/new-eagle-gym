import type { ReactNode } from 'react'

// Shared chart chrome. Every chart in the app is single-series, so none of them
// carry a legend — the card title names the measure. Colours come from the brand
// ramp; text stays on ink tokens so identity is never carried by coloured type.

export const CHART = {
  series: '#C9A84C',
  grid: '#2a2a2a',
  axis: '#6e6e6e',
  surface: '#1a1a1a',
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
          <h2 className="text-sm font-semibold text-dark-50">{title}</h2>
          {subtitle && <p className="mt-0.5 text-xs text-dark-300">{subtitle}</p>}
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
    <div className="rounded-xl border border-dark-500 bg-dark-800/95 px-3 py-2 shadow-xl backdrop-blur">
      <p className="text-[11px] text-dark-300">{label}</p>
      <p className="tabular text-sm font-semibold text-dark-50">
        {payload[0]?.value}
        {suffix ? ` ${suffix}` : ''}
      </p>
    </div>
  )
}
