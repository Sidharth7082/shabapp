import clsx from 'clsx'
import type { ReactNode } from 'react'

export function Card({
  children,
  className,
  as: Tag = 'div'
}: {
  children: ReactNode
  className?: string
  as?: 'div' | 'section' | 'article'
}) {
  return (
    <Tag className={clsx('rounded-2xl border border-surface-line bg-white shadow-card', className)}>
      {children}
    </Tag>
  )
}

export function SectionHeader({
  title,
  action,
  subtitle
}: {
  title: string
  subtitle?: string
  action?: ReactNode
}) {
  return (
    <div className="mb-3 flex items-end justify-between gap-3">
      <div className="min-w-0">
        <h2 className="text-[15px] font-bold tracking-tight text-ink">{title}</h2>
        {subtitle && <p className="mt-0.5 text-[11px] text-ink-mute">{subtitle}</p>}
      </div>
      {action}
    </div>
  )
}

type Tone = 'neutral' | 'brand' | 'ok' | 'warn' | 'danger' | 'info'

const tones: Record<Tone, string> = {
  neutral: 'bg-surface-sunken text-ink-soft border-surface-line',
  brand: 'bg-brand-50 text-brand-700 border-brand-100',
  ok: 'bg-ok-soft text-ok border-ok/20',
  warn: 'bg-warn-soft text-warn border-warn/20',
  danger: 'bg-danger-soft text-danger border-danger/20',
  info: 'bg-info-soft text-info border-info/20'
}

export function Badge({
  children,
  tone = 'neutral',
  className
}: {
  children: ReactNode
  tone?: Tone
  className?: string
}) {
  return (
    <span
      className={clsx(
        'inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide',
        tones[tone],
        className
      )}
    >
      {children}
    </span>
  )
}

export function Stat({
  label,
  value,
  hint,
  tone = 'neutral',
  icon
}: {
  label: string
  value: ReactNode
  hint?: string
  tone?: Tone
  icon?: ReactNode
}) {
  return (
    <div className={clsx('relative overflow-hidden rounded-2xl border p-3.5 shadow-card', tones[tone])}>
      {icon && <span className="absolute right-3 top-3 opacity-50">{icon}</span>}
      <p className="pr-6 text-[10px] font-bold uppercase leading-4 tracking-wider opacity-75">
        {label}
      </p>
      <p className="tabular mt-1.5 text-2xl font-extrabold leading-none">{value}</p>
      {hint && <p className="mt-1 text-[11px] leading-4 opacity-75">{hint}</p>}
    </div>
  )
}

export function EmptyState({
  title,
  body,
  action,
  icon
}: {
  title: string
  body?: string
  action?: ReactNode
  icon?: ReactNode
}) {
  return (
    <div className="rounded-2xl border border-dashed border-surface-line bg-white px-6 py-9 text-center">
      {icon && (
        <span className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-2xl bg-brand-50 text-brand-500">
          {icon}
        </span>
      )}
      <p className="text-[15px] font-bold text-ink">{title}</p>
      {body && <p className="mx-auto mt-1.5 max-w-xs text-sm leading-6 text-ink-mute">{body}</p>}
      {action && <div className="mt-4 flex justify-center">{action}</div>}
    </div>
  )
}

export function ProgressRing({
  value,
  total,
  size = 44,
  label
}: {
  value: number
  total: number
  size?: number
  label?: string
}) {
  const pct = total > 0 ? Math.min(100, Math.round((value / total) * 100)) : 0
  const stroke = 5
  const radius = (size - stroke) / 2
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (pct / 100) * circumference

  return (
    <div
      className="relative inline-flex items-center justify-center"
      style={{ width: size, height: size }}
      role="img"
      aria-label={label ?? `${value} of ${total} complete`}
    >
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="#eef0ec" strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="#4b6b36"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="transition-[stroke-dashoffset] duration-500"
        />
      </svg>
      <span className="tabular absolute text-[11px] font-extrabold text-brand-600">
        {value}/{total}
      </span>
    </div>
  )
}

export function SlaChip({ dueAt, done }: { dueAt: string; done: boolean }) {
  if (done) return <Badge tone="ok">Done</Badge>
  const due = new Date(dueAt).getTime()
  if (!Number.isFinite(due)) return null
  const diffMs = due - Date.now()
  const mins = Math.round(diffMs / 60000)
  if (mins < 0) {
    return <Badge tone="danger">Overdue {Math.abs(mins)}m</Badge>
  }
  if (mins <= 60) return <Badge tone="warn">Due in {mins}m</Badge>
  const hours = Math.round(mins / 60)
  if (hours <= 8) return <Badge tone="neutral">Due in {hours}h</Badge>
  return <Badge tone="neutral">{new Date(dueAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}</Badge>
}

export function KeyValue({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 py-2">
      <dt className="text-sm text-ink-mute">{label}</dt>
      <dd className="text-right text-sm font-semibold text-ink">{value}</dd>
    </div>
  )
}

export function Divider({ className }: { className?: string }) {
  return <hr className={clsx('border-0 border-t border-surface-line', className)} />
}
