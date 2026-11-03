import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/display'
import { Sheet } from '@/components/ui/Sheet'
import { PhoneIcon } from '@/components/ui/icons'
import { LOGIN_LOCK_MS, LOGIN_MAX_ATTEMPTS } from '@/domain/auth/login'
import { WEBSITE_URL } from '@/version'

/**
 * Loaded only when “Forgot PIN?” or the footer help link is tapped, so the
 * bottom-sheet code stays out of the eager login bundle on low-end phones.
 */
export function LoginHelpSheet({
  onClose,
  onFillDemo
}: {
  onClose: () => void
  onFillDemo: () => void
}) {
  return (
    <Sheet
      open
      onClose={onClose}
      title="Sign-in help"
      subtitle="Reset, lockout and administrator contact"
    >
      <div className="space-y-3">
        <div className="rounded-2xl border border-surface-line bg-white p-3.5">
          <div className="flex items-center justify-between">
            <p className="text-[13px] font-bold text-ink">Demo access</p>
            <Badge tone="warn">Demo</Badge>
          </div>
          <p className="mt-1 text-[12px] leading-5 text-ink-mute">
            Tap Aarav or Sana above to sign in without typing a PIN. Manual sign-in uses the
            employee ID and demo PIN from the project documentation; the PIN is not shown in the
            app.
          </p>
          <p className="mt-2 text-[11px] leading-5 text-ink-mute">
            Privileged demo IDs: <strong className="text-ink-soft">SUP-2001</strong> supervisor,{' '}
            <strong className="text-ink-soft">MGR-1001</strong> manager,{' '}
            <strong className="text-ink-soft">ADM-0001</strong> admin. They require their employee
            ID + PIN.
          </p>
          <Button variant="secondary" full className="mt-3" onClick={onFillDemo}>
            Fill technician ID
          </Button>
        </div>

        <div className="rounded-2xl border border-surface-line bg-white p-3.5">
          <p className="text-[13px] font-bold text-ink">Forgot or locked out?</p>
          <p className="mt-1 text-[12px] leading-5 text-ink-mute">
            In production an administrator resets the PIN through Supabase Auth; nobody can
            reveal the current PIN. {LOGIN_MAX_ATTEMPTS} wrong attempts lock this device for{' '}
            {LOGIN_LOCK_MS / 1000} seconds.
          </p>
          <a
            href={WEBSITE_URL}
            target="_blank"
            rel="noreferrer"
            className="mt-3 flex items-center justify-center gap-2 rounded-xl border border-surface-line px-3 py-2.5 text-[12px] font-bold text-brand-600 transition active:scale-[0.99]"
          >
            <PhoneIcon size={14} /> Contact administrator
          </a>
        </div>

        <p className="px-1 text-[10px] leading-4 text-ink-mute">
          This build is a demo: the PIN and the session live on this device only. Read the
          security model in the project docs before using it with real customers.
        </p>
      </div>
    </Sheet>
  )
}
