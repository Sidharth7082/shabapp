import { useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { Badge, Card } from '@/components/ui/display'
import { Sheet } from '@/components/ui/Sheet'
import {
  ArrowLeftIcon,
  CameraIcon,
  CheckIcon,
  ChevronRightIcon,
  SettingsIcon,
  ShieldIcon,
  SparkIcon
} from '@/components/ui/icons'
import { openExternal } from '@/lib/openExternal'
import { checkForUpdates, type UpdateManifest } from '@/services/updates'
import {
  APP_BUILT_AT,
  APP_NAME,
  APP_VERSION,
  COMPANY_NAME,
  RELEASE_NOTES,
  THIRD_PARTY_NOTICES,
  WEBSITE_URL
} from '@/version'
import { UpdateSheet } from './UpdateSheet'

type CheckState =
  | { kind: 'idle' }
  | { kind: 'checking' }
  | { kind: 'latest'; version: string }
  | { kind: 'available'; manifest: UpdateManifest }
  | { kind: 'error'; message: string }

type InfoSheet = 'notes' | 'privacy' | 'notices' | null

function Row({
  icon,
  title,
  subtitle,
  trailing,
  onClick
}: {
  icon: ReactNode
  title: string
  subtitle?: string
  trailing?: ReactNode
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-3 py-3 text-left transition active:opacity-70"
    >
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-surface-sunken text-brand-600">
        {icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[13px] font-bold text-ink">{title}</span>
        {subtitle && (
          <span className="mt-0.5 block text-[11px] leading-4 text-ink-mute">{subtitle}</span>
        )}
      </span>
      {trailing}
    </button>
  )
}

export function AboutScreen() {
  const [check, setCheck] = useState<CheckState>({ kind: 'idle' })
  const [update, setUpdate] = useState<UpdateManifest | null>(null)
  const [info, setInfo] = useState<InfoSheet>(null)

  const runCheck = async () => {
    setCheck({ kind: 'checking' })
    const result = await checkForUpdates()
    if (!result.ok) {
      setCheck({ kind: 'error', message: result.error })
      return
    }
    if (result.available) {
      setCheck({ kind: 'available', manifest: result.manifest })
      setUpdate(result.manifest)
      return
    }
    setCheck({ kind: 'latest', version: result.manifest.version })
  }

  const checkSubtitle =
    check.kind === 'checking'
      ? 'Checking the release channel…'
      : check.kind === 'available'
        ? `v${check.manifest.version} is ready to download`
        : check.kind === 'latest'
          ? `You are on the latest version (v${check.version})`
          : check.kind === 'error'
            ? check.message
            : 'Get the newest build of the app'

  const checkTrailing =
    check.kind === 'available' ? (
      <Badge tone="warn">Update</Badge>
    ) : check.kind === 'latest' ? (
      <Badge tone="ok">Latest</Badge>
    ) : check.kind === 'error' ? (
      <span className="text-[11px] font-bold text-danger">Retry</span>
    ) : (
      <ChevronRightIcon size={16} className="text-ink-mute" />
    )

  return (
    <div className="space-y-4 px-4 pb-8 pt-4">
      <div className="flex items-center gap-3">
        <Link
          to="/settings"
          className="flex h-10 w-10 items-center justify-center rounded-xl border border-surface-line bg-white text-ink-soft shadow-card"
          aria-label="Back to settings"
        >
          <ArrowLeftIcon size={18} />
        </Link>
        <h1 className="text-[20px] font-extrabold tracking-tight text-ink">About</h1>
      </div>

      <Card className="relative overflow-hidden border-0 bg-gradient-to-br from-brand-700 via-brand-600 to-brand-500 p-5 text-white">
        <span className="pointer-events-none absolute -right-14 -top-16 h-44 w-44 rounded-full bg-white/10" />
        <span className="pointer-events-none absolute -bottom-20 -left-10 h-36 w-36 rounded-full bg-white/5" />
        <div className="relative">
          <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/15 text-[22px] font-black shadow-card">
            S
          </span>
          <h2 className="mt-3 text-[22px] font-extrabold tracking-tight">{APP_NAME}</h2>
          <p className="text-[12px] text-white/80">
            Visits, live photo proof and estimates in one app.
          </p>
          <div className="mt-3 inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-[11px] font-bold">
            <span className="h-1.5 w-1.5 rounded-full bg-white" />
            Stable v{APP_VERSION}
            <span className="font-medium text-white/70">
              · {new Date(APP_BUILT_AT).toLocaleDateString('en-IN', {
                day: '2-digit',
                month: 'short',
                year: 'numeric'
              })}
            </span>
          </div>
        </div>
      </Card>

      <Card className="divide-y divide-surface-line p-4">
        <Row
          icon={<SparkIcon size={17} />}
          title="Check for updates"
          subtitle={checkSubtitle}
          trailing={checkTrailing}
          onClick={() => void runCheck()}
        />
        <Row
          icon={<CheckIcon size={17} />}
          title="What’s new"
          subtitle={`Release notes for v${APP_VERSION}`}
          trailing={<ChevronRightIcon size={16} className="text-ink-mute" />}
          onClick={() => setInfo('notes')}
        />
        <Row
          icon={<ShieldIcon size={17} />}
          title="Privacy policy"
          subtitle="What this app stores on your phone"
          trailing={<ChevronRightIcon size={16} className="text-ink-mute" />}
          onClick={() => setInfo('privacy')}
        />
        <Row
          icon={<SettingsIcon size={17} />}
          title="Third-party notices"
          subtitle="Libraries used inside the app"
          trailing={<ChevronRightIcon size={16} className="text-ink-mute" />}
          onClick={() => setInfo('notices')}
        />
        <Row
          icon={<CameraIcon size={17} />}
          title="Shabh Creations website"
          subtitle="shabhcreations.com"
          trailing={<ChevronRightIcon size={16} className="text-ink-mute" />}
          onClick={() => void openExternal(WEBSITE_URL)}
        />
      </Card>

      <div className="px-2 text-center">
        <p className="text-[11px] leading-5 text-ink-mute">
          © {new Date().getFullYear()} {COMPANY_NAME}. Shabh Service is proprietary software;
          the source is not public.
        </p>
        <p className="mt-1 text-[10px] text-ink-mute">Built for Shabh field technicians.</p>
      </div>

      {update && (
        <UpdateSheet
          manifest={update}
          currentVersion={APP_VERSION}
          onClose={() => setUpdate(null)}
          onDismiss={() => setUpdate(null)}
        />
      )}

      {info === 'notes' && (
        <Sheet open onClose={() => setInfo(null)} title="What’s new" subtitle={`Stable v${APP_VERSION}`}>
          <ul className="space-y-2.5">
            {RELEASE_NOTES.map((note) => (
              <li key={note} className="flex gap-2 text-[12px] leading-5 text-ink-soft">
                <CheckIcon size={14} className="mt-0.5 shrink-0 text-brand-500" />
                <span>{note}</span>
              </li>
            ))}
          </ul>
        </Sheet>
      )}

      {info === 'privacy' && (
        <Sheet open onClose={() => setInfo(null)} title="Privacy policy" subtitle="Short and honest">
          <div className="space-y-3 text-[12px] leading-5 text-ink-soft">
            <p>
              <strong className="text-ink">Your work stays on this phone.</strong> Jobs, checklists,
              photos, estimates and settings are stored in the app’s local database. There is no
              analytics SDK and no third-party tracking.
            </p>
            <p>
              <strong className="text-ink">Camera.</strong> Photos are captured live for proof and
              stamped with the job, service, employee, time and GPS. The gallery is never opened
              and there is no upload picker.
            </p>
            <p>
              <strong className="text-ink">Location.</strong> A position is recorded when the
              customer OTP is verified, when a photo is taken and at sign-off, so a manager can see
              the last known place of work.
            </p>
            <p>
              <strong className="text-ink">Demo note.</strong> This build signs employees in
              locally and shows OTP codes on screen. Production uses Supabase Auth with the code
              delivered by SMS/WhatsApp.
            </p>
            <p>
              <strong className="text-ink">Updates.</strong> The app checks a public release
              manifest for a newer version. No personal data is sent with that request.
            </p>
          </div>
        </Sheet>
      )}

      {info === 'notices' && (
        <Sheet
          open
          onClose={() => setInfo(null)}
          title="Third-party notices"
          subtitle="Open-source components used inside the app"
        >
          <ul className="divide-y divide-surface-line">
            {THIRD_PARTY_NOTICES.map((item) => (
              <li key={item.name} className="flex items-center justify-between py-2.5">
                <span className="text-[12px] font-semibold text-ink">{item.name}</span>
                <span className="rounded-full bg-surface-sunken px-2 py-0.5 text-[10px] font-bold text-ink-soft">
                  {item.licence}
                </span>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-[11px] leading-5 text-ink-mute">
            These libraries are used under their own licences. The Shabh Service application
            itself is proprietary and its source is not distributed.
          </p>
        </Sheet>
      )}
    </div>
  )
}
