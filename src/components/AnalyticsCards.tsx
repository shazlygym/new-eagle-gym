import { Activity, Trophy } from 'lucide-react'
import type { Exercise, Units } from '../db/schema'
import type { BalanceKey, LoadRatio, MuscleVolume, PeriodComparison, RecordEvent } from '../db/queries'
import { exerciseName, useT } from '../i18n'
import type { TranslationKey } from '../i18n/en'
import { ChartCard } from './Chart'
import { formatNumber, formatShortDay, toDisplayWeight, unitLabel, volumeValue } from '../lib/format'

// These four read as a set: where the work went, whether it is balanced, whether
// the jump week to week is sane, and whether any of it produced a record.

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
        <p className="py-8 text-center text-sm text-dark-300">{t('progress.noData')}</p>
      ) : (
        <ul className="space-y-2.5">
          {data.map((row) => (
            <li key={row.muscleGroup}>
              <div className="mb-1 flex items-baseline gap-2">
                <span className="min-w-0 flex-1 truncate text-xs font-medium text-dark-100">
                  {t(`group.${row.muscleGroup}` as TranslationKey)}
                </span>
                <span className="tabular shrink-0 text-xs text-dark-300">
                  {t('progress.totalSets', { count: row.sets })}
                </span>
                <span className="tabular shrink-0 text-xs font-semibold text-gold-500">
                  {volumeValue(row.volume, units, { compact: true })}
                </span>
              </div>
              {/* A bar per group, scaled to the largest — the shape is the point,
                  not the absolute number, which the label already gives. */}
              <div className="h-2 overflow-hidden rounded-full bg-dark-600">
                <div
                  className="h-full rounded-full bg-gold-500 transition-[width] duration-500"
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

const BALANCE_COLOR: Record<BalanceKey, string> = {
  push: 'bg-gold-500',
  pull: 'bg-sky-500',
  legs: 'bg-violet-500',
  other: 'bg-dark-400',
}

export function BalanceCard({ data }: { data: Record<BalanceKey, number> }) {
  const { t } = useT()
  const total = Object.values(data).reduce((sum, value) => sum + value, 0)

  return (
    <ChartCard title={t('analytics.balance')} subtitle={t('common.sets')}>
      {total === 0 ? (
        <p className="py-8 text-center text-sm text-dark-300">{t('progress.noData')}</p>
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
                <span className="flex-1 text-dark-100">{t(BALANCE_LABEL[key])}</span>
                <span className="tabular text-dark-300">{data[key]}</span>
                <span className="tabular w-10 text-end font-semibold text-dark-50">
                  {total > 0 ? Math.round((data[key] / total) * 100) : 0}%
                </span>
              </li>
            ))}
          </ul>

          <p className="mt-3 text-xs leading-relaxed text-dark-300">{t('analytics.balanceHint')}</p>
        </>
      )}
    </ChartCard>
  )
}

const STATUS_STYLE: Record<LoadRatio['status'], string> = {
  spike: 'text-amber-400',
  steady: 'text-green-400',
  easing: 'text-sky-400',
  unknown: 'text-dark-300',
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
          <p className="tabular mt-0.5 text-xs text-dark-300">
            {volumeValue(data.acute, units, { compact: true })} {unitLabel(units, locale)}
            {data.ratio !== null && ` · ${t('analytics.loadRatio')} ${data.ratio.toFixed(2)}`}
          </p>
        </div>
      </div>
      <p className="mt-3 text-xs leading-relaxed text-dark-300">{t('analytics.loadHint')}</p>
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
            <span className="min-w-0 flex-1 truncate text-xs text-dark-200">{row.label}</span>
            <span className="tabular shrink-0 text-sm font-semibold text-dark-50">
              {row.current}
            </span>
            <span
              className={`tabular w-14 shrink-0 text-end text-xs font-semibold ${
                row.delta === null || row.delta === 0
                  ? 'text-dark-300'
                  : row.delta > 0
                    ? 'text-green-400'
                    : 'text-red-400'
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
        <p className="py-8 text-center text-sm text-dark-300">{t('analytics.noPrs')}</p>
      ) : (
        <ul className="space-y-3">
          {events.map((event, index) => (
            <li key={`${event.exerciseId}-${event.date}-${index}`} className="flex gap-3">
              <div className="flex flex-col items-center">
                <Trophy size={14} className="shrink-0 text-gold-500" />
                {/* Connector, omitted on the last row so the line doesn't dangle. */}
                {index < events.length - 1 && <span className="mt-1 w-px flex-1 bg-dark-500" />}
              </div>
              <div className="min-w-0 flex-1 pb-1">
                <p className="truncate text-sm font-medium text-dark-50">
                  {exerciseName(byId.get(event.exerciseId), locale)}
                </p>
                <p className="tabular mt-0.5 text-xs text-dark-300">
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
