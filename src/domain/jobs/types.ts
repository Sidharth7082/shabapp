export type JobKind = 'amc' | 'breakdown' | 'survey' | 'sitc'
export type JobStatus = 'pending' | 'assigned' | 'en_route' | 'started' | 'completed' | 'cancelled'
export type ServiceStatus = 'pending' | 'in_progress' | 'done'
export type ChecklistResult = 'pass' | 'fail' | 'na'
export type IssueSeverity = 'minor' | 'major' | 'critical'

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
  /** Minutes allowed for the whole visit, counted from the first photo. */
  workLimitMinutes?: number
  /** Absolute deadline set when the first photo starts the clock. */
  workDueAt?: string
  completedLate?: boolean
  otpVerifiedAt?: string
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

export const DEFAULT_WORK_LIMIT_MINUTES = 120

export function workSeconds(job: Pick<ServiceJob, 'startedAt' | 'completedAt'>, now = Date.now()): number {
  if (!job.startedAt) return 0
  const end = job.completedAt ? new Date(job.completedAt).getTime() : now
  return Math.max(0, Math.round((end - new Date(job.startedAt).getTime()) / 1000))
}

export function remainingSeconds(job: Pick<ServiceJob, 'workDueAt'>, now = Date.now()): number | null {
  if (!job.workDueAt) return null
  return Math.round((new Date(job.workDueAt).getTime() - now) / 1000)
}
