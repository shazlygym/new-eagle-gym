import type { Equipment, Movement, MuscleGroup } from './schema'

// The four-day block every new member starts on, transcribed from the coach's
// sheet: exercise, sets, rep range — in that order, the same three columns the
// training sheet shows.
//
// This is the one exception to the empty library in db/seed.ts. That decision
// was about not shipping seventy machines nobody asked for; a plan the gym
// actually prescribes is the opposite case — it is the reason most people open
// the app on day one, and typing twenty-one exercises in by hand before your
// first set is how an app loses someone. Only the movements this block uses are
// installed, each with a form video, and every one of them can be renamed,
// re-ranged or deleted like any other.

/** Bumping this reinstalls the block for members who already have the old one. */
export const PRESET_VERSION = 1

export interface PresetExercise {
  /** Stable key. The deterministic row ids are built from it — never rename. */
  slug: string
  nameAr: string
  nameEn: string
  muscleGroup: MuscleGroup
  equipment: Equipment
  movement: Movement
  /**
   * A form demo on YouTube. Every link here was opened and confirmed to still
   * resolve — a default plan that ships dead links is worse than one with none,
   * because the member assumes the app is broken rather than the video gone.
   */
  videoUrl: string
}

export interface PresetItem {
  slug: string
  sets: number
  repsMin: number
  repsMax: number
  /**
   * Not on the coach's sheet, which only gave sets and reps. Set here from the
   * job each movement does: a minute on ab work, ninety seconds on isolation,
   * two on the heavy compounds. Editable per exercise from the sheet.
   */
  restSeconds: number
}

export interface PresetDay {
  /** Stable key, as with `PresetExercise.slug`. */
  key: string
  nameAr: string
  nameEn: string
  /** How the day is labelled inside the program. */
  labelAr: string
  labelEn: string
  items: PresetItem[]
}

const REST = { core: 60, isolation: 90, compound: 120 } as const

export const PRESET_EXERCISES: PresetExercise[] = [
  // ─── Day 1 ──────────────────────────────────────────────────────────────────
  {
    slug: 'cable-crunch',
    nameAr: 'كرنش بالكابل',
    nameEn: 'Cable crunch',
    muscleGroup: 'core',
    equipment: 'cable',
    movement: 'other',
    videoUrl: 'https://www.youtube.com/watch?v=AV5PmZJIrrw',
  },
  {
    slug: 'leg-curl',
    nameAr: 'ثني الأرجل جالس',
    nameEn: 'Seated leg curl',
    muscleGroup: 'legs',
    equipment: 'machine',
    movement: 'legs',
    videoUrl: 'https://www.youtube.com/watch?v=G5iP_YcDQdE',
  },
  {
    slug: 'db-split-squat',
    nameAr: 'سبليت سكوات بدمبل (جهة معاكسة)',
    nameEn: 'DB contralateral split squat',
    muscleGroup: 'legs',
    equipment: 'dumbbell',
    movement: 'legs',
    videoUrl: 'https://www.youtube.com/watch?v=5VG4UnfA7Bk',
  },
  {
    slug: 'tbar-row',
    nameAr: 'تجديف تي-بار بمسند صدر',
    nameEn: 'Chest-supported T-bar row',
    muscleGroup: 'back',
    equipment: 'machine',
    movement: 'pull',
    videoUrl: 'https://www.youtube.com/watch?v=Mlr-Lx-10HQ',
  },
  {
    slug: 'db-preacher-curl',
    nameAr: 'بايسبس بريتشر بدمبل بذراع واحدة',
    nameEn: 'SA DB preacher curl',
    muscleGroup: 'arms',
    equipment: 'dumbbell',
    movement: 'pull',
    videoUrl: 'https://www.youtube.com/watch?v=MBcb119F_h8',
  },

  // ─── Day 2 ──────────────────────────────────────────────────────────────────
  {
    slug: 'half-kneeling-windmill',
    nameAr: 'ويندميل نصف راكع',
    nameEn: 'Half-kneeling windmill',
    muscleGroup: 'core',
    equipment: 'dumbbell',
    movement: 'other',
    videoUrl: 'https://www.youtube.com/watch?v=MIR0dpEtubQ',
  },
  {
    slug: 'sa-lat-pulldown',
    nameAr: 'سحب أمامي بذراع واحدة',
    nameEn: 'SA lat pulldown',
    muscleGroup: 'back',
    equipment: 'cable',
    movement: 'pull',
    videoUrl: 'https://www.youtube.com/watch?v=GJVEfysKkYA',
  },
  {
    slug: 'incline-db-press',
    nameAr: 'بنش مائل بالدمبل',
    nameEn: 'Incline DB press',
    muscleGroup: 'chest',
    equipment: 'dumbbell',
    movement: 'push',
    videoUrl: 'https://www.youtube.com/watch?v=sPBras335gU',
  },
  {
    slug: 'supported-lateral-raise',
    nameAr: 'رفرفة جانبية بدمبل بمسند صدر',
    nameEn: 'Chest-supported DB lateral raise',
    muscleGroup: 'shoulders',
    equipment: 'dumbbell',
    movement: 'push',
    videoUrl: 'https://www.youtube.com/watch?v=DU1oks15hbI',
  },
  {
    slug: 'rope-pushdown',
    nameAr: 'ترايسبس بالحبل المزدوج',
    nameEn: 'Dual rope triceps pushdown',
    muscleGroup: 'arms',
    equipment: 'cable',
    movement: 'push',
    videoUrl: 'https://www.youtube.com/watch?v=7S210LcD388',
  },

  // ─── Day 3 ──────────────────────────────────────────────────────────────────
  {
    slug: 'cable-woodchopper',
    nameAr: 'قطع الخشب بالكابل من أعلى لأسفل',
    nameEn: 'High-to-low cable woodchopper',
    muscleGroup: 'core',
    equipment: 'cable',
    movement: 'other',
    videoUrl: 'https://www.youtube.com/watch?v=VEQRm5gtVZ4',
  },
  {
    slug: 'db-rdl',
    nameAr: 'رومانيان ديدليفت بالدمبل',
    nameEn: 'DB Romanian deadlift',
    muscleGroup: 'legs',
    equipment: 'dumbbell',
    movement: 'legs',
    videoUrl: 'https://www.youtube.com/watch?v=vrVvA2TdRDg',
  },
  {
    slug: 'high-incline-smith-press',
    nameAr: 'بنش مائل عالي على سميث',
    nameEn: 'High incline Smith press',
    muscleGroup: 'chest',
    equipment: 'machine',
    movement: 'push',
    videoUrl: 'https://www.youtube.com/watch?v=zLW_hZ8zGo8',
  },
  {
    slug: 'rear-delt-fly',
    nameAr: 'رفرفة خلفية على الجهاز',
    nameEn: 'Machine rear delt fly',
    muscleGroup: 'shoulders',
    equipment: 'machine',
    movement: 'pull',
    videoUrl: 'https://www.youtube.com/watch?v=jWOwdMdtAfk',
  },
  {
    slug: 'incline-db-curl',
    nameAr: 'بايسبس مائل بالدمبل',
    nameEn: 'Incline DB curl',
    muscleGroup: 'arms',
    equipment: 'dumbbell',
    movement: 'pull',
    videoUrl: 'https://www.youtube.com/watch?v=eZSqK9rkwK0',
  },
  {
    slug: 'leg-extension',
    nameAr: 'تمديد الأرجل',
    nameEn: 'Leg extension',
    muscleGroup: 'legs',
    equipment: 'machine',
    movement: 'legs',
    videoUrl: 'https://www.youtube.com/watch?v=TJQmtXUEzNk',
  },

  // ─── Day 4 ──────────────────────────────────────────────────────────────────
  {
    slug: 'pallof-press',
    nameAr: 'بالوف بريس',
    nameEn: 'Pallof press',
    muscleGroup: 'core',
    equipment: 'cable',
    movement: 'other',
    videoUrl: 'https://www.youtube.com/watch?v=dBAmQ9bx3JA',
  },
  {
    slug: 'upper-back-pulldown',
    nameAr: 'سحب أمامي للظهر العلوي',
    nameEn: 'Upper back pulldown',
    muscleGroup: 'back',
    equipment: 'cable',
    movement: 'pull',
    videoUrl: 'https://www.youtube.com/watch?v=bnJSNO2sw20',
  },
  {
    slug: 'flat-db-press',
    nameAr: 'بنش مستوي بالدمبل',
    nameEn: 'Flat DB press',
    muscleGroup: 'chest',
    equipment: 'dumbbell',
    movement: 'push',
    videoUrl: 'https://www.youtube.com/watch?v=M0tN99QgPyU',
  },
  {
    slug: 'cable-lateral-raise',
    nameAr: 'رفرفة جانبية بالكابل (مدى ممتد)',
    nameEn: 'Lengthened-range cable lateral raise',
    muscleGroup: 'shoulders',
    equipment: 'cable',
    movement: 'push',
    videoUrl: 'https://www.youtube.com/watch?v=oGoYxAOuEfo',
  },
  {
    slug: 'overhead-rope-extension',
    nameAr: 'ترايسبس خلف الرأس بالحبل',
    nameEn: 'Overhead rope triceps extension',
    muscleGroup: 'arms',
    equipment: 'cable',
    movement: 'push',
    videoUrl: 'https://www.youtube.com/watch?v=AUsSlsBu5eg',
  },
]

// Days 3 and 4 are labelled "Day1" on the original sheet — a copy-paste slip in
// the source, not four days of the same session. They are numbered properly here.
//
// The number lives on the label and the muscles live in the routine's name,
// because the program screen stacks the two: "Day 1" over "Legs & Back". Putting
// the number in both would print it twice.
export const PRESET_DAYS: PresetDay[] = [
  {
    key: 'day-1',
    nameAr: 'أرجل وظهر',
    nameEn: 'Legs & Back',
    labelAr: 'يوم 1',
    labelEn: 'Day 1',
    items: [
      { slug: 'cable-crunch', sets: 1, repsMin: 8, repsMax: 10, restSeconds: REST.core },
      { slug: 'leg-curl', sets: 3, repsMin: 8, repsMax: 10, restSeconds: REST.isolation },
      { slug: 'db-split-squat', sets: 3, repsMin: 6, repsMax: 8, restSeconds: REST.compound },
      { slug: 'tbar-row', sets: 3, repsMin: 8, repsMax: 10, restSeconds: REST.compound },
      { slug: 'db-preacher-curl', sets: 3, repsMin: 8, repsMax: 10, restSeconds: REST.isolation },
    ],
  },
  {
    key: 'day-2',
    nameAr: 'علوي أ',
    nameEn: 'Upper A',
    labelAr: 'يوم 2',
    labelEn: 'Day 2',
    items: [
      {
        slug: 'half-kneeling-windmill',
        sets: 1,
        repsMin: 8,
        repsMax: 10,
        restSeconds: REST.core,
      },
      { slug: 'sa-lat-pulldown', sets: 3, repsMin: 8, repsMax: 10, restSeconds: REST.compound },
      { slug: 'incline-db-press', sets: 3, repsMin: 5, repsMax: 7, restSeconds: REST.compound },
      {
        slug: 'supported-lateral-raise',
        sets: 3,
        repsMin: 8,
        repsMax: 10,
        restSeconds: REST.isolation,
      },
      { slug: 'rope-pushdown', sets: 3, repsMin: 8, repsMax: 10, restSeconds: REST.isolation },
    ],
  },
  {
    key: 'day-3',
    nameAr: 'أرجل وصدر',
    nameEn: 'Legs & Chest',
    labelAr: 'يوم 3',
    labelEn: 'Day 3',
    items: [
      { slug: 'cable-woodchopper', sets: 1, repsMin: 8, repsMax: 10, restSeconds: REST.core },
      { slug: 'db-rdl', sets: 3, repsMin: 6, repsMax: 8, restSeconds: REST.compound },
      {
        slug: 'high-incline-smith-press',
        sets: 3,
        repsMin: 8,
        repsMax: 10,
        restSeconds: REST.compound,
      },
      { slug: 'rear-delt-fly', sets: 3, repsMin: 8, repsMax: 10, restSeconds: REST.isolation },
      { slug: 'incline-db-curl', sets: 3, repsMin: 8, repsMax: 10, restSeconds: REST.isolation },
      { slug: 'leg-extension', sets: 3, repsMin: 8, repsMax: 10, restSeconds: REST.isolation },
    ],
  },
  {
    key: 'day-4',
    nameAr: 'علوي ب',
    nameEn: 'Upper B',
    labelAr: 'يوم 4',
    labelEn: 'Day 4',
    items: [
      { slug: 'pallof-press', sets: 1, repsMin: 8, repsMax: 10, restSeconds: REST.core },
      { slug: 'upper-back-pulldown', sets: 3, repsMin: 8, repsMax: 10, restSeconds: REST.compound },
      { slug: 'flat-db-press', sets: 3, repsMin: 5, repsMax: 7, restSeconds: REST.compound },
      {
        slug: 'cable-lateral-raise',
        sets: 3,
        repsMin: 8,
        repsMax: 10,
        restSeconds: REST.isolation,
      },
      {
        slug: 'overhead-rope-extension',
        sets: 3,
        repsMin: 8,
        repsMax: 10,
        restSeconds: REST.isolation,
      },
    ],
  },
]

export const PRESET_PROGRAM = {
  nameAr: 'البرنامج الأساسي · 4 أيام',
  nameEn: 'Base program · 4 days',
  weeks: 8,
  /** One plate step. Read by the progression nudge on the workout screen. */
  incrementKg: 2.5,
} as const

/**
 * The rep range each movement carries in its own right, taken from the single
 * day that programs it. Kept derived rather than repeated on `PresetExercise`
 * so the sheet above stays the one place a range is written down.
 */
export const PRESET_ITEM_BY_SLUG: ReadonlyMap<string, PresetItem> = new Map(
  PRESET_DAYS.flatMap((day) => day.items).map((item) => [item.slug, item])
)
