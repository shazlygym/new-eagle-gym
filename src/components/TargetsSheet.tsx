import { Calculator, Sparkles } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import type { ActivityLevel, NutritionGoal, Profile, Sex } from '../db/schema'
import { useT } from '../i18n'
import type { TranslationKey } from '../i18n/en'
import { toDisplayWeight, toStoredWeight, unitLabel } from '../lib/format'
import {
  ACTIVITY_LEVELS,
  NUTRITION_GOALS,
  ageFromBirthYear,
  birthYearFromAge,
  suggestTargets,
} from '../lib/nutritionMath'
import MacroLine from './MacroLine'
import NumberField from './NumberField'
import Sheet from './Sheet'

interface Props {
  open: boolean
  profile: Profile
  /** Latest logged body weight, in kilograms — saves typing it again. */
  latestWeightKg?: number
  onClose: () => void
  onSave: (patch: Partial<Profile>) => Promise<void>
}

const ACTIVITY_LABEL: Record<ActivityLevel, TranslationKey> = {
  sedentary: 'activity.sedentary',
  light: 'activity.light',
  moderate: 'activity.moderate',
  high: 'activity.high',
}

const GOAL_LABEL: Record<NutritionGoal, TranslationKey> = {
  cut: 'goal.cut',
  maintain: 'goal.maintain',
  bulk: 'goal.bulk',
}

/**
 * Daily targets, either worked out or typed in.
 *
 * The calculator is the point of the sheet: almost nobody knows their own
 * calorie number, and a nutrition tab that opens on four empty fields is a
 * nutrition tab that never gets used. Typing them in stays available for the
 * member whose coach already gave them numbers.
 */
export default function TargetsSheet({ open, profile, latestWeightKg, onClose, onSave }: Props) {
  const { t, locale } = useT()

  const [kcal, setKcal] = useState(0)
  const [protein, setProtein] = useState(0)
  const [carbs, setCarbs] = useState(0)
  const [fat, setFat] = useState(0)

  const [sex, setSex] = useState<Sex>('male')
  const [age, setAge] = useState(0)
  const [heightCm, setHeightCm] = useState(0)
  // Held in the member's display unit; converted back to kg on save.
  const [weight, setWeight] = useState(0)
  const [activity, setActivity] = useState<ActivityLevel>('moderate')
  const [goal, setGoal] = useState<NutritionGoal>('maintain')
  const [calcOpen, setCalcOpen] = useState(false)

  // Read through a ref, and depend on `open` alone: the profile arrives from a
  // live query, so putting it in the dependency list would wipe half-typed
  // numbers the moment anything else in the app wrote to the profile.
  const source = useRef({ profile, latestWeightKg })
  source.current = { profile, latestWeightKg }

  // Re-read every time the sheet is opened rather than only on mount: the sheet
  // stays mounted behind the page, so first-mount state would go stale the
  // moment anything was saved.
  useEffect(() => {
    if (!open) return
    const { profile, latestWeightKg } = source.current
    setKcal(profile.kcalTarget ?? 0)
    setProtein(profile.proteinTarget ?? 0)
    setCarbs(profile.carbsTarget ?? 0)
    setFat(profile.fatTarget ?? 0)
    setSex(profile.sex ?? 'male')
    setAge(ageFromBirthYear(profile.birthYear))
    setHeightCm(profile.heightCm ?? 0)
    setWeight(latestWeightKg ? toDisplayWeight(latestWeightKg, profile.units) : 0)
    setActivity(profile.activityLevel ?? 'moderate')
    setGoal(profile.nutritionGoal ?? 'maintain')
    // Opens on the calculator while there is nothing to show yet.
    setCalcOpen(!profile.kcalTarget)
  }, [open])

  const weightKg = toStoredWeight(weight, profile.units)
  const suggestion = suggestTargets({ sex, age, heightCm, weightKg, activity, goal })

  const apply = () => {
    if (!suggestion) return
    setKcal(suggestion.kcal)
    setProtein(suggestion.protein)
    setCarbs(suggestion.carbs)
    setFat(suggestion.fat)
  }

  const save = () =>
    onSave({
      // Zero means "don't track this one", stored as undefined so the ring
      // disappears rather than showing a 0 target.
      kcalTarget: kcal || undefined,
      proteinTarget: protein || undefined,
      carbsTarget: carbs || undefined,
      fatTarget: fat || undefined,
      // The calculator's inputs are kept so re-running it later is two taps.
      sex,
      heightCm: heightCm || undefined,
      birthYear: birthYearFromAge(age),
      activityLevel: activity,
      nutritionGoal: goal,
    })

  return (
    <Sheet open={open} onClose={onClose} title={t('nutrition.targets')} tall>
      <div className="space-y-4">
        <button
          type="button"
          onClick={() => setCalcOpen((value) => !value)}
          className={`flex w-full items-center gap-3 rounded-xl px-4 py-3 text-start transition-colors
                      ${calcOpen ? 'bg-brand-500/15 text-brand-400' : 'bg-ink-600 text-ink-100'}`}
        >
          <Calculator size={18} className="shrink-0" />
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-semibold">{t('nutrition.calculate')}</span>
            <span className="block text-xs text-ink-300">{t('nutrition.calculateHint')}</span>
          </span>
        </button>

        {calcOpen && (
          <div className="space-y-4 rounded-2xl bg-ink-700/60 p-4">
            <Choice
              label={t('nutrition.sex')}
              options={(['male', 'female'] as Sex[]).map((value) => ({
                value,
                label: t(value === 'male' ? 'nutrition.male' : 'nutrition.female'),
              }))}
              selected={sex}
              onSelect={setSex}
            />

            <div className="grid grid-cols-3 gap-3">
              <NumberField label={t('nutrition.age')} value={age} onChange={setAge} />
              <NumberField
                label={`${t('nutrition.height')} (${t('common.cm')})`}
                value={heightCm}
                onChange={setHeightCm}
              />
              <NumberField
                label={`${t('body.weight')} (${unitLabel(profile.units, locale)})`}
                value={weight}
                onChange={setWeight}
                step={0.5}
              />
            </div>

            <Choice
              label={t('nutrition.activity')}
              options={ACTIVITY_LEVELS.map((value) => ({
                value,
                label: t(ACTIVITY_LABEL[value]),
              }))}
              selected={activity}
              onSelect={setActivity}
            />

            <Choice
              label={t('nutrition.goal')}
              options={NUTRITION_GOALS.map((value) => ({ value, label: t(GOAL_LABEL[value]) }))}
              selected={goal}
              onSelect={setGoal}
            />

            {suggestion ? (
              <div className="rounded-xl border border-brand-500/30 bg-ink-800 p-3">
                <p className="tabular text-xs text-ink-300">
                  {t('nutrition.maintenance', { kcal: suggestion.tdee })} ·{' '}
                  {t('nutrition.bmr', { kcal: suggestion.bmr })}
                </p>
                <p className="tabular mt-1 text-2xl font-bold text-brand-400" dir="ltr">
                  {suggestion.kcal}
                  <span className="ms-1 text-sm font-semibold text-ink-300">
                    {t('nutrition.kcalUnit')}
                  </span>
                </p>
                <p className="mt-1 text-xs text-ink-200">
                  <MacroLine
                    protein={suggestion.protein}
                    carbs={suggestion.carbs}
                    fat={suggestion.fat}
                  />
                </p>
                <button
                  type="button"
                  onClick={apply}
                  className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl
                             bg-brand-500 py-2.5 text-sm font-semibold text-ink-950 active:bg-brand-600"
                >
                  <Sparkles size={15} />
                  {t('nutrition.useThese')}
                </button>
              </div>
            ) : (
              <p className="text-xs leading-relaxed text-ink-300">{t('nutrition.calcMissing')}</p>
            )}
          </div>
        )}

        <div className="space-y-4">
          <p className="section-title">{t('nutrition.manualTargets')}</p>
          <NumberField
            label={t('nutrition.calories')}
            value={kcal}
            onChange={setKcal}
            step={50}
            steppers
          />
          <div className="grid grid-cols-3 gap-3">
            <NumberField label={t('nutrition.protein')} value={protein} onChange={setProtein} step={5} />
            <NumberField label={t('nutrition.carbs')} value={carbs} onChange={setCarbs} step={5} />
            <NumberField label={t('nutrition.fat')} value={fat} onChange={setFat} step={5} />
          </div>
          <p className="text-xs leading-relaxed text-ink-300">{t('nutrition.targetsHint')}</p>
        </div>

        <button type="button" onClick={save} className="btn-primary w-full">
          {t('common.save')}
        </button>
      </div>
    </Sheet>
  )
}

function Choice<T extends string>({
  label,
  options,
  selected,
  onSelect,
}: {
  label: string
  options: Array<{ value: T; label: string }>
  selected: T
  onSelect: (value: T) => void
}) {
  return (
    <div>
      <span className="mb-1.5 block text-xs font-medium text-ink-200">{label}</span>
      <div className="flex flex-wrap gap-2">
        {options.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => onSelect(option.value)}
            className={`rounded-full px-3.5 py-1.5 text-xs font-medium transition-colors
                        ${
                          selected === option.value
                            ? 'bg-brand-500 text-ink-950'
                            : 'bg-ink-600 text-ink-200'
                        }`}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  )
}
