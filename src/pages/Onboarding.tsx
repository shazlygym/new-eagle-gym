import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import SegmentedControl from '../components/SegmentedControl'
import { createProfile } from '../db/repository'
import type { Locale, Units } from '../db/schema'
import { useT } from '../i18n'
import { unlockAudio } from '../lib/audio'
import { useActiveProfile } from '../lib/useActiveProfile'
import { useAppStore } from '../stores/appStore'

export default function Onboarding() {
  const { t } = useT()
  const navigate = useNavigate()
  const { profiles } = useActiveProfile()
  const locale = useAppStore((state) => state.locale)
  const setLocale = useAppStore((state) => state.setLocale)
  const setActiveProfileId = useAppStore((state) => state.setActiveProfileId)

  const [name, setName] = useState('')
  const [membershipNumber, setMembershipNumber] = useState('')
  const [units, setUnits] = useState<Units>('kg')
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  // Reachable from Settings → Add profile as well as on first launch.
  const isFirstRun = profiles.length === 0

  const submit = async () => {
    if (!name.trim()) {
      setError(t('onboarding.nameRequired'))
      return
    }

    setSaving(true)
    // This runs inside a tap handler, which is the only moment iOS lets us
    // create a usable AudioContext for the rest timer later on.
    unlockAudio()

    const profile = await createProfile({ name, membershipNumber, units })
    setActiveProfileId(profile.id)
    navigate('/', { replace: true })
  }

  return (
    <div className="flex min-h-dvh flex-col bg-dark-900 px-6 pb-10 pt-safe-t">
      <div className="flex flex-1 flex-col justify-center py-10">
        <img
          src="/icons/icon-192.png"
          alt=""
          className="mb-6 h-20 w-20 self-center rounded-2xl shadow-gold"
        />

        <h1 className="text-center text-2xl font-bold text-dark-50">{t('onboarding.welcome')}</h1>
        <p className="mx-auto mt-3 max-w-sm text-center text-sm leading-relaxed text-dark-200">
          {t('onboarding.intro')}
        </p>

        <div className="mt-8 space-y-5">
          <div>
            <label className="mb-1.5 block text-xs font-medium text-dark-200" htmlFor="name">
              {t('onboarding.name')}
            </label>
            <input
              id="name"
              value={name}
              onChange={(event) => {
                setName(event.target.value)
                setError(null)
              }}
              placeholder={t('onboarding.namePlaceholder')}
              autoComplete="given-name"
              enterKeyHint="done"
              className="field"
            />
            {error && <p className="mt-1.5 text-xs text-red-400">{error}</p>}
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium text-dark-200" htmlFor="membership">
              {t('onboarding.membership')}{' '}
              <span className="text-dark-300">({t('common.optional')})</span>
            </label>
            <input
              id="membership"
              value={membershipNumber}
              onChange={(event) => setMembershipNumber(event.target.value)}
              placeholder={t('onboarding.membershipPlaceholder')}
              inputMode="numeric"
              enterKeyHint="done"
              className="field"
            />
          </div>

          <div>
            <span className="mb-1.5 block text-xs font-medium text-dark-200">
              {t('onboarding.language')}
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
            <span className="mb-1.5 block text-xs font-medium text-dark-200">
              {t('onboarding.units')}
            </span>
            <SegmentedControl<Units>
              value={units}
              onChange={setUnits}
              options={[
                { value: 'kg', label: 'kg' },
                { value: 'lb', label: 'lb' },
              ]}
            />
          </div>
        </div>
      </div>

      <div className="space-y-3">
        <button type="button" onClick={submit} disabled={saving} className="btn-primary w-full">
          {t('onboarding.start')}
        </button>
        {!isFirstRun && (
          <button type="button" onClick={() => navigate(-1)} className="btn-ghost w-full">
            {t('common.cancel')}
          </button>
        )}
      </div>
    </div>
  )
}
