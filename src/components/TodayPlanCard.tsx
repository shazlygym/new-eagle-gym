import { Check, Play } from 'lucide-react'
import type { Program } from '../db/schema'
import type { ProgramProgress } from '../db/queries'
import { routineName, useT } from '../i18n'
import ProgressRing from './ProgressRing'

interface Props {
  program: Program
  progress: ProgramProgress
  onStartDay: (dayIndex: number) => void
}

/**
 * What the plan says to do today. This is the difference between an app you open
 * to record what you improvised and one that tells you what to train.
 */
export default function TodayPlanCard({ program, progress, onStartDay }: Props) {
  const { t, locale } = useT()

  const next = program.days[progress.nextDayIndex]
  const weekDone = progress.doneThisWeek.length
  const weekRatio = program.days.length > 0 ? weekDone / program.days.length : 0

  return (
    <section className="card overflow-hidden border-gold-500/25">
      <div className="flex items-center gap-3 p-4">
        <ProgressRing value={weekRatio} label={`${weekDone}/${program.days.length}`} size={54} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-dark-50">
            {routineName(program, locale)}
          </p>
          <p className="mt-0.5 text-xs text-dark-300">
            {progress.complete
              ? t('programs.complete')
              : t('programs.weekOf', { week: progress.week, total: progress.totalWeeks })}
          </p>
        </div>
      </div>

      {!progress.complete && next && (
        <button
          type="button"
          onClick={() => onStartDay(progress.nextDayIndex)}
          className="flex w-full items-center gap-3 border-t border-dark-500/50 bg-gold-500/10
                     px-4 py-3.5 text-start active:bg-gold-500/20"
        >
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-gold-500">
              {t('home.nextUp')}
            </p>
            <p className="truncate font-semibold text-dark-50">
              {locale === 'ar' ? next.labelAr : next.labelEn}
            </p>
          </div>
          <Play size={20} className="shrink-0 text-gold-500" fill="currentColor" />
        </button>
      )}

      {/* Dots for the week, so a glance shows what is left. */}
      {!progress.complete && program.days.length > 1 && (
        <div className="flex gap-1.5 border-t border-dark-500/50 px-4 py-3">
          {program.days.map((day, index) => {
            const done = progress.doneThisWeek.includes(index)
            return (
              <div
                key={index}
                title={locale === 'ar' ? day.labelAr : day.labelEn}
                className={`flex h-6 flex-1 items-center justify-center rounded-md text-[10px] font-bold
                            ${
                              done
                                ? 'bg-green-500/20 text-green-400'
                                : index === progress.nextDayIndex
                                  ? 'bg-gold-500/20 text-gold-400'
                                  : 'bg-dark-600 text-dark-300'
                            }`}
              >
                {done ? <Check size={12} strokeWidth={3} /> : index + 1}
              </div>
            )
          })}
        </div>
      )}
    </section>
  )
}
