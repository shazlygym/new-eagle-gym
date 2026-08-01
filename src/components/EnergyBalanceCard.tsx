import { format, parseISO, subDays } from 'date-fns'
import { useLiveQuery } from 'dexie-react-hooks'
import { Flame, TrendingDown, TrendingUp } from 'lucide-react'
import { useMemo, useState } from 'react'
import { energyBalance } from '../db/queries'
import { listBodyStats, listMealEntriesBetween, today, updateProfile } from '../db/repository'
import type { Profile } from '../db/schema'
import { useT } from '../i18n'
import { formatNumber, unitLabel } from '../lib/format'

/** Long enough for the scale's noise to average out, short enough to still be you. */
const WINDOW_DAYS = 28

/**
 * Pounds in a kilogram, converted here rather than through `toDisplayWeight`:
 * that one rounds to the nearest half unit because it is for loading a bar, and
 * a quarter-kilo-a-week trend would round away to nothing.
 */
const LB_PER_KG = 2.2046226218

/** What the maths needs before it will speak. Mirrors the gate in `energyBalance`. */
const NEEDS = { days: 7, weighIns: 2, spanDays: 7 }

/**
 * What maintenance actually is for this body, measured rather than predicted.
 *
 * The targets sheet runs Mifflin–St Jeor, which is the right way to start and
 * the wrong way to stay: it is a population average, and any one person sits up
 * to a few hundred calories either side of it. After a month of food logs and
 * weigh-ins that guess is obsolete — the body has answered the question out
 * loud, and this card is where it gets to say so.
 *
 * The window is fixed at four weeks whatever period the page is showing. It is
 * about a trend, not about the range someone happened to tap.
 */
export default function EnergyBalanceCard({ profile }: { profile: Profile }) {
  const { t, locale } = useT()
  const [applying, setApplying] = useState(false)
  const units = profile.units

  const end = today()
  const from = format(subDays(parseISO(end), WINDOW_DAYS - 1), 'yyyy-MM-dd')

  const entries = useLiveQuery(
    () => listMealEntriesBetween(profile.id, from, end),
    [profile.id, from, end]
  )
  const stats = useLiveQuery(() => listBodyStats(profile.id), [profile.id])

  const balance = useMemo(
    () => energyBalance(entries ?? [], stats ?? [], end, WINDOW_DAYS, profile.nutritionGoal),
    [entries, stats, end, profile.nutritionGoal]
  )

  const apply = async () => {
    if (applying || balance.suggestedKcal === null) return
    setApplying(true)
    try {
      const kcal = balance.suggestedKcal
      // Protein and fat were set for reasons that a calorie change does not
      // touch; carbs absorb the difference. Same rule the calculator follows
      // when it lays the targets out in the first place.
      const protein = profile.proteinTarget
      const fat = profile.fatTarget
      const carbs =
        protein && fat
          ? Math.max(0, Math.round((kcal - protein * 4 - fat * 9) / 4 / 5) * 5)
          : undefined
      await updateProfile(profile.id, {
        kcalTarget: kcal,
        ...(carbs === undefined ? {} : { carbsTarget: carbs }),
      })
    } finally {
      setApplying(false)
    }
  }

  const gaining = balance.weightChangePerWeek > 0.05
  const losing = balance.weightChangePerWeek < -0.05
  const rate =
    units === 'lb' ? balance.weightChangePerWeek * LB_PER_KG : balance.weightChangePerWeek
  const signedRate = `${rate > 0 ? '+' : ''}${rate.toFixed(2)}`

  // No number yet — and the two reasons for that are not the same problem. One
  // of them is solved by waiting; the other never is, so it gets told plainly
  // instead of being dressed up as progress.
  if (balance.measuredTdee === null) {
    if (balance.reason === 'impossible') {
      return (
        <section className="card p-4">
          <h2 className="text-sm font-semibold text-ink-50">{t('energy.title')}</h2>
          <p className="mt-2 text-xs leading-relaxed text-ink-300">{t('energy.impossible')}</p>
          {/* The two figures that cannot both be true, side by side. Saying they
              disagree without showing them asks for trust the card hasn't earned. */}
          <div className="mt-3 flex gap-2">
            <Figure
              label={t('energy.avgIntake')}
              value={formatNumber(Math.round(balance.avgKcal))}
              unit={t('nutrition.kcalUnit')}
            />
            <Figure
              label={t('energy.weightTrend')}
              value={signedRate}
              unit={`${unitLabel(units, locale)} / ${t('energy.perWeek')}`}
            />
          </div>
        </section>
      )
    }

    // Not enough yet. Say what is missing rather than hiding the card — the
    // whole point is that this arrives once you have kept it up, and nobody
    // keeps up something they were never told about.
    return (
      <section className="card p-4">
        <h2 className="text-sm font-semibold text-ink-50">{t('energy.title')}</h2>
        <p className="mt-2 text-xs leading-relaxed text-ink-300">{t('energy.needMore')}</p>
        <div className="mt-3 flex gap-2">
          <Requirement
            label={t('energy.daysLogged')}
            value={balance.loggedDays}
            total={NEEDS.days}
            done={balance.loggedDays >= NEEDS.days}
          />
          {/* Two weigh-ins taken the same morning are one weigh-in. The bar only
              turns over when they are far enough apart to make a line. */}
          <Requirement
            label={t('energy.weighIns')}
            value={balance.weighIns}
            total={NEEDS.weighIns}
            done={balance.weighIns >= NEEDS.weighIns && balance.spanDays >= NEEDS.spanDays}
          />
        </div>
      </section>
    )
  }

  const alreadySet =
    balance.suggestedKcal !== null && profile.kcalTarget === balance.suggestedKcal

  return (
    <section className="card p-4">
      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1">
          <h2 className="text-sm font-semibold text-ink-50">{t('energy.title')}</h2>
          <p className="mt-0.5 text-xs text-ink-300">{t('energy.subtitle')}</p>
        </div>
        <Flame size={18} className="mt-0.5 shrink-0 text-brand-500" />
      </div>

      {/* The measured number is the whole card. It is set at display size
          because it is the one thing here that no calculator could have told
          you — everything under it is the working that produced it. */}
      <p className="num-hero mt-4 text-brand-500">{formatNumber(balance.measuredTdee)}</p>
      <p className="mt-1.5 text-xs text-ink-300">{t('energy.maintenance')}</p>

      <dl className="mt-4 space-y-2 border-t border-ink-500/40 pt-3">
        <div className="flex items-center gap-2">
          <dt className="min-w-0 flex-1 text-xs text-ink-200">{t('energy.avgIntake')}</dt>
          <dd className="tabular shrink-0 text-sm font-semibold text-ink-50">
            {formatNumber(Math.round(balance.avgKcal))}
          </dd>
        </div>
        <div className="flex items-center gap-2">
          <dt className="min-w-0 flex-1 text-xs text-ink-200">{t('energy.weightTrend')}</dt>
          <dd className="flex shrink-0 items-center gap-1">
            {gaining && <TrendingUp size={13} className="text-plum-400" />}
            {losing && <TrendingDown size={13} className="text-brand-400" />}
            {/* Signed digits and a unit with no strong character of its own —
                bare in Arabic the minus jumps to the far end of the number. */}
            <span className="tabular font-numeric text-sm font-semibold text-ink-50" dir="ltr">
              {signedRate}
            </span>
            <span className="text-[11px] text-ink-300">
              {unitLabel(units, locale)} {t('energy.perWeek')}
            </span>
          </dd>
        </div>
      </dl>

      {balance.suggestedKcal !== null && (
        <button
          type="button"
          onClick={apply}
          disabled={applying || alreadySet}
          className="btn-primary mt-4 w-full text-sm disabled:opacity-40"
        >
          {alreadySet
            ? t('energy.targetMatches')
            : t('energy.setTarget', { kcal: balance.suggestedKcal })}
        </button>
      )}

      <p className="mt-3 text-[11px] leading-relaxed text-ink-400">
        {t(balance.confidence === 'good' ? 'energy.basis' : 'energy.basisLow', {
          days: balance.loggedDays,
          weighIns: balance.weighIns,
        })}
      </p>
    </section>
  )
}

/** How far along one of the two things this card is waiting for. */
function Requirement({
  label,
  value,
  total,
  done,
}: {
  label: string
  value: number
  total: number
  done: boolean
}) {
  return (
    <div className="card-sunk flex-1 px-3 py-2.5">
      <p
        className={`tabular font-numeric text-sm font-bold ${done ? 'text-brand-500' : 'text-ink-50'}`}
        dir="ltr"
      >
        {/* Capped: this is a requirement, not a tally. "21/7" reads as an error. */}
        {Math.min(value, total)}
        <span className="text-[11px] font-medium text-ink-400">/{total}</span>
      </p>
      <p className="mt-0.5 truncate text-[10px] text-ink-300">{label}</p>
    </div>
  )
}

/** One of the two numbers that are refusing to agree with each other. */
function Figure({ label, value, unit }: { label: string; value: string; unit: string }) {
  return (
    <div className="card-sunk min-w-0 flex-1 px-3 py-2.5">
      <p className="tabular font-numeric text-sm font-bold text-ink-50" dir="ltr">
        {value}
      </p>
      <p className="mt-0.5 truncate text-[10px] text-ink-300">{unit}</p>
      <p className="mt-1 truncate text-[10px] text-ink-400">{label}</p>
    </div>
  )
}
