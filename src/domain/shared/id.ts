export function newId(prefix = 'id'): string {
  const rand =
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
  return `${prefix}_${rand}`
}

export function todayISO(): string {
  return new Date().toISOString().slice(0, 10)
}

export function minutesBetween(fromISO: string, toISO: string): number {
  return Math.max(0, Math.round((new Date(toISO).getTime() - new Date(fromISO).getTime()) / 60000))
}

export function formatDuration(seconds: number): string {
  if (!Number.isFinite(seconds)) return '—'
  const s = Math.max(0, Math.floor(seconds))
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = s % 60
  return h > 0
    ? `${h}h ${m.toString().padStart(2, '0')}m`
    : `${m}m ${sec.toString().padStart(2, '0')}s`
}

export function relativeTime(iso: string, now = Date.now()): string {
  const diff = new Date(iso).getTime() - now
  const abs = Math.abs(diff)
  const mins = Math.round(abs / 60000)
  if (mins < 1) return diff >= 0 ? 'now' : 'just now'
  if (mins < 60) return diff >= 0 ? `in ${mins}m` : `${mins}m ago`
  const hours = Math.round(mins / 60)
  if (hours < 24) return diff >= 0 ? `in ${hours}h` : `${hours}h ago`
  const days = Math.round(hours / 24)
  return diff >= 0 ? `in ${days}d` : `${days}d ago`
}
