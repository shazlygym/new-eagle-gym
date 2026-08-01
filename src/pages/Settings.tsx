import { useLiveQuery } from 'dexie-react-hooks'
import {
  Check,
  Download,
  HardDrive,
  ShieldCheck,
  ShieldAlert,
  Trash2,
  Upload,
  UserPlus,
} from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import ConfirmDialog from '../components/ConfirmDialog'
import PageHeader from '../components/PageHeader'
import SegmentedControl from '../components/SegmentedControl'
import Sheet from '../components/Sheet'
import {
  clearProfileData,
  deleteProfile,
  exportBackup,
  importBackup,
  listProfiles,
  parseBackup,
  updateProfile,
  type Backup,
} from '../db/repository'
import type { Locale, Units } from '../db/schema'
import { useT } from '../i18n'
import { formatBytes, formatTimeAgo } from '../lib/format'
import { useActiveProfile } from '../lib/useActiveProfile'
import { useAppStore } from '../stores/appStore'

export default function Settings() {
  const { t } = useT()
  const { profile } = useActiveProfile()
  const locale = useAppStore((state) => state.locale)
  const setLocale = useAppStore((state) => state.setLocale)
  const setActiveProfileId = useAppStore((state) => state.setActiveProfileId)
  const lastBackupAt = useAppStore((state) => state.lastBackupAt)
  const markBackupDone = useAppStore((state) => state.markBackupDone)

  const fileInput = useRef<HTMLInputElement>(null)
  const [pendingImport, setPendingImport] = useState<Backup | null>(null)
  const [toast, setToast] = useState<string | null>(null)
  const [confirmClear, setConfirmClear] = useState(false)
  const [confirmDeleteProfile, setConfirmDeleteProfile] = useState(false)
  const [storage, setStorage] = useState<{ usage: number; persisted: boolean } | null>(null)

  const profiles = useLiveQuery(() => listProfiles(), []) ?? []

  useEffect(() => {
    void (async () => {
      const estimate = await navigator.storage?.estimate?.()
      const persisted = (await navigator.storage?.persisted?.()) ?? false
      setStorage({ usage: estimate?.usage ?? 0, persisted })
    })()
  }, [])

  useEffect(() => {
    if (!toast) return
    const timeout = window.setTimeout(() => setToast(null), 2600)
    return () => window.clearTimeout(timeout)
  }, [toast])

  if (!profile) return null

  const runExport = async () => {
    const backup = await exportBackup()
    const json = JSON.stringify(backup, null, 2)
    const filename = `workout-backup-${backup.exportedAt.slice(0, 10)}.json`
    const file = new File([json], filename, { type: 'application/json' })

    // iOS Safari ignores the download attribute — the Share sheet is the only
    // route that actually lets the user keep the file (Files, AirDrop, mail).
    if (navigator.canShare?.({ files: [file] })) {
      try {
        await navigator.share({ files: [file], title: filename })
        markBackupDone()
        return
      } catch {
        // Cancelled or unsupported at runtime — fall through to the link.
      }
    }

    const url = URL.createObjectURL(file)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = filename
    anchor.click()
    URL.revokeObjectURL(url)
    markBackupDone()
  }

  const onFileChosen = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = '' // let the same file be re-picked later
    if (!file) return

    try {
      setPendingImport(parseBackup(await file.text()))
    } catch (error) {
      // A file from a future app version is a different problem than a file
      // that isn't ours — tell the user which one they have.
      setToast(
        error instanceof Error && error.message === 'unsupported-version'
          ? t('settings.importUnsupported')
          : t('settings.importFailed')
      )
    }
  }

  const applyImport = async (mode: 'replace' | 'merge') => {
    if (!pendingImport) return
    await importBackup(pendingImport, mode)
    setPendingImport(null)
    // The imported profiles may not include the currently selected one.
    setActiveProfileId(pendingImport.profiles[0]?.id ?? null)
    setToast(t('settings.importDone'))
  }

  return (
    <div>
      <PageHeader title={t('settings.title')} large />

      <div className="space-y-6 px-4 py-4">
        <Section title={t('settings.profile')}>
          <div className="card space-y-4 p-4">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-ink-200" htmlFor="p-name">
                {t('settings.profileName')}
              </label>
              <input
                id="p-name"
                defaultValue={profile.name}
                // On change, not on blur: these fields have no Save button, so
                // blur is the only commit point — and blur never fires when the
                // field is unmounted by a tab tap, which loses the edit.
                onChange={(event) =>
                  event.target.value.trim() &&
                  updateProfile(profile.id, { name: event.target.value.trim() })
                }
                className="field"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-medium text-ink-200" htmlFor="p-member">
                {t('settings.membership')}
              </label>
              <input
                id="p-member"
                defaultValue={profile.membershipNumber ?? ''}
                inputMode="numeric"
                onChange={(event) =>
                  updateProfile(profile.id, {
                    membershipNumber: event.target.value.trim() || undefined,
                  })
                }
                className="field"
              />
            </div>

            <div>
              <span className="mb-1.5 block text-xs font-medium text-ink-200">
                {t('settings.units')}
              </span>
              <SegmentedControl<Units>
                value={profile.units}
                onChange={(units) => updateProfile(profile.id, { units })}
                options={[
                  { value: 'kg', label: 'kg' },
                  { value: 'lb', label: 'lb' },
                ]}
              />
            </div>

            <div>
              <span className="mb-1.5 block text-xs font-medium text-ink-200">
                {t('settings.language')}
              </span>
              <SegmentedControl<Locale>
                value={locale}
                onChange={setLocale}
                options={[
                  { value: 'ar', label: 'العربية' },
                  { value: 'en', label: 'English' },
                ]}
              />
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-medium text-ink-200" htmlFor="p-goal">
                {t('settings.weeklyTarget')}
              </label>
              <input
                id="p-goal"
                type="number"
                inputMode="numeric"
                min={0}
                max={14}
                defaultValue={profile.weeklyWorkoutTarget ?? ''}
                onChange={(event) => {
                  const value = Math.max(0, Math.min(14, Math.round(Number(event.target.value))))
                  updateProfile(profile.id, {
                    weeklyWorkoutTarget: value > 0 ? value : undefined,
                  })
                }}
                className="field"
              />
              <p className="mt-1.5 text-xs leading-relaxed text-ink-300">
                {t('settings.weeklyTargetHint')}
              </p>
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-medium text-ink-200" htmlFor="p-rest">
                {t('settings.defaultRest')}
              </label>
              <input
                id="p-rest"
                type="number"
                inputMode="numeric"
                min={0}
                max={600}
                step={15}
                defaultValue={profile.defaultRestSeconds ?? 90}
                onChange={(event) => {
                  const value = Math.max(0, Math.min(600, Math.round(Number(event.target.value))))
                  updateProfile(profile.id, { defaultRestSeconds: value })
                }}
                className="field"
              />
              <p className="mt-1.5 text-xs leading-relaxed text-ink-300">
                {t('settings.defaultRestHint')}
              </p>
            </div>

            <label className="flex cursor-pointer items-start gap-3 pt-1">
              <input
                type="checkbox"
                checked={profile.trackRpe === 1}
                onChange={(event) =>
                  updateProfile(profile.id, { trackRpe: event.target.checked ? 1 : 0 })
                }
                className="mt-0.5 h-5 w-5 shrink-0 accent-brand-500"
              />
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-medium text-ink-50">
                  {t('settings.trackRpe')}
                </span>
                <span className="mt-0.5 block text-xs leading-relaxed text-ink-300">
                  {t('settings.trackRpeHint')}
                </span>
              </span>
            </label>
          </div>
        </Section>

        {profiles.length > 1 && (
          <Section title={t('settings.switchProfile')} hint={t('settings.profilesHint')}>
            <ul className="space-y-1.5">
              {profiles.map((entry) => (
                <li key={entry.id}>
                  <button
                    type="button"
                    onClick={() => setActiveProfileId(entry.id)}
                    className="card flex w-full items-center gap-3 p-4 text-start active:bg-ink-600"
                  >
                    <span className="min-w-0 flex-1 truncate text-sm font-medium text-ink-50">
                      {entry.name}
                    </span>
                    {entry.id === profile.id && (
                      <Check size={18} className="shrink-0 text-brand-500" />
                    )}
                  </button>
                </li>
              ))}
            </ul>
          </Section>
        )}

        <Section title={t('settings.data')} hint={t('settings.dataHint')}>
          <div className="space-y-1.5">
            <Link
              to="/onboarding"
              className="card flex items-center gap-3 p-4 text-sm font-medium text-ink-50 active:bg-ink-600"
            >
              <UserPlus size={18} className="shrink-0 text-brand-500" />
              {t('settings.newProfile')}
            </Link>

            <button type="button" onClick={runExport} className="card flex w-full items-center gap-3 p-4 text-start text-sm font-medium text-ink-50 active:bg-ink-600">
              <Download size={18} className="shrink-0 text-brand-500" />
              <span className="min-w-0 flex-1">
                {t('settings.export')}
                <span className="mt-0.5 block text-xs font-normal text-ink-300">
                  {lastBackupAt
                    ? t('settings.lastBackup', { time: formatTimeAgo(lastBackupAt, locale) })
                    : t('settings.lastBackupNever')}
                </span>
              </span>
            </button>

            <button
              type="button"
              onClick={() => fileInput.current?.click()}
              className="card flex w-full items-center gap-3 p-4 text-start text-sm font-medium text-ink-50 active:bg-ink-600"
            >
              <Upload size={18} className="shrink-0 text-brand-500" />
              {t('settings.import')}
            </button>
            <input
              ref={fileInput}
              type="file"
              accept="application/json,.json"
              onChange={onFileChosen}
              className="hidden"
            />

            {storage && (
              <div className="card space-y-2 p-4 text-sm">
                <div className="flex items-center gap-3 text-ink-100">
                  <HardDrive size={18} className="shrink-0 text-ink-300" />
                  <span className="flex-1">{t('settings.storage')}</span>
                  <span className="tabular text-ink-200">{formatBytes(storage.usage)}</span>
                </div>
                <div
                  className={`flex items-center gap-3 text-xs ${
                    storage.persisted ? 'text-green-400' : 'text-amber-400'
                  }`}
                >
                  {storage.persisted ? (
                    <ShieldCheck size={16} className="shrink-0" />
                  ) : (
                    <ShieldAlert size={16} className="shrink-0" />
                  )}
                  <span>
                    {storage.persisted ? t('settings.persisted') : t('settings.notPersisted')}
                  </span>
                </div>
              </div>
            )}

            <button
              type="button"
              onClick={() => setConfirmClear(true)}
              className="card flex w-full items-center gap-3 p-4 text-start text-sm font-medium text-red-400 active:bg-ink-600"
            >
              <Trash2 size={18} className="shrink-0" />
              {t('settings.clearData')}
            </button>

            {profiles.length > 1 && (
              <button
                type="button"
                onClick={() => setConfirmDeleteProfile(true)}
                className="card flex w-full items-center gap-3 p-4 text-start text-sm font-medium text-red-400 active:bg-ink-600"
              >
                <Trash2 size={18} className="shrink-0" />
                {t('settings.deleteProfile')}
              </button>
            )}
          </div>
        </Section>

        <Section title={t('settings.about')}>
          <div className="card space-y-1 p-4 text-sm text-ink-200">
            <p className="font-semibold text-ink-50">{t('app.name')}</p>
            <p className="text-xs">{t('app.tagline')}</p>
            <p className="text-xs text-ink-300">
              {t('settings.version')} 1.0.0 · {t('settings.offlineReady')}
            </p>
          </div>
        </Section>
      </div>

      {toast && (
        <div className="fixed inset-x-4 bottom-24 z-50 animate-fade-in rounded-xl bg-ink-600 px-4 py-3 text-center text-sm text-ink-50 shadow-xl">
          {toast}
        </div>
      )}

      <Sheet
        open={pendingImport !== null}
        onClose={() => setPendingImport(null)}
        title={t('settings.import')}
      >
        <p className="mb-4 text-sm text-ink-200">{t('settings.importPrompt')}</p>
        <div className="space-y-2">
          <button type="button" onClick={() => applyImport('merge')} className="btn-primary w-full">
            {t('settings.importMerge')}
          </button>
          <button type="button" onClick={() => applyImport('replace')} className="btn-ghost w-full">
            {t('settings.importReplace')}
          </button>
        </div>
      </Sheet>

      <ConfirmDialog
        open={confirmClear}
        title={t('settings.clearDataConfirm')}
        body={t('common.confirmDelete')}
        confirmLabel={t('common.delete')}
        destructive
        onCancel={() => setConfirmClear(false)}
        onConfirm={async () => {
          setConfirmClear(false)
          await clearProfileData(profile.id)
        }}
      />

      <ConfirmDialog
        open={confirmDeleteProfile}
        title={t('settings.deleteProfileConfirm')}
        body={t('common.confirmDelete')}
        confirmLabel={t('common.delete')}
        destructive
        onCancel={() => setConfirmDeleteProfile(false)}
        onConfirm={async () => {
          setConfirmDeleteProfile(false)
          await deleteProfile(profile.id)
          setActiveProfileId(null)
        }}
      />
    </div>
  )
}

function Section({
  title,
  hint,
  children,
}: {
  title: string
  hint?: string
  children: React.ReactNode
}) {
  return (
    <section>
      <h2 className="section-title mb-2 px-1">{title}</h2>
      {hint && <p className="mb-2 px-1 text-xs leading-relaxed text-ink-300">{hint}</p>}
      {children}
    </section>
  )
}
