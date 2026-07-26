import Dexie, { type Table } from 'dexie'

// ─── Conventions ──────────────────────────────────────────────────────────────
//
// * Weights are ALWAYS stored in kilograms and body measurements in centimetres.
//   The unit setting is a display concern only — otherwise toggling kg/lb would
//   silently rewrite years of history.
// * Timestamps are epoch milliseconds. Calendar days are 'yyyy-MM-dd' strings so
//   they can be compared and indexed without timezone drift.
// * Booleans are stored as 0/1 because IndexedDB cannot index a boolean.
// * Built-in exercises use profileId === SHARED rather than null, because
//   IndexedDB drops records with a null key out of the index entirely.

export const SHARED = '*'

export type Units = 'kg' | 'lb'
export type Locale = 'ar' | 'en'

export type MuscleGroup =
  | 'chest'
  | 'back'
  | 'shoulders'
  | 'arms'
  | 'legs'
  | 'core'
  | 'cardio'
  | 'fullBody'

export type Equipment = 'barbell' | 'dumbbell' | 'machine' | 'cable' | 'bodyweight' | 'other'

/**
 * Movement pattern, for push/pull balance. Most of it follows from the muscle
 * group, but arms genuinely split — curls are pull, extensions are push — so
 * the field can be set explicitly where the group would get it wrong.
 */
export type Movement = 'push' | 'pull' | 'legs' | 'other'

/**
 * Warm-ups are excluded from volume and personal records. Drop sets and sets
 * taken to failure do count — they are working sets — but they are marked so
 * the log reflects what actually happened.
 */
export type SetType = 'warmup' | 'working' | 'drop' | 'failure'

export interface Profile {
  id: string
  name: string
  membershipNumber?: string
  units: Units
  /** Adds a reps-in-reserve field to every set row. Off by default. */
  trackRpe?: 0 | 1
  createdAt: number
}

export interface Exercise {
  id: string
  /** SHARED for the built-in library, otherwise the owning profile. */
  profileId: string
  nameAr: string
  nameEn: string
  muscleGroup: MuscleGroup
  equipment: Equipment
  movement?: Movement
  isCustom: 0 | 1
}

export interface RoutineItem {
  exerciseId: string
  targetSets: number
  targetReps: number
  restSeconds: number
  supersetGroup?: string
}

export interface Routine {
  id: string
  profileId: string
  nameAr: string
  nameEn: string
  items: RoutineItem[]
  createdAt: number
}

export interface Session {
  id: string
  profileId: string
  routineId?: string
  /** Snapshot of the routine name, so renaming a routine never rewrites history. */
  titleAr?: string
  titleEn?: string
  startedAt: number
  endedAt?: number
  notes?: string
  status: 'active' | 'done'
  /** Set when the session was started from a training program. */
  programId?: string
  programWeek?: number
  programDayIndex?: number
}

/**
 * One exercise slot inside one session. Separate from `sets` so an exercise can
 * be added to a workout and sit there empty until the first set is logged — and
 * so the same exercise can legitimately appear twice in one session.
 */
export interface SessionExercise {
  id: string
  sessionId: string
  exerciseId: string
  order: number
  targetSets?: number
  targetReps?: number
  restSeconds: number
  /**
   * Exercises sharing a group id are performed back to back as a superset, so
   * rest is taken once at the end of the group rather than after each exercise.
   */
  supersetGroup?: string
}

export interface SetEntry {
  id: string
  sessionExerciseId: string
  sessionId: string
  /** Denormalised so per-profile history queries don't need to join sessions. */
  profileId: string
  exerciseId: string
  setNumber: number
  /** Kilograms. */
  weight: number
  reps: number
  /** Reps in reserve, 0–5. Optional: most people log it on hard sets only. */
  rpe?: number
  setType: SetType
  done: 0 | 1
  completedAt?: number
}

export interface BodyStat {
  id: string
  profileId: string
  /** 'yyyy-MM-dd' — one entry per day, per profile. */
  date: string
  /** Kilograms. */
  weight?: number
  /** Percent. */
  bodyFat?: number
  /** Centimetres. */
  chest?: number
  waist?: number
  hips?: number
  arms?: number
  thighs?: number
  notes?: string
  createdAt: number
}

/** One scheduled training day inside a program. */
export interface ProgramDay {
  routineId: string
  labelAr: string
  labelEn: string
}

/**
 * A multi-week training block: which days you train, in what order, and how the
 * load moves week to week. A routine says *what* to do; a program says *when*
 * and *how much heavier than last week*.
 */
export interface Program {
  id: string
  profileId: string
  nameAr: string
  nameEn: string
  weeks: number
  days: ProgramDay[]
  progression: {
    kind: 'none' | 'linear'
    /** Kilograms added to each exercise's working weight per completed week. */
    incrementKg: number
  }
  /** Unset until the block is started. */
  startedAt?: number
  active: 0 | 1
  createdAt: number
}

class EagleGymDB extends Dexie {
  profiles!: Table<Profile, string>
  exercises!: Table<Exercise, string>
  routines!: Table<Routine, string>
  programs!: Table<Program, string>
  sessions!: Table<Session, string>
  sessionExercises!: Table<SessionExercise, string>
  sets!: Table<SetEntry, string>
  bodyStats!: Table<BodyStat, string>

  constructor() {
    super('eagle-gym')

    this.version(1).stores({
      profiles: 'id, createdAt',
      exercises: 'id, profileId, muscleGroup, [profileId+muscleGroup]',
      routines: 'id, profileId, createdAt',
      sessions: 'id, profileId, [profileId+startedAt], [profileId+status]',
      sessionExercises: 'id, sessionId, [sessionId+order]',
      sets: 'id, sessionId, sessionExerciseId, [exerciseId+completedAt], [profileId+completedAt]',
      bodyStats: 'id, profileId, [profileId+date]',
    })

    // v2 adds programs, superset grouping and richer set types. Existing
    // installs are upgraded in place — a member who has been logging for months
    // must not lose a single set to a schema change.
    this.version(2)
      .stores({
        programs: 'id, profileId, [profileId+active]',
      })
      .upgrade(async (tx) => {
        await tx
          .table('sets')
          .toCollection()
          .modify((set: SetEntry & { isWarmup?: 0 | 1 }) => {
            set.setType = set.isWarmup === 1 ? 'warmup' : 'working'
            delete set.isWarmup
          })
      })
  }
}

export const db = new EagleGymDB()

/** Short, collision-safe id. crypto.randomUUID is available in all iOS 15.4+ Safari. */
export function newId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID()
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
}
