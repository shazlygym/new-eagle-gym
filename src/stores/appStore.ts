import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Locale } from '../db/schema'

// Device-level preferences. These live in localStorage rather than IndexedDB
// because they're needed synchronously on first paint — waiting on an async DB
// read would flash the wrong language and direction.

interface AppState {
  locale: Locale
  activeProfileId: string | null
  installHintDismissed: boolean
  /** When the user last exported a backup from this device. Null = never. */
  lastBackupAt: number | null
  /** Set when the backup nudge is dismissed, so it stays quiet for a while. */
  backupNudgeSnoozedAt: number | null
  setLocale: (locale: Locale) => void
  setActiveProfileId: (id: string | null) => void
  dismissInstallHint: () => void
  markBackupDone: () => void
  snoozeBackupNudge: () => void
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      locale: 'ar',
      activeProfileId: null,
      installHintDismissed: false,
      lastBackupAt: null,
      backupNudgeSnoozedAt: null,
      setLocale: (locale) => set({ locale }),
      setActiveProfileId: (activeProfileId) => set({ activeProfileId }),
      dismissInstallHint: () => set({ installHintDismissed: true }),
      markBackupDone: () => set({ lastBackupAt: Date.now(), backupNudgeSnoozedAt: null }),
      snoozeBackupNudge: () => set({ backupNudgeSnoozedAt: Date.now() }),
    }),
    { name: 'eagle-gym-prefs' }
  )
)

/** Keeps <html lang/dir> in step with the chosen locale. */
export function applyLocaleToDocument(locale: Locale): void {
  document.documentElement.lang = locale
  document.documentElement.dir = locale === 'ar' ? 'rtl' : 'ltr'
}
