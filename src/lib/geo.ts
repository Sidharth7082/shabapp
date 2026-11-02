export interface GeoPoint {
  lat: number
  lng: number
  accuracy: number
  at: string
}

export type GeoFailure = 'unsupported' | 'denied' | 'unavailable' | 'timeout'

export interface GeoResult {
  point?: GeoPoint
  error?: GeoFailure
}

export function getPosition(timeoutMs = 10_000): Promise<GeoResult> {
  if (typeof navigator === 'undefined' || !navigator.geolocation) {
    return Promise.resolve({ error: 'unsupported' })
  }

  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          point: {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
            accuracy: Math.round(position.coords.accuracy),
            at: new Date().toISOString()
          }
        })
      },
      (error) => {
        const map: Record<number, GeoFailure> = {
          1: 'denied',
          2: 'unavailable',
          3: 'timeout'
        }
        resolve({ error: map[error.code] ?? 'unavailable' })
      },
      { enableHighAccuracy: true, timeout: timeoutMs, maximumAge: 15_000 }
    )
  })
}

export function geoLabel(point?: GeoPoint | null): string {
  if (!point) return 'Location unavailable'
  return `${point.lat.toFixed(5)}, ${point.lng.toFixed(5)} \u00b1${point.accuracy} m`
}

export function mapsLink(lat: number, lng: number): string {
  return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`
}
