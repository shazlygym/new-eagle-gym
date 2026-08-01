// Captures the manifest screenshots that Android shows in its install dialog,
// and that PWABuilder asks for when it packages the app.
//
// Run with `npm run screenshots` while `npm run dev` is up. It drives a throwaway
// browser profile, seeds it with a plausible few weeks of training so the charts
// and rings have something in them, and shoots each tab. Nothing touches the
// real database — the profile is created fresh and thrown away.
//
// The seeded numbers are demonstration data, not a template: they exist so an
// empty app doesn't photograph as a set of empty states.

import { chromium } from 'playwright-core'
import { mkdir, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const outDir = resolve(root, 'public/screenshots')
const baseUrl = process.env.APP_URL || 'http://localhost:5173'

// A Pixel-ish portrait window at 2×, which lands inside Chrome's rules for a
// rich install dialog: every side between 320 and 3840 px, and the long side no
// more than 2.3× the short one (1830/824 = 2.22).
const VIEWPORT = { width: 412, height: 915 }
const SCALE = 2

const SHOTS = [
  { file: 'home.png', path: '/', label: 'الرئيسية — تمرينك الجاي والتقدم بتاعك' },
  { file: 'nutrition.png', path: '/nutrition', label: 'الأكل — سعرات وبروتين ودهون بالمصري' },
  { file: 'progress.png', path: '/progress', label: 'التقدم — وزنك وحجم شغلك على الوقت' },
  { file: 'exercises.png', path: '/exercises', label: 'التمارين — مكتبتك أنت، بنطاق عدات لكل تمرين' },
]

// playwright-core ships no browser of its own and pins a revision that rarely
// matches whatever is already on the machine, so the binary is named outright.
// Override with CHROMIUM_PATH when it lives somewhere else.
const executablePath =
  process.env.CHROMIUM_PATH ||
  (process.platform === 'win32'
    ? `${process.env.LOCALAPPDATA}\\ms-playwright\\chromium-1228\\chrome-win64\\chrome.exe`
    : '/opt/pw-browsers/chromium-1194/chrome-linux/chrome')

const browser = await chromium.launch({ executablePath })
const context = await browser.newContext({
  viewport: VIEWPORT,
  deviceScaleFactor: SCALE,
  isMobile: true,
  hasTouch: true,
  locale: 'ar-EG',
  // Fixed so a re-run produces the same pictures rather than a diff full of
  // shifted dates.
  timezoneId: 'Africa/Cairo',
})
const page = await context.newPage()

// The first load only gets as far as onboarding — no profile exists yet — but
// it is what creates the database and fills the food table, which the seed then
// writes against.
await page.goto(baseUrl, { waitUntil: 'networkidle' })
await page.waitForTimeout(1500)

const seeded = await page.evaluate(seed)
console.log(`seeded: ${JSON.stringify(seeded)}`)
if (seeded.missingFoods > 0) throw new Error(`${seeded.missingFoods} seed foods not in the table`)

await mkdir(outDir, { recursive: true })

for (const { file, path } of SHOTS) {
  await page.goto(`${baseUrl}${path}`, { waitUntil: 'networkidle' })
  // Let the reveal animations and the chart layout settle — a screenshot taken
  // mid-transition catches everything at half opacity.
  await page.waitForTimeout(2000)
  const buffer = await page.screenshot({ type: 'png' })
  await writeFile(resolve(outDir, file), buffer)
  console.log(`wrote ${file}`)
}

await browser.close()

console.log(`\nmanifest sizes: ${VIEWPORT.width * SCALE}x${VIEWPORT.height * SCALE}`)

/** Runs in the page. Writes demo rows straight into IndexedDB. */
async function seed() {
  const uid = () => crypto.randomUUID()
  const day = 86_400_000
  const now = Date.now()
  // Local calendar day, matching the app's own `today()`. Slicing an ISO string
  // would give the UTC day and put the evening's meals on tomorrow's page.
  const iso = (offsetDays) => {
    const date = new Date(now - offsetDays * day)
    const pad = (value) => String(value).padStart(2, '0')
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
  }

  const db = await new Promise((res, rej) => {
    const request = indexedDB.open('eagle-gym')
    request.onsuccess = () => res(request.result)
    request.onerror = () => rej(request.error)
  })

  const all = (store) =>
    new Promise((res, rej) => {
      const request = db.transaction(store, 'readonly').objectStore(store).getAll()
      request.onsuccess = () => res(request.result)
      request.onerror = () => rej(request.error)
    })

  const put = (store, rows) =>
    new Promise((res, rej) => {
      const tx = db.transaction(store, 'readwrite')
      const os = tx.objectStore(store)
      for (const row of rows) os.put(row)
      tx.oncomplete = () => res(rows.length)
      tx.onerror = () => rej(tx.error)
    })

  // The app gates on having a profile — a fresh browser lands on onboarding —
  // so the demo one is written here rather than read back.
  const profileId = uid()
  await put('profiles', [
    {
      id: profileId,
      createdAt: now - 45 * day,
      name: 'أحمد',
      units: 'kg',
      sex: 'male',
      heightCm: 178,
      birthYear: 1997,
      activityLevel: 'moderate',
      nutritionGoal: 'cut',
      kcalTarget: 2400,
      proteinTarget: 170,
      carbsTarget: 240,
      fatTarget: 70,
      weeklyWorkoutTarget: 4,
      defaultRestSeconds: 90,
    },
  ])

  // Rep ranges on every movement — the point of the feature is that it is set
  // once here and inherited everywhere else.
  const ex = (nameAr, nameEn, muscleGroup, equipment, min, max, extra = {}) => ({
    id: uid(),
    profileId,
    nameAr,
    nameEn,
    muscleGroup,
    equipment,
    defaultRepsMin: min,
    defaultRepsMax: max,
    isCustom: 1,
    ...extra,
  })

  const bench = ex('بنش بريس', 'Bench Press', 'chest', 'barbell', 6, 10, { movement: 'push' })
  const squat = ex('سكوات', 'Back Squat', 'legs', 'barbell', 5, 8, { movement: 'legs' })
  const deadlift = ex('ديدليفت', 'Deadlift', 'back', 'barbell', 3, 5, { movement: 'pull' })
  const pullup = ex('عقلة', 'Pull-up', 'back', 'bodyweight', 6, 12, { movement: 'pull' })
  const ohp = ex('ضغط كتف بالبار', 'Overhead Press', 'shoulders', 'barbell', 8, 12, {
    movement: 'push',
  })
  const curl = ex('بايسبس بالبار', 'Barbell Curl', 'arms', 'barbell', 10, 15, { movement: 'pull' })
  const row = ex('تجديف بالبار', 'Barbell Row', 'back', 'barbell', 8, 12, { movement: 'pull' })
  const plank = ex('بلانك', 'Plank', 'core', 'bodyweight', 45, 60, { tracking: 'duration' })

  const exercises = [bench, squat, deadlift, pullup, ohp, curl, row, plank]
  await put('exercises', exercises)

  const item = (exercise, sets) => ({
    exerciseId: exercise.id,
    targetSets: sets,
    targetReps: exercise.defaultRepsMin,
    targetRepsMax: exercise.defaultRepsMax,
    restSeconds: 120,
  })

  const push = {
    id: uid(),
    profileId,
    nameAr: 'يوم الدفع',
    nameEn: 'Push Day',
    items: [item(bench, 4), item(ohp, 3), item(plank, 3)],
    createdAt: now - 40 * day,
  }
  const pull = {
    id: uid(),
    profileId,
    nameAr: 'يوم السحب',
    nameEn: 'Pull Day',
    items: [item(deadlift, 3), item(row, 4), item(pullup, 3), item(curl, 3)],
    createdAt: now - 40 * day,
  }
  const legs = {
    id: uid(),
    profileId,
    nameAr: 'يوم الرجل',
    nameEn: 'Leg Day',
    items: [item(squat, 5), item(plank, 3)],
    createdAt: now - 40 * day,
  }
  await put('routines', [push, pull, legs])

  // Six weeks of training, three days a week, with the bar creeping up — enough
  // for the volume chart to have a shape rather than a single dot.
  const sessions = []
  const sessionExercises = []
  const sets = []

  const plan = [push, pull, legs]
  let week = 0
  for (let offset = 40; offset >= 1; offset -= 3) {
    const routine = plan[week % plan.length]
    week += 1
    const startedAt = now - offset * day + 18 * 3600_000
    const session = {
      id: uid(),
      profileId,
      routineId: routine.id,
      titleAr: routine.nameAr,
      titleEn: routine.nameEn,
      startedAt,
      endedAt: startedAt + 68 * 60_000,
      status: 'done',
    }
    sessions.push(session)

    routine.items.forEach((entry, index) => {
      const exercise = exercises.find((candidate) => candidate.id === entry.exerciseId)
      const sessionExercise = {
        id: uid(),
        sessionId: session.id,
        exerciseId: entry.exerciseId,
        order: index,
        targetSets: entry.targetSets,
        targetReps: entry.targetReps,
        targetRepsMax: entry.targetRepsMax,
        restSeconds: entry.restSeconds,
      }
      sessionExercises.push(sessionExercise)

      // Heavier as the weeks pass, and lighter as the sets pile up within a
      // session — which is what actually happens.
      const base = { chest: 60, legs: 90, back: 80, shoulders: 35, arms: 25, core: 0 }[
        exercise.muscleGroup
      ]
      const progressed = base + Math.floor((40 - offset) / 7) * 2.5

      for (let n = 1; n <= entry.targetSets; n += 1) {
        // Start at the top of the range and slide down as fatigue accumulates,
        // never below the bottom of it.
        const reps = Math.max(
          entry.targetReps,
          (entry.targetRepsMax ?? entry.targetReps) - (n - 1)
        )
        sets.push({
          id: uid(),
          sessionExerciseId: sessionExercise.id,
          sessionId: session.id,
          profileId,
          exerciseId: entry.exerciseId,
          setNumber: n,
          weight: exercise.tracking === 'duration' ? 0 : progressed,
          reps: exercise.tracking === 'duration' ? 0 : reps,
          durationSeconds: exercise.tracking === 'duration' ? 45 + n * 5 : undefined,
          setType: 'working',
          done: 1,
          completedAt: startedAt + (index * 12 + n * 3) * 60_000,
        })
      }
    })
  }

  await put('sessions', sessions)
  await put('sessionExercises', sessionExercises)
  await put('sets', sets)

  // A slow cut: 84 kg down to about 80 over six weeks, weighed twice a week.
  const bodyStats = []
  for (let offset = 42; offset >= 0; offset -= 3) {
    bodyStats.push({
      id: uid(),
      profileId,
      date: iso(offset),
      weight: Math.round((84 - (42 - offset) * 0.09) * 10) / 10,
      bodyFat: Math.round((21 - (42 - offset) * 0.06) * 10) / 10,
      createdAt: now - offset * day,
    })
  }
  await put('bodyStats', bodyStats)

  // Today's food, taken from the shipped table so the numbers are the real ones.
  const foods = await all('foods')
  const byId = (id) => foods.find((food) => food.id === `food-${id}`)
  const scale = (food, grams) => ({
    kcal: Math.round((food.kcal * grams) / 100),
    protein: Math.round((food.protein * grams) / 10) / 10,
    carbs: Math.round((food.carbs * grams) / 10) / 10,
    fat: Math.round((food.fat * grams) / 10) / 10,
  })

  const meals = [
    ['foul-medames', 200, 'breakfast'],
    ['eish-baladi', 90, 'breakfast'],
    ['beid-maslou2', 110, 'breakfast'],
    ['sedr-firakh', 200, 'lunch'],
    ['roz-abyad', 200, 'lunch'],
    ['salata-baladi', 150, 'lunch'],
    ['zabadi', 170, 'snack'],
    ['mooz', 120, 'snack'],
  ]

  const entries = []
  for (const [id, grams, slot] of meals) {
    const food = byId(id)
    if (!food) continue
    entries.push({
      id: uid(),
      profileId,
      date: iso(0),
      slot,
      foodId: food.id,
      nameAr: food.nameAr,
      nameEn: food.nameEn,
      grams,
      ...scale(food, grams),
      createdAt: now,
    })
  }
  await put('mealEntries', entries)

  return {
    exercises: exercises.length,
    sessions: sessions.length,
    sets: sets.length,
    bodyStats: bodyStats.length,
    meals: entries.length,
    missingFoods: meals.length - entries.length,
  }
}
