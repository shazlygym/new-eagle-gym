import { Activity, Trophy } from 'lucide-react'
import type { Exercise, Units } from '../db/schema'
import type {
  BalanceKey,
  LoadRatio,
  MuscleVolume,
  MuscleWeek,
  PeriodComparison,
  RecordEvent,
} from '../db/queries'
import { WEEKLY_SETS_TARGET } from '../db/queries'
import { exerciseName, useT } from '../i18n'
import type { TranslationKey } from '../i18n/en'
import { ChartCard } from './Chart'
import { formatNumber, formatShortDay, toDisplayWeight, unitLabel, volumeValue } from '../lib/format'

// These read as a set: what this week owes each muscle, where the work went,
// whether it is balanced, whether the jump week to week is sane, and whether any
// of it produced a record.

const WEEK_STATUS_BAR: Record<MuscleWeek['status'], string> = {
  low: 'bg-flame-400',
  onTarget: 'bg-brand-500',
  high: 'bg-plum-500',
  unrated: 'bg-ink-400',
}

const WEEK_STATUS_TEXT: Record<MuscleWeek['status'], string> = {
  low: 'text-flame-400',
  onTarget: 'text-brand-500',
  high: 'text-plum-400',
  unrated: 'text-ink-300',
}

/** Every row is drawn against the same ceiling, so the band never moves. */
const WEEK_SCALE = 24

/**
 * What this week still owes each muscle.
 *
 * Every other volume view on this page is a ranking — which muscle got the most
 * — and a ranking cannot tell you whether the week was any good, only who won
 * it. This one puts the ten-to-twenty window on the track and asks a question
 * with an answer: does the bar end inside it, while there is still a week left
 * to fix it if it doesn't.
 */
export function WeeklyMuscleCard({ data }: { data: MuscleWeek[] }) {
  const { t } = useT()

  return (
    <ChartCard title={t('analytics.weeklySets')} subtitle={t('analytics.weeklySetsRange')}>
      {data.length === 0 ? (
        <p className="py-8 text-center text-sm text-ink-300">{t('progress.noData')}</p>
      ) : (
        <>
          <ul className="space-y-3">
            {data.map((row) => (
              <li key={row.muscleGroup}>
                <div className="mb-1.5 flex items-baseline gap-2">
                  <span className="min-w-0 flex-1 truncate text-xs font-medium text-ink-100">
                    {t(`group.${row.muscleGroup}` as TranslationKey)}
                  </span>
                  {row.baseline >= 1 && (
                    <span className="tabular shrink-0 text-[10px] text-ink-400">
                      {t('analytics.usually', { count: Math.round(row.baseline) })}
                    </span>
                  )}
                  <span
                    className={`tabular shrink-0 text-xs font-bold ${WEEK_STATUS_TEXT[row.status]}`}
                  >
                    {row.sets}
                  </span>
                </div>

                {/* The pale block is the target window, in the same place on
                    every row. Logical inset properties, so it sits under the
                    same set counts when the page flips to Arabic. */}
                <div className="relative h-2.5 overflow-hidden rounded-full bg-ink-700">
                  {row.status !== 'unrated' && (
                    <span
                      className="absolute inset-y-0 bg-ink-500"
                      style={{
                        insetInlineStart: `${(WEEKLY_SETS_TARGET.min / WEEK_SCALE) * 100}%`,
                        width: `${
                          ((WEEKLY_SETS_TARGET.max - WEEKLY_SETS_TARGET.min) / WEEK_SCALE) * 100
                        }%`,
                      }}
                    />
                  )}
                  <span
                    className={`absolute inset-y-0 start-0 rounded-full transition-[width]
                                duration-500 ${WEEK_STATUS_BAR[row.status]}`}
                    style={{ width: `${Math.min(100, (row.sets / WEEK_SCALE) * 100)}%` }}
                  />
                </div>
              </li>
            ))}
          </ul>

          <p className="mt-4 text-xs leading-relaxed text-ink-300">
            {t('analytics.weeklySetsHint')}
          </p>
        </>
      )}
    </ChartCard>
  )
}

export function MuscleVolumeCard({
  data,
  units,
}: {
  data: MuscleVolume[]
  units: Units
}) {
  const { t, locale } = useT()
  const max = Math.max(...data.map((d) => d.volume), 1)

  return (
    <ChartCard title={t('analytics.byMuscle')} subtitle={unitLabel(units, locale)}>
      {data.length === 0 ? (
        <p className="py-8 text-center text-sm text-ink-300">{t('progress.noData')}</p>
      ) : (
        <ul className="space-y-2.5">
          {data.map((row) => (
            <li key={row.muscleGroup}>
              <div className="mb-1 flex items-baseline gap-2">
                <span className="min-w-0 flex-1 truncate text-xs font-medium text-ink-100">
                  {t(`group.${row.muscleGroup}` as TranslationKey)}
                </span>
                <span className="tabular shrink-0 text-xs text-ink-300">
                  {t('progress.totalSets', { count: row.sets })}
                </span>
                <span className="tabular shrink-0 text-xs font-semibold text-brand-500">
                  {volumeValue(row.volume, units, { compact: true })}
                </span>
              </div>
              {/* A bar per group, scaled to the largest — the shape is the point,
                  not the absolute number, which the label already gives. */}
              <div className="h-2 overflow-hidden rounded-full bg-ink-600">
                <div
                  className="h-full rounded-full bg-brand-500 transition-[width] duration-500"
                  style={{ width: `${(row.volume / max) * 100}%` }}
                />
              </div>
            </li>
          ))}
        </ul>
      )}
    </ChartCard>
  )
}

const BALANCE_LABEL: Record<BalanceKey, TranslationKey> = {
  push: 'analytics.push',
  pull: 'analytics.pull',
  legs: 'analytics.legsGroup',
  other: 'analytics.other',
}

// Three bars that have to be told apart at a glance, so three clearly separate
// hues — sky sat too close to the cyan next to it.
const BALANCE_COLOR: Record<BalanceKey, string> = {
  push: 'bg-brand-500',
  pull: 'bg-plum-500',
  legs: 'bg-aqua-500',
  other: 'bg-ink-400',
}

export function BalanceCard({ data }: { data: Record<BalanceKey, number> }) {
  const { t } = useT()
  const total = Object.values(data).reduce((sum, value) => sum + value, 0)

  return (
    <ChartCard title={t('analytics.balance')} subtitle={t('common.sets')}>
      {total === 0 ? (
        <p className="py-8 text-center text-sm text-ink-300">{t('progress.noData')}</p>
      ) : (
        <>
          {/* One stacked bar, because the comparison between segments is the
              whole message — separate bars would make it a lookup exercise. */}
          <div className="flex h-3 gap-0.5 overflow-hidden rounded-full">
            {(Object.keys(data) as BalanceKey[])
              .filter((key) => data[key] > 0)
              .map((key) => (
                <div
                  key={key}
                  className={BALANCE_COLOR[key]}
                  style={{ width: `${(data[key] / total) * 100}%` }}
                />
              ))}
          </div>

          <ul className="mt-4 space-y-2">
            {(Object.keys(data) as BalanceKey[]).map((key) => (
              <li key={key} className="flex items-center gap-2 text-xs">
                <span className={`h-2.5 w-2.5 shrink-0 rounded-sm ${BALANCE_COLOR[key]}`} />
                <span className="flex-1 text-ink-100">{t(BALANCE_LABEL[key])}</span>
                <span className="tabular text-ink-300">{data[key]}</span>
                <span className="tabular w-10 text-end font-semibold text-ink-50">
                  {total > 0 ? Math.round((data[key] / total) * 100) : 0}%
                </span>
              </li>
            ))}
          </ul>

          <p className="mt-3 text-xs leading-relaxed text-ink-300">{t('analytics.balanceHint')}</p>
        </>
      )}
    </ChartCard>
  )
}

const STATUS_STYLE: Record<LoadRatio['status'], string> = {
  spike: 'text-flame-400',
  steady: 'text-brand-400',
  easing: 'text-aqua-400',
  unknown: 'text-ink-300',
}

const STATUS_LABEL: Record<LoadRatio['status'], TranslationKey> = {
  spike: 'analytics.loadSpike',
  steady: 'analytics.loadSteady',
  easing: 'analytics.loadEasing',
  unknown: 'progress.noData',
}

export function LoadRatioCard({ data, units }: { data: LoadRatio; units: Units }) {
  const { t, locale } = useT()

  return (
    <ChartCard title={t('analytics.load')}>
      <div className="flex items-center gap-4">
        <Activity size={22} className={`shrink-0 ${STATUS_STYLE[data.status]}`} />
        <div className="min-w-0 flex-1">
          <p className={`text-lg font-bold ${STATUS_STYLE[data.status]}`}>
            {t(STATUS_LABEL[data.status])}
          </p>
          <p className="tabular mt-0.5 text-xs text-ink-300">
            {volumeValue(data.acute, units, { compact: true })} {unitLabel(units, locale)}
            {data.ratio !== null && ` · ${t('analytics.loadRatio')} ${data.ratio.toFixed(2)}`}
          </p>
        </div>
      </div>
      <p className="mt-3 text-xs leading-relaxed text-ink-300">{t('analytics.loadHint')}</p>
    </ChartCard>
  )
}

export function ComparisonCard({
  data,
  units,
}: {
  data: PeriodComparison
  units: Units
}) {
  const { t, locale } = useT()

  const rows: Array<{ label: string; current: string; delta: number | null }> = [
    {
      label: t('analytics.sessions'),
      current: String(data.sessions.current),
      delta: percentDelta(data.sessions.current, data.sessions.previous),
    },
    {
      label: t('analytics.tonnage'),
      current: `${volumeValue(data.volume.current, units, { compact: true })} ${unitLabel(units, locale)}`,
      delta: percentDelta(data.volume.current, data.volume.previous),
    },
    {
      label: t('analytics.avgPerSession'),
      current: `${volumeValue(data.perSession.current, units, { compact: true })} ${unitLabel(units, locale)}`,
      delta: percentDelta(data.perSession.current, data.perSession.previous),
    },
  ]

  return (
    <ChartCard title={t('analytics.compare')}>
      <ul className="space-y-3">
        {rows.map((row) => (
          <li key={row.label} className="flex items-center gap-3">
            <span className="min-w-0 flex-1 truncate text-xs text-ink-200">{row.label}</span>
            <span className="tabular shrink-0 text-sm font-semibold text-ink-50">
              {row.current}
            </span>
            <span
              className={`tabular w-14 shrink-0 text-end text-xs font-semibold ${
                row.delta === null || row.delta === 0
                  ? 'text-ink-300'
                  : row.delta > 0
                    ? 'text-brand-400'
                    : 'text-danger-400'
              }`}
            >
              {row.delta === null || row.delta === 0
                ? '—'
                : `${row.delta > 0 ? '+' : ''}${row.delta}%`}
            </span>
          </li>
        ))}
      </ul>
    </ChartCard>
  )
}

export function RecordTimelineCard({
  events,
  exercises,
  units,
}: {
  events: RecordEvent[]
  exercises: Exercise[]
  units: Units
}) {
  const { t, locale } = useT()
  const byId = new Map(exercises.map((exercise) => [exercise.id, exercise]))

  return (
    <ChartCard title={t('analytics.prTimeline')}>
      {events.length === 0 ? (
        <p className="py-8 text-center text-sm text-ink-300">{t('analytics.noPrs')}</p>
      ) : (
        <ul className="space-y-3">
          {events.map((event, index) => (
            <li key={`${event.exerciseId}-${event.date}-${index}`} className="flex gap-3">
              <div className="flex flex-col items-center">
                <Trophy size={14} className="shrink-0 text-brand-500" />
                {/* Connector, omitted on the last row so the line doesn't dangle. */}
                {index < events.length - 1 && <span className="mt-1 w-px flex-1 bg-ink-500" />}
              </div>
              <div className="min-w-0 flex-1 pb-1">
                <p className="truncate text-sm font-medium text-ink-50">
                  {exerciseName(byId.get(event.exerciseId), locale)}
                </p>
                <p className="tabular mt-0.5 text-xs text-ink-300">
                  {formatNumber(toDisplayWeight(event.weight, units))} {unitLabel(units, locale)} ×{' '}
                  {event.reps} · {formatShortDay(event.date, locale)}
                </p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </ChartCard>
  )
}

/**
 * Null when there is no baseline to compare against. Reporting "+100%" for a
 * first-ever training block is arithmetically defensible and completely
 * uninformative — a dash says "no comparison yet", which is the truth.
 */
function percentDelta(current: number, previous: number): number | null {
  if (previous <= 0) return null
  return Math.round(((current - previous) / previous) * 100)
}
