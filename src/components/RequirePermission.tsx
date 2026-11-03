import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { Card } from '@/components/ui/display'
import { ShieldIcon } from '@/components/ui/icons'
import { can, type Permission, type Role } from '@/domain/auth/roles'
import { ROLE_LABEL, ROLE_DESCRIPTION } from '@/domain/auth/roles'
import { useSession } from '@/services/session'

const PERMISSION_LABEL: Record<Permission, string> = {
  'jobs:viewAll': 'the full job board',
  'jobs:create': 'the control room',
  'jobs:assign': 'job assignment',
  'jobs:delete': 'job deletion',
  'team:view': 'the team board',
  'team:analytics': 'team performance',
  'admin:people': 'the admin console',
  'admin:audit': 'the audit log',
  'admin:security': 'security settings'
}

/**
 * Client-side route gate. It stops accidental access and makes the rule
 * visible, but the real boundary is the server (Supabase Auth + RLS). The
 * access-denied panel says that out loud.
 */
export function AccessDenied({ permission, role }: { permission: Permission; role: Role }) {
  return (
    <div className="px-4 py-8">
      <Card className="p-5 text-center">
        <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-warn-soft text-warn">
          <ShieldIcon size={22} />
        </span>
        <h1 className="mt-3 text-[18px] font-extrabold tracking-tight text-ink">
          Not available for your role
        </h1>
        <p className="mx-auto mt-1.5 max-w-xs text-[12px] leading-5 text-ink-mute">
          You are signed in as <strong className="text-ink-soft">{ROLE_LABEL[role]}</strong>.{' '}
          {ROLE_DESCRIPTION[role]} · {PERMISSION_LABEL[permission]} needs elevated access.
        </p>
        <p className="mx-auto mt-2 max-w-xs text-[10px] leading-4 text-ink-mute">
          Ask an admin if you need this access. Production enforces the same rule on the server
          with row-level security.
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

export function RequirePermission({
  permission,
  children
}: {
  permission: Permission
  children: ReactNode
}) {
  const role = useSession((state) => state.role)
  if (!can(role, permission)) return <AccessDenied permission={permission} role={role} />
  return <>{children}</>
}
