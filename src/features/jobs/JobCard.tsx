import { Link } from 'react-router-dom'
import clsx from 'clsx'
import { Badge, ProgressRing, SlaChip } from '@/components/ui/display'
import { ChevronRightIcon, ClockIcon, PinIcon, StarIcon } from '@/components/ui/icons'
import {
  JOB_KIND_LABEL,
  JOB_STATUS_LABEL,
  jobLimitMinutes,
  servicesDone,
  type ServiceJob
} from '@/domain/jobs/types'
import { JobTimer } from './JobTimer'

export function JobCard({ job }: { job: ServiceJob }) {
  const done = servicesDone(job)
  const total = job.services.length
  const complete = job.status === 'completed'
  const running = job.status === 'started'
  const overdue = !complete && new Date(job.slaDue).getTime() < Date.now()
  const pending = job.services.filter((service) => service.status !== 'done')
  const accent = complete ? 'bg-ok' : overdue ? 'bg-danger' : running ? 'bg-warn' : 'bg-brand-400'

  return (
    <Link
      to={`/jobs/${job.id}`}
      className="group relative block overflow-hidden rounded-2xl border border-surface-line bg-white shadow-card transition duration-200 hover:-translate-y-0.5 hover:shadow-raised active:translate-y-0 active:scale-[0.995]"
    >
      <span className={clsx('absolute inset-y-0 left-0 w-1', accent)} aria-hidden="true" />
      <div className="p-4 pl-[18px]">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold uppercase tracking-widest text-ink-mute">
                {job.code}
              </span>
              {job.priority === 'urgent' && !complete && <Badge tone="danger">Urgent</Badge>}
              {complete && job.rating ? (
                <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-warn">
                  <StarIcon size={11} /> {job.rating}.0
                </span>
              ) : null}
            </div>
            <h3 className="mt-1 truncate text-[16px] font-bold leading-tight tracking-tight text-ink">
              {job.customerName}
            </h3>
            <p className="mt-1 flex items-center gap-1 text-[11px] text-ink-mute">
              <PinIcon size={12} />
              <span className="truncate">{job.address}</span>
            </p>
          </div>
          <ProgressRing value={done} total={total} size={46} />
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-1.5">
          <Badge tone="brand">{JOB_KIND_LABEL[job.kind]}</Badge>
          <Badge tone="info">
            Tier {job.tier ?? 2} · {jobLimitMinutes(job)}m
          </Badge>
          <Badge tone={complete ? 'ok' : running ? 'warn' : 'neutral'}>
            {complete ? 'Completed' : JOB_STATUS_LABEL[job.status]}
          </Badge>
          {running && <JobTimer job={job} variant="chip" />}
        </div>

        {!complete && pending.length > 0 && (
          <div className="mt-2.5 flex flex-wrap items-center gap-1">
            {pending.slice(0, 2).map((service) => (
              <span
                key={service.id}
                className="max-w-[46%] truncate rounded-md bg-surface-sunken px-1.5 py-0.5 text-[10px] font-medium text-ink-soft"
              >
                {service.name}
              </span>
            ))}
            {pending.length > 2 && (
              <span className="text-[10px] font-bold text-ink-mute">+{pending.length - 2} more</span>
            )}
          </div>
        )}

        <div className="mt-3 flex items-center justify-between gap-2 border-t border-surface-line pt-2.5">
          <span className="flex min-w-0 items-center gap-1.5 text-[11px] font-medium text-ink-soft">
            <ClockIcon size={13} className="text-ink-mute" />
            {new Date(job.slotStart).toLocaleTimeString('en-IN', {
              hour: '2-digit',
              minute: '2-digit'
            })}
            <span className="truncate text-ink-mute">
              {complete ? '· all services done' : `· ${total - done} left`}
            </span>
          </span>
          <div className="flex shrink-0 items-center gap-1.5">
            {!complete && <SlaChip dueAt={job.slaDue} done={false} />}
            <ChevronRightIcon
              size={15}
              className="text-ink-mute transition group-hover:translate-x-0.5 group-hover:text-brand-600"
            />
          </div>
        </div>
      </div>
    </Link>
  )
}

