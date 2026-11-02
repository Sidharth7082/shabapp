import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Sheet } from '@/components/ui/Sheet'
import { Badge, Card } from '@/components/ui/display'
import { TextInput } from '@/components/ui/fields'
import { toast } from '@/components/ui/toast'
import type { ServiceJob } from '@/domain/jobs/types'
import { servicesDone } from '@/domain/jobs/types'
import { getPosition } from '@/lib/geo'
import { completeJob, patchJob } from '@/services/jobs'

export function CompleteJobSheet({ job, onClose }: { job: ServiceJob; onClose: () => void }) {
  const [name, setName] = useState(job.contactName)
  const [rating, setRating] = useState(5)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const elapsedMinutes = job.startedAt
    ? Math.max(1, Math.round((Date.now() - new Date(job.startedAt).getTime()) / 60000))
    : 0

  const submit = async () => {
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
      title="Complete job"
      subtitle={`${job.code} \u00b7 ${job.customerName}`}
      footer={
        <Button full size="lg" onClick={() => void submit()} disabled={busy}>
          {busy ? 'Saving\u2026' : 'Confirm completion'}
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
            {elapsedMinutes > 0 ? `Time on site: about ${elapsedMinutes} minutes` : 'Time on site recorded from check-in'}
          </p>
        </Card>

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

        {error && (
          <p role="alert" className="rounded-lg bg-danger-soft px-3 py-2 text-xs font-semibold text-danger">
            {error}
          </p>
        )}
      </div>
    </Sheet>
  )
}
