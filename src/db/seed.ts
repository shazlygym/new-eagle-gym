import { SHARED, type Equipment, type Exercise, type MuscleGroup } from './schema'

type Seed = [id: string, en: string, ar: string, group: MuscleGroup, equipment: Equipment]

// Stable ids (not random) so re-seeding is idempotent and a routine exported from
// one device still resolves its exercises when imported on another.
const SEEDS: Seed[] = [
  // ─── Chest ─────────────────────────────────────────────────────────────────
  ['bench-press', 'Barbell Bench Press', 'ضغط بنش بالبار', 'chest', 'barbell'],
  ['incline-bench', 'Incline Barbell Press', 'ضغط بنش مائل بالبار', 'chest', 'barbell'],
  ['decline-bench', 'Decline Barbell Press', 'ضغط بنش سفلي بالبار', 'chest', 'barbell'],
  ['db-bench', 'Dumbbell Bench Press', 'ضغط بنش بالدمبل', 'chest', 'dumbbell'],
  ['incline-db', 'Incline Dumbbell Press', 'ضغط مائل بالدمبل', 'chest', 'dumbbell'],
  ['db-fly', 'Dumbbell Fly', 'تفتيح بالدمبل', 'chest', 'dumbbell'],
  ['cable-crossover', 'Cable Crossover', 'تفتيح بالكابل', 'chest', 'cable'],
  ['chest-press-machine', 'Chest Press Machine', 'جهاز ضغط الصدر', 'chest', 'machine'],
  ['pec-deck', 'Pec Deck', 'جهاز التفتيح', 'chest', 'machine'],
  ['push-up', 'Push-Up', 'ضغط (بلانك)', 'chest', 'bodyweight'],
  ['dips-chest', 'Chest Dips', 'متوازي للصدر', 'chest', 'bodyweight'],

  // ─── Back ──────────────────────────────────────────────────────────────────
  ['deadlift', 'Deadlift', 'الرفعة الميتة', 'back', 'barbell'],
  ['barbell-row', 'Barbell Row', 'سحب بالبار', 'back', 'barbell'],
  ['t-bar-row', 'T-Bar Row', 'سحب تي بار', 'back', 'barbell'],
  ['pull-up', 'Pull-Up', 'عقلة', 'back', 'bodyweight'],
  ['chin-up', 'Chin-Up', 'عقلة قبضة عكسية', 'back', 'bodyweight'],
  ['lat-pulldown', 'Lat Pulldown', 'سحب أمامي', 'back', 'cable'],
  ['seated-row', 'Seated Cable Row', 'تجديف بالكابل', 'back', 'cable'],
  ['db-row', 'One-Arm Dumbbell Row', 'سحب بالدمبل بذراع واحدة', 'back', 'dumbbell'],
  ['straight-arm-pulldown', 'Straight-Arm Pulldown', 'سحب بذراع مستقيمة', 'back', 'cable'],
  ['back-extension', 'Back Extension', 'تمديد الظهر', 'back', 'bodyweight'],
  ['shrug', 'Barbell Shrug', 'هز الأكتاف بالبار', 'back', 'barbell'],

  // ─── Shoulders ─────────────────────────────────────────────────────────────
  ['ohp', 'Overhead Press', 'ضغط كتف بالبار', 'shoulders', 'barbell'],
  ['db-shoulder-press', 'Dumbbell Shoulder Press', 'ضغط كتف بالدمبل', 'shoulders', 'dumbbell'],
  ['arnold-press', 'Arnold Press', 'ضغط أرنولد', 'shoulders', 'dumbbell'],
  ['lateral-raise', 'Lateral Raise', 'رفرفة جانبية', 'shoulders', 'dumbbell'],
  ['front-raise', 'Front Raise', 'رفرفة أمامية', 'shoulders', 'dumbbell'],
  ['rear-delt-fly', 'Rear Delt Fly', 'رفرفة خلفية', 'shoulders', 'dumbbell'],
  ['face-pull', 'Face Pull', 'سحب للوجه', 'shoulders', 'cable'],
  ['upright-row', 'Upright Row', 'سحب عمودي', 'shoulders', 'barbell'],

  // ─── Arms ──────────────────────────────────────────────────────────────────
  ['barbell-curl', 'Barbell Curl', 'مرجحة بالبار', 'arms', 'barbell'],
  ['db-curl', 'Dumbbell Curl', 'مرجحة بالدمبل', 'arms', 'dumbbell'],
  ['hammer-curl', 'Hammer Curl', 'مرجحة مطرقة', 'arms', 'dumbbell'],
  ['preacher-curl', 'Preacher Curl', 'مرجحة على البانش', 'arms', 'barbell'],
  ['concentration-curl', 'Concentration Curl', 'مرجحة تركيز', 'arms', 'dumbbell'],
  ['cable-curl', 'Cable Curl', 'مرجحة بالكابل', 'arms', 'cable'],
  ['triceps-pushdown', 'Triceps Pushdown', 'ترايسبس بالكابل', 'arms', 'cable'],
  ['skull-crusher', 'Skull Crusher', 'ترايسبس مستلقي', 'arms', 'barbell'],
  ['overhead-extension', 'Overhead Triceps Extension', 'تمديد ترايسبس خلف الرأس', 'arms', 'dumbbell'],
  ['dips-triceps', 'Triceps Dips', 'متوازي للترايسبس', 'arms', 'bodyweight'],
  ['close-grip-bench', 'Close-Grip Bench Press', 'ضغط بنش قبضة ضيقة', 'arms', 'barbell'],
  ['wrist-curl', 'Wrist Curl', 'تمرين الساعد', 'arms', 'dumbbell'],

  // ─── Legs ──────────────────────────────────────────────────────────────────
  ['back-squat', 'Barbell Back Squat', 'سكوات خلفي بالبار', 'legs', 'barbell'],
  ['front-squat', 'Front Squat', 'سكوات أمامي', 'legs', 'barbell'],
  ['leg-press', 'Leg Press', 'جهاز دفع الأرجل', 'legs', 'machine'],
  ['romanian-deadlift', 'Romanian Deadlift', 'الرفعة الرومانية', 'legs', 'barbell'],
  ['lunge', 'Walking Lunge', 'طعن مشي', 'legs', 'dumbbell'],
  ['bulgarian-split', 'Bulgarian Split Squat', 'سكوات بلغاري', 'legs', 'dumbbell'],
  ['leg-extension', 'Leg Extension', 'تمديد الرجل', 'legs', 'machine'],
  ['leg-curl', 'Lying Leg Curl', 'ثني الرجل', 'legs', 'machine'],
  ['hip-thrust', 'Hip Thrust', 'رفع الحوض', 'legs', 'barbell'],
  ['calf-raise', 'Standing Calf Raise', 'رفع السمانة واقفاً', 'legs', 'machine'],
  ['seated-calf-raise', 'Seated Calf Raise', 'رفع السمانة جالساً', 'legs', 'machine'],
  ['goblet-squat', 'Goblet Squat', 'سكوات جوبليت', 'legs', 'dumbbell'],

  // ─── Core ──────────────────────────────────────────────────────────────────
  ['plank', 'Plank', 'بلانك', 'core', 'bodyweight'],
  ['crunch', 'Crunch', 'بطن كرنش', 'core', 'bodyweight'],
  ['hanging-leg-raise', 'Hanging Leg Raise', 'رفع الأرجل معلقاً', 'core', 'bodyweight'],
  ['russian-twist', 'Russian Twist', 'تويست روسي', 'core', 'bodyweight'],
  ['cable-crunch', 'Cable Crunch', 'بطن بالكابل', 'core', 'cable'],
  ['ab-wheel', 'Ab Wheel Rollout', 'عجلة البطن', 'core', 'other'],
  ['side-plank', 'Side Plank', 'بلانك جانبي', 'core', 'bodyweight'],

  // ─── Cardio ────────────────────────────────────────────────────────────────
  ['treadmill', 'Treadmill', 'المشاية', 'cardio', 'machine'],
  ['stationary-bike', 'Stationary Bike', 'الدراجة الثابتة', 'cardio', 'machine'],
  ['rowing-machine', 'Rowing Machine', 'جهاز التجديف', 'cardio', 'machine'],
  ['elliptical', 'Elliptical', 'الأوربتراك', 'cardio', 'machine'],
  ['jump-rope', 'Jump Rope', 'نط الحبل', 'cardio', 'bodyweight'],
  ['stair-climber', 'Stair Climber', 'جهاز الدرج', 'cardio', 'machine'],

  // ─── Full body ─────────────────────────────────────────────────────────────
  ['clean-and-press', 'Clean and Press', 'خطف ودفع', 'fullBody', 'barbell'],
  ['kettlebell-swing', 'Kettlebell Swing', 'أرجحة الكيتل بيل', 'fullBody', 'other'],
  ['burpee', 'Burpee', 'بيربي', 'fullBody', 'bodyweight'],
  ['farmers-walk', "Farmer's Walk", 'مشية المزارع', 'fullBody', 'dumbbell'],
]

export const SEED_EXERCISES: Exercise[] = SEEDS.map(
  ([id, nameEn, nameAr, muscleGroup, equipment]) => ({
    id,
    profileId: SHARED,
    nameEn,
    nameAr,
    muscleGroup,
    equipment,
    isCustom: 0,
  })
)

/** Starter routines, created for each new profile so Home is never empty. */
export const STARTER_ROUTINES: Array<{
  nameEn: string
  nameAr: string
  items: Array<[exerciseId: string, sets: number, reps: number, rest: number]>
}> = [
  {
    nameEn: 'Push Day',
    nameAr: 'يوم الدفع',
    items: [
      ['bench-press', 4, 8, 120],
      ['incline-db', 3, 10, 90],
      ['db-shoulder-press', 3, 10, 90],
      ['lateral-raise', 3, 15, 60],
      ['triceps-pushdown', 3, 12, 60],
    ],
  },
  {
    nameEn: 'Pull Day',
    nameAr: 'يوم السحب',
    items: [
      ['deadlift', 3, 5, 180],
      ['pull-up', 4, 8, 120],
      ['seated-row', 3, 10, 90],
      ['face-pull', 3, 15, 60],
      ['db-curl', 3, 12, 60],
    ],
  },
  {
    nameEn: 'Leg Day',
    nameAr: 'يوم الأرجل',
    items: [
      ['back-squat', 4, 8, 150],
      ['romanian-deadlift', 3, 10, 120],
      ['leg-press', 3, 12, 90],
      ['leg-curl', 3, 12, 60],
      ['calf-raise', 4, 15, 45],
    ],
  },
]
