import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Sheet } from '@/components/ui/Sheet'
import { Badge, Card } from '@/components/ui/display'
import { TextInput } from '@/components/ui/fields'
import { toast } from '@/components/ui/toast'
import type { ServiceJob } from '@/domain/jobs/types'
import { jobLimitMinutes, servicesDone } from '@/domain/jobs/types'
import { getPosition } from '@/lib/geo'
import { completeJob, patchJob } from '@/services/jobs'
import { maskPhone, OTP_RULES, requestOtp, verifyOtp } from '@/services/otp'

type Phase = 'idle' | 'sent' | 'verified'

/**
 * The visit is only closed after the customer hands over a work-done OTP.
 * That code is separate from the start code, so it also proves the customer
 * was present at the end of the visit.
 */
export function CompleteJobSheet({ job, onClose }: { job: ServiceJob; onClose: () => void }) {
  const [phase, setPhase] = useState<Phase>(job.workDoneOtpAt ? 'verified' : 'idle')
  const [demoCode, setDemoCode] = useState<string | null>(null)
  const [code, setCode] = useState('')
  const [sentTo, setSentTo] = useState(maskPhone(job.phone))
  const [name, setName] = useState(job.contactName)
  const [rating, setRating] = useState(5)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const elapsedMinutes = job.startedAt
    ? Math.max(1, Math.round((Date.now() - new Date(job.startedAt).getTime()) / 60000))
    : 0

  const send = async () => {
    setBusy(true)
    setError(null)
    try {
      const result = await requestOtp(job, 'complete')
      setDemoCode(result.demoCode ?? null)
      setSentTo(result.sentTo)
      setPhase('sent')
      toast(`Work-done OTP sent to ${result.sentTo}`, 'ok')
    } catch {
      setError('Could not send the work-done OTP. Check the connection and retry.')
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
      const result = await verifyOtp(job.id, code, 'complete')
      if (!result.ok) {
        const messages: Record<string, string> = {
          missing: 'Request the work-done OTP first.',
          expired: 'That code expired. Send a new one.',
          locked: 'Too many attempts. Wait a minute before retrying.',
          wrong: `Incorrect code.${result.attemptsLeft !== undefined ? ` ${result.attemptsLeft} attempts left.` : ''}`,
          exhausted: 'Too many incorrect attempts. Request a new code.'
        }
        setError(messages[result.reason] ?? 'Verification failed.')
        setCode('')
        return
      }
      setPhase('verified')
      toast('Work-done OTP verified', 'ok')
    } finally {
      setBusy(false)
    }
  }

  const submit = async () => {
    if (phase !== 'verified') {
      setError('Verify the customer\u2019s work-done OTP before closing the visit.')
      return
    }
    if (name.trim().length < 2) {
      setError('Enter the name of the person who accepted the work.')
      return
    }
    setBusy(true)
    setError(null)
    try {
      const ok = await completeJob(job.id, { signoffName: name.trim(), rating })
      if (!ok) {
        setError('Finish every service before completing the job.')
        return
      }
      // Check-out location is recorded in the background so sign-off stays instant.
      void getPosition(6000).then((position) => {
        if (position.point) void patchJob(job.id, { checkOut: position.point })
      })
      toast('Job completed and signed off', 'ok')
      onClose()
    } catch {
      setError('Could not complete the job. Try again.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Sheet
      open
      onClose={onClose}
      title="Close the visit"
      subtitle={`${job.code} \u00b7 ${job.customerName}`}
      footer={
        <Button full size="lg" onClick={() => void submit()} disabled={busy || phase !== 'verified'}>
          {busy
            ? 'Saving\u2026'
            : phase === 'verified'
              ? 'Confirm completion'
              : 'Verify the work-done OTP first'}
        </Button>
      }
    >
      <div className="space-y-4">
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-ink">All services done</p>
            <Badge tone="ok">
              {servicesDone(job)}/{job.services.length}
            </Badge>
          </div>
          <p className="mt-1 text-xs text-ink-mute">
            {elapsedMinutes > 0
              ? `Time on site: about ${elapsedMinutes} minutes of the ${jobLimitMinutes(job)} allowed.`
              : `Window for this customer: ${jobLimitMinutes(job)} minutes from OTP.`}
          </p>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-ink">Work-done OTP from the customer</h3>
            {phase === 'verified' ? <Badge tone="ok">Verified</Badge> : null}
          </div>
          <p className="mt-1 text-xs leading-5 text-ink-mute">
            Ask the customer to share the code they receive for accepting the finished work.
            Without it this visit cannot be closed.
          </p>

          {phase === 'idle' && (
            <Button full className="mt-3" onClick={() => void send()} disabled={busy}>
              {busy ? 'Sending\u2026' : `Send work-done OTP to ${maskPhone(job.phone)}`}
            </Button>
          )}

          {phase === 'sent' && (
            <div className="mt-3 space-y-3">
              <p className="text-xs font-semibold text-ink-soft">Sent to {sentTo}</p>
              <TextInput
                label="Work-done OTP"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                placeholder="6-digit code"
                value={code}
                onChange={(event) => setCode(event.target.value.replace(/\D/g, '').slice(0, 6))}
              />
              <Button full onClick={() => void verify()} disabled={busy}>
                {busy ? 'Verifying\u2026' : 'Verify work-done OTP'}
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
                  <strong>Demo mode:</strong> no SMS gateway is connected, so the code is shown
                  here. Code: <strong>{demoCode}</strong>
                </div>
              )}
            </div>
          )}

          {phase === 'verified' && (
            <div className="mt-3 rounded-xl border border-ok/30 bg-ok-soft px-3 py-2 text-xs font-semibold text-ok">
              Work-done OTP accepted
              {job.workDoneOtpAt
                ? ` at ${new Date(job.workDoneOtpAt).toLocaleTimeString('en-IN', {
                    hour: '2-digit',
                    minute: '2-digit'
                  })}`
                : ''}
              . Ask the customer to confirm the sign-off below.
            </div>
          )}

          <p className="mt-3 text-[11px] leading-4 text-ink-mute">
            Code expires in {OTP_RULES.ttlMinutes} minutes. {OTP_RULES.maxAttempts} attempts allowed.
          </p>
        </Card>

        {phase === 'verified' && (
          <>
            <TextInput
              label="Work accepted by"
              placeholder="Customer / facility representative"
              value={name}
              onChange={(event) => setName(event.target.value)}
            />

            <div>
              <p className="mb-1.5 text-sm font-semibold text-ink">Customer rating</p>
              <div className="flex gap-2">
                {[1, 2, 3, 4, 5].map((value) => (
                  <button
                    key={value}
                    type="button"
                    aria-label={`${value} star`}
                    onClick={() => setRating(value)}
                    className={
                      'flex h-11 w-11 items-center justify-center rounded-xl border text-lg ' +
                      (value <= rating
                        ? 'border-warn bg-warn-soft text-warn'
                        : 'border-surface-line bg-white text-ink-mute')
                    }
                  >
                    {'\u2605'}
                  </button>
                ))}
              </div>
            </div>
          </>
        )}

        {error && (
          <p role="alert" className="rounded-lg bg-danger-soft px-3 py-2 text-xs font-semibold text-danger">
            {error}
          </p>
        )}
      </div>
    </Sheet>
  )
}
