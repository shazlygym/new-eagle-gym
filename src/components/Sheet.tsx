import { X } from 'lucide-react'
import { useId, type ReactNode } from 'react'
import { useT } from '../i18n'
import { useBodyScrollLock } from '../lib/useBodyScrollLock'
import { useOverlayEscape } from '../lib/useOverlayEscape'

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
  const { t } = useT()
  const titleId = useId()

  // Locking the body prevents the page behind from scrolling with the sheet,
  // which on iOS otherwise leaves you scrolled somewhere random on dismiss.
  // Counted, not saved-and-restored — sheets stack, see useBodyScrollLock.
  useBodyScrollLock(open)

  // Only the topmost sheet answers Escape — see useOverlayEscape.
  useOverlayEscape(open, onClose)

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end">
      <button
        type="button"
        aria-label={t('common.close')}
        onClick={onClose}
        className="absolute inset-0 animate-fade-in bg-black/60 backdrop-blur-[2px]"
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? titleId : undefined}
        className={`relative flex animate-slide-up flex-col rounded-t-3xl border-t
                    border-ink-500/60 bg-ink-800 pb-safe-b
                    ${tall ? 'h-[85dvh]' : 'max-h-[85dvh]'}`}
      >
        {/* Grabber — signals "drag me" even though dismissal is by tap. */}
        <div className="flex justify-center pt-3">
          <div className="h-1 w-10 rounded-full bg-ink-400" />
        </div>

        {title && (
          <div className="flex items-center gap-2 px-5 pb-2 pt-3">
            <h2 id={titleId} className="flex-1 text-lg font-semibold text-ink-50">
              {title}
            </h2>
            <button
              type="button"
              onClick={onClose}
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full
                         text-ink-200 active:bg-ink-700"
              aria-label={t('common.close')}
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
