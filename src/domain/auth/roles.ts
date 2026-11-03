/**
 * Roles and permissions for the operations app.
 *
 * These checks shape the demo UI (which screens and actions are visible) and
 * are deliberately repeated at the route, screen and action level. They are a
 * UX boundary, not a server boundary: anyone who controls the device can edit
 * local storage. Production must enforce the same matrix in Supabase with
 * row-level security and a `profiles.role` column. See PLAN.md §3.
 */

export type Role = 'technician' | 'supervisor' | 'manager' | 'admin'

export const ROLE_ORDER: Role[] = ['technician', 'supervisor', 'manager', 'admin']

export const ROLE_LABEL: Record<Role, string> = {
  technician: 'Technician',
  supervisor: 'Supervisor',
  manager: 'Manager',
  admin: 'Admin'
}

export const ROLE_DESCRIPTION: Record<Role, string> = {
  technician: 'Own visits, photo proof and estimates',
  supervisor: 'Team status and job assignment',
  manager: 'Team performance and operations',
  admin: 'People, roles, audit and security'
}

export type Permission =
  | 'jobs:viewAll'
  | 'jobs:create'
  | 'jobs:assign'
  | 'jobs:delete'
  | 'team:view'
  | 'team:analytics'
  | 'admin:people'
  | 'admin:audit'
  | 'admin:security'

const PERMISSIONS: Record<Role, Permission[]> = {
  technician: [],
  supervisor: ['jobs:viewAll', 'jobs:create', 'jobs:assign', 'team:view'],
  manager: [
    'jobs:viewAll',
    'jobs:create',
    'jobs:assign',
    'jobs:delete',
    'team:view',
    'team:analytics'
  ],
  admin: [
    'jobs:viewAll',
    'jobs:create',
    'jobs:assign',
    'jobs:delete',
    'team:view',
    'team:analytics',
    'admin:people',
    'admin:audit',
    'admin:security'
  ]
}

export function can(role: Role, permission: Permission): boolean {
  return PERMISSIONS[role]?.includes(permission) ?? false
}

export function roleAtLeast(role: Role, minimum: Role): boolean {
  return ROLE_ORDER.indexOf(role) >= ROLE_ORDER.indexOf(minimum)
}

/** Only a technician's board is scoped to their own name. */
export function seesAllJobs(role: Role): boolean {
  return can(role, 'jobs:viewAll')
}

/** Roles that appear on the field team board and can be assigned visits. */
export const FIELD_ROLES: Role[] = ['technician', 'supervisor']

export function isFieldRole(role: Role): boolean {
  return role === 'technician' || role === 'supervisor'
}
