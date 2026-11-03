import { describe, expect, it } from 'vitest'
import { buildTeamStats, type TeamMember } from '@/domain/jobs/teamStats'
import type { ServiceItem, ServiceJob } from '@/domain/jobs/types'

const now = new Date(2026, 10, 3, 12, 0)
const iso = (day: number, hour: number, minute = 0) =>
  new Date(2026, 10, day, hour, minute).toISOString()

const service = (status: ServiceItem['status'] = 'pending'): ServiceItem => ({
  id: `svc_${Math.random()}`,
  name: 'Service',
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
    contactName: 'Contact',
    phone: '9810012345',
    address: 'Noida',
    kind: 'amc',
    priority: 'normal',
    status: 'assigned',
    assignedTo: 'Aarav Sharma',
    services: [service()],
    slotStart: iso(3, 14),
    slaDue: iso(3, 18),
    createdAt: iso(2, 9),
    issues: [],
    ...overrides
  }
}

const team: TeamMember[] = [
  { id: 'EMP-1042', name: 'Aarav Sharma', role: 'technician', dailyTarget: 12 },
  { id: 'EMP-1044', name: 'Sana Khan', role: 'technician', dailyTarget: 10 },
  { id: 'SUP-2001', name: 'Rohan Iyer', role: 'supervisor', dailyTarget: 8 }
]

const jobs = [
  job({
    id: 'a1',
    assignedTo: 'Aarav Sharma',
    status: 'started',
    startedAt: iso(3, 11, 10),
    otpVerifiedAt: iso(3, 11, 10),
    checkIn: { lat: 28.5, lng: 77.3, accuracy: 10, at: iso(3, 11, 10) },
    slotStart: iso(3, 11)
  }),
  job({ id: 's1', assignedTo: 'Sana Khan', status: 'completed', completedAt: iso(3, 9) }),
  job({ id: 's2', assignedTo: 'Sana Khan', status: 'completed', completedAt: iso(2, 16) }),
  job({ id: 's3', assignedTo: 'Sana Khan', status: 'assigned', slotStart: iso(3, 15) }),
  job({
    id: 'r1',
    assignedTo: 'Rohan Iyer',
    status: 'assigned',
    priority: 'urgent',
    slaDue: iso(3, 10),
    slotStart: iso(3, 13)
  })
]

describe('team statistics', () => {
  const { members, totals } = buildTeamStats(team, jobs, now)
  const byName = Object.fromEntries(members.map((member) => [member.name, member]))

  it('counts points per completed house today and this week', () => {
    expect(byName['Sana Khan'].pointsToday).toBe(1)
    expect(byName['Sana Khan'].pointsWeek).toBe(2)
    expect(byName['Aarav Sharma'].pointsToday).toBe(0)
  })

  it('reports the active job and time on site', () => {
    expect(byName['Aarav Sharma'].onSite).toBe(true)
    expect(byName['Aarav Sharma'].activeJob?.id).toBe('a1')
    expect(byName['Aarav Sharma'].minutesOnSite).toBe(50)
    expect(byName['Aarav Sharma'].lastActivityAt).toBe(iso(3, 11, 10))
  })

  it('reports pending services, next job and overdue work', () => {
    expect(byName['Sana Khan'].pendingServices).toBe(1)
    expect(byName['Sana Khan'].nextJob?.id).toBe('s3')
    expect(byName['Rohan Iyer'].overdue).toBe(1)
    expect(byName['Rohan Iyer'].nextJob?.id).toBe('r1')
  })

  it('sorts on-site members first, then by points', () => {
    expect(members.map((member) => member.name)).toEqual([
      'Aarav Sharma',
      'Sana Khan',
      'Rohan Iyer'
    ])
  })

  it('rolls the team up', () => {
    expect(totals).toMatchObject({
      pointsToday: 1,
      pointsWeek: 2,
      onSite: 1,
      openJobs: 3,
      pendingServices: 3,
      overdue: 1,
      members: 3
    })
  })

  it('shows zeros for a member with no work', () => {
    const empty = buildTeamStats(
      [{ id: 'EMP-9999', name: 'New Tech', role: 'technician', dailyTarget: 10 }],
      [],
      now
    )
    expect(empty.members[0]).toMatchObject({
      pointsToday: 0,
      openJobs: 0,
      onSite: false,
      overdue: 0
    })
    expect(empty.totals.members).toBe(1)
  })
})
