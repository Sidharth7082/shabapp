import { db } from '@/db/db'
import { newId } from '@/domain/shared/id'
import { DEFAULT_WORK_LIMIT_MINUTES } from '@/domain/jobs/types'
import type {
  ChecklistEntry,
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

    // The first live photo is the arrival proof: it starts the visit clock.
    if (!job.startedAt && job.status !== 'completed' && job.status !== 'cancelled') {
      const limit = job.workLimitMinutes ?? DEFAULT_WORK_LIMIT_MINUTES
      const startedAt = new Date()
      patch.startedAt = startedAt.toISOString()
      patch.workLimitMinutes = limit
      patch.workDueAt = new Date(startedAt.getTime() + limit * 60_000).toISOString()
      patch.status = 'started'
    } else if (job.startedAt && !job.workDueAt && job.status !== 'completed' && job.status !== 'cancelled') {
      // Older records may already have a start time but no deadline.
      const limit = job.workLimitMinutes ?? DEFAULT_WORK_LIMIT_MINUTES
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

    const now = new Date().toISOString()
    await db.jobs.update(jobId, {
      services,
      // Re-completing a service replaces its previous findings instead of piling up.
      issues: [...job.issues.filter((issue) => issue.serviceItemId !== serviceId), ...issues],
      status:
        job.status === 'assigned' || job.status === 'pending' || job.status === 'en_route'
          ? 'started'
          : job.status,
      startedAt: job.startedAt ?? now
    })
  })
}

export async function completeJob(
  jobId: string,
  details: { signoffName: string; rating: number }
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
  workLimitMinutes: number
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
  const workLimitMinutes = Math.min(
    720,
    Math.max(5, Math.round(input.workLimitMinutes) || DEFAULT_WORK_LIMIT_MINUTES)
  )
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
