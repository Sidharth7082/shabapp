import { db } from '@/db/db'
import { newId } from '@/domain/shared/id'
import { jobLimitMinutes, tierLimitMinutes } from '@/domain/jobs/types'
import type {
  ChecklistEntry,
  CreditTier,
  JobIssue,
  JobKind,
  ServiceItem,
  ServiceJob
} from '@/domain/jobs/types'

export async function patchJob(jobId: string, patch: Partial<ServiceJob>): Promise<void> {
  await db.jobs.update(jobId, patch)
}

export async function patchService(
  jobId: string,
  serviceId: string,
  patch: Partial<ServiceItem>
): Promise<void> {
  const job = await db.jobs.get(jobId)
  if (!job) return
  const services = job.services.map((service) =>
    service.id === serviceId ? { ...service, ...patch } : service
  )
  await db.jobs.update(jobId, { services })
}

export async function appendServicePhoto(
  jobId: string,
  serviceId: string,
  photoId: string,
  kind: 'before' | 'after'
): Promise<void> {
  // One transaction so two rapid captures cannot clobber each other.
  await db.transaction('rw', db.jobs, async () => {
    const job = await db.jobs.get(jobId)
    if (!job) return
    const services = job.services.map((service) => {
      if (service.id !== serviceId) return service
      return kind === 'before'
        ? { ...service, beforePhotoIds: [...service.beforePhotoIds, photoId] }
        : { ...service, afterPhotoIds: [...service.afterPhotoIds, photoId] }
    })

    const patch: Partial<ServiceJob> = { services }

    // Safety net for visits recorded before the OTP clock existed: if the
    // visit is already running but has no deadline, derive one. New visits get
    // their deadline when the customer's start OTP is verified.
    if (job.startedAt && !job.workDueAt && job.status !== 'completed' && job.status !== 'cancelled') {
      const limit = jobLimitMinutes(job)
      patch.workLimitMinutes = limit
      patch.workDueAt = new Date(new Date(job.startedAt).getTime() + limit * 60_000).toISOString()
    }

    await db.jobs.update(jobId, patch)
  })
}

export async function finishService(
  jobId: string,
  serviceId: string,
  checklist: ChecklistEntry[],
  issues: JobIssue[]
): Promise<void> {
  await db.transaction('rw', db.jobs, async () => {
    const job = await db.jobs.get(jobId)
    if (!job) return

    const services = job.services.map((service) =>
      service.id === serviceId
        ? { ...service, status: 'done' as const, checklist, completedAt: new Date().toISOString() }
        : service
    )

    await db.jobs.update(jobId, {
      services,
      // Re-completing a service replaces its previous findings instead of piling up.
      issues: [...job.issues.filter((issue) => issue.serviceItemId !== serviceId), ...issues],
      status:
        job.status === 'assigned' || job.status === 'pending' || job.status === 'en_route'
          ? 'started'
          : job.status
    })
  })
}

/**
 * The customer's start OTP is what starts the visit clock. The window comes
 * from their credit tier (tier 1 = 60 min, tier 2 = 90 min) and covers every
 * service in the visit; the deadline is never allowed to move once set.
 */
export async function startVisitClock(jobId: string): Promise<void> {
  await db.transaction('rw', db.jobs, async () => {
    const job = await db.jobs.get(jobId)
    if (!job) return

    const verifiedAt = job.otpVerifiedAt ?? new Date().toISOString()
    const patch: Partial<ServiceJob> = { otpVerifiedAt: verifiedAt }

    if (job.status !== 'completed' && job.status !== 'cancelled' && !job.workDueAt) {
      const limit = jobLimitMinutes(job)
      const startedAt = job.startedAt ?? verifiedAt
      patch.startedAt = startedAt
      patch.workLimitMinutes = limit
      patch.workDueAt = new Date(new Date(startedAt).getTime() + limit * 60_000).toISOString()
      patch.status = 'started'
    }

    await db.jobs.update(jobId, patch)
  })
}

export async function completeJob(
  jobId: string,
  details: { signoffName: string; rating: number; workDoneOtpAt?: string }
): Promise<boolean> {
  const job = await db.jobs.get(jobId)
  if (!job) return false
  if (job.services.some((service) => service.status !== 'done')) return false

  const now = new Date()
  const late = job.workDueAt ? now.getTime() > new Date(job.workDueAt).getTime() : false
  await db.jobs.update(jobId, {
    status: 'completed',
    completedAt: now.toISOString(),
    checkOutAt: now.toISOString(),
    signoffName: details.signoffName,
    rating: details.rating,
    workDoneOtpAt: details.workDoneOtpAt ?? job.workDoneOtpAt,
    completedLate: late
  })
  return true
}

export interface NewJobInput {
  customerName: string
  contactName: string
  phone: string
  address: string
  area?: string
  kind: JobKind
  priority: 'normal' | 'urgent'
  services: Array<{ name: string; system: string; templateId?: string }>
  slotStart: string
  slaMinutes: number
  tier: CreditTier
  assignedTo: string
}

async function nextCode(): Promise<string> {
  const jobs = await db.jobs.toArray()
  const used = new Set(jobs.map((job) => job.code))
  const numbers = jobs
    .map((job) => Number(job.code.replace(/\D/g, '')))
    .filter((value) => Number.isFinite(value))
  let next = (numbers.length > 0 ? Math.max(...numbers) : 1040) + 1
  while (used.has(`SH-${next}`)) next += 1
  return `SH-${next}`
}

export async function createJob(input: NewJobInput): Promise<ServiceJob> {
  const now = new Date()
  const slaMinutes = Math.min(1440, Math.max(15, Math.round(input.slaMinutes) || 240))
  const tier: CreditTier = input.tier === 1 ? 1 : 2
  const workLimitMinutes = tierLimitMinutes(tier)
  const job: ServiceJob = {
    id: newId('job'),
    code: await nextCode(),
    customerName: input.customerName.trim(),
    contactName: input.contactName.trim(),
    phone: input.phone.replace(/\D/g, '').slice(-10),
    address: input.address.trim(),
    area: input.area?.trim() || undefined,
    kind: input.kind,
    priority: input.priority,
    status: 'assigned',
    assignedTo: input.assignedTo,
    services: input.services.map((service) => ({
      id: newId('svc'),
      name: service.name.trim(),
      system: service.system,
      templateId: service.templateId,
      status: 'pending',
      checklist: [],
      beforePhotoIds: [],
      afterPhotoIds: []
    })),
    slotStart: input.slotStart,
    slaDue: new Date(new Date(input.slotStart).getTime() + slaMinutes * 60_000).toISOString(),
    tier,
    workLimitMinutes,
    createdAt: now.toISOString(),
    issues: []
  }
  await db.jobs.add(job)
  return job
}

export async function deleteJob(jobId: string): Promise<void> {
  await db.jobs.delete(jobId)
  const photos = await db.photos.where('jobId').equals(jobId).toArray()
  await db.photos.bulkDelete(photos.map((photo) => photo.id))
}
