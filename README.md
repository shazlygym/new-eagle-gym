# Eagle Gym — Workout Tracker

An offline-first workout tracker, built as a PWA and designed for the iOS Home
Screen. Members log sets at the rack; everything is stored on the phone.

Arabic (RTL) and English, switchable at runtime.

## What it does

- **Log workouts** — start empty or from a routine, log weight × reps per set,
  mark warm-ups, add notes. Rest timer starts automatically when you tick a set.
- **Routines** — saved exercise lists with target sets/reps/rest, startable in one
  tap. Three starter routines (Push / Pull / Legs) are created with each profile.
- **Exercise library** — ~70 bilingual built-in exercises across eight muscle
  groups, plus your own custom ones (addable mid-workout).
- **History** — month calendar of trained days and a full session log.
- **Progress** — weekly tonnage, estimated 1RM per exercise, personal records.
- **Body** — weight, body fat and circumference measurements with a trend chart.
- **Backup** — export/import the whole database as JSON.

## Architecture

No backend. The app is a static bundle plus a service worker; all data lives in
IndexedDB on the device.

```
src/
  db/          Dexie schema, repository (all reads/writes), derived queries, seed data
  i18n/        ar/en dictionaries + useT hook
  lib/         formatting, rest timer, audio, active-profile hook
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

Any static host. `Dockerfile` builds the bundle and serves `dist/` with nginx;
`nginx.conf` sets SPA fallback, `no-cache` on `index.html`/`sw.js` so updates
land, and long-lived immutable caching for hashed assets.

**HTTPS is required** — service workers and Add to Home Screen do not work over
plain HTTP (localhost excepted).

Install on iPhone: open the site in Safari → Share → *Add to Home Screen*.
