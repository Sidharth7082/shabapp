import { seesAllJobs } from '@/domain/auth/roles'
import type { Role } from '@/domain/auth/roles'
import type { ServiceJob } from './types'

/**
 * Field staff only see their own visits. Supervisors, managers and admins see
 * the whole board. This is repeated in every screen that can be reached by a
 * direct URL, not just hidden in the navigation.
 */
export function jobsForRole(
  jobs: ServiceJob[],
  role: Role,
  employeeName: string
): ServiceJob[] {
  if (seesAllJobs(role)) return jobs
  return jobs.filter((job) => job.assignedTo === employeeName)
}

export function canViewJob(
  job: Pick<ServiceJob, 'assignedTo'>,
  role: Role,
  employeeName: string
): boolean {
  return seesAllJobs(role) || job.assignedTo === employeeName
}
