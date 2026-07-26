import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'

interface Props {
  icon: LucideIcon
  title: string
  body?: string
  action?: ReactNode
}

export default function EmptyState({ icon: Icon, title, body, action }: Props) {
  return (
    <div className="flex flex-col items-center px-8 py-14 text-center">
      <div className="mb-4 rounded-2xl bg-ink-700 p-4 text-ink-300">
        <Icon size={28} strokeWidth={1.6} />
      </div>
      <h3 className="text-base font-semibold text-ink-100">{title}</h3>
      {body && <p className="mt-1.5 max-w-xs text-sm leading-relaxed text-ink-300">{body}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  )
}
