import { useCallback, useEffect, useRef, useState } from 'react'
import { Button, IconButton } from '@/components/ui/Button'
import { getPosition, type GeoPoint } from '@/lib/geo'
import { drawWatermarkedFrame, type WatermarkInfo } from './watermark'

type CameraState = 'starting' | 'live' | 'denied' | 'unsupported' | 'error'

export interface CameraCaptureProps {
  jobCode: string
  serviceName: string
  employee: string
  kind: 'before' | 'after'
  onCapture: (blob: Blob, meta: { watermark: WatermarkInfo; geo?: GeoPoint }) => Promise<void> | void
  onClose: () => void
}

/**
 * Live-only capture. There is deliberately no file input in this component or
 * anywhere else in the bundle: the frame comes from getUserMedia and is written
 * straight to a canvas, so a gallery upload has no code path to travel.
 */
export function CameraCapture({
  jobCode,
  serviceName,
  employee,
  kind,
  onCapture,
  onClose
}: CameraCaptureProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const mountedRef = useRef(true)
  const [state, setState] = useState<CameraState>('starting')
  const [geo, setGeo] = useState<GeoPoint | undefined>()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [clock, setClock] = useState(() => new Date())

  const stop = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop())
    streamRef.current = null
  }, [])

  const start = useCallback(async () => {
    setState('starting')
    setError(null)
    if (!navigator.mediaDevices?.getUserMedia) {
      setState('unsupported')
      return
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' }, width: { ideal: 1920 } },
        audio: false
      })
      // The sheet may have closed while the permission prompt was open.
      if (!mountedRef.current) {
        stream.getTracks().forEach((track) => track.stop())
        return
      }
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await videoRef.current.play().catch(() => undefined)
      }
      setState('live')
    } catch (cause) {
      if (!mountedRef.current) return
      const name = cause instanceof DOMException ? cause.name : ''
      setState(name === 'NotAllowedError' || name === 'SecurityError' ? 'denied' : 'error')
      setError(cause instanceof Error ? cause.message : 'Camera could not start')
    }
  }, [])

  useEffect(() => {
    mountedRef.current = true
    void start()
    void getPosition().then((result) => {
      if (mountedRef.current) setGeo(result.point)
    })
    const timer = window.setInterval(() => setClock(new Date()), 1000)
    return () => {
      mountedRef.current = false
      window.clearInterval(timer)
      stop()
    }
  }, [start, stop])

  const capture = async () => {
    if (!videoRef.current || state !== 'live') return
    setBusy(true)
    try {
      const watermark: WatermarkInfo = {
        jobCode,
        serviceName,
        employee,
        kind,
        timestamp: new Date(),
        lat: geo?.lat,
        lng: geo?.lng,
        accuracy: geo?.accuracy
      }
      const blob = await drawWatermarkedFrame(videoRef.current, watermark)
      await onCapture(blob, { watermark, geo })
      stop()
      onClose()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Capture failed')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[70] flex flex-col bg-black text-white">
      <div className="safe-top flex items-center justify-between gap-3 px-4 pb-3">
        <div className="min-w-0">
          <p className="text-sm font-bold">Live photo {'\u2014'} {kind}</p>
          <p className="truncate text-xs text-white/70">
            {jobCode} {'\u00b7'} {serviceName}
          </p>
        </div>
        <IconButton label="Close camera" onClick={onClose} className="text-white hover:bg-white/10">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
          </svg>
        </IconButton>
      </div>

      <div className="relative flex-1 overflow-hidden">
        <video
          ref={videoRef}
          playsInline
          muted
          autoPlay
          className="h-full w-full object-cover"
          aria-label="Live camera preview"
        />

        {state === 'live' && (
          <>
            <div className="absolute left-3 top-3 rounded-lg bg-brand-700/90 px-2.5 py-1 text-[11px] font-bold tracking-wide">
              SHABH SERVICE \u00b7 {kind.toUpperCase()}
            </div>
            <div className="absolute inset-x-0 bottom-0 space-y-1 bg-gradient-to-t from-black/80 to-transparent p-3 pb-4 text-[12px] leading-5">
              <p className="font-bold">Job {jobCode} \u00b7 {serviceName}</p>
              <p className="text-white/80">
                {clock.toLocaleString('en-IN', { hour12: true })}
              </p>
              <p className="text-white/80">
                {geo ? `GPS \u00b1${geo.accuracy}m` : 'GPS unavailable'} \u00b7 {employee}
              </p>
            </div>
          </>
        )}

        {state !== 'live' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 px-8 text-center">
            {state === 'starting' && <p className="text-white/80">Starting camera{'\u2026'}</p>}
            {state === 'denied' && (
              <>
                <p className="text-lg font-bold">Camera permission is required</p>
                <p className="text-sm text-white/70">
                  Photos must be taken live in the app. Allow camera access in your browser settings, then retry.
                </p>
              </>
            )}
            {state === 'unsupported' && (
              <>
                <p className="text-lg font-bold">Camera not available</p>
                <p className="text-sm text-white/70">
                  This browser or connection cannot open the camera. Use HTTPS on a supported mobile browser.
                </p>
              </>
            )}
            {state === 'error' && (
              <>
                <p className="text-lg font-bold">Camera failed to start</p>
                <p className="text-sm text-white/70">{error}</p>
              </>
            )}
            {(state === 'denied' || state === 'error') && (
              <Button variant="secondary" onClick={() => void start()}>
                Retry camera
              </Button>
            )}
          </div>
        )}
      </div>

      <div className="safe-bottom flex flex-col items-center gap-2 bg-black px-6 pt-4">
        <button
          type="button"
          onClick={() => void capture()}
          disabled={state !== 'live' || busy}
          className="flex h-[76px] w-[76px] items-center justify-center rounded-full border-4 border-white/80 bg-white/20 disabled:opacity-40"
          aria-label="Take photo"
        >
          <span className="h-[56px] w-[56px] rounded-full bg-white" />
        </button>
        <p className="text-center text-[11px] text-white/60">
          Gallery uploads are disabled. Only live camera photos can be submitted.
        </p>
      </div>
    </div>
  )
}
