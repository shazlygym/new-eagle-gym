import { useLiveQuery } from 'dexie-react-hooks'
import { ChevronDown, ChevronUp, Plus, Trash2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import ConfirmDialog from '../components/ConfirmDialog'
import NumberField from '../components/NumberField'
import PageHeader from '../components/PageHeader'
import SegmentedControl from '../components/SegmentedControl'
import Sheet from '../components/Sheet'
import { deleteProgram, getProgram, listRoutines, saveProgram } from '../db/repository'
import type { ProgramDay } from '../db/schema'
import { routineName, useT } from '../i18n'
import { toDisplayWeight, toStoredWeight, unitLabel } from '../lib/format'
import { useActiveProfile } from '../lib/useActiveProfile'

export default function ProgramEdit() {
  const { programId } = useParams()
  const { t, locale } = useT()
  const navigate = useNavigate()
  const { profile, units } = useActiveProfile()
  const profileId = profile?.id

  const [nameAr, setNameAr] = useState('')
  const [nameEn, setNameEn] = useState('')
  const [weeks, setWeeks] = useState(8)
  const [days, setDays] = useState<ProgramDay[]>([])
  const [kind, setKind] = useState<'none' | 'linear'>('linear')
  const [incrementKg, setIncrementKg] = useState(2.5)
  const [error, setError] = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [picking, setPicking] = useState<number | null>(null)
  const [loaded, setLoaded] = useState(false)

  const program = useLiveQuery(() => (programId ? getProgram(programId) : undefined), [programId])
  const routines = useLiveQuery(() => (profileId ? listRoutines(profileId) : []), [profileId]) ?? []

  // Seed the form once — re-syncing on every emission would discard typing.
  useEffect(() => {
    if (loaded || !programId || !program) return
    setNameAr(program.nameAr)
    setNameEn(program.nameEn)
    setWeeks(program.weeks)
    setDays(program.days)
    setKind(program.progression.kind)
    setIncrementKg(program.progression.incrementKg)
    setLoaded(true)
  }, [program, programId, loaded])

  if (!profile) return null

  const save = async () => {
    if (!nameAr.trim() && !nameEn.trim()) return setError(t('routines.nameRequired'))
    if (days.length === 0) return setError(t('programs.needDay'))
    if (days.some((day) => !day.routineId)) return setError(t('programs.needRoutine'))

    await saveProgram(profile.id, {
      id: programId,
      nameAr: nameAr.trim() || nameEn.trim(),
      nameEn: nameEn.trim() || nameAr.trim(),
      weeks: Math.max(1, Math.round(weeks)),
      days,
      progression: { kind, incrementKg },
      startedAt: program?.startedAt,
    })
    navigate('/programs', { replace: true })
  }

  const move = (index: number, direction: -1 | 1) => {
    const target = index + direction
    if (target < 0 || target >= days.length) return
    const next = [...days]
    ;[next[index], next[target]] = [next[target], next[index]]
    setDays(next)
  }

  const patch = (index: number, changes: Partial<ProgramDay>) =>
    setDays(days.map((day, i) => (i === index ? { ...day, ...changes } : day)))

  return (
    <div>
      <PageHeader
        title={programId ? t('programs.edit') : t('programs.new')}
        onBack="history"
        action={
          <button
            type="button"
            onClick={save}
            className="rounded-xl bg-gold-500 px-4 py-2 text-sm font-semibold text-dark-900 active:scale-95 transition-transform"
          >
            {t('common.save')}
          </button>
        }
      />

      <div className="space-y-4 px-4 py-4">
        <div className="card space-y-4 p-4">
          <div>
            <label className="mb-1.5 block text-xs font-medium text-dark-200" htmlFor="p-ar">
              {t('programs.nameAr')}
            </label>
            <input
              id="p-ar"
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
            <label className="mb-1.5 block text-xs font-medium text-dark-200" htmlFor="p-en">
              {t('programs.nameEn')}
            </label>
            <input
              id="p-en"
              value={nameEn}
              onChange={(event) => {
                setNameEn(event.target.value)
                setError(null)
              }}
              dir="ltr"
              className="field"
            />
          </div>
          <NumberField label={t('programs.weeks')} value={weeks} onChange={setWeeks} steppers />
        </div>

        <section>
          <h2 className="section-title mb-2 px-1">{t('programs.days')}</h2>

          <ul className="space-y-2">
            {days.map((day, index) => (
              <li key={index} className="card p-4">
                <div className="flex items-center gap-2">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-dark-600 text-[11px] font-bold text-dark-200">
                    {index + 1}
                  </span>
                  <input
                    value={locale === 'ar' ? day.labelAr : day.labelEn}
                    onChange={(event) =>
                      patch(
                        index,
                        locale === 'ar'
                          ? { labelAr: event.target.value, labelEn: day.labelEn || event.target.value }
                          : { labelEn: event.target.value, labelAr: day.labelAr || event.target.value }
                      )
                    }
                    placeholder={t('programs.dayLabel')}
                    className="field flex-1"
                  />
                  <button
                    type="button"
                    disabled={index === 0}
                    onClick={() => move(index, -1)}
                    aria-label={t('workout.moveUp')}
                    className="rounded-lg p-1.5 text-dark-300 active:bg-dark-600 disabled:opacity-25"
                  >
                    <ChevronUp size={18} />
                  </button>
                  <button
                    type="button"
                    disabled={index === days.length - 1}
                    onClick={() => move(index, 1)}
                    aria-label={t('workout.moveDown')}
                    className="rounded-lg p-1.5 text-dark-300 active:bg-dark-600 disabled:opacity-25"
                  >
                    <ChevronDown size={18} />
                  </button>
                  <button
                    type="button"
                    onClick={() => setDays(days.filter((_, i) => i !== index))}
                    aria-label={t('common.delete')}
                    className="rounded-lg p-1.5 text-dark-300 active:bg-dark-600"
                  >
                    <Trash2 size={17} />
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => setPicking(index)}
                  className={`mt-3 w-full rounded-xl px-4 py-2.5 text-start text-sm active:bg-dark-500
                              ${day.routineId ? 'bg-dark-600 text-dark-50' : 'bg-dark-600 text-dark-300'}`}
                >
                  {routines.find((r) => r.id === day.routineId)
                    ? routineName(routines.find((r) => r.id === day.routineId)!, locale)
                    : t('programs.pickRoutine')}
                </button>
              </li>
            ))}
          </ul>

          <button
            type="button"
            onClick={() => {
              setError(null)
              setDays([...days, { routineId: '', labelAr: '', labelEn: '' }])
            }}
            className="mt-2 flex w-full items-center justify-center gap-2 rounded-2xl border
                       border-dashed border-dark-400 py-3.5 text-sm font-medium
                       text-gold-500 active:bg-dark-700"
          >
            <Plus size={18} />
            {t('programs.addDay')}
          </button>
        </section>

        <section className="card space-y-3 p-4">
          <h2 className="section-title">{t('programs.progression')}</h2>
          <SegmentedControl<'none' | 'linear'>
            value={kind}
            onChange={setKind}
            options={[
              { value: 'linear', label: t('programs.progressionLinear') },
              { value: 'none', label: t('programs.progressionNone') },
            ]}
          />
          {kind === 'linear' && (
            <NumberField
              label={`${t('programs.increment')} (${unitLabel(units, locale)})`}
              value={toDisplayWeight(incrementKg, units)}
              onChange={(value) => setIncrementKg(toStoredWeight(value, units))}
              step={1.25}
            />
          )}
          <p className="text-xs leading-relaxed text-dark-300">{t('programs.progressionHint')}</p>
        </section>

        {error && <p className="px-1 text-xs text-red-400">{error}</p>}

        {programId && (
          <button
            type="button"
            onClick={() => setConfirmDelete(true)}
            className="w-full py-3 text-sm font-medium text-red-400 active:opacity-60"
          >
            {t('common.delete')}
          </button>
        )}
      </div>

      <Sheet
        open={picking !== null}
        onClose={() => setPicking(null)}
        title={t('programs.pickRoutine')}
        tall
      >
        {routines.length === 0 ? (
          <p className="py-10 text-center text-sm text-dark-300">{t('routines.empty')}</p>
        ) : (
          <ul className="space-y-1.5">
            {routines.map((routine) => (
              <li key={routine.id}>
                <button
                  type="button"
                  onClick={() => {
                    if (picking === null) return
                    const current = days[picking]
                    patch(picking, {
                      routineId: routine.id,
                      // An unnamed day takes the routine's name, which is almost
                      // always what you'd have typed anyway.
                      labelAr: current.labelAr || routine.nameAr,
                      labelEn: current.labelEn || routine.nameEn,
                    })
                    setPicking(null)
                  }}
                  className="w-full rounded-xl bg-dark-700 px-4 py-3 text-start text-sm font-medium text-dark-50 active:bg-dark-600"
                >
                  {routineName(routine, locale)}
                </button>
              </li>
            ))}
          </ul>
        )}
      </Sheet>

      <ConfirmDialog
        open={confirmDelete}
        title={t('programs.deleteConfirm')}
        body={t('common.confirmDelete')}
        confirmLabel={t('common.delete')}
        destructive
        onCancel={() => setConfirmDelete(false)}
        onConfirm={async () => {
          setConfirmDelete(false)
          if (programId) await deleteProgram(programId)
          navigate('/programs', { replace: true })
        }}
      />
    </div>
  )
}
