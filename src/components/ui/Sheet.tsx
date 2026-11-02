import clsx from 'clsx'
import { useEffect, useRef, type ReactNode } from 'react'
import { IconButton } from './Button'

export function Sheet({
  open,
  onClose,
  title,
  subtitle,
  children,
  footer,
  fullHeight
}: {
  open: boolean
  onClose: () => void
  title: string
  subtitle?: string
  children: ReactNode
  footer?: ReactNode
  fullHeight?: boolean
}) {
  const panelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const previousFocus = document.activeElement as HTMLElement | null
    const panel = panelRef.current
    panel?.focus()

    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose()
        return
      }
      if (event.key !== 'Tab' || !panel) return
      const focusable = panel.querySelectorAll<HTMLElement>(
        'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
      )
      if (focusable.length === 0) return
      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }

    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = previous
      window.removeEventListener('keydown', onKey)
      previousFocus?.focus?.()
    }
  }, [open, onClose])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end" role="dialog" aria-modal="true" aria-label={title}>
      <button
        type="button"
        aria-hidden="true"
        tabIndex={-1}
        onClick={onClose}
        className="absolute inset-0 bg-ink/40 backdrop-blur-[2px]"
      />
      <div
        ref={panelRef}
        tabIndex={-1}
        className={clsx(
          'relative z-10 flex w-full animate-sheet-up flex-col overflow-hidden rounded-t-3xl bg-surface-sunken shadow-sheet outline-none',
          fullHeight ? 'h-[94dvh]' : 'max-h-[92dvh]'
        )}
      >
        <div className="flex justify-center bg-white pt-2.5">
          <span className="h-1.5 w-10 rounded-full bg-surface-line" aria-hidden="true" />
        </div>
        <div className="flex items-start justify-between gap-3 border-b border-surface-line bg-white px-4 pb-3 pt-1.5">
          <div className="min-w-0">
            <h2 className="truncate text-base font-bold text-ink">{title}</h2>
            {subtitle && <p className="mt-0.5 truncate text-xs text-ink-mute">{subtitle}</p>}
          </div>
          <IconButton label="Close" onClick={onClose}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
            </svg>
          </IconButton>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">{children}</div>
        {footer && (
          <div className="safe-bottom border-t border-surface-line bg-white px-4 pt-3 shadow-[0_-8px_24px_rgba(16,24,40,0.05)]">
            {footer}
          </div>
        )}
      </div>
    </div>
  )
}
