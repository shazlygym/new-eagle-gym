import { useLiveQuery } from 'dexie-react-hooks'
import { addDays, format, parseISO } from 'date-fns'
import { BookmarkPlus, ChevronLeft, ChevronRight, Plus, Target, Trash2, UtensilsCrossed } from 'lucide-react'
import { useState } from 'react'
import ConfirmDialog from '../components/ConfirmDialog'
import FoodPicker from '../components/FoodPicker'
import MacroRings, { type Totals } from '../components/MacroRings'
import PageHeader from '../components/PageHeader'
import Reveal from '../components/Reveal'
import Sheet from '../components/Sheet'
import {
  deleteMealEntry,
  listMealEntries,
  listSavedMeals,
  logMealEntry,
  logSavedMeal,
  saveSlotAsMeal,
  today,
  updateProfile,
} from '../db/repository'
import type { MealEntry, MealSlot } from '../db/schema'
import { useT } from '../i18n'
import type { TranslationKey } from '../i18n/en'
import { formatShortDay } from '../lib/format'
import { useActiveProfile } from '../lib/useActiveProfile'
import NumberField from '../components/NumberField'

const SLOTS: MealSlot[] = ['breakfast', 'lunch', 'dinner', 'snack']
const SLOT_LABEL: Record<MealSlot, TranslationKey> = {
  breakfast: 'nutrition.breakfast',
  lunch: 'nutrition.lunch',
  dinner: 'nutrition.dinner',
  snack: 'nutrition.snack',
}

export default function Nutrition() {
  const { t, locale } = useT()
  const { profile } = useActiveProfile()
  const profileId = profile?.id

  const [date, setDate] = useState(today())
  const [picking, setPicking] = useState<MealSlot | null>(null)
  const [pendingDelete, setPendingDelete] = useState<string | null>(null)
  const [savingSlot, setSavingSlot] = useState<MealSlot | null>(null)
  const [mealsOpen, setMealsOpen] = useState<MealSlot | null>(null)
  const [targetsOpen, setTargetsOpen] = useState(false)

  const entries = useLiveQuery(
    () => (profileId ? listMealEntries(profileId, date) : []),
    [profileId, date]
  ) ?? []
  const savedMeals = useLiveQuery(() => (profileId ? listSavedMeals(profileId) : []), [profileId]) ?? []

  if (!profile) return null

  const totals = entries.reduce<Totals>(
    (sum, entry) => ({
      kcal: sum.kcal + entry.kcal,
      protein: sum.protein + entry.protein,
      carbs: sum.carbs + entry.carbs,
      fat: sum.fat + entry.fat,
    }),
    { kcal: 0, protein: 0, carbs: 0, fat: 0 }
  )

  const shift = (days: number) => setDate(format(addDays(parseISO(date), days), 'yyyy-MM-dd'))

  return (
    <div className="pb-6">
      <PageHeader
        title={t('nutrition.title')}
        large
        action={
          <button
            type="button"
            onClick={() => setTargetsOpen(true)}
            aria-label={t('nutrition.targets')}
            className="rounded-xl bg-ink-700 p-2 text-brand-400 active:bg-ink-600"
          >
            <Target size={20} />
          </button>
        }
      />

      <div className="space-y-4 px-4 py-4">
        {/* Day switcher. Yesterday's log is the one people fill in most often. */}
        <div className="flex items-center justify-between rounded-xl bg-ink-700 px-2 py-1.5">
          <button
            type="button"
            onClick={() => shift(-1)}
            aria-label="previous day"
            className="rounded-lg p-2 text-ink-200 active:bg-ink-600"
          >
            <ChevronLeft size={18} className="rtl-flip" />
          </button>
          <span className="text-sm font-semibold text-ink-50">
            {date === today() ? t('nutrition.today') : formatShortDay(parseISO(date), locale)}
          </span>
          <button
            type="button"
            disabled={date >= today()}
            onClick={() => shift(1)}
            aria-label="next day"
            className="rounded-lg p-2 text-ink-200 active:bg-ink-600 disabled:opacity-25"
          >
            <ChevronRight size={18} className="rtl-flip" />
          </button>
        </div>

        <Reveal>
          <MacroRings
            totals={totals}
            targets={{
              kcal: profile.kcalTarget,
              protein: profile.proteinTarget,
              carbs: profile.carbsTarget,
              fat: profile.fatTarget,
            }}
            onSetTargets={() => setTargetsOpen(true)}
          />
        </Reveal>

        {SLOTS.map((slot, index) => {
          const slotEntries = entries.filter((entry) => entry.slot === slot)
          const slotKcal = slotEntries.reduce((sum, entry) => sum + entry.kcal, 0)

          return (
            <Reveal key={slot} index={index + 1}>
              <section className="card overflow-hidden">
                <header className="flex items-center gap-2 border-b border-ink-500/40 px-4 py-3">
                  <h2 className="min-w-0 flex-1 truncate font-semibold text-ink-50">
                    {t(SLOT_LABEL[slot])}
                  </h2>
                  {slotKcal > 0 && (
                    <span className="tabular shrink-0 text-sm font-bold text-brand-400">
                      {Math.round(slotKcal)}
                    </span>
                  )}
                  {slotEntries.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setSavingSlot(slot)}
                      aria-label={t('nutrition.saveAsMeal')}
                      className="rounded-lg p-1.5 text-ink-300 active:bg-ink-600"
                    >
                      <BookmarkPlus size={17} />
                    </button>
                  )}
                </header>

                {slotEntries.length > 0 && (
                  <ul className="divide-y divide-ink-500/30">
                    {slotEntries.map((entry) => (
                      <li key={entry.id} className="flex items-center gap-3 px-4 py-2.5">
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm text-ink-50">
                            {locale === 'ar' ? entry.nameAr : entry.nameEn}
                          </p>
                          <p className="tabular mt-0.5 text-xs text-ink-300">
                            <span dir="ltr">
                              {entry.grams} {t('common.g')}
                            </span>{' '}
                            · {entry.protein}P {entry.carbs}C {entry.fat}F
                          </p>
                        </div>
                        <span className="tabular shrink-0 text-sm font-semibold text-ink-100">
                          {entry.kcal}
                        </span>
                        <button
                          type="button"
                          onClick={() => setPendingDelete(entry.id)}
                          aria-label={t('common.delete')}
                          className="shrink-0 rounded-lg p-1.5 text-ink-400 active:bg-ink-600"
                        >
                          <Trash2 size={15} />
                        </button>
                      </li>
                    ))}
                  </ul>
                )}

                <div className="flex gap-2 p-3">
                  <button
                    type="button"
                    onClick={() => setPicking(slot)}
                    className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-ink-600
                               py-2.5 text-xs font-semibold text-ink-100 active:bg-ink-500"
                  >
                    <Plus size={15} />
                    {t('nutrition.addFood')}
                  </button>
                  {savedMeals.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setMealsOpen(slot)}
                      aria-label={t('nutrition.savedMeals')}
                      className="rounded-xl bg-ink-600 px-3 text-brand-400 active:bg-ink-500"
                    >
                      <UtensilsCrossed size={15} />
                    </button>
                  )}
                </div>
              </section>
            </Reveal>
          )
        })}

        {entries.length === 0 && (
          <p className="px-2 pt-2 text-center text-sm text-ink-300">
            {t('nutrition.emptyDayHint')}
          </p>
        )}
      </div>

      <FoodPicker
        open={picking !== null}
        profileId={profile.id}
        onClose={() => setPicking(null)}
        onPick={async (food, grams) => {
          if (!picking) return
          await logMealEntry(profile.id, { date, slot: picking, food, grams })
          setPicking(null)
        }}
      />

      <SavedMealsSheet
        open={mealsOpen !== null}
        meals={savedMeals}
        onClose={() => setMealsOpen(null)}
        onPick={async (mealId) => {
          const meal = savedMeals.find((m) => m.id === mealId)
          if (!meal || !mealsOpen) return
          await logSavedMeal(profile.id, meal, date, mealsOpen)
          setMealsOpen(null)
        }}
      />

      <SaveMealSheet
        open={savingSlot !== null}
        onClose={() => setSavingSlot(null)}
        onSave={async (name) => {
          if (!savingSlot) return
          await saveSlotAsMeal(
            profile.id,
            entries.filter((entry) => entry.slot === savingSlot),
            name,
            name
          )
          setSavingSlot(null)
        }}
      />

      <TargetsSheet
        open={targetsOpen}
        onClose={() => setTargetsOpen(false)}
        initial={{
          kcal: profile.kcalTarget ?? 0,
          protein: profile.proteinTarget ?? 0,
          carbs: profile.carbsTarget ?? 0,
          fat: profile.fatTarget ?? 0,
        }}
        onSave={async (values) => {
          await updateProfile(profile.id, {
            // Zero means "don't track this one", stored as undefined so the ring
            // disappears rather than showing a 0 target.
            kcalTarget: values.kcal || undefined,
            proteinTarget: values.protein || undefined,
            carbsTarget: values.carbs || undefined,
            fatTarget: values.fat || undefined,
          })
          setTargetsOpen(false)
        }}
      />

      <ConfirmDialog
        open={pendingDelete !== null}
        title={t('nutrition.deleteEntry')}
        confirmLabel={t('common.delete')}
        destructive
        onCancel={() => setPendingDelete(null)}
        onConfirm={() => {
          if (pendingDelete) void deleteMealEntry(pendingDelete)
          setPendingDelete(null)
        }}
      />
    </div>
  )
}

function SavedMealsSheet({
  open,
  meals,
  onClose,
  onPick,
}: {
  open: boolean
  meals: Array<{ id: string; nameAr: string; nameEn: string; items: unknown[] }>
  onClose: () => void
  onPick: (id: string) => void
}) {
  const { t, locale } = useT()

  return (
    <Sheet open={open} onClose={onClose} title={t('nutrition.savedMeals')}>
      {meals.length === 0 ? (
        <p className="py-10 text-center text-sm text-ink-300">{t('nutrition.noSavedMealsHint')}</p>
      ) : (
        <ul className="space-y-1.5">
          {meals.map((meal) => (
            <li key={meal.id}>
              <button
                type="button"
                onClick={() => onPick(meal.id)}
                className="flex w-full items-center gap-3 rounded-xl bg-ink-600 px-4 py-3 text-start active:bg-ink-500"
              >
                <span className="min-w-0 flex-1 truncate text-sm font-medium text-ink-50">
                  {locale === 'ar' ? meal.nameAr : meal.nameEn}
                </span>
                <span className="shrink-0 text-xs text-ink-300">
                  {t('nutrition.itemsCount', { count: meal.items.length })}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </Sheet>
  )
}

function SaveMealSheet({
  open,
  onClose,
  onSave,
}: {
  open: boolean
  onClose: () => void
  onSave: (name: string) => Promise<void>
}) {
  const { t } = useT()
  const [name, setName] = useState('')

  return (
    <Sheet open={open} onClose={onClose} title={t('nutrition.saveAsMeal')}>
      <div className="space-y-4">
        <div>
          <label className="mb-1.5 block text-xs font-medium text-ink-200" htmlFor="meal-name">
            {t('nutrition.mealName')}
          </label>
          <input
            id="meal-name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            className="field"
          />
        </div>
        <button
          type="button"
          disabled={!name.trim()}
          onClick={async () => {
            await onSave(name.trim())
            setName('')
          }}
          className="btn-primary w-full"
        >
          {t('common.save')}
        </button>
      </div>
    </Sheet>
  )
}

function TargetsSheet({
  open,
  initial,
  onClose,
  onSave,
}: {
  open: boolean
  initial: Totals
  onClose: () => void
  onSave: (values: Totals) => Promise<void>
}) {
  const { t } = useT()
  const [values, setValues] = useState(initial)

  return (
    <Sheet open={open} onClose={onClose} title={t('nutrition.targets')}>
      <div className="space-y-4">
        <p className="text-xs leading-relaxed text-ink-300">{t('nutrition.setTargetsHint')}</p>
        <NumberField
          label={t('nutrition.calories')}
          value={values.kcal}
          onChange={(kcal) => setValues({ ...values, kcal })}
          step={50}
          steppers
        />
        <div className="grid grid-cols-3 gap-3">
          <NumberField
            label={t('nutrition.protein')}
            value={values.protein}
            onChange={(protein) => setValues({ ...values, protein })}
            step={5}
          />
          <NumberField
            label={t('nutrition.carbs')}
            value={values.carbs}
            onChange={(carbs) => setValues({ ...values, carbs })}
            step={5}
          />
          <NumberField
            label={t('nutrition.fat')}
            value={values.fat}
            onChange={(fat) => setValues({ ...values, fat })}
            step={5}
          />
        </div>
        <p className="text-xs leading-relaxed text-ink-300">{t('nutrition.targetsHint')}</p>
        <button type="button" onClick={() => onSave(values)} className="btn-primary w-full">
          {t('common.save')}
        </button>
      </div>
    </Sheet>
  )
}

export type { MealEntry }
