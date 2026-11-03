import { db, settingGet } from '@/db/db'
import { DEMO_EMPLOYEES, type DemoEmployee } from '@/data/employees'
import {
  applyOverride,
  type TeamOverride,
  type TeamOverrides
} from '@/domain/auth/people'
import { useSession } from '@/services/session'

/**
 * Local people directory overrides. The static demo directory provides the
 * credentials; this layer lets an admin change a role or shift target without
 * a backend. The change is local to this device and takes effect on the next
 * sign-in. Production reads `profiles` from Supabase instead.
 */
const KEY = 'teamOverrides'

export async function readTeamOverrides(): Promise<TeamOverrides> {
  const value = await settingGet<TeamOverrides>(KEY, {})
  return value && typeof value === 'object' ? value : {}
}

export async function withOverride(employee: DemoEmployee): Promise<DemoEmployee> {
  return applyOverride(employee, await readTeamOverrides())
}

export async function effectiveTeam(): Promise<DemoEmployee[]> {
  const overrides = await readTeamOverrides()
  return DEMO_EMPLOYEES.map((employee) => applyOverride(employee, overrides))
}

export async function savePersonOverride(
  employeeId: string,
  patch: TeamOverride
): Promise<void> {
  await db.transaction('rw', db.settings, async () => {
    const row = await db.settings.get(KEY)
    const current = (row?.value as TeamOverrides | undefined) ?? {}
    const merged: TeamOverride = { ...current[employeeId], ...patch }
    if (merged.role === undefined) delete merged.role
    if (merged.dailyTarget === undefined) delete merged.dailyTarget
    await db.settings.put({ key: KEY, value: { ...current, [employeeId]: merged } })
  })
}

/** Convenience for audit details: "Priya Menon (MGR-1001)". */
export function personLabel(employee: DemoEmployee): string {
  return `${employee.name} (${employee.id})`
}

/** The signed-in employee's own record, without exposing credentials. */
export function currentActor(): { id: string; name: string } {
  const session = useSession.getState()
  return { id: session.employeeId, name: session.name }
}
