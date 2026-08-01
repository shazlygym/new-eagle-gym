import { Plus, TrendingUp, Trash2 } from 'lucide-react'
import { useState } from 'react'
import type { SheetSetInput } from '../db/repository'
import type { SetEntry, SetType, Units } from '../db/schema'
import { useT } from '../i18n'
import {
  formatClock,
  formatNumber,
  ltrIsolate,
  toDisplayWeight,
  toStoredWeight,
  unitLabel,
} from '../lib/format'
import { SUGGESTION_REASON, type Suggestion } from '../lib/progression'
import NumberField from './NumberField'
import Sheet from './Sheet'

interface Props {
  title: string
  /** Reps or seconds — a plank's cell asks for a hold, not a rep count. */
  timed: boolean
  units: Units
  /** What is in the cell now. Empty for a week not yet logged. */
  current: SetEntry[]
  /** The column to its right — what the sheet is here to show you. */
  previous: SetEntry[]
  previousLabel: string
  /** How many rows to open with when there is nothing to copy. */
  targetSets: number
  /** What the progression rule makes of the weeks behind this cell. */
  suggestion?: Suggestion | null
  onClose: () => void
  onSave: (sets: SheetSetInput[]) => Promise<void>
}

interface DraftRow {
  key: string
  /** In display units — converted back to kilograms on save. */
  weight: number
  reps: number
  seconds: number
  setType: SetType
}

let nextKey = 0
const key = () => `row-${(nextKey += 1)}`

function toDraft(set: SetEntry, units: Units): DraftRow {
  return {
    key: key(),
    weight: toDisplayWeight(set.weight, units),
    reps: set.reps,
    seconds: set.durationSeconds ?? 0,
    setType: set.setType,
  }
}

const blank = (): DraftRow => ({ key: key(), weight: 0, reps: 0, seconds: 0, setType: 'working' })

/**
 * The cell editor: last week on top, this week underneath.
 *
 * Logging a week is almost never a fresh decision — it is last week's numbers
 * with one of them nudged. So the previous column is pinned above the fields
 * rather than left behind on the grid, and an empty cell opens pre-filled with
 * it: agreeing with last week costs one tap, and beating it costs two.
 *
 * Every edit stays local until Save. One commit means a half-typed row can never
 * reach the log, and the sheet behind never reflows while you are typing in it.
 */
export default function SheetCellEditor({
  title,
  timed,
  units,
  current,
  previous,
  previousLabel,
  targetSets,
  suggestion,
  onClose,
  onSave,
}: Props) {
  const { t, locale } = useT()
  const [saving, setSaving] = useState(false)

  // Seeded once: the component is mounted per cell, so opening a different one
  // re-runs this rather than carrying the last cell's numbers across.
  const [rows, setRows] = useState<DraftRow[]>(() => {
    if (current.length > 0) return current.map((set) => toDraft(set, units))
    if (previous.length > 0) return previous.map((set) => toDraft(set, units))
    return Array.from({ length: Math.max(1, targetSets) }, blank)
  })

  const patch = (index: number, changes: Partial<DraftRow>) => {
    setRows((all) => all.map((row, i) => (i === index ? { ...row, ...changes } : row)))
  }

  /**
   * Write the suggested load across every row, opening the reps at the bottom of
   * the range. It fills the fields rather than saving: the suggestion is an
   * opening bid, and the set you actually got is the one that belongs in the log.
   */
  const applySuggestion = () => {
    if (!suggestion) return
    const weight = toDisplayWeight(suggestion.weight, units)
    setRows((all) => {
      const filled = all.map((row) => ({ ...row, weight, reps: suggestion.reps }))
      // A first-ever cell opens with one blank row; the plan asked for more.
      while (filled.length < Math.max(1, targetSets)) {
        filled.push({ ...blank(), weight, reps: suggestion.reps })
      }
      return filled
    })
  }

  const save = async () => {
    if (saving) return
    setSaving(true)
    try {
      await onSave(
        rows.map((row) => ({
          weight: toStoredWeight(row.weight, units),
          reps: timed ? 0 : row.reps,
          durationSeconds: timed ? row.seconds : undefined,
          setType: row.setType,
        }))
      )
      onClose()
    } finally {
      setSaving(false)
    }
  }

  return (
    <Sheet open onClose={onClose} title={title}>
      <div className="mb-4 rounded-2xl border border-ink-500/50 bg-ink-900 p-3">
        <p className="mb-2 text-[11px] font-medium text-ink-300">{previousLabel}</p>
        {previous.length === 0 ? (
          <p className="text-xs text-ink-400">{t('sheet.noPrevious')}</p>
        ) : (
          <div className="flex flex-wrap gap-1.5">
            {previous.map((set) => (
              <span
                key={set.id}
                className="tabular rounded-lg bg-ink-600 px-2.5 py-1 text-xs text-ink-50"
              >
                {/* Digits and an × with no strong character anywhere — bare in
                    Arabic the paragraph direction lays "70 × 10" out as
                    "10 × 70", which reads as ten kilos for seventy reps. */}
                {ltrIsolate(
                  set.durationSeconds
                    ? formatClock(set.durationSeconds)
                    : `${formatNumber(toDisplayWeight(set.weight, units))} × ${set.reps}`
                )}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* The one call the sheet can make for you. It sits between last week and
          the fields because that is the order the decision is made in: this is
          what you did, this is what the rule says next, now type. */}
      {suggestion && !timed && (
        <button
          type="button"
          onClick={applySuggestion}
          className="mb-4 flex w-full items-center gap-2.5 rounded-2xl border border-brand-500/25
                     bg-brand-500/[0.07] px-3 py-2.5 text-start active:bg-brand-500/15"
        >
          <TrendingUp size={15} className="shrink-0 text-brand-500" />
          <span className="min-w-0 flex-1">
            <span className="block text-xs font-semibold text-ink-50">
              {t('sheet.useSuggestion')}
            </span>
            <span className="mt-0.5 block text-[11px] leading-snug text-ink-300">
              {t(SUGGESTION_REASON[suggestion.reason])}
            </span>
          </span>
          {/* Weight and reps in one isolated run, the unit in its own — mixed
              together, the Arabic unit label turns "77.5×8" around behind it. */}
          <span className="shrink-0 text-end">
            <span className="tabular font-numeric block text-sm font-bold text-brand-500">
              {ltrIsolate(
                `${formatNumber(toDisplayWeight(suggestion.weight, units))}×${suggestion.reps}`
              )}
            </span>
            <span className="block text-[10px] font-medium text-ink-300">
              {unitLabel(units, locale)}
            </span>
          </span>
        </button>
      )}

      <ul className="space-y-2">
        {rows.map((row, index) => (
          <li key={row.key} className="flex items-end gap-2">
            <span className="tabular w-6 shrink-0 pb-3 text-center text-xs font-semibold text-ink-300">
              {index + 1}
            </span>

            {timed ? (
              <NumberField
                className="flex-1"
                label={t('sheet.hold')}
                value={row.seconds}
                step={5}
                suffix={t('common.sec')}
                onChange={(value) => patch(index, { seconds: value })}
              />
            ) : (
              <>
                <NumberField
                  className="flex-1"
                  label={unitLabel(units, locale)}
                  value={row.weight}
                  step={2.5}
                  onChange={(value) => patch(index, { weight: value })}
                />
                <NumberField
                  className="flex-1"
                  label={t('sheet.reps')}
                  value={row.reps}
                  onChange={(value) => patch(index, { reps: value })}
                />
              </>
            )}

            <button
              type="button"
              onClick={() => setRows((all) => all.filter((_, i) => i !== index))}
              aria-label={t('common.delete')}
              className="mb-0.5 flex h-11 w-9 shrink-0 items-center justify-center rounded-xl
                         text-ink-300 active:bg-ink-700"
            >
              <Trash2 size={16} />
            </button>
          </li>
        ))}
      </ul>

      <button
        type="button"
        // Copies the row above rather than adding an empty one: the fourth set
        // is nearly always the third set again.
        onClick={() => setRows((all) => [...all, all.length > 0 ? { ...all[all.length - 1], key: key() } : blank()])}
        className="mt-3 flex w-full items-center justify-center gap-2 rounded-2xl border
                   border-dashed border-ink-500 py-3 text-sm font-medium text-brand-500
                   active:bg-ink-700"
      >
        <Plus size={17} />
        {t('workout.addSet')}
      </button>

      <button
        type="button"
        onClick={save}
        disabled={saving}
        className="btn-primary mt-3 w-full disabled:opacity-60"
      >
        {t('common.save')}
      </button>

      <p className="mt-2 text-center text-[11px] leading-relaxed text-ink-400">
        {t('sheet.blankHint')}
      </p>
    </Sheet>
  )
}
