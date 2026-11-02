import { useState, type FormEvent } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/display'
import { DEMO_EMPLOYEES, authenticateEmployee } from '@/data/employees'
import { useSession } from '@/services/session'

export function LoginScreen() {
  const signedIn = useSession((state) => state.signedIn)
  const signIn = useSession((state) => state.signIn)
  const navigate = useNavigate()

  const [employeeId, setEmployeeId] = useState('')
  const [pin, setPin] = useState('')
  const [error, setError] = useState<string | null>(null)

  if (signedIn) return <Navigate to="/" replace />

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const employee = authenticateEmployee(employeeId, pin)
    if (!employee) {
      setError('Unknown employee ID or wrong PIN. Use a demo account below.')
      return
    }
    signIn({
      id: employee.id,
      name: employee.name,
      role: employee.role,
      dailyTarget: employee.dailyTarget
    })
    navigate('/', { replace: true })
  }

  const fill = (id: string, code: string) => {
    setEmployeeId(id)
    setPin(code)
    setError(null)
  }

  return (
    <div className="min-h-dvh bg-surface-sunken">
      <div className="relative overflow-hidden bg-gradient-to-br from-brand-700 via-brand-600 to-brand-500 px-5 pb-16 pt-12 text-white">
        <span className="pointer-events-none absolute -right-16 -top-20 h-56 w-56 rounded-full bg-white/10" />
        <span className="pointer-events-none absolute -bottom-24 -left-16 h-52 w-52 rounded-full bg-white/5" />
        <div className="relative mx-auto max-w-md">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/15 text-[20px] font-black shadow-card">
            S
          </span>
          <h1 className="mt-4 text-[28px] font-extrabold leading-tight tracking-tight">
            Shabh Service
          </h1>
          <p className="mt-1 text-[13px] leading-5 text-white/80">
            Your visits, live photo proof and estimates — in one app.
          </p>
        </div>
      </div>

      <main className="mx-auto -mt-10 max-w-md px-4 pb-10">
        <form
          onSubmit={submit}
          className="rounded-3xl border border-surface-line bg-white p-5 shadow-elevated"
        >
          <div className="flex items-center justify-between">
            <h2 className="text-[16px] font-extrabold tracking-tight text-ink">Employee sign in</h2>
            <Badge tone="warn">Demo</Badge>
          </div>
          <p className="mt-1 text-[12px] leading-5 text-ink-mute">
            Use your employee ID and PIN. Real accounts will be created in Supabase Auth.
          </p>

          <label className="mt-4 block">
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

          <label className="mt-3 block">
            <span className="text-[12px] font-bold text-ink-soft">PIN</span>
            <input
              value={pin}
              onChange={(event) => {
                setPin(event.target.value.replace(/\D/g, '').slice(0, 6))
                setError(null)
              }}
              type="password"
              inputMode="numeric"
              autoComplete="current-password"
              placeholder="4 to 6 digits"
              className="mt-1.5 h-12 w-full rounded-xl border border-surface-line bg-surface-sunken px-3 text-[14px] font-semibold tracking-[0.3em] text-ink outline-none focus:border-brand-400"
            />
          </label>

          {error && (
            <p role="alert" className="mt-3 rounded-lg bg-danger-soft px-3 py-2 text-[12px] font-semibold text-danger">
              {error}
            </p>
          )}

          <Button type="submit" full size="lg" className="mt-4">
            Sign in
          </Button>

          <div className="mt-5 rounded-2xl border border-dashed border-surface-line bg-surface-sunken p-3">
            <p className="text-[10px] font-bold uppercase tracking-widest text-ink-mute">
              Demo accounts
            </p>
            <div className="mt-2 space-y-2">
              {DEMO_EMPLOYEES.map((employee) => (
                <button
                  key={employee.id}
                  type="button"
                  onClick={() => fill(employee.id, employee.pin)}
                  className="flex w-full items-center justify-between rounded-xl bg-white px-3 py-2.5 text-left shadow-card transition active:scale-[0.99]"
                >
                  <span className="min-w-0">
                    <span className="block truncate text-[12px] font-bold text-ink">
                      {employee.name}
                    </span>
                    <span className="block text-[10px] text-ink-mute">
                      {employee.role === 'admin' ? 'Manager' : 'Technician'} · {employee.id} · PIN{' '}
                      {employee.pin}
                    </span>
                  </span>
                  <span className="text-[11px] font-bold text-brand-600">Use</span>
                </button>
              ))}
            </div>
          </div>
        </form>

        <p className="mt-4 text-center text-[11px] leading-4 text-ink-mute">
          Demo sign-in only. The PIN is stored in the bundle; production uses Supabase Auth with a
          hashed password and a server-side profile.
        </p>
      </main>
    </div>
  )
}
