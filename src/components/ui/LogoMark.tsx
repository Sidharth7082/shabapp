import clsx from 'clsx'

/**
 * Brand mark used in the app header, login and profile.
 *
 * A hollow flame inside a rounded tile — a placeholder until the real brand
 * asset lands (PLAN.md backlog item 9). Kept as inline SVG so the login screen
 * does not pull an image request before the bundle runs.
 */
export function LogoMark({
  size = 40,
  className,
  tone = 'light'
}: {
  size?: number
  className?: string
  /** `light` = white flame on the brand gradient (headers), `brand` = dark flame on a tinted tile. */
  tone?: 'light' | 'brand'
}) {
  return (
    <span
      className={clsx(
        'flex shrink-0 items-center justify-center rounded-2xl',
        tone === 'light'
          ? 'bg-white/15 text-white ring-1 ring-white/25'
          : 'bg-brand-50 text-brand-600',
        className
      )}
      style={{ width: size, height: size }}
    >
      <svg
        width={Math.round(size * 0.58)}
        height={Math.round(size * 0.58)}
        viewBox="0 0 24 24"
        fill="currentColor"
        aria-hidden="true"
      >
        <path
          fillRule="evenodd"
          clipRule="evenodd"
          d="M12 2.6c3.2 3.9 4.8 6.9 4.8 9.2a4.8 4.8 0 1 1-9.6 0c0-2.3 1.6-5.3 4.8-9.2zm0 6.7c-1.4 1.8-2.1 3.1-2.1 4.2a2.1 2.1 0 1 0 4.2 0c0-1.1-.7-2.4-2.1-4.2z"
        />
      </svg>
    </span>
  )
}
