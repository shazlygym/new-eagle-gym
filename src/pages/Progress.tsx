import { useLiveQuery } from 'dexie-react-hooks'
import { CalendarDays, ChevronRight, Ruler, TrendingUp, type LucideIcon } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import {
  BalanceCard,
  ComparisonCard,
  LoadRatioCard,
  MuscleVolumeCard,
  RecordTimelineCard,
  WeeklyMuscleCard,
} from '../components/AnalyticsCards'
import { CHART, ChartCard, ChartTooltip } from '../components/Chart'
import EmptyState from '../components/EmptyState'
import PageHeader from '../components/PageHeader'
import Sheet from '../components/Sheet'
import {
  comparePeriods,
  exerciseProgress,
  loadRatio,
  movementBalance,
  personalRecords,
  recordTimeline,
  volumeByMuscle,
  weeklyMuscleSets,
  weeklyVolume,
} from '../db/queries'
import type { ExerciseRecord } from '../db/queries'
import { listCompletedSets, listExercises, listSessions } from '../db/repository'
import type { Units } from '../db/schema'
import { exerciseName, useT } from '../i18n'
import {
  formatClock,
  formatNumber,
  formatShortDay,
  toDisplayWeight,
  unitLabel,
} from '../lib/format'
import { useActiveProfile } from '../lib/useActiveProfile'

export default function Progress() {
  const { t, locale, isRTL } = useT()
  const { profile, units } = useActiveProfile()
  const profileId = profile?.id

  const [selectedExerciseId, setSelectedExerciseId] = useState<string | null>(null)
  const [pickerOpen, setPickerOpen] = useState(false)

  const sessions = useLiveQuery(() => (profileId ? listSessions(profileId) : []), [profileId]) ?? []
  const sets = useLiveQuery(() => (profileId ? listCompletedSets(profileId) : []), [profileId]) ?? []
  const exercises = useLiveQuery(() => (profileId ? listExercises(profileId) : []), [profileId]) ?? []

  const records = useMemo(() => personalRecords(sets), [sets])

  /**
   * Only exercises that have produced a real estimated 1RM belong on this chart.
   * A plank or an unweighted pull-up has a e1rm of zero on every set, so it
   * plots as a flat line on an axis that runs into the negatives — and since
   * accessory work tends to be the most-logged thing in the table, it is
   * exactly what the "most sets" default used to land on.
   */
  const strengthRecords = useMemo(
    () => [...records.values()].filter((record) => record.bestE1rm > 0),
    [records]
  )

  // Among those, default to whatever has the most sets logged — the lift the
  // user actually cares about tracking.
  const activeExerciseId =
    selectedExerciseId ??
    [...strengthRecords].sort((a, b) => b.totalSets - a.totalSets)[0]?.exerciseId ??
    null

  // Axis labels are built here, not in the query, so they follow the language.
  const volumeData = useMemo(
    () =>
      weeklyVolume(sessions, sets).map((point) => ({
        ...point,
        label: formatShortDay(point.weekStart, locale),
      })),
    [sessions, sets, locale]
  )
  const exerciseData = useMemo(
    () =>
      activeExerciseId
        ? exerciseProgress(activeExerciseId, sets).map((point) => ({
            ...point,
            label: formatShortDay(point.date, locale),
            e1rm: Math.round(toDisplayWeight(point.e1rm, units)),
          }))
        : [],
    [activeExerciseId, sets, units, locale]
  )

  const rankedRecords = useMemo(
    () => [...records.values()].sort((a, b) => b.lastPerformedAt - a.lastPerformedAt),
    [records]
  )

  const weeklySets = useMemo(() => weeklyMuscleSets(sets, exercises), [sets, exercises])
  const muscleVolume = useMemo(() => volumeByMuscle(sets, exercises), [sets, exercises])
  const balance = useMemo(() => movementBalance(sets, exercises), [sets, exercises])
  const load = useMemo(() => loadRatio(sessions, sets), [sessions, sets])
  const comparison = useMemo(() => comparePeriods(sessions, sets), [sessions, sets])
  const timeline = useMemo(() => recordTimeline(sets), [sets])

  if (!profile) return null

  if (sets.length === 0) {
    return (
      <div>
        <PageHeader title={t('progress.title')} large />
        <EmptyState
          icon={TrendingUp}
          title={t('progress.noData')}
          body={t('progress.noDataHint')}
        />
        <div className="px-5">
          <ArchiveLinks />
        </div>
      </div>
    )
  }

  return (
    <div>
      <PageHeader title={t('progress.title')} large />

      <div className="space-y-4 px-5 py-4">
        <ArchiveLinks />

        <ChartCard title={t('progress.weeklyVolume')} subtitle={unitLabel(units, locale)}>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={volumeData} margin={{ top: 4, right: 4, bottom: 0, left: 4 }}>
              <CartesianGrid stroke={CHART.grid} vertical={false} />
              <XAxis
                dataKey="label"
                // Time reads in the document direction, so the axis mirrors in Arabic.
                reversed={isRTL}
                tickLine={false}
                axisLine={false}
                tick={{ fill: CHART.axis, fontSize: 10 }}
                interval="preserveStartEnd"
              />
              <YAxis
                orientation={isRTL ? 'right' : 'left'}
                tickLine={false}
                axisLine={false}
                width={38}
                tick={{ fill: CHART.axis, fontSize: 10 }}
                tickFormatter={(value: number) => (value >= 1000 ? `${value / 1000}k` : `${value}`)}
              />
              <Tooltip
                cursor={{ fill: '#ffffff08' }}
                content={<ChartTooltip suffix={unitLabel(units, locale)} />}
              />
              {/* Rounded data-end anchored to the baseline. */}
              <Bar dataKey="volume" fill={CHART.series} radius={[4, 4, 0, 0]} maxBarSize={28} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Nothing weighted logged yet means nothing to plot — the card would be
            an empty axis, so it stays away until there is a lift to show. */}
        {strengthRecords.length > 0 && (
        <ChartCard
          title={t('progress.perExercise')}
          subtitle={
            activeExerciseId
              ? exerciseName(
                  exercises.find((e) => e.id === activeExerciseId),
                  locale
                )
              : undefined
          }
          action={
            strengthRecords.length > 1 ? (
            <button
              type="button"
              onClick={() => setPickerOpen(true)}
              className="btn-soft shrink-0 rounded-lg px-3 py-2.5 text-xs font-medium"
            >
              {t('progress.selectExercise')}
            </button>
            ) : undefined
          }
        >
          {exerciseData.length < 2 ? (
            <p className="py-10 text-center text-sm text-ink-300">{t('progress.noData')}</p>
          ) : (
            <ResponsiveContainer width="100%" height={180}>
              <LineChart data={exerciseData} margin={{ top: 8, right: 8, bottom: 0, left: 4 }}>
                <CartesianGrid stroke={CHART.grid} vertical={false} />
                <XAxis
                  dataKey="label"
                  reversed={isRTL}
                  tickLine={false}
                  axisLine={false}
                  tick={{ fill: CHART.axis, fontSize: 10 }}
                  interval="preserveStartEnd"
                />
                <YAxis
                  orientation={isRTL ? 'right' : 'left'}
                  tickLine={false}
                  axisLine={false}
                  width={38}
                  domain={['dataMin - 5', 'dataMax + 5']}
                  tick={{ fill: CHART.axis, fontSize: 10 }}
                />
                <Tooltip
                  cursor={{ stroke: CHART.axis, strokeDasharray: '3 3' }}
                  content={<ChartTooltip suffix={unitLabel(units, locale)} />}
                />
                <Line
                  type="monotone"
                  dataKey="e1rm"
                  stroke={CHART.series}
                  strokeWidth={2}
                  dot={{ r: 4, fill: CHART.series, strokeWidth: 0 }}
                  activeDot={{ r: 6, fill: CHART.series, stroke: CHART.surface, strokeWidth: 2 }}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </ChartCard>
        )}

        <LoadRatioCard data={load} units={units} />
        {/* Before the all-time rankings, because this is the only card here you
            can still act on — the week it describes has not finished yet. */}
        <WeeklyMuscleCard data={weeklySets} />
        <MuscleVolumeCard data={muscleVolume} units={units} />
        <BalanceCard data={balance} />
        <ComparisonCard data={comparison} units={units} />
        <RecordTimelineCard events={timeline} exercises={exercises} units={units} />

        <section>
          <h2 className="section-title mb-2.5">{t('progress.records')}</h2>
          {/* One card, hairline rows. A record is a line in a table, not an
              object — twenty of them as twenty separate cards was twenty
              shadows to scroll past. */}
          <ul className="card divide-y divide-ink-500/30 overflow-hidden">
            {rankedRecords.map((record) => (
              <li key={record.exerciseId} className="flex items-center gap-3 px-4 py-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-ink-50">
                    {exerciseName(
                      exercises.find((e) => e.id === record.exerciseId),
                      locale
                    )}
                  </p>
                  <p className="mt-0.5 text-[11px] text-ink-400">
                    {t('progress.lastDone')} · {formatShortDay(record.lastPerformedAt, locale)}
                  </p>
                </div>
                <RecordValue record={record} units={units} />
              </li>
            ))}
          </ul>
        </section>
      </div>

      <Sheet open={pickerOpen} onClose={() => setPickerOpen(false)} title={t('progress.selectExercise')} tall>
        <ul className="space-y-1.5">
          {/* Same filter as the chart: offering a plank here would just switch
              the card to an empty one. */}
          {strengthRecords.map((record) => (
            <li key={record.exerciseId}>
              <button
                type="button"
                onClick={() => {
                  setSelectedExerciseId(record.exerciseId)
                  setPickerOpen(false)
                }}
                className={`flex w-full items-center gap-3 rounded-xl px-4 py-3 text-start
                            active:bg-ink-600 ${
                              record.exerciseId === activeExerciseId ? 'bg-ink-600' : 'bg-ink-700'
                            }`}
              >
                <span className="min-w-0 flex-1 truncate text-sm font-medium text-ink-50">
                  {exerciseName(
                    exercises.find((e) => e.id === record.exerciseId),
                    locale
                  )}
                </span>
                <span className="shrink-0 text-xs text-ink-300">
                  {t('progress.totalSets', { count: record.totalSets })}
                </span>
              </button>
            </li>
          ))}
        </ul>
      </Sheet>
    </div>
  )
}

/**
 * The best-ever figure on a record row, in whatever terms the exercise is
 * actually trained in. A plank has no heaviest set and a bodyweight pull-up has
 * no weight to print, so both used to render as "0 kg × 0 · Est. 1RM 0".
 */
function RecordValue({ record, units }: { record: ExerciseRecord; units: Units }) {
  const { t, locale } = useT()

  if (record.bestE1rm > 0) {
    return (
      <div className="shrink-0 text-end">
        <p className="tabular font-numeric text-sm font-bold text-ink-50">
          {formatNumber(toDisplayWeight(record.bestWeight, units))} {unitLabel(units, locale)} ×{' '}
          {record.bestWeightReps}
        </p>
        <p className="tabular mt-0.5 text-[11px] text-ink-400">
          {t('progress.e1rm')} {formatNumber(toDisplayWeight(record.bestE1rm, units))}
        </p>
      </div>
    )
  }

  if (record.bestDuration > 0) {
    return (
      <div className="shrink-0 text-end">
        <p className="tabular font-numeric text-sm font-bold text-ink-50">
          {formatClock(record.bestDuration)}
        </p>
        <p className="mt-0.5 text-[11px] text-ink-400">{t('progress.bestHold')}</p>
      </div>
    )
  }

  // Trained unweighted: the rep count is the whole record.
  return (
    <div className="shrink-0 text-end">
      <p className="tabular text-sm font-bold text-brand-500">
        {record.bestReps} {t('common.reps')}
      </p>
      <p className="mt-0.5 text-[11px] text-ink-400">{t('progress.bestSet')}</p>
    </div>
  )
}

/**
 * The two archives behind this screen. One card, two hairline rows: they are
 * navigation, and giving each its own surface with its own tinted icon tile put
 * "where the old workouts live" at the same weight as the charts below.
 */
function ArchiveLinks() {
  const { t } = useT()
  return (
    <div className="card divide-y divide-ink-500/30 overflow-hidden">
      <ArchiveRow
        to="/history"
        icon={CalendarDays}
        title={t('history.title')}
        hint={t('history.emptyHint')}
      />
      <ArchiveRow to="/body" icon={Ruler} title={t('body.title')} hint={t('body.log')} />
    </div>
  )
}

function ArchiveRow({
  to,
  icon: Icon,
  title,
  hint,
}: {
  to: string
  icon: LucideIcon
  title: string
  hint: string
}) {
  return (
    <Link to={to} className="flex items-center gap-3 px-4 py-3.5 active:bg-ink-600/60">
      <Icon size={17} className="shrink-0 text-brand-500" />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-ink-50">{title}</p>
        <p className="mt-0.5 truncate text-[11px] text-ink-400">{hint}</p>
      </div>
      <ChevronRight size={16} className="rtl-flip shrink-0 text-ink-500" />
    </Link>
  )
}
