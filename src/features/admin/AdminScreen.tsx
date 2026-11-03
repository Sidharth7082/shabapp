import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import clsx from 'clsx'
import { db } from '@/db/db'
import { Button } from '@/components/ui/Button'
import { Sheet } from '@/components/ui/Sheet'
import {
  Badge,
  Card,
  EmptyState,
  ProgressRing,
  SectionHeader,
  Stat
} from '@/components/ui/display'
import {
  AlertIcon,
  BriefcaseIcon,
  CheckIcon,
  ClockIcon,
  LayersIcon,
  NavigationIcon,
  PinIcon,
  PlusIcon,
  SearchIcon,
  UserIcon,
  WrenchIcon
} from '@/components/ui/icons'
import { NumberInput, Select, TextInput } from '@/components/ui/fields'
import { toast } from '@/components/ui/toast'
import { CHECKLIST_TEMPLATES } from '@/data/checklistTemplates'
import { JOB_KIND_LABEL, JOB_STATUS_LABEL, servicesDone } from '@/domain/jobs/types'
import { employeeOnSite, latestEmployeePing } from '@/domain/jobs/team'
import type { CreditTier, JobKind, ServiceJob } from '@/domain/jobs/types'
import { createJob, deleteJob } from '@/services/jobs'
import { effectiveTeam } from '@/services/people'
import { logAudit } from '@/services/audit'
import { useSession } from '@/services/session'
import { can, ROLE_LABEL, isFieldRole } from '@/domain/auth/roles'

const SYSTEMS = [
  'AC Service',
  'Solar Panels',
  'CCTV',
  'Chimney',
  'RO',
  'Geyser',
  'Meter',
  'Fire Alarm',
  'Sprinkler',
  'Hydrant',
  'Pump Room',
  'Extinguishers',
  'Gas Suppression',
  'Kitchen Hood',
  'Housekeeping'
]

const KINDS: JobKind[] = ['amc', 'breakdown', 'survey', 'sitc']

interface ServiceDraft {
  name: string
  system: string
  templateId: string
}

function localInputValue(offsetMinutes = 60): string {
  const date = new Date(Date.now() + offsetMinutes * 60_000)
  const pad = (value: number) => String(value).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

function timeAgo(iso: string): string {
  const minutes = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60_000))
  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes} min ago`
  const hours = Math.round(minutes / 60)
  if (hours < 24) return `${hours} h ago`
  return new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })
}

function TeamCard({ jobs }: { jobs: ServiceJob[] }) {
  const team = useLiveQuery(() => effectiveTeam(), [])
  const employees = (team ?? []).filter((employee) => isFieldRole(employee.role))

  return (
    <Card className="p-4">
      <SectionHeader title="Team" subtitle="Last known location on this device" />
      <div className="divide-y divide-surface-line">
        {employees.map((employee) => {
          const ping = latestEmployeePing(jobs, employee.name)
          const onSite = employeeOnSite(jobs, employee.name)
          const activeJob = jobs.find(
            (job) => job.assignedTo === employee.name && job.status === 'started'
          )
          const initials = employee.name
            .split(' ')
            .filter(Boolean)
            .slice(0, 2)
            .map((part) => part[0]?.toUpperCase())
            .join('')

          return (
            <div key={employee.id} className="flex items-start gap-3 py-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-[12px] font-black text-brand-700">
                {initials}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-1.5">
                  <p className="truncate text-[13px] font-bold text-ink">{employee.name}</p>
                  <Badge tone={onSite ? 'warn' : 'neutral'}>{onSite ? 'On site' : 'Available'}</Badge>
                </div>
                <p className="mt-0.5 text-[11px] text-ink-mute">
                  {employee.id} · target {employee.dailyTarget} points
                </p>
                {activeJob && (
                  <Link
                    to={`/jobs/${activeJob.id}`}
                    className="mt-1 block truncate text-[11px] font-bold text-brand-700"
                  >
                    On site at {activeJob.customerName} · {activeJob.code}
                  </Link>
                )}
                {ping ? (
                  <>
                    <p className="mt-1 truncate text-[11px] font-semibold text-ink-soft">
                      {ping.customerName} · {ping.jobCode} ·{' '}
                      {ping.kind === 'check-in' ? 'start OTP' : 'sign-off'}
                    </p>
                    <p className="text-[10px] text-ink-mute">
                      {timeAgo(ping.at)} · ±{Math.round(ping.accuracy)} m ·{' '}
                      {ping.lat.toFixed(5)}, {ping.lng.toFixed(5)}
                    </p>
                  </>
                ) : (
                  <p className="mt-1 text-[11px] text-ink-mute">
                    {activeJob
                      ? 'Waiting for a GPS fix — position is captured at OTP and sign-off.'
                      : 'No location captured yet — position is recorded at OTP and sign-off.'}
                  </p>
                )}
              </div>
              {ping && (
                <a
                  href={`https://www.google.com/maps?q=${ping.lat},${ping.lng}`}
                  target="_blank"
                  rel="noreferrer"
                  className="flex shrink-0 items-center gap-1 rounded-lg bg-brand-600 px-2.5 py-1.5 text-[10px] font-bold text-white transition active:scale-95"
                >
                  <NavigationIcon size={12} /> Locate
                </a>
              )}
            </div>
          )
        })}
      </div>
      <p className="mt-2 flex items-start gap-1 text-[10px] leading-4 text-ink-mute">
        <UserIcon size={11} className="mt-0.5 shrink-0" />
        Position comes from the technician’s device at check-in and sign-off. Live tracking needs the
        Phase 2 backend.
      </p>
    </Card>
  )
}

function NewJobSheet({ onClose }: { onClose: () => void }) {
  const employee = useSession((state) => state.name)
  const team = useLiveQuery(() => effectiveTeam(), [])
  const fieldTeam = (team ?? []).filter((member) => isFieldRole(member.role))
  const [assignedTo, setAssignedTo] = useState('')
  const [customerName, setCustomerName] = useState('')
  const [contactName, setContactName] = useState('')
  const [phone, setPhone] = useState('')
  const [address, setAddress] = useState('')
  const [area, setArea] = useState('')
  const [kind, setKind] = useState<JobKind>('amc')
  const [priority, setPriority] = useState<'normal' | 'urgent'>('normal')
  const [slotStart, setSlotStart] = useState(localInputValue())
  const [slaMinutes, setSlaMinutes] = useState('240')
  const [tier, setTier] = useState<CreditTier>(2)
  const [services, setServices] = useState<ServiceDraft[]>([
    { name: '', system: 'Fire Alarm', templateId: 'fire-alarm' }
  ])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const updateService = (index: number, patch: Partial<ServiceDraft>) =>
    setServices((current) => current.map((row, i) => (i === index ? { ...row, ...patch } : row)))

  const submit = async () => {
    if (customerName.trim().length < 2) return setError('Enter the customer or facility name.')
    if (phone.replace(/\D/g, '').length < 10) return setError('Enter a 10-digit customer phone number.')
    if (address.trim().length < 4) return setError('Enter the site address.')
    if (services.some((row) => row.name.trim().length < 2)) return setError('Name every service in the visit.')

    setBusy(true)
    setError(null)
    try {
      const assignee = assignedTo || fieldTeam[0]?.name || employee
      await createJob({
        customerName,
        contactName: contactName || customerName,
        phone,
        address,
        area,
        kind,
        priority,
        services: services.map((row) => ({
          name: row.name,
          system: row.system,
          templateId: row.templateId
        })),
        slotStart: new Date(slotStart).toISOString(),
        slaMinutes: Number(slaMinutes) || 240,
        tier,
        assignedTo: assignee
      })
      void logAudit('job_created', `${customerName.trim()} assigned to ${assignee}`)
      toast('Job created and assigned', 'ok')
      onClose()
    } catch {
      setError('Could not create the job. Try again.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Sheet
      open
      fullHeight
      onClose={onClose}
      title="New service job"
      subtitle="One visit can hold as many services as the site needs"
      footer={
        <Button full size="lg" onClick={() => void submit()} disabled={busy}>
          {busy ? 'Creating…' : 'Create & assign'}
        </Button>
      }
    >
      <div className="space-y-3">
        <TextInput label="Customer / facility" value={customerName} onChange={(e) => setCustomerName(e.target.value)} placeholder="e.g. Sunrise Apartments" />
        <div className="grid grid-cols-2 gap-3">
          <TextInput label="Contact person" value={contactName} onChange={(e) => setContactName(e.target.value)} placeholder="e.g. Meera Nair" />
          <TextInput label="Phone" inputMode="numeric" value={phone} onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))} placeholder="10 digits" />
        </div>
        <TextInput label="Site address" value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Tower, sector, city" />
        <div className="grid grid-cols-2 gap-3">
          <TextInput label="Area / locality" value={area} onChange={(e) => setArea(e.target.value)} placeholder="Sector 62" />
          <Select label="Work type" value={kind} onChange={(e) => setKind(e.target.value as JobKind)}>
            {KINDS.map((value) => (
              <option key={value} value={value}>
                {JOB_KIND_LABEL[value]}
              </option>
            ))}
          </Select>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Select label="Priority" value={priority} onChange={(e) => setPriority(e.target.value as 'normal' | 'urgent')}>
            <option value="normal">Normal</option>
            <option value="urgent">Urgent</option>
          </Select>
          <NumberInput label="SLA window" suffix="min" value={slaMinutes} onChange={(e) => setSlaMinutes(e.target.value)} />
        </div>
        <TextInput
          label="Slot start"
          type="datetime-local"
          value={slotStart}
          onChange={(e) => setSlotStart(e.target.value)}
        />
        <Select
          label="Assign to"
          value={assignedTo || fieldTeam[0]?.name || ''}
          onChange={(e) => setAssignedTo(e.target.value)}
        >
          {fieldTeam.length === 0 && <option value="">No field staff available</option>}
          {fieldTeam.map((member) => (
            <option key={member.id} value={member.name}>
              {member.name} · {ROLE_LABEL[member.role]}
            </option>
          ))}
        </Select>
        <Select
          label="Customer credit tier"
          value={String(tier)}
          onChange={(e) => setTier(e.target.value === '1' ? 1 : 2)}
        >
          <option value="1">Tier 1 · 60 minute visit</option>
          <option value="2">Tier 2 · 90 minute visit</option>
        </Select>
        <p className="-mt-1 text-[11px] leading-4 text-ink-mute">
          The tier sets the visit window. The clock starts when the customer’s start OTP is
          verified and covers every service in this visit.
        </p>

        <div className="rounded-xl border border-surface-line bg-white p-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-bold text-ink">Services in this visit</p>
            <span className="text-xs text-ink-mute">{services.length}</span>
          </div>
          <div className="mt-2 space-y-3">
            {services.map((row, index) => (
              <div key={index} className="rounded-lg bg-surface-sunken p-2.5">
                <TextInput
                  label={`Service ${index + 1}`}
                  value={row.name}
                  onChange={(e) => updateService(index, { name: e.target.value })}
                  placeholder="e.g. Panel health check"
                />
                <div className="mt-2 grid grid-cols-2 gap-2">
                  <Select
                    label="System"
                    value={row.system}
                    onChange={(e) => updateService(index, { system: e.target.value })}
                  >
                    {SYSTEMS.map((system) => (
                      <option key={system} value={system}>
                        {system}
                      </option>
                    ))}
                  </Select>
                  <Select
                    label="Checklist"
                    value={row.templateId}
                    onChange={(e) => updateService(index, { templateId: e.target.value })}
                  >
                    <option value="">No checklist</option>
                    {CHECKLIST_TEMPLATES.map((template) => (
                      <option key={template.id} value={template.id}>
                        {template.name}
                      </option>
                    ))}
                  </Select>
                </div>
                {services.length > 1 && (
                  <button
                    type="button"
                    onClick={() => setServices((current) => current.filter((_, i) => i !== index))}
                    className="mt-2 text-xs font-semibold text-danger"
                  >
                    Remove service
                  </button>
                )}
              </div>
            ))}
          </div>
          <Button
            variant="secondary"
            full
            className="mt-3"
            onClick={() =>
              setServices((current) => [
                ...current,
                { name: '', system: 'Fire Alarm', templateId: 'fire-alarm' }
              ])
            }
          >
            + Add another service
          </Button>
        </div>

        {error && (
          <p role="alert" className="rounded-lg bg-danger-soft px-3 py-2 text-xs font-semibold text-danger">
            {error}
          </p>
        )}
      </div>
    </Sheet>
  )
}

export function AdminScreen() {
  const jobs = useLiveQuery(() => db.jobs.toArray(), [])
  const role = useSession((state) => state.role)
  const canDelete = can(role, 'jobs:delete')
  const [creating, setCreating] = useState(false)

  const stats = useMemo(() => {
    const all = jobs ?? []
    const active = all.filter((job) => job.status !== 'completed' && job.status !== 'cancelled')
    const pending = active.reduce(
      (count, job) => count + job.services.filter((service) => service.status !== 'done').length,
      0
    )
    const inProgress = all.filter((job) => job.status === 'started').length
    const completedToday = all.filter(
      (job) =>
        job.completedAt &&
        new Date(job.completedAt).toDateString() === new Date().toDateString()
    ).length
    const breaches = active.filter((job) => new Date(job.slaDue).getTime() < Date.now()).length
    return { pending, inProgress, completedToday, breaches }
  }, [jobs])

  const [query, setQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'completed'>('all')

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase()
    return [...(jobs ?? [])]
      .filter((job) => {
        if (statusFilter === 'active' && (job.status === 'completed' || job.status === 'cancelled')) {
          return false
        }
        if (statusFilter === 'completed' && job.status !== 'completed') return false
        if (!term) return true
        return `${job.code} ${job.customerName} ${job.address} ${job.assignedTo}`
          .toLowerCase()
          .includes(term)
      })
      .sort((a, b) => {
        if (a.status === 'completed' && b.status !== 'completed') return 1
        if (b.status === 'completed' && a.status !== 'completed') return -1
        return new Date(a.slaDue).getTime() - new Date(b.slaDue).getTime()
      })
  }, [jobs, query, statusFilter])

  if (role === 'technician') {
    return (
      <div className="px-4 py-8">
        <EmptyState
          title="Control room is for supervisors"
          body="Ask a supervisor or manager to assign work. Your own visits stay on the Jobs tab."
          action={
            <Link to="/" className="text-sm font-bold text-brand-600">
              Back to jobs
            </Link>
          }
        />
      </div>
    )
  }

  return (
    <div className="space-y-5 pb-6">
      <header className="flex items-start justify-between gap-3 px-4 pt-5">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-ink-mute">Operations</p>
          <h1 className="mt-1 text-[26px] font-extrabold leading-tight tracking-tight text-ink">
            Control room
          </h1>
          <p className="mt-1 text-[13px] text-ink-mute">Assign work and watch it move.</p>
        </div>
        <Button onClick={() => setCreating(true)} className="gap-1.5">
          <PlusIcon size={16} /> Job
        </Button>
      </header>

      <section className="grid grid-cols-2 gap-2.5 px-4">
        <Stat
          icon={<LayersIcon size={16} />}
          label="Pending services"
          value={stats.pending}
          tone="brand"
        />
        <Stat icon={<WrenchIcon size={16} />} label="In progress" value={stats.inProgress} tone="warn" />
        <Stat icon={<CheckIcon size={16} />} label="Completed today" value={stats.completedToday} tone="ok" />
        <Stat
          icon={<AlertIcon size={16} />}
          label="SLA breaches"
          value={stats.breaches}
          tone={stats.breaches > 0 ? 'danger' : 'ok'}
        />
      </section>

      <section className="px-4">
        <TeamCard jobs={jobs ?? []} />
      </section>

      <section className="space-y-3 px-4">
        <div className="flex items-center gap-2 rounded-xl border border-surface-line bg-white px-3 shadow-card">
          <SearchIcon size={16} className="text-ink-mute" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search code, customer or address"
            aria-label="Search jobs"
            className="h-11 w-full bg-transparent text-[13px] text-ink outline-none placeholder:text-ink-mute"
          />
        </div>

        <div className="flex items-center gap-1.5">
          {(['all', 'active', 'completed'] as const).map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => setStatusFilter(value)}
              aria-pressed={statusFilter === value}
              className={clsx(
                'rounded-full px-3.5 py-1.5 text-[12px] font-bold capitalize transition active:scale-95',
                statusFilter === value
                  ? 'bg-brand-600 text-white shadow-card'
                  : 'border border-surface-line bg-white text-ink-soft'
              )}
            >
              {value}
            </button>
          ))}
          <span className="tabular ml-auto text-[11px] font-semibold text-ink-mute">
            {filtered.length}
          </span>
        </div>

        {filtered.length === 0 ? (
          <EmptyState
            icon={<BriefcaseIcon size={20} />}
            title="No matching jobs"
            body={
              jobs && jobs.length > 0
                ? 'Try a different search or status filter.'
                : 'Create the first service job to assign it to a technician.'
            }
          />
        ) : (
          <div className="space-y-2.5">
            {filtered.map((job) => {
              const done = servicesDone(job)
              const total = job.services.length
              return (
                <Card key={job.id} className="overflow-hidden">
                  <Link to={`/jobs/${job.id}`} className="block p-3.5">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-bold uppercase tracking-widest text-ink-mute">
                            {job.code}
                          </span>
                          <Badge
                            tone={
                              job.status === 'completed'
                                ? 'ok'
                                : job.status === 'started'
                                  ? 'warn'
                                  : 'neutral'
                            }
                          >
                            {JOB_STATUS_LABEL[job.status]}
                          </Badge>
                          <Badge tone="info">Tier {job.tier ?? 2}</Badge>
                        </div>
                        <p className="mt-1.5 truncate text-[14px] font-bold tracking-tight text-ink">
                          {job.customerName}
                        </p>
                        <p className="mt-0.5 flex items-center gap-1 text-[11px] text-ink-mute">
                          <PinIcon size={11} />
                          <span className="truncate">{job.address}</span>
                        </p>
                      </div>
                      <ProgressRing value={done} total={total} size={40} />
                    </div>

                    <div className="mt-3 flex items-center justify-between gap-2 border-t border-surface-line pt-2.5 text-[11px]">
                      <span className="truncate font-semibold text-ink-soft">
                        {done}/{total} services · {job.assignedTo}
                      </span>
                      <span className="flex shrink-0 items-center gap-1 font-semibold text-ink-mute">
                        <ClockIcon size={11} />
                        {new Date(job.slaDue).toLocaleTimeString('en-IN', {
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </span>
                    </div>
                  </Link>

                  {job.status !== 'completed' && canDelete && (
                    <div className="flex justify-end border-t border-surface-line bg-surface-sunken/60 px-3 py-1.5">
                      <button
                        type="button"
                        onClick={async () => {
                          if (
                            !window.confirm(
                              `Delete ${job.code}? Photos on this device will also be removed.`
                            )
                          ) {
                            return
                          }
                          await deleteJob(job.id)
                          void logAudit('job_deleted', `${job.code} · ${job.customerName}`)
                          toast('Job removed', 'info')
                        }}
                        className="text-[10px] font-bold uppercase tracking-wide text-danger"
                      >
                        Delete
                      </button>
                    </div>
                  )}
                </Card>
              )
            })}
          </div>
        )}
      </section>

      {creating && <NewJobSheet onClose={() => setCreating(false)} />}
    </div>
  )
}
