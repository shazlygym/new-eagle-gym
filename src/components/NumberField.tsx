import { Minus, Plus } from 'lucide-react'
import { useState } from 'react'
import { useT } from '../i18n'

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
  className?: string
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
  className = '',
}: Props) {
  const { t } = useT()
  // While `draft` is non-null the input owns its own text; outside of that it
  // renders straight from props, so external updates flow in normally.
  const [draft, setDraft] = useState<string | null>(null)
  const shown = draft ?? (value === 0 ? '' : String(value))

  /** Parse and hand upstream. An unparseable field is a zero, same as empty. */
  const push = (raw: string) => {
    const parsed = Number.parseFloat(raw.replace(',', '.'))
    onChange(Number.isFinite(parsed) ? Math.max(min, parsed) : 0)
  }

  const nudge = (delta: number) => {
    const next = Math.max(min, Math.round((value + delta) * 100) / 100)
    onChange(next)
    setDraft(null)
  }

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
            type="text"
            inputMode="decimal"
            enterKeyHint="done"
            value={shown}
            placeholder={placeholder}
            onChange={(event) => {
              setDraft(event.target.value)
              push(event.target.value)
            }}
            onFocus={(event) => {
              setDraft(shown)
              event.target.select()
            }}
            // Hands the draft back to the prop, so a field left as "12." or ""
            // settles to how the number actually reads.
            onBlur={(event) => {
              push(event.target.value)
              setDraft(null)
            }}
            onKeyDown={(event) => event.key === 'Enter' && event.currentTarget.blur()}
            // .field's px-4 is right for a full-width form field and wrong here:
            // in the workout grid the box is ~57px, so 32px of padding left 22px
            // of text room and a centred "77.5" rendered as "7.5" — the wrong
            // number, silently. ps/pe are logical and are emitted after px in
            // Tailwind's utility order, so they win over the component class.
            className={`tabular field w-full ps-2 text-center font-semibold ${
              suffix ? 'pe-9' : 'pe-2'
            }`}
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
