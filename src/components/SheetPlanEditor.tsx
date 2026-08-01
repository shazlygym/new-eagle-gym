import { useState } from 'react'
import type { RoutineItem } from '../db/schema'
import { useT } from '../i18n'
import { normalizeRepTarget } from '../lib/repRange'
import NumberField from './NumberField'
import Sheet from './Sheet'

interface Props {
  title: string
  item: RoutineItem
  /** A hold is measured in seconds, so it gets one box instead of a range. */
  timed: boolean
  onClose: () => void
  onSave: (item: RoutineItem) => Promise<void>
}

/**
 * The plan side of a row — sets, rest and the rep range — changed from the grid
 * itself. Noticing "this should have been four sets" while reading the weeks is
 * exactly when you want to fix it, and sending people to a different screen to
 * do it is how a plan stays wrong for a month.
 */
export default function SheetPlanEditor({ title, item, timed, onClose, onSave }: Props) {
  const { t } = useT()
  const [draft, setDraft] = useState<RoutineItem>(item)
  const [saving, setSaving] = useState(false)

  const save = async () => {
    if (saving) return
    setSaving(true)
    try {
      await onSave({ ...draft, targetSets: Math.max(1, Math.round(draft.targetSets)) })
      onClose()
    } finally {
      setSaving(false)
    }
  }

  return (
    <Sheet open onClose={onClose} title={title}>
      <div className="grid grid-cols-2 gap-2">
        <NumberField
          label={t('routines.targetSets')}
          value={draft.targetSets}
          steppers
          onChange={(value) => setDraft((current) => ({ ...current, targetSets: Math.round(value) }))}
        />
        <NumberField
          label={t('routines.rest')}
          value={draft.restSeconds}
          step={15}
          steppers
          onChange={(value) =>
            setDraft((current) => ({ ...current, restSeconds: Math.round(value) }))
          }
        />
      </div>

      {timed ? (
        <div className="mt-3">
          <NumberField
            label={t('routines.targetTime')}
            value={draft.targetReps}
            step={5}
            suffix={t('common.sec')}
            onChange={(value) => setDraft((current) => ({ ...current, targetReps: Math.round(value) }))}
          />
        </div>
      ) : (
        <div className="mt-3">
          <span className="mb-1 block text-xs font-medium text-ink-200">
            {t('routines.repRange')}
          </span>
          {/* Forced left-to-right: it is one numeric expression, and in RTL the
              two boxes flip so the range reads "12–8". Safe because the label
              and hint sit outside it. */}
          <div className="flex items-center gap-2" dir="ltr">
            <NumberField
              className="flex-1"
              value={draft.targetReps}
              onChange={(value) =>
                setDraft((current) => ({
                  ...current,
                  ...normalizeRepTarget(value, current.targetRepsMax),
                }))
              }
            />
            <span className="shrink-0 text-sm font-medium text-ink-300">–</span>
            <NumberField
              className="flex-1"
              value={draft.targetRepsMax ?? 0}
              placeholder={t('common.empty')}
              onChange={(value) =>
                setDraft((current) => ({
                  ...current,
                  ...normalizeRepTarget(current.targetReps, value),
                }))
              }
            />
          </div>
        </div>
      )}

      <button
        type="button"
        onClick={save}
        disabled={saving}
        className="btn-primary mt-4 w-full disabled:opacity-60"
      >
        {t('common.save')}
      </button>
    </Sheet>
  )
}
