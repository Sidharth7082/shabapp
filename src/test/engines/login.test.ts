import { describe, expect, it } from 'vitest'
import {
  LOGIN_LOCK_MS,
  LOGIN_MAX_ATTEMPTS,
  attemptsLeft,
  failureMessage,
  lockSecondsLeft,
  normalizeEmployeeId,
  validateLogin
} from '@/domain/auth/login'

describe('login validation', () => {
  it('accepts the demo employee IDs and a 4-6 digit PIN', () => {
    expect(validateLogin('EMP-1042', '1234').valid).toBe(true)
    expect(validateLogin(' mgr-1001 ', '123456').valid).toBe(true)
  })

  it('rejects an empty or malformed employee ID', () => {
    expect(validateLogin('', '1234').errors.employeeId).toMatch(/employee ID/i)
    expect(validateLogin('1042', '1234').errors.employeeId).toMatch(/EMP-1042/)
    expect(validateLogin('EMP-1', '1234').errors.employeeId).toMatch(/EMP-1042/)
  })

  it('rejects empty, short, long and non-numeric PINs', () => {
    expect(validateLogin('EMP-1042', '').errors.pin).toMatch(/enter your pin/i)
    expect(validateLogin('EMP-1042', '123').errors.pin).toMatch(/4 to 6/)
    expect(validateLogin('EMP-1042', '1234567').errors.pin).toMatch(/4 to 6/)
    expect(validateLogin('EMP-1042', '12ab').errors.pin).toMatch(/4 to 6/)
  })

  it('normalises the employee ID so lowercase input works', () => {
    expect(normalizeEmployeeId('  emp-1042 ')).toBe('EMP-1042')
  })
})

describe('login attempt limiting', () => {
  it('counts down from the maximum and never goes negative', () => {
    expect(attemptsLeft(0)).toBe(LOGIN_MAX_ATTEMPTS)
    expect(attemptsLeft(1)).toBe(LOGIN_MAX_ATTEMPTS - 1)
    expect(attemptsLeft(99)).toBe(0)
  })

  it('reports the attempts left in the failure message', () => {
    expect(failureMessage(1)).toContain(`${LOGIN_MAX_ATTEMPTS - 1} attempts left`)
    expect(failureMessage(LOGIN_MAX_ATTEMPTS - 1)).toContain('1 attempt left')
    expect(failureMessage(LOGIN_MAX_ATTEMPTS)).toMatch(/locked/i)
  })

  it('computes the remaining lock seconds', () => {
    const now = 1_000_000
    expect(lockSecondsLeft(null, now)).toBe(0)
    expect(lockSecondsLeft(now + LOGIN_LOCK_MS, now)).toBe(30)
    expect(lockSecondsLeft(now + 5_500, now)).toBe(6)
    expect(lockSecondsLeft(now - 1, now)).toBe(0)
  })
})
