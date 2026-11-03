import { verifyPin, type PinCredential } from '@/domain/auth/credentials'
import type { Role } from '@/domain/auth/roles'

export type EmployeeRole = Role

export interface DemoEmployee {
  id: string
  name: string
  role: EmployeeRole
  /** Services the technician is expected to close in one shift. */
  dailyTarget: number
  /** PBKDF2 hash of the demo PIN — no plaintext PIN is shipped in the bundle. */
  credential: PinCredential
  /** Only technician demo accounts may sign in with one tap. */
  oneTap: boolean
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
    oneTap: true,
    credential: {
      salt: 'G14yGkBmzeiyCk295Hj+zA==',
      hash: 'hd5mJdHoEIxknVi8GxW3kU7ppB4TAJrWJ88TDd+93NM=',
      iterations: 210_000
    }
  },
  {
    id: 'EMP-1044',
    name: 'Sana Khan',
    role: 'technician',
    dailyTarget: 10,
    oneTap: true,
    credential: {
      salt: 'dbGyJW0LlxxiLP6+22R6rA==',
      hash: 'HmuE+r6Wd7YjC1js8P06oaCuPn/tS+p888gQuWjgDAQ=',
      iterations: 210_000
    }
  },
  {
    id: 'SUP-2001',
    name: 'Rohan Iyer',
    role: 'supervisor',
    dailyTarget: 8,
    oneTap: false,
    credential: {
      salt: '1PTUzkBY8AMgcNUe60j2fA==',
      hash: 'ltiLAGdjq+skAoNDSFdTK5GmSSkAoheYW7o5h94goPs=',
      iterations: 210_000
    }
  },
  {
    id: 'MGR-1001',
    name: 'Priya Menon',
    role: 'manager',
    dailyTarget: 0,
    oneTap: false,
    credential: {
      salt: 'Eteys0pim2cM0kt5upG42g==',
      hash: 'Zq12HXvUk2qd6mS6umE1vaKDB41AYaXgFncHABzb/nA=',
      iterations: 210_000
    }
  },
  {
    id: 'ADM-0001',
    name: 'Shabh Admin',
    role: 'admin',
    dailyTarget: 0,
    oneTap: false,
    credential: {
      salt: '7jG36WGeo9+HsSIwn+4skw==',
      hash: 'qMf4e3Kakoeg8YfSM0vxNE+IsyUhomM3e0gMbYc7ZoY=',
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
