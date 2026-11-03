import { describe, expect, it } from 'vitest'
import { appendAuditEntry, formatAuditTime, type AuditEntry } from '@/domain/audit'

const entry = (id: string, at = new Date(2026, 10, 3, 12, 0).toISOString()): AuditEntry => ({
  id,
  at,
  actorId: 'ADM-0001',
  actorName: 'Shabh Admin',
  action: 'role_changed',
  detail: `Change ${id}`
})

describe('audit log helpers', () => {
  it('puts the newest entry first', () => {
    const entries = appendAuditEntry([entry('old')], entry('new'))
    expect(entries.map((item) => item.id)).toEqual(['new', 'old'])
  })

  it('caps the log so local storage cannot grow forever', () => {
    let entries: AuditEntry[] = []
    for (let index = 0; index < 120; index += 1) {
      entries = appendAuditEntry(entries, entry(String(index)), 100)
    }
    expect(entries).toHaveLength(100)
    expect(entries[0].id).toBe('119')
    expect(entries[99].id).toBe('20')
  })

  it('formats recent and older timestamps', () => {
    const now = new Date(2026, 10, 3, 12, 0)
    expect(formatAuditTime(new Date(now.getTime() - 20_000).toISOString(), now)).toBe('just now')
    expect(formatAuditTime(new Date(now.getTime() - 12 * 60_000).toISOString(), now)).toBe('12 min ago')
    expect(formatAuditTime(new Date(now.getTime() - 3 * 3_600_000).toISOString(), now)).toBe('3 h ago')
    expect(formatAuditTime('not-a-date', now)).toBe('Unknown time')
  })
})
