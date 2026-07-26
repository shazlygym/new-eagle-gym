import { format } from 'date-fns'
import {
  db,
  newId,
  SHARED,
  type BodyStat,
  type Exercise,
  type Profile,
  type Routine,
  type RoutineItem,
  type Program,
  type Session,
  type SessionExercise,
  type SetEntry,
  type SetType,
  type Units,
} from './schema'
import { SEED_EXERCISES, STARTER_ROUTINES } from './seed'

// Every read and write in the app goes through this module — nothing else
// imports Dexie directly. That keeps the storage engine swappable: adding a
// server-backed sync layer later means reimplementing this file, not the UI.

// ─── Profiles ─────────────────────────────────────────────────────────────────

export function listProfiles(): Promise<Profile[]> {
  return db.profiles.orderBy('createdAt').toArray()
}

/**
 * Writes the built-in library on every launch rather than only when it is empty,
 * so exercises added or reclassified in a new app version reach members who
 * already have the app installed. Custom exercises are untouched — they live
 * under the profile id, never SHARED.
 */
export async function ensureExerciseLibrary(): Promise<void> {
  await db.exercises.bulkPut(SEED_EXERCISES)
}

export async function createProfile(input: {
  name: string
  membershipNumber?: string
  units: Units
}): Promise<Profile> {
  const profile: Profile = {
    id: newId(),
    name: input.name.trim(),
    membershipNumber: input.membershipNumber?.trim() || undefined,
    units: input.units,
    createdAt: Date.now(),
  }

  await db.transaction('rw', db.profiles, db.exercises, db.routines, async () => {
    await db.profiles.add(profile)
    await ensureExerciseLibrary()

    // Give the profile something to start from — an empty Home screen makes the
    // app look broken on first launch.
    const routines: Routine[] = STARTER_ROUTINES.map((r) => ({
      id: newId(),
      profileId: profile.id,
      nameEn: r.nameEn,
      nameAr: r.nameAr,
      createdAt: Date.now(),
      items: r.items.map(([exerciseId, targetSets, targetReps, restSeconds]) => ({
        exerciseId,
        targetSets,
        targetReps,
        restSeconds,
      })),
    }))
    await db.routines.bulkAdd(routines)
  })

  return profile
}

export async function updateProfile(id: string, patch: Partial<Profile>): Promise<void> {
  await db.profiles.update(id, patch)
}

export async function deleteProfile(id: string): Promise<void> {
  await db.transaction(
    'rw',
    [
      db.profiles,
      db.routines,
      db.programs,
      db.sessions,
      db.sessionExercises,
      db.sets,
      db.bodyStats,
      db.exercises,
    ],
    async () => {
      const sessionIds = (await db.sessions.where('profileId').equals(id).primaryKeys()) as string[]
      await db.sets.where('sessionId').anyOf(sessionIds).delete()
      await db.sessionExercises.where('sessionId').anyOf(sessionIds).delete()
      await db.sessions.where('profileId').equals(id).delete()
      await db.routines.where('profileId').equals(id).delete()
      await db.programs.where('profileId').equals(id).delete()
      await db.bodyStats.where('profileId').equals(id).delete()
      // Only this profile's custom exercises; the shared library stays.
      await db.exercises.where('profileId').equals(id).delete()
      await db.profiles.delete(id)
    }
  )
}

// ─── Exercises ────────────────────────────────────────────────────────────────

/** The built-in library plus this profile's own additions. */
export async function listExercises(profileId: string): Promise<Exercise[]> {
  return db.exercises.where('profileId').anyOf([SHARED, profileId]).toArray()
}

export function getExercise(id: string): Promise<Exercise | undefined> {
  return db.exercises.get(id)
}

export async function createExercise(
  profileId: string,
  input: Omit<Exercise, 'id' | 'profileId' | 'isCustom'>
): Promise<Exercise> {
  const exercise: Exercise = { ...input, id: newId(), profileId, isCustom: 1 }
  await db.exercises.add(exercise)
  return exercise
}

/**
 * Custom exercises only. Past sets keep referencing the id, so history stays
 * readable even after the exercise is gone from the picker.
 */
export async function deleteExercise(id: string): Promise<void> {
  const exercise = await db.exercises.get(id)
  if (exercise?.isCustom) await db.exercises.delete(id)
}

// ─── Routines ─────────────────────────────────────────────────────────────────

export function listRoutines(profileId: string): Promise<Routine[]> {
  return db.routines.where('profileId').equals(profileId).toArray()
}

export function getRoutine(id: string): Promise<Routine | undefined> {
  return db.routines.get(id)
}

export async function saveRoutine(
  profileId: string,
  input: { id?: string; nameEn: string; nameAr: string; items: RoutineItem[] }
): Promise<string> {
  const id = input.id ?? newId()
  const existing = input.id ? await db.routines.get(input.id) : undefined
  await db.routines.put({
    id,
    profileId,
    nameEn: input.nameEn.trim(),
    nameAr: input.nameAr.trim(),
    items: input.items,
    createdAt: existing?.createdAt ?? Date.now(),
  })
  return id
}

/**
 * Also strips the routine out of any program that scheduled it. A program day
 * pointing at a deleted routine would start an empty, untitled workout with no
 * explanation; a program left with no days is stopped rather than left active
 * with nothing to do.
 */
export async function deleteRoutine(id: string): Promise<void> {
  await db.transaction('rw', db.routines, db.programs, async () => {
    await db.routines.delete(id)

    const affected = await db.programs.filter((program) =>
      program.days.some((day) => day.routineId === id)
    ).toArray()

    await Promise.all(
      affected.map((program) => {
        const days = program.days.filter((day) => day.routineId !== id)
        return db.programs.update(program.id, {
          days,
          active: days.length === 0 ? 0 : program.active,
        })
      })
    )
  })
}

// ─── Programs ─────────────────────────────────────────────────────────────────

export function listPrograms(profileId: string): Promise<Program[]> {
  return db.programs.where('profileId').equals(profileId).toArray()
}

export function getProgram(id: string): Promise<Program | undefined> {
  return db.programs.get(id)
}

export async function getActiveProgram(profileId: string): Promise<Program | undefined> {
  return db.programs.where('[profileId+active]').equals([profileId, 1]).first()
}

export async function saveProgram(
  profileId: string,
  input: Omit<Program, 'id' | 'profileId' | 'createdAt' | 'active'> & { id?: string }
): Promise<string> {
  const id = input.id ?? newId()
  const existing = input.id ? await db.programs.get(input.id) : undefined
  await db.programs.put({
    ...input,
    id,
    profileId,
    active: existing?.active ?? 0,
    createdAt: existing?.createdAt ?? Date.now(),
  })
  return id
}

/** Only one block runs at a time — two active programs is two conflicting plans. */
export async function activateProgram(profileId: string, id: string): Promise<void> {
  await db.transaction('rw', db.programs, async () => {
    const all = await db.programs.where('profileId').equals(profileId).toArray()
    await Promise.all(
      all.map((program) =>
        db.programs.update(program.id, {
          active: program.id === id ? 1 : 0,
          // Starting it (re)sets the clock the week counter reads from.
          startedAt: program.id === id ? (program.startedAt ?? Date.now()) : program.startedAt,
        })
      )
    )
  })
}

export async function deactivateProgram(id: string): Promise<void> {
  await db.programs.update(id, { active: 0 })
}

/** Restarts the block from week 1 without losing the plan itself. */
export async function restartProgram(id: string): Promise<void> {
  await db.programs.update(id, { startedAt: Date.now(), active: 1 })
}

export async function deleteProgram(id: string): Promise<void> {
  await db.programs.delete(id)
}

// ─── Sessions ─────────────────────────────────────────────────────────────────

export async function getActiveSession(profileId: string): Promise<Session | undefined> {
  return db.sessions.where('[profileId+status]').equals([profileId, 'active']).first()
}

export function getSession(id: string): Promise<Session | undefined> {
  return db.sessions.get(id)
}

/** Most recent first. */
export async function listSessions(profileId: string, limit?: number): Promise<Session[]> {
  const query = db.sessions
    .where('[profileId+startedAt]')
    .between([profileId, 0], [profileId, Infinity])
    .reverse()
  return limit ? query.limit(limit).toArray() : query.toArray()
}

export async function startSession(
  profileId: string,
  routineId?: string,
  program?: { id: string; week: number; dayIndex: number }
): Promise<string> {
  const routine = routineId ? await db.routines.get(routineId) : undefined
  const session: Session = {
    id: newId(),
    profileId,
    routineId,
    titleEn: routine?.nameEn,
    titleAr: routine?.nameAr,
    startedAt: Date.now(),
    status: 'active',
    programId: program?.id,
    programWeek: program?.week,
    programDayIndex: program?.dayIndex,
  }

  // Which of the routine's exercises are measured in time rather than reps.
  // Their `targetReps` is a number of seconds, and writing it into a set's reps
  // field would turn a 60-second carry into 60 reps of phantom tonnage.
  const timed = new Set<string>()
  if (routine) {
    const rows = await db.exercises.bulkGet(routine.items.map((item) => item.exerciseId))
    for (const row of rows) if (row?.tracking === 'duration') timed.add(row.id)
  }

  // Seed each slot with the weight used last time, so a routine opens ready to
  // tick off rather than as a grid of zeroes to retype every session.
  const lastWeights = new Map<string, number>()
  if (routine) {
    await Promise.all(
      routine.items.map(async (item) => {
        const working = (await lastPerformance(profileId, item.exerciseId)).filter(
          (s) => s.setType !== 'warmup'
        )
        if (working.length === 0) return
        // The top set from last time, not the final one — people often drop the
        // weight on their last set, and seeding from that walks the load down
        // week over week.
        lastWeights.set(item.exerciseId, Math.max(...working.map((s) => s.weight)))
      })
    )
  }

  await db.transaction('rw', db.sessions, db.sessionExercises, db.sets, async () => {
    await db.sessions.add(session)
    if (!routine) return

    for (const [index, item] of routine.items.entries()) {
      const sessionExerciseId = newId()
      await db.sessionExercises.add({
        id: sessionExerciseId,
        sessionId: session.id,
        exerciseId: item.exerciseId,
        order: index,
        targetSets: item.targetSets,
        targetReps: item.targetReps,
        restSeconds: item.restSeconds,
        supersetGroup: item.supersetGroup,
      })

      // Lay out the target number of rows up front — that is what the routine
      // is promising, and an exercise card with no rows reads as broken.
      await db.sets.bulkAdd(
        Array.from({ length: Math.max(1, item.targetSets) }, (_, setIndex) => ({
          id: newId(),
          sessionExerciseId,
          sessionId: session.id,
          profileId,
          exerciseId: item.exerciseId,
          setNumber: setIndex + 1,
          weight: lastWeights.get(item.exerciseId) ?? 0,
          reps: timed.has(item.exerciseId) ? 0 : item.targetReps,
          setType: 'working' as const,
          done: 0 as const,
        }))
      )
    }
  })

  return session.id
}

/**
 * Starts a new session with the same exercises as a past one, seeded with the
 * weights and reps that were actually performed. Most training is a repeat of
 * last time with one number nudged, so this is the shortest path to logging.
 */
export async function repeatSession(profileId: string, sourceId: string): Promise<string> {
  const source = await db.sessions.get(sourceId)
  if (!source) throw new Error(`No session ${sourceId}`)

  const sourceExercises = await listSessionExercises(sourceId)
  const sourceSets = await db.sets.where('sessionId').equals(sourceId).toArray()

  const session: Session = {
    id: newId(),
    profileId,
    routineId: source.routineId,
    titleAr: source.titleAr,
    titleEn: source.titleEn,
    startedAt: Date.now(),
    status: 'active',
  }

  await db.transaction('rw', db.sessions, db.sessionExercises, db.sets, async () => {
    await db.sessions.add(session)

    for (const sourceExercise of sourceExercises) {
      const sessionExerciseId = newId()
      await db.sessionExercises.add({
        ...sourceExercise,
        id: sessionExerciseId,
        sessionId: session.id,
      })

      const rows = sourceSets
        .filter((s) => s.sessionExerciseId === sourceExercise.id)
        .sort((a, b) => a.setNumber - b.setNumber)

      await db.sets.bulkAdd(
        rows.map((row, index) => ({
          ...row,
          id: newId(),
          sessionExerciseId,
          sessionId: session.id,
          setNumber: index + 1,
          // Targets carry over; the performance is what you're about to do.
          done: 0 as const,
          completedAt: undefined,
        }))
      )
    }
  })

  return session.id
}

export async function finishSession(id: string): Promise<void> {
  await db.transaction('rw', db.sessions, db.sets, async () => {
    // Sets the user added but never ticked off would otherwise pollute every
    // volume and PR calculation with zeroes.
    await db.sets.where('sessionId').equals(id).and((s) => s.done === 0).delete()
    await db.sessions.update(id, { status: 'done', endedAt: Date.now() })
  })
}

export async function updateSession(id: string, patch: Partial<Session>): Promise<void> {
  await db.sessions.update(id, patch)
}

export async function deleteSession(id: string): Promise<void> {
  await db.transaction('rw', db.sessions, db.sessionExercises, db.sets, async () => {
    await db.sets.where('sessionId').equals(id).delete()
    await db.sessionExercises.where('sessionId').equals(id).delete()
    await db.sessions.delete(id)
  })
}

// ─── Session exercises ────────────────────────────────────────────────────────

export function listSessionExercises(sessionId: string): Promise<SessionExercise[]> {
  return db.sessionExercises
    .where('[sessionId+order]')
    .between([sessionId, -Infinity], [sessionId, Infinity])
    .toArray()
}

export async function addExerciseToSession(
  sessionId: string,
  exerciseId: string,
  restSeconds = 90
): Promise<string> {
  const count = await db.sessionExercises.where('sessionId').equals(sessionId).count()
  const entry: SessionExercise = {
    id: newId(),
    sessionId,
    exerciseId,
    order: count,
    restSeconds,
  }
  await db.sessionExercises.add(entry)
  return entry.id
}

export async function removeSessionExercise(id: string): Promise<void> {
  await db.transaction('rw', db.sessionExercises, db.sets, async () => {
    await db.sets.where('sessionExerciseId').equals(id).delete()
    await db.sessionExercises.delete(id)
  })
}

export async function reorderSessionExercise(id: string, direction: -1 | 1): Promise<void> {
  await db.transaction('rw', db.sessionExercises, async () => {
    const entry = await db.sessionExercises.get(id)
    if (!entry) return
    const siblings = await listSessionExercises(entry.sessionId)
    const index = siblings.findIndex((s) => s.id === id)
    const swapWith = siblings[index + direction]
    if (!swapWith) return
    await db.sessionExercises.update(entry.id, { order: swapWith.order })
    await db.sessionExercises.update(swapWith.id, { order: entry.order })
  })
}

// ─── Sets ─────────────────────────────────────────────────────────────────────

export function listSetsForSession(sessionId: string): Promise<SetEntry[]> {
  return db.sets.where('sessionId').equals(sessionId).toArray()
}

/**
 * Every completed set this profile has ever logged — the input to all the
 * derived stats in db/queries.ts. Un-ticked sets have no completedAt and so fall
 * out of the index for free, which is exactly what the stats want.
 */
export function listCompletedSets(profileId: string): Promise<SetEntry[]> {
  return db.sets
    .where('[profileId+completedAt]')
    .between([profileId, 0], [profileId, Infinity])
    .toArray()
}

/**
 * Completed sets from `since` onward. Screens that only need a recent window —
 * Home's this-week totals — use this instead of reading a lifetime of sets on
 * every render.
 */
export function listCompletedSetsSince(profileId: string, since: number): Promise<SetEntry[]> {
  return db.sets
    .where('[profileId+completedAt]')
    .between([profileId, since], [profileId, Infinity])
    .toArray()
}

export function listSetsForSessions(sessionIds: string[]): Promise<SetEntry[]> {
  return db.sets.where('sessionId').anyOf(sessionIds).toArray()
}

/** Every completed set of one exercise, newest first. Powers the history sheet. */
export function listSetsForExercise(profileId: string, exerciseId: string): Promise<SetEntry[]> {
  return db.sets
    .where('[exerciseId+completedAt]')
    .between([exerciseId, 0], [exerciseId, Infinity])
    .reverse()
    .filter((s) => s.profileId === profileId && s.setType !== 'warmup')
    .toArray()
}

export async function addSet(
  sessionExerciseId: string,
  seed?: { weight?: number; reps?: number }
): Promise<string> {
  const parent = await db.sessionExercises.get(sessionExerciseId)
  if (!parent) throw new Error(`No session exercise ${sessionExerciseId}`)
  const session = await db.sessions.get(parent.sessionId)
  if (!session) throw new Error(`No session ${parent.sessionId}`)

  const siblings = await db.sets.where('sessionExerciseId').equals(sessionExerciseId).toArray()
  const last = siblings.sort((a, b) => a.setNumber - b.setNumber).at(-1)

  // On a timed exercise `targetReps` holds seconds, so it must not fall through
  // into the reps field.
  const exercise = await db.exercises.get(parent.exerciseId)
  const isTimed = exercise?.tracking === 'duration'

  const entry: SetEntry = {
    id: newId(),
    sessionExerciseId,
    sessionId: parent.sessionId,
    profileId: session.profileId,
    exerciseId: parent.exerciseId,
    setNumber: (last?.setNumber ?? 0) + 1,
    // Carry the previous set forward — most people repeat weight and reps.
    weight: seed?.weight ?? last?.weight ?? 0,
    reps: isTimed ? 0 : (seed?.reps ?? last?.reps ?? parent.targetReps ?? 0),
    setType: 'working',
    done: 0,
  }
  await db.sets.add(entry)
  return entry.id
}

export async function updateSet(id: string, patch: Partial<SetEntry>): Promise<void> {
  await db.sets.update(id, patch)
}

export async function setSetDone(id: string, done: boolean): Promise<void> {
  if (!done) {
    await db.sets.update(id, { done: 0, completedAt: undefined })
    return
  }

  const entry = await db.sets.get(id)
  const session = entry ? await db.sessions.get(entry.sessionId) : undefined

  // Sets added while editing a past workout must be stamped with that workout's
  // date, not today's. Using Date.now() unconditionally would file them under
  // the current week and quietly skew every chart and personal record.
  const completedAt =
    session && session.status === 'done' ? (session.endedAt ?? session.startedAt) : Date.now()

  await db.sets.update(id, { done: 1, completedAt })
}

export async function deleteSet(id: string): Promise<void> {
  const entry = await db.sets.get(id)
  if (!entry) return
  await db.transaction('rw', db.sets, async () => {
    await db.sets.delete(id)
    // Renumber so the UI never shows "Set 1, Set 3".
    const remaining = (
      await db.sets.where('sessionExerciseId').equals(entry.sessionExerciseId).toArray()
    ).sort((a, b) => a.setNumber - b.setNumber)
    await Promise.all(
      remaining.map((s, index) =>
        s.setNumber === index + 1 ? undefined : db.sets.update(s.id, { setNumber: index + 1 })
      )
    )
  })
}

/**
 * Sets grouped by session, most recent session first — the input to progression
 * suggestions, which need to see a stall across two sessions, not just one.
 */
export async function recentSessionsForExercise(
  profileId: string,
  exerciseId: string,
  count: number,
  excludeSessionId?: string
): Promise<SetEntry[][]> {
  const history = await db.sets
    .where('[exerciseId+completedAt]')
    .between([exerciseId, 0], [exerciseId, Infinity])
    .reverse()
    .filter((s) => s.profileId === profileId && s.sessionId !== excludeSessionId)
    .toArray()

  const grouped: SetEntry[][] = []
  const seen = new Map<string, SetEntry[]>()
  for (const set of history) {
    let bucket = seen.get(set.sessionId)
    if (!bucket) {
      if (seen.size >= count) break
      bucket = []
      seen.set(set.sessionId, bucket)
      grouped.push(bucket)
    }
    bucket.push(set)
  }

  return grouped.map((rows) => rows.sort((a, b) => a.setNumber - b.setNumber))
}

/**
 * Records a timed effort against the next un-ticked set of a duration exercise,
 * creating one if they have all been used. Returns the set that was filled so
 * the caller can start the rest timer for it.
 */
export async function logDurationSet(
  sessionExerciseId: string,
  seconds: number
): Promise<string | undefined> {
  const rows = (await db.sets.where('sessionExerciseId').equals(sessionExerciseId).toArray()).sort(
    (a, b) => a.setNumber - b.setNumber
  )

  const target = rows.find((row) => row.done === 0)
  if (target) {
    await db.sets.update(target.id, { durationSeconds: seconds, reps: 0 })
    await setSetDone(target.id, true)
    return target.id
  }

  const id = await addSet(sessionExerciseId)
  await db.sets.update(id, { durationSeconds: seconds, reps: 0 })
  await setSetDone(id, true)
  return id
}

/** Prepends a generated warm-up ramp, renumbering the working sets after it. */
export async function addWarmupSets(
  sessionExerciseId: string,
  steps: Array<{ weight: number; reps: number }>
): Promise<void> {
  if (steps.length === 0) return

  const parent = await db.sessionExercises.get(sessionExerciseId)
  if (!parent) return
  const session = await db.sessions.get(parent.sessionId)
  if (!session) return

  await db.transaction('rw', db.sets, async () => {
    const existing = (
      await db.sets.where('sessionExerciseId').equals(sessionExerciseId).toArray()
    ).sort((a, b) => a.setNumber - b.setNumber)

    // Warm-ups belong at the top, so everything already logged shifts down.
    await Promise.all(
      existing.map((entry, index) =>
        db.sets.update(entry.id, { setNumber: steps.length + index + 1 })
      )
    )

    await db.sets.bulkAdd(
      steps.map((step, index) => ({
        id: newId(),
        sessionExerciseId,
        sessionId: parent.sessionId,
        profileId: session.profileId,
        exerciseId: parent.exerciseId,
        setNumber: index + 1,
        weight: step.weight,
        reps: step.reps,
        setType: 'warmup' as const,
        done: 0 as const,
      }))
    )
  })
}

/**
 * Links an exercise to the one above it as a superset, or breaks it out again.
 * Grouped exercises are performed back to back, so rest is taken once at the end
 * of the group rather than after each one.
 */
export async function toggleSuperset(sessionExerciseId: string): Promise<void> {
  const entry = await db.sessionExercises.get(sessionExerciseId)
  if (!entry) return

  const siblings = await listSessionExercises(entry.sessionId)
  const index = siblings.findIndex((s) => s.id === sessionExerciseId)
  const previous = siblings[index - 1]
  if (!previous) return

  if (entry.supersetGroup && entry.supersetGroup === previous.supersetGroup) {
    await db.sessionExercises.update(sessionExerciseId, { supersetGroup: undefined })
    return
  }

  const group = previous.supersetGroup ?? newId()
  await db.sessionExercises.update(previous.id, { supersetGroup: group })
  await db.sessionExercises.update(sessionExerciseId, { supersetGroup: group })
}

/**
 * The completed sets from the last time this exercise was trained, used to show
 * a "previous" hint next to each set row.
 */
export async function lastPerformance(
  profileId: string,
  exerciseId: string,
  excludeSessionId?: string
): Promise<SetEntry[]> {
  const history = await db.sets
    .where('[exerciseId+completedAt]')
    .between([exerciseId, 0], [exerciseId, Infinity])
    .reverse()
    .filter((s) => s.profileId === profileId && s.sessionId !== excludeSessionId)
    .toArray()

  const previousSessionId = history[0]?.sessionId
  if (!previousSessionId) return []
  return history
    .filter((s) => s.sessionId === previousSessionId)
    .sort((a, b) => a.setNumber - b.setNumber)
}

// ─── Body stats ───────────────────────────────────────────────────────────────

/** Oldest first — charts and trend deltas both want chronological order. */
export async function listBodyStats(profileId: string): Promise<BodyStat[]> {
  const rows = await db.bodyStats
    .where('[profileId+date]')
    .between([profileId, ''], [profileId, '￿'])
    .toArray()
  return rows.sort((a, b) => a.date.localeCompare(b.date))
}

export async function saveBodyStat(
  profileId: string,
  input: Omit<BodyStat, 'id' | 'profileId' | 'createdAt'>
): Promise<void> {
  // One row per day: logging twice on the same date updates rather than duplicates.
  const existing = await db.bodyStats
    .where('[profileId+date]')
    .equals([profileId, input.date])
    .first()

  await db.bodyStats.put({
    ...input,
    id: existing?.id ?? newId(),
    profileId,
    createdAt: existing?.createdAt ?? Date.now(),
  })
}

export async function deleteBodyStat(id: string): Promise<void> {
  await db.bodyStats.delete(id)
}

// ─── Backup ───────────────────────────────────────────────────────────────────
//
// Safari can evict IndexedDB for sites that go unused, and there is no server
// copy of any of this. Export is the only safety net the user has.

export interface Backup {
  app: 'eagle-gym'
  /** 1 predates set types and programs; both are accepted on import. */
  version: 1 | 2
  exportedAt: string
  profiles: Profile[]
  exercises: Exercise[]
  routines: Routine[]
  programs?: Program[]
  sessions: Session[]
  sessionExercises: SessionExercise[]
  sets: SetEntry[]
  bodyStats: BodyStat[]
}

export async function exportBackup(): Promise<Backup> {
  const [profiles, exercises, routines, programs, sessions, sessionExercises, sets, bodyStats] =
    await Promise.all([
      db.profiles.toArray(),
      // Built-ins are recreated from code on import; only custom ones need carrying.
      db.exercises.filter((e) => e.isCustom === 1).toArray(),
      db.routines.toArray(),
      db.programs.toArray(),
      db.sessions.toArray(),
      db.sessionExercises.toArray(),
      db.sets.toArray(),
      db.bodyStats.toArray(),
    ])

  return {
    app: 'eagle-gym',
    version: 2,
    exportedAt: new Date().toISOString(),
    profiles,
    exercises,
    routines,
    programs,
    sessions,
    sessionExercises,
    sets,
    bodyStats,
  }
}

export function parseBackup(raw: string): Backup {
  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    throw new Error('not-json')
  }
  const backup = parsed as Partial<Backup>
  if (backup?.app !== 'eagle-gym' || !Array.isArray(backup.profiles)) throw new Error('not-a-backup')

  // A v1 file predates set types. Bring its sets forward rather than importing
  // rows the rest of the app can't interpret.
  if (backup.version === 1 && Array.isArray(backup.sets)) {
    backup.sets = backup.sets.map((set) => {
      const legacy = set as SetEntry & { isWarmup?: 0 | 1 }
      const { isWarmup, ...rest } = legacy
      return { ...rest, setType: (rest.setType ?? (isWarmup === 1 ? 'warmup' : 'working')) as SetType }
    })
  }

  return backup as Backup
}

export async function importBackup(backup: Backup, mode: 'replace' | 'merge'): Promise<void> {
  await db.transaction(
    'rw',
    [
      db.profiles,
      db.exercises,
      db.routines,
      db.programs,
      db.sessions,
      db.sessionExercises,
      db.sets,
      db.bodyStats,
    ],
    async () => {
      if (mode === 'replace') {
        await Promise.all([
          db.profiles.clear(),
          db.exercises.clear(),
          db.routines.clear(),
          db.programs.clear(),
          db.sessions.clear(),
          db.sessionExercises.clear(),
          db.sets.clear(),
          db.bodyStats.clear(),
        ])
      }

      // Matching ids overwrite, so re-importing the same file is a no-op rather
      // than a duplicate.
      await db.exercises.bulkPut(SEED_EXERCISES)
      await Promise.all([
        db.profiles.bulkPut(backup.profiles ?? []),
        db.exercises.bulkPut(backup.exercises ?? []),
        db.routines.bulkPut(backup.routines ?? []),
        db.programs.bulkPut(backup.programs ?? []),
        db.sessions.bulkPut(backup.sessions ?? []),
        db.sessionExercises.bulkPut(backup.sessionExercises ?? []),
        db.sets.bulkPut(backup.sets ?? []),
        db.bodyStats.bulkPut(backup.bodyStats ?? []),
      ])
    }
  )
}

export async function clearProfileData(profileId: string): Promise<void> {
  await db.transaction('rw', [db.sessions, db.sessionExercises, db.sets, db.bodyStats], async () => {
    const sessionIds = (await db.sessions
      .where('profileId')
      .equals(profileId)
      .primaryKeys()) as string[]
    await db.sets.where('sessionId').anyOf(sessionIds).delete()
    await db.sessionExercises.where('sessionId').anyOf(sessionIds).delete()
    await db.sessions.where('profileId').equals(profileId).delete()
    await db.bodyStats.where('profileId').equals(profileId).delete()
  })
}

export const today = () => format(new Date(), 'yyyy-MM-dd')
