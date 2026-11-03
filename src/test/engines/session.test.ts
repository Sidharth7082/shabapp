import { describe, expect, it } from 'vitest'
import {
  SESSION_IDLE_MS,
  SESSION_TTL_MS,
  sessionExpired,
  sessionExpiryReason,
  sessionRemainingMs
} from '@/domain/auth/session'

const now = new Date(2026, 10, 3, 12, 0).getTime()
const iso = (offsetMs: number) => new Date(now + offsetMs).toISOString()

describe('session lifetime', () => {
  it('rejects records without an expiry (old or tampered sessions)', () => {
    expect(sessionExpiryReason({ signedInAt: iso(-1_000) }, now)).toBe('missing')
    expect(sessionExpired({}, now)).toBe(true)
  })

  it('accepts a session inside both the absolute and idle windows', () => {
    const window = {
      signedInAt: iso(-60 * 60_000),
      lastActiveAt: iso(-20 * 60_000),
      expiresAt: iso(SESSION_TTL_MS - 60 * 60_000)
    }
    expect(sessionExpiryReason(window, now)).toBeNull()
    expect(sessionExpired(window, now)).toBe(false)
  })

  it('expires after the hard 12-hour limit', () => {
    const window = {
      signedInAt: iso(-SESSION_TTL_MS),
      lastActiveAt: iso(-1_000),
      expiresAt: iso(-1)
    }
    expect(sessionExpiryReason(window, now)).toBe('expired')
  })

  it('expires after two hours without interaction', () => {
    const window = {
      signedInAt: iso(-3 * 60 * 60_000),
      lastActiveAt: iso(-SESSION_IDLE_MS),
      expiresAt: iso(60 * 60_000)
    }
    expect(sessionExpiryReason(window, now)).toBe('idle')
  })

  it('reports the shorter of the absolute and idle windows', () => {
    expect(
      sessionRemainingMs(
        { lastActiveAt: iso(-30 * 60_000), expiresAt: iso(60 * 60_000) },
        now
      )
    ).toBe(60 * 60_000)
    expect(
      sessionRemainingMs(
        { lastActiveAt: iso(-(SESSION_IDLE_MS - 10 * 60_000)), expiresAt: iso(6 * 60 * 60_000) },
        now
      )
    ).toBe(10 * 60_000)
    expect(sessionRemainingMs({ expiresAt: iso(-1) }, now)).toBe(0)
  })
})
