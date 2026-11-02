export interface WatermarkInfo {
  jobCode: string
  serviceName: string
  employee: string
  kind: 'before' | 'after'
  timestamp: Date
  lat?: number
  lng?: number
  accuracy?: number
}

/** Longest edge of a stored proof photo. Keeps canvas memory small on low-end phones. */
export const MAX_CAPTURE_WIDTH = 1280

/** Output size for a camera frame, never upscaling and never above the cap. */
export function captureSize(
  videoWidth: number,
  videoHeight: number
): { width: number; height: number } {
  if (!videoWidth || !videoHeight) return { width: 0, height: 0 }
  const scale = Math.min(1, MAX_CAPTURE_WIDTH / videoWidth)
  return {
    width: Math.round(videoWidth * scale),
    height: Math.round(videoHeight * scale)
  }
}

/** Burns job, service, employee, time and GPS into the pixels themselves. */
export function drawWatermarkedFrame(
  video: HTMLVideoElement,
  info: WatermarkInfo,
  quality = 0.72
): Promise<Blob> {
  const videoWidth = video.videoWidth
  const videoHeight = video.videoHeight
  if (!videoWidth || !videoHeight) {
    return Promise.reject(new Error('Camera frame is not ready'))
  }

  const { width, height } = captureSize(videoWidth, videoHeight)

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) return Promise.reject(new Error('Canvas is unavailable'))

  ctx.drawImage(video, 0, 0, width, height)

  const unit = Math.max(12, Math.round(width * 0.018))
  const pad = Math.round(unit * 0.9)

  // Header chip
  const header = `SHABH SERVICE \u2022 ${info.kind.toUpperCase()}`
  ctx.font = `700 ${unit}px system-ui, sans-serif`
  const headerWidth = ctx.measureText(header).width + pad * 2
  ctx.fillStyle = 'rgba(53, 78, 38, 0.92)'
  ctx.fillRect(0, 0, headerWidth, unit * 2.2)
  ctx.fillStyle = '#ffffff'
  ctx.textBaseline = 'middle'
  ctx.fillText(header, pad, unit * 1.1)

  // Footer block
  const lines = [
    `Job ${info.jobCode} \u2022 ${info.serviceName}`,
    info.timestamp.toLocaleString('en-IN', { hour12: true }),
    info.lat !== undefined && info.lng !== undefined
      ? `${info.lat.toFixed(5)}, ${info.lng.toFixed(5)} \u00b1${info.accuracy ?? 0}m`
      : 'GPS unavailable',
    `By ${info.employee}`
  ]

  const lineHeight = Math.round(unit * 1.45)
  const footerHeight = lineHeight * lines.length + pad * 1.6
  ctx.fillStyle = 'rgba(17, 24, 39, 0.72)'
  ctx.fillRect(0, height - footerHeight, width, footerHeight)

  ctx.fillStyle = '#ffffff'
  lines.forEach((line, index) => {
    ctx.font =
      index === 0
        ? `700 ${Math.round(unit * 1.05)}px system-ui, sans-serif`
        : `500 ${Math.round(unit * 0.92)}px system-ui, sans-serif`
    ctx.fillText(line, pad, height - footerHeight + pad * 0.8 + lineHeight * index + lineHeight / 2)
  })

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob)
        else reject(new Error('Could not encode the photo'))
      },
      'image/jpeg',
      quality
    )
  })
}

export function watermarkSummary(info: WatermarkInfo): string {
  const stamp = info.timestamp.toLocaleString('en-IN', { hour12: true })
  const geo =
    info.lat !== undefined && info.lng !== undefined
      ? `${info.lat.toFixed(5)}, ${info.lng.toFixed(5)}`
      : 'no GPS'
  return `${info.jobCode} | ${info.serviceName} | ${stamp} | ${geo}`
}
