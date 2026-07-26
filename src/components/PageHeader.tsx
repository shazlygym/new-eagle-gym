import { ChevronLeft } from 'lucide-react'
import type { ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'

interface Props {
  title: string
  subtitle?: string
  /** Renders a back chevron that mirrors with the writing direction. */
  onBack?: (() => void) | 'history'
  action?: ReactNode
}

export default function PageHeader({ title, subtitle, onBack, action }: Props) {
  const navigate = useNavigate()
  const handleBack = onBack === 'history' ? () => navigate(-1) : onBack

  return (
    <header
      className="sticky top-0 z-30 border-b border-dark-500/50 bg-dark-900/90 pt-safe-t
                 backdrop-blur-xl"
    >
      <div className="flex h-14 items-center gap-2 px-4">
        {handleBack && (
          <button
            type="button"
            onClick={handleBack}
            className="-ms-2 rounded-full p-2 text-dark-100 active:bg-dark-700"
            aria-label="back"
          >
            <ChevronLeft size={24} className="rtl-flip" />
          </button>
        )}

        <div className="min-w-0 flex-1">
          <h1 className="truncate text-lg font-semibold text-dark-50">{title}</h1>
          {subtitle && <p className="truncate text-xs text-dark-200">{subtitle}</p>}
        </div>

        {action}
      </div>
    </header>
  )
}
