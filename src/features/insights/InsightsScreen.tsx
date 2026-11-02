import { useMemo, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import clsx from 'clsx'
import { db } from '@/db/db'
import { Badge, Card, EmptyState, SectionHeader, Stat } from '@/components/ui/display'
import { AlertIcon, CheckIcon, ClockIcon, TimerIcon } from '@/components/ui/icons'
import { formatDuration } from '@/domain/shared/id'

type Period = '7' | '30'

const DAY = 86_400_000

export function InsightsScreen() {
  const jobs = useLiveQuery(() => db.jobs.toArray(), [])
  const [period, setPeriod] = useState<Period>('7')

  const data = useMemo(() => {
    const all = jobs ?? []
    const days = Number(period)
    const since = Date.now() - days * DAY

    const inPeriod = all.filter((job) => new Date(job.createdAt).getTime() >= since)
    const completed = all.filter(
      (job) => job.completedAt && new Date(job.completedAt).getTime() >= since
    )

    const withDuration = completed.filter((job) => job.startedAt && job.completedAt)
    const totalSeconds = withDuration.reduce(
      (sum, job) =>
        sum +
        Math.max(
          0,
          (new Date(job.completedAt as string).getTime() - new Date(job.startedAt as string).getTime()) / 1000
        ),
      0
    )
    const avgSeconds = withDuration.length > 0 ? totalSeconds / withDuration.length : 0

    const issues = inPeriod.flatMap((job) => job.issues)
    const resolvedIssues = issues.filter((issue) => issue.resolvedAt)
    const avgResolutionHours =
      resolvedIssues.length > 0
        ? resolvedIssues.reduce(
            (sum, issue) =>
              sum +
              (new Date(issue.resolvedAt as string).getTime() - new Date(issue.raisedAt).getTime()) /
                3_600_000,
            0
          ) / resolvedIssues.length
        : 0

    const openByClient = new Map<string, number>()
    for (const job of all) {
      const open = job.issues.filter((issue) => !issue.resolvedAt).length
      if (open > 0) openByClient.set(job.customerName, (openByClient.get(job.customerName) ?? 0) + open)
    }
    const clientRows = [...openByClient.entries()].sort((a, b) => b[1] - a[1])

    const planned = all.filter((job) => {
      if (job.status === 'cancelled') return false
      const slot = new Date(job.slotStart).getTime()
      // Only work scheduled inside the window counts as planned, not future jobs.
      return Number.isFinite(slot) && slot >= since && slot <= Date.now()
    })
    const completedPlanned = planned.filter((job) => job.status === 'completed')
    const overdue = all.filter(
      (job) =>
        job.status !== 'completed' &&
        job.status !== 'cancelled' &&
        new Date(job.slaDue).getTime() < Date.now()
    )

    const rated = completed.filter((job) => job.rating)
    const avgRating = rated.length > 0 ? rated.reduce((sum, job) => sum + (job.rating ?? 0), 0) / rated.length : 0
    const cleanJobs = completed.filter((job) => job.issues.every((issue) => issue.severity !== 'critical'))
    const firstTimeFix = completed.length > 0 ? (cleanJobs.length / completed.length) * 100 : 0

    const week: Array<{ label: string; count: number }> = []
    for (let offset = 6; offset >= 0; offset -= 1) {
      const day = new Date(Date.now() - offset * DAY)
      const count = all.filter(
        (job) => job.completedAt && new Date(job.completedAt).toDateString() === day.toDateString()
      ).length
      week.push({ label: day.toLocaleDateString('en-IN', { weekday: 'short' }), count })
    }

    return {
      totalSeconds,
      avgSeconds,
      completedCount: completed.length,
      issueCount: issues.length,
      avgResolutionHours,
      clientRows,
      plannedCount: planned.length,
      completedPlannedCount: completedPlanned.length,
      overdue,
      avgRating,
      firstTimeFix,
      week
    }
  }, [jobs, period])

  const maxBar = Math.max(1, ...data.week.map((day) => day.count))
  const completionRate = data.plannedCount > 0 ? Math.round((data.completedPlannedCount / data.plannedCount) * 100) : 0

  return (
    <div className="space-y-5 px-4 pb-6 pt-5">
      <header>
        <p className="text-[10px] font-bold uppercase tracking-widest text-ink-mute">Performance</p>
        <h1 className="mt-1 text-[26px] font-extrabold leading-tight tracking-tight text-ink">
          Productivity
        </h1>
        <p className="mt-1 text-[13px] text-ink-mute">
          Time on site first, then issues and SLA health.
        </p>
      </header>

      <div className="flex gap-1.5">
        {(['7', '30'] as Period[]).map((value) => (
          <button
            key={value}
            type="button"
            onClick={() => setPeriod(value)}
            aria-pressed={period === value}
            className={clsx(
              'rounded-full px-3.5 py-1.5 text-[12px] font-bold transition active:scale-95',
              period === value
                ? 'bg-brand-600 text-white shadow-card'
                : 'border border-surface-line bg-white text-ink-soft'
            )}
          >
            Last {value} days
          </button>
        ))}
      </div>

      <section className="grid grid-cols-2 gap-2.5">
        <Stat
          icon={<TimerIcon size={16} />}
          label="Time on site"
          value={formatDuration(data.totalSeconds)}
          hint={`${data.completedCount} completed job(s)`}
          tone="brand"
        />
        <Stat
          icon={<ClockIcon size={16} />}
          label="Avg per job"
          value={formatDuration(data.avgSeconds)}
          hint="Check-in to sign-off"
        />
        <Stat
          icon={<AlertIcon size={16} />}
          label="Issues raised"
          value={data.issueCount}
          hint={
            data.avgResolutionHours > 0
              ? `Avg fix ${data.avgResolutionHours.toFixed(1)} h`
              : 'No resolutions yet'
          }
          tone={data.issueCount > 0 ? 'warn' : 'ok'}
        />
        <Stat
          icon={<CheckIcon size={16} />}
          label="Planned vs done"
          value={`${data.completedPlannedCount}/${data.plannedCount}`}
          hint={`${completionRate}% completion`}
          tone={completionRate >= 80 ? 'ok' : 'warn'}
        />
      </section>

      <section>
        <SectionHeader title="Open issues by client" subtitle="Unresolved findings from service visits" />
        {data.clientRows.length === 0 ? (
          <EmptyState title="No open issues" body="Every reported finding has been resolved." />
        ) : (
          <Card className="divide-y divide-surface-line">
            {data.clientRows.map(([client, count]) => (
              <div key={client} className="flex items-center justify-between px-3.5 py-2.5">
                <span className="truncate text-sm font-semibold text-ink">{client}</span>
                <Badge tone={count > 2 ? 'danger' : 'warn'}>{count} open</Badge>
              </div>
            ))}
          </Card>
        )}
      </section>

      <section>
        <SectionHeader title="Overdue" subtitle="SLA breached and still open" />
        {data.overdue.length === 0 ? (
          <Card className="border-ok/30 bg-ok-soft/60 px-3.5 py-3 text-sm font-semibold text-ok">
            Nothing overdue right now.
          </Card>
        ) : (
          <Card className="divide-y divide-surface-line">
            {data.overdue.map((job) => (
              <div key={job.id} className="flex items-center justify-between gap-3 px-3.5 py-2.5">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-ink">{job.customerName}</p>
                  <p className="text-[11px] text-ink-mute">{job.code}</p>
                </div>
                <Badge tone="danger">
                  {Math.max(1, Math.round((Date.now() - new Date(job.slaDue).getTime()) / 60000))}m late
                </Badge>
              </div>
            ))}
          </Card>
        )}
      </section>

      <section>
        <SectionHeader title="Weekly scorecard" subtitle="Last 7 days" />
        <Card className="p-3.5">
          <div className="relative">
            <div className="pointer-events-none absolute inset-x-0 top-0 h-20">
              {[0, 33, 66, 100].map((position) => (
                <span
                  key={position}
                  className="absolute inset-x-0 border-t border-dashed border-surface-line"
                  style={{ top: `${position}%` }}
                />
              ))}
            </div>
            <div className="relative flex h-24 items-end gap-2">
              {data.week.map((day, index) => (
                <div key={day.label} className="flex flex-1 flex-col items-center gap-1">
                  <span className="tabular text-[9px] font-bold text-ink-mute">
                    {day.count || ''}
                  </span>
                  <div
                    className={clsx(
                      'w-full rounded-t-md transition-all',
                      index === data.week.length - 1
                        ? 'bg-gradient-to-t from-brand-600 to-brand-400'
                        : 'bg-brand-300'
                    )}
                    style={{ height: `${Math.max(3, (day.count / maxBar) * 72)}px` }}
                    aria-label={`${day.count} completed on ${day.label}`}
                  />
                  <span className="text-[9px] font-semibold text-ink-mute">{day.label}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2 border-t border-surface-line pt-3 text-xs">
            <div>
              <p className="text-ink-mute">Average rating</p>
              <p className="text-lg font-extrabold text-ink">
                {data.avgRating > 0 ? `${data.avgRating.toFixed(1)} / 5` : '—'}
              </p>
            </div>
            <div>
              <p className="text-ink-mute">No critical findings</p>
              <p className="text-lg font-extrabold text-ink">{Math.round(data.firstTimeFix)}%</p>
            </div>
          </div>
        </Card>
      </section>
    </div>
  )
}
