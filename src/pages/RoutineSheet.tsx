import { isSameDay } from 'date-fns'
import { useLiveQuery } from 'dexie-react-hooks'
import {
  ArrowDown,
  ArrowUp,
  ChevronsRight,
  CopyPlus,
  MoveHorizontal,
  Pencil,
  Play,
  Plus,
} from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import PageHeader from '../components/PageHeader'
import SheetCellEditor from '../components/SheetCellEditor'
import SheetPlanEditor from '../components/SheetPlanEditor'
import type { SheetRow, SheetSetInput } from '../db/repository'
import { routineSheet, saveRoutine, saveSheetCell, sheetWeekNumber } from '../db/repository'
import type { Locale, RoutineItem, SetEntry, Units } from '../db/schema'
import type { Translate } from '../i18n'
import { exerciseName, routineName, useT } from '../i18n'
import {
  formatClock,
  formatNumber,
  formatShortDay,
  ltrIsolate,
  toDisplayWeight,
} from '../lib/format'
import { suggestNextLoad } from '../lib/progression'
import { formatRepRange, isTimed } from '../lib/repRange'
import { briefPath } from '../lib/routes'
import { useActiveProfile } from '../lib/useActiveProfile'

/** Weeks shown before the "show all" toggle. A quarter of training. */
const COLUMNS_SHOWN = 12

/** A rendered column: a logged session, or the empty one waiting for today. */
interface Column {
  /** null while the week has not been written yet — saving creates the session. */
  sessionId: string | null
  date: number
  week: number
  live: boolean
}

/**
 * The routine as a spreadsheet: the plan down the left, the weeks across.
 *
 * A routine screen that shows one week at a time can tell you what to do but not
 * whether it is working — for that you have to see week 3 beside week 6. This
 * lays them side by side and lets you type into the newest column with the
 * previous one still on screen, which is the whole reason to keep a training
 * sheet on paper in the first place.
 *
 * Nothing here is a new kind of record. Every number typed into a cell is an
 * ordinary set in an ordinary session, so it shows up in History, the charts and
 * the records exactly as if it had been logged during a workout.
 */
export default function RoutineSheet() {
  const { routineId } = useParams()
  const { t, locale } = useT()
  const { profile, units } = useActiveProfile()
  const profileId = profile?.id

  const [showAll, setShowAll] = useState(false)
  const [editing, setEditing] = useState<{ row: SheetRow; column: Column } | null>(null)
  const [planEditing, setPlanEditing] = useState<SheetRow | null>(null)
  const [copying, setCopying] = useState(false)

  const sheet = useLiveQuery(
    () =>
      profileId && routineId
        ? routineSheet(profileId, routineId, showAll ? Number.MAX_SAFE_INTEGER : COLUMNS_SHOWN)
        : undefined,
    [profileId, routineId, showAll]
  )

  // Today gets a column of its own so there is somewhere to type. It is dropped
  // once today has been logged — the real column takes its place — and while a
  // workout is running, so the sheet never opens a second session beside it.
  const columns = useMemo<Column[]>(() => {
    const logged: Column[] = (sheet?.columns ?? []).map((column) => ({ ...column }))
    const now = Date.now()
    if (logged.some((column) => column.live || isSameDay(column.date, now))) return logged
    return [
      { sessionId: null, date: now, week: sheetWeekNumber(now, sheet?.firstDate) },
      ...logged,
    ].map((column) => ({ live: false, ...column }))
  }, [sheet])

  if (!profile || !routineId) return null

  const rows = sheet?.rows ?? []

  const saveCell = async (row: SheetRow, column: Column, sets: SheetSetInput[]) => {
    await saveSheetCell({
      profileId: profile.id,
      routineId,
      exerciseId: row.exerciseId,
      sessionId: column.sessionId ?? undefined,
      sets,
    })
  }

  // The column being written, and the rows in it that last week could fill.
  const leading = columns[0]
  const copyable =
    leading && !leading.live
      ? rows.filter(
          (row) =>
            cellSets(row, leading).length === 0 &&
            previousSets(row, columns, leading).length > 0
        )
      : []

  /**
   * Last week's whole column, brought forward in one tap.
   *
   * A training week is mostly a repeat of the one before it, and filling eight
   * cells that already have their answer next to them is the part of keeping a
   * sheet that makes people stop keeping one. This writes the numbers in so
   * there is something to edit rather than something to enter — the sets that
   * did change get tapped, the rest are already right.
   *
   * Sequential, not parallel, and the session id is threaded through: the first
   * write creates the week's session and every later one has to land inside it,
   * or the sheet grows a column per exercise.
   */
  const copyLastWeek = async () => {
    if (copying || !leading || copyable.length === 0) return
    setCopying(true)
    try {
      let sessionId = leading.sessionId ?? undefined
      for (const row of copyable) {
        const created = await saveSheetCell({
          profileId: profile.id,
          routineId,
          exerciseId: row.exerciseId,
          sessionId,
          // Weights come straight off the stored sets, so they are already in
          // kilograms — no conversion, and none wanted. RPE is deliberately not
          // carried: how hard last week felt is not a claim this week can make.
          sets: previousSets(row, columns, leading).map((set) => ({
            weight: set.weight,
            reps: set.durationSeconds ? 0 : set.reps,
            durationSeconds: set.durationSeconds,
            setType: set.setType,
          })),
        })
        sessionId = sessionId ?? created
      }
    } finally {
      setCopying(false)
    }
  }

  const savePlan = async (row: SheetRow, item: RoutineItem) => {
    const routine = sheet?.routine
    if (!routine) return
    await saveRoutine(profile.id, {
      id: routine.id,
      nameEn: routine.nameEn,
      nameAr: routine.nameAr,
      items: routine.items.map((entry) => (entry.exerciseId === row.exerciseId ? item : entry)),
    })
  }

  return (
    <div className="pb-6">
      <PageHeader
        title={sheet?.routine ? routineName(sheet.routine, locale) : t('sheet.title')}
        subtitle={t('sheet.title')}
        onBack="history"
        action={
          <div className="flex items-center gap-1.5">
            <Link
              to={`/routines/${routineId}`}
              aria-label={t('common.edit')}
              className="flex h-10 w-10 items-center justify-center rounded-xl bg-ink-700
                         text-ink-100 active:bg-ink-600"
            >
              <Pencil size={17} />
            </Link>
            <Link
              to={briefPath(routineId)}
              aria-label={t('routines.start')}
              className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-500
                         text-ink-950 active:scale-95 transition-transform"
            >
              <Play size={16} fill="currentColor" />
            </Link>
          </div>
        }
      />

      {/* The arrow is doing work, not decorating: nothing else on the screen
          says the weeks keep going past the edge. */}
      <p className="flex items-start gap-2 px-5 py-3 text-[11px] leading-relaxed text-ink-300">
        <MoveHorizontal size={14} className="mt-px shrink-0 text-ink-400" />
        {t('sheet.intro')}
      </p>

      {/* Only while there is a whole column of blanks that last week can answer.
          Once the week is written this has nothing left to say, so it leaves. */}
      {copyable.length > 0 && (
        <div className="px-5 pb-3">
          <button
            type="button"
            onClick={copyLastWeek}
            disabled={copying}
            className="flex w-full items-center justify-center gap-2 rounded-xl border
                       border-brand-500/25 bg-brand-500/[0.07] px-4 py-2.5 text-xs font-semibold
                       text-brand-400 active:bg-brand-500/15 disabled:opacity-50"
          >
            <CopyPlus size={14} />
            {t('sheet.copyWeek', { count: copyable.length })}
          </button>
        </div>
      )}

      {rows.length === 0 ? (
        <p className="px-5 py-8 text-center text-sm text-ink-300">{t('sheet.noPlan')}</p>
      ) : (
        <>
          {/* The grid scrolls sideways on its own; the page keeps scrolling down.
              Only the name column is frozen, and only horizontally: overflow-x
              makes this div a scroll container on *both* axes, so a `top`-stuck
              header would pin to the div rather than to PageHeader and end up
              floating over the first row. border-separate is not decoration —
              position:sticky does nothing inside a collapsed-border table. */}
          <div className="scroll-area overflow-x-auto">
            <table className="w-max border-separate border-spacing-0">
              <thead>
                <tr>
                  <th
                    scope="col"
                    className="sheet-spine sticky start-0 z-20 w-[124px] min-w-[124px] border-b
                               border-e border-ink-500 bg-ink-800 px-3 py-2.5 text-start
                               text-[11px] font-semibold text-ink-200"
                  >
                    {t('sheet.exercise')}
                  </th>
                  <th
                    scope="col"
                    className="w-[52px] min-w-[52px] border-b border-ink-500/60
                               bg-ink-800 px-1 py-2.5 text-[11px] font-semibold text-ink-300"
                  >
                    {t('sheet.sets')}
                  </th>
                  <th
                    scope="col"
                    className="w-[62px] min-w-[62px] border-b border-e
                               border-ink-500 bg-ink-800 px-1 py-2.5 text-[11px] font-semibold
                               text-ink-300"
                  >
                    {t('sheet.rest')}
                  </th>
                  {columns.map((column, index) => (
                    <th
                      key={column.sessionId ?? 'draft'}
                      scope="col"
                      /* The newest column is pre-composited olive rather than a
                         translucent lime: the header sits on ink-800, and an
                         alpha tint here would blend with the page behind the
                         table instead. */
                      className={`w-[92px] min-w-[92px] border-b border-e
                                  border-ink-500/60 px-1 py-2.5 text-[11px] font-semibold
                                  ${index === 0 ? 'bg-[#232B18] text-brand-400' : 'bg-ink-800 text-ink-200'}`}
                    >
                      <span className="block">{t('sheet.week', { week: column.week })}</span>
                      <span
                        className={`tabular mt-0.5 block text-[10px] font-normal
                                    ${index === 0 ? 'text-brand-500/70' : 'text-ink-400'}`}
                      >
                        {column.live
                          ? t('sheet.live')
                          : isSameDay(column.date, Date.now())
                            ? t('common.today')
                            : formatShortDay(column.date, locale)}
                      </span>
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody>
                {rows.map((row, index) => (
                  <Row
                    key={row.exerciseId}
                    row={row}
                    columns={columns}
                    units={units}
                    banded={index % 2 === 1}
                    onEditCell={(column) => setEditing({ row, column })}
                    onEditPlan={() => row.item && setPlanEditing(row)}
                  />
                ))}
              </tbody>
            </table>
          </div>

          {(sheet?.hiddenColumns ?? 0) > 0 && (
            <button
              type="button"
              onClick={() => setShowAll(true)}
              className="mx-5 mt-4 flex items-center justify-center gap-1.5 rounded-xl border
                         border-ink-500/60 px-4 py-3 text-xs font-medium text-ink-200
                         active:bg-ink-700"
            >
              <ChevronsRight size={14} className="rtl-flip" />
              {t('sheet.showAll', { count: sheet?.hiddenColumns ?? 0 })}
            </button>
          )}
        </>
      )}

      {editing && (
        <SheetCellEditor
          key={`${editing.row.exerciseId}-${editing.column.sessionId ?? 'draft'}`}
          title={`${exerciseName(editing.row.exercise, locale)} · ${t('sheet.week', {
            week: editing.column.week,
          })}`}
          timed={isTimed(editing.row.exercise)}
          units={units}
          current={cellSets(editing.row, editing.column)}
          previous={previousSets(editing.row, columns, editing.column)}
          previousLabel={previousLabel(columns, editing.column, locale, t)}
          targetSets={editing.row.item?.targetSets ?? 3}
          suggestion={cellSuggestion(editing.row, columns, editing.column, units)}
          onClose={() => setEditing(null)}
          onSave={(sets) => saveCell(editing.row, editing.column, sets)}
        />
      )}

      {planEditing?.item && (
        <SheetPlanEditor
          key={planEditing.exerciseId}
          title={exerciseName(planEditing.exercise, locale)}
          item={planEditing.item}
          timed={isTimed(planEditing.exercise)}
          onClose={() => setPlanEditing(null)}
          onSave={(item) => savePlan(planEditing, item)}
        />
      )}
    </div>
  )
}

function cellSets(row: SheetRow, column: Column): SetEntry[] {
  return column.sessionId ? (row.cells[column.sessionId] ?? []) : []
}

/** The nearest older column that has anything in it — what you are trying to beat. */
function previousSets(row: SheetRow, columns: Column[], column: Column): SetEntry[] {
  const index = columns.findIndex((c) => c.sessionId === column.sessionId)
  for (const older of columns.slice(index + 1)) {
    const sets = cellSets(row, older)
    if (sets.length > 0) return sets
  }
  return []
}

/**
 * What the progression rule makes of the weeks sitting to the right of this cell.
 *
 * Every older column, newest first — the same input the pre-workout brief hands
 * the engine, so the sheet and the brief never disagree about what to load next.
 * Null for a timed exercise, which has no weight to suggest, and for a row that
 * has been dropped from the plan, which has no target to progress towards.
 */
function cellSuggestion(row: SheetRow, columns: Column[], column: Column, units: Units) {
  if (!row.item || isTimed(row.exercise)) return null
  const index = columns.findIndex((c) => c.sessionId === column.sessionId)
  const history = columns
    .slice(index + 1)
    .map((older) => cellSets(row, older))
    .filter((sets) => sets.length > 0)

  return suggestNextLoad(
    history,
    {
      reps: row.item.targetReps,
      repsMax: row.item.targetRepsMax,
      sets: row.item.targetSets,
    },
    units
  )
}

/**
 * One number for a week's work on one exercise, so two weeks can be compared.
 *
 * Total load where the sets carry weight, total time where they are held, total
 * reps for bodyweight work. Comparing top sets alone would call an extra set
 * flat; comparing reps alone would call an extra 5 kg nothing.
 */
function workVolume(sets: SetEntry[]): number {
  return sets.reduce((total, set) => {
    if (set.durationSeconds) return total + set.durationSeconds
    return total + (set.weight > 0 ? set.weight * set.reps : set.reps)
  }, 0)
}

/**
 * How this week compares with the last one that had numbers in it, as a percent.
 *
 * null when there is nothing to compare against or the change rounds away —
 * a row of "0%" chips would be noise, and the sheet already shows the numbers.
 */
function progressDelta(current: SetEntry[], previous: SetEntry[]): number | null {
  if (current.length === 0 || previous.length === 0) return null
  const before = workVolume(previous)
  if (before <= 0) return null
  const change = Math.round(((workVolume(current) - before) / before) * 100)
  return change === 0 ? null : change
}

function previousLabel(columns: Column[], column: Column, locale: Locale, t: Translate): string {
  const index = columns.findIndex((c) => c.sessionId === column.sessionId)
  const older = columns[index + 1]
  return older
    ? `${t('sheet.previousWeek')} · ${formatShortDay(older.date, locale)}`
    : t('sheet.previousWeek')
}

/* The plan is a solid slab and the weeks are a ruled field: two kinds of thing,
   so they get two surfaces rather than the same cell with a heavier rule
   between them. The slab keeps its own tone through every row, which is what
   makes the boundary read without a second border width. */
const PLAN_CELL = 'border-b border-ink-500/40 bg-ink-900 px-1 py-2 text-center align-middle'
const PLAN_EDGE_CELL = 'border-b border-e border-ink-500 bg-ink-900 px-1 py-2 text-center align-middle'

function Row({
  row,
  columns,
  units,
  banded,
  onEditCell,
  onEditPlan,
}: {
  row: SheetRow
  columns: Column[]
  units: Units
  banded: boolean
  onEditCell: (column: Column) => void
  onEditPlan: () => void
}) {
  const { t, locale } = useT()
  const timed = isTimed(row.exercise)
  const { item } = row

  return (
    /* Banding the rows is not stripes for their own sake: at twelve columns
       wide the eye has to carry one exercise across the whole scroll, and the
       band is the only thing holding the line together out past the edge. */
    <tr className={banded ? 'bg-white/[0.022]' : undefined}>
      <th
        scope="row"
        className="sheet-spine sticky start-0 z-10 w-[124px] min-w-[124px] border-b border-e
                   border-ink-500 bg-ink-900 px-3 py-2 text-start align-top font-normal"
      >
        <span className="block text-[13px] font-medium leading-tight text-ink-50">
          {exerciseName(row.exercise, locale)}
        </span>
        {item ? (
          /* Digits and symbols only, so it needs the isolate to stop RTL reading
             "4 × 6–10" back to front. See lib/format.ts. */
          <span className="tabular mt-1 block text-[10px] text-ink-400">
            {ltrIsolate(
              timed
                ? `${item.targetSets} × ${formatClock(item.targetReps)}`
                : `${item.targetSets} × ${formatRepRange(item.targetReps, item.targetRepsMax)}`
            )}
          </span>
        ) : (
          <span className="mt-1 block text-[10px] text-ink-400">{t('sheet.outsidePlan')}</span>
        )}
      </th>

      {item ? (
        <>
          <td className={PLAN_CELL}>
            <button
              type="button"
              onClick={onEditPlan}
              // h-full so the target fills however tall the row turns out to be,
              // min-h-9 so it is still 36px on the shortest single-set row.
              className="tabular font-numeric flex h-full min-h-9 w-full items-center
                         justify-center rounded-lg text-sm font-semibold text-ink-50
                         active:bg-ink-700"
            >
              {item.targetSets}
            </button>
          </td>
          <td className={PLAN_EDGE_CELL}>
            <button
              type="button"
              onClick={onEditPlan}
              className="tabular font-numeric flex h-full min-h-9 w-full items-center
                         justify-center rounded-lg text-sm text-ink-300 active:bg-ink-700"
            >
              {ltrIsolate(formatClock(item.restSeconds))}
            </button>
          </td>
        </>
      ) : (
        <>
          <td className={`${PLAN_CELL} text-ink-500`}>{t('common.empty')}</td>
          <td className={`${PLAN_EDGE_CELL} text-ink-500`}>{t('common.empty')}</td>
        </>
      )}

      {columns.map((column, index) => (
        <Cell
          key={column.sessionId ?? 'draft'}
          sets={cellSets(row, column)}
          column={column}
          units={units}
          current={index === 0}
          // Only the column being written carries the chip. On all twelve it
          // would be a wall of little arrows; on this one it answers the
          // question the sheet exists to ask.
          delta={
            index === 0
              ? progressDelta(cellSets(row, column), previousSets(row, columns, column))
              : null
          }
          onEdit={() => onEditCell(column)}
        />
      ))}
    </tr>
  )
}

function Cell({
  sets,
  column,
  units,
  current,
  delta,
  onEdit,
}: {
  sets: SetEntry[]
  column: Column
  units: Units
  current: boolean
  delta: number | null
  onEdit: () => void
}) {
  const { t } = useT()
  const tint = current ? 'bg-brand-500/[0.06]' : ''

  // A running workout owns its own sets: the workout screen keeps un-ticked rows
  // laid out ahead of you, and writing this column from here would delete them.
  if (column.live) {
    return (
      <td className="border-b border-e border-ink-500/40 bg-brand-500/[0.06] px-1 py-2 align-top">
        <Link
          to={`/workout/${column.sessionId}`}
          className="flex min-h-9 items-center justify-center rounded-lg px-1 text-center
                     text-[11px] font-medium leading-tight text-brand-500"
        >
          {t('sheet.resume')}
        </Link>
      </td>
    )
  }

  return (
    <td className={`border-b border-e border-ink-500/40 px-1 py-2 align-top ${tint}`}>
      <button
        type="button"
        onClick={onEdit}
        aria-label={sets.length === 0 ? t('sheet.tapToLog') : undefined}
        className="flex min-h-9 w-full flex-col items-center justify-center gap-0.5 rounded-lg
                   px-1 py-1.5 active:bg-ink-700"
      >
        {sets.length === 0 ? (
          /* An empty slot rather than a stray plus — a blank line on the card.
             This week's column is warmed towards lime to say write here, but
             only just: eight of these stacked at full strength would outshout
             the one chip that is supposed to carry the colour. */
          <span
            className={`my-0.5 flex h-7 w-7 items-center justify-center rounded-lg border
                        border-dashed ${
                          current
                            ? 'border-brand-500/30 text-brand-500/60'
                            : 'border-ink-500 text-ink-500'
                        }`}
          >
            <Plus size={13} />
          </span>
        ) : (
          sets.map((set) => (
            /* dir=ltr isolates the pair, so the load stays in front of the reps
               in Arabic — bare, "62×12" lays itself out as "12×62". The weight
               is what you read and the reps qualify it, so they are not set at
               the same strength. */
            <span
              key={set.id}
              dir="ltr"
              className="tabular font-numeric text-[13px] leading-5"
            >
              {set.durationSeconds ? (
                <span className="font-semibold text-ink-50">
                  {formatClock(set.durationSeconds)}
                </span>
              ) : (
                <>
                  <span className="font-semibold text-ink-50">
                    {formatNumber(toDisplayWeight(set.weight, units))}
                  </span>
                  <span className="text-ink-400">×{set.reps}</span>
                </>
              )}
            </span>
          ))
        )}

        {delta !== null && (
          <span
            dir="ltr"
            className={`tabular font-numeric mt-1 flex items-center gap-0.5 rounded-md px-1.5
                        py-0.5 text-[10px] font-bold leading-none ${
                          delta > 0
                            ? 'bg-brand-500/15 text-brand-400'
                            : 'bg-flame-400/10 text-flame-400'
                        }`}
          >
            {delta > 0 ? (
              <ArrowUp size={9} strokeWidth={3} />
            ) : (
              <ArrowDown size={9} strokeWidth={3} />
            )}
            {Math.abs(delta)}%
          </span>
        )}
      </button>
    </td>
  )
}
