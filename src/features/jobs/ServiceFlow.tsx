import { useEffect, useMemo, useRef, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import clsx from 'clsx'
import { db } from '@/db/db'
import { Button } from '@/components/ui/Button'
import { Sheet } from '@/components/ui/Sheet'
import { Badge, Card } from '@/components/ui/display'
import { CameraIcon, CheckIcon, MinusIcon, XIcon } from '@/components/ui/icons'
import { PhotoThumb } from '@/components/PhotoThumb'
import { CameraCapture } from '@/features/camera/CameraCapture'
import { toast } from '@/components/ui/toast'
import { templateById } from '@/data/checklistTemplates'
import { newId } from '@/domain/shared/id'
import type { ChecklistResult, IssueSeverity, JobIssue } from '@/domain/jobs/types'
import { appendServicePhoto, finishService } from '@/services/jobs'
import { watermarkSummary } from '@/features/camera/watermark'
import { useSession } from '@/services/session'
import { JobTimer } from './JobTimer'

type Step = 'before' | 'checklist' | 'after' | 'review'

interface Draft {
  result: ChecklistResult
  note: string
  severity: IssueSeverity
}

const STEP_ORDER: Step[] = ['before', 'checklist', 'after', 'review']
const STEP_LABEL: Record<Step, string> = {
  before: 'Before',
  checklist: 'Checklist',
  after: 'After',
  review: 'Review'
}

export function ServiceFlow({
  jobId,
  serviceId,
  onClose
}: {
  jobId: string
  serviceId: string
  onClose: () => void
}) {
  const employee = useSession((state) => state.name)
  const job = useLiveQuery(() => db.jobs.get(jobId), [jobId])
  const service = job?.services.find((item) => item.id === serviceId)
  const template = useMemo(() => templateById(service?.templateId ?? ''), [service?.templateId])

  const [step, setStep] = useState<Step>('before')
  const [camera, setCamera] = useState<'before' | 'after' | null>(null)
  const [draft, setDraft] = useState<Record<string, Draft>>({})
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const hydratedFor = useRef<string | null>(null)

  // Reopening a finished service must show what was recorded, not a blank form.
  useEffect(() => {
    if (!service) return
    if (hydratedFor.current === service.id) return
    hydratedFor.current = service.id
    if (service.checklist.length === 0) return
    setDraft((current) => {
      if (Object.keys(current).length > 0) return current
      return Object.fromEntries(
        service.checklist.map((entry) => {
          const itemLabel = template?.items.find((item) => item.id === entry.itemId)?.label
          const existing = job?.issues.find(
            (issue) =>
              issue.serviceItemId === service.id &&
              itemLabel !== undefined &&
              issue.description.startsWith(itemLabel)
          )
          return [
            entry.itemId,
            {
              result: entry.result,
              note: entry.note ?? '',
              severity: existing?.severity ?? ('major' as IssueSeverity)
            }
          ]
        })
      )
    })
  }, [service, template, job])

  if (!job || !service) return null

  const stepIndex = STEP_ORDER.indexOf(step)
  const beforeReady = service.beforePhotoIds.length > 0
  const afterReady = service.afterPhotoIds.length > 0

  const marked = template ? template.items.every((item) => draft[item.id]?.result) : true
  const fails = template
    ? template.items.filter((item) => draft[item.id]?.result === 'fail')
    : []

  const capture = async (blob: Blob, meta: { watermark: Parameters<typeof watermarkSummary>[0] }) => {
    const kind = camera ?? 'before'
    const photoId = newId('photo')
    await db.photos.add({
      id: photoId,
      jobId,
      serviceItemId: serviceId,
      kind,
      blob,
      capturedAt: new Date().toISOString(),
      lat: meta.watermark.lat,
      lng: meta.watermark.lng,
      accuracy: meta.watermark.accuracy,
      watermark: watermarkSummary(meta.watermark)
    })
    await appendServicePhoto(jobId, serviceId, photoId, kind)
    setError(null)
  }

  const advance = () => {
    setError(null)
    if (step === 'before' && !beforeReady) {
      setError('A live before photo is required before the checklist.')
      return
    }
    if (step === 'checklist' && !marked) {
      setError('Mark every checklist line as Pass, Fail or N/A.')
      return
    }
    if (step === 'after' && !afterReady) {
      setError('A live after photo is required to close this service.')
      return
    }
    const next = STEP_ORDER[stepIndex + 1]
    if (next) setStep(next)
  }

  const complete = async () => {
    if (!beforeReady || !afterReady) {
      setError('Both a live before photo and a live after photo are required.')
      return
    }
    if (template && !marked) {
      setError('Mark every checklist line as Pass, Fail or N/A.')
      return
    }
    setSaving(true)
    setError(null)
    try {
      const checklist = template
        ? template.items
            .filter((item) => draft[item.id])
            .map((item) => ({
              itemId: item.id,
              result: draft[item.id].result,
              note: draft[item.id].note.trim() || undefined
            }))
        : []

      const issues: JobIssue[] = fails.map((item) => ({
        id: newId('issue'),
        serviceItemId: serviceId,
        severity: draft[item.id].severity,
        description: `${item.label}${draft[item.id].note ? ` \u2014 ${draft[item.id].note}` : ''}`,
        photoId: service.afterPhotoIds[0] ?? service.beforePhotoIds[0],
        raisedAt: new Date().toISOString()
      }))

      await finishService(jobId, serviceId, checklist, issues)
      toast('Service completed with live photo evidence', 'ok')
      onClose()
    } catch {
      setError('Could not save the service. Try again.')
    } finally {
      setSaving(false)
    }
  }

  const footer =
    step === 'review' ? (
      <Button full size="lg" onClick={() => void complete()} disabled={saving}>
        {saving ? 'Saving\u2026' : 'Complete service'}
      </Button>
    ) : (
      <div className="flex gap-2">
        {stepIndex > 0 && (
          <Button variant="secondary" onClick={() => setStep(STEP_ORDER[stepIndex - 1])}>
            Back
          </Button>
        )}
        <Button full onClick={advance}>
          Continue
        </Button>
      </div>
    )

  return (
    <>
      <Sheet
        open
        fullHeight
        onClose={onClose}
        title={service.name}
        subtitle={`${job.code} \u00b7 ${service.system} \u00b7 Step ${stepIndex + 1} of 4`}
        footer={footer}
      >
        <div className="mb-4 grid grid-cols-4 gap-1.5">
          {STEP_ORDER.map((item, index) => {
            const state = index < stepIndex ? 'done' : index === stepIndex ? 'current' : 'todo'
            return (
              <div key={item} className="flex flex-col gap-1">
                <div
                  className={clsx(
                    'h-1 rounded-full',
                    state === 'todo'
                      ? 'bg-surface-line'
                      : state === 'done'
                        ? 'bg-brand-400'
                        : 'bg-brand-600'
                  )}
                />
                <span
                  className={clsx(
                    'truncate text-[9px] font-bold uppercase tracking-wide',
                    state === 'todo'
                      ? 'text-ink-mute'
                      : state === 'done'
                        ? 'text-brand-500'
                        : 'text-brand-700'
                  )}
                >
                  {STEP_LABEL[item]}
                </span>
              </div>
            )
          })}
        </div>

        <div className="mb-3">
          <JobTimer job={job} variant="inline" />
        </div>

        {step === 'before' && (
          <div className="space-y-3">
            <div>
              <h3 className="text-[13px] font-bold text-ink">Photograph the equipment before touching it</h3>
              <p className="mt-0.5 text-[11px] leading-4 text-ink-mute">
                The visit clock is already running from the customer OTP. Capture the before proof,
                then start the work.
              </p>
            </div>

            {beforeReady ? (
              <div className="rounded-2xl border border-ok/30 bg-ok-soft p-3">
                <div className="flex items-center gap-3">
                  <PhotoThumb
                    photoId={service.beforePhotoIds[0]}
                    className="h-20 w-20 rounded-xl object-cover ring-1 ring-ok/20"
                    alt="Before"
                  />
                  <div className="min-w-0">
                    <p className="flex items-center gap-1.5 text-[13px] font-bold text-ok">
                      <CheckIcon size={14} /> Before photo captured
                    </p>
                    <p className="mt-0.5 text-[11px] text-ink-soft">
                      {service.beforePhotoIds.length} live photo(s) \u00b7 watermarked
                    </p>
                    <button
                      type="button"
                      onClick={() => setCamera('before')}
                      className="mt-2 rounded-lg border border-ok/30 bg-white px-2.5 py-1 text-[11px] font-bold text-ok"
                    >
                      Add another
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setCamera('before')}
                className="flex w-full flex-col items-center gap-2 rounded-2xl border-2 border-dashed border-brand-200 bg-brand-50/50 px-4 py-7 text-center transition active:scale-[0.99]"
              >
                <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-600 text-white shadow-card">
                  <CameraIcon size={22} />
                </span>
                <span className="text-[13px] font-bold text-brand-700">Open live camera</span>
                <span className="max-w-[230px] text-[11px] leading-4 text-ink-mute">
                  Gallery uploads are blocked. The photo is stamped with job, time and GPS.
                </span>
              </button>
            )}
          </div>
        )}

        {step === 'checklist' && template && (
          <div className="space-y-2.5">
            {template.items.map((item) => {
              const entry = draft[item.id]
              return (
                <Card key={item.id} className="p-3">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-[12px] font-semibold leading-5 text-ink">{item.label}</p>
                    {item.critical && (
                      <span className="mt-0.5 shrink-0 rounded-full bg-danger-soft px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-wide text-danger">
                        critical
                      </span>
                    )}
                  </div>
                  <div className="mt-2 grid grid-cols-3 gap-1.5">
                    {(['pass', 'fail', 'na'] as ChecklistResult[]).map((result) => {
                      const selected = entry?.result === result
                      const Icon =
                        result === 'pass' ? CheckIcon : result === 'fail' ? XIcon : MinusIcon
                      return (
                        <button
                          key={result}
                          type="button"
                          aria-pressed={selected}
                          onClick={() =>
                            setDraft((current) => ({
                              ...current,
                              [item.id]: {
                                result,
                                note: current[item.id]?.note ?? '',
                                severity: current[item.id]?.severity ?? 'major'
                              }
                            }))
                          }
                          className={clsx(
                            'flex min-h-[40px] items-center justify-center gap-1 rounded-lg border text-[11px] font-bold uppercase tracking-wide transition active:scale-95',
                            selected
                              ? result === 'pass'
                                ? 'border-ok bg-ok text-white'
                                : result === 'fail'
                                  ? 'border-danger bg-danger text-white'
                                  : 'border-ink-mute bg-ink-mute text-white'
                              : 'border-surface-line bg-white text-ink-soft'
                          )}
                        >
                          <Icon size={13} />
                          {result === 'na' ? 'N/A' : result}
                        </button>
                      )
                    })}
                  </div>

                  {entry?.result === 'fail' && (
                    <div className="mt-2 space-y-2 rounded-lg bg-danger-soft p-2.5">
                      <div className="flex gap-1.5">
                        {(['minor', 'major', 'critical'] as IssueSeverity[]).map((severity) => (
                          <button
                            key={severity}
                            type="button"
                            onClick={() =>
                              setDraft((current) => ({
                                ...current,
                                [item.id]: { ...current[item.id], severity }
                              }))
                            }
                            className={
                              'flex-1 rounded-md px-2 py-1.5 text-[11px] font-bold uppercase ' +
                              (entry.severity === severity
                                ? 'bg-danger text-white'
                                : 'bg-white text-danger')
                            }
                          >
                            {severity}
                          </button>
                        ))}
                      </div>
                      <textarea
                        rows={2}
                        aria-label={`Failure note for ${item.label}`}
                        value={entry.note}
                        onChange={(event) =>
                          setDraft((current) => ({
                            ...current,
                            [item.id]: { ...current[item.id], note: event.target.value }
                          }))
                        }
                        placeholder="What is wrong?"
                        className="w-full rounded-lg border border-danger/30 bg-white px-2.5 py-2 text-xs"
                      />
                    </div>
                  )}
                </Card>
              )
            })}
          </div>
        )}

        {step === 'checklist' && !template && (
          <Card className="p-4">
            <p className="text-sm text-ink-mute">
              No checklist template is attached to this service. You can skip to the after photo.
            </p>
          </Card>
        )}

        {step === 'after' && (
          <div className="space-y-3">
            <div>
              <h3 className="text-[13px] font-bold text-ink">Capture the finished work</h3>
              <p className="mt-0.5 text-[11px] leading-4 text-ink-mute">
                This is the proof your manager reviews against the before photo.
              </p>
            </div>

            {afterReady ? (
              <div className="rounded-2xl border border-ok/30 bg-ok-soft p-3">
                <div className="flex items-center gap-3">
                  <PhotoThumb
                    photoId={service.afterPhotoIds[0]}
                    className="h-20 w-20 rounded-xl object-cover ring-1 ring-ok/20"
                    alt="After"
                  />
                  <div className="min-w-0">
                    <p className="flex items-center gap-1.5 text-[13px] font-bold text-ok">
                      <CheckIcon size={14} /> After photo captured
                    </p>
                    <p className="mt-0.5 text-[11px] text-ink-soft">
                      {service.afterPhotoIds.length} live photo(s) \u00b7 watermarked
                    </p>
                    <button
                      type="button"
                      onClick={() => setCamera('after')}
                      className="mt-2 rounded-lg border border-ok/30 bg-white px-2.5 py-1 text-[11px] font-bold text-ok"
                    >
                      Add another
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setCamera('after')}
                className="flex w-full flex-col items-center gap-2 rounded-2xl border-2 border-dashed border-brand-200 bg-brand-50/50 px-4 py-7 text-center transition active:scale-[0.99]"
              >
                <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-600 text-white shadow-card">
                  <CameraIcon size={22} />
                </span>
                <span className="text-[13px] font-bold text-brand-700">Open live camera</span>
                <span className="max-w-[230px] text-[11px] leading-4 text-ink-mute">
                  Watermarked with job, service, employee, time and GPS.
                </span>
              </button>
            )}
          </div>
        )}

        {step === 'review' && (
          <div className="space-y-3">
            <Card className="p-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-ink">Ready to close</h3>
                <Badge tone={fails.length > 0 ? 'danger' : 'ok'}>
                  {fails.length > 0 ? `${fails.length} issue(s)` : 'No issues'}
                </Badge>
              </div>
              <dl className="mt-2 space-y-1.5 text-sm">
                <div className="flex justify-between">
                  <dt className="text-ink-mute">Before photos</dt>
                  <dd className="font-semibold">{service.beforePhotoIds.length}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-ink-mute">After photos</dt>
                  <dd className="font-semibold">{service.afterPhotoIds.length}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-ink-mute">Checklist lines</dt>
                  <dd className="font-semibold">
                    {Object.keys(draft).length}
                    {template ? ` / ${template.items.length}` : ''}
                  </dd>
                </div>
              </dl>
            </Card>

            {fails.length > 0 && (
              <Card className="border-danger/20 p-4">
                <h4 className="text-xs font-bold uppercase tracking-wide text-danger">Issues raised</h4>
                <ul className="mt-2 space-y-1.5 text-sm text-ink-soft">
                  {fails.map((item) => (
                    <li key={item.id}>
                      <span className="font-semibold text-ink">{draft[item.id].severity}</span>{' \u00b7 '}
                      {item.label}
                    </li>
                  ))}
                </ul>
              </Card>
            )}
          </div>
        )}

        {error && (
          <p role="alert" className="mt-3 rounded-lg bg-danger-soft px-3 py-2 text-xs font-semibold text-danger">
            {error}
          </p>
        )}
      </Sheet>

      {camera && (
        <CameraCapture
          jobCode={job.code}
          serviceName={service.name}
          employee={employee}
          kind={camera}
          onCapture={capture}
          onClose={() => setCamera(null)}
        />
      )}
    </>
  )
}
