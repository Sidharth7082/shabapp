import { useEffect, useRef, useState } from 'react'

/**
 * Numeric cell that edits as text so partial input like "3." or an empty box
 * does not get rewritten mid-keystroke. Commits a number to the parent.
 */
export function RateInput({
  value,
  onChange,
  integer,
  className,
  ariaLabel
}: {
  value: number
  onChange: (value: number) => void
  integer?: boolean
  className?: string
  ariaLabel?: string
}) {
  const display = (n: number) => (n === 0 ? '' : String(n))
  const [text, setText] = useState(() => display(value))
  const lastEmitted = useRef(value)

  useEffect(() => {
    if (value !== lastEmitted.current) {
      setText(display(value))
      lastEmitted.current = value
    }
  }, [value])

  return (
    <input
      aria-label={ariaLabel}
      className={
        className ?? 'no-print w-20 rounded border border-surface-line px-1.5 py-1 text-right'
      }
      inputMode={integer ? 'numeric' : 'decimal'}
      value={text}
      placeholder="0"
      onChange={(event) => {
        const raw = event.target.value.replace(integer ? /[^0-9]/g : /[^0-9.]/g, '')
        setText(raw)
        const parsed = Number.parseFloat(raw)
        const next = Number.isFinite(parsed) ? parsed : 0
        lastEmitted.current = next
        onChange(next)
      }}
      onBlur={() => setText(display(value))}
    />
  )
}
