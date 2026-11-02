import { describe, expect, it } from 'vitest'
import { employeeOnSite, latestEmployeePing } from '@/domain/jobs/team'
import type { ServiceJob } from '@/domain/jobs/types'

const job = (overrides: Partial<ServiceJob> = {}): ServiceJob => ({
  id: 'job_1',
  code: 'SH-1',
  customerName: 'Sunrise Apartments',
  contactName: 'Meera',
  phone: '9999999999',
  address: 'Sector 62',
  kind: 'amc',
  priority: 'normal',
  status: 'started',
  assignedTo: 'Aarav Sharma',
  services: [],
  slotStart: '2026-11-02T09:00:00.000Z',
  slaDue: '2026-11-02T13:00:00.000Z',
  createdAt: '2026-11-02T08:00:00.000Z',
  issues: [],
  ...overrides
})

const point = (lat: number, lng: number, at: string, accuracy = 20) => ({
  lat,
  lng,
  accuracy,
  at
})

describe('latest employee location', () => {
  it('returns the newest check-in or check-out position', () => {
    const jobs = [
      job({
        id: 'j1',
        checkIn: point(28.1, 77.1, '2026-11-02T09:00:00.000Z'),
        checkOut: point(28.2, 77.2, '2026-11-02T10:30:00.000Z')
      }),
      job({
        id: 'j2',
        code: 'SH-2',
        customerName: 'Corporate Tower',
        checkIn: point(28.3, 77.3, '2026-11-02T11:45:00.000Z')
      })
    ]

    const ping = latestEmployeePing(jobs, 'Aarav Sharma')
    expect(ping?.jobId).toBe('j2')
    expect(ping?.jobCode).toBe('SH-2')
    expect(ping?.kind).toBe('check-in')
    expect(ping?.lat).toBeCloseTo(28.3)
  })

  it('ignores positions belonging to another employee', () => {
    const jobs = [
      job({ assignedTo: 'Priya Menon', checkIn: point(28.4, 77.4, '2026-11-02T11:00:00.000Z') })
    ]
    expect(latestEmployeePing(jobs, 'Aarav Sharma')).toBeNull()
  })

  it('returns null when no position was captured', () => {
    expect(latestEmployeePing([job()], 'Aarav Sharma')).toBeNull()
    expect(latestEmployeePing([], 'Aarav Sharma')).toBeNull()
  })

  it('detects when an employee is on site', () => {
    expect(employeeOnSite([job({ status: 'started' })], 'Aarav Sharma')).toBe(true)
    expect(employeeOnSite([job({ status: 'assigned' })], 'Aarav Sharma')).toBe(false)
    expect(employeeOnSite([job({ assignedTo: 'Priya Menon' })], 'Aarav Sharma')).toBe(false)
  })
})
