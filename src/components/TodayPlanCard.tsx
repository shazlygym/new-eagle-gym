import { Check, Play } from 'lucide-react'
import type { Program } from '../db/schema'
import type { ProgramProgress } from '../db/queries'
import { routineName, useT } from '../i18n'

interface Props {
  program: Program
  progress: ProgramProgress
  onStartDay: (dayIndex: number) => void
}

/**
 * What the plan says to do today. This is the difference between an app you open
 * to record what you improvised and one that tells you what to train — so on the
 * home screen it is the hero, not a card among cards.
 *
 * The layout follows the order the question is actually asked in: *what am I
 * training* at display size, the plan and the week underneath it in small type,
 * and the whole thing wrapped in one tap target. The progress ring that used to
 * lead the card was answering "how is the week going", which nobody opens the
 * app to find out — the row of day bars along the bottom says the same thing in
 * a strip and leaves the top of the card for the answer.
 */
export default function TodayPlanCard({ program, progress, onStartDay }: Props) {
  const { t, locale } = useT()

  const next = program.days[progress.nextDayIndex]
  const weekDone = progress.doneThisWeek.length

  return (
    <section className="card-hero">
      {/* Everything above the day strip is one target: on a phone, "the thing I
          am here to do" should not require finding the small play button. */}
      <button
        type="button"
        onClick={() => onStartDay(progress.nextDayIndex)}
        disabled={progress.complete || !next}
        className="flex w-full items-start gap-3 p-4 text-start
                   active:bg-ink-50/[0.04] disabled:active:bg-transparent"
      >
        <div className="min-w-0 flex-1">
          <p className="eyebrow text-brand-500">
            {progress.complete ? t('programs.complete') : t('home.nextUp')}
          </p>

          {/* The one line the screen exists to deliver. */}
          <p className="mt-1.5 truncate text-[26px] font-extrabold leading-[1.1] tracking-[-0.02em] text-ink-50">
            {progress.complete
              ? routineName(program, locale)
              : locale === 'ar'
                ? next?.labelAr
                : next?.labelEn}
          </p>

          {/* The plan it comes from, demoted to a caption. It is context for the
              line above, not a headline of its own. */}
          <p className="mt-1 truncate text-xs text-ink-300">
            {routineName(program, locale)}
            {!progress.complete && (
              <>
                {' · '}
                {t('programs.weekOf', { week: progress.week, total: progress.totalWeeks })}
              </>
            )}
          </p>
        </div>

        {!progress.complete && next && (
          <span
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full
                       bg-brand-gradient text-ink-950 shadow-brand"
          >
            <Play size={20} fill="currentColor" className="ms-0.5 rtl-flip" />
          </span>
        )}
      </button>

      {/* One bar per training day. Filled = done, hollow with a lime edge = the
          one you are about to do, flat = still ahead. Three states told by
          three different treatments rather than three shades of the same
          colour, which is what the old dots did — "done" and "next" were both
          a lime tint and read as the same thing. */}
      {!progress.complete && program.days.length > 1 && (
        <div className="flex items-center gap-1.5 border-t border-ink-500/40 bg-ink-950/30 px-4 py-2.5">
          {program.days.map((day, index) => {
            const done = progress.doneThisWeek.includes(index)
            const isNext = index === progress.nextDayIndex
            return (
              <div
                key={index}
                title={locale === 'ar' ? day.labelAr : day.labelEn}
                className={`flex h-5 flex-1 items-center justify-center rounded text-[10px] font-extrabold
                            ${
                              done
                                ? 'bg-brand-500 text-ink-950'
                                : isNext
                                  ? 'border border-brand-500 bg-brand-500/10 text-brand-400'
                                  : 'bg-ink-600 text-ink-400'
                            }`}
              >
                {done ? <Check size={11} strokeWidth={3.5} /> : index + 1}
              </div>
            )
          })}
          <span className="tabular ps-1 text-[10px] font-bold text-ink-400">
            {weekDone}/{program.days.length}
          </span>
        </div>
      )}
    </section>
  )
}
