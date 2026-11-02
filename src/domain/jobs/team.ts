import type { ServiceJob } from './types'

/**
 * Last known position for an employee. Positions are only captured when the
 * app is used on site: at start-OTP verification (check-in) and at sign-off
 * (check-out). Without a backend this is whatever the device has stored.
 */
export interface EmployeePing {
  at: string
  lat: number
  lng: number
  accuracy: number
  kind: 'check-in' | 'check-out'
  jobId: string
  jobCode: string
  customerName: string
}

type LocatableJob = Pick<
  ServiceJob,
  'id' | 'code' | 'customerName' | 'assignedTo' | 'checkIn' | 'checkOut'
>

export function latestEmployeePing(
  jobs: LocatableJob[],
  employeeName: string
): EmployeePing | null {
  let latest: EmployeePing | null = null

  for (const job of jobs) {
    if (job.assignedTo !== employeeName) continue

    if (job.checkIn) {
      latest = newer(latest, { ...job.checkIn, kind: 'check-in', job })
    }
    if (job.checkOut) {
      latest = newer(latest, { ...job.checkOut, kind: 'check-out', job })
    }
  }

  return latest
}

function newer(
  current: EmployeePing | null,
  next: {
    at: string
    lat: number
    lng: number
    accuracy: number
    kind: EmployeePing['kind']
    job: LocatableJob
  }
): EmployeePing {
  const candidate: EmployeePing = {
    at: next.at,
    lat: next.lat,
    lng: next.lng,
    accuracy: next.accuracy,
    kind: next.kind,
    jobId: next.job.id,
    jobCode: next.job.code,
    customerName: next.job.customerName
  }
  if (!current) return candidate
  return new Date(candidate.at).getTime() > new Date(current.at).getTime() ? candidate : current
}

/** True while the employee has a visit that has started and not been closed. */
export function employeeOnSite(
  jobs: Array<Pick<ServiceJob, 'assignedTo' | 'status'>>,
  employeeName: string
): boolean {
  return jobs.some((job) => job.assignedTo === employeeName && job.status === 'started')
}
