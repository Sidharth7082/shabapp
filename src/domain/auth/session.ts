/**
 * Session lifetime rules.
 *
 * A field device is often left on a desk or in a van, so a session must not
 * live forever. The app signs out after a hard 12-hour limit and after two
 * hours without interaction. These are client-side controls (the server will
 * own refresh-token expiry once Supabase Auth lands), but they stop the most
 * common real-world leak: an unattended, already-unlocked phone.
 */

export const SESSION_TTL_MS = 12 * 60 * 60 * 1000
export const SESSION_IDLE_MS = 2 * 60 * 60 * 1000
export const SESSION_ACTIVITY_THROTTLE_MS = 5 * 60 * 1000

export interface SessionWindow {
  signedInAt?: string
  lastActiveAt?: string
  expiresAt?: string
}

export type SessionExpiryReason = 'missing' | 'expired' | 'idle'

function timestamp(value?: string): number | null {
  if (!value) return null
  const parsed = new Date(value).getTime()
  return Number.isFinite(parsed) ? parsed : null
}

/**
 * Why the session is no longer valid, or `null` when it is still usable.
 * Records written before this version have no `expiresAt`, so they fail closed
 * and the employee has to sign in once more.
 */
export function sessionExpiryReason(
  window: SessionWindow,
  now = Date.now()
): SessionExpiryReason | null {
  const expiresAt = timestamp(window.expiresAt)
  const lastActiveAt = timestamp(window.lastActiveAt)
  if (expiresAt === null) return 'missing'
  if (now >= expiresAt) return 'expired'
  if (lastActiveAt !== null && now - lastActiveAt >= SESSION_IDLE_MS) return 'idle'
  return null
}

export function sessionExpired(window: SessionWindow, now = Date.now()): boolean {
  return sessionExpiryReason(window, now) !== null
}

/** Milliseconds until the session ends (0 when already expired). */
export function sessionRemainingMs(window: SessionWindow, now = Date.now()): number {
  const expiresAt = timestamp(window.expiresAt)
  if (expiresAt === null) return 0
  const lastActiveAt = timestamp(window.lastActiveAt)
  const absolute = expiresAt - now
  const idle = lastActiveAt === null ? absolute : lastActiveAt + SESSION_IDLE_MS - now
  return Math.max(0, Math.min(absolute, idle))
}
