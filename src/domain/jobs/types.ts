export type JobKind = 'amc' | 'breakdown' | 'survey' | 'sitc'
export type JobStatus = 'pending' | 'assigned' | 'en_route' | 'started' | 'completed' | 'cancelled'
export type ServiceStatus = 'pending' | 'in_progress' | 'done'
export type ChecklistResult = 'pass' | 'fail' | 'na'
export type IssueSeverity = 'minor' | 'major' | 'critical'

/**
 * Customer credit tier. Tier 1 customers get a shorter visit window than
 * tier 2, so the technician can plan the day around the clock.
 */
export type CreditTier = 1 | 2

export const TIER_LIMITS_MINUTES: Record<CreditTier, number> = { 1: 60, 2: 90 }

export const TIER_LABEL: Record<CreditTier, string> = {
  1: 'Tier 1 · 60 min',
  2: 'Tier 2 · 90 min'
}

export interface ChecklistEntry {
  itemId: string
  result: ChecklistResult
  note?: string
}

export interface ServiceItem {
  id: string
  name: string
  system: string
  templateId?: string
  status: ServiceStatus
  checklist: ChecklistEntry[]
  beforePhotoIds: string[]
  afterPhotoIds: string[]
  startedAt?: string
  completedAt?: string
  notes?: string
}

export interface JobIssue {
  id: string
  serviceItemId: string
  severity: IssueSeverity
  description: string
  photoId?: string
  raisedAt: string
  resolvedAt?: string
}

export interface ServiceJob {
  id: string
  code: string
  customerName: string
  contactName: string
  phone: string
  address: string
  area?: string
  kind: JobKind
  priority: 'normal' | 'urgent'
  status: JobStatus
  assignedTo: string
  services: ServiceItem[]
  slotStart: string
  slaDue: string
  createdAt: string
  /** Customer credit tier; tier 1 = 60 min, tier 2 = 90 min. */
  tier?: CreditTier
  /** Minutes allowed for the whole visit, counted from OTP verification. */
  workLimitMinutes?: number
  /** Absolute deadline set when the start OTP is verified. */
  workDueAt?: string
  completedLate?: boolean
  otpVerifiedAt?: string
  /** Set when the customer's work-done OTP is verified at the end of the visit. */
  workDoneOtpAt?: string
  startedAt?: string
  completedAt?: string
  checkIn?: { lat: number; lng: number; accuracy: number; at: string }
  checkOut?: { lat: number; lng: number; accuracy: number; at: string }
  checkOutAt?: string
  signoffName?: string
  rating?: number
  issues: JobIssue[]
}

export interface ProofPhoto {
  id: string
  jobId: string
  serviceItemId: string
  kind: 'before' | 'after'
  blob: Blob
  capturedAt: string
  lat?: number
  lng?: number
  accuracy?: number
  watermark: string
}

export const JOB_KIND_LABEL: Record<JobKind, string> = {
  amc: 'AMC / preventive',
  breakdown: 'Breakdown call',
  survey: 'Site survey',
  sitc: 'Installation / SITC'
}

export const JOB_STATUS_LABEL: Record<JobStatus, string> = {
  pending: 'Pending',
  assigned: 'Assigned',
  en_route: 'On the way',
  started: 'In progress',
  completed: 'Completed',
  cancelled: 'Cancelled'
}

export function servicesDone(job: Pick<ServiceJob, 'services'>): number {
  return job.services.filter((service) => service.status === 'done').length
}

export function isJobComplete(job: Pick<ServiceJob, 'services'>): boolean {
  return job.services.length > 0 && job.services.every((service) => service.status === 'done')
}

export function openIssues(job: Pick<ServiceJob, 'issues'>): JobIssue[] {
  return job.issues.filter((issue) => !issue.resolvedAt)
}

export const DEFAULT_WORK_LIMIT_MINUTES = TIER_LIMITS_MINUTES[2]

export function tierLimitMinutes(tier: CreditTier | undefined): number {
  return TIER_LIMITS_MINUTES[tier ?? 2]
}

/** The visit window in force for a job: explicit limit wins, else the tier. */
export function jobLimitMinutes(
  job: Pick<ServiceJob, 'tier' | 'workLimitMinutes'>
): number {
  return job.workLimitMinutes ?? tierLimitMinutes(job.tier)
}

/**
 * Houses the technician closed on a given day. One finished visit = one shift
 * point, no matter how many inner services it contained.
 */
export function completedVisitsOn(
  jobs: Array<Pick<ServiceJob, 'status' | 'completedAt'>>,
  day = new Date()
): number {
  return jobs.filter((job) => {
    if (job.status !== 'completed' || !job.completedAt) return false
    const closed = new Date(job.completedAt)
    return (
      closed.getFullYear() === day.getFullYear() &&
      closed.getMonth() === day.getMonth() &&
      closed.getDate() === day.getDate()
    )
  }).length
}

export function workSeconds(job: Pick<ServiceJob, 'startedAt' | 'completedAt'>, now = Date.now()): number {
  if (!job.startedAt) return 0
  const end = job.completedAt ? new Date(job.completedAt).getTime() : now
  return Math.max(0, Math.round((end - new Date(job.startedAt).getTime()) / 1000))
}

export function remainingSeconds(job: Pick<ServiceJob, 'workDueAt'>, now = Date.now()): number | null {
  if (!job.workDueAt) return null
  return Math.round((new Date(job.workDueAt).getTime() - now) / 1000)
}
