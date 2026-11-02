import { useEffect, useState } from 'react'
import { APP_VERSION } from '@/version'
import {
  checkForUpdates,
  dismissedUpdateVersion,
  dismissUpdate,
  type UpdateManifest
} from '@/services/updates'
import { UpdateSheet } from './UpdateSheet'

/**
 * App-level update check that runs on every launch. If the public manifest is
 * newer than this build, the update sheet opens without any prompt from the
 * user. "Not now" silences that version only.
 */
export function UpdatePrompt() {
  const [manifest, setManifest] = useState<UpdateManifest | null>(null)

  useEffect(() => {
    let cancelled = false

    const run = async () => {
      const result = await checkForUpdates()
      if (cancelled || !result.ok || !result.available) return
      const dismissed = await dismissedUpdateVersion()
      if (dismissed === result.manifest.version) return
      if (!cancelled) setManifest(result.manifest)
    }

    // Delay the network check so first paint and the job board stay snappy.
    const initial = window.setTimeout(() => void run(), 1500)

    // Long-lived app sessions pick the update up when the user comes back.
    let lastCheck = Date.now()
    const onVisible = () => {
      if (document.visibilityState !== 'visible') return
      if (Date.now() - lastCheck < 15 * 60_000) return
      lastCheck = Date.now()
      void run()
    }
    document.addEventListener('visibilitychange', onVisible)

    return () => {
      cancelled = true
      window.clearTimeout(initial)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [])

  if (!manifest) return null

  return (
    <UpdateSheet
      manifest={manifest}
      currentVersion={APP_VERSION}
      onClose={() => setManifest(null)}
      onDismiss={() => {
        void dismissUpdate(manifest.version)
        setManifest(null)
      }}
    />
  )
}
