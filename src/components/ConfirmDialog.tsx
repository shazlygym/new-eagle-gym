import { useId } from 'react'
import { useT } from '../i18n'
import { useBodyScrollLock } from '../lib/useBodyScrollLock'
import { useOverlayEscape } from '../lib/useOverlayEscape'

interface Props {
  open: boolean
  title: string
  body?: string
  confirmLabel?: string
  destructive?: boolean
  onConfirm: () => void
  onCancel: () => void
}

/**
 * Centred alert rather than a bottom sheet — this matches the iOS convention for
 * a decision that blocks, and reads as more serious than a dismissible sheet.
 */
export default function ConfirmDialog({
  open,
  title,
  body,
  confirmLabel,
  destructive,
  onConfirm,
  onCancel,
}: Props) {
  const { t } = useT()
  const titleId = useId()
  const bodyId = useId()

  // Escape cancels, same as tapping the backdrop — matches Sheet, and like
  // Sheet it only fires when this is the topmost thing open.
  useOverlayEscape(open, onCancel)

  // A blocking decision shouldn't let the page drift behind it. This dialog
  // opens on top of sheets that lock too, so the lock has to be counted.
  useBodyScrollLock(open)

  if (!open) return null

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-8">
      <button
        type="button"
        aria-label={t('common.cancel')}
        onClick={onCancel}
        className="absolute inset-0 animate-fade-in bg-black/70"
      />

      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={body ? bodyId : undefined}
        // overflow-y-auto rather than overflow-hidden: it still clips the corners
        // the same way, but on a short screen (landscape, or a phone with the
        // keyboard up) a long body used to be cut off with no way to reach the
        // buttons underneath it.
        className="relative max-h-full w-full max-w-xs animate-fade-in overflow-y-auto
                   rounded-2xl bg-ink-700 text-center shadow-2xl"
      >
        <div className="px-5 py-5">
          <h2 id={titleId} className="text-base font-semibold text-ink-50">
            {title}
          </h2>
          {body && (
            <p id={bodyId} className="mt-1.5 text-sm leading-relaxed text-ink-200">
              {body}
            </p>
          )}
        </div>

        <div className="grid grid-cols-2 border-t border-ink-500/60 divide-x divide-ink-500/60 rtl:divide-x-reverse">
          <button
            type="button"
            onClick={onCancel}
            className="py-3.5 text-sm font-medium text-ink-100 active:bg-ink-600"
          >
            {t('common.cancel')}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className={`py-3.5 text-sm font-semibold active:bg-ink-600
                        ${destructive ? 'text-danger-400' : 'text-brand-500'}`}
          >
            {confirmLabel ?? t('common.done')}
          </button>
        </div>
      </div>
    </div>
  )
}
