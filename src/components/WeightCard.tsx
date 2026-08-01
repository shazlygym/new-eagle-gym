import { useLiveQuery } from 'dexie-react-hooks'
import { Scale, TrendingDown, TrendingUp } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { listBodyStats, saveBodyStat, today } from '../db/repository'
import { useT } from '../i18n'
import { formatNumber, toDisplayWeight, toStoredWeight, unitLabel } from '../lib/format'
import { useActiveProfile } from '../lib/useActiveProfile'
import NumberField from './NumberField'
import Sheet from './Sheet'

/**
 * Weighing yourself is a daily habit and the full measurements form is not — so
 * the number lives on Home behind a single tap, and the tape-measure fields stay
 * on the Body screen where they belong.
 */
export default function WeightCard() {
  const { t, locale } = useT()
  const { profile, units } = useActiveProfile()
  const profileId = profile?.id
  const [open, setOpen] = useState(false)

  const stats = useLiveQuery(() => (profileId ? listBodyStats(profileId) : []), [profileId]) ?? []

  if (!profile) return null

  const weighed = stats.filter((stat) => stat.weight !== undefined)
  const latest = weighed.at(-1)
  const previous = weighed.at(-2)
  // Comparing against the reading before it, not a fixed window: someone who
  // weighs in weekly and someone who weighs in daily both get a meaningful delta.
  const delta =
    latest && previous
      ? toDisplayWeight(latest.weight!, units) - toDisplayWeight(previous.weight!, units)
      : null
  const Trend = delta !== null && delta < 0 ? TrendingDown : TrendingUp

  return (
    <>
      <div className="card flex items-center gap-3 p-4">
        <Link to="/body" className="flex min-w-0 flex-1 items-center gap-3">
          <div className="rounded-xl bg-ink-600 p-2.5 text-brand-500">
            <Scale size={18} />
          </div>
          <div className="min-w-0">
            <p className="text-xs text-ink-300">{t('body.weight')}</p>
            {latest ? (
              <p className="tabular truncate font-semibold text-ink-50">
                {formatNumber(toDisplayWeight(latest.weight!, units))} {unitLabel(units, locale)}
                {delta !== null && Math.abs(delta) >= 0.05 && (
                  <span
                    className={`ms-2 inline-flex items-center gap-0.5 text-xs font-medium
                                ${delta < 0 ? 'text-emerald-400' : 'text-amber-400'}`}
                  >
                    <Trend size={12} />
                    {formatNumber(Math.abs(delta))}
                  </span>
                )}
              </p>
            ) : (
              <p className="truncate text-sm text-ink-200">{t('body.noWeightYet')}</p>
            )}
          </div>
        </Link>

        <button
          type="button"
          onClick={() => setOpen(true)}
          className="shrink-0 rounded-xl bg-brand-500 px-3.5 py-2 text-xs font-semibold
                     text-ink-950 transition-transform active:scale-95"
        >
          {t('body.logWeight')}
        </button>
      </div>

      {/* Mounted only while open so the field starts from the latest reading
          every time rather than from whatever it held on first render. */}
      {open && (
        <QuickWeightSheet
          units={units}
          initial={latest?.weight !== undefined ? toDisplayWeight(latest.weight, units) : 0}
          onClose={() => setOpen(false)}
          onSave={async (value) => {
            await saveBodyStat(
              profile.id,
              { date: today(), weight: toStoredWeight(value, units) },
              { merge: true }
            )
            setOpen(false)
          }}
        />
      )}
    </>
  )
}

function QuickWeightSheet({
  units,
  initial,
  onClose,
  onSave,
}: {
  units: 'kg' | 'lb'
  initial: number
  onClose: () => void
  onSave: (value: number) => Promise<void>
}) {
  const { t, locale } = useT()
  const [weight, setWeight] = useState(initial)

  return (
    <Sheet open onClose={onClose} title={t('body.logWeight')}>
      <div className="space-y-4">
        <NumberField
          label={`${t('body.weight')} (${unitLabel(units, locale)})`}
          value={weight}
          onChange={setWeight}
          step={0.1}
        />
        <button
          type="button"
          onClick={() => weight > 0 && void onSave(weight)}
          className="btn-primary w-full"
        >
          {t('common.save')}
        </button>
        <Link to="/body" className="block text-center text-xs font-medium text-brand-500">
          {t('body.fullMeasurements')}
        </Link>
      </div>
    </Sheet>
  )
}
