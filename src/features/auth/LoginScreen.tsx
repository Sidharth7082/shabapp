import { useState, type FormEvent } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/display'
import { DEMO_EMPLOYEES, authenticateEmployee, type DemoEmployee } from '@/data/employees'
import { useSession } from '@/services/session'

export function LoginScreen() {
  const signedIn = useSession((state) => state.signedIn)
  const signIn = useSession((state) => state.signIn)
  const navigate = useNavigate()

  const [employeeId, setEmployeeId] = useState('')
  const [pin, setPin] = useState('')
  const [showPin, setShowPin] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (signedIn) return <Navigate to="/" replace />

  const enter = (employee: DemoEmployee) => {
    signIn({
      id: employee.id,
      name: employee.name,
      role: employee.role,
      dailyTarget: employee.dailyTarget
    })
    navigate('/', { replace: true })
  }

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const employee = authenticateEmployee(employeeId, pin)
    if (!employee) {
      setError('Unknown employee ID or wrong PIN. Use a demo account above.')
      return
    }
    enter(employee)
  }

  return (
    <div className="min-h-dvh bg-surface-sunken">
      <div className="relative overflow-hidden bg-gradient-to-br from-brand-700 via-brand-600 to-brand-500 px-5 pb-12 pt-10 text-white">
        <span className="pointer-events-none absolute -right-16 -top-20 h-56 w-56 rounded-full bg-white/10" />
        <span className="pointer-events-none absolute -bottom-24 -left-16 h-52 w-52 rounded-full bg-white/5" />
        <div className="relative mx-auto max-w-md">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/15 text-[20px] font-black shadow-card">
            S
          </span>
          <h1 className="mt-3 text-[26px] font-extrabold leading-tight tracking-tight">
            Shabh Service
          </h1>
          <p className="mt-1 text-[13px] leading-5 text-white/80">
            Your visits, live photo proof and estimates — in one app.
          </p>
        </div>
      </div>

      <main className="mx-auto -mt-6 max-w-md px-4 pb-8">
        <form
          onSubmit={submit}
          className="rounded-3xl border border-surface-line bg-white p-4 shadow-elevated"
        >
          <div className="flex items-center justify-between">
            <h2 className="text-[16px] font-extrabold tracking-tight text-ink">Welcome back</h2>
            <Badge tone="warn">Demo</Badge>
          </div>
          <p className="mt-1 text-[12px] leading-5 text-ink-mute">
            Sign in to see today’s visits. Tap a demo account to continue.
          </p>

          <div className="mt-3 grid grid-cols-2 gap-2">
            {DEMO_EMPLOYEES.map((employee) => (
              <button
                key={employee.id}
                type="button"
                onClick={() => enter(employee)}
                className="flex items-center gap-2 rounded-xl border border-surface-line bg-surface-sunken px-2.5 py-2 text-left transition active:scale-[0.98]"
              >
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-600 text-[11px] font-black text-white">
                  {employee.name
                    .split(' ')
                    .filter(Boolean)
                    .slice(0, 2)
                    .map((part) => part[0]?.toUpperCase())
                    .join('')}
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-[11px] font-bold text-ink">
                    {employee.name.split(' ')[0]}
                  </span>
                  <span className="block truncate text-[9px] text-ink-mute">
                    {employee.role === 'admin' ? 'Manager' : 'Technician'}
                  </span>
                </span>
              </button>
            ))}
          </div>

          <div className="my-3 flex items-center gap-2">
            <span className="h-px flex-1 bg-surface-line" />
            <span className="text-[9px] font-bold uppercase tracking-widest text-ink-mute">
              or use employee ID
            </span>
            <span className="h-px flex-1 bg-surface-line" />
          </div>

          <label className="block">
            <span className="text-[12px] font-bold text-ink-soft">Employee ID</span>
            <input
              value={employeeId}
              onChange={(event) => {
                setEmployeeId(event.target.value)
                setError(null)
              }}
              autoComplete="username"
              autoCapitalize="characters"
              placeholder="EMP-1042"
              className="mt-1.5 h-12 w-full rounded-xl border border-surface-line bg-surface-sunken px-3 text-[14px] font-semibold text-ink outline-none focus:border-brand-400"
            />
          </label>

          <label className="mt-2.5 block">
            <span className="text-[12px] font-bold text-ink-soft">PIN</span>
            <span className="relative mt-1.5 block">
              <input
                value={pin}
                onChange={(event) => {
                  setPin(event.target.value.replace(/\D/g, '').slice(0, 6))
                  setError(null)
                }}
                type={showPin ? 'text' : 'password'}
                inputMode="numeric"
                autoComplete="current-password"
                placeholder="4 to 6 digits"
                className="h-12 w-full rounded-xl border border-surface-line bg-surface-sunken px-3 pr-16 text-[14px] font-semibold tracking-[0.3em] text-ink outline-none focus:border-brand-400"
              />
              <button
                type="button"
                onClick={() => setShowPin((value) => !value)}
                className="absolute inset-y-0 right-0 rounded-r-xl px-3 text-[11px] font-bold text-brand-600"
                aria-label={showPin ? 'Hide PIN' : 'Show PIN'}
              >
                {showPin ? 'Hide' : 'Show'}
              </button>
            </span>
          </label>

          {error && (
            <p role="alert" className="mt-3 rounded-lg bg-danger-soft px-3 py-2 text-[12px] font-semibold text-danger">
              {error}
            </p>
          )}

          <Button type="submit" full size="lg" className="mt-3">
            Sign in
          </Button>
        </form>

        <p className="mt-2.5 text-center text-[10px] leading-4 text-ink-mute">
          Demo sign-in only. Tap a demo account to continue, or use EMP-1042 / 1234. Production
          uses Supabase Auth with a server-side profile.
        </p>
      </main>
    </div>
  )
}
