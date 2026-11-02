/**
 * Demo sign-in validation and attempt limiting.
 *
 * PRODUCTION: the PIN check and the attempt counter move to Supabase Auth +
 * an edge function. The client must never be the security boundary. These
 * helpers exist so the demo has real field validation and a visible lockout
 * instead of pretending to be secure. See PLAN.md §3 golden rule 6.
 */

export const LOGIN_MAX_ATTEMPTS = 5
export const LOGIN_LOCK_MS = 30_000

/** EMP-1042, MGR-1001 — letters, a dash, then digits. */
export const EMPLOYEE_ID_PATTERN = /^[A-Z]{2,4}-\d{3,5}$/

export interface LoginErrors {
  employeeId?: string
  pin?: string
}

export function normalizeEmployeeId(value: string): string {
  return value.trim().toUpperCase()
}

export function validateLogin(employeeId: string, pin: string): {
  errors: LoginErrors
  valid: boolean
} {
  const errors: LoginErrors = {}
  const id = normalizeEmployeeId(employeeId)
  const code = pin.trim()

  if (!id) errors.employeeId = 'Enter your employee ID.'
  else if (!EMPLOYEE_ID_PATTERN.test(id)) errors.employeeId = 'Use the format EMP-1042.'

  if (!code) errors.pin = 'Enter your PIN.'
  else if (!/^\d{4,6}$/.test(code)) errors.pin = 'The PIN is 4 to 6 digits.'
  else if (code === '0000') errors.pin = 'That PIN is not allowed.'

  return { errors, valid: Object.keys(errors).length === 0 }
}

export function attemptsLeft(failures: number, max = LOGIN_MAX_ATTEMPTS): number {
  return Math.max(0, max - Math.max(0, Math.floor(failures)))
}

export function lockSecondsLeft(lockedUntil: number | null, now = Date.now()): number {
  if (!lockedUntil) return 0
  return Math.max(0, Math.ceil((lockedUntil - now) / 1000))
}

/** Message shown under the PIN field after a failed attempt. */
export function failureMessage(failures: number, max = LOGIN_MAX_ATTEMPTS): string {
  const left = attemptsLeft(failures, max)
  if (left === 0) return 'Too many attempts. Sign-in is locked for a moment.'
  return `Unknown employee ID or wrong PIN. ${left} attempt${left === 1 ? '' : 's'} left.`
}
