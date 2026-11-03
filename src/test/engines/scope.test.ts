import { describe, expect, it } from 'vitest'
import { canViewJob, jobsForRole } from '@/domain/jobs/scope'
import type { ServiceJob } from '@/domain/jobs/types'

const job = (id: string, assignedTo: string) => ({ id, assignedTo }) as ServiceJob

const jobs = [job('a', 'Aarav Sharma'), job('b', 'Sana Khan')]

describe('job visibility by role', () => {
  it('shows a technician only their own jobs', () => {
    expect(jobsForRole(jobs, 'technician', 'Aarav Sharma').map((j) => j.id)).toEqual(['a'])
    expect(jobsForRole(jobs, 'technician', 'Sana Khan').map((j) => j.id)).toEqual(['b'])
  })

  it('shows the whole board to supervisor, manager and admin', () => {
    expect(jobsForRole(jobs, 'supervisor', 'Rohan Iyer')).toHaveLength(2)
    expect(jobsForRole(jobs, 'manager', 'Priya Menon')).toHaveLength(2)
    expect(jobsForRole(jobs, 'admin', 'Shabh Admin')).toHaveLength(2)
  })

  it('rejects a direct URL to another technician’s job', () => {
    expect(canViewJob(jobs[0], 'technician', 'Aarav Sharma')).toBe(true)
    expect(canViewJob(jobs[0], 'technician', 'Sana Khan')).toBe(false)
    expect(canViewJob(jobs[0], 'supervisor', 'Rohan Iyer')).toBe(true)
    expect(canViewJob(jobs[0], 'admin', 'Shabh Admin')).toBe(true)
  })
})
