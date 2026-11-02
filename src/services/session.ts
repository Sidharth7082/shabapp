import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type Role = 'technician' | 'admin'

interface SessionState {
  employeeId: string
  name: string
  role: Role
  setRole: (role: Role) => void
  setName: (name: string) => void
}

export const useSession = create<SessionState>()(
  persist(
    (set) => ({
      employeeId: 'emp_1',
      name: 'Aarav Sharma',
      role: 'admin',
      setRole: (role) => set({ role }),
      setName: (name) => set({ name })
    }),
    { name: 'shabh-session' }
  )
)
