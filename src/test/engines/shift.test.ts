import { describe, expect, it } from 'vitest'
import {
  TIER_LIMITS_MINUTES,
  completedVisitsOn,
  jobLimitMinutes,
  tierLimitMinutes,
  type ServiceJob
} from '@/domain/jobs/types'

const localIso = (month: number, day: number, hour: number, minute = 0) =>
  new Date(2026, month - 1, day, hour, minute).toISOString()

const visit = (status: ServiceJob['status'], completedAt?: string) => ({ status, completedAt })

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

describe('shift points', () => {
  const day = new Date(2026, 10, 2, 18, 0)

  it('counts one point per completed house regardless of inner services', () => {
    const jobs = [
      visit('completed', localIso(11, 2, 9, 30)),
      visit('completed', localIso(11, 2, 15, 0)),
      visit('started'),
      visit('cancelled', localIso(11, 2, 12, 0))
    ]
    expect(completedVisitsOn(jobs, day)).toBe(2)
  })

  it('ignores houses closed on another day', () => {
    expect(completedVisitsOn([visit('completed', localIso(11, 1, 23, 59))], day)).toBe(0)
    expect(completedVisitsOn([visit('completed', localIso(11, 3, 0, 1))], day)).toBe(0)
  })

  it('is zero when nothing has been closed or nothing exists', () => {
    expect(completedVisitsOn([visit('assigned'), visit('started')], day)).toBe(0)
    expect(completedVisitsOn([], day)).toBe(0)
  })
})
