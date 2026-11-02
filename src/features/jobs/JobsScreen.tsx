import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import clsx from 'clsx'
import { db } from '@/db/db'
import { Badge, Card, EmptyState, SectionHeader, Stat } from '@/components/ui/display'
import {
  AlertIcon,
  ArrowRightIcon,
  BriefcaseIcon,
  LayersIcon,
  PinIcon
} from '@/components/ui/icons'
import { useSession } from '@/services/session'
import { completedVisitsOn, servicesDone, type ServiceJob } from '@/domain/jobs/types'
import { JobCard } from './JobCard'
import { JobTimer } from './JobTimer'

type Filter = 'active' | 'today' | 'all'

function sameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  )
}

function greeting(): string {
  const hour = new Date().getHours()
  if (hour < 12) return 'Good morning'
  if (hour < 17) return 'Good afternoon'
  return 'Good evening'
}

function slotHint(slotStart: string): string {
  const diff = new Date(slotStart).getTime() - Date.now()
  if (diff <= 0) return 'Due now'
  const minutes = Math.round(diff / 60000)
  if (minutes < 60) return `in ${minutes}m`
  const hours = Math.round(minutes / 60)
  if (hours < 24) return `in ${hours}h`
  return new Date(slotStart).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })
}

function ShiftCard({ done, target }: { done: number; target: number }) {
  const left = Math.max(0, target - done)
  const extra = Math.max(0, done - target)
  const pct = target > 0 ? Math.min(100, Math.round((done / target) * 100)) : 0

  return (
    <Card className="p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-widest text-ink-mute">
            Shift target
          </p>
          <p className="mt-1 text-[22px] font-extrabold leading-none tracking-tight text-ink">
            <span className="tabular">{done}</span>
            <span className="tabular text-ink-mute"> / {target}</span>
            <span className="ml-1.5 text-[12px] font-semibold text-ink-mute">points today</span>
          </p>
        </div>
        <Badge tone={left === 0 ? 'ok' : 'brand'}>
          {left === 0 ? 'Target met' : `${left} to go`}
        </Badge>
      </div>
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-surface-line">
        <div
          className={clsx('h-full rounded-full transition-[width] duration-500', left === 0 ? 'bg-ok' : 'bg-brand-500')}
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className="mt-2 text-[11px] leading-4 text-ink-mute">
        {extra > 0
          ? `Target met with ${extra} extra point${extra === 1 ? '' : 's'} today — extra houses build your incentive.`
          : `${left} more completed house${left === 1 ? '' : 's'} to hit today\u2019s target.`}
      </p>
      <p className="mt-1 text-[10px] leading-4 text-ink-mute/80">
        1 point per completed house. Inner services in a visit do not add points.
      </p>
    </Card>
  )
}

function NextJobHero({ job }: { job: ServiceJob }) {
  const done = servicesDone(job)
  const total = job.services.length

  return (
    <Link
      to={`/jobs/${job.id}`}
      className="relative block overflow-hidden rounded-3xl bg-gradient-to-br from-brand-700 via-brand-600 to-brand-500 p-5 text-white shadow-elevated transition active:scale-[0.99]"
    >
      <span className="pointer-events-none absolute -right-12 -top-14 h-44 w-44 rounded-full bg-white/10" />
      <span className="pointer-events-none absolute -bottom-20 -left-12 h-40 w-40 rounded-full bg-white/5" />

      <div className="relative">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-bold uppercase tracking-widest text-white/70">
            Next up
          </span>
          <span className="rounded-full bg-white/15 px-2 py-0.5 text-[10px] font-bold tracking-wide">
            {job.code}
          </span>
        </div>

        <h2 className="mt-1.5 text-[21px] font-extrabold leading-tight tracking-tight">
          {job.customerName}
        </h2>
        <p className="mt-1 flex items-center gap-1 text-[12px] text-white/80">
          <PinIcon size={13} />
          <span className="truncate">{job.address}</span>
        </p>

        <div className="mt-3.5 flex flex-wrap items-center gap-1.5">
          <span className="rounded-full bg-white/15 px-2.5 py-1 text-[11px] font-semibold">
            {total - done} {total - done === 1 ? 'service' : 'services'} left
          </span>
          {job.status === 'started' ? (
            <JobTimer job={job} variant="chip" />
          ) : (
            <span className="rounded-full bg-white/15 px-2.5 py-1 text-[11px] font-semibold">
              {slotHint(job.slotStart)}
            </span>
          )}
          {job.priority === 'urgent' && (
            <span className="rounded-full bg-danger px-2.5 py-1 text-[11px] font-bold">Urgent</span>
          )}
        </div>

        <div className="mt-4 flex items-center justify-between">
          <span className="text-[11px] font-medium text-white/70">
            {done}/{total} completed
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white px-3.5 py-1.5 text-[12px] font-bold text-brand-700">
            {job.status === 'started' ? 'Resume' : 'Start job'}
            <ArrowRightIcon size={14} />
          </span>
        </div>
      </div>
    </Link>
  )
}

export function JobsScreen() {
  const name = useSession((state) => state.name)
  const role = useSession((state) => state.role)
  const dailyTarget = useSession((state) => state.dailyTarget)
  const jobs = useLiveQuery(() => db.jobs.toArray(), [])
  const [filter, setFilter] = useState<Filter>('active')

  const { pendingServices, todayJobs, overdueJobs, activeJobs, nextJob, completedToday, counts, visible } =
    useMemo(() => {
      const all = jobs ?? []
      const active = all.filter((job) => job.status !== 'completed' && job.status !== 'cancelled')
      const now = new Date()

      const pending = active.reduce(
        (count, job) => count + job.services.filter((service) => service.status !== 'done').length,
        0
      )
      const today = all.filter((job) => sameDay(new Date(job.slotStart), now))
      const overdue = active.filter((job) => new Date(job.slaDue).getTime() < Date.now())

      const ranked = [...active].sort((a, b) => {
        if (a.status === 'started' && b.status !== 'started') return -1
        if (b.status === 'started' && a.status !== 'started') return 1
        return new Date(a.slaDue).getTime() - new Date(b.slaDue).getTime()
      })

      const list = filter === 'active' ? active : filter === 'today' ? today : all
      const sorted = [...list].sort((a, b) => {
        if (a.status === 'completed' && b.status !== 'completed') return 1
        if (b.status === 'completed' && a.status !== 'completed') return -1
        return new Date(a.slaDue).getTime() - new Date(b.slaDue).getTime()
      })

      return {
        pendingServices: pending,
        todayJobs: today.length,
        overdueJobs: overdue.length,
        activeJobs: active.length,
        nextJob: ranked[0],
        completedToday: completedVisitsOn(all, now),
        counts: { active: active.length, today: today.length, all: all.length },
        visible: sorted
      }
    }, [jobs, filter])

  const filters: Array<{ value: Filter; label: string; count: number }> = [
    { value: 'active', label: 'Active', count: counts.active },
    { value: 'today', label: 'Today', count: counts.today },
    { value: 'all', label: 'All', count: counts.all }
  ]

  return (
    <div className="space-y-5 pb-6">
      <header className="px-4 pt-5">
        <p className="text-[10px] font-bold uppercase tracking-widest text-ink-mute">
          {new Date().toLocaleDateString('en-IN', {
            weekday: 'long',
            day: '2-digit',
            month: 'short'
          })}
        </p>
        <h1 className="mt-1 text-[26px] font-extrabold leading-tight tracking-tight text-ink">
          {greeting()}, {name.split(' ')[0]}
        </h1>
        <p className="mt-1 text-[13px] text-ink-mute">
          {pendingServices > 0
            ? `${pendingServices} service${pendingServices === 1 ? '' : 's'} pending across ${activeJobs} job${activeJobs === 1 ? '' : 's'}.`
            : 'Everything is clear for today.'}
        </p>
      </header>

      {role === 'technician' && dailyTarget > 0 && (
        <section className="px-4">
          <ShiftCard done={completedToday} target={dailyTarget} />
        </section>
      )}

      {nextJob && (
        <section className="px-4">
          <NextJobHero job={nextJob} />
        </section>
      )}

      <section className="grid grid-cols-3 gap-2.5 px-4">
        <Stat
          icon={<LayersIcon size={16} />}
          label="Pending"
          value={pendingServices}
          tone="brand"
        />
        <Stat icon={<BriefcaseIcon size={16} />} label="Jobs today" value={todayJobs} />
        <Stat
          icon={<AlertIcon size={16} />}
          label="Overdue"
          value={overdueJobs}
          tone={overdueJobs > 0 ? 'danger' : 'ok'}
          hint={overdueJobs > 0 ? 'SLA breached' : 'On track'}
        />
      </section>

      <section className="px-4">
        <SectionHeader
          title="Service board"
          subtitle="Pending work first, then slot order"
          action={
            <span className="text-[11px] font-semibold text-ink-mute">
              {visible.length} job{visible.length === 1 ? '' : 's'}
            </span>
          }
        />

        <div className="mb-3 flex gap-1.5">
          {filters.map((item) => (
            <button
              key={item.value}
              type="button"
              onClick={() => setFilter(item.value)}
              aria-pressed={filter === item.value}
              className={clsx(
                'flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[12px] font-bold transition active:scale-95',
                filter === item.value
                  ? 'bg-brand-600 text-white shadow-card'
                  : 'border border-surface-line bg-white text-ink-soft'
              )}
            >
              {item.label}
              <span
                className={clsx(
                  'rounded-full px-1.5 py-0.5 text-[10px] tabular',
                  filter === item.value
                    ? 'bg-white/20 text-white'
                    : 'bg-surface-sunken text-ink-mute'
                )}
              >
                {item.count}
              </span>
            </button>
          ))}
        </div>

        {jobs === undefined ? (
          <div className="space-y-3">
            {[0, 1, 2].map((key) => (
              <div
                key={key}
                className="rounded-2xl border border-surface-line bg-white p-4 shadow-card"
              >
                <div className="skeleton h-2.5 w-16" />
                <div className="skeleton mt-2 h-4 w-40" />
                <div className="skeleton mt-2 h-3 w-52" />
                <div className="mt-4 flex gap-2">
                  <div className="skeleton h-5 w-20" />
                  <div className="skeleton h-5 w-16" />
                </div>
              </div>
            ))}
          </div>
        ) : visible.length === 0 ? (
          <EmptyState
            icon={<BriefcaseIcon size={20} />}
            title="Nothing pending here"
            body={
              filter === 'active'
                ? 'All assigned jobs are closed. Switch to All to review completed work.'
                : 'No jobs match this filter.'
            }
          />
        ) : (
          <div className="space-y-3">
            {visible.map((job) => (
              <JobCard key={job.id} job={job} />
            ))}
          </div>
        )}
      </section>

      <div className="px-4">
        <Link
          to="/estimates"
          className="flex items-center justify-between rounded-2xl border border-surface-line bg-white px-4 py-3.5 shadow-card transition active:scale-[0.99]"
        >
          <span>
            <span className="block text-[13px] font-bold text-ink">On-site estimate</span>
            <span className="block text-[11px] text-ink-mute">
              Gas, fire alarm, quotation and AMC tools
            </span>
          </span>
          <Badge tone="brand">Open</Badge>
        </Link>
      </div>
    </div>
  )
}

