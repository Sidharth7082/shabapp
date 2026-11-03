import { lazy, Suspense, useEffect, useRef, useState, type FormEvent } from 'react'
import { Navigate, useNavigate, useSearchParams } from 'react-router-dom'
import clsx from 'clsx'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/display'
import { LogoMark } from '@/components/ui/LogoMark'
import { AlertIcon, ChevronRightIcon } from '@/components/ui/icons'
import { DEMO_EMPLOYEES, authenticateEmployee, type DemoEmployee } from '@/data/employees'
import {
  LOGIN_LOCK_MS,
  LOGIN_MAX_ATTEMPTS,
  attemptsLeft,
  failureMessage,
  lockSecondsLeft,
  normalizeEmployeeId,
  validateLogin,
  type LoginErrors
} from '@/domain/auth/login'
import { useSession } from '@/services/session'
import { consumeSessionExpired } from '@/services/sessionExpiry'
import { COMPANY_NAME } from '@/version'

const LoginHelpSheet = lazy(() =>
  import('./LoginHelpSheet').then((module) => ({ default: module.LoginHelpSheet }))
)

const FAILURES_KEY = 'shabh-login-failures'
const LOCK_KEY = 'shabh-login-lock-until'

function readFailures(): number {
  try {
    const value = Number(window.localStorage.getItem(FAILURES_KEY))
    return Number.isFinite(value) && value > 0 ? value : 0
  } catch {
    return 0
  }
}

function readLockUntil(): number | null {
  try {
    const value = Number(window.localStorage.getItem(LOCK_KEY))
    return Number.isFinite(value) && value > Date.now() ? value : null
  } catch {
    return null
  }
}

function writeStored(key: string, value: string | null) {
  try {
    if (value === null) window.localStorage.removeItem(key)
    else window.localStorage.setItem(key, value)
  } catch {
    // Private mode / storage full: attempts are then per-render only.
  }
}

function initials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('')
}

export function LoginScreen() {
  const signedIn = useSession((state) => state.signedIn)
  const signIn = useSession((state) => state.signIn)
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [expired] = useState(
    () => searchParams.get('expired') === '1' || consumeSessionExpired()
  )

  const [employeeId, setEmployeeId] = useState('')
  const [pin, setPin] = useState('')
  const [showPin, setShowPin] = useState(false)
  const [remember, setRemember] = useState(true)
  const [errors, setErrors] = useState<LoginErrors>({})
  const [formError, setFormError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [selected, setSelected] = useState<string | null>(null)
  const [helpOpen, setHelpOpen] = useState(false)
  const [failures, setFailures] = useState(readFailures)
  const [lockedUntil, setLockedUntil] = useState<number | null>(readLockUntil)
  const [clock, setClock] = useState(() => Date.now())
  const idRef = useRef<HTMLInputElement>(null)
  const pinRef = useRef<HTMLInputElement>(null)

  const secondsLeft = lockSecondsLeft(lockedUntil, clock)
  const locked = lockedUntil !== null && secondsLeft > 0

  useEffect(() => {
    if (!lockedUntil) return
    const timer = window.setInterval(() => {
      const now = Date.now()
      setClock(now)
      if (now >= lockedUntil) {
        window.clearInterval(timer)
        setLockedUntil(null)
        setFailures(0)
        setFormError(null)
        writeStored(FAILURES_KEY, null)
        writeStored(LOCK_KEY, null)
      }
    }, 1000)
    return () => window.clearInterval(timer)
  }, [lockedUntil])

  if (signedIn) return <Navigate to="/" replace />

  const clearFeedback = () => {
    setErrors({})
    setFormError(null)
  }

  const enter = async (employee: DemoEmployee) => {
    if (loading || locked) return
    setLoading(true)
    setSelected(employee.id)
    clearFeedback()
    await new Promise((resolve) => window.setTimeout(resolve, 500))
    signIn(
      {
        id: employee.id,
        name: employee.name,
        role: employee.role,
        dailyTarget: employee.dailyTarget
      },
      remember
    )
    navigate('/', { replace: true })
  }

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (loading || locked) return

    const result = validateLogin(employeeId, pin)
    setErrors(result.errors)
    setFormError(null)
    if (!result.valid) {
      if (result.errors.employeeId) idRef.current?.focus()
      else pinRef.current?.focus()
      return
    }

    setLoading(true)
    setSelected(null)
    await new Promise((resolve) => window.setTimeout(resolve, 400))
    const employee = await authenticateEmployee(normalizeEmployeeId(employeeId), pin.trim())

    if (!employee) {
      setLoading(false)
      const next = failures + 1
      if (attemptsLeft(next) === 0) {
        const until = Date.now() + LOGIN_LOCK_MS
        setLockedUntil(until)
        setClock(Date.now())
        setFailures(0)
        setFormError(null)
        writeStored(FAILURES_KEY, null)
        writeStored(LOCK_KEY, String(until))
      } else {
        setFailures(next)
        setFormError(failureMessage(next))
        writeStored(FAILURES_KEY, String(next))
        pinRef.current?.focus()
      }
      return
    }

    setFailures(0)
    writeStored(FAILURES_KEY, null)
    writeStored(LOCK_KEY, null)
    signIn(
      {
        id: employee.id,
        name: employee.name,
        role: employee.role,
        dailyTarget: employee.dailyTarget
      },
      remember
    )
    navigate('/', { replace: true })
  }

  const fillDemo = () => {
    setEmployeeId('EMP-1042')
    setPin('')
    clearFeedback()
    setHelpOpen(false)
    requestAnimationFrame(() => idRef.current?.focus())
  }

  return (
    <div className="min-h-dvh bg-surface-sunken">
      <div className="relative overflow-hidden bg-gradient-to-br from-brand-700 via-brand-600 to-brand-500 px-5 pb-9 pt-7 text-white">
        <span className="pointer-events-none absolute -right-16 -top-20 h-56 w-56 rounded-full bg-white/10" />
        <span className="pointer-events-none absolute -bottom-24 -left-16 h-52 w-52 rounded-full bg-white/5" />
        <div className="relative mx-auto max-w-md">
          <div className="flex items-center gap-3">
            <LogoMark size={44} />
            <div className="min-w-0">
              <h1 className="text-[22px] font-extrabold leading-tight tracking-tight">
                Shabh Service
              </h1>
              <p className="text-[11px] font-medium text-white/75">
                {COMPANY_NAME} · Field operations
              </p>
            </div>
          </div>
          <p className="mt-2 text-[12px] leading-5 text-white/80">
            Your visits, live photo proof and estimates — in one app.
          </p>
        </div>
      </div>

      <main className="mx-auto -mt-5 max-w-md px-4 pb-8">
        <form
          onSubmit={submit}
          noValidate
          className="rounded-3xl border border-surface-line bg-white p-4 shadow-elevated"
        >
          <h2 className="text-[17px] font-extrabold tracking-tight text-ink">Welcome back</h2>
          <p className="mt-0.5 text-[12px] leading-5 text-ink-mute">
            Sign in to see today’s visits and your shift target.
          </p>

          {expired && !locked && (
            <p
              role="status"
              className="mt-3 rounded-lg bg-warn-soft px-3 py-2 text-[11.5px] font-semibold text-warn"
            >
              Your session ended for security. Sign in again.
            </p>
          )}

          {locked && (
            <p
              role="alert"
              className="mt-3 flex items-center gap-2 rounded-lg bg-danger-soft px-3 py-2 text-[11.5px] font-bold text-danger"
            >
              <AlertIcon size={13} className="shrink-0" />
              Too many attempts. Try again in {secondsLeft}s.
            </p>
          )}

          <div className="mt-3 flex items-center justify-between gap-2">
            <p className="text-[10px] font-bold uppercase tracking-widest text-ink-mute">
              Demo access · one tap
            </p>
            <Badge tone="warn" className="whitespace-nowrap">Demo build</Badge>
          </div>

          <div className="mt-1.5 grid grid-cols-2 gap-2">
            {DEMO_EMPLOYEES.map((employee) => {
              const busy = loading && selected === employee.id
              return (
                <button
                  key={employee.id}
                  type="button"
                  onClick={() => void enter(employee)}
                  disabled={loading || locked}
                  aria-pressed={selected === employee.id}
                  aria-busy={busy}
                  className={clsx(
                    'flex items-center gap-2 rounded-xl border px-2.5 py-2 text-left transition duration-200 active:scale-[0.97] disabled:opacity-60',
                    selected === employee.id
                      ? 'border-brand-400 bg-brand-50 ring-2 ring-brand-200'
                      : 'border-surface-line bg-surface-sunken'
                  )}
                >
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-600 text-[11px] font-black text-white">
                    {initials(employee.name)}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[11px] font-bold text-ink">
                      {employee.name.split(' ')[0]}
                    </span>
                    <span className="block truncate text-[9px] text-ink-mute">
                      {employee.role === 'admin' ? 'Manager' : 'Technician'}
                    </span>
                  </span>
                  {busy ? (
                    <span
                      className="h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-brand-200 border-t-brand-600"
                      aria-hidden="true"
                    />
                  ) : (
                    <ChevronRightIcon size={13} className="text-ink-mute" />
                  )}
                </button>
              )
            })}
          </div>

          <div className="my-3 flex items-center gap-2">
            <span className="h-px flex-1 bg-surface-line" />
            <span className="text-[9px] font-bold uppercase tracking-widest text-ink-mute">
              or sign in with employee ID
            </span>
            <span className="h-px flex-1 bg-surface-line" />
          </div>

          <label className="block" htmlFor="login-employee-id">
            <span className="text-[12px] font-bold text-ink-soft">Employee ID</span>
            <input
              id="login-employee-id"
              ref={idRef}
              value={employeeId}
              onChange={(event) => {
                setEmployeeId(event.target.value.toUpperCase())
                clearFeedback()
              }}
              disabled={locked || loading}
              autoComplete="username"
              autoCapitalize="characters"
              spellCheck={false}
              aria-invalid={Boolean(errors.employeeId)}
              aria-describedby={errors.employeeId ? 'login-employee-id-error' : undefined}
              placeholder="EMP-1042"
              className={clsx(
                'mt-1.5 h-12 w-full rounded-xl border bg-surface-sunken px-3 text-[14px] font-semibold text-ink outline-none transition placeholder:font-medium placeholder:text-ink-soft/80 focus:border-brand-400 disabled:opacity-60',
                errors.employeeId ? 'border-danger' : 'border-surface-line'
              )}
            />
          </label>
          {errors.employeeId && (
            <p id="login-employee-id-error" className="mt-1 text-[11px] font-semibold text-danger">
              {errors.employeeId}
            </p>
          )}

          <label className="mt-2.5 block" htmlFor="login-pin">
            <span className="flex items-center justify-between gap-2">
              <span className="text-[12px] font-bold text-ink-soft">PIN</span>
              <button
                type="button"
                onClick={() => setHelpOpen(true)}
                className="rounded-md px-1 py-0.5 text-[10.5px] font-bold text-brand-600 transition active:opacity-60"
              >
                Forgot PIN?
              </button>
            </span>
            <span className="relative mt-1.5 block">
              <input
                id="login-pin"
                ref={pinRef}
                value={pin}
                onChange={(event) => {
                  setPin(event.target.value.replace(/\D/g, '').slice(0, 6))
                  clearFeedback()
                }}
                disabled={locked || loading}
                type={showPin ? 'text' : 'password'}
                inputMode="numeric"
                autoComplete="current-password"
                aria-invalid={Boolean(errors.pin || formError)}
                aria-describedby={errors.pin ? 'login-pin-error' : undefined}
                placeholder="4 to 6 digits"
                className={clsx(
                  'h-12 w-full rounded-xl border bg-surface-sunken px-3 pr-16 text-[14px] font-semibold tracking-[0.3em] text-ink outline-none transition placeholder:font-medium placeholder:tracking-normal placeholder:text-ink-soft/80 focus:border-brand-400 disabled:opacity-60',
                  errors.pin || formError ? 'border-danger' : 'border-surface-line'
                )}
              />
              <button
                type="button"
                onClick={() => setShowPin((value) => !value)}
                disabled={locked || loading}
                aria-label={showPin ? 'Hide PIN' : 'Show PIN'}
                aria-pressed={showPin}
                aria-controls="login-pin"
                className="absolute inset-y-0 right-0 rounded-r-xl px-3 text-[11px] font-bold text-brand-600 transition active:opacity-60 disabled:opacity-50"
              >
                {showPin ? 'Hide' : 'Show'}
              </button>
            </span>
          </label>
          {errors.pin && (
            <p id="login-pin-error" className="mt-1 text-[11px] font-semibold text-danger">
              {errors.pin}
            </p>
          )}
          {formError && !locked && (
            <p
              role="alert"
              className="mt-2 flex items-start gap-1.5 rounded-lg bg-danger-soft px-2.5 py-2 text-[11.5px] font-semibold leading-4 text-danger"
            >
              <AlertIcon size={13} className="mt-0.5 shrink-0" />
              {formError}
            </p>
          )}

          <label className="mt-3 flex items-center gap-2 text-[11.5px] font-semibold text-ink-soft">
            <input
              type="checkbox"
              checked={remember}
              onChange={(event) => setRemember(event.target.checked)}
              disabled={locked || loading}
              className="h-4 w-4 rounded border-surface-line accent-brand-600"
            />
            Keep me signed in on this device
          </label>

          <Button
            type="submit"
            full
            size="lg"
            className="mt-3"
            disabled={loading || locked}
            aria-busy={loading}
          >
            {loading ? (
              <span className="inline-flex items-center gap-2">
                <span
                  className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white"
                  aria-hidden="true"
                />
                Signing in…
              </span>
            ) : locked ? (
              `Locked · retry in ${secondsLeft}s`
            ) : (
              'Sign in'
            )}
          </Button>

          {failures > 0 && !locked && (
            <p className="mt-2 text-center text-[10px] font-semibold text-ink-mute">
              {attemptsLeft(failures)} of {LOGIN_MAX_ATTEMPTS} attempts left before a short lock.
            </p>
          )}
        </form>

        <p className="mt-2.5 text-center text-[10px] leading-4 text-ink-mute">
          Demo sign-in only — the one-tap demo accounts are not a security boundary. Production
          uses Supabase Auth with server-side verification.
        </p>
        <button
          type="button"
          onClick={() => setHelpOpen(true)}
          className="mx-auto mt-1 block text-[10px] font-bold text-brand-600 transition active:opacity-60"
        >
          Need help? Contact your administrator
        </button>
      </main>

      {helpOpen && (
        <Suspense fallback={null}>
          <LoginHelpSheet onClose={() => setHelpOpen(false)} onFillDemo={fillDemo} />
        </Suspense>
      )}
    </div>
  )
}
