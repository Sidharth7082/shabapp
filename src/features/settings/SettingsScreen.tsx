import { useState, type ReactNode } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { Link } from 'react-router-dom'
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
  LayersIcon
} from '@/components/ui/icons'
import { Select, TextInput } from '@/components/ui/fields'
import { toast } from '@/components/ui/toast'
import { resetDemoData } from '@/db/seed'
import { useSession, type Role } from '@/services/session'

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
  const { name, role, setName, setRole } = useSession()
  const jobs = useLiveQuery(() => db.jobs.count(), [])
  const photos = useLiveQuery(() => db.photos.count(), [])
  const estimates = useLiveQuery(() => db.estimates.count(), [])
  const [busy, setBusy] = useState(false)

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
      toast('Demo data restored', 'ok')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-4 px-4 pb-8 pt-5">
      <header>
        <p className="text-[10px] font-bold uppercase tracking-widest text-ink-mute">Device</p>
        <h1 className="mt-1 text-[26px] font-extrabold leading-tight tracking-tight text-ink">
          Settings
        </h1>
        <p className="mt-1 text-[13px] text-ink-mute">Profile, offline storage and build status.</p>
      </header>

      <Card className="p-4">
        <div className="flex items-center gap-3">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-500 to-brand-700 text-[16px] font-black text-white">
            {initials || 'S'}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[15px] font-bold tracking-tight text-ink">
              {name || 'Technician'}
            </p>
            <p className="text-[11px] text-ink-mute">
              {role === 'admin' ? 'Manager · full access' : 'Technician · assigned jobs'}
            </p>
          </div>
          <Badge tone={role === 'admin' ? 'brand' : 'neutral'}>{role}</Badge>
        </div>

        <div className="mt-4 space-y-3">
          <TextInput label="Name" value={name} onChange={(event) => setName(event.target.value)} />
          <Select label="Role" value={role} onChange={(event) => setRole(event.target.value as Role)}>
            <option value="technician">Technician</option>
            <option value="admin">Admin</option>
          </Select>
        </div>
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
        <Link
          to="/admin"
          className="mt-3 flex items-center justify-between rounded-xl bg-surface-sunken px-3 py-2.5"
        >
          <span className="text-[12px] font-bold text-ink">Open control room</span>
          <ChevronRightIcon size={15} className="text-ink-mute" />
        </Link>
      </Card>

      <p className="text-center text-[11px] text-ink-mute">Shabh Service · v0.1.0</p>
    </div>
  )
}
