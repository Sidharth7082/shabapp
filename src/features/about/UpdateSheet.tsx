import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Sheet } from '@/components/ui/Sheet'
import { Badge, Card } from '@/components/ui/display'
import { LogoMark } from '@/components/ui/LogoMark'
import { CheckIcon, SparkIcon } from '@/components/ui/icons'
import { APP_NAME } from '@/version'
import { openUpdateDownload, type UpdateManifest } from '@/services/updates'

/**
 * Shown on launch when the published manifest is newer than the installed
 * build, and from About → Check for updates. "Download update" opens the APK
 * in a Custom Tab; "Not now" remembers the version so it does not nag again
 * until the next release.
 */
export function UpdateSheet({
  manifest,
  currentVersion,
  onClose,
  onDismiss
}: {
  manifest: UpdateManifest
  currentVersion: string
  onClose: () => void
  onDismiss: () => void
}) {
  const [busy, setBusy] = useState(false)
  const notes = manifest.notes?.filter(Boolean) ?? []

  const download = async () => {
    setBusy(true)
    try {
      await openUpdateDownload(manifest)
    } finally {
      setBusy(false)
    }
  }

  return (
    <Sheet
      open
      onClose={onClose}
      title="New version available"
      subtitle={`${APP_NAME} · stable v${manifest.version}`}
      footer={
        <div className="space-y-1.5">
          <Button full size="lg" onClick={() => void download()} disabled={busy}>
            {busy ? 'Opening download…' : 'Download update'}
          </Button>
          <button
            type="button"
            onClick={onDismiss}
            className="w-full rounded-xl py-2.5 text-[13px] font-bold text-ink-mute"
          >
            Not now
          </button>
        </div>
      }
    >
      <div className="space-y-3">
        <Card className="relative overflow-hidden border-0 bg-gradient-to-br from-brand-700 via-brand-600 to-brand-500 p-4 text-white">
          <span className="pointer-events-none absolute -right-10 -top-12 h-32 w-32 rounded-full bg-white/10" />
          <div className="relative flex items-center gap-3">
            <LogoMark size={44} />
            <div className="min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-widest text-white/70">
                Update ready
              </p>
              <p className="text-[18px] font-extrabold leading-tight">Version {manifest.version}</p>
              <p className="text-[11px] text-white/80">You are on v{currentVersion}</p>
            </div>
            {manifest.channel && (
              <span className="ml-auto rounded-full bg-white/15 px-2 py-0.5 text-[10px] font-bold">
                {manifest.channel}
              </span>
            )}
          </div>
        </Card>

        {notes.length > 0 && (
          <div>
            <div className="flex items-center gap-1.5">
              <SparkIcon size={14} className="text-brand-600" />
              <h3 className="text-[13px] font-bold text-ink">What’s new</h3>
            </div>
            <ul className="mt-2 space-y-2">
              {notes.map((note) => (
                <li key={note} className="flex gap-2 text-[12px] leading-5 text-ink-soft">
                  <CheckIcon size={13} className="mt-0.5 shrink-0 text-brand-500" />
                  <span>{note}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        <Card className="bg-surface-sunken p-3">
          <p className="text-[11px] leading-5 text-ink-mute">
            Install the new APK over the current app. Jobs, photos and settings stay on this
            device; only the app files are replaced.
          </p>
        </Card>

        <div className="flex items-center justify-between">
          <Badge tone="ok">Free update</Badge>
          <span className="text-[10px] font-semibold text-ink-mute">
            {manifest.releasedAt
              ? new Date(manifest.releasedAt).toLocaleDateString('en-IN', {
                  day: '2-digit',
                  month: 'short',
                  year: 'numeric'
                })
              : 'New release'}
          </span>
        </div>
      </div>
    </Sheet>
  )
}
