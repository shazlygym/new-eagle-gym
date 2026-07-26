import type { LucideIcon } from 'lucide-react'

interface Props {
  icon: LucideIcon
  label: string
  value: string
  hint?: string
}

export default function StatCard({ icon: Icon, label, value, hint }: Props) {
  return (
    <div className="card min-w-0 p-3.5">
      <div className="flex items-center gap-1.5 text-ink-200">
        <Icon size={14} strokeWidth={2} className="shrink-0" />
        {/* Three of these sit side by side on a 390px screen, so both the label
            and the value have to be allowed to clip rather than wrap. */}
        <span className="truncate text-[11px] font-medium leading-tight">{label}</span>
      </div>
      <p className="tabular mt-1.5 truncate text-xl font-bold leading-tight text-ink-50">
        {value}
      </p>
      {hint && <p className="mt-0.5 truncate text-[11px] text-ink-300">{hint}</p>}
    </div>
  )
}
