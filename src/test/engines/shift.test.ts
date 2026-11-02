import { describe, expect, it } from 'vitest'
import {
  TIER_LIMITS_MINUTES,
  completedServicesOn,
  jobLimitMinutes,
  tierLimitMinutes,
  type ServiceItem
} from '@/domain/jobs/types'

const service = (overrides: Partial<ServiceItem> = {}): ServiceItem => ({
  id: 's1',
  name: 'AC service',
  system: 'AC Service',
  status: 'done',
  checklist: [],
  beforePhotoIds: [],
  afterPhotoIds: [],
  ...overrides
})

const localIso = (month: number, day: number, hour: number, minute = 0) =>
  new Date(2026, month - 1, day, hour, minute).toISOString()

describe('customer credit tiers', () => {
  it('gives tier 1 a 60 minute visit and tier 2 a 90 minute visit', () => {
    expect(TIER_LIMITS_MINUTES[1]).toBe(60)
    expect(TIER_LIMITS_MINUTES[2]).toBe(90)
    expect(tierLimitMinutes(1)).toBe(60)
    expect(tierLimitMinutes(2)).toBe(90)
  })

  it('falls back to tier 2 when the tier is missing (old records)', () => {
    expect(tierLimitMinutes(undefined)).toBe(90)
  })

  it('uses the explicit visit limit when one was stored', () => {
    expect(jobLimitMinutes({ tier: 1 })).toBe(60)
    expect(jobLimitMinutes({ tier: 1, workLimitMinutes: 75 })).toBe(75)
    expect(jobLimitMinutes({ tier: 2 })).toBe(90)
  })
})

describe('shift target counter', () => {
  const day = new Date(2026, 10, 2, 18, 0)

  it('counts only services closed on the requested day', () => {
    const jobs = [
      {
        services: [
          service({ id: 'a', completedAt: localIso(11, 2, 9, 10) }),
          service({ id: 'b', completedAt: localIso(11, 2, 11, 40) })
        ]
      },
      {
        services: [
          service({ id: 'c', completedAt: localIso(11, 1, 11, 40) }),
          service({ id: 'd', status: 'pending' })
        ]
      },
      { services: [service({ id: 'e', completedAt: localIso(11, 3, 0, 30) })] }
    ]

    expect(completedServicesOn(jobs, day)).toBe(2)
  })

  it('is zero before the first service closes', () => {
    expect(
      completedServicesOn([{ services: [service({ status: 'pending' })] }], day)
    ).toBe(0)
    expect(completedServicesOn([], day)).toBe(0)
  })

  it('adds up every service in multi-service visits', () => {
    const visit = {
      services: [
        service({ id: 'a', completedAt: localIso(11, 2, 10, 0) }),
        service({ id: 'b', completedAt: localIso(11, 2, 10, 30) }),
        service({ id: 'c', completedAt: localIso(11, 2, 11, 0) })
      ]
    }
    expect(completedServicesOn([visit], day)).toBe(3)
  })
})
