import { useState, type ReactNode } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { Link, useNavigate } from 'react-router-dom'
import { db } from '@/db/db'
import { Button } from '@/components/ui/Button'
import { Badge, Card, SectionHeader } from '@/components/ui/display'
import {
  AlertIcon,
  CalculatorIcon,
  CameraIcon,
  CheckIcon,
  ChevronRightIcon,
  ClockIcon,
  LayersIcon,
  ShieldIcon
} from '@/components/ui/icons'
import { toast } from '@/components/ui/toast'
import { resetDemoData } from '@/db/seed'
import { useSession } from '@/services/session'
import { logAudit } from '@/services/audit'
import { can, ROLE_LABEL } from '@/domain/auth/roles'
import { APP_VERSION } from '@/version'

function StorageRow({ icon, label, value }: { icon: ReactNode; label: string; value: number }) {
  return (
    <div className="flex items-center gap-3 py-2.5">
      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-surface-sunken text-ink-soft">
        {icon}
      </span>
      <span className="flex-1 text-[13px] font-semibold text-ink">{label}</span>
      <span className="tabular text-[13px] font-bold text-ink">{value}</span>
    </div>
  )
}

function StatusRow({ tone, label, body }: { tone: 'ok' | 'warn' | 'neutral'; label: string; body: string }) {
  const Icon = tone === 'ok' ? CheckIcon : tone === 'warn' ? ClockIcon : AlertIcon
  return (
    <div className="flex items-start gap-3 py-2.5">
      <span
        className={
          'mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full ' +
          (tone === 'ok'
            ? 'bg-ok-soft text-ok'
            : tone === 'warn'
              ? 'bg-warn-soft text-warn'
              : 'bg-surface-sunken text-ink-mute')
        }
      >
        <Icon size={12} />
      </span>
      <div className="min-w-0">
        <p className="text-[12px] font-bold text-ink">{label}</p>
        <p className="text-[11px] leading-4 text-ink-mute">{body}</p>
      </div>
    </div>
  )
}

export function SettingsScreen() {
  const {
    name,
    role,
    employeeId,
    dailyTarget,
    expiresAt,
    signOut
  } = useSession()
  const navigate = useNavigate()
  const jobs = useLiveQuery(() => db.jobs.count(), [])
  const photos = useLiveQuery(() => db.photos.count(), [])
  const estimates = useLiveQuery(() => db.estimates.count(), [])
  const [busy, setBusy] = useState(false)

  const sessionEnds = expiresAt
    ? new Date(expiresAt).toLocaleString('en-IN', {
        day: '2-digit',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit'
      })
    : 'sign in again'

  const initials = name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('')

  const reset = async () => {
    if (!window.confirm('Reset demo data? All jobs, photos and saved BOQs on this device will be replaced.')) {
      return
    }
    setBusy(true)
    try {
      await resetDemoData()
      void logAudit('demo_reset', 'Demo jobs and photos restored from Settings')
      toast('Demo data restored', 'ok')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-4 px-4 pb-8 pt-5">
      <header>
        <p className="text-[10px] font-bold uppercase tracking-widest text-ink-mute">Account</p>
        <h1 className="mt-1 text-[26px] font-extrabold leading-tight tracking-tight text-ink">
          Profile & settings
        </h1>
        <p className="mt-1 text-[13px] text-ink-mute">Your account, this device and app info.</p>
      </header>

      <Card className="p-4">
        <SectionHeader title="Profile" subtitle="Signed in on this device" />
        <div className="flex items-center gap-3">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-500 to-brand-700 text-[16px] font-black text-white">
            {initials || 'S'}
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[15px] font-bold leading-tight tracking-tight text-ink">
              {name || 'Technician'}
            </p>
            <p className="mt-0.5 text-[11px] leading-4 text-ink-mute">
              {employeeId || 'No account'} · {ROLE_LABEL[role]}
            </p>
          </div>
        </div>

        <div className="mt-2.5 flex flex-wrap gap-1.5">
          <Badge tone={role === 'admin' ? 'brand' : 'neutral'}>{ROLE_LABEL[role]}</Badge>
          {dailyTarget > 0 && <Badge tone="info">Target {dailyTarget} points / day</Badge>}
        </div>

        <div className="mt-4 space-y-3">
          <div className="rounded-xl bg-surface-sunken px-3 py-2.5">
            <p className="text-[10px] font-bold uppercase tracking-widest text-ink-mute">
              Employee record
            </p>
            <p className="mt-1 text-[11px] leading-4 text-ink-mute">
              Name, role and shift target are managed by an admin in the admin console. Ask them
              to change your record; it applies at your next sign-in.
            </p>
          </div>
          <Button
            variant="secondary"
            full
            onClick={() => {
              void logAudit('logout', 'Signed out')
              signOut()
              navigate('/login', { replace: true })
            }}
          >
            Sign out
          </Button>
        </div>
      </Card>

      <Card className="p-4">
        <SectionHeader title="App" subtitle="Updates, team tools and version" />
        <Link
          to="/about"
          className="flex items-center justify-between rounded-xl bg-surface-sunken px-3 py-3"
        >
          <span>
            <span className="block text-[12px] font-bold text-ink">About & updates</span>
            <span className="block text-[10px] text-ink-mute">
              Shabh Service v{APP_VERSION} · check for updates
            </span>
          </span>
          <ChevronRightIcon size={15} className="text-ink-mute" />
        </Link>
        {can(role, 'team:view') && (
          <Link
            to="/team"
            className="mt-2 flex items-center justify-between rounded-xl bg-surface-sunken px-3 py-3"
          >
            <span>
              <span className="block text-[12px] font-bold text-ink">Team board</span>
              <span className="block text-[10px] text-ink-mute">
                Live status, points and who is working on what
              </span>
            </span>
            <ChevronRightIcon size={15} className="text-ink-mute" />
          </Link>
        )}
        {can(role, 'jobs:create') && (
          <Link
            to="/control"
            className="mt-2 flex items-center justify-between rounded-xl bg-surface-sunken px-3 py-3"
          >
            <span>
              <span className="block text-[12px] font-bold text-ink">Control room</span>
              <span className="block text-[10px] text-ink-mute">Create jobs and locate the team</span>
            </span>
            <ChevronRightIcon size={15} className="text-ink-mute" />
          </Link>
        )}
        {can(role, 'admin:people') && (
          <Link
            to="/admin"
            className="mt-2 flex items-center justify-between rounded-xl bg-surface-sunken px-3 py-3"
          >
            <span>
              <span className="block text-[12px] font-bold text-ink">Admin console</span>
              <span className="block text-[10px] text-ink-mute">
                People, roles, audit log and security
              </span>
            </span>
            <ChevronRightIcon size={15} className="text-ink-mute" />
          </Link>
        )}
      </Card>

      <Card className="p-4">
        <SectionHeader title="Security" subtitle="Device protections in this build" />
        <div className="divide-y divide-surface-line">
          <StatusRow
            tone="ok"
            label="Session timeout"
            body={`Hard 12-hour limit. This session ends ${sessionEnds}; it also signs out after 2 hours without activity.`}
          />
          <StatusRow
            tone="ok"
            label="PIN checked, not stored"
            body="PINs are verified against a salted PBKDF2 hash; the plaintext PIN is never kept on the device."
          />
          <StatusRow
            tone="ok"
            label="Network"
            body="HTTPS only. Cleartext traffic and user-installed certificates are blocked on Android."
          />
          <StatusRow
            tone="ok"
            label="Device hardening"
            body="Backups disabled, WebView file access off, tapjacking filter on, remote debugging off in release builds."
          />
          <StatusRow
            tone="warn"
            label="Demo limits"
            body="Technician one-tap accounts and the on-screen OTP are demonstrations. Supervisor, manager and admin demo accounts require their employee ID + PIN."
          />
        </div>
        <p className="mt-2 flex items-start gap-1.5 rounded-xl bg-surface-sunken px-2.5 py-2 text-[10px] leading-4 text-ink-mute">
          <ShieldIcon size={13} className="mt-0.5 shrink-0 text-ink-mute" />
          Production security needs Supabase Auth, server-side OTP and a signed release build. See the
          security model in the project docs.
        </p>
      </Card>

      <Card className="p-4">
        <SectionHeader title="Local storage" subtitle="IndexedDB on this device" />
        <div className="divide-y divide-surface-line">
          <StorageRow icon={<LayersIcon size={15} />} label="Jobs" value={jobs ?? 0} />
          <StorageRow icon={<CameraIcon size={15} />} label="Live photos" value={photos ?? 0} />
          <StorageRow icon={<CalculatorIcon size={15} />} label="Estimates" value={estimates ?? 0} />
        </div>
        <Button variant="secondary" full className="mt-3" onClick={reset} disabled={busy}>
          {busy ? 'Restoring…' : 'Reset demo data'}
        </Button>
      </Card>

      <Card className="p-4">
        <SectionHeader title="Build status" subtitle="What is live and what needs credentials" />
        <div className="divide-y divide-surface-line">
          <StatusRow
            tone="ok"
            label="Live"
            body="Job board, multi-service visits, live camera proof, BOQ engines"
          />
          <StatusRow tone="warn" label="Demo" body="OTP is generated on-device and shown on screen" />
          <StatusRow
            tone="neutral"
            label="Pending"
            body="Supabase sync and SMS / WhatsApp OTP delivery"
          />
          <StatusRow tone="neutral" label="Pending" body="Manager analytics beyond this device" />
        </div>
      </Card>

      <Card className="p-4">
        <SectionHeader title="Compliance" />
        <p className="text-[11px] leading-5 text-ink-mute">
          Estimation outputs are preliminary only. Final BOQs require a site survey and a certified
          engineer. Photos are captured live, watermarked with job, time and GPS, and never selected
          from the gallery.
        </p>
      </Card>

      <p className="text-center text-[11px] text-ink-mute">Shabh Service · v{APP_VERSION}</p>
    </div>
  )
}
