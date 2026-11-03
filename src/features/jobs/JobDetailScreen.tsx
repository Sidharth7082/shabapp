import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import clsx from 'clsx'
import { db } from '@/db/db'
import { Button } from '@/components/ui/Button'
import { Badge, Card, EmptyState, ProgressRing, SlaChip } from '@/components/ui/display'
import { PhotoThumb } from '@/components/PhotoThumb'
import {
  AlertIcon,
  ArrowLeftIcon,
  CheckIcon,
  NavigationIcon,
  PhoneIcon,
  PinIcon,
  ShieldIcon
} from '@/components/ui/icons'
import {
  JOB_KIND_LABEL,
  JOB_STATUS_LABEL,
  isJobComplete,
  jobLimitMinutes,
  servicesDone,
  type ServiceItem,
  type ServiceJob
} from '@/domain/jobs/types'
import { OtpGate } from './OtpGate'
import { ServiceFlow } from './ServiceFlow'
import { CompleteJobSheet } from './CompleteJobSheet'
import { JobTimer } from './JobTimer'
import { useSession } from '@/services/session'
import { canViewJob } from '@/domain/jobs/scope'
import { ROLE_LABEL } from '@/domain/auth/roles'

function ServiceRow({
  service,
  index,
  locked,
  onOpen
}: {
  service: ServiceItem
  index: number
  locked: boolean
  onOpen: () => void
}) {
  const done = service.status === 'done'
  const photos = service.beforePhotoIds.length + service.afterPhotoIds.length

  return (
    <Card className={clsx('p-3.5', done && 'bg-surface-raised')}>
      <div className="flex items-start gap-3">
        <span
          className={clsx(
            'flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-[12px] font-extrabold',
            done ? 'bg-ok-soft text-ok' : 'bg-brand-50 text-brand-600'
          )}
        >
          {done ? <CheckIcon size={16} /> : index + 1}
        </span>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <p className="text-[13px] font-bold leading-5 text-ink">{service.name}</p>
            <Badge tone={done ? 'ok' : service.status === 'in_progress' ? 'warn' : 'neutral'}>
              {done ? 'Done' : service.status === 'in_progress' ? 'Active' : 'Pending'}
            </Badge>
          </div>
          <p className="mt-0.5 text-[11px] text-ink-mute">
            {service.system}
            {service.checklist.length > 0 ? ` · ${service.checklist.length} checks` : ''}
            {photos > 0 ? ` · ${photos} photos` : ''}
          </p>

          {(service.beforePhotoIds[0] || service.afterPhotoIds[0]) && (
            <div className="mt-2 flex items-center gap-1.5">
              {service.beforePhotoIds[0] && (
                <div className="relative">
                  <PhotoThumb
                    photoId={service.beforePhotoIds[0]}
                    className="h-11 w-11 rounded-lg object-cover ring-1 ring-surface-line"
                    alt="Before"
                  />
                  <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 rounded bg-ink/80 px-1 text-[8px] font-bold uppercase text-white">
                    before
                  </span>
                </div>
              )}
              {service.afterPhotoIds[0] && (
                <div className="relative">
                  <PhotoThumb
                    photoId={service.afterPhotoIds[0]}
                    className="h-11 w-11 rounded-lg object-cover ring-1 ring-surface-line"
                    alt="After"
                  />
                  <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 rounded bg-brand-600 px-1 text-[8px] font-bold uppercase text-white">
                    after
                  </span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <Button
        variant={done ? 'secondary' : 'primary'}
        full
        className="mt-3"
        disabled={locked}
        onClick={onOpen}
      >
        {done ? 'Review evidence' : 'Start service'}
      </Button>
      {locked && (
        <p className="mt-1.5 text-center text-[10px] font-medium text-ink-mute">
          Verify the customer OTP to unlock
        </p>
      )}
    </Card>
  )
}

function StatusTimeline({ job }: { job: ServiceJob }) {
  const steps = [
    { label: 'Assigned', at: job.createdAt, done: true },
    { label: 'Start OTP', at: job.otpVerifiedAt, done: Boolean(job.otpVerifiedAt) },
    { label: 'Work OTP', at: job.workDoneOtpAt, done: Boolean(job.workDoneOtpAt) },
    { label: 'Closed', at: job.completedAt, done: Boolean(job.completedAt) }
  ]

  return (
    <div className="grid grid-cols-4 gap-1">
      {steps.map((step, index) => (
        <div key={step.label} className="flex flex-col items-center gap-1">
          <div className="relative flex h-6 w-full items-center justify-center">
            {index > 0 && (
              <span
                className={clsx(
                  'absolute left-0 top-1/2 h-0.5 w-1/2 -translate-y-1/2',
                  step.done ? 'bg-brand-400' : 'bg-surface-line'
                )}
              />
            )}
            {index < steps.length - 1 && (
              <span
                className={clsx(
                  'absolute right-0 top-1/2 h-0.5 w-1/2 -translate-y-1/2',
                  steps[index + 1].done ? 'bg-brand-400' : 'bg-surface-line'
                )}
              />
            )}
            <span
              className={clsx(
                'relative z-10 flex h-6 w-6 items-center justify-center rounded-full border-2',
                step.done
                  ? 'border-brand-500 bg-brand-500 text-white'
                  : 'border-surface-line bg-white text-ink-mute'
              )}
            >
              {step.done ? (
                <CheckIcon size={12} />
              ) : (
                <span className="h-1.5 w-1.5 rounded-full bg-current" />
              )}
            </span>
          </div>
          <span
            className={clsx(
              'text-center text-[9px] font-bold uppercase leading-tight tracking-wide',
              step.done ? 'text-brand-700' : 'text-ink-mute'
            )}
          >
            {step.label}
          </span>
          <span className="text-center text-[9px] leading-tight text-ink-mute">
            {step.at
              ? new Date(step.at).toLocaleTimeString('en-IN', {
                  hour: '2-digit',
                  minute: '2-digit'
                })
              : 'Pending'}
          </span>
        </div>
      ))}
    </div>
  )
}

export function JobDetailScreen() {
  const { id } = useParams<{ id: string }>()
  const job = useLiveQuery(async () => {
    if (!id) return null
    return (await db.jobs.get(id)) ?? null
  }, [id])
  const role = useSession((state) => state.role)
  const employeeName = useSession((state) => state.name)
  const [openService, setOpenService] = useState<string | null>(null)
  const [completing, setCompleting] = useState(false)

  if (job === undefined) {
    return <div className="px-4 py-6 text-sm text-ink-mute">Loading job…</div>
  }

  if (job === null) {
    return (
      <div className="px-4 py-8">
        <EmptyState title="Job not found" body="It may have been removed from this device." />
        <Link to="/" className="mt-4 block text-center text-sm font-semibold text-brand-600">
          Back to jobs
        </Link>
      </div>
    )
  }

  if (!canViewJob(job, role, employeeName)) {
    return (
      <div className="px-4 py-8">
        <Card className="p-5 text-center">
          <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-warn-soft text-warn">
            <ShieldIcon size={22} />
          </span>
          <h1 className="mt-3 text-[18px] font-extrabold tracking-tight text-ink">
            This visit is not yours
          </h1>
          <p className="mx-auto mt-1.5 max-w-xs text-[12px] leading-5 text-ink-mute">
            You are signed in as <strong className="text-ink-soft">{ROLE_LABEL[role]}</strong>.
            Only the assigned technician or a supervisor can open {job.code}.
          </p>
          <Link
            to="/"
            className="mt-4 inline-flex min-h-[44px] items-center justify-center rounded-xl bg-brand-600 px-4 text-[13px] font-bold text-white"
          >
            Back to my jobs
          </Link>
        </Card>
      </div>
    )
  }

  const done = servicesDone(job)
  const total = job.services.length
  const complete = job.status === 'completed'
  const allDone = isJobComplete(job)
  const verified = Boolean(job.otpVerifiedAt)

  return (
    <div className="space-y-4 px-4 pb-8 pt-3">
      <div className="flex items-center justify-between">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-[13px] font-bold text-ink-soft"
        >
          <span className="flex h-9 w-9 items-center justify-center rounded-xl border border-surface-line bg-white shadow-card">
            <ArrowLeftIcon size={17} />
          </span>
          Jobs
        </Link>
        <span className="text-[10px] font-bold uppercase tracking-widest text-ink-mute">
          {job.code}
        </span>
      </div>

      <Card className="overflow-hidden">
        <div className="p-4 pb-3">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-1.5">
                <Badge tone={complete ? 'ok' : job.status === 'started' ? 'warn' : 'neutral'}>
                  {JOB_STATUS_LABEL[job.status]}
                </Badge>
                <Badge tone="brand">{JOB_KIND_LABEL[job.kind]}</Badge>
                <Badge tone="info">
                  Tier {job.tier ?? 2} · {jobLimitMinutes(job)} min
                </Badge>
                {job.priority === 'urgent' && <Badge tone="danger">Urgent</Badge>}
              </div>
              <h1 className="mt-2 text-[22px] font-extrabold leading-tight tracking-tight text-ink">
                {job.customerName}
              </h1>
              <p className="mt-1 flex items-start gap-1 text-[12px] leading-5 text-ink-mute">
                <PinIcon size={13} className="mt-0.5" />
                <span>{job.address}</span>
              </p>
            </div>
            <ProgressRing value={done} total={total} size={54} />
          </div>

          <div className="mt-3 grid grid-cols-2 gap-2 rounded-xl bg-surface-sunken p-3">
            <div className="min-w-0">
              <p className="text-[9px] font-bold uppercase tracking-wider text-ink-mute">Slot</p>
              <p className="mt-0.5 truncate text-[12px] font-bold text-ink">
                {new Date(job.slotStart).toLocaleString('en-IN', {
                  day: '2-digit',
                  month: 'short',
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </p>
            </div>
            <div className="min-w-0">
              <p className="text-[9px] font-bold uppercase tracking-wider text-ink-mute">
                Contact
              </p>
              <p className="mt-0.5 truncate text-[12px] font-bold text-ink">{job.contactName}</p>
            </div>
          </div>

          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            <SlaChip dueAt={job.slaDue} done={complete} />
            {job.checkIn && (
              <span className="inline-flex items-center gap-1 rounded-full bg-surface-sunken px-2 py-1 text-[10px] font-semibold text-ink-soft">
                <PinIcon size={11} /> Checked in
              </span>
            )}
            {job.signoffName && (
              <span className="inline-flex items-center gap-1 rounded-full bg-ok-soft px-2 py-1 text-[10px] font-semibold text-ok">
                <CheckIcon size={11} /> {job.signoffName}
              </span>
            )}
          </div>
        </div>

        <div className="flex gap-2 border-t border-surface-line p-3">
          <a
            href={`tel:${job.phone}`}
            className="flex min-h-[44px] flex-1 items-center justify-center gap-1.5 rounded-xl border border-surface-line bg-white text-[12px] font-bold text-ink-soft transition active:scale-[0.98]"
          >
            <PhoneIcon size={15} /> Call
          </a>
          <a
            href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(job.address)}`}
            target="_blank"
            rel="noreferrer"
            className="flex min-h-[44px] flex-1 items-center justify-center gap-1.5 rounded-xl bg-brand-600 text-[12px] font-bold text-white transition active:scale-[0.98]"
          >
            <NavigationIcon size={15} /> Navigate
          </a>
        </div>
      </Card>

      {!complete && <OtpGate job={job} onVerified={() => undefined} />}

      <JobTimer job={job} />

      <Card className="p-3.5">
        <StatusTimeline job={job} />
      </Card>

      <section className="space-y-2.5">
        <div className="flex items-center justify-between">
          <h2 className="text-[15px] font-bold tracking-tight text-ink">Services in this visit</h2>
          <span className="tabular text-[11px] font-bold text-ink-mute">
            {done}/{total} done · {total - done} pending
          </span>
        </div>
        {job.services.map((service, index) => (
          <ServiceRow
            key={service.id}
            index={index}
            service={service}
            locked={!verified && !complete}
            onOpen={() => setOpenService(service.id)}
          />
        ))}
      </section>

      {job.issues.length > 0 && (
        <Card className="p-4">
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-danger-soft text-danger">
              <AlertIcon size={14} />
            </span>
            <h2 className="text-[13px] font-bold text-ink">Issues from this visit</h2>
            <span className="tabular ml-auto text-[11px] font-bold text-ink-mute">
              {job.issues.length}
            </span>
          </div>
          <ul className="mt-2.5 space-y-2">
            {job.issues.map((issue) => (
              <li
                key={issue.id}
                className="rounded-xl border border-surface-line bg-surface-sunken px-3 py-2"
              >
                <div className="flex items-center justify-between gap-2">
                  <span
                    className={clsx(
                      'rounded-full px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide',
                      issue.severity === 'critical'
                        ? 'bg-danger text-white'
                        : issue.severity === 'major'
                          ? 'bg-warn-soft text-warn'
                          : 'bg-surface-line text-ink-soft'
                    )}
                  >
                    {issue.severity}
                  </span>
                  <span className="text-[10px] font-semibold text-ink-mute">
                    {issue.resolvedAt ? 'Resolved' : 'Open'}
                  </span>
                </div>
                <p className="mt-1 text-[11px] leading-5 text-ink-soft">{issue.description}</p>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {!complete && allDone && (
        <div className="sticky bottom-24 z-10">
          <Button
            full
            size="lg"
            variant="primary"
            onClick={() => setCompleting(true)}
            className="shadow-elevated"
          >
            Take work-done OTP & close
          </Button>
        </div>
      )}

      {complete && (
        <Card className="border-ok/30 bg-ok-soft/60 p-4">
          <div className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-ok text-white">
              <CheckIcon size={16} />
            </span>
            <div className="min-w-0">
              <p className="text-[13px] font-bold text-ok">Job completed</p>
              <p className="text-[11px] leading-4 text-ink-soft">
                {total} service{total === 1 ? '' : 's'} closed with live photo evidence
                {job.workDoneOtpAt ? ' and the customer\u2019s work-done OTP' : ''}
                {job.signoffName ? ` · accepted by ${job.signoffName}` : ''}
              </p>
            </div>
          </div>
        </Card>
      )}

      {openService && (
        <ServiceFlow jobId={job.id} serviceId={openService} onClose={() => setOpenService(null)} />
      )}
      {completing && <CompleteJobSheet job={job} onClose={() => setCompleting(false)} />}
    </div>
  )
}
