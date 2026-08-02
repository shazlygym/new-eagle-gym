import { useLiveQuery } from 'dexie-react-hooks'
import { addDays, format, parseISO } from 'date-fns'
import {
  BookmarkPlus,
  CalendarRange,
  ChevronLeft,
  ChevronRight,
  Plus,
  Target,
  Trash2,
  UtensilsCrossed,
} from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import ConfirmDialog from '../components/ConfirmDialog'
import FoodPicker from '../components/FoodPicker'
import MacroLine from '../components/MacroLine'
import MacroRings, { type Totals } from '../components/MacroRings'
import PageHeader from '../components/PageHeader'
import Reveal from '../components/Reveal'
import Sheet from '../components/Sheet'
import TargetsSheet from '../components/TargetsSheet'
import WeekCalories from '../components/WeekCalories'
import {
  deleteMealEntry,
  listBodyStats,
  listMealEntries,
  listSavedMeals,
  logMealEntry,
  logSavedMeal,
  saveSlotAsMeal,
  today,
  updateMealEntry,
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

  // `?date=` lets the history screen open a specific day. It is consumed once
  // and then dropped from the URL: leaving it there would make the day arrows
  // disagree with the address bar, and a refresh would silently jump back.
  const [params, setParams] = useSearchParams()
  const requestedDate = params.get('date')
  const [date, setDate] = useState(requestedDate ?? today())

  useEffect(() => {
    if (!requestedDate) return
    setDate(requestedDate)
    setParams({}, { replace: true })
  }, [requestedDate, setParams])

  const [picking, setPicking] = useState<MealSlot | null>(null)
  const [pendingDelete, setPendingDelete] = useState<string | null>(null)
  const [savingSlot, setSavingSlot] = useState<MealSlot | null>(null)
  const [mealsOpen, setMealsOpen] = useState<MealSlot | null>(null)
  const [targetsOpen, setTargetsOpen] = useState(false)
  const [editing, setEditing] = useState<MealEntry | null>(null)

  const entries = useLiveQuery(
    () => (profileId ? listMealEntries(profileId, date) : []),
    [profileId, date]
  ) ?? []
  const savedMeals = useLiveQuery(() => (profileId ? listSavedMeals(profileId) : []), [profileId]) ?? []
  // The calculator asks for a body weight; the member has usually logged one
  // already, so it arrives pre-filled.
  const latestWeightKg = useLiveQuery(async () => {
    if (!profileId) return undefined
    const stats = await listBodyStats(profileId)
    return [...stats].reverse().find((stat) => stat.weight)?.weight
  }, [profileId])

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
          <div className="flex shrink-0 items-center gap-2">
            <Link
              to="/nutrition/history"
              aria-label={t('nutrition.history')}
              className="icon-btn bg-ink-700 text-brand-400 active:bg-ink-600"
            >
              <CalendarRange size={20} />
            </Link>
            <button
              type="button"
              onClick={() => setTargetsOpen(true)}
              aria-label={t('nutrition.targets')}
              className="icon-btn bg-ink-700 text-brand-400 active:bg-ink-600"
            >
              <Target size={20} />
            </button>
          </div>
        }
      />

      <div className="space-y-4 px-5 py-4">
        {/* Day switcher. Yesterday's log is the one people fill in most often.
            Recessed, because it is a control you reach into rather than an
            object on the page. */}
        <div className="card-sunk flex items-center justify-between px-2 py-1.5">
          <button
            type="button"
            onClick={() => shift(-1)}
            aria-label={t('common.previous')}
            className="icon-btn-sm text-ink-200 active:bg-ink-600"
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
            aria-label={t('common.next')}
            className="icon-btn-sm text-ink-200 active:bg-ink-600 disabled:opacity-25"
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

        <Reveal index={1}>
          <WeekCalories
            profileId={profile.id}
            date={date}
            kcalTarget={profile.kcalTarget}
            onPickDate={setDate}
          />
        </Reveal>

        {SLOTS.map((slot, index) => {
          const slotEntries = entries.filter((entry) => entry.slot === slot)
          const slotKcal = slotEntries.reduce((sum, entry) => sum + entry.kcal, 0)

          return (
            <Reveal key={slot} index={index + 2}>
              <section className="card overflow-hidden">
                <header className="flex items-center gap-2 border-b border-ink-500/40 px-4 py-3">
                  <h2 className="min-w-0 flex-1 truncate font-semibold text-ink-50">
                    {t(SLOT_LABEL[slot])}
                  </h2>
                  {slotKcal > 0 && (
                    <span className="tabular font-numeric shrink-0 text-sm font-bold text-ink-100">
                      {Math.round(slotKcal)}
                    </span>
                  )}
                  {slotEntries.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setSavingSlot(slot)}
                      aria-label={t('nutrition.saveAsMeal')}
                      className="icon-btn-sm text-ink-300 active:bg-ink-600"
                    >
                      <BookmarkPlus size={17} />
                    </button>
                  )}
                </header>

                {slotEntries.length > 0 && (
                  <ul className="divide-y divide-ink-500/30">
                    {slotEntries.map((entry) => (
                      <li key={entry.id} className="flex items-center gap-3 px-4 py-2.5">
                        {/* Tapping the row edits the portion — the usual
                            correction is "it was more like 250 g", and deleting
                            and re-logging to say that is four taps too many. */}
                        <button
                          type="button"
                          onClick={() => setEditing(entry)}
                          className="min-w-0 flex-1 text-start"
                        >
                          <p className="truncate text-sm text-ink-50">
                            {locale === 'ar' ? entry.nameAr : entry.nameEn}
                          </p>
                          <p className="mt-0.5 text-xs text-ink-300">
                            <MacroLine
                              prefix={`${entry.grams}${t('common.g')}`}
                              protein={entry.protein}
                              carbs={entry.carbs}
                              fat={entry.fat}
                            />
                          </p>
                        </button>
                        <span className="tabular shrink-0 text-sm font-semibold text-ink-100">
                          {entry.kcal}
                        </span>
                        <button
                          type="button"
                          onClick={() => setPendingDelete(entry.id)}
                          aria-label={t('common.delete')}
                          className="icon-btn-sm text-ink-400 active:bg-ink-600"
                        >
                          <Trash2 size={15} />
                        </button>
                      </li>
                    ))}
                  </ul>
                )}

                {/* A hairline row rather than a filled pill in a padded tray.
                    Four meals × a 44px grey button inside a 12px tray was more
                    chrome than food on a day with two entries logged. */}
                <div
                  className={`flex items-stretch ${
                    slotEntries.length > 0 ? 'border-t border-ink-500/30' : ''
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => setPicking(slot)}
                    className="flex flex-1 items-center gap-2 px-4 py-3 text-start text-xs
                               font-semibold text-ink-200 active:bg-ink-600/60"
                  >
                    <Plus size={15} className="shrink-0 text-brand-500" />
                    {t('nutrition.addFood')}
                  </button>
                  {savedMeals.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setMealsOpen(slot)}
                      aria-label={t('nutrition.savedMeals')}
                      className="flex w-12 shrink-0 items-center justify-center border-s
                                 border-ink-500/30 text-brand-400 active:bg-ink-600/60"
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
        profile={profile}
        latestWeightKg={latestWeightKg}
        onClose={() => setTargetsOpen(false)}
        onSave={async (patch) => {
          await updateProfile(profile.id, patch)
          setTargetsOpen(false)
        }}
      />

      <EditEntrySheet
        entry={editing}
        onClose={() => setEditing(null)}
        onSave={async (grams) => {
          if (editing) await updateMealEntry(editing.id, grams)
          setEditing(null)
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
                className="btn-soft flex w-full items-center gap-3 px-4 py-3 text-start"
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

/**
 * Correcting a portion after the fact. The macros are rescaled from the food's
 * own per-100 g figures where it still exists, and from the entry's own numbers
 * where it doesn't — see updateMealEntry.
 */
function EditEntrySheet({
  entry,
  onClose,
  onSave,
}: {
  entry: MealEntry | null
  onClose: () => void
  onSave: (grams: number) => Promise<void>
}) {
  const { t, locale } = useT()
  const [grams, setGrams] = useState(0)

  // Keyed on the id alone: the entry object is replaced on every live-query
  // refresh, and re-syncing on that would fight whatever is being typed.
  const source = useRef(entry)
  source.current = entry
  const entryId = entry?.id

  useEffect(() => {
    const current = source.current
    if (current) setGrams(current.grams)
  }, [entryId])

  if (!entry) return null

  const scale = entry.grams > 0 ? grams / entry.grams : 0
  const preview = {
    kcal: Math.round(entry.kcal * scale),
    protein: Math.round(entry.protein * scale * 10) / 10,
    carbs: Math.round(entry.carbs * scale * 10) / 10,
    fat: Math.round(entry.fat * scale * 10) / 10,
  }

  return (
    <Sheet open onClose={onClose} title={locale === 'ar' ? entry.nameAr : entry.nameEn}>
      <div className="space-y-4">
        <NumberField
          label={t('nutrition.grams')}
          value={grams}
          onChange={setGrams}
          step={10}
          steppers
        />

        <div className="grid grid-cols-4 gap-2 rounded-xl bg-ink-800 p-3 text-center">
          {[
            { label: t('nutrition.calories'), value: preview.kcal, accent: true },
            { label: t('nutrition.protein'), value: preview.protein },
            { label: t('nutrition.carbs'), value: preview.carbs },
            { label: t('nutrition.fat'), value: preview.fat },
          ].map((macro) => (
            <div key={macro.label} className="min-w-0">
              <p className="truncate text-[10px] text-ink-300">{macro.label}</p>
              <p
                className={`tabular text-base font-bold ${
                  macro.accent ? 'text-brand-400' : 'text-ink-50'
                }`}
              >
                {macro.value}
              </p>
            </div>
          ))}
        </div>

        <button
          type="button"
          disabled={grams <= 0}
          onClick={() => onSave(grams)}
          className="btn-primary w-full"
        >
          {t('common.save')}
        </button>
      </div>
    </Sheet>
  )
}

export type { MealEntry }
