import clsx from 'clsx'
import type {
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
  TextareaHTMLAttributes
} from 'react'
import { useId } from 'react'

const controlBase =
  'w-full rounded-xl border border-surface-line bg-white px-3.5 py-3 text-[15px] text-ink ' +
  'placeholder:text-ink-mute focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-500/20 ' +
  'disabled:bg-surface-sunken disabled:text-ink-mute'

export function Field({
  label,
  hint,
  error,
  htmlFor,
  children,
  className
}: {
  label: string
  hint?: string
  error?: string
  htmlFor?: string
  children: ReactNode
  className?: string
}) {
  return (
    <div className={clsx('space-y-1.5', className)}>
      <label htmlFor={htmlFor} className="block text-sm font-semibold text-ink">
        {label}
      </label>
      {children}
      {hint && !error && <p className="text-xs leading-5 text-ink-mute">{hint}</p>}
      {error && (
        <p role="alert" className="text-xs font-semibold text-danger">
          {error}
        </p>
      )}
    </div>
  )
}

export function TextInput({
  label,
  hint,
  error,
  className,
  ...rest
}: InputHTMLAttributes<HTMLInputElement> & { label: string; hint?: string; error?: string }) {
  const id = useId()
  return (
    <Field label={label} hint={hint} error={error} htmlFor={id} className={className}>
      <input id={id} className={controlBase} {...rest} />
    </Field>
  )
}

export function NumberInput({
  label,
  hint,
  error,
  suffix,
  className,
  ...rest
}: InputHTMLAttributes<HTMLInputElement> & {
  label: string
  hint?: string
  error?: string
  suffix?: string
}) {
  const id = useId()
  return (
    <Field label={label} hint={hint} error={error} htmlFor={id} className={className}>
      <div className="relative">
        <input
          id={id}
          type="text"
          inputMode="decimal"
          autoComplete="off"
          className={clsx(controlBase, suffix && 'pr-12')}
          {...rest}
        />
        {suffix && (
          <span className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-sm text-ink-mute">
            {suffix}
          </span>
        )}
      </div>
    </Field>
  )
}

export function Select({
  label,
  hint,
  error,
  className,
  children,
  ...rest
}: SelectHTMLAttributes<HTMLSelectElement> & {
  label: string
  hint?: string
  error?: string
}) {
  const id = useId()
  return (
    <Field label={label} hint={hint} error={error} htmlFor={id} className={className}>
      <select id={id} className={clsx(controlBase, 'pr-9')} {...rest}>
        {children}
      </select>
    </Field>
  )
}

export function Textarea({
  label,
  hint,
  error,
  className,
  ...rest
}: TextareaHTMLAttributes<HTMLTextAreaElement> & {
  label: string
  hint?: string
  error?: string
}) {
  const id = useId()
  return (
    <Field label={label} hint={hint} error={error} htmlFor={id} className={className}>
      <textarea id={id} rows={3} className={controlBase} {...rest} />
    </Field>
  )
}

export function SegmentedControl<T extends string>({
  value,
  options,
  onChange,
  ariaLabel
}: {
  value: T
  options: Array<{ value: T; label: string }>
  onChange: (value: T) => void
  ariaLabel: string
}) {
  return (
    <div
      role="radiogroup"
      aria-label={ariaLabel}
      className="grid auto-cols-fr grid-flow-col gap-1 rounded-xl bg-surface-sunken p-1"
    >
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          role="radio"
          aria-checked={value === option.value}
          onClick={() => onChange(option.value)}
          className={clsx(
            'min-h-[42px] rounded-lg px-2 text-sm font-semibold transition-colors',
            value === option.value
              ? 'bg-white text-brand-600 shadow-card'
              : 'text-ink-soft hover:text-ink'
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  )
}
