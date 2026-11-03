import { describe, expect, it } from 'vitest'
import {
  applyOverride,
  canChangeRole,
  clampDailyTarget,
  type TeamOverrides
} from '@/domain/auth/people'
import type { DemoEmployee } from '@/data/employees'

const technician: DemoEmployee = {
  id: 'EMP-1042',
  name: 'Aarav Sharma',
  role: 'technician',
  dailyTarget: 12,
  oneTap: true,
  credential: { salt: 's', hash: 'h', iterations: 1 }
}

describe('team overrides', () => {
  it('returns the original employee when there is no override', () => {
    expect(applyOverride(technician, {})).toBe(technician)
  })

  it('applies a role and target override without touching the credential', () => {
    const overrides: TeamOverrides = { 'EMP-1042': { role: 'manager', dailyTarget: 3 } }
    const result = applyOverride(technician, overrides)
    expect(result.role).toBe('manager')
    expect(result.dailyTarget).toBe(3)
    expect(result.credential).toBe(technician.credential)
    expect(result.name).toBe('Aarav Sharma')
  })

  it('clamps targets to 0–50 and handles invalid values', () => {
    expect(clampDailyTarget(-4)).toBe(0)
    expect(clampDailyTarget(12.6)).toBe(13)
    expect(clampDailyTarget(99)).toBe(50)
    expect(clampDailyTarget(Number.NaN)).toBe(0)
  })

  it('lets an admin edit someone else but not themselves', () => {
    expect(canChangeRole('ADM-0001', 'EMP-1042')).toBe(true)
    expect(canChangeRole('ADM-0001', 'ADM-0001')).toBe(false)
  })
})
