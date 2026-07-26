import { useLiveQuery } from 'dexie-react-hooks'
import { useEffect } from 'react'
import { listProfiles } from '../db/repository'
import type { Profile, Units } from '../db/schema'
import { useAppStore } from '../stores/appStore'

interface ActiveProfile {
  profile: Profile | undefined
  profiles: Profile[]
  /** True until the profile list has been read once. */
  loading: boolean
  /** Convenience: the display unit, defaulted so callers needn't null-check. */
  units: Units
}

export function useActiveProfile(): ActiveProfile {
  const activeProfileId = useAppStore((state) => state.activeProfileId)
  const setActiveProfileId = useAppStore((state) => state.setActiveProfileId)

  const profiles = useLiveQuery(() => listProfiles(), [])
  const profile = profiles?.find((p) => p.id === activeProfileId)

  useEffect(() => {
    if (!profiles || profiles.length === 0) return
    // Falls back to the first profile if the stored id is stale — which happens
    // after a profile is deleted, or after importing a backup from another phone.
    if (!profiles.some((p) => p.id === activeProfileId)) {
      setActiveProfileId(profiles[0].id)
    }
  }, [profiles, activeProfileId, setActiveProfileId])

  return {
    profile,
    profiles: profiles ?? [],
    loading: profiles === undefined,
    units: profile?.units ?? 'kg',
  }
}
