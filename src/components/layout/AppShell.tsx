import { Suspense, useEffect, useState } from 'react'
import { Navigate, NavLink, Outlet, Link } from 'react-router-dom'
import clsx from 'clsx'
import { Toaster } from '@/components/ui/toast'
import { RouteFallback } from '@/components/RouteFallback'
import {
  BriefcaseIcon,
  CalculatorIcon,
  ChartIcon,
  SettingsIcon,
  ShieldIcon
} from '@/components/ui/icons'
import { useSession } from '@/services/session'

const NAV = [
  { to: '/', label: 'Jobs', icon: BriefcaseIcon, end: true },
  { to: '/estimates', label: 'Estimate', icon: CalculatorIcon, end: false },
  { to: '/insights', label: 'Insights', icon: ChartIcon, end: false },
  { to: '/admin', label: 'Control', icon: ShieldIcon, end: false }
]

function useOnline(): boolean {
  const [online, setOnline] = useState(() => navigator.onLine)
  useEffect(() => {
    const update = () => setOnline(navigator.onLine)
    window.addEventListener('online', update)
    window.addEventListener('offline', update)
    return () => {
      window.removeEventListener('online', update)
      window.removeEventListener('offline', update)
    }
  }, [])
  return online
}

export function AppShell() {
  const { name, role, signedIn } = useSession()
  const online = useOnline()
  const nav = role === 'admin' ? NAV : NAV.filter((item) => item.to !== '/admin')

  // Nothing in the app is reachable without an employee session.
  if (!signedIn) return <Navigate to="/login" replace />

  return (
    <div className="min-h-dvh bg-surface-sunken">
      <header className="app-header sticky top-0 z-40 border-b border-surface-line/80 bg-white/85 backdrop-blur-xl">
        <div className="app-shell flex items-center justify-between px-4 py-2.5">
          <Link to="/" className="flex min-w-0 items-center gap-2.5">
            <span className="relative flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-500 to-brand-700 text-[15px] font-black text-white shadow-card">
              S
              <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-white bg-ok" />
            </span>
            <span className="min-w-0">
              <span className="block truncate text-[15px] font-extrabold leading-tight tracking-tight text-ink">
                Shabh Service
              </span>
              <span className="block truncate text-[11px] leading-tight text-ink-mute">
                {name} · {role === 'admin' ? 'Manager' : 'Technician'}
              </span>
            </span>
          </Link>
          <Link
            to="/settings"
            aria-label="Settings"
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-surface-line bg-white text-ink-soft shadow-card transition hover:text-brand-600 active:scale-95"
          >
            <SettingsIcon size={19} />
          </Link>
        </div>
        {!online && (
          <div className="bg-warn px-4 py-1.5 text-center text-[11px] font-bold text-white">
            Offline — saved work stays on this device. OTP and uploads need a connection.
          </div>
        )}
      </header>

      <main className="app-shell pb-24">
        <Suspense fallback={<RouteFallback />}>
          <Outlet />
        </Suspense>
      </main>

      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-surface-line/80 bg-white/95 backdrop-blur-xl">
        <div
          className={clsx(
            'app-shell safe-bottom grid px-2 pt-1.5',
            nav.length === 4 ? 'grid-cols-4' : 'grid-cols-3'
          )}
        >
          {nav.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                clsx(
                  'group flex min-h-[56px] flex-col items-center justify-center gap-1 rounded-xl text-[10px] font-bold tracking-wide transition-colors',
                  isActive ? 'text-brand-700' : 'text-ink-mute hover:text-ink-soft'
                )
              }
            >
              {({ isActive }) => (
                <>
                  <span
                    className={clsx(
                      'flex h-7 w-12 items-center justify-center rounded-full transition-colors',
                      isActive ? 'bg-brand-50' : 'group-hover:bg-surface-sunken'
                    )}
                  >
                    <item.icon size={19} strokeWidth={isActive ? 2.1 : 1.8} />
                  </span>
                  {item.label}
                </>
              )}
            </NavLink>
          ))}
        </div>
      </nav>

      <Toaster />
    </div>
  )
}
