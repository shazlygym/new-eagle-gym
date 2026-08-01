import { useState } from 'react'
import type { Units } from '../db/schema'
import { useT } from '../i18n'
import { formatNumber, unitLabel } from '../lib/format'
import { DEFAULT_BAR, planPlates, plannedTotal } from '../lib/plates'
import NumberField from './NumberField'
import Sheet from './Sheet'

interface Props {
  open: boolean
  onClose: () => void
  units: Units
  /** Weight to start from — normally the set you are about to lift. */
  initialTarget: number
}

export default function PlateCalculatorSheet({ open, onClose, units, initialTarget }: Props) {
  const { t, locale } = useT()
  const [bar, setBar] = useState(DEFAULT_BAR[units])
  // Opening it before any weight is entered should land on the empty bar, not on
  // a "lighter than the bar" warning.
  const [target, setTarget] = useState(initialTarget > 0 ? initialTarget : DEFAULT_BAR[units])
  const unit = unitLabel(units, locale)

  const plan = planPlates(target, bar, units)
  const achievable = plannedTotal(plan, bar)

  return (
    <Sheet open={open} onClose={onClose} title={t('plates.title')}>
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <NumberField
            label={`${t('plates.target')} (${unit})`}
            value={target}
            onChange={setTarget}
            step={2.5}
            steppers
          />
          <NumberField
            label={`${t('plates.bar')} (${unit})`}
            value={bar}
            onChange={setBar}
            step={2.5}
          />
        </div>

        {plan.belowBar ? (
          <p className="rounded-xl bg-ink-700 px-4 py-6 text-center text-sm text-ink-300">
            {t('plates.belowBar')}
          </p>
        ) : (
          <>
            <div className="rounded-xl bg-ink-700 p-4">
              <p className="mb-3 text-xs font-medium text-ink-200">{t('plates.perSide')}</p>

              {plan.perSide.length === 0 ? (
                <p className="text-sm text-ink-300">{t('plates.barOnly')}</p>
              ) : (
                <ul className="space-y-2">
                  {plan.perSide.map((stack) => (
                    <li key={stack.weight} className="flex items-center gap-3">
                      {/* Bar width tracks plate size, so the stack reads at a
                          glance the way a loaded bar looks. */}
                      <span
                        className="h-7 shrink-0 rounded bg-brand-gradient"
                        style={{ width: `${Math.max(10, (stack.weight / 25) * 46)}px` }}
                      />
                      <span className="tabular flex-1 text-sm font-semibold text-ink-50">
                        {formatNumber(stack.weight)} {unit}
                      </span>
                      <span className="tabular text-sm font-bold text-brand-500">
                        × {stack.count}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {plan.remainder > 0 && (
              <p className="text-xs leading-relaxed text-flame-400">
                {t('plates.remainder', {
                  amount: `${formatNumber(plan.remainder)} ${unit}`,
                  total: `${formatNumber(achievable)} ${unit}`,
                })}
              </p>
            )}
          </>
        )}
      </div>
    </Sheet>
  )
}
