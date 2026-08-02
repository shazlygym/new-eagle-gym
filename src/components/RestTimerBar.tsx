import { Timer, X } from 'lucide-react'
import { useT } from '../i18n'
import { formatClock } from '../lib/format'
import type { RestTimer } from '../lib/useRestTimer'
import { useSetInputBar } from '../lib/useSetInputBar'

interface Props {
  timer: RestTimer
}

export default function RestTimerBar({ timer }: Props) {
  const { t } = useT()
  // The rest starts the instant you tick a set — which, now that the bar can
  // tick one, is the instant you are typing into the next. Both live on the
  // bottom edge, so this one stands on the other's shoulders instead of
  // underneath it, where the countdown would be invisible for its whole life.
  const inset = useSetInputBar((state) => state.bottomInset)
  if (!timer.active) return null

  const finished = timer.remaining <= 0

  return (
    <div
      data-rest-timer-bar=""
      className={`fixed inset-x-0 z-40 border-t border-ink-500/60 bg-ink-800/95 backdrop-blur-xl ${
        inset === 0 ? 'pb-safe-b' : ''
      }`}
      // Not a Tailwind class: the value is however tall the input bar and the
      // keyboard under it happen to be right now.
      style={{ bottom: inset }}
    >
      {/* Progress drains left-to-right in LTR and right-to-left in RTL, because
          it is a flex child rather than an absolutely positioned bar. */}
      {/* Cyan for "done", not green: the running state is already lime, and one
          green shading into another reads as the same state, not a change. */}
      <div className="page-width h-0.5 bg-ink-600">
        <div
          className={`h-full transition-[width] duration-300 ease-linear ${
            finished ? 'bg-aqua-400' : 'bg-brand-500'
          }`}
          style={{ width: `${Math.min(100, timer.progress * 100)}%` }}
        />
      </div>

      <div className="page-width flex items-center gap-3 px-4 py-3">
        <Timer size={20} className={finished ? 'text-aqua-300' : 'text-brand-500'} />

        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium text-ink-200">
            {finished ? t('workout.restDone') : t('workout.rest')}
          </p>
          <p
            className={`tabular font-numeric text-xl font-bold ${
              finished ? 'text-aqua-300' : 'text-ink-50'
            }`}
          >
            {formatClock(timer.remaining)}
          </p>
        </div>

        {!finished && (
          <button
            type="button"
            onClick={() => timer.extend(-15)}
            className="tabular flex h-11 items-center rounded-xl bg-ink-600 px-3 text-xs font-semibold text-ink-50 active:bg-ink-500"
          >
            {t('workout.lessTime')}
          </button>
        )}
        <button
          type="button"
          onClick={() => timer.extend(30)}
          className="tabular flex h-11 items-center rounded-xl bg-ink-600 px-3 text-xs font-semibold text-ink-50 active:bg-ink-500"
        >
          {t('workout.addTime')}
        </button>
        <button
          type="button"
          onClick={timer.stop}
          aria-label={t('workout.skipRest')}
          className="icon-btn bg-ink-600 text-ink-100 active:bg-ink-500"
        >
          <X size={18} />
        </button>
      </div>
    </div>
  )
}
