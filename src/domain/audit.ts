export type AuditAction =
  | 'login'
  | 'login_failed'
  | 'lockout'
  | 'logout'
  | 'session_expired'
  | 'role_changed'
  | 'target_changed'
  | 'job_created'
  | 'job_deleted'
  | 'demo_reset'
  | 'update_opened'

export interface AuditEntry {
  id: string
  at: string
  actorId: string
  actorName: string
  action: AuditAction
  detail: string
}

export const AUDIT_ACTION_LABEL: Record<AuditAction, string> = {
  login: 'Signed in',
  login_failed: 'Sign-in failed',
  lockout: 'Sign-in locked',
  logout: 'Signed out',
  session_expired: 'Session expired',
  role_changed: 'Role changed',
  target_changed: 'Target changed',
  job_created: 'Job created',
  job_deleted: 'Job deleted',
  demo_reset: 'Demo data reset',
  update_opened: 'Update opened'
}

export const AUDIT_ACTION_TONE: Record<
  AuditAction,
  'ok' | 'warn' | 'danger' | 'info' | 'neutral'
> = {
  login: 'ok',
  login_failed: 'danger',
  lockout: 'danger',
  logout: 'neutral',
  session_expired: 'warn',
  role_changed: 'info',
  target_changed: 'info',
  job_created: 'ok',
  job_deleted: 'warn',
  demo_reset: 'warn',
  update_opened: 'info'
}

/** Newest first, capped so the local log cannot grow without bound. */
export function appendAuditEntry(
  entries: AuditEntry[],
  entry: AuditEntry,
  cap = 100
): AuditEntry[] {
  return [entry, ...entries].slice(0, Math.max(1, cap))
}

export function formatAuditTime(iso: string, now = new Date()): string {
  const date = new Date(iso)
  if (!Number.isFinite(date.getTime())) return 'Unknown time'
  const minutes = Math.max(0, Math.round((now.getTime() - date.getTime()) / 60_000))
  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes} min ago`
  const hours = Math.round(minutes / 60)
  if (hours < 24) return `${hours} h ago`
  return date.toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit'
  })
}
