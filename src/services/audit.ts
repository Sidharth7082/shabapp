import { db, settingGet } from '@/db/db'
import {
  appendAuditEntry,
  type AuditAction,
  type AuditEntry
} from '@/domain/audit'
import { newId } from '@/domain/shared/id'
import { useSession } from '@/services/session'

const KEY = 'auditLog'

export async function readAuditLog(): Promise<AuditEntry[]> {
  const value = await settingGet<AuditEntry[]>(KEY, [])
  return Array.isArray(value) ? value : []
}

/**
 * Append a security/ops event. Failures are swallowed: an audit write must
 * never block a sign-in, a job action or a sign-out. Never pass a PIN or full
 * phone number as `detail`.
 */
export async function logAudit(
  action: AuditAction,
  detail: string,
  actor?: { id: string; name: string }
): Promise<void> {
  try {
    const session = useSession.getState()
    const entry: AuditEntry = {
      id: newId('audit'),
      at: new Date().toISOString(),
      actorId: actor?.id || session.employeeId || 'system',
      actorName: actor?.name || session.name || 'System',
      action,
      detail: detail.replace(/\s+/g, ' ').trim().slice(0, 240)
    }
    await db.transaction('rw', db.settings, async () => {
      const row = await db.settings.get(KEY)
      const current = Array.isArray(row?.value) ? (row?.value as AuditEntry[]) : []
      await db.settings.put({ key: KEY, value: appendAuditEntry(current, entry) })
    })
  } catch {
    // Local logging must not break the action it is describing.
  }
}

export async function clearAuditLog(): Promise<void> {
  await db.transaction('rw', db.settings, () => db.settings.delete(KEY))
}
