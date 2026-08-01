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
      <div className="flex items-start gap-1.5 text-ink-200">
        <Icon size={14} strokeWidth={2} className="mt-px shrink-0" />
        {/* Three of these sit side by side on a 390px screen. The label wraps
            rather than clips: Arabic "أسابيع متتالية" came out as "أسابيع متت…",
            which names nothing. The grid keeps all three tiles the same height. */}
        <span className="text-[11px] font-medium leading-tight">{label}</span>
      </div>
      <p className="tabular font-numeric mt-1.5 truncate text-xl font-bold leading-tight text-ink-50">
        {value}
      </p>
      {hint && <p className="mt-0.5 truncate text-[11px] text-ink-300">{hint}</p>}
    </div>
  )
}
