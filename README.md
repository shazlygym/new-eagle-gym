# Eagle Gym — Workout Tracker

An offline-first workout tracker, built as a PWA and designed for the iOS Home
Screen. Members log sets at the rack; everything is stored on the phone.

Arabic (RTL) and English, switchable at runtime.

## What it does

**Logging**
- Start empty, from a routine, from a program, or by repeating your last workout.
- Per-set types: working, warm-up, drop set, to failure. Only warm-ups are
  excluded from volume and records.
- Auto-generated warm-up ramp to your working weight.
- Supersets — link exercises so rest is taken once at the end of the group.
- Optional RPE (reps in reserve) column.
- Plate calculator: what to load per side, seeded from the set you're on.
- Rest timer that survives the phone being pocketed, plus a live workout
  stopwatch in the header.
- Time-tracked exercises (planks, carries, cardio) get a start/stop timer
  instead of a reps field; stopping it logs the set.
- Tap any exercise mid-workout to see every past session for it.

**Planning**
- **Routines** — saved exercise lists with target sets/reps/rest.
- **Programs** — multi-week blocks that schedule routines across training days,
  track which week you're in, show the next day on Home, and report adherence.
- **Progression suggestions** — double progression: hold the weight until every
  working set hits the target, then add the smallest jump. Two stalled sessions
  in a row suggests a deload instead.

**Review**
- History with a month calendar; past workouts are fully editable.
- Progress: weekly tonnage, estimated 1RM per exercise, personal records,
  volume by muscle group, push/pull/legs balance, acute:chronic training load,
  a record timeline, and a four-week period comparison.
- Body weight, body fat and circumference measurements with a trend chart.
- Export/import the whole database as JSON.

## Architecture

No backend. The app is a static bundle plus a service worker; all data lives in
IndexedDB on the device.

Navigation: **Home · Train · History · Progress · Settings**, where Train is the
hub for programs, routines and the exercise library.

```
src/
  db/          Dexie schema, repository (all reads/writes), derived queries, seed data
  i18n/        ar/en dictionaries + useT hook
  lib/         formatting, rest timer, audio, plate maths, warm-up ramp,
               progression rules, set types, search normalisation
  components/  shared UI
  pages/       one file per screen
```

Two rules keep it maintainable:

- **Nothing outside `src/db/` imports Dexie.** Every read and write goes through
  `repository.ts`, so swapping in a server-backed store later means rewriting one
  module rather than every screen.
- **Derived numbers are computed, never stored.** PRs, tonnage and streaks are
  pure functions over the set log (`db/queries.ts`), so they can't drift out of
  sync with the sets they describe after an edit, delete or import.

Weights are always stored in **kilograms** and measurements in **centimetres**;
the kg/lb setting is display-only. Otherwise toggling units would rewrite history.

Timed work is measured in `durationSeconds` and never in reps. Tonnage skips
those sets entirely: a 60-second weighted carry has no rep count, and inventing
one turns a single carry into thousands of phantom kilograms.

All clocks — rest timer, workout stopwatch, exercise timer — store the instant
they started or end, never a counter. iOS suspends JavaScript the moment the app
is backgrounded, so a ticking counter freezes in your pocket and lies.

The schema is versioned. v2 added programs, superset grouping and set types,
migrating existing `isWarmup` flags in place — an install with months of logged
training upgrades without losing a set. Backups carry a version too, and a v1
file is brought forward on import.

### "Multi-user" without a server

Each member installs the app on their own phone. Profiles are local — several can
exist on one device (useful if a phone is shared) and all data is namespaced by
profile id. There is no login, no sync, and the trainer cannot see member logs.
Moving data between devices is done with **Settings → Export backup**.

### iOS specifics

These aren't polish; the app is wrong without them:

- `apple-mobile-web-app-capable` + a 180×180 opaque `apple-touch-icon` — iOS
  ignores the manifest icons and, without the meta tag, opens in Safari chrome.
- `viewport-fit=cover` plus `env(safe-area-inset-*)` padding on the header and
  tab bar.
- **The rest timer stores an end timestamp, not a countdown.** iOS suspends
  JavaScript when the app is backgrounded — which is what happens when you pocket
  the phone between sets — so an interval-based counter would silently stall.
- `navigator.vibrate` doesn't exist in Safari, so the timer cue is audio + visual.
  The `AudioContext` is unlocked on the first tap, the only moment iOS allows it.
- All inputs are 16px, so focusing one never zooms the viewport.
- `navigator.storage.persist()` is requested on first run, and Settings shows
  whether it was granted. Safari can still evict IndexedDB — hence export.

## Development

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # tsc + vite build → dist/
npm run preview    # serve the production build
npm run icons      # regenerate app icons from scripts/icon-source.mjs
```

The service worker only runs in a production build — use `preview` to test
offline behaviour and install prompts.

## Deployment

**HTTPS is required.** Service workers — and therefore offline support and a
real Home Screen install — do not work over plain HTTP (localhost excepted).

### Vercel

`vercel.json` carries the build settings, the SPA rewrite and the cache headers,
so importing the repo is the whole setup.

1. Import `shazlygym/new-eagle-gym` at vercel.com → *Add New → Project*.
2. Deploy. Everything is read from `vercel.json` — no fields to fill in.
3. You get an HTTPS URL such as `new-eagle-gym.vercel.app`.

### Netlify / Cloudflare Pages

`netlify.toml` is the equivalent config; both hosts read it. Import the repo the
same way.

### Why the cache headers matter

Without `no-cache` on `sw.js` and `index.html`, a CDN keeps serving the old
service worker and a deployed update stays invisible on a phone that already has
the app installed. Everything under `/assets/` is content-hashed by Vite — the
filename changes whenever the bytes do — so it is pinned for a year instead.

### Docker / your own server

`Dockerfile` builds the bundle and serves `dist/` with nginx; `nginx.conf` sets
the SPA fallback and the same cache rules. Put it behind a TLS terminator.

### Install on the iPhone

Open the HTTPS URL in **Safari** (not Chrome — only Safari can install to the
Home Screen on iOS) → Share → **Add to Home Screen**.

Data lives on the device it was logged on. Moving to a new phone means
**Settings → Export backup** on the old one and importing on the new one.
