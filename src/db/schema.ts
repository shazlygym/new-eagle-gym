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

/** Only ever used by the calorie formula, which is sex-specific. */
export type Sex = 'male' | 'female'

/** How much moves in a day outside of training. */
export type ActivityLevel = 'sedentary' | 'light' | 'moderate' | 'high'

export type NutritionGoal = 'cut' | 'maintain' | 'bulk'

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
 * How a set of this exercise is measured. A plank or a treadmill interval is a
 * length of time, not a count — logging "12 reps" for either is nonsense.
 */
export type Tracking = 'reps' | 'duration'

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
  /** Daily nutrition goals. Unset until the member fills them in. */
  kcalTarget?: number
  proteinTarget?: number
  carbsTarget?: number
  fatTarget?: number
  /**
   * What the calorie calculator needs. Kept on the profile rather than asked
   * for every time, so re-running it after a few kilos is two taps.
   * Stored as a birth year, not an age, so the number stays true next year.
   */
  sex?: Sex
  heightCm?: number
  birthYear?: number
  activityLevel?: ActivityLevel
  nutritionGoal?: NutritionGoal
  /** Workouts per week the member is aiming for. Unset hides the goal ring. */
  weeklyWorkoutTarget?: number
  /**
   * Rest given to an exercise added mid-workout. A routine's own rest still
   * wins, and any card can be changed on the spot — this is only the starting
   * value, so someone who always rests two minutes says it once.
   */
  defaultRestSeconds?: number
  /**
   * Which version of the built-in four-day block this member has been given.
   * Absent means never — see db/presetProgram.ts. Installing it once and
   * recording it here is what stops a deleted plan from growing back.
   */
  presetVersion?: number
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
  /** Defaults to 'reps' when absent. */
  tracking?: Tracking
  /** A YouTube (or any) link to a form demo, opened in the browser. */
  videoUrl?: string
  /**
   * The rep range this movement is normally trained in — 8–12 for a press,
   * 3–5 for a heavy deadlift, 15–20 for calves. It seeds every routine that
   * picks the exercise up, so the range is decided once here rather than
   * retyped on every plan. On a `duration` exercise it is a range of seconds.
   */
  defaultRepsMin?: number
  defaultRepsMax?: number
  isCustom: 0 | 1
}

export interface RoutineItem {
  exerciseId: string
  targetSets: number
  /**
   * The bottom of the rep range, and the only rep target on plans written
   * before ranges existed — which is why it keeps the old name and the old
   * meaning when `targetRepsMax` is absent. On a `duration` exercise it is a
   * number of seconds and never has a maximum.
   */
  targetReps: number
  /** The top of the range. Set only when it is above `targetReps`. */
  targetRepsMax?: number
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
  /** Bottom of the rep range — see `RoutineItem.targetReps`. */
  targetReps?: number
  /** Top of the range, when the plan asks for one. */
  targetRepsMax?: number
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
  /** Seconds held or worked, on duration-tracked exercises. */
  durationSeconds?: number
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

export type FoodCategory =
  | 'egyptian'
  | 'protein'
  | 'carbs'
  | 'dairy'
  | 'legumes'
  | 'vegetables'
  | 'fruit'
  | 'fats'
  | 'sweets'
  | 'drinks'
  | 'fastfood'
  // Supplements sat under 'protein' next to chicken and fish, which made the
  // one category a gym member filters by useless. Sauces sat under 'fastfood'
  // and 'fats' — a spoon of ketchup is neither.
  | 'supplements'
  | 'sauces'

/** A household measure, so nobody has to weigh a loaf of bread. */
export interface FoodPortion {
  nameAr: string
  nameEn: string
  grams: number
}

/**
 * Macros are per 100 g — or per 100 ml for drinks, which are close enough to
 * water in density that the distinction never shows up in a daily total.
 */
export interface Food {
  id: string
  /** SHARED for the built-in table, otherwise the owning profile. */
  profileId: string
  nameAr: string
  nameEn: string
  category: FoodCategory
  kcal: number
  protein: number
  carbs: number
  fat: number
  portions?: FoodPortion[]
  isCustom: 0 | 1
}

export type MealSlot = 'breakfast' | 'lunch' | 'dinner' | 'snack'

/**
 * One logged item. The name and macros are snapshotted rather than looked up,
 * so correcting a food's data — or deleting it — never silently rewrites what
 * you ate last month.
 */
export interface MealEntry {
  id: string
  profileId: string
  /** 'yyyy-MM-dd'. */
  date: string
  slot: MealSlot
  foodId: string
  nameAr: string
  nameEn: string
  grams: number
  kcal: number
  protein: number
  carbs: number
  fat: number
  createdAt: number
}

/** A combination you eat often, loggable in one tap. */
export interface SavedMeal {
  id: string
  profileId: string
  nameAr: string
  nameEn: string
  items: Array<{ foodId: string; grams: number }>
  createdAt: number
}

/**
 * A progress photo. The image itself is stored as a Blob — IndexedDB handles
 * binary natively, and a base64 string would be a third larger for nothing.
 * Photos are downscaled at capture so a year of them stays in the tens of MB.
 */
export interface ProgressPhoto {
  id: string
  profileId: string
  /** 'yyyy-MM-dd' — the day it was taken. */
  date: string
  blob: Blob
  note?: string
  createdAt: number
}

/**
 * The v3 "claim or drop" rule for the retired built-in exercise library, done
 * per profile: every profile that actually used a SHARED exercise gets its own
 * copy (the first keeps the original id, so most references survive untouched),
 * and exercises nobody used are dropped. Assigning everything to one arbitrary
 * profile — the original v3 behaviour — made other profiles' exercises vanish
 * from their pickers on a shared phone.
 *
 * Pure so the same rule serves both the schema migration and backup import
 * (old backup files still carry SHARED rows).
 */
export function claimSharedExercises(input: {
  exercises: Exercise[]
  sets: SetEntry[]
  routines: Routine[]
  sessions: Session[]
  sessionExercises: SessionExercise[]
}): {
  /** Claimed originals and per-profile clones, ready to write. */
  claimed: Exercise[]
  /** SHARED exercises nobody used. */
  droppedIds: string[]
  /** profileId → (shared exercise id → that profile's copy id). */
  remap: Map<string, Map<string, string>>
} {
  const usedBy = new Map<string, Set<string>>()
  const use = (exerciseId: string, profileId: string) => {
    let users = usedBy.get(exerciseId)
    if (!users) usedBy.set(exerciseId, (users = new Set()))
    users.add(profileId)
  }
  for (const set of input.sets) use(set.exerciseId, set.profileId)
  // A routine slot counts as use too — dropping its exercise would leave the
  // routine pointing at nothing.
  for (const routine of input.routines) {
    for (const item of routine.items) use(item.exerciseId, routine.profileId)
  }
  // And so does a card in a logged workout, even one whose sets were all
  // deleted: History renders the card, so a dropped exercise reads as a blank
  // row rather than an absence.
  const sessionProfile = new Map(input.sessions.map((session) => [session.id, session.profileId]))
  for (const entry of input.sessionExercises) {
    const profileId = sessionProfile.get(entry.sessionId)
    if (profileId) use(entry.exerciseId, profileId)
  }

  const claimed: Exercise[] = []
  const droppedIds: string[] = []
  const remap = new Map<string, Map<string, string>>()

  for (const exercise of input.exercises) {
    if (exercise.profileId !== SHARED) continue
    const users = [...(usedBy.get(exercise.id) ?? [])]
    if (users.length === 0) {
      droppedIds.push(exercise.id)
      continue
    }
    claimed.push({ ...exercise, profileId: users[0], isCustom: 1 })
    for (const profileId of users.slice(1)) {
      const copyId = newId()
      claimed.push({ ...exercise, id: copyId, profileId, isCustom: 1 })
      let ids = remap.get(profileId)
      if (!ids) remap.set(profileId, (ids = new Map()))
      ids.set(exercise.id, copyId)
    }
  }

  return { claimed, droppedIds, remap }
}

class WorkoutDB extends Dexie {
  profiles!: Table<Profile, string>
  exercises!: Table<Exercise, string>
  routines!: Table<Routine, string>
  programs!: Table<Program, string>
  sessions!: Table<Session, string>
  sessionExercises!: Table<SessionExercise, string>
  sets!: Table<SetEntry, string>
  bodyStats!: Table<BodyStat, string>
  foods!: Table<Food, string>
  mealEntries!: Table<MealEntry, string>
  savedMeals!: Table<SavedMeal, string>
  photos!: Table<ProgressPhoto, string>

  constructor() {
    // Frozen at the app's original name. This string is the IndexedDB database
    // name, not branding: changing it points the app at an empty database and
    // every workout already on the phone becomes unreachable.
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

    // v3 adds nutrition, and retires the built-in exercise library — members
    // build their own list now. Seeded exercises that were actually used become
    // the member's own — per profile, so nobody's history goes unreadable on a
    // shared phone. The rest simply go away.
    this.version(3)
      .stores({
        foods: 'id, profileId, category, [profileId+category]',
        mealEntries: 'id, profileId, [profileId+date]',
        savedMeals: 'id, profileId',
      })
      .upgrade(async (tx) => {
        const [exercises, sets, sessions, sessionExercises, routines] = await Promise.all([
          tx.table('exercises').toArray() as Promise<Exercise[]>,
          tx.table('sets').toArray() as Promise<SetEntry[]>,
          tx.table('sessions').toArray() as Promise<Session[]>,
          tx.table('sessionExercises').toArray() as Promise<SessionExercise[]>,
          tx.table('routines').toArray() as Promise<Routine[]>,
        ])

        const { claimed, droppedIds, remap } = claimSharedExercises({
          exercises,
          sets,
          routines,
          sessions,
          sessionExercises,
        })
        await tx.table('exercises').bulkDelete(droppedIds)
        await tx.table('exercises').bulkPut(claimed)

        // Profiles other than the first got a cloned id; their references
        // follow it.
        if (remap.size > 0) {
          const sessionProfile = new Map(sessions.map((s) => [s.id, s.profileId]))
          const mappedId = (profileId: string | undefined, exerciseId: string) =>
            profileId ? remap.get(profileId)?.get(exerciseId) : undefined

          await tx.table('sets').bulkPut(
            sets.flatMap((set) => {
              const next = mappedId(set.profileId, set.exerciseId)
              return next ? [{ ...set, exerciseId: next }] : []
            })
          )
          await tx.table('sessionExercises').bulkPut(
            sessionExercises.flatMap((entry) => {
              const next = mappedId(sessionProfile.get(entry.sessionId), entry.exerciseId)
              return next ? [{ ...entry, exerciseId: next }] : []
            })
          )
          await tx.table('routines').bulkPut(
            routines.flatMap((routine) => {
              const ids = remap.get(routine.profileId)
              if (!ids || !routine.items.some((item) => ids.has(item.exerciseId))) return []
              return [
                {
                  ...routine,
                  items: routine.items.map((item) => ({
                    ...item,
                    exerciseId: ids.get(item.exerciseId) ?? item.exerciseId,
                  })),
                },
              ]
            })
          )
        }
      })

    // v4 adds progress photos. The weekly workout goal and the calorie
    // calculator's inputs (sex, height, birth year, activity, goal) ride along
    // as plain optional Profile fields — nothing indexes them, so they need no
    // schema entry and no further version.
    this.version(4).stores({
      photos: 'id, profileId, [profileId+date]',
    })
  }
}

export const db = new WorkoutDB()

/** Short, collision-safe id. crypto.randomUUID is available in all iOS 15.4+ Safari. */
export function newId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID()
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
}
