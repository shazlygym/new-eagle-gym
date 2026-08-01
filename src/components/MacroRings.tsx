import ProgressRing from './ProgressRing'
import { useT } from '../i18n'

export interface Totals {
  kcal: number
  protein: number
  carbs: number
  fat: number
}

interface Props {
  totals: Totals
  targets: Partial<Totals>
  /** Offered inline while no calorie target is set, in the space the ring takes. */
  onSetTargets?: () => void
}

/**
 * The day at a glance: calories as the headline, macros as three small bars
 * underneath. Targets are optional — a member who only cares about calories
 * shouldn't be nagged by three empty macro rings.
 */
export default function MacroRings({ totals, targets, onSetTargets }: Props) {
  const { t } = useT()

  const kcalTarget = targets.kcal ?? 0
  const hasKcalTarget = kcalTarget > 0
  const remaining = kcalTarget - totals.kcal
  const over = remaining < 0

  return (
    <section className="card-accent p-5">
      <div className="flex items-center gap-4">
        {hasKcalTarget ? (
          <ProgressRing
            value={totals.kcal / kcalTarget}
            label={`${Math.round((totals.kcal / kcalTarget) * 100)}%`}
            size={72}
            stroke={6}
          />
        ) : null}

        <div className="min-w-0 flex-1">
          <p className="section-title">{t('nutrition.calories')}</p>
          <p className="tabular font-numeric text-3xl font-bold leading-tight text-ink-50">
            {Math.round(totals.kcal)}
            {hasKcalTarget && (
              <span className="text-base font-semibold text-ink-300"> / {kcalTarget}</span>
            )}
          </p>
          {hasKcalTarget && (
            <p className={`tabular mt-0.5 text-xs font-semibold ${over ? 'text-amber-400' : 'text-brand-400'}`}>
              {Math.abs(Math.round(remaining))} {over ? t('nutrition.over') : t('nutrition.remaining')}
            </p>
          )}
        </div>

        {/* Without a target the headline has nothing to sit beside, and the
            prompt to set one belongs exactly there rather than in a card of
            its own further down the page. */}
        {!hasKcalTarget && onSetTargets && (
          <button
            type="button"
            onClick={onSetTargets}
            className="shrink-0 rounded-xl bg-ink-600 px-3.5 py-2 text-xs font-semibold
                       text-brand-400 active:bg-ink-500"
          >
            {t('nutrition.setTargets')}
          </button>
        )}
      </div>

      <div className="mt-5 grid grid-cols-3 gap-3">
        <MacroBar label={t('nutrition.protein')} value={totals.protein} target={targets.protein} tint="bg-brand-500" />
        <MacroBar label={t('nutrition.carbs')} value={totals.carbs} target={targets.carbs} tint="bg-aqua-500" />
        <MacroBar label={t('nutrition.fat')} value={totals.fat} target={targets.fat} tint="bg-amber-400" />
      </div>
    </section>
  )
}

function MacroBar({
  label,
  value,
  target,
  tint,
}: {
  label: string
  value: number
  target?: number
  tint: string
}) {
  const { t } = useT()
  const ratio = target && target > 0 ? Math.min(1, value / target) : 0

  return (
    <div className="min-w-0">
      <p className="truncate text-[11px] font-medium text-ink-300">{label}</p>
      {/* The number and its unit read left-to-right in both languages, so the
          pair is isolated — otherwise Arabic puts the unit in front of it. */}
      <p className="tabular mt-0.5 truncate text-sm font-bold text-ink-50" dir="ltr">
        {Math.round(value)}
        {target ? <span className="font-medium text-ink-400">/{Math.round(target)}</span> : null}
        <span className="text-[10px] font-medium text-ink-400"> {t('common.g')}</span>
      </p>
      <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-ink-600">
        <div
          className={`h-full rounded-full transition-[width] duration-500 ${tint}`}
          style={{ width: `${ratio * 100}%` }}
        />
      </div>
    </div>
  )
}
