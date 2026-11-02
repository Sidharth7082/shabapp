import { JOB_STATUS_LABEL, completedVisitsOn, type ServiceJob } from './types'

/**
 * Pure dashboard helpers: board filtering, search, alerts and the small
 * summaries shown on the jobs screen. No React and no database access, so the
 * numbers are unit-tested instead of eyeballed.
 */

export type BoardFilter = 'active' | 'today' | 'overdue' | 'completed' | 'all'

export const BOARD_FILTER_LABEL: Record<BoardFilter, string> = {
  active: 'Active',
  today: 'Today',
  overdue: 'Overdue',
  completed: 'History',
  all: 'All'
}

export const BOARD_FILTERS: BoardFilter[] = ['active', 'today', 'overdue', 'completed', 'all']

export function isOpenJob(job: Pick<ServiceJob, 'status'>): boolean {
  return job.status !== 'completed' && job.status !== 'cancelled'
}

export function sameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  )
}

export function jobOverdue(job: Pick<ServiceJob, 'status' | 'slaDue'>, now = new Date()): boolean {
  return isOpenJob(job) && new Date(job.slaDue).getTime() < now.getTime()
}

export function overdueMinutes(job: Pick<ServiceJob, 'slaDue'>, now = new Date()): number {
  const due = new Date(job.slaDue).getTime()
  if (!Number.isFinite(due)) return 0
  return Math.max(0, Math.round((now.getTime() - due) / 60_000))
}

/** Search covers customer, job code, location, contact, services and status. */
export function matchesJobQuery(job: ServiceJob, query: string, now = new Date()): boolean {
  const terms = query.trim().toLowerCase().split(/\s+/).filter(Boolean)
  if (terms.length === 0) return true
  const haystack = [
    job.customerName,
    job.code,
    job.address,
    job.area ?? '',
    job.contactName,
    job.status,
    JOB_STATUS_LABEL[job.status],
    isOpenJob(job) ? 'open' : 'closed',
    jobOverdue(job, now) ? 'overdue' : '',
    ...job.services.map((service) => service.name)
  ]
    .join(' ')
    .toLowerCase()
  return terms.every((term) => haystack.includes(term))
}

function sortBoard(jobs: ServiceJob[]): ServiceJob[] {
  return [...jobs].sort((a, b) => {
    if (a.status === 'completed' && b.status !== 'completed') return 1
    if (b.status === 'completed' && a.status !== 'completed') return -1
    if (a.status === 'started' && b.status !== 'started') return -1
    if (b.status === 'started' && a.status !== 'started') return 1
    return new Date(a.slaDue).getTime() - new Date(b.slaDue).getTime() || a.code.localeCompare(b.code)
  })
}

export function filterBoardJobs(
  jobs: ServiceJob[],
  filter: BoardFilter,
  query = '',
  now = new Date()
): ServiceJob[] {
  const matchQuery = (job: ServiceJob) => matchesJobQuery(job, query, now)
  if (filter === 'completed') {
    return jobs
      .filter((job) => job.status === 'completed' && matchQuery(job))
      .sort(
        (a, b) =>
          new Date(b.completedAt ?? b.slaDue).getTime() - new Date(a.completedAt ?? a.slaDue).getTime()
      )
  }
  if (filter === 'all') return sortBoard(jobs.filter(matchQuery))
  if (filter === 'today') {
    return sortBoard(
      jobs.filter((job) => sameDay(new Date(job.slotStart), now) && matchQuery(job))
    )
  }
  if (filter === 'overdue') {
    return sortBoard(jobs.filter((job) => jobOverdue(job, now) && matchQuery(job)))
  }
  return sortBoard(jobs.filter((job) => isOpenJob(job) && matchQuery(job)))
}

export function boardCounts(jobs: ServiceJob[], now = new Date()): Record<BoardFilter, number> {
  return {
    active: jobs.filter(isOpenJob).length,
    today: jobs.filter((job) => sameDay(new Date(job.slotStart), now)).length,
    overdue: jobs.filter((job) => jobOverdue(job, now)).length,
    completed: jobs.filter((job) => job.status === 'completed').length,
    all: jobs.length
  }
}

export interface PendingByJob {
  job: ServiceJob
  pending: number
  total: number
}

export function pendingServicesByJob(jobs: ServiceJob[]): PendingByJob[] {
  return jobs
    .filter(isOpenJob)
    .map((job) => ({
      job,
      pending: job.services.filter((service) => service.status !== 'done').length,
      total: job.services.length
    }))
    .filter((row) => row.pending > 0)
    .sort((a, b) => b.pending - a.pending || a.job.code.localeCompare(b.job.code))
}

export function totalPendingServices(jobs: ServiceJob[]): number {
  return pendingServicesByJob(jobs).reduce((sum, row) => sum + row.pending, 0)
}

export interface TodayOverview {
  completed: number
  remaining: number
  todayTotal: number
  points: number
  target: number
  targetPct: number
  overdueCount: number
  overdueJob?: Pick<ServiceJob, 'id' | 'code' | 'customerName' | 'slaDue'>
}

export function todayOverview(jobs: ServiceJob[], target: number, now = new Date()): TodayOverview {
  const today = jobs.filter((job) => sameDay(new Date(job.slotStart), now))
  const remaining = today.filter(isOpenJob)
  const overdue = jobs.filter((job) => jobOverdue(job, now)).sort((a, b) => overdueMinutes(b, now) - overdueMinutes(a, now))
  const points = completedVisitsOn(jobs, now)
  return {
    completed: points,
    remaining: remaining.length,
    todayTotal: today.filter((job) => job.status !== 'cancelled').length,
    points,
    target,
    targetPct: target > 0 ? Math.min(100, Math.round((points / target) * 100)) : 0,
    overdueCount: overdue.length,
    overdueJob: overdue[0]
  }
}

export interface DayPoints {
  label: string
  points: number
}

/** Completed houses per day for the last `days` days, oldest first. */
export function weeklyPoints(jobs: ServiceJob[], now = new Date(), days = 7): DayPoints[] {
  const week: DayPoints[] = []
  for (let offset = days - 1; offset >= 0; offset -= 1) {
    const day = new Date(now.getFullYear(), now.getMonth(), now.getDate() - offset)
    week.push({
      label: day.toLocaleDateString('en-IN', { weekday: 'short' }),
      points: completedVisitsOn(jobs, day)
    })
  }
  return week
}

export function weeklyTotal(week: DayPoints[]): number {
  return week.reduce((sum, day) => sum + day.points, 0)
}

export function upcomingJobs(jobs: ServiceJob[], now = new Date(), limit = 4): ServiceJob[] {
  return jobs
    .filter(isOpenJob)
    .filter((job) => new Date(job.slotStart).getTime() >= now.getTime())
    .sort((a, b) => new Date(a.slotStart).getTime() - new Date(b.slotStart).getTime())
    .slice(0, limit)
}

export function recentCompleted(jobs: ServiceJob[], limit = 3): ServiceJob[] {
  return jobs
    .filter((job) => job.status === 'completed' && job.completedAt)
    .sort(
      (a, b) =>
        new Date(b.completedAt as string).getTime() - new Date(a.completedAt as string).getTime()
    )
    .slice(0, limit)
}

/** Short, human ETA for a slot ("in 25 min", "in 2h", "in 1 day"). */
export function etaLabel(iso: string, now = new Date()): string {
  const diff = new Date(iso).getTime() - now.getTime()
  if (!Number.isFinite(diff)) return 'Time to be confirmed'
  if (diff <= 0) return 'Due now'
  const minutes = Math.round(diff / 60_000)
  if (minutes < 60) return `in ${minutes}m`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) {
    const rest = minutes % 60
    return rest > 0 ? `in ${hours}h ${rest}m` : `in ${hours}h`
  }
  const days = Math.round(hours / 24)
  return `in ${days} day${days === 1 ? '' : 's'}`
}

export type AlertTone = 'danger' | 'warn' | 'info'

export interface DashboardAlert {
  id: string
  tone: AlertTone
  title: string
  detail: string
  jobId?: string
}

/**
 * Derived notifications. There is no push channel yet (Phase 2), so the app
 * surfaces what changed on this device: overdue SLAs, urgent work and fresh
 * assignments. One alert per job, highest severity first.
 */
export function dashboardAlerts(jobs: ServiceJob[], now = new Date(), limit = 4): DashboardAlert[] {
  const alerts: DashboardAlert[] = []
  const seen = new Set<string>()

  const overdue = jobs
    .filter((job) => jobOverdue(job, now))
    .sort((a, b) => overdueMinutes(b, now) - overdueMinutes(a, now))
  for (const job of overdue) {
    seen.add(job.id)
    const minutes = overdueMinutes(job, now)
    alerts.push({
      id: `overdue-${job.id}`,
      tone: 'danger',
      title: `${job.code} is overdue`,
      detail: `${job.customerName} · ${minutes >= 60 ? `${Math.round(minutes / 60)}h` : `${minutes}m`} past SLA`,
      jobId: job.id
    })
  }

  const urgent = jobs
    .filter((job) => isOpenJob(job) && job.priority === 'urgent' && !seen.has(job.id))
    .sort((a, b) => new Date(a.slotStart).getTime() - new Date(b.slotStart).getTime())
  for (const job of urgent) {
    seen.add(job.id)
    alerts.push({
      id: `urgent-${job.id}`,
      tone: 'warn',
      title: `Urgent job waiting · ${job.code}`,
      detail: `${job.customerName} · ${job.services.filter((service) => service.status !== 'done').length} service(s) left`,
      jobId: job.id
    })
  }

  const fresh = jobs
    .filter((job) => isOpenJob(job) && job.status === 'assigned' && !seen.has(job.id))
    .filter((job) => now.getTime() - new Date(job.createdAt).getTime() < 12 * 3_600_000)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
  for (const job of fresh) {
    seen.add(job.id)
    alerts.push({
      id: `new-${job.id}`,
      tone: 'info',
      title: `New assignment · ${job.code}`,
      detail: `${job.customerName} · ${job.services.length} service(s) to complete`,
      jobId: job.id
    })
  }

  return alerts.slice(0, limit)
}
