import { verifyPin, type PinCredential } from '@/domain/auth/credentials'

export type EmployeeRole = 'technician' | 'admin'

export interface DemoEmployee {
  id: string
  name: string
  role: EmployeeRole
  /** Services the technician is expected to close in one shift. */
  dailyTarget: number
  /** PBKDF2 hash of the demo PIN — no plaintext PIN is shipped in the bundle. */
  credential: PinCredential
}

/**
 * Demo sign-in directory.
 *
 * PRODUCTION: replace with Supabase Auth (email/phone + password) and a
 * `profiles` row that carries the role and shift target. The demo one-tap
 * accounts and the shared demo PIN are deliberate demo affordances, not a
 * security boundary. The hashes below only stop casual credential extraction
 * from the APK. See PLAN.md §3 golden rule 6.
 */
export const DEMO_EMPLOYEES: DemoEmployee[] = [
  {
    id: 'EMP-1042',
    name: 'Aarav Sharma',
    role: 'technician',
    dailyTarget: 12,
    credential: {
      salt: 'G14yGkBmzeiyCk295Hj+zA==',
      hash: 'hd5mJdHoEIxknVi8GxW3kU7ppB4TAJrWJ88TDd+93NM=',
      iterations: 210_000
    }
  },
  {
    id: 'MGR-1001',
    name: 'Priya Menon',
    role: 'admin',
    dailyTarget: 0,
    credential: {
      salt: 'LXMliS5vBO0kghaBF9rHaw==',
      hash: 'VC/pTINhh7FH5u9q5ROYGxgExjolzFSlRHKmKxlBLlQ=',
      iterations: 210_000
    }
  }
]

/** A real (but unused) hash, so an unknown ID costs the same as a wrong PIN. */
const DUMMY_CREDENTIAL: PinCredential = {
  salt: 'AAAAAAAAAAAAAAAAAAAAAA==',
  hash: 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=',
  iterations: 210_000
}

export function normalizeEmployeeId(value: string): string {
  return value.trim().toUpperCase()
}

export async function authenticateEmployee(
  employeeId: string,
  pin: string
): Promise<DemoEmployee | null> {
  const id = normalizeEmployeeId(employeeId)
  const employee = DEMO_EMPLOYEES.find((candidate) => candidate.id === id)
  if (!employee) {
    await verifyPin(pin.trim(), DUMMY_CREDENTIAL)
    return null
  }
  return (await verifyPin(pin.trim(), employee.credential)) ? employee : null
}
