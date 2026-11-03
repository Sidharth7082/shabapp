import { useLiveQuery } from 'dexie-react-hooks'
import { Link } from 'react-router-dom'
import { db } from '@/db/db'
import { Button } from '@/components/ui/Button'
import { Badge, Card, EmptyState, SectionHeader } from '@/components/ui/display'
import {
  AlertIcon,
  CheckIcon,
  ChevronRightIcon,
  HistoryIcon,
  ShieldIcon,
  UsersIcon
} from '@/components/ui/icons'
import { toast } from '@/components/ui/toast'
import { DEMO_EMPLOYEES, type DemoEmployee } from '@/data/employees'
import {
  applyOverride,
  canChangeRole,
  clampDailyTarget,
  type TeamOverride,
  type TeamOverrides
} from '@/domain/auth/people'
import { ROLE_LABEL, ROLE_ORDER, ROLE_DESCRIPTION, type Role } from '@/domain/auth/roles'
import {
  AUDIT_ACTION_LABEL,
  AUDIT_ACTION_TONE,
  formatAuditTime,
  type AuditEntry
} from '@/domain/audit'
import { resetDemoData } from '@/db/seed'
import { useSession } from '@/services/session'
import { readAuditLog, clearAuditLog, logAudit } from '@/services/audit'
import { savePersonOverride } from '@/services/people'
import { APP_VERSION } from '@/version'
import { useState } from 'react'

function initials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('')
}

function PersonRow({
  person,
  isSelf,
  busy,
  onChange
}: {
  person: DemoEmployee
  isSelf: boolean
  busy: boolean
  onChange: (patch: TeamOverride) => void
}) {
  return (
    <div className="py-3">
      <div className="flex items-start gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-[11px] font-black text-brand-700">
          {initials(person.name)}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <p className="truncate text-[13px] font-bold text-ink">{person.name}</p>
            {isSelf && <Badge tone="brand">You</Badge>}
          </div>
          <p className="mt-0.5 text-[10.5px] text-ink-mute">
            {person.id} · {ROLE_DESCRIPTION[person.role]}
          </p>
        </div>
      </div>
      <div className="mt-2 grid grid-cols-[1fr_90px] gap-2">
        <label className="block">
          <span className="text-[9px] font-bold uppercase tracking-wider text-ink-mute">Role</span>
          <select
            value={person.role}
            disabled={isSelf || busy}
            onChange={(event) => onChange({ role: event.target.value as Role })}
            className="mt-1 h-10 w-full rounded-xl border border-surface-line bg-white px-2 text-[12px] font-semibold text-ink outline-none focus:border-brand-400 disabled:bg-surface-sunken disabled:text-ink-mute"
            aria-label={`Role for ${person.name}`}
          >
            {ROLE_ORDER.map((role) => (
              <option key={role} value={role}>
                {ROLE_LABEL[role]}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="text-[9px] font-bold uppercase tracking-wider text-ink-mute">
            Target
          </span>
          <input
            key={`${person.id}-${person.dailyTarget}`}
            type="number"
            min={0}
            max={50}
            defaultValue={person.dailyTarget}
            disabled={isSelf || busy}
            onBlur={(event) => {
              const value = clampDailyTarget(Number(event.target.value))
              if (value !== person.dailyTarget) onChange({ dailyTarget: value })
            }}
            className="tabular mt-1 h-10 w-full rounded-xl border border-surface-line bg-white px-2 text-[12px] font-semibold text-ink outline-none focus:border-brand-400 disabled:bg-surface-sunken disabled:text-ink-mute"
            aria-label={`Daily target for ${person.name}`}
          />
        </label>
      </div>
      {isSelf && (
        <p className="mt-1.5 text-[10px] text-ink-mute">
          Your own role and target are locked so an admin cannot demote themselves by accident.
        </p>
      )}
    </div>
  )
}

function StatusRow({
  tone,
  label,
  body
}: {
  tone: 'ok' | 'warn'
  label: string
  body: string
}) {
  const Icon = tone === 'ok' ? CheckIcon : AlertIcon
  return (
    <div className="flex items-start gap-3 py-2.5">
      <span
        className={
          'mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full ' +
          (tone === 'ok' ? 'bg-ok-soft text-ok' : 'bg-warn-soft text-warn')
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

export function AdminConsole() {
  const role = useSession((state) => state.role)
  const employeeId = useSession((state) => state.employeeId)
  const expiresAt = useSession((state) => state.expiresAt)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [resetBusy, setResetBusy] = useState(false)

  const people = useLiveQuery(async () => {
    const value = (await db.settings.get('teamOverrides'))?.value as TeamOverrides | undefined
    return DEMO_EMPLOYEES.map((employee) => applyOverride(employee, value ?? {}))
  }, [])
  const audit = useLiveQuery(() => readAuditLog(), [])

  const updatePerson = async (person: DemoEmployee, patch: TeamOverride) => {
    if (person.id === employeeId) {
      toast('You cannot change your own role or target', 'error')
      return
    }
    if (!canChangeRole(employeeId, person.id)) return
    setBusyId(person.id)
    try {
      await savePersonOverride(person.id, patch)
      const detail =
        patch.role !== undefined
          ? `${person.name} (${person.id}) role → ${ROLE_LABEL[patch.role]}`
          : `${person.name} (${person.id}) target → ${patch.dailyTarget} points`
      await logAudit(patch.role !== undefined ? 'role_changed' : 'target_changed', detail)
      toast('Saved. Applies at next sign-in.', 'ok')
    } catch {
      toast('Could not save the change', 'error')
    } finally {
      setBusyId(null)
    }
  }

  const reset = async () => {
    if (!window.confirm('Reset demo jobs and photos? People, roles and the audit log are kept.')) {
      return
    }
    setResetBusy(true)
    try {
      await resetDemoData()
      await logAudit('demo_reset', 'Demo jobs and photos restored')
      toast('Demo data restored', 'ok')
    } finally {
      setResetBusy(false)
    }
  }

  const sessionEnds = expiresAt
    ? new Date(expiresAt).toLocaleString('en-IN', {
        day: '2-digit',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit'
      })
    : 'sign in again'

  return (
    <div className="space-y-5 px-4 pb-8 pt-5">
      <header>
        <p className="text-[10px] font-bold uppercase tracking-widest text-ink-mute">Admin</p>
        <h1 className="mt-1 text-[26px] font-extrabold leading-tight tracking-tight text-ink">
          Admin console
        </h1>
        <p className="mt-1 text-[13px] text-ink-mute">
          People and roles, the audit trail and device security. Only the admin account can open
          this screen.
        </p>
        <div className="mt-2 flex flex-wrap gap-1.5">
          <Badge tone="brand">{ROLE_LABEL[role]}</Badge>
          <Badge tone="neutral">v{APP_VERSION}</Badge>
          <Link
            to="/control"
            className="rounded-lg border border-surface-line bg-white px-2.5 py-1 text-[10px] font-bold text-brand-700"
          >
            Control room
          </Link>
        </div>
      </header>

      <Card className="p-4">
        <SectionHeader
          title="People & roles"
          subtitle="Changes are local and apply at the next sign-in"
          action={<UsersIcon size={16} className="text-ink-mute" />}
        />
        {people === undefined ? (
          <p className="py-3 text-[12px] text-ink-mute">Loading people…</p>
        ) : (
          <div className="divide-y divide-surface-line">
            {people.map((person) => (
              <PersonRow
                key={`${person.id}-${person.role}-${person.dailyTarget}`}
                person={person}
                isSelf={person.id === employeeId}
                busy={busyId === person.id}
                onChange={(patch) => void updatePerson(person, patch)}
              />
            ))}
          </div>
        )}
        <p className="mt-2 rounded-xl bg-surface-sunken px-2.5 py-2 text-[10px] leading-4 text-ink-mute">
          This demo stores overrides on the device. Production must enforce roles on the server
          with Supabase <strong>profiles.role</strong> and row-level security; a client-side check
          alone is not a security boundary.
        </p>
      </Card>

      <Card className="p-4">
        <SectionHeader
          title="Audit log"
          subtitle="Sign-ins, role changes and job actions on this device"
          action={
            <button
              type="button"
              onClick={async () => {
                if (!window.confirm('Clear the local audit log?')) return
                await clearAuditLog()
                toast('Audit log cleared', 'info')
              }}
              className="text-[10px] font-bold uppercase tracking-wide text-danger"
            >
              Clear
            </button>
          }
        />
        {audit === undefined ? (
          <p className="py-3 text-[12px] text-ink-mute">Loading audit log…</p>
        ) : audit.length === 0 ? (
          <EmptyState
            icon={<HistoryIcon size={18} />}
            title="No events yet"
            body="Sign-ins, failed attempts, role changes and job actions appear here."
          />
        ) : (
          <div className="max-h-[360px] divide-y divide-surface-line overflow-y-auto">
            {audit.map((entry: AuditEntry) => (
              <div key={entry.id} className="flex items-start gap-2.5 py-2.5">
                <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-surface-sunken text-ink-mute">
                  <HistoryIcon size={12} />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <Badge tone={AUDIT_ACTION_TONE[entry.action]}>
                      {AUDIT_ACTION_LABEL[entry.action]}
                    </Badge>
                    <span className="text-[10px] text-ink-mute">{formatAuditTime(entry.at)}</span>
                  </div>
                  <p className="mt-1 text-[11.5px] font-semibold text-ink">{entry.detail}</p>
                  <p className="text-[10px] text-ink-mute">
                    {entry.actorName} · {entry.actorId}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card className="p-4">
        <SectionHeader
          title="Security"
          subtitle="What this build enforces and what still needs the backend"
          action={<ShieldIcon size={16} className="text-ink-mute" />}
        />
        <div className="divide-y divide-surface-line">
          <StatusRow
            tone="ok"
            label="Session"
            body={`Signed in as ${ROLE_LABEL[role]}; this session ends ${sessionEnds}.`}
          />
          <StatusRow
            tone="ok"
            label="Credentials"
            body="PINs are PBKDF2 hashes; privileged demo accounts require ID + PIN. PINs are never displayed in the app."
          />
          <StatusRow
            tone="ok"
            label="Device protections"
            body="HTTPS-only Android policy, backups off, WebView file access off, CSP on production builds."
          />
          <StatusRow
            tone="warn"
            label="Server enforcement pending"
            body="Roles and audit are local today. Supabase Auth + RLS must enforce the same matrix in production."
          />
        </div>
        <Link
          to="/settings"
          className="mt-3 flex items-center justify-between rounded-xl bg-surface-sunken px-3 py-2.5 text-[11px] font-bold text-ink-soft"
        >
          Profile & security settings
          <ChevronRightIcon size={14} className="text-ink-mute" />
        </Link>
      </Card>

      <Card className="p-4">
        <SectionHeader title="Demo data" subtitle="Restore the seeded jobs and photos" />
        <p className="text-[11px] leading-4 text-ink-mute">
          People overrides, the audit log and your session are kept. Use this after adding new
          demo accounts or jobs.
        </p>
        <Button
          variant="secondary"
          full
          className="mt-3"
          onClick={() => void reset()}
          disabled={resetBusy}
        >
          {resetBusy ? 'Restoring…' : 'Reset demo data'}
        </Button>
      </Card>
    </div>
  )
}
