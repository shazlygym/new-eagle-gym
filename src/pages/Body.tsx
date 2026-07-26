import { useLiveQuery } from 'dexie-react-hooks'
import { Ruler, Trash2 } from 'lucide-react'
import { useState } from 'react'
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { CHART, ChartCard, ChartTooltip } from '../components/Chart'
import ConfirmDialog from '../components/ConfirmDialog'
import EmptyState from '../components/EmptyState'
import NumberField from '../components/NumberField'
import PageHeader from '../components/PageHeader'
import Sheet from '../components/Sheet'
import { bodyWeightSeries } from '../db/queries'
import { deleteBodyStat, listBodyStats, saveBodyStat, today } from '../db/repository'
import { useT } from '../i18n'
import {
  formatNumber,
  formatShortDay,
  toDisplayWeight,
  toStoredWeight,
  unitLabel,
} from '../lib/format'
import { useActiveProfile } from '../lib/useActiveProfile'

/** Circumference fields, all stored in centimetres. */
const MEASUREMENTS = ['chest', 'waist', 'hips', 'arms', 'thighs'] as const
type Measurement = (typeof MEASUREMENTS)[number]

export default function Body() {
  const { t, locale, isRTL } = useT()
  const { profile, units } = useActiveProfile()
  const profileId = profile?.id

  const [formOpen, setFormOpen] = useState(false)
  const [pendingDelete, setPendingDelete] = useState<string | null>(null)

  const stats = useLiveQuery(() => (profileId ? listBodyStats(profileId) : []), [profileId]) ?? []

  if (!profile) return null

  const series = bodyWeightSeries(stats).map((point) => ({
    ...point,
    weight: toDisplayWeight(point.weight, units),
  }))

  return (
    <div>
      <PageHeader
        title={t('body.title')}
        onBack="history"
        action={
          <button
            type="button"
            onClick={() => setFormOpen(true)}
            className="rounded-xl bg-gold-500 px-4 py-2 text-sm font-semibold text-dark-900 active:scale-95 transition-transform"
          >
            {t('common.add')}
          </button>
        }
      />

      <div className="space-y-4 px-4 py-4">
        {series.length >= 2 && (
          <ChartCard title={t('body.chartTitle')} subtitle={unitLabel(units, locale)}>
            <ResponsiveContainer width="100%" height={180}>
              <LineChart data={series} margin={{ top: 8, right: 8, bottom: 0, left: 4 }}>
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
                  domain={['dataMin - 2', 'dataMax + 2']}
                  tick={{ fill: CHART.axis, fontSize: 10 }}
                />
                <Tooltip
                  cursor={{ stroke: CHART.axis, strokeDasharray: '3 3' }}
                  content={<ChartTooltip suffix={unitLabel(units, locale)} />}
                />
                <Line
                  type="monotone"
                  dataKey="weight"
                  stroke={CHART.series}
                  strokeWidth={2}
                  dot={{ r: 4, fill: CHART.series, strokeWidth: 0 }}
                  activeDot={{ r: 6, fill: CHART.series, stroke: CHART.surface, strokeWidth: 2 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </ChartCard>
        )}

        {stats.length === 0 ? (
          <EmptyState icon={Ruler} title={t('body.empty')} body={t('body.emptyHint')} />
        ) : (
          <section>
            <h2 className="mb-2 px-1 text-sm font-semibold text-dark-100">{t('body.history')}</h2>
            <ul className="space-y-1.5">
              {[...stats].reverse().map((stat) => (
                <li key={stat.id} className="card flex items-start gap-3 p-4">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-dark-50">
                      {formatShortDay(new Date(`${stat.date}T00:00:00`), locale)}
                    </p>
                    <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-dark-300">
                      {stat.weight !== undefined && (
                        <span className="tabular">
                          {t('body.weight')}: {formatNumber(toDisplayWeight(stat.weight, units))}{' '}
                          {unitLabel(units, locale)}
                        </span>
                      )}
                      {stat.bodyFat !== undefined && (
                        <span className="tabular">
                          {t('body.bodyFat')}: {formatNumber(stat.bodyFat)}
                        </span>
                      )}
                      {MEASUREMENTS.filter((key) => stat[key] !== undefined).map((key) => (
                        <span key={key} className="tabular">
                          {t(`body.${key}`)}: {formatNumber(stat[key]!)} {t('common.cm')}
                        </span>
                      ))}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setPendingDelete(stat.id)}
                    aria-label={t('common.delete')}
                    className="shrink-0 rounded-lg p-1.5 text-dark-300 active:bg-dark-600"
                  >
                    <Trash2 size={16} />
                  </button>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>

      <BodyStatSheet
        open={formOpen}
        units={units}
        onClose={() => setFormOpen(false)}
        onSave={async (input) => {
          await saveBodyStat(profile.id, input)
          setFormOpen(false)
        }}
      />

      <ConfirmDialog
        open={pendingDelete !== null}
        title={t('body.deleteConfirm')}
        body={t('common.confirmDelete')}
        confirmLabel={t('common.delete')}
        destructive
        onCancel={() => setPendingDelete(null)}
        onConfirm={() => {
          if (pendingDelete) void deleteBodyStat(pendingDelete)
          setPendingDelete(null)
        }}
      />
    </div>
  )
}

function BodyStatSheet({
  open,
  units,
  onClose,
  onSave,
}: {
  open: boolean
  units: 'kg' | 'lb'
  onClose: () => void
  onSave: (input: {
    date: string
    weight?: number
    bodyFat?: number
    chest?: number
    waist?: number
    hips?: number
    arms?: number
    thighs?: number
    notes?: string
  }) => Promise<void>
}) {
  const { t, locale } = useT()
  const [date, setDate] = useState(today())
  const [weight, setWeight] = useState(0)
  const [bodyFat, setBodyFat] = useState(0)
  const [sizes, setSizes] = useState<Record<Measurement, number>>({
    chest: 0,
    waist: 0,
    hips: 0,
    arms: 0,
    thighs: 0,
  })

  // Zero means "not measured" rather than a real reading, so it is dropped
  // instead of being written as a data point.
  const orUndefined = (value: number) => (value > 0 ? value : undefined)

  const submit = async () => {
    await onSave({
      date,
      weight: weight > 0 ? toStoredWeight(weight, units) : undefined,
      bodyFat: orUndefined(bodyFat),
      ...Object.fromEntries(MEASUREMENTS.map((key) => [key, orUndefined(sizes[key])])),
    })
  }

  return (
    <Sheet open={open} onClose={onClose} title={t('body.log')}>
      <div className="space-y-4">
        <div>
          <label className="mb-1.5 block text-xs font-medium text-dark-200" htmlFor="stat-date">
            {t('body.date')}
          </label>
          <input
            id="stat-date"
            type="date"
            value={date}
            onChange={(event) => setDate(event.target.value)}
            className="field"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <NumberField
            label={`${t('body.weight')} (${unitLabel(units, locale)})`}
            value={weight}
            onChange={setWeight}
            step={0.5}
          />
          <NumberField label={t('body.bodyFat')} value={bodyFat} onChange={setBodyFat} step={0.5} />
        </div>

        <div className="grid grid-cols-2 gap-3">
          {MEASUREMENTS.map((key) => (
            <NumberField
              key={key}
              label={`${t(`body.${key}`)} (${t('common.cm')})`}
              value={sizes[key]}
              onChange={(value) => setSizes({ ...sizes, [key]: value })}
            />
          ))}
        </div>

        <button type="button" onClick={submit} className="btn-primary w-full">
          {t('common.save')}
        </button>
      </div>
    </Sheet>
  )
}
