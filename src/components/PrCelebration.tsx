import { Trophy } from 'lucide-react'
import { useEffect, useRef } from 'react'
import { useT } from '../i18n'
import { playPrFanfare } from '../lib/audio'

export interface PrEvent {
  exerciseName: string
  /** Already formatted for display — "100 كجم × 5" or "1:30". */
  display: string
}

// Deterministic spread: index math instead of randomness, so the burst looks
// the same every time and never re-rolls mid-animation on a re-render.
const COLORS = ['#A3E635', '#22D3EE', '#BEF264', '#FACC15', '#67E8F9']
const PIECES = Array.from({ length: 22 }, (_, index) => ({
  left: (index * 41) % 100,
  delay: (index * 73) % 500,
  duration: 1400 + ((index * 137) % 700),
  color: COLORS[index % COLORS.length],
  tall: index % 3 === 0,
}))

/**
 * Full-screen moment for a live personal record. Fires mid-workout, so it has
 * to be loud enough to feel like a win and quick enough not to block the next
 * set — it dismisses itself, or on any tap.
 */
export default function PrCelebration({
  event,
  onDone,
}: {
  event: PrEvent | null
  onDone: () => void
}) {
  const { t } = useT()

  // Held in a ref and deliberately out of the dependency list: the workout
  // screen re-renders every second for its stopwatch, so a plain `onDone` in
  // the deps would restart this effect each tick — replaying the fanfare over
  // and over and pushing the auto-dismiss permanently out of reach.
  const done = useRef(onDone)
  done.current = onDone

  useEffect(() => {
    if (!event) return
    playPrFanfare()
    // Android only; Safari has no vibration API.
    navigator.vibrate?.([90, 50, 140])
    const timeout = window.setTimeout(() => done.current(), 3200)
    return () => window.clearTimeout(timeout)
  }, [event])

  if (!event) return null

  return (
    <button
      type="button"
      onClick={onDone}
      aria-label={t('common.close')}
      className="fixed inset-0 z-[70] flex cursor-default items-center justify-center
                 overflow-hidden bg-black/60 p-8 backdrop-blur-sm animate-fade-in"
    >
      {PIECES.map((piece, index) => (
        <span
          key={index}
          aria-hidden
          className="pointer-events-none absolute top-0 rounded-sm"
          style={{
            left: `${piece.left}%`,
            width: 7,
            height: piece.tall ? 16 : 10,
            backgroundColor: piece.color,
            animation: `confetti-fall ${piece.duration}ms ease-in ${piece.delay}ms both`,
          }}
        />
      ))}

      <div
        className="relative w-full max-w-xs rounded-3xl border border-brand-500/40 bg-ink-700
                   p-6 text-center shadow-brand-lg"
        style={{ animation: 'pop-in 0.45s cubic-bezier(0.34, 1.56, 0.64, 1) both' }}
      >
        <div className="mx-auto mb-3 w-fit rounded-2xl bg-brand-gradient p-3.5 text-ink-950">
          <Trophy size={28} />
        </div>
        <p className="text-lg font-bold text-ink-50">{t('workout.prTitle')}</p>
        <p className="mt-1 truncate text-sm text-ink-200">{event.exerciseName}</p>
        <p className="tabular mt-2 text-2xl font-bold text-brand-400" dir="ltr">
          {event.display}
        </p>
      </div>
    </button>
  )
}
