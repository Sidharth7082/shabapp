import type { DemoEmployee } from '@/data/employees'
import type { Role } from './roles'

/**
 * A local override for a demo employee's role or shift target. Admins can
 * change another person's role in the Admin console; the change applies the
 * next time that person signs in. Production moves this to `profiles`.
 */
export interface TeamOverride {
  role?: Role
  dailyTarget?: number
}

export type TeamOverrides = Record<string, TeamOverride>

export const MAX_DAILY_TARGET = 50

export function clampDailyTarget(value: number): number {
  if (!Number.isFinite(value)) return 0
  return Math.max(0, Math.min(MAX_DAILY_TARGET, Math.round(value)))
}

export function applyOverride(
  employee: DemoEmployee,
  overrides: TeamOverrides
): DemoEmployee {
  const override = overrides[employee.id]
  if (!override) return employee
  return {
    ...employee,
    role: override.role ?? employee.role,
    dailyTarget:
      override.dailyTarget === undefined
        ? employee.dailyTarget
        : clampDailyTarget(override.dailyTarget)
  }
}

/** Admins cannot demote themselves; another admin must make the change. */
export function canChangeRole(actorId: string, targetId: string): boolean {
  return actorId !== targetId
}
