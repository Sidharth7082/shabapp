import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import { SESSION_TTL_MS } from '@/domain/auth/session'

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
  /** True = remember on this device (localStorage); false = this app session only. */
  remember: boolean
  signedInAt: string
  lastActiveAt: string
  expiresAt: string
  signIn: (account: Account, remember?: boolean) => void
  signOut: () => void
  /** Refresh the idle clock after real user interaction (throttled by the shell). */
  touch: () => void
  setRole: (role: Role) => void
  setName: (name: string) => void
  setDailyTarget: (target: number) => void
}

const SIGNED_OUT = {
  signedIn: false,
  employeeId: '',
  name: '',
  role: 'technician' as Role,
  dailyTarget: 12,
  remember: true,
  signedInAt: '',
  lastActiveAt: '',
  expiresAt: ''
}

/**
 * "Keep me signed in" decides where the session lives: localStorage survives a
 * relaunch, sessionStorage is dropped when the app process ends. On this device
 * the APK's WebView clears sessionStorage on cold start, so an unchecked box does
 * what it says. Production replaces this with Supabase Auth refresh tokens.
 */
const tabAwareStorage = createJSONStorage(() => ({
  getItem: (name: string) =>
    window.sessionStorage.getItem(name) ?? window.localStorage.getItem(name),
  setItem: (name: string, value: string) => {
    let remember = true
    try {
      remember =
        (JSON.parse(value) as { state?: { remember?: boolean } }).state?.remember !== false
    } catch {
      remember = true
    }
    if (remember) {
      window.localStorage.setItem(name, value)
      window.sessionStorage.removeItem(name)
    } else {
      window.sessionStorage.setItem(name, value)
      window.localStorage.removeItem(name)
    }
  },
  removeItem: (name: string) => {
    window.localStorage.removeItem(name)
    window.sessionStorage.removeItem(name)
  }
}))

export const useSession = create<SessionState>()(
  persist(
    (set) => ({
      ...SIGNED_OUT,
      signIn: (account, remember = true) => {
        const now = Date.now()
        set({
          signedIn: true,
          employeeId: account.id,
          name: account.name,
          role: account.role,
          dailyTarget: account.dailyTarget,
          remember,
          signedInAt: new Date(now).toISOString(),
          lastActiveAt: new Date(now).toISOString(),
          expiresAt: new Date(now + SESSION_TTL_MS).toISOString()
        })
      },
      signOut: () => set({ ...SIGNED_OUT }),
      touch: () => set({ lastActiveAt: new Date().toISOString() }),
      setRole: (role) => set({ role }),
      setName: (name) => set({ name }),
      setDailyTarget: (target) =>
        set({ dailyTarget: Math.max(0, Math.round(Number.isFinite(target) ? target : 0)) })
    }),
    { name: 'shabh-session', storage: tabAwareStorage! }
  )
)
