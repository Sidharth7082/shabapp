import Dexie, { type Table } from 'dexie'
import type { ProofPhoto, ServiceJob } from '@/domain/jobs/types'

export interface EstimateRecord {
  id: string
  kind: 'gas' | 'fire-alarm-boq' | 'quotation' | 'amc'
  title: string
  createdAt: string
  payload: unknown
  subtotal: number
  gst: number
  total: number
}

export interface SettingRecord {
  key: string
  value: unknown
}

export class ShabhDatabase extends Dexie {
  jobs!: Table<ServiceJob, string>
  photos!: Table<ProofPhoto, string>
  estimates!: Table<EstimateRecord, string>
  settings!: Table<SettingRecord, string>

  constructor() {
    super('shabh-service')
    this.version(1).stores({
      jobs: 'id, status, assignedTo, createdAt, slaDue, code',
      photos: 'id, jobId, serviceItemId, capturedAt',
      estimates: 'id, kind, createdAt',
      settings: 'key'
    })
  }
}

export const db = new ShabhDatabase()

export async function settingGet<T>(key: string, fallback: T): Promise<T> {
  const row = await db.settings.get(key)
  return row ? (row.value as T) : fallback
}

export async function settingSet(key: string, value: unknown): Promise<void> {
  await db.settings.put({ key, value })
}
