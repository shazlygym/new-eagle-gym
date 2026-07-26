import { X } from 'lucide-react'
import { useEffect, type ReactNode } from 'react'

interface Props {
  open: boolean
  onClose: () => void
  title?: string
  children: ReactNode
  /** Sheets that own a scrolling list need the full height budget. */
  tall?: boolean
}

/**
 * Bottom sheet — the iOS-native way to present a secondary task. Slides up from
 * the bottom edge so it stays inside thumb reach on a large phone.
 */
export default function Sheet({ open, onClose, title, children, tall }: Props) {
  // Locking the body prevents the page behind from scrolling with the sheet,
  // which on iOS otherwise leaves you scrolled somewhere random on dismiss.
  useEffect(() => {
    if (!open) return
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = previous
    }
  }, [open])

  useEffect(() => {
    if (!open) return
    const onKey = (event: KeyboardEvent) => event.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end">
      <button
        type="button"
        aria-label="close"
        onClick={onClose}
        className="absolute inset-0 animate-fade-in bg-black/60"
      />

      <div
        role="dialog"
        aria-modal="true"
        className={`relative flex animate-slide-up flex-col rounded-t-3xl border-t
                    border-dark-500/60 bg-dark-800 pb-safe-b
                    ${tall ? 'h-[85dvh]' : 'max-h-[85dvh]'}`}
      >
        {/* Grabber — signals "drag me" even though dismissal is by tap. */}
        <div className="flex justify-center pt-3">
          <div className="h-1 w-10 rounded-full bg-dark-400" />
        </div>

        {title && (
          <div className="flex items-center gap-2 px-5 pb-2 pt-3">
            <h2 className="flex-1 text-lg font-semibold text-dark-50">{title}</h2>
            <button
              type="button"
              onClick={onClose}
              className="rounded-full p-2 text-dark-200 active:bg-dark-700"
              aria-label="close"
            >
              <X size={20} />
            </button>
          </div>
        )}

        <div className="scroll-area min-h-0 flex-1 overflow-y-auto px-5 pb-6 pt-2">{children}</div>
      </div>
    </div>
  )
}
