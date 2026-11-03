import { Link } from 'react-router-dom'
import clsx from 'clsx'
import { Badge, Card, SectionHeader } from '@/components/ui/display'
import {
  AlertIcon,
  BellIcon,
  CalendarIcon,
  CalculatorIcon,
  ChevronRightIcon,
  ClockIcon,
  HistoryIcon,
  PhoneIcon,
  PlusIcon,
  StarIcon,
  WrenchIcon
} from '@/components/ui/icons'
import {
  etaLabel,
  sameDay,
  weeklyTotal,
  type DashboardAlert,
  type DayPoints,
  type PendingByJob,
  type TodayOverview
} from '@/domain/jobs/dashboard'
import type { ServiceJob } from '@/domain/jobs/types'
import { can, type Role } from '@/domain/auth/roles'

const alertTones: Record<DashboardAlert['tone'], string> = {
  danger: 'bg-danger-soft text-danger',
  warn: 'bg-warn-soft text-warn',
  info: 'bg-info-soft text-info'
}

export function AlertsPanel({ alerts }: { alerts: DashboardAlert[] }) {
  if (alerts.length === 0) return null
  return (
    <section className="px-4" aria-labelledby="needs-attention">
      <SectionHeader
        title="Needs attention"
        subtitle="Derived from this device — push arrives with the backend"
        action={
          <span className="inline-flex items-center gap-1 rounded-full bg-danger-soft px-2.5 py-1 text-[11px] font-bold text-danger">
            <BellIcon size={12} /> {alerts.length}
          </span>
        }
      />
      <Card className="divide-y divide-surface-line">
        {alerts.map((alert) => {
          const body = (
            <span className="flex items-start gap-2.5 px-3.5 py-2.5">
              <span
                className={clsx(
                  'mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg',
                  alertTones[alert.tone]
                )}
              >
                <AlertIcon size={14} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[12.5px] font-bold text-ink">{alert.title}</span>
                <span className="block truncate text-[11px] text-ink-mute">{alert.detail}</span>
              </span>
              {alert.jobId && <ChevronRightIcon size={14} className="mt-1.5 text-ink-mute" />}
            </span>
          )
          return alert.jobId ? (
            <Link
              key={alert.id}
              to={`/jobs/${alert.jobId}`}
              className="block transition active:bg-surface-sunken"
            >
              {body}
            </Link>
          ) : (
            <div key={alert.id}>{body}</div>
          )
        })}
      </Card>
      <span id="needs-attention" className="sr-only">
        Notifications
      </span>
    </section>
  )
}

function Metric({
  label,
  value,
  suffix,
  tone = 'ink'
}: {
  label: string
  value: number
  suffix?: string
  tone?: 'ink' | 'danger' | 'ok'
}) {
  return (
    <div className="px-1 text-center first:pl-0 last:pr-0">
      <p
        className={clsx(
          'tabular text-[20px] font-extrabold leading-none',
          tone === 'danger' ? 'text-danger' : tone === 'ok' ? 'text-ok' : 'text-ink'
        )}
      >
        {value}
        {suffix && <span className="ml-0.5 text-[10px] font-semibold text-ink-mute">{suffix}</span>}
      </p>
      <p className="mt-1 text-[9px] font-bold uppercase leading-tight tracking-wider text-ink-mute">
        {label}
      </p>
    </div>
  )
}

export function TodayOverviewPanel({
  overview,
  pending
}: {
  overview: TodayOverview
  pending: PendingByJob[]
}) {
  const pendingTotal = pending.reduce((sum, row) => sum + row.pending, 0)

  return (
    <section className="px-4">
      <SectionHeader
        title="Today's overview"
        subtitle={
          overview.todayTotal > 0
            ? `${overview.todayTotal} visit${overview.todayTotal === 1 ? '' : 's'} on the board today`
            : 'No visits scheduled today'
        }
        action={
          overview.target > 0 ? (
            <Badge tone={overview.targetPct >= 100 ? 'ok' : 'brand'}>
              {overview.targetPct}% of target
            </Badge>
          ) : undefined
        }
      />
      <Card className="p-3.5">
        <div className="grid grid-cols-4 divide-x divide-surface-line">
          <Metric label="Completed" value={overview.completed} tone="ok" />
          <Metric label="Remaining" value={overview.remaining} />
          <Metric
            label="Points earned"
            value={overview.points}
            suffix={overview.target > 0 ? `/${overview.target}` : undefined}
          />
          <Metric
            label="Overdue"
            value={overview.overdueCount}
            tone={overview.overdueCount > 0 ? 'danger' : 'ink'}
          />
        </div>

        {overview.target > 0 && (
          <div className="mt-3">
            <div className="h-2 overflow-hidden rounded-full bg-surface-line">
              <div
                className={clsx(
                  'h-full rounded-full transition-[width] duration-500',
                  overview.targetPct >= 100 ? 'bg-ok' : 'bg-brand-500'
                )}
                style={{ width: `${overview.targetPct}%` }}
              />
            </div>
            <p className="mt-1.5 text-[10.5px] leading-4 text-ink-mute">
              {overview.targetPct >= 100
                ? `${overview.points} points — today’s target is met.`
                : `${overview.points} of ${overview.target} points (${overview.targetPct}%). One completed house = one point.`}
            </p>
          </div>
        )}

        {overview.overdueCount > 0 && overview.overdueJob ? (
          <Link
            to={`/jobs/${overview.overdueJob.id}`}
            className="mt-2.5 flex items-center gap-2 rounded-xl bg-danger-soft px-2.5 py-2 transition active:scale-[0.99]"
          >
            <AlertIcon size={14} className="text-danger" />
            <span className="min-w-0 flex-1 truncate text-[11px] font-semibold text-danger">
              {overview.overdueJob.code} · {overview.overdueJob.customerName} is overdue
            </span>
            <ChevronRightIcon size={13} className="text-danger" />
          </Link>
        ) : null}

        {pending.length > 0 && (
          <div className="mt-3 border-t border-surface-line pt-2.5">
            <p className="text-[9px] font-bold uppercase tracking-widest text-ink-mute">
              Pending services by job · <span className="tabular text-ink-soft">{pendingTotal}</span>
            </p>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {pending.map(({ job, pending: count, total }) => (
                <Link
                  key={job.id}
                  to={`/jobs/${job.id}`}
                  className="rounded-lg bg-surface-sunken px-2 py-1 text-[10px] font-semibold text-ink-soft transition active:scale-95"
                >
                  {job.code} · {count}/{total}
                </Link>
              ))}
            </div>
          </div>
        )}
      </Card>
    </section>
  )
}

export function QuickActionsPanel({
  role,
  nextJob
}: {
  role: Role
  nextJob?: ServiceJob
}) {
  const actionClass =
    'flex min-h-[68px] flex-col items-center justify-center gap-1.5 rounded-2xl border border-surface-line bg-white px-2 py-3 text-center text-[10.5px] font-bold text-ink shadow-card transition active:scale-[0.97]'
  const iconClass = 'flex h-8 w-8 items-center justify-center rounded-xl bg-brand-50 text-brand-600'

  return (
    <section className="px-4">
      <SectionHeader title="Quick actions" subtitle="The three things you do most" />
      <div className="grid grid-cols-3 gap-2">
        {can(role, 'jobs:create') ? (
          <Link to="/control" className={actionClass}>
            <span className={iconClass}>
              <PlusIcon size={16} />
            </span>
            Add job
          </Link>
        ) : (
          <Link to="/estimates" className={actionClass}>
            <span className={iconClass}>
              <CalculatorIcon size={16} />
            </span>
            New estimate
          </Link>
        )}

        {nextJob ? (
          <Link to={`/jobs/${nextJob.id}`} className={actionClass}>
            <span className={iconClass}>
              <WrenchIcon size={16} />
            </span>
            Update status
          </Link>
        ) : (
          <span className={clsx(actionClass, 'opacity-50')} aria-disabled="true">
            <span className={iconClass}>
              <WrenchIcon size={16} />
            </span>
            Update status
          </span>
        )}

        {nextJob ? (
          <a href={`tel:${nextJob.phone}`} className={actionClass}>
            <span className={iconClass}>
              <PhoneIcon size={16} />
            </span>
            Call customer
          </a>
        ) : (
          <span className={clsx(actionClass, 'opacity-50')} aria-disabled="true">
            <span className={iconClass}>
              <PhoneIcon size={16} />
            </span>
            Call customer
          </span>
        )}
      </div>
    </section>
  )
}

export function PointsPanel({
  week,
  points,
  target
}: {
  week: DayPoints[]
  points: number
  target: number
}) {
  const total = weeklyTotal(week)
  const max = Math.max(1, ...week.map((day) => day.points))
  const pct = target > 0 ? Math.min(100, Math.round((points / target) * 100)) : 0

  return (
    <section className="px-4">
      <SectionHeader
        title="Points & performance"
        subtitle="Daily points and the last seven days"
        action={<Badge tone="brand">{total} this week</Badge>}
      />
      <Card className="p-4">
        <div className="flex items-end justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[9px] font-bold uppercase tracking-widest text-ink-mute">
              Today’s points
            </p>
            <p className="mt-1 text-[24px] font-extrabold leading-none tracking-tight text-ink">
              <span className="tabular">{points}</span>
              {target > 0 && (
                <span className="tabular text-[12px] font-semibold text-ink-mute"> / {target}</span>
              )}
              <span className="ml-1.5 text-[11px] font-semibold text-ink-mute">
                {target > 0 ? `${pct}% of daily target` : 'completed houses'}
              </span>
            </p>
          </div>
          <span className="inline-flex items-center gap-1 rounded-full bg-brand-50 px-2.5 py-1 text-[11px] font-bold text-brand-700">
            <StarIcon size={12} /> 1 house = 1 point
          </span>
        </div>

        <div className="mt-3.5 grid grid-cols-7 items-end gap-1.5">
          {week.map((day, index) => {
            const height = day.points === 0 ? 4 : Math.max(10, Math.round((day.points / max) * 100))
            const today = index === week.length - 1
            return (
              <div key={`${day.label}-${index}`} className="flex flex-col items-center gap-1">
                <span className="tabular text-[9px] font-bold text-ink-soft">{day.points}</span>
                <div
                  className="flex h-14 w-full items-end overflow-hidden rounded-md bg-surface-sunken"
                  role="img"
                  aria-label={`${day.label}: ${day.points} point${day.points === 1 ? '' : 's'}`}
                >
                  <div
                    className={clsx(
                      'w-full rounded-md transition-[height] duration-500',
                      day.points === 0 ? 'bg-surface-line' : today ? 'bg-brand-700' : 'bg-brand-400'
                    )}
                    style={{ height: `${height}%` }}
                  />
                </div>
                <span
                  className={clsx(
                    'text-[9px] font-semibold',
                    today ? 'text-brand-700' : 'text-ink-mute'
                  )}
                >
                  {day.label}
                </span>
              </div>
            )
          })}
        </div>
        <p className="mt-2 text-[10px] leading-4 text-ink-mute">
          {total === 0
            ? 'No houses closed in the last seven days on this device.'
            : `${total} house${total === 1 ? '' : 's'} closed this week. Inner services in a visit do not add points.`}
        </p>
      </Card>
    </section>
  )
}

export function SchedulePanel({ jobs }: { jobs: ServiceJob[] }) {
  return (
    <section className="px-4">
      <SectionHeader
        title="Upcoming schedule"
        subtitle="Estimated arrival from the customer slot"
        action={
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-ink-mute">
            <CalendarIcon size={12} /> {jobs.length}
          </span>
        }
      />
      {jobs.length === 0 ? (
        <Card className="px-3.5 py-3 text-[12px] font-medium text-ink-mute">
          No more visits are scheduled. New assignments appear here.
        </Card>
      ) : (
        <Card className="divide-y divide-surface-line">
          {jobs.map((job) => (
            <Link
              key={job.id}
              to={`/jobs/${job.id}`}
              className="flex items-center gap-3 px-3.5 py-2.5 transition active:bg-surface-sunken"
            >
              <span className="w-[52px] shrink-0 text-center">
                <span className="tabular block text-[12px] font-extrabold leading-tight text-ink">
                  {sameDay(new Date(job.slotStart), new Date())
                    ? new Date(job.slotStart).toLocaleTimeString('en-IN', {
                        hour: '2-digit',
                        minute: '2-digit'
                      })
                    : new Date(job.slotStart).toLocaleDateString('en-IN', {
                        day: '2-digit',
                        month: 'short'
                      })}
                </span>
                <span className="block text-[9px] font-semibold text-ink-mute">
                  {etaLabel(job.slotStart)}
                </span>
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[13px] font-bold text-ink">
                  {job.customerName}
                </span>
                <span className="block truncate text-[11px] text-ink-mute">{job.address}</span>
              </span>
              <Badge tone={job.priority === 'urgent' ? 'danger' : 'neutral'}>{job.code}</Badge>
              <ChevronRightIcon size={14} className="text-ink-mute" />
            </Link>
          ))}
        </Card>
      )}
    </section>
  )
}

export function HistoryPanel({
  jobs,
  onViewAll
}: {
  jobs: ServiceJob[]
  onViewAll: () => void
}) {
  return (
    <section className="px-4">
      <SectionHeader
        title="Job history"
        subtitle="Recently completed visits"
        action={
          <button
            type="button"
            onClick={onViewAll}
            className="text-[11px] font-bold text-brand-600 transition active:opacity-70"
          >
            View all
          </button>
        }
      />
      {jobs.length === 0 ? (
        <Card className="flex items-center gap-2.5 px-3.5 py-3 text-[12px] font-medium text-ink-mute">
          <HistoryIcon size={15} className="text-ink-mute" />
          Closed visits will appear here with their rating and services.
        </Card>
      ) : (
        <Card className="divide-y divide-surface-line">
          {jobs.map((job) => (
            <Link
              key={job.id}
              to={`/jobs/${job.id}`}
              className="flex items-center gap-3 px-3.5 py-2.5 transition active:bg-surface-sunken"
            >
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-ok-soft text-ok">
                <ClockIcon size={14} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[13px] font-bold text-ink">
                  {job.customerName}
                </span>
                <span className="block truncate text-[11px] text-ink-mute">
                  {job.code} ·{' '}
                  {job.completedAt
                    ? new Date(job.completedAt).toLocaleDateString('en-IN', {
                        day: '2-digit',
                        month: 'short'
                      })
                    : 'Closed'}{' '}
                  · {job.services.length} service{job.services.length === 1 ? '' : 's'}
                </span>
              </span>
              {job.rating ? (
                <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-warn">
                  <StarIcon size={11} /> {job.rating}.0
                </span>
              ) : (
                <Badge tone="ok">Done</Badge>
              )}
              <ChevronRightIcon size={14} className="text-ink-mute" />
            </Link>
          ))}
        </Card>
      )}
    </section>
  )
}
