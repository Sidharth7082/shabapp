export type EmployeeRole = 'technician' | 'admin'

export interface DemoEmployee {
  id: string
  name: string
  role: EmployeeRole
  pin: string
  /** Services the technician is expected to close in one shift. */
  dailyTarget: number
}

/**
 * Demo sign-in directory.
 *
 * PRODUCTION: replace with Supabase Auth (email/phone + password) and a
 * `profiles` row that carries the role and shift target. Nothing here is a
 * security boundary — the PIN is visible in the bundle, exactly like the demo
 * OTP. See PLAN.md §4 Phase 2.
 */
export const DEMO_EMPLOYEES: DemoEmployee[] = [
  {
    id: 'EMP-1042',
    name: 'Aarav Sharma',
    role: 'technician',
    pin: '1234',
    dailyTarget: 12
  },
  {
    id: 'MGR-1001',
    name: 'Priya Menon',
    role: 'admin',
    pin: '1234',
    dailyTarget: 0
  }
]

export function authenticateEmployee(employeeId: string, pin: string): DemoEmployee | null {
  const id = employeeId.trim().toUpperCase()
  const code = pin.trim()
  return DEMO_EMPLOYEES.find((employee) => employee.id === id && employee.pin === code) ?? null
}
