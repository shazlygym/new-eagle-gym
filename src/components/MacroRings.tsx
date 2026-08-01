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
    // The one raised surface on the food screen, the same material the plan
    // gets on Home. It used to be a lime-tinted panel, which spent the accent
    // on a background instead of on the one number that changes all day.
    <section className="card-hero p-5">
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
          <p className="eyebrow">{t('nutrition.calories')}</p>
          {/* Eaten today, at display size. The target beside it is the frame,
              not the fact — so it stays at a third of the weight. */}
          <p className="num-hero mt-1 text-ink-50">
            {Math.round(totals.kcal)}
            {hasKcalTarget && (
              <span className="text-base font-semibold text-ink-400"> / {kcalTarget}</span>
            )}
          </p>
          {hasKcalTarget && (
            <p className={`tabular mt-1 text-xs font-bold ${over ? 'text-flame-400' : 'text-brand-400'}`}>
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
            className="shrink-0 rounded-xl bg-ink-600 px-3.5 py-2.5 text-xs font-semibold
                       text-brand-400 active:bg-ink-500"
          >
            {t('nutrition.setTargets')}
          </button>
        )}
      </div>

      <div className="mt-5 grid grid-cols-3 gap-3">
        <MacroBar label={t('nutrition.protein')} value={totals.protein} target={targets.protein} tint="bg-brand-500" />
        <MacroBar label={t('nutrition.carbs')} value={totals.carbs} target={targets.carbs} tint="bg-aqua-500" />
        <MacroBar label={t('nutrition.fat')} value={totals.fat} target={targets.fat} tint="bg-flame-400" />
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
      {/* A dot in the macro's own colour, so the bar underneath is identifiable
          without reading back up to the label — the three bars are the same
          shape and only colour tells them apart. */}
      <p className="flex items-center gap-1.5 truncate text-[11px] font-medium text-ink-300">
        <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${tint}`} />
        <span className="truncate">{label}</span>
      </p>
      {/* The number and its unit read left-to-right in both languages, so the
          pair is isolated — otherwise Arabic puts the unit in front of it. */}
      <p className="tabular mt-1 truncate text-sm font-bold text-ink-50" dir="ltr">
        {Math.round(value)}
        {target ? <span className="font-medium text-ink-400">/{Math.round(target)}</span> : null}
        <span className="text-[10px] font-medium text-ink-400"> {t('common.g')}</span>
      </p>
      <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-ink-950/60">
        <div
          className={`h-full rounded-full transition-[width] duration-500 ${tint}`}
          style={{ width: `${ratio * 100}%` }}
        />
      </div>
    </div>
  )
}
