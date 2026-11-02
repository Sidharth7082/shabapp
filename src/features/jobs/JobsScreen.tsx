import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import clsx from 'clsx'
import { db } from '@/db/db'
import { EmptyState, SectionHeader } from '@/components/ui/display'
import {
  ArrowRightIcon,
  BriefcaseIcon,
  PinIcon,
  SearchIcon,
  UserIcon,
  XIcon
} from '@/components/ui/icons'
import { useSession } from '@/services/session'
import { servicesDone, type ServiceJob } from '@/domain/jobs/types'
import {
  BOARD_FILTERS,
  BOARD_FILTER_LABEL,
  boardCounts,
  dashboardAlerts,
  etaLabel,
  filterBoardJobs,
  isOpenJob,
  pendingServicesByJob,
  recentCompleted,
  todayOverview,
  totalPendingServices,
  upcomingJobs,
  weeklyPoints,
  type BoardFilter
} from '@/domain/jobs/dashboard'
import {
  AlertsPanel,
  HistoryPanel,
  PointsPanel,
  QuickActionsPanel,
  SchedulePanel,
  TodayOverviewPanel
} from './DashboardPanels'
import { JobCard } from './JobCard'
import { JobTimer } from './JobTimer'

function greeting(): string {
  const hour = new Date().getHours()
  if (hour < 12) return 'Good morning'
  if (hour < 17) return 'Good afternoon'
  return 'Good evening'
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
        <p className="mt-0.5 flex items-center gap-1 text-[11px] text-white/70">
          <UserIcon size={12} />
          <span className="truncate">
            {job.contactName} · {job.phone}
          </span>
        </p>

        <div className="mt-3.5 flex flex-wrap items-center gap-1.5">
          <span className="rounded-full bg-white/15 px-2.5 py-1 text-[11px] font-semibold">
            {total - done} {total - done === 1 ? 'service' : 'services'} left
          </span>
          {job.status === 'started' ? (
            <JobTimer job={job} variant="chip" />
          ) : (
            <span className="rounded-full bg-white/15 px-2.5 py-1 text-[11px] font-semibold">
              {etaLabel(job.slotStart)}
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
  const [filter, setFilter] = useState<BoardFilter>('active')
  const [query, setQuery] = useState('')

  const {
    pendingRows,
    pendingServices,
    openJobs,
    overview,
    alerts,
    week,
    upcoming,
    history,
    counts,
    visible,
    nextJob
  } = useMemo(() => {
    const all = jobs ?? []
    const now = new Date()
    const active = all.filter(isOpenJob)
    const ranked = [...active].sort((a, b) => {
      if (a.status === 'started' && b.status !== 'started') return -1
      if (b.status === 'started' && a.status !== 'started') return 1
      if (a.priority === 'urgent' && b.priority !== 'urgent') return -1
      if (b.priority === 'urgent' && a.priority !== 'urgent') return 1
      return new Date(a.slaDue).getTime() - new Date(b.slaDue).getTime()
    })

    return {
      pendingRows: pendingServicesByJob(all),
      pendingServices: totalPendingServices(all),
      openJobs: active.length,
      overview: todayOverview(all, dailyTarget, now),
      alerts: dashboardAlerts(all, now),
      week: weeklyPoints(all, now),
      upcoming: upcomingJobs(all, now),
      history: recentCompleted(all),
      counts: boardCounts(all, now),
      visible: filterBoardJobs(all, filter, query, now),
      nextJob: ranked[0]
    }
  }, [jobs, dailyTarget, filter, query])

  const showHistory = () => {
    setFilter('completed')
    setQuery('')
    requestAnimationFrame(() => {
      document
        .getElementById('service-board')
        ?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    })
  }

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
            ? `${pendingServices} service${pendingServices === 1 ? '' : 's'} pending across ${openJobs} open job${openJobs === 1 ? '' : 's'}.`
            : 'Everything is clear for today.'}
        </p>
      </header>

      <AlertsPanel alerts={alerts} />

      <TodayOverviewPanel overview={overview} pending={pendingRows} />

      {nextJob && (
        <section className="px-4">
          <NextJobHero job={nextJob} />
        </section>
      )}

      <QuickActionsPanel role={role} nextJob={nextJob} />

      <section id="service-board" className="scroll-mt-20 px-4">
        <SectionHeader
          title="Service board"
          subtitle={query ? `Search results for “${query}”` : 'Pending work first, then slot order'}
          action={
            <span className="text-[11px] font-semibold text-ink-mute">
              {visible.length} job{visible.length === 1 ? '' : 's'}
            </span>
          }
        />

        <div className="relative mb-2">
          <SearchIcon
            size={15}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-mute"
          />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            type="search"
            enterKeyHint="search"
            placeholder="Search customer, job ID, location or status"
            aria-label="Search jobs"
            className="h-11 w-full rounded-xl border border-surface-line bg-white pl-9 pr-9 text-[13px] font-semibold text-ink outline-none placeholder:font-normal placeholder:text-ink-mute focus:border-brand-400"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery('')}
              aria-label="Clear search"
              className="absolute right-1.5 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg text-ink-mute transition active:bg-surface-sunken"
            >
              <XIcon size={15} />
            </button>
          )}
        </div>

        <div className="mb-3 flex flex-wrap gap-1.5">
          {BOARD_FILTERS.map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => setFilter(value)}
              aria-pressed={filter === value}
              className={clsx(
                'flex items-center gap-1.5 rounded-full px-2.5 py-1.5 text-[11.5px] font-bold transition active:scale-95',
                filter === value
                  ? 'bg-brand-600 text-white shadow-card'
                  : 'border border-surface-line bg-white text-ink-soft'
              )}
            >
              {BOARD_FILTER_LABEL[value]}
              <span
                className={clsx(
                  'tabular rounded-full px-1.5 py-0.5 text-[10px]',
                  filter === value
                    ? 'bg-white/20 text-white'
                    : 'bg-surface-sunken text-ink-mute'
                )}
              >
                {counts[value]}
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
            title={query ? 'No matching jobs' : filter === 'completed' ? 'No closed visits yet' : 'Nothing pending here'}
            body={
              query
                ? 'Try a customer name, job ID, area, service or status such as “overdue”.'
                : filter === 'completed'
                  ? 'Visits you close on this device are kept here with their photos and rating.'
                  : filter === 'active'
                    ? 'All assigned jobs are closed. Switch to All to review completed work.'
                    : 'No jobs match this filter.'
            }
            action={
              query ? (
                <button
                  type="button"
                  onClick={() => setQuery('')}
                  className="rounded-xl border border-surface-line bg-white px-4 py-2 text-[12px] font-bold text-brand-600"
                >
                  Clear search
                </button>
              ) : undefined
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

      <PointsPanel week={week} points={overview.points} target={dailyTarget} />

      <SchedulePanel jobs={upcoming} />

      <HistoryPanel jobs={history} onViewAll={showHistory} />

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
          <span className="rounded-full border border-brand-100 bg-brand-50 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-brand-700">
            Open
          </span>
        </Link>
      </div>
    </div>
  )
}

