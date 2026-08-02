import { Check, ChevronRight, Minus, Plus } from 'lucide-react'
import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { useT } from '../i18n'
import { formatNumber } from '../lib/format'
import { useRestTimerStore } from '../lib/useRestTimer'
import { focusNextSetCell, logCurrentRow, revealSetCell, useSetInputBar } from '../lib/useSetInputBar'

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

/** How long a press has to last before it starts repeating, and how fast then. */
const HOLD_DELAY = 380
const REPEAT_EVERY = 80

/** Fallback height for the frame before the bar has been measured. */
const BAR_HEIGHT = 68

interface Hold {
  /** What the field will hold once every queued write has landed. */
  value: number
  timeout?: number
  interval?: number
}

/**
 * The −/+ bar that rides above the keyboard while you are editing a set.
 *
 * Most changes to a logged set are one notch: 77.5 → 80, eight reps → nine.
 * Doing that by keyboard means opening the pad, selecting, typing two or three
 * characters and dismissing — for an arithmetic step the app already knows how
 * to take. The set row itself has no room for steppers, so they live here,
 * where there is nothing but keyboard chrome, and the trailing button carries
 * the row to its end: tick this set, open the next one, all without the pad
 * ever closing.
 */
export default function SetInputBar() {
  const target = useSetInputBar((state) => state.target)
  const inset = useKeyboardInset()
  const { t } = useT()

  // Holding −/+ fires faster than a number can travel out to the database and
  // back, so the press keeps its own running total: each tick states the value
  // outright rather than asking for "one more", and the readout shows where the
  // press has got to instead of trailing several steps behind the thumb.
  const held = useRef<Hold | null>(null)
  const [preview, setPreview] = useState<{ key: string; value: number } | null>(null)

  const release = () => {
    const hold = held.current
    if (!hold) return
    window.clearTimeout(hold.timeout)
    window.clearInterval(hold.interval)
    held.current = null
  }

  // A finger still down when the bar unmounts — the last set of a workout —
  // would otherwise leave an interval writing to a field that is gone.
  useEffect(() => release, [])

  const key = target?.key
  const value = target?.value

  // Once the field's own value has caught up, the press's total is redundant.
  useEffect(() => {
    if (!held.current) setPreview(null)
  }, [key, value])

  // Opening the keyboard hides the bottom half of the screen, and the cell you
  // just tapped is often in it. Once the bar knows how much room is left, it
  // puts the cell back where you can see it.
  //
  // The rest countdown is in that list too: it appears one tick after you log a
  // set, on top of this bar, and it takes another 70px of the screen with it —
  // often the exact strip the cell you are now typing into was sitting in.
  const resting = useRestTimerStore((state) => state.endsAt)
  useEffect(() => {
    const cell = document.activeElement as HTMLElement | null
    if (key && cell?.matches?.('input[data-set-cell]')) revealSetCell(cell)
  }, [key, inset, resting])

  // Publish how much of the bottom edge is spoken for, so the rest timer can
  // stack on top rather than hide underneath.
  const root = useRef<HTMLDivElement>(null)
  const setBottomInset = useSetInputBar((state) => state.setBottomInset)
  const showing = Boolean(key)
  useLayoutEffect(() => {
    setBottomInset(showing ? inset + (root.current?.offsetHeight ?? BAR_HEIGHT) : 0)
  }, [showing, inset, setBottomInset])
  useEffect(() => () => useSetInputBar.getState().setBottomInset(0), [])

  if (!target) return null

  const shown = preview && preview.key === target.key ? preview.value : target.value
  const atMin = shown - target.step < target.min

  /** One notch from `from`, clamped. Returns `from` when there is no room. */
  const advance = (from: number, direction: number) =>
    Math.max(target.min, Math.round((from + direction * target.step) * 100) / 100)

  const write = (next: number) => {
    setPreview({ key: target.key, value: next })
    target.set(next)
  }

  /** A tap: one notch, no timers. Also what a keyboard press comes through. */
  const step = (direction: number) => {
    const next = advance(shown, direction)
    if (next !== shown) write(next)
  }

  /** A press: one notch now, then a ramp for as long as the finger is down. */
  const press = (direction: number) => {
    release()
    const hold: Hold = { value: shown }
    held.current = hold

    const bump = () => {
      const next = advance(hold.value, direction)
      // The bottom of the range: nothing more to give, so stop repeating rather
      // than sit there firing writes that change nothing.
      if (next === hold.value) return release()
      hold.value = next
      write(next)
    }

    bump()
    hold.timeout = window.setTimeout(() => {
      hold.interval = window.setInterval(bump, REPEAT_EVERY)
    }, HOLD_DELAY)
  }

  // Buttons on this bar must never take focus: the field they act on has to
  // stay focused or the keyboard closes, the bar unmounts mid-tap and the
  // change lands on nothing. Suppressing the pointer default suppresses the
  // compatibility mousedown that moves focus, while the click still fires.
  const hold = (event: { preventDefault: () => void }) => event.preventDefault()

  // The steppers act on press, not on click, so holding one repeats. A click
  // with no pointer behind it came from the keyboard (`detail` is 0 there); it
  // gets a single notch, because there is no pointer coming up to end a ramp.
  const keyboardOnly = (direction: number) => (event: { detail: number }) => {
    if (event.detail === 0) step(direction)
  }

  const stepper = 'btn-soft flex h-12 w-14 shrink-0 items-center justify-center select-none'

  return (
    <div
      ref={root}
      data-set-input-bar=""
      className="fixed inset-x-0 z-50 border-t border-ink-500/60 bg-ink-800/95 backdrop-blur-xl"
      // Not a Tailwind class: the value is the live keyboard height in pixels.
      style={{ bottom: inset, paddingBottom: inset === 0 ? 'env(safe-area-inset-bottom)' : 0 }}
    >
      <div className="page-width flex items-center gap-2 px-3 py-2">
        <button
          type="button"
          onPointerDown={(event) => {
            hold(event)
            press(-1)
          }}
          onPointerUp={release}
          onPointerCancel={release}
          onPointerLeave={release}
          onClick={keyboardOnly(-1)}
          disabled={atMin}
          aria-label={t('common.decrease')}
          className={`${stepper} disabled:opacity-30`}
        >
          <Minus size={20} />
        </button>

        {/* What the field holds, big enough to read at arm's length — the point
            of the bar is that you never have to look at the 60px cell it is
            standing in for. */}
        <div className="flex min-w-0 flex-1 items-baseline justify-center gap-1.5">
          <span className="tabular font-numeric text-xl font-bold text-ink-50">
            {formatNumber(shown)}
          </span>
          <span className="truncate text-xs text-ink-300">{target.label}</span>
        </div>

        <button
          type="button"
          onPointerDown={(event) => {
            hold(event)
            press(1)
          }}
          onPointerUp={release}
          onPointerCancel={release}
          onPointerLeave={release}
          onClick={keyboardOnly(1)}
          aria-label={t('common.increase')}
          className={stepper}
        >
          <Plus size={20} />
        </button>

        <button
          type="button"
          onPointerDown={hold}
          onClick={() => {
            // Finish the row from here when there is a row to finish: the tick
            // is a small target low on the card, and reaching for it is the
            // last thing standing between two sets.
            if (target.canLog && logCurrentRow()) return
            // The last cell has nowhere to go, so the same button puts the
            // keyboard away rather than dead-ending.
            if (!focusNextSetCell()) (document.activeElement as HTMLElement | null)?.blur()
          }}
          className="btn-primary flex h-12 shrink-0 items-center gap-1 px-4 py-0 text-sm"
        >
          {target.canLog ? (
            <>
              <Check size={16} />
              {t('workout.logSet')}
            </>
          ) : (
            <>
              {target.hasNext ? t('common.next') : t('common.done')}
              {/* Points the way the reader is going: right in English, mirrored
                  to left in Arabic by .rtl-flip. */}
              {target.hasNext && <ChevronRight size={16} className="rtl-flip" />}
            </>
          )}
        </button>
      </div>
    </div>
  )
}
