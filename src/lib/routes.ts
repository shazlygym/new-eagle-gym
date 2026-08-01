/**
 * Paths that more than one screen needs to build.
 *
 * The pre-workout brief is reachable from Home, Train and Routines, and two of
 * those have to carry program context through it. Spelling the query string out
 * three times is how one of them ends up starting a session that doesn't count
 * against the program.
 */

/** The week-by-week grid for a routine. */
export function sheetPath(routineId: string): string {
  return `/routines/${encodeURIComponent(routineId)}/sheet`
}

/** The brief for a routine, optionally as day `dayIndex` of week `week` of a program. */
export function briefPath(
  routineId: string,
  programId?: string,
  week?: number,
  dayIndex?: number
): string {
  const path = `/routines/${encodeURIComponent(routineId)}/start`
  if (!programId) return path

  const params = new URLSearchParams({
    program: programId,
    week: String(week),
    day: String(dayIndex),
  })
  return `${path}?${params}`
}
