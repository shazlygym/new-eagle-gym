import { ChevronDown, ChevronUp, Link2, Trash2, type LucideIcon } from 'lucide-react'
import { useT } from '../i18n'
import Sheet from './Sheet'

interface Props {
  open: boolean
  onClose: () => void
  /** Disabled at the top of the list; also hides "link to previous". */
  isFirst: boolean
  isLast: boolean
  inSuperset: boolean
  onMove: (direction: -1 | 1) => void
  onToggleSuperset: () => void
  onRemove: () => void
}

/**
 * The rearranging actions, moved off the card header.
 *
 * They used to be five unlabelled 29px icon buttons crammed next to the
 * exercise name — under the 44pt minimum, ambiguous without a legend, and
 * competing for the row with the thing you actually tap most (the name). They
 * are also the rarest actions on the card: you reorder a workout once, if ever,
 * and you tick sets all session. Here each one gets a full-width row, a label
 * and enough height to hit while holding a dumbbell.
 */
export default function ExerciseActionsSheet({
  open,
  onClose,
  isFirst,
  isLast,
  inSuperset,
  onMove,
  onToggleSuperset,
  onRemove,
}: Props) {
  const { t } = useT()

  return (
    <Sheet open={open} onClose={onClose} title={t('workout.exerciseActions')}>
      <div className="space-y-1.5 pb-2">
        <Row
          icon={ChevronUp}
          label={t('workout.moveUp')}
          disabled={isFirst}
          onClick={() => {
            onMove(-1)
            onClose()
          }}
        />
        <Row
          icon={ChevronDown}
          label={t('workout.moveDown')}
          disabled={isLast}
          onClick={() => {
            onMove(1)
            onClose()
          }}
        />
        {/* A superset links an exercise to the one above it, so the first
            exercise in the list has nothing to link to. */}
        {!isFirst && (
          <Row
            icon={Link2}
            label={inSuperset ? t('workout.breakSuperset') : t('workout.makeSuperset')}
            hint={t('workout.supersetHint')}
            accent={inSuperset}
            onClick={() => {
              onToggleSuperset()
              onClose()
            }}
          />
        )}
        <Row
          icon={Trash2}
          label={t('workout.removeExercise')}
          destructive
          onClick={() => {
            onClose()
            onRemove()
          }}
        />
      </div>
    </Sheet>
  )
}

function Row({
  icon: Icon,
  label,
  hint,
  onClick,
  disabled,
  destructive,
  accent,
}: {
  icon: LucideIcon
  label: string
  hint?: string
  onClick: () => void
  disabled?: boolean
  destructive?: boolean
  accent?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`flex w-full items-center gap-3 rounded-xl bg-ink-700 px-4 py-3.5 text-start
                  active:bg-ink-600 disabled:opacity-35
                  ${destructive ? 'text-danger-400' : accent ? 'text-aqua-300' : 'text-ink-50'}`}
    >
      <Icon size={18} className="shrink-0" />
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-medium">{label}</span>
        {hint && <span className="mt-0.5 block text-xs text-ink-300">{hint}</span>}
      </span>
    </button>
  )
}
