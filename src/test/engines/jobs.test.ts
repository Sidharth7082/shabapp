import { describe, expect, it } from 'vitest'
import {
  isJobComplete,
  remainingSeconds,
  servicesDone,
  workSeconds,
  type ServiceJob
} from '@/domain/jobs/types'

const job = (overrides: Partial<ServiceJob> = {}): ServiceJob => ({
  id: 'j1',
  code: 'SH-1',
  customerName: 'C',
  contactName: 'C',
  phone: '9999999999',
  address: 'A',
  kind: 'amc',
  priority: 'normal',
  status: 'started',
  assignedTo: 'E',
  services: [],
  slotStart: '2026-11-02T10:00:00.000Z',
  slaDue: '2026-11-02T14:00:00.000Z',
  createdAt: '2026-11-02T09:00:00.000Z',
  issues: [],
  ...overrides
})

describe('visit clock helpers', () => {
  it('counts nothing before the first photo', () => {
    expect(workSeconds(job(), Date.parse('2026-11-02T10:30:00.000Z'))).toBe(0)
  })

  it('counts from startedAt until completion, then freezes', () => {
    const started = job({
      startedAt: '2026-11-02T10:00:00.000Z',
      workDueAt: '2026-11-02T11:30:00.000Z',
      completedAt: '2026-11-02T10:42:30.000Z'
    })
    expect(workSeconds(started, Date.parse('2026-11-02T12:00:00.000Z'))).toBe(2550)
    expect(remainingSeconds(started, Date.parse('2026-11-02T12:00:00.000Z'))).toBe(-1800)
  })

  it('reports a live countdown before completion', () => {
    const running = job({
      startedAt: '2026-11-02T10:00:00.000Z',
      workDueAt: '2026-11-02T11:30:00.000Z'
    })
    expect(remainingSeconds(running, Date.parse('2026-11-02T11:00:00.000Z'))).toBe(1800)
  })

  it('has no countdown when no limit is set', () => {
    expect(remainingSeconds(job(), Date.now())).toBeNull()
  })

  it('tracks service progress and job completion', () => {
    const base = job({
      services: [
        {
          id: 's1',
          name: 'AC service',
          system: 'AC Service',
          status: 'done',
          checklist: [],
          beforePhotoIds: [],
          afterPhotoIds: []
        },
        {
          id: 's2',
          name: 'Solar cleaning',
          system: 'Solar Panels',
          status: 'pending',
          checklist: [],
          beforePhotoIds: [],
          afterPhotoIds: []
        }
      ]
    })

    expect(servicesDone(base)).toBe(1)
    expect(isJobComplete(base)).toBe(false)
    expect(
      isJobComplete({
        ...base,
        services: base.services.map((service) => ({ ...service, status: 'done' as const }))
      })
    ).toBe(true)
    expect(isJobComplete({ ...base, services: [] })).toBe(false)
  })
})
