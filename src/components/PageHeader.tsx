import { ChevronLeft } from 'lucide-react'
import { useEffect, useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'

interface Props {
  title: string
  subtitle?: string
  /** Renders a back chevron that mirrors with the writing direction. */
  onBack?: (() => void) | 'history'
  action?: ReactNode
  /**
   * Top-level screens use the large title: it scrolls away and hands over to the
   * compact bar, which is the iOS pattern and gives each screen a real opening
   * rather than a 14px label.
   */
  large?: boolean
}

/** Scroll distance over which the large title hands off to the compact one. */
const HANDOFF = 44

export default function PageHeader({ title, subtitle, onBack, action, large }: Props) {
  const navigate = useNavigate()
  const handleBack = onBack === 'history' ? () => navigate(-1) : onBack

  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    if (!large) return
    const onScroll = () => setScrolled(window.scrollY > HANDOFF)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [large])

  const compactVisible = !large || scrolled

  return (
    <>
      <header
        className={`sticky top-0 z-30 pt-safe-t transition-colors duration-200
                    ${
                      compactVisible
                        ? 'border-b border-ink-500/50 bg-ink-950/85 backdrop-blur-xl'
                        : 'border-b border-transparent bg-transparent'
                    }`}
      >
        <div className="flex h-14 items-center gap-2 px-4">
          {handleBack && (
            <button
              type="button"
              onClick={handleBack}
              className="-ms-2 rounded-full p-2 text-ink-100 active:bg-ink-700"
              aria-label="back"
            >
              <ChevronLeft size={24} className="rtl-flip" />
            </button>
          )}

          <div className="min-w-0 flex-1">
            <h1
              className={`truncate text-lg font-semibold text-ink-50 transition-opacity duration-200
                          ${large && !scrolled ? 'opacity-0' : 'opacity-100'}`}
            >
              {title}
            </h1>
            {subtitle && !large && <p className="truncate text-xs text-ink-200">{subtitle}</p>}
          </div>

          {action}
        </div>
      </header>

      {large && (
        <div className="px-5 pb-1 pt-1">
          <h2 className="display-title truncate">{title}</h2>
          {subtitle && <p className="mt-1 text-sm text-ink-300">{subtitle}</p>}
        </div>
      )}
    </>
  )
}
