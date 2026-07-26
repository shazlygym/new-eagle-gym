import { useState } from 'react'
import type { Equipment, MuscleGroup, Tracking } from '../db/schema'
import { useT } from '../i18n'
import type { TranslationKey } from '../i18n/en'
import SegmentedControl from './SegmentedControl'
import Sheet from './Sheet'

export const MUSCLE_GROUPS: MuscleGroup[] = [
  'chest',
  'back',
  'shoulders',
  'arms',
  'legs',
  'core',
  'cardio',
  'fullBody',
]

export const EQUIPMENT: Equipment[] = [
  'barbell',
  'dumbbell',
  'machine',
  'cable',
  'bodyweight',
  'other',
]

export interface NewExerciseInput {
  nameEn: string
  nameAr: string
  muscleGroup: MuscleGroup
  equipment: Equipment
  tracking: Tracking
  videoUrl?: string
}

interface Props {
  open: boolean
  onClose: () => void
  onCreate: (input: NewExerciseInput) => Promise<void>
  /** Present when editing rather than creating. */
  initial?: NewExerciseInput
}

/**
 * Shared by the Exercises library and the in-workout picker — hitting an
 * exercise the app doesn't know about happens mid-session, at the rack, and
 * shouldn't mean abandoning the workout to go and add it.
 */
export default function NewExerciseSheet({ open, onClose, onCreate, initial }: Props) {
  const { t } = useT()
  // Mounted fresh each time it opens (see the callers), so seeding state from
  // `initial` here is enough to make this both a create and an edit form.
  const [nameEn, setNameEn] = useState(initial?.nameEn ?? '')
  const [nameAr, setNameAr] = useState(initial?.nameAr ?? '')
  const [muscleGroup, setMuscleGroup] = useState<MuscleGroup>(initial?.muscleGroup ?? 'chest')
  const [equipment, setEquipment] = useState<Equipment>(initial?.equipment ?? 'barbell')
  const [tracking, setTracking] = useState<Tracking>(initial?.tracking ?? 'reps')
  const [videoUrl, setVideoUrl] = useState(initial?.videoUrl ?? '')
  const [error, setError] = useState<string | null>(null)

  const submit = async () => {
    if (!nameEn.trim() && !nameAr.trim()) {
      setError(t('exercises.nameRequired'))
      return
    }
    // One name is enough — it stands in for the other language rather than
    // leaving a blank row after a language switch.
    await onCreate({
      nameEn: nameEn.trim() || nameAr.trim(),
      nameAr: nameAr.trim() || nameEn.trim(),
      muscleGroup,
      equipment,
      tracking,
      videoUrl: videoUrl.trim() || undefined,
    })
    setNameEn('')
    setNameAr('')
    setVideoUrl('')
    setError(null)
  }

  return (
    <Sheet open={open} onClose={onClose} title={initial ? t('exercises.edit') : t('exercises.new')} tall>
      <div className="space-y-4">
        <div>
          <label className="mb-1.5 block text-xs font-medium text-ink-200" htmlFor="ex-ar">
            {t('exercises.nameAr')}
          </label>
          <input
            id="ex-ar"
            value={nameAr}
            onChange={(event) => {
              setNameAr(event.target.value)
              setError(null)
            }}
            dir="rtl"
            className="field"
          />
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-medium text-ink-200" htmlFor="ex-en">
            {t('exercises.nameEn')}
          </label>
          <input
            id="ex-en"
            value={nameEn}
            onChange={(event) => {
              setNameEn(event.target.value)
              setError(null)
            }}
            dir="ltr"
            className="field"
          />
        </div>

        <div>
          <span className="mb-1.5 block text-xs font-medium text-ink-200">
            {t('exercises.group')}
          </span>
          <div className="flex flex-wrap gap-2">
            {MUSCLE_GROUPS.map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => setMuscleGroup(value)}
                className={`rounded-full px-3.5 py-1.5 text-xs font-medium transition-colors
                            ${muscleGroup === value ? 'bg-brand-500 text-white' : 'bg-ink-700 text-ink-200'}`}
              >
                {t(`group.${value}` as TranslationKey)}
              </button>
            ))}
          </div>
        </div>

        <div>
          <span className="mb-1.5 block text-xs font-medium text-ink-200">
            {t('exercises.equipment')}
          </span>
          <div className="flex flex-wrap gap-2">
            {EQUIPMENT.map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => setEquipment(value)}
                className={`rounded-full px-3.5 py-1.5 text-xs font-medium transition-colors
                            ${equipment === value ? 'bg-brand-500 text-white' : 'bg-ink-700 text-ink-200'}`}
              >
                {t(`equipment.${value}` as TranslationKey)}
              </button>
            ))}
          </div>
        </div>

        <div>
          <span className="mb-1.5 block text-xs font-medium text-ink-200">
            {t('exercises.tracking')}
          </span>
          <SegmentedControl<Tracking>
            value={tracking}
            onChange={setTracking}
            options={[
              { value: 'reps', label: t('exercises.trackingReps') },
              { value: 'duration', label: t('exercises.trackingDuration') },
            ]}
          />
          <p className="mt-1.5 text-xs leading-relaxed text-ink-300">
            {t('exercises.trackingHint')}
          </p>
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-medium text-ink-200" htmlFor="ex-video">
            {t('exercises.video')} <span className="text-ink-400">({t('common.optional')})</span>
          </label>
          <input
            id="ex-video"
            type="url"
            inputMode="url"
            value={videoUrl}
            onChange={(event) => setVideoUrl(event.target.value)}
            placeholder="https://youtube.com/watch?v=..."
            dir="ltr"
            className="field"
          />
          <p className="mt-1.5 text-xs leading-relaxed text-ink-300">{t('exercises.videoHint')}</p>
        </div>

        {error && <p className="text-xs text-red-400">{error}</p>}

        <button type="button" onClick={submit} className="btn-primary w-full">
          {initial ? t('common.save') : t('exercises.create')}
        </button>
      </div>
    </Sheet>
  )
}
