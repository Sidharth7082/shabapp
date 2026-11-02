import { Badge, Card } from '@/components/ui/display'
import { useNow } from '@/hooks/useNow'
import { formatDuration } from '@/domain/shared/id'
import {
  DEFAULT_WORK_LIMIT_MINUTES,
  remainingSeconds,
  servicesDone,
  workSeconds,
  type ServiceJob
} from '@/domain/jobs/types'

type Variant = 'card' | 'inline' | 'chip'

function urgency(remaining: number): { tone: 'ok' | 'warn' | 'danger'; label: string } {
  if (remaining < 0) return { tone: 'danger', label: 'Over limit' }
  if (remaining <= 10 * 60) return { tone: 'danger', label: 'Running out' }
  if (remaining <= 30 * 60) return { tone: 'warn', label: 'Watch the clock' }
  return { tone: 'ok', label: 'On time' }
}

/** Coarse, width-stable text for list chips. */
function shortDuration(seconds: number): string {
  const value = Math.max(0, Math.abs(seconds))
  if (value >= 3600) return `${Math.floor(value / 3600)}h ${Math.floor((value % 3600) / 60)}m`
  if (value >= 60) return `${Math.floor(value / 60)}m`
  return `${value}s`
}

/**
 * The visit clock starts with the technician's first live photo, not with the
 * OTP. A job holds many services (AC service, solar cleaning, fire checks) and
 * all of them must close before the work limit expires.
 */
export function JobTimer({ job, variant = 'card' }: { job: ServiceJob; variant?: Variant }) {
  const now = useNow(variant === 'chip' ? 15_000 : 1000)
  const total = job.services.length
  const done = servicesDone(job)

  if (!job.startedAt) {
    if (variant === 'chip') return null
    if (variant === 'inline') {
      return (
        <p className="text-[11px] font-semibold text-ink-mute">
          Timer starts with your first live photo.
        </p>
      )
    }
    return (
      <Card className="border-dashed p-3.5">
        <p className="text-xs font-bold uppercase tracking-wide text-ink-mute">Work timer</p>
        <p className="mt-1 text-sm font-semibold text-ink">
          Starts when you take the first photo
        </p>
        <p className="mt-1 text-xs leading-5 text-ink-mute">
          {job.workLimitMinutes ?? DEFAULT_WORK_LIMIT_MINUTES} minutes are allowed for all {total}{' '}
          service{total === 1 ? '' : 's'} in this visit.
        </p>
      </Card>
    )
  }

  const elapsed = workSeconds(job, now)
  const remaining = remainingSeconds(job, now)
  const finished = Boolean(job.completedAt)

  if (variant === 'chip') {
    if (finished) return null
    if (remaining === null) return <Badge tone="warn">{shortDuration(elapsed)} on site</Badge>
    return remaining >= 0 ? (
      <Badge tone={urgency(remaining).tone === 'ok' ? 'brand' : urgency(remaining).tone}>
        {shortDuration(remaining)} left
      </Badge>
    ) : (
      <Badge tone="danger">Over by {shortDuration(-remaining)}</Badge>
    )
  }

  if (variant === 'inline') {
    if (finished) {
      return (
        <p className="text-[11px] font-semibold text-ok">
          Finished in {formatDuration(elapsed)} · {done}/{total} services
        </p>
      )
    }
    const state = remaining === null ? null : urgency(remaining)
    return (
      <div className="flex items-center justify-between gap-2 rounded-lg bg-surface-sunken px-2.5 py-2">
        <span className="text-[11px] font-semibold text-ink-soft">
          {done}/{total} services
        </span>
        <span
          className={
            'text-[11px] font-bold ' +
            (state?.tone === 'danger'
              ? 'text-danger'
              : state?.tone === 'warn'
                ? 'text-warn'
                : 'text-brand-600')
          }
        >
          {remaining === null
            ? `${formatDuration(elapsed)} on site`
            : remaining >= 0
              ? `${formatDuration(remaining)} left`
              : `Over by ${formatDuration(-remaining)}`}
        </span>
      </div>
    )
  }

  const limitMinutes = job.workLimitMinutes ?? DEFAULT_WORK_LIMIT_MINUTES
  const limitSeconds = limitMinutes * 60
  const pct = Math.min(100, Math.round((elapsed / limitSeconds) * 100))
  const state = remaining === null ? null : urgency(remaining)

  return (
    <Card className="p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-wide text-ink-mute">
            {finished ? 'Work time' : 'Time left'}
          </p>
          <p
            className={
              'mt-1 text-2xl font-extrabold leading-tight ' +
              (finished
                ? 'text-ink'
                : state?.tone === 'danger'
                  ? 'text-danger'
                  : state?.tone === 'warn'
                    ? 'text-warn'
                    : 'text-brand-600')
            }
          >
            {finished
              ? formatDuration(elapsed)
              : remaining === null
                ? formatDuration(elapsed)
                : remaining >= 0
                  ? formatDuration(remaining)
                  : `+${formatDuration(-remaining)}`}
          </p>
          <p className="mt-0.5 text-xs text-ink-mute">
            {finished
              ? `${done}/${total} service${total === 1 ? '' : 's'} · started ${new Date(job.startedAt).toLocaleTimeString('en-IN', {
                  hour: '2-digit',
                  minute: '2-digit'
                })}`
              : `${done}/${total} service${total === 1 ? '' : 's'} done · limit ${limitMinutes} min`}
          </p>
        </div>
        {finished ? (
          <Badge tone={job.completedLate ? 'danger' : 'ok'}>
            {job.completedLate ? 'Over limit' : 'On time'}
          </Badge>
        ) : (
          <Badge tone={state?.tone ?? 'ok'}>{state?.label ?? 'Timing'}</Badge>
        )}
      </div>

      <div className="mt-3 h-2 overflow-hidden rounded-full bg-surface-line">
        <div
          className={
            'h-full rounded-full ' +
            (finished
              ? job.completedLate
                ? 'bg-danger'
                : 'bg-ok'
              : state?.tone === 'danger'
                ? 'bg-danger'
                : state?.tone === 'warn'
                  ? 'bg-warn'
                  : 'bg-brand-500')
          }
          style={{ width: `${finished ? Math.min(100, pct) : pct}%` }}
        />
      </div>

      <p className="mt-2 text-[11px] leading-4 text-ink-mute">
        {finished
          ? job.completedLate
            ? 'Visit finished after the work limit.'
            : 'Visit finished inside the work limit.'
          : job.workDueAt
            ? `${total === 1 ? 'Finish the service' : `Finish all ${total} services`} by ${new Date(job.workDueAt).toLocaleTimeString('en-IN', {
                hour: '2-digit',
                minute: '2-digit'
              })}.`
            : 'No work limit set for this job.'}
      </p>
    </Card>
  )
}
