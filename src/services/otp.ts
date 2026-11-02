import type { ServiceJob } from '@/domain/jobs/types'
import { db } from '@/db/db'
import { newId } from '@/domain/shared/id'
import { startVisitClock } from '@/services/jobs'

/**
 * OTP gate.
 *
 * PRODUCTION: the code must be generated and verified server-side (Supabase
 * edge functions `send-otp` / `verify-otp`) and delivered to the customer by
 * SMS or WhatsApp. See supabase/functions and docs/SECURITY-OTP-CAMERA.md.
 *
 * THIS BUILD: runs the same state machine locally so the flow is testable
 * end to end without credentials. `requestOtp` returns the code ONLY so the
 * demo can display it; nothing is trusted client-side in production.
 */

const OTP_TTL_MS = 5 * 60_000
const MAX_ATTEMPTS = 3
const LOCK_MS = 60_000

/** A visit has two customer codes: one to start work, one to accept it. */
export type OtpPurpose = 'start' | 'complete'

function recordKey(jobId: string, purpose: OtpPurpose): string {
  return `${jobId}:${purpose}`
}

interface OtpRecord {
  jobId: string
  purpose: OtpPurpose
  phone: string
  codeHash: string
  salt: string
  issuedAt: number
  expiresAt: number
  attempts: number
  lockedUntil: number
  verifiedAt?: number
}

const records = new Map<string, OtpRecord>()

function randomDigits(length: number): string {
  const bytes = new Uint32Array(length)
  crypto.getRandomValues(bytes)
  return Array.from(bytes, (value) => String(value % 10)).join('')
}

function randomSalt(): string {
  const bytes = new Uint32Array(2)
  crypto.getRandomValues(bytes)
  return bytes.join('-')
}

async function hashCode(code: string, salt: string): Promise<string> {
  const data = new TextEncoder().encode(`${salt}:${code}`)
  if (crypto.subtle) {
    const digest = await crypto.subtle.digest('SHA-256', data)
    return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, '0')).join('')
  }
  // Fallback for non-secure contexts; demo only.
  let hash = 2166136261
  for (const byte of data) {
    hash ^= byte
    hash = Math.imul(hash, 16777619)
  }
  return (hash >>> 0).toString(16)
}

export interface OtpRequestResult {
  sentTo: string
  expiresAt: number
  demoCode?: string
}

export async function requestOtp(
  job: Pick<ServiceJob, 'id' | 'phone'>,
  purpose: OtpPurpose = 'start'
): Promise<OtpRequestResult> {
  const now = Date.now()
  const salt = randomSalt()
  const code = randomDigits(6)
  const record: OtpRecord = {
    jobId: job.id,
    purpose,
    phone: job.phone,
    codeHash: await hashCode(code, salt),
    salt,
    issuedAt: now,
    expiresAt: now + OTP_TTL_MS,
    attempts: 0,
    lockedUntil: 0
  }
  records.set(recordKey(job.id, purpose), record)

  return {
    sentTo: maskPhone(job.phone),
    expiresAt: record.expiresAt,
    // Demo only. The production response never contains the code.
    demoCode: code
  }
}

export type OtpVerifyResult =
  | { ok: true }
  | { ok: false; reason: 'missing' | 'expired' | 'locked' | 'wrong' | 'exhausted'; attemptsLeft?: number }

export async function verifyOtp(
  jobId: string,
  code: string,
  purpose: OtpPurpose = 'start'
): Promise<OtpVerifyResult> {
  const record = records.get(recordKey(jobId, purpose))
  if (!record) return { ok: false, reason: 'missing' }

  const now = Date.now()
  if (now < record.lockedUntil) return { ok: false, reason: 'locked' }
  if (now > record.expiresAt) return { ok: false, reason: 'expired' }
  if (record.attempts >= MAX_ATTEMPTS) {
    record.lockedUntil = now + LOCK_MS
    return { ok: false, reason: 'exhausted' }
  }

  const candidate = await hashCode(code.trim(), record.salt)
  if (candidate !== record.codeHash) {
    record.attempts += 1
    return {
      ok: false,
      reason: record.attempts >= MAX_ATTEMPTS ? 'exhausted' : 'wrong',
      attemptsLeft: Math.max(0, MAX_ATTEMPTS - record.attempts)
    }
  }

  record.verifiedAt = now
  if (purpose === 'start') {
    // Verifying the start code is the moment the paid clock begins.
    await startVisitClock(jobId)
  } else {
    await db.jobs.update(jobId, { workDoneOtpAt: new Date(now).toISOString() })
  }
  return { ok: true }
}

export function maskPhone(phone: string): string {
  const digits = phone.replace(/\D/g, '')
  if (digits.length < 4) return 'customer phone'
  return `+91 ******${digits.slice(-4)}`
}

export const OTP_RULES = {
  ttlMinutes: OTP_TTL_MS / 60_000,
  maxAttempts: MAX_ATTEMPTS,
  resendCountdownSeconds: 30
}

export function newPhotoId(): string {
  return newId('photo')
}
