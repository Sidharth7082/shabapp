import { describe, expect, it } from 'vitest'
import type { ServiceItem, ServiceJob } from '@/domain/jobs/types'
import {
  boardCounts,
  dashboardAlerts,
  etaLabel,
  filterBoardJobs,
  matchesJobQuery,
  pendingServicesByJob,
  recentCompleted,
  todayOverview,
  totalPendingServices,
  upcomingJobs,
  weeklyPoints,
  weeklyTotal
} from '@/domain/jobs/dashboard'

const now = new Date(2026, 10, 3, 12, 0) // Tuesday 3 Nov 2026, 12:00 local
const iso = (day: number, hour: number, minute = 0) =>
  new Date(2026, 10, day, hour, minute).toISOString()

const service = (name: string, status: ServiceItem['status'] = 'pending'): ServiceItem => ({
  id: `svc_${name}`,
  name,
  system: 'Fire Alarm',
  status,
  checklist: [],
  beforePhotoIds: [],
  afterPhotoIds: []
})

function job(overrides: Partial<ServiceJob> & { id: string }): ServiceJob {
  return {
    code: `SH-${overrides.id}`,
    customerName: 'Customer',
    contactName: 'Contact Person',
    phone: '9810012345',
    address: 'Sector 62, Noida',
    kind: 'amc',
    priority: 'normal',
    status: 'assigned',
    assignedTo: 'Aarav Sharma',
    services: [service('Fire alarm health check')],
    slotStart: iso(3, 15),
    slaDue: iso(3, 18),
    createdAt: iso(2, 9),
    issues: [],
    ...overrides
  }
}

const sunrise = job({
  id: 'a',
  code: 'SH-1042',
  customerName: 'Sunrise Apartments',
  area: 'Sector 62',
  priority: 'urgent',
  slotStart: iso(3, 9),
  slaDue: iso(3, 10),
  createdAt: iso(3, 8),
  services: [service('AC service'), service('Solar panel cleaning'), service('RO service', 'done')]
})
const corporate = job({
  id: 'b',
  code: 'SH-1043',
  customerName: 'Corporate Tower A',
  address: 'Plot 18, Sector 142, Noida',
  status: 'started',
  slotStart: iso(3, 14),
  slaDue: iso(3, 18),
  createdAt: iso(3, 11)
})
const tomorrow = job({
  id: 'c',
  code: 'SH-1046',
  customerName: 'Honda Cars Service Centre',
  status: 'pending',
  slotStart: iso(4, 10),
  slaDue: iso(4, 14),
  createdAt: iso(2, 9),
  services: [service('Chimney cleaning')]
})
const done = job({
  id: 'd',
  code: 'SH-1035',
  customerName: 'Gainwell Warehouse',
  status: 'completed',
  slotStart: iso(1, 10),
  slaDue: iso(1, 13),
  completedAt: iso(2, 17),
  createdAt: iso(0, 9)
})
const cancelled = job({
  id: 'e',
  code: 'SH-1020',
  customerName: 'Cancelled Site',
  status: 'cancelled',
  slotStart: iso(5, 9),
  slaDue: iso(5, 12)
})
const jobs = [sunrise, corporate, tomorrow, done, cancelled]

describe('dashboard search', () => {
  it('matches customer, job ID, location, service and status', () => {
    expect(matchesJobQuery(sunrise, 'sunrise')).toBe(true)
    expect(matchesJobQuery(sunrise, '1042')).toBe(true)
    expect(matchesJobQuery(sunrise, 'sector 62')).toBe(true)
    expect(matchesJobQuery(sunrise, 'solar panel')).toBe(true)
    expect(matchesJobQuery(sunrise, 'overdue', now)).toBe(true)
    expect(matchesJobQuery(done, 'completed')).toBe(true)
    expect(matchesJobQuery(done, 'overdue', now)).toBe(false)
    expect(matchesJobQuery(done, 'history')).toBe(false)
  })

  it('requires every search term and ignores an empty query', () => {
    expect(matchesJobQuery(sunrise, 'sunrise noida')).toBe(true)
    expect(matchesJobQuery(sunrise, 'sunrise delhi')).toBe(false)
    expect(matchesJobQuery(sunrise, '   ')).toBe(true)
  })
})

describe('service board filters', () => {
  it('counts each filter', () => {
    expect(boardCounts(jobs, now)).toEqual({ active: 3, today: 2, overdue: 1, completed: 1, all: 5 })
  })

  it('keeps only open jobs in Active and puts the started job first', () => {
    const active = filterBoardJobs(jobs, 'active', '', now)
    expect(active.map((item) => item.id)).toEqual(['b', 'a', 'c'])
    expect(active.some((item) => item.status === 'completed' || item.status === 'cancelled')).toBe(false)
  })

  it('filters Today, Overdue and History', () => {
    expect(filterBoardJobs(jobs, 'today', '', now).map((item) => item.id)).toEqual(['b', 'a'])
    expect(filterBoardJobs(jobs, 'overdue', '', now).map((item) => item.id)).toEqual(['a'])
    expect(filterBoardJobs(jobs, 'completed', '', now).map((item) => item.id)).toEqual(['d'])
  })

  it('combines a filter with the search query', () => {
    expect(filterBoardJobs(jobs, 'active', 'corporate', now).map((item) => item.id)).toEqual(['b'])
    expect(filterBoardJobs(jobs, 'active', 'gainwell', now)).toHaveLength(0)
  })
})

describe('pending service breakdown', () => {
  it('lists pending services per open job, largest first', () => {
    const rows = pendingServicesByJob(jobs)
    expect(rows.map((row) => [row.job.code, row.pending])).toEqual([
      ['SH-1042', 2],
      ['SH-1043', 1],
      ['SH-1046', 1]
    ])
    expect(totalPendingServices(jobs)).toBe(4)
  })
})

describe("today's overview", () => {
  it('summarises completed, remaining, points and the overdue job', () => {
    const overview = todayOverview(jobs, 12, now)
    expect(overview.completed).toBe(0)
    expect(overview.remaining).toBe(2)
    expect(overview.todayTotal).toBe(2)
    expect(overview.points).toBe(0)
    expect(overview.targetPct).toBe(0)
    expect(overview.overdueCount).toBe(1)
    expect(overview.overdueJob?.code).toBe('SH-1042')
  })

  it('caps the target percentage at 100', () => {
    const extra = [
      { ...done, completedAt: iso(3, 8) },
      { ...done, id: 'd2', completedAt: iso(3, 9) },
      { ...done, id: 'd3', completedAt: iso(3, 10) }
    ]
    const overview = todayOverview(extra, 2, now)
    expect(overview.completed).toBe(3)
    expect(overview.targetPct).toBe(100)
  })
})

describe('weekly points', () => {
  it('counts a completed house per day, oldest first', () => {
    const week = weeklyPoints(jobs, now)
    expect(week).toHaveLength(7)
    expect(week[0].label).toBe('Wed')
    expect(week[week.length - 1].label).toBe('Tue')
    expect(week[week.length - 2].points).toBe(1) // Gainwell closed on 2 Nov
    expect(weeklyTotal(week)).toBe(1)
  })

  it('is all zeros with no completions', () => {
    expect(weeklyTotal(weeklyPoints([], now))).toBe(0)
  })
})

describe('schedule and history', () => {
  it('returns upcoming open jobs in slot order', () => {
    expect(upcomingJobs(jobs, now).map((item) => item.id)).toEqual(['b', 'c'])
    expect(upcomingJobs(jobs, now, 1).map((item) => item.id)).toEqual(['b'])
  })

  it('returns recent completed jobs, newest first', () => {
    const older = { ...done, id: 'd0', completedAt: iso(1, 9) }
    expect(recentCompleted([older, done]).map((item) => item.id)).toEqual(['d', 'd0'])
  })

  it('labels ETAs for minutes, hours and days', () => {
    expect(etaLabel(iso(3, 11, 30), now)).toBe('Due now')
    expect(etaLabel(iso(3, 12, 25), now)).toBe('in 25m')
    expect(etaLabel(iso(3, 14, 30), now)).toBe('in 2h 30m')
    expect(etaLabel(iso(4, 12), now)).toBe('in 1 day')
  })
})

describe('dashboard notifications', () => {
  it('reports overdue first with minutes past SLA', () => {
    const alerts = dashboardAlerts(jobs, now)
    expect(alerts[0]).toMatchObject({ tone: 'danger', jobId: 'a', title: 'SH-1042 is overdue' })
    expect(alerts[0].detail).toContain('2h past SLA')
  })

  it('includes urgent work and fresh assignments without duplicating a job', () => {
    const alerts = dashboardAlerts(jobs, now)
    expect(alerts.some((alert) => alert.id === 'urgent-a')).toBe(false) // already reported as overdue
    const fresh = dashboardAlerts([{ ...corporate, status: 'assigned' }], now)
    expect(fresh[0]).toMatchObject({ tone: 'info', jobId: 'b', title: 'New assignment · SH-1043' })
  })

  it('ignores old assignments and respects the limit', () => {
    const old = { ...corporate, createdAt: iso(1, 9) }
    expect(dashboardAlerts([old], now)).toHaveLength(0)
    expect(dashboardAlerts([sunrise, corporate, tomorrow, done], now, 1)).toHaveLength(1)
  })
})
