import { Minus, Plus } from 'lucide-react'
import { useState } from 'react'

interface Props {
  value: number
  onChange: (value: number) => void
  step?: number
  min?: number
  suffix?: string
  label?: string
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
 */
export default function NumberField({
  value,
  onChange,
  step = 1,
  min = 0,
  suffix,
  label,
  steppers = false,
  className = '',
}: Props) {
  // While `draft` is non-null the input owns its own text; outside of that it
  // renders straight from props, so external updates flow in normally.
  const [draft, setDraft] = useState<string | null>(null)
  const shown = draft ?? (value === 0 ? '' : String(value))

  const commit = (raw: string) => {
    const parsed = Number.parseFloat(raw.replace(',', '.'))
    onChange(Number.isFinite(parsed) ? Math.max(min, parsed) : 0)
    setDraft(null)
  }

  const nudge = (delta: number) => {
    const next = Math.max(min, Math.round((value + delta) * 100) / 100)
    onChange(next)
    setDraft(null)
  }

  return (
    <div className={className}>
      {label && <label className="mb-1 block text-xs font-medium text-dark-200">{label}</label>}
      <div className="flex items-stretch gap-1">
        {steppers && (
          <button
            type="button"
            onClick={() => nudge(-step)}
            className="rounded-xl bg-dark-700 px-3 text-dark-100 active:bg-dark-600"
            aria-label="decrease"
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
            placeholder="0"
            onChange={(event) => setDraft(event.target.value)}
            onFocus={(event) => {
              setDraft(shown)
              event.target.select()
            }}
            onBlur={(event) => commit(event.target.value)}
            onKeyDown={(event) => event.key === 'Enter' && event.currentTarget.blur()}
            className="tabular field w-full text-center font-semibold"
          />
          {suffix && (
            <span className="pointer-events-none absolute inset-y-0 end-3 flex items-center text-xs text-dark-300">
              {suffix}
            </span>
          )}
        </div>

        {steppers && (
          <button
            type="button"
            onClick={() => nudge(step)}
            className="rounded-xl bg-dark-700 px-3 text-dark-100 active:bg-dark-600"
            aria-label="increase"
          >
            <Plus size={16} />
          </button>
        )}
      </div>
    </div>
  )
}
