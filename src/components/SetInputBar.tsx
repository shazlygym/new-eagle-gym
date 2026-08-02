import { ChevronRight, Minus, Plus } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useT } from '../i18n'
import { formatNumber } from '../lib/format'
import { focusNextSetCell, useSetInputBar } from '../lib/useSetInputBar'

/**
 * How much of the layout viewport the on-screen keyboard is covering.
 *
 * iOS does not resize the page when the keyboard opens — `window.innerHeight`
 * stays the full height and a `position: fixed; bottom: 0` element sits behind
 * the keys, invisible. The visual viewport is the part you can actually see, so
 * the difference between the two is the keyboard. Browsers without the API
 * (and desktop, where there is no keyboard) get 0 and the bar rests on the
 * bottom edge, which is where it belongs there anyway.
 */
function useKeyboardInset() {
  const [inset, setInset] = useState(0)

  useEffect(() => {
    const viewport = window.visualViewport
    if (!viewport) return

    const sync = () =>
      setInset(Math.max(0, window.innerHeight - viewport.height - viewport.offsetTop))

    sync()
    viewport.addEventListener('resize', sync)
    viewport.addEventListener('scroll', sync)
    return () => {
      viewport.removeEventListener('resize', sync)
      viewport.removeEventListener('scroll', sync)
    }
  }, [])

  return inset
}

/**
 * The −/+ bar that rides above the keyboard while you are editing a set.
 *
 * Most changes to a logged set are one notch: 77.5 → 80, eight reps → nine.
 * Doing that by keyboard means opening the pad, selecting, typing two or three
 * characters and dismissing — for an arithmetic step the app already knows how
 * to take. The set row itself has no room for steppers, so they live here,
 * where there is nothing but keyboard chrome, and "next" walks the whole
 * workout so an exercise can be filled in without the pad ever closing.
 */
export default function SetInputBar() {
  const target = useSetInputBar((state) => state.target)
  const inset = useKeyboardInset()
  const { t } = useT()

  if (!target) return null

  const atMin = target.value - target.step < target.min

  // Buttons on this bar must never take focus: the field they act on has to
  // stay focused or the keyboard closes, the bar unmounts mid-tap and the
  // change lands on nothing. Suppressing the pointer default suppresses the
  // compatibility mousedown that moves focus, while the click still fires.
  const hold = (event: { preventDefault: () => void }) => event.preventDefault()

  return (
    <div
      className="fixed inset-x-0 z-50 border-t border-ink-500/60 bg-ink-800/95 backdrop-blur-xl"
      // Not a Tailwind class: the value is the live keyboard height in pixels.
      style={{ bottom: inset, paddingBottom: inset === 0 ? 'env(safe-area-inset-bottom)' : 0 }}
    >
      <div className="page-width flex items-center gap-2 px-3 py-2">
        <button
          type="button"
          onPointerDown={hold}
          onClick={() => target.nudge(-target.step)}
          disabled={atMin}
          aria-label={t('common.decrease')}
          className="btn-soft flex h-12 w-14 shrink-0 items-center justify-center
                     disabled:opacity-30"
        >
          <Minus size={20} />
        </button>

        {/* What the field holds, big enough to read at arm's length — the point
            of the bar is that you never have to look at the 60px cell it is
            standing in for. */}
        <div className="flex min-w-0 flex-1 items-baseline justify-center gap-1.5">
          <span className="tabular font-numeric text-xl font-bold text-ink-50">
            {formatNumber(target.value)}
          </span>
          <span className="truncate text-xs text-ink-300">{target.label}</span>
        </div>

        <button
          type="button"
          onPointerDown={hold}
          onClick={() => target.nudge(target.step)}
          aria-label={t('common.increase')}
          className="btn-soft flex h-12 w-14 shrink-0 items-center justify-center"
        >
          <Plus size={20} />
        </button>

        <button
          type="button"
          onPointerDown={hold}
          onClick={() => {
            // The last cell has nowhere to go, so the same button puts the
            // keyboard away rather than dead-ending.
            if (!focusNextSetCell()) (document.activeElement as HTMLElement | null)?.blur()
          }}
          className="btn-primary flex h-12 shrink-0 items-center gap-1 px-4 py-0 text-sm"
        >
          {target.hasNext ? t('common.next') : t('common.done')}
          {/* Points the way the reader is going: right in English, mirrored to
              left in Arabic by .rtl-flip. */}
          {target.hasNext && <ChevronRight size={16} className="rtl-flip" />}
        </button>
      </div>
    </div>
  )
}
