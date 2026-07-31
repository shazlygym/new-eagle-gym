import { useEffect } from 'react'
import { useT } from '../i18n'

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

  // Escape cancels, same as tapping the backdrop — matches Sheet.
  useEffect(() => {
    if (!open) return
    const onKey = (event: KeyboardEvent) => event.key === 'Escape' && onCancel()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onCancel])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-8">
      <button
        type="button"
        aria-label="cancel"
        onClick={onCancel}
        className="absolute inset-0 animate-fade-in bg-black/70"
      />

      <div
        role="alertdialog"
        aria-modal="true"
        className="relative w-full max-w-xs animate-fade-in overflow-hidden rounded-2xl
                   bg-ink-700 text-center shadow-2xl"
      >
        <div className="px-5 py-5">
          <h2 className="text-base font-semibold text-ink-50">{title}</h2>
          {body && <p className="mt-1.5 text-sm leading-relaxed text-ink-200">{body}</p>}
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
                        ${destructive ? 'text-red-400' : 'text-brand-500'}`}
          >
            {confirmLabel ?? t('common.done')}
          </button>
        </div>
      </div>
    </div>
  )
}
