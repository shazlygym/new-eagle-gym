import { format, parseISO, subDays } from 'date-fns'
import { useLiveQuery } from 'dexie-react-hooks'
import { ChevronRight, UtensilsCrossed } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Bar,
  BarChart,
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { CHART, ChartCard, ChartTooltip } from '../components/Chart'
import EmptyState from '../components/EmptyState'
import EnergyBalanceCard from '../components/EnergyBalanceCard'
import PageHeader from '../components/PageHeader'
import SegmentedControl from '../components/SegmentedControl'
import { nutritionPeriod } from '../db/queries'
import { listMealEntriesBetween, today } from '../db/repository'
import { useT } from '../i18n'
import { dateLocale, formatShortDay } from '../lib/format'
import { useActiveProfile } from '../lib/useActiveProfile'

type Period = '7' | '30' | '90'

/**
 * Everything logged, day by day, for as far back as the member wants to look.
 *
 * The Nutrition screen only ever shows one day and a seven-bar calorie strip;
 * answering "what was my protein like last month" from it means tapping the
 * back arrow thirty times. This screen answers it in one.
 */
export default function NutritionHistory() {
  const { t, locale, isRTL } = useT()
  const { profile } = useActiveProfile()
  const profileId = profile?.id
  const navigate = useNavigate()

  const [period, setPeriod] = useState<Period>('30')
  const days = Number(period)

  const end = today()
  const from = format(subDays(parseISO(end), days - 1), 'yyyy-MM-dd')

  const entries = useLiveQuery(
    () => (profileId ? listMealEntriesBetween(profileId, from, end) : []),
    [profileId, from, end]
  )

  const summary = useMemo(
    () => nutritionPeriod(entries ?? [], end, days, profile?.kcalTarget),
    [entries, end, days, profile?.kcalTarget]
  )

  // Only the logged days go on the charts. A zero-height bar for a day nobody
  // recorded looks identical to a day of fasting, and there is no honest way to
  // draw the difference — so the gap is simply left out of the series.
  const chartData = useMemo(
    () =>
      summary.days
        .filter((day) => day.logged)
        .map((day) => ({
          label: formatShortDay(parseISO(day.date), locale),
          kcal: Math.round(day.kcal),
          protein: Math.round(day.protein),
        })),
    [summary.days, locale]
  )

  const recent = useMemo(
    () => summary.days.filter((day) => day.logged).reverse(),
    [summary.days]
  )

  if (!profile) return null

  const periodOptions = [
    { value: '7' as const, label: t('nutrition.days7') },
    { value: '30' as const, label: t('nutrition.days30') },
    { value: '90' as const, label: t('nutrition.days90') },
  ]

  const axis = {
    reversed: isRTL,
    tickLine: false,
    axisLine: false,
    tick: { fill: CHART.axis, fontSize: 10 },
    interval: 'preserveStartEnd' as const,
  }

  return (
    <div className="pb-6">
      <PageHeader title={t('nutrition.history')} onBack="history" />

      <div className="space-y-4 px-5 py-4">
        <SegmentedControl value={period} options={periodOptions} onChange={setPeriod} />

        {summary.loggedDays === 0 ? (
          <EmptyState
            icon={UtensilsCrossed}
            title={t('nutrition.noHistory')}
            body={t('nutrition.noHistoryHint')}
          />
        ) : (
          <>
            {/* First, because it is the only thing on this page that tells you
                what to do next. It reads a fixed four-week window of its own —
                a trend needs more room than the seven-day tab gives it. */}
            <EnergyBalanceCard profile={profile} />

            <section className="card p-4">
              <div className="flex items-baseline justify-between gap-2">
                <h2 className="section-title">{t('nutrition.average')}</h2>
                <span className="tabular text-xs text-ink-300">
                  {t('nutrition.loggedDays', { count: summary.loggedDays, total: days })}
                </span>
              </div>

              <div className="mt-3 grid grid-cols-4 gap-2">
                <Stat label={t('nutrition.calories')} value={summary.average.kcal} />
                <Stat
                  label={t('nutrition.protein')}
                  value={summary.average.protein}
                  suffix={t('common.g')}
                />
                <Stat
                  label={t('nutrition.carbs')}
                  value={summary.average.carbs}
                  suffix={t('common.g')}
                />
                <Stat
                  label={t('nutrition.fat')}
                  value={summary.average.fat}
                  suffix={t('common.g')}
                />
              </div>

              {summary.onTargetDays !== undefined && (
                <p className="mt-3 text-xs text-ink-300">
                  {t('nutrition.onTargetDays', {
                    count: summary.onTargetDays,
                    total: summary.loggedDays,
                  })}
                </p>
              )}
            </section>

            <ChartCard title={t('nutrition.caloriesPerDay')} subtitle={t('nutrition.kcalUnit')}>
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={chartData} margin={{ top: 4, right: 4, bottom: 0, left: 4 }}>
                  <CartesianGrid stroke={CHART.grid} vertical={false} />
                  <XAxis dataKey="label" {...axis} />
                  <YAxis
                    orientation={isRTL ? 'right' : 'left'}
                    tickLine={false}
                    axisLine={false}
                    width={38}
                    tick={{ fill: CHART.axis, fontSize: 10 }}
                    tickFormatter={(value: number) =>
                      value >= 1000 ? `${Math.round(value / 100) / 10}k` : `${value}`
                    }
                  />
                  <Tooltip
                    cursor={{ fill: '#ffffff08' }}
                    content={<ChartTooltip suffix={t('nutrition.kcalUnit')} />}
                  />
                  {/* The target as a line rather than a second series: the
                      question is how far each day sat from it, not what the
                      target was on that date. */}
                  {profile.kcalTarget && (
                    <ReferenceLine y={profile.kcalTarget} stroke="#38BDF8" strokeDasharray="4 4" />
                  )}
                  <Bar dataKey="kcal" fill={CHART.series} radius={[4, 4, 0, 0]} maxBarSize={28} />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>

            <ChartCard title={t('nutrition.proteinPerDay')} subtitle={t('common.g')}>
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={chartData} margin={{ top: 4, right: 4, bottom: 0, left: 4 }}>
                  <CartesianGrid stroke={CHART.grid} vertical={false} />
                  <XAxis dataKey="label" {...axis} />
                  <YAxis
                    orientation={isRTL ? 'right' : 'left'}
                    tickLine={false}
                    axisLine={false}
                    width={38}
                    tick={{ fill: CHART.axis, fontSize: 10 }}
                  />
                  <Tooltip
                    cursor={{ fill: '#ffffff08' }}
                    content={<ChartTooltip suffix={t('common.g')} />}
                  />
                  {profile.proteinTarget && (
                    <ReferenceLine
                      y={profile.proteinTarget}
                      stroke="#38BDF8"
                      strokeDasharray="4 4"
                    />
                  )}
                  <Bar dataKey="protein" fill="#38BDF8" radius={[4, 4, 0, 0]} maxBarSize={28} />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>

            <section className="card overflow-hidden">
              <h2 className="section-title px-4 pt-4">{t('nutrition.everyDay')}</h2>
              <ul className="mt-2 divide-y divide-ink-600/60">
                {recent.map((day) => (
                  <li key={day.date}>
                    <button
                      type="button"
                      onClick={() => navigate(`/nutrition?date=${day.date}`)}
                      className="flex w-full items-center gap-3 px-4 py-3 text-start active:bg-ink-600/40"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-ink-50">
                          {day.date === today()
                            ? t('common.today')
                            : format(parseISO(day.date), 'EEEE d MMM', {
                                locale: dateLocale(locale),
                              })}
                        </p>
                        {/* No dir override here: the labels are translated, so
                            forcing LTR would reorder the Arabic runs and print
                            the macros back to front. */}
                        <p className="tabular mt-0.5 text-xs text-ink-300">
                          {t('nutrition.protein')} {Math.round(day.protein)}
                          {t('common.g')} · {t('nutrition.carbs')} {Math.round(day.carbs)}
                          {t('common.g')} · {t('nutrition.fat')} {Math.round(day.fat)}
                          {t('common.g')}
                        </p>
                      </div>
                      <span className="tabular shrink-0 text-sm font-semibold text-brand-400">
                        {Math.round(day.kcal)}
                      </span>
                      <ChevronRight size={16} className="rtl-flip shrink-0 text-ink-400" />
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          </>
        )}
      </div>
    </div>
  )
}

function Stat({ label, value, suffix }: { label: string; value: number; suffix?: string }) {
  return (
    <div className="rounded-xl bg-ink-800 px-2 py-2.5 text-center">
      <p className="tabular text-base font-bold text-ink-50" dir="ltr">
        {value}
        {suffix && <span className="text-[10px] font-medium text-ink-300">{suffix}</span>}
      </p>
      <p className="mt-0.5 truncate text-[10px] text-ink-300">{label}</p>
    </div>
  )
}
