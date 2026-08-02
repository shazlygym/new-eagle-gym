import { Minus, Plus } from 'lucide-react'
import { useEffect, useId, useRef, useState } from 'react'
import { useT } from '../i18n'
import { focusNextSetCell, setInputCells, useSetInputBar } from '../lib/useSetInputBar'

interface Props {
  value: number
  onChange: (value: number) => void
  step?: number
  min?: number
  suffix?: string
  label?: string
  /** Shown when the field is empty. Defaults to "0". */
  placeholder?: string
  /** Adds −/+ buttons either side; skip them where space is tight. */
  steppers?: boolean
  /**
   * `form` is the full-width field with a label above it. `cell` is the dense
   * scoreboard box used inside the workout grid — see `.field-num`.
   */
  variant?: 'form' | 'cell'
  /** `cell` only: paints the box as a logged set rather than an empty entry. */
  done?: boolean
  className?: string
  /** Announces the column when there is no visible label — the grid rows. */
  ariaLabel?: string
}

/** What a field's text means as a number. Unparseable reads as empty, i.e. 0. */
function parse(raw: string, min: number) {
  const parsed = Number.parseFloat(raw.replace(',', '.'))
  return Number.isFinite(parsed) ? Math.max(min, parsed) : 0
}

/**
 * Numeric entry tuned for use mid-set, with sweaty hands:
 *   - inputMode="decimal" brings up the number pad instead of the full keyboard
 *   - the field holds a string while focused, so typing "12." or clearing it
 *     doesn't get stomped by a premature parse back to 0
 *   - font-size stays at 16px (see index.css) so iOS never zooms on focus
 *
 * The value goes up on every keystroke, not on blur. Blur-only looks identical
 * until you type a number and tap Save without touching anything else first:
 * on iOS the button takes the tap without moving focus, blur never fires, and
 * the number you just typed is thrown away while everything you typed earlier
 * saves — which reads as "the app doesn't save". The draft still owns what is
 * *displayed*, so live-committing costs nothing: "12." keeps showing "12." even
 * though 12 is what went upstream.
 */
export default function NumberField({
  value,
  onChange,
  step = 1,
  min = 0,
  suffix,
  label,
  placeholder = '0',
  steppers = false,
  variant = 'form',
  done = false,
  className = '',
  ariaLabel,
}: Props) {
  const { t } = useT()
  // While `draft` is non-null the input owns its own text; outside of that it
  // renders straight from props, so external updates flow in normally.
  const [draft, setDraft] = useState<string | null>(null)

  // A focused field is not a sealed one. Tapping "use last time", or the
  // progression chip, writes a new weight into every set while the field you
  // last touched still holds a draft — and on iOS a button takes the tap
  // without moving focus, so no blur ever arrives to clear it. The draft would
  // go on painting the old text over a value that had already changed
  // underneath it, which reads as the button doing nothing.
  //
  // So the draft survives only while it still agrees with the value. Typing
  // pushes on every keystroke, so mid-word the two always agree and "12." is
  // left alone; an external write is the only thing that can disagree.
  const [seen, setSeen] = useState(value)
  if (value !== seen) {
    setSeen(value)
    if (draft !== null && parse(draft, min) !== value) setDraft(null)
  }

  const shown = draft ?? (value === 0 ? '' : String(value))

  /** Parse and hand upstream. An unparseable field is a zero, same as empty. */
  const push = (raw: string) => onChange(parse(raw, min))

  const nudge = (delta: number) => {
    const next = Math.max(min, Math.round((value + delta) * 100) / 100)
    onChange(next)
    setDraft(null)
  }

  // ── The keyboard bar ──────────────────────────────────────────────────────
  // A grid cell is 60px wide and has no room for −/+ beside it, but the strip
  // above the on-screen keyboard is empty for exactly as long as the cell is
  // focused. So the focused cell publishes itself and `SetInputBar` draws the
  // controls up there instead. Form fields keep their own inline steppers.
  const isCell = variant === 'cell'
  const fieldId = useId()
  const inputRef = useRef<HTMLInputElement>(null)
  const [focused, setFocused] = useState(false)

  // Read through a ref so the published callback always nudges from the
  // current value, without the bar having to re-subscribe on every keystroke.
  const nudgeRef = useRef(nudge)
  nudgeRef.current = nudge

  useEffect(() => {
    if (!isCell || !focused) return
    const cells = setInputCells()
    const index = cells.indexOf(inputRef.current as HTMLInputElement)
    useSetInputBar.getState().focus({
      key: fieldId,
      value,
      step,
      min,
      label: ariaLabel ?? '',
      hasNext: index >= 0 && index < cells.length - 1,
      nudge: (delta) => nudgeRef.current(delta),
    })
  }, [isCell, focused, value, step, min, ariaLabel, fieldId])

  // Unmounting while focused — finishing an exercise, deleting a set — has to
  // take the bar with it, or it goes on offering to change a set that is gone.
  useEffect(() => () => useSetInputBar.getState().blur(fieldId), [fieldId])

  return (
    <div className={className}>
      {label && <label className="mb-1 block text-xs font-medium text-ink-200">{label}</label>}
      <div className="flex items-stretch gap-1">
        {steppers && (
          <button
            type="button"
            onClick={() => nudge(-step)}
            className="rounded-xl bg-ink-700 px-3 text-ink-100 active:bg-ink-600"
            aria-label={t('common.decrease')}
          >
            <Minus size={16} />
          </button>
        )}

        <div className="relative flex-1">
          <input
            ref={inputRef}
            type="text"
            inputMode="decimal"
            // The pad's own key says what the bar's button says: keep going
            // down the workout, or put the keyboard away at the last cell.
            enterKeyHint={isCell ? 'next' : 'done'}
            // How the bar finds the cells and walks between them.
            data-set-cell={isCell ? '' : undefined}
            value={shown}
            placeholder={placeholder}
            onChange={(event) => {
              setDraft(event.target.value)
              push(event.target.value)
            }}
            onFocus={(event) => {
              setDraft(shown)
              event.target.select()
              setFocused(true)
            }}
            // Hands the draft back to the prop, so a field left as "12." or ""
            // settles to how the number actually reads.
            onBlur={(event) => {
              push(event.target.value)
              setDraft(null)
              setFocused(false)
              useSetInputBar.getState().blur(fieldId)
            }}
            onKeyDown={(event) => {
              if (event.key !== 'Enter') return
              if (!isCell || !focusNextSetCell()) event.currentTarget.blur()
            }}
            aria-label={ariaLabel}
            // Two different controls, not one control with a modifier. `.field`
            // is a form input: 16px of side padding, which is right under a
            // label and wrong in a 70px grid box — it left 22px of text room and
            // a centred "77.5" rendered as "7.5", the wrong number, silently.
            // `.field-num` is that box's own control and needs no override.
            // (ps/pe are logical and are emitted after px in Tailwind's utility
            // order, so they still win over `.field` where they are used.)
            className={
              variant === 'cell'
                ? `field-num ${done ? 'field-num-done' : ''}`
                : `tabular field w-full ps-2 text-center font-semibold ${
                    suffix ? 'pe-9' : 'pe-2'
                  }`
            }
          />
          {suffix && (
            <span className="pointer-events-none absolute inset-y-0 end-3 flex items-center text-xs text-ink-300">
              {suffix}
            </span>
          )}
        </div>

        {steppers && (
          <button
            type="button"
            onClick={() => nudge(step)}
            className="rounded-xl bg-ink-700 px-3 text-ink-100 active:bg-ink-600"
            aria-label={t('common.increase')}
          >
            <Plus size={16} />
          </button>
        )}
      </div>
    </div>
  )
}
