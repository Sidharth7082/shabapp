import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Badge, Card } from '@/components/ui/display'
import { TextInput } from '@/components/ui/fields'
import { toast } from '@/components/ui/toast'
import type { ServiceJob } from '@/domain/jobs/types'
import { maskPhone, OTP_RULES, requestOtp, verifyOtp } from '@/services/otp'
import { getPosition } from '@/lib/geo'
import { patchJob } from '@/services/jobs'

type Phase = 'idle' | 'sent' | 'verified'

export function OtpGate({ job, onVerified }: { job: ServiceJob; onVerified: () => void }) {
  const [phase, setPhase] = useState<Phase>(job.otpVerifiedAt ? 'verified' : 'idle')
  const [demoCode, setDemoCode] = useState<string | null>(null)
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sentTo, setSentTo] = useState<string>(maskPhone(job.phone))

  const send = async () => {
    setBusy(true)
    setError(null)
    try {
      const result = await requestOtp(job)
      setDemoCode(result.demoCode ?? null)
      setSentTo(result.sentTo)
      setPhase('sent')
      toast(`OTP sent to ${result.sentTo}`, 'ok')
    } catch {
      setError('Could not send the OTP. Check the connection and retry.')
    } finally {
      setBusy(false)
    }
  }

  const verify = async () => {
    if (code.trim().length !== 6) {
      setError('Enter the 6-digit code the customer received.')
      return
    }
    setBusy(true)
    setError(null)
    try {
      const result = await verifyOtp(job.id, code)
      if (!result.ok) {
        const messages: Record<string, string> = {
          missing: 'Request a fresh OTP first.',
          expired: 'That code expired. Send a new one.',
          locked: 'Too many attempts. Wait a minute before retrying.',
          wrong: `Incorrect code.${result.attemptsLeft !== undefined ? ` ${result.attemptsLeft} attempts left.` : ''}`,
          exhausted: 'Too many incorrect attempts. Request a new code.'
        }
        setError(messages[result.reason] ?? 'Verification failed.')
        if (result.reason === 'expired' || result.reason === 'exhausted') {
          setPhase('idle')
          setDemoCode(null)
        }
        setCode('')
        return
      }

      // Record where the work actually started, without delaying the gate.
      setPhase('verified')
      toast('OTP verified. You can start work.', 'ok')
      onVerified()
      void getPosition(6000).then((position) => {
        if (position.point) void patchJob(job.id, { checkIn: position.point })
      })
    } finally {
      setBusy(false)
    }
  }

  if (phase === 'verified' || job.otpVerifiedAt) {
    return (
      <Card className="border-ok/30 bg-ok-soft/60 p-4">
        <div className="flex items-center gap-2">
          <Badge tone="ok">OTP verified</Badge>
          <span className="text-xs font-semibold text-ok">
            {job.otpVerifiedAt
              ? new Date(job.otpVerifiedAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
              : 'Now'}
          </span>
        </div>
        <p className="mt-1.5 text-xs leading-5 text-ink-soft">
          Customer authorisation recorded. Live before/after photos are required for each service.
        </p>
      </Card>
    )
  }

  return (
    <Card className="p-4">
      <h2 className="text-base font-bold text-ink">Start work with customer OTP</h2>
      <p className="mt-1 text-sm leading-6 text-ink-mute">
        The customer receives a 6-digit code. Work cannot start until it is entered here.
      </p>

      {phase === 'idle' ? (
        <Button full className="mt-3" onClick={() => void send()} disabled={busy}>
          {busy ? 'Sending\u2026' : `Send OTP to ${maskPhone(job.phone)}`}
        </Button>
      ) : (
        <div className="mt-3 space-y-3">
          <p className="text-xs font-semibold text-ink-soft">Sent to {sentTo}</p>
          <TextInput
            label="Customer OTP"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            placeholder="6-digit code"
            value={code}
            onChange={(event) => setCode(event.target.value.replace(/\D/g, '').slice(0, 6))}
          />
          <Button full onClick={() => void verify()} disabled={busy}>
            {busy ? 'Verifying\u2026' : 'Verify & allow work'}
          </Button>
          <button
            type="button"
            onClick={() => void send()}
            className="w-full text-center text-xs font-semibold text-brand-600"
          >
            Resend OTP
          </button>
          {demoCode && (
            <div className="rounded-xl border border-dashed border-warn/40 bg-warn-soft px-3 py-2 text-xs leading-5 text-warn">
              <strong>Demo mode:</strong> no SMS gateway is connected, so the code is shown here.
              The real build sends this server-side only. Code: <strong>{demoCode}</strong>
            </div>
          )}
        </div>
      )}

      {error && (
        <p role="alert" className="mt-2 text-xs font-semibold text-danger">
          {error}
        </p>
      )}

      <p className="mt-3 text-[11px] leading-4 text-ink-mute">
        Code expires in {OTP_RULES.ttlMinutes} minutes. {OTP_RULES.maxAttempts} attempts allowed.
      </p>
    </Card>
  )
}
