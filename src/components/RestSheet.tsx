import { useEffect, useRef, useState } from 'react'
import { useT } from '../i18n'
import { formatClock } from '../lib/format'
import NumberField from './NumberField'
import Sheet from './Sheet'

interface Props {
  open: boolean
  /** Current rest for the exercise, in seconds. */
  seconds: number
  onClose: () => void
  onSave: (seconds: number, applyToAll: boolean) => void
}

/** The rests people actually take, so the common case is one tap. */
const PRESETS = [30, 45, 60, 90, 120, 150, 180, 240]

/**
 * How long the countdown runs after a set is ticked. Reachable from the card
 * itself rather than only from the routine editor, because the honest answer to
 * "how long do you rest?" changes with the exercise and with the day.
 */
export default function RestSheet({ open, seconds, onClose, onSave }: Props) {
  const { t } = useT()
  const [value, setValue] = useState(seconds)
  const [applyToAll, setApplyToAll] = useState(false)

  // Read through a ref and depend on `open` alone: the exercise arrives from a
  // live query, so listing `seconds` here would reset a half-typed number every
  // time anything else in the workout wrote to the database.
  const source = useRef(seconds)
  source.current = seconds

  useEffect(() => {
    if (!open) return
    setValue(source.current)
    setApplyToAll(false)
  }, [open])

  return (
    <Sheet open={open} onClose={onClose} title={t('workout.restLength')}>
      <div className="space-y-4">
        <p className="text-xs leading-relaxed text-ink-300">{t('workout.restHint')}</p>

        <div className="grid grid-cols-4 gap-2">
          {PRESETS.map((preset) => (
            <button
              key={preset}
              type="button"
              onClick={() => setValue(preset)}
              className={`tabular rounded-xl py-2.5 text-sm font-semibold transition-colors
                          ${
                            value === preset
                              ? 'bg-brand-500 text-white'
                              : 'bg-ink-600 text-ink-100 active:bg-ink-500'
                          }`}
            >
              {formatClock(preset)}
            </button>
          ))}
        </div>

        <NumberField
          label={t('workout.restSeconds')}
          value={value}
          onChange={(next) => setValue(Math.round(next))}
          step={15}
          steppers
        />

        {/* Zero is a real answer — circuits and warm-up-only days want no bar. */}
        <p className="tabular text-center text-2xl font-bold text-brand-400">
          {value > 0 ? formatClock(value) : t('workout.restOff')}
        </p>

        <label className="flex cursor-pointer items-start gap-3">
          <input
            type="checkbox"
            checked={applyToAll}
            onChange={(event) => setApplyToAll(event.target.checked)}
            className="mt-0.5 h-5 w-5 shrink-0 accent-brand-500"
          />
          <span className="min-w-0 flex-1 text-sm text-ink-100">{t('workout.restApplyAll')}</span>
        </label>

        <button type="button" onClick={() => onSave(value, applyToAll)} className="btn-primary w-full">
          {t('common.save')}
        </button>
      </div>
    </Sheet>
  )
}
