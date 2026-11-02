import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type Role = 'technician' | 'admin'

interface Account {
  id: string
  name: string
  role: Role
  dailyTarget: number
}

interface SessionState {
  signedIn: boolean
  employeeId: string
  name: string
  role: Role
  /** Services expected in one shift; 0 hides the shift-target card (managers). */
  dailyTarget: number
  signIn: (account: Account) => void
  signOut: () => void
  setRole: (role: Role) => void
  setName: (name: string) => void
  setDailyTarget: (target: number) => void
}

const SIGNED_OUT = {
  signedIn: false,
  employeeId: '',
  name: '',
  role: 'technician' as Role,
  dailyTarget: 12
}

export const useSession = create<SessionState>()(
  persist(
    (set) => ({
      ...SIGNED_OUT,
      signIn: (account) =>
        set({
          signedIn: true,
          employeeId: account.id,
          name: account.name,
          role: account.role,
          dailyTarget: account.dailyTarget
        }),
      signOut: () => set({ ...SIGNED_OUT }),
      setRole: (role) => set({ role }),
      setName: (name) => set({ name }),
      setDailyTarget: (target) =>
        set({ dailyTarget: Math.max(0, Math.round(Number.isFinite(target) ? target : 0)) })
    }),
    { name: 'shabh-session' }
  )
)
