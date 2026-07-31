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
import { format } from 'date-fns'
import { e1rm, volumeOf } from '../db/queries'
import type { SetEntry, Units } from '../db/schema'
import { useT } from '../i18n'
import { formatClock, toDisplayWeight, unitLabel } from '../lib/format'
import { CHART, ChartTooltip } from './Chart'

interface Props {
  /** Completed, non-warm-up sets of one exercise (any order). */
  sets: SetEntry[]
  units: Units
  isTimed: boolean
}

/**
 * The trend behind the history list: estimated 1RM per session for weighted
 * work, longest hold per session for timed work, plus a per-session volume
 * strip. Loaded lazily — recharts is half the bundle and the workout screen
 * must not pay for it.
 */
export default function ExerciseTrendCharts({ sets, units, isTimed }: Props) {
  const { t, locale, isRTL } = useT()

  // One point per session, oldest first.
  const bySession = new Map<string, SetEntry[]>()
  for (const set of sets) {
    const bucket = bySession.get(set.sessionId)
    if (bucket) bucket.push(set)
    else bySession.set(set.sessionId, [set])
  }
  const points = [...bySession.values()]
    .map((rows) => {
      const date = Math.min(...rows.map((row) => row.completedAt ?? 0))
      return {
        date,
        label: format(new Date(date), 'd MMM'),
        e1rm: Math.round(
          toDisplayWeight(Math.max(...rows.map((row) => e1rm(row.weight, row.reps))), units)
        ),
        hold: Math.max(...rows.map((row) => row.durationSeconds ?? 0)),
        volume: Math.round(toDisplayWeight(volumeOf(rows), units)),
      }
    })
    .sort((a, b) => a.date - b.date)

  if (points.length < 2) return null

  const axisProps = {
    tickLine: false,
    axisLine: false,
    tick: { fill: CHART.axis, fontSize: 10 },
  }

  return (
    <div className="mb-4 space-y-3">
      <div className="rounded-xl bg-ink-700 p-3">
        <p className="mb-2 text-[11px] font-medium text-ink-300">
          {isTimed ? t('progress.bestHold') : t('progress.e1rm')}
        </p>
        <ResponsiveContainer width="100%" height={130}>
          <LineChart data={points} margin={{ top: 4, right: 8, bottom: 0, left: 4 }}>
            <CartesianGrid stroke={CHART.grid} vertical={false} />
            <XAxis dataKey="label" reversed={isRTL} interval="preserveStartEnd" {...axisProps} />
            <YAxis
              orientation={isRTL ? 'right' : 'left'}
              width={34}
              domain={['auto', 'auto']}
              {...axisProps}
              tickFormatter={isTimed ? (value: number) => formatClock(value) : undefined}
            />
            <Tooltip
              cursor={{ stroke: CHART.axis, strokeDasharray: '3 3' }}
              content={
                <ChartTooltip suffix={isTimed ? undefined : unitLabel(units, locale)} />
              }
            />
            <Line
              type="monotone"
              dataKey={isTimed ? 'hold' : 'e1rm'}
              stroke={CHART.series}
              strokeWidth={2}
              dot={{ r: 3, fill: CHART.series, strokeWidth: 0 }}
              activeDot={{ r: 5, fill: CHART.series, stroke: CHART.surface, strokeWidth: 2 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {!isTimed && (
        <div className="rounded-xl bg-ink-700 p-3">
          <p className="mb-2 text-[11px] font-medium text-ink-300">{t('common.volume')}</p>
          <ResponsiveContainer width="100%" height={110}>
            <BarChart data={points} margin={{ top: 4, right: 8, bottom: 0, left: 4 }}>
              <CartesianGrid stroke={CHART.grid} vertical={false} />
              <XAxis dataKey="label" reversed={isRTL} interval="preserveStartEnd" {...axisProps} />
              <YAxis orientation={isRTL ? 'right' : 'left'} width={34} {...axisProps} />
              <Tooltip
                cursor={{ fill: 'rgba(59,130,246,0.08)' }}
                content={<ChartTooltip suffix={unitLabel(units, locale)} />}
              />
              <Bar dataKey="volume" fill={CHART.series} radius={[4, 4, 0, 0]} maxBarSize={22} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  )
}
