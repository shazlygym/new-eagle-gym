import { Timer, X } from 'lucide-react'
import { useT } from '../i18n'
import { formatClock } from '../lib/format'
import type { RestTimer } from '../lib/useRestTimer'

interface Props {
  timer: RestTimer
}

export default function RestTimerBar({ timer }: Props) {
  const { t } = useT()
  if (!timer.active) return null

  const finished = timer.remaining <= 0

  return (
    <div className="fixed inset-x-0 bottom-0 z-40 border-t border-ink-500/60 bg-ink-800/95 pb-safe-b backdrop-blur-xl">
      {/* Progress drains left-to-right in LTR and right-to-left in RTL, because
          it is a flex child rather than an absolutely positioned bar. */}
      {/* Cyan for "done", not green: the running state is already lime, and one
          green shading into another reads as the same state, not a change. */}
      <div className="h-0.5 bg-ink-600">
        <div
          className={`h-full transition-[width] duration-300 ease-linear ${
            finished ? 'bg-aqua-400' : 'bg-brand-500'
          }`}
          style={{ width: `${Math.min(100, timer.progress * 100)}%` }}
        />
      </div>

      <div className="flex items-center gap-3 px-4 py-3">
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
            className="tabular rounded-xl bg-ink-600 px-3 py-2 text-xs font-semibold text-ink-50 active:bg-ink-500"
          >
            {t('workout.lessTime')}
          </button>
        )}
        <button
          type="button"
          onClick={() => timer.extend(30)}
          className="tabular rounded-xl bg-ink-600 px-3 py-2 text-xs font-semibold text-ink-50 active:bg-ink-500"
        >
          {t('workout.addTime')}
        </button>
        <button
          type="button"
          onClick={timer.stop}
          aria-label={t('workout.skipRest')}
          className="rounded-xl bg-ink-600 p-2 text-ink-100 active:bg-ink-500"
        >
          <X size={18} />
        </button>
      </div>
    </div>
  )
}
