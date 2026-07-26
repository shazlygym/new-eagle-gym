import { useLiveQuery } from 'dexie-react-hooks'
import { ChevronRight, Ruler, TrendingUp } from 'lucide-react'
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
  weeklyVolume,
} from '../db/queries'
import { listCompletedSets, listExercises, listSessions } from '../db/repository'
import { exerciseName, useT } from '../i18n'
import { formatNumber, formatShortDay, toDisplayWeight, unitLabel } from '../lib/format'
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

  // Default to whatever has the most sets logged — the exercise the user
  // actually cares about tracking.
  const activeExerciseId =
    selectedExerciseId ??
    [...records.values()].sort((a, b) => b.totalSets - a.totalSets)[0]?.exerciseId ??
    null

  const volumeData = useMemo(() => weeklyVolume(sessions, sets), [sessions, sets])
  const exerciseData = useMemo(
    () =>
      activeExerciseId
        ? exerciseProgress(activeExerciseId, sets).map((point) => ({
            ...point,
            e1rm: Math.round(toDisplayWeight(point.e1rm, units)),
          }))
        : [],
    [activeExerciseId, sets, units]
  )

  const rankedRecords = useMemo(
    () => [...records.values()].sort((a, b) => b.lastPerformedAt - a.lastPerformedAt),
    [records]
  )

  const muscleVolume = useMemo(() => volumeByMuscle(sets, exercises), [sets, exercises])
  const balance = useMemo(() => movementBalance(sets, exercises), [sets, exercises])
  const load = useMemo(() => loadRatio(sessions, sets), [sessions, sets])
  const comparison = useMemo(() => comparePeriods(sessions, sets), [sessions, sets])
  const timeline = useMemo(() => recordTimeline(sets), [sets])

  if (!profile) return null

  if (sets.length === 0) {
    return (
      <div>
        <PageHeader title={t('progress.title')} />
        <EmptyState
          icon={TrendingUp}
          title={t('progress.noData')}
          body={t('progress.noDataHint')}
        />
        <div className="px-4">
          <BodyLink />
        </div>
      </div>
    )
  }

  return (
    <div>
      <PageHeader title={t('progress.title')} />

      <div className="space-y-4 px-4 py-4">
        <BodyLink />

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
            <button
              type="button"
              onClick={() => setPickerOpen(true)}
              className="shrink-0 rounded-lg bg-dark-600 px-3 py-1.5 text-xs font-medium text-dark-100 active:bg-dark-500"
            >
              {t('progress.selectExercise')}
            </button>
          }
        >
          {exerciseData.length < 2 ? (
            <p className="py-10 text-center text-sm text-dark-300">{t('progress.noData')}</p>
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

        <LoadRatioCard data={load} units={units} />
        <MuscleVolumeCard data={muscleVolume} units={units} />
        <BalanceCard data={balance} />
        <ComparisonCard data={comparison} units={units} />
        <RecordTimelineCard events={timeline} exercises={exercises} units={units} />

        <section>
          <h2 className="mb-2 px-1 text-sm font-semibold text-dark-100">{t('progress.records')}</h2>
          <ul className="space-y-1.5">
            {rankedRecords.map((record) => (
              <li key={record.exerciseId} className="card flex items-center gap-3 p-4">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-dark-50">
                    {exerciseName(
                      exercises.find((e) => e.id === record.exerciseId),
                      locale
                    )}
                  </p>
                  <p className="mt-0.5 text-xs text-dark-300">
                    {t('progress.lastDone')} · {formatShortDay(record.lastPerformedAt, locale)}
                  </p>
                </div>
                <div className="shrink-0 text-end">
                  <p className="tabular text-sm font-bold text-gold-500">
                    {formatNumber(toDisplayWeight(record.bestWeight, units))}{' '}
                    {unitLabel(units, locale)} × {record.bestWeightReps}
                  </p>
                  <p className="tabular mt-0.5 text-xs text-dark-300">
                    {t('progress.e1rm')} {formatNumber(toDisplayWeight(record.bestE1rm, units))}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </section>
      </div>

      <Sheet open={pickerOpen} onClose={() => setPickerOpen(false)} title={t('progress.selectExercise')} tall>
        <ul className="space-y-1.5">
          {rankedRecords.map((record) => (
            <li key={record.exerciseId}>
              <button
                type="button"
                onClick={() => {
                  setSelectedExerciseId(record.exerciseId)
                  setPickerOpen(false)
                }}
                className={`flex w-full items-center gap-3 rounded-xl px-4 py-3 text-start
                            active:bg-dark-600 ${
                              record.exerciseId === activeExerciseId ? 'bg-dark-600' : 'bg-dark-700'
                            }`}
              >
                <span className="min-w-0 flex-1 truncate text-sm font-medium text-dark-50">
                  {exerciseName(
                    exercises.find((e) => e.id === record.exerciseId),
                    locale
                  )}
                </span>
                <span className="shrink-0 text-xs text-dark-300">
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

function BodyLink() {
  const { t } = useT()
  return (
    <Link to="/body" className="card flex items-center gap-3 p-4 active:bg-dark-600">
      <div className="rounded-xl bg-dark-600 p-2.5 text-gold-500">
        <Ruler size={18} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="font-medium text-dark-50">{t('body.title')}</p>
        <p className="text-xs text-dark-300">{t('body.log')}</p>
      </div>
      <ChevronRight size={18} className="rtl-flip shrink-0 text-dark-300" />
    </Link>
  )
}
