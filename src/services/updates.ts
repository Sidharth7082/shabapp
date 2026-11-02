import { settingGet, settingSet } from '@/db/db'
import { openExternal } from '@/lib/openExternal'
import { APP_VERSION } from '@/version'

/**
 * Public update manifest. The application source is private; this file lives
 * in the `shabapp-releases` repository together with the APK assets, so an
 * installed app can check for updates without any credentials.
 */
export const UPDATE_MANIFEST_URL =
  import.meta.env.VITE_UPDATE_URL ??
  'https://raw.githubusercontent.com/Sidharth7082/shabapp-releases/main/update.json'

/**
 * GitHub's contents API returns the current file immediately, while the raw
 * CDN can serve a cached manifest for a couple of minutes after a release.
 * The API is anonymous (60 requests/hour/IP), so a rate-limited response falls
 * back to the raw URL.
 */
const UPDATE_CONTENTS_API =
  'https://api.github.com/repos/Sidharth7082/shabapp-releases/contents/update.json'

export interface UpdateManifest {
  version: string
  channel?: string
  releasedAt?: string
  notes?: string[]
  apkUrl?: string
  webUrl?: string
}

export type UpdateCheck =
  | { ok: true; manifest: UpdateManifest; available: boolean }
  | { ok: false; error: string }

/** Numeric semver comparison; returns 1 when a > b, -1 when a < b, 0 when equal. */
export function compareVersions(a: string, b: string): number {
  const parse = (value: string) =>
    value
      .replace(/^v/i, '')
      .split('-')[0]
      .split('.')
      .map((part) => Number.parseInt(part, 10) || 0)
  const left = parse(a)
  const right = parse(b)
  const length = Math.max(left.length, right.length)
  for (let index = 0; index < length; index += 1) {
    const l = left[index] ?? 0
    const r = right[index] ?? 0
    if (l > r) return 1
    if (l < r) return -1
  }
  return 0
}

export function isNewerVersion(latest: string, current = APP_VERSION): boolean {
  return compareVersions(latest, current) > 0
}

function decodeBase64Json(content: string): UpdateManifest {
  const binary = atob(content.replace(/\s/g, ''))
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0))
  return JSON.parse(new TextDecoder().decode(bytes)) as UpdateManifest
}

async function fetchManifest(signal: AbortSignal): Promise<UpdateManifest> {
  const override = import.meta.env.VITE_UPDATE_URL
  if (override) {
    const response = await fetch(`${override}?t=${Date.now()}`, { signal, cache: 'no-store' })
    if (!response.ok) throw new Error(`Update server returned ${response.status}`)
    return (await response.json()) as UpdateManifest
  }

  try {
    const response = await fetch(`${UPDATE_CONTENTS_API}?t=${Date.now()}`, {
      signal,
      cache: 'no-store',
      headers: { accept: 'application/vnd.github+json' }
    })
    if (response.ok) {
      const payload = (await response.json()) as { content?: string }
      if (typeof payload.content === 'string') return decodeBase64Json(payload.content)
    }
  } catch {
    // fall through to the raw URL
  }

  const response = await fetch(`${UPDATE_MANIFEST_URL}?t=${Date.now()}`, {
    signal,
    cache: 'no-store'
  })
  if (!response.ok) throw new Error(`Update server returned ${response.status}`)
  return (await response.json()) as UpdateManifest
}

export async function checkForUpdates(timeoutMs = 7000): Promise<UpdateCheck> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const manifest = await fetchManifest(controller.signal)
    if (!manifest?.version) return { ok: false, error: 'The update manifest is invalid.' }
    return { ok: true, manifest, available: isNewerVersion(manifest.version) }
  } catch {
    return { ok: false, error: 'Could not reach the update server. Check the connection.' }
  } finally {
    clearTimeout(timer)
  }
}

const DISMISSED_KEY = 'updateDismissedVersion'

export async function dismissedUpdateVersion(): Promise<string | null> {
  return settingGet<string | null>(DISMISSED_KEY, null)
}

export async function dismissUpdate(version: string): Promise<void> {
  await settingSet(DISMISSED_KEY, version)
}

function isNativePlatform(): boolean {
  const capacitor = (window as Window & {
    Capacitor?: { isNativePlatform?: () => boolean }
  }).Capacitor
  return Boolean(capacitor?.isNativePlatform?.())
}

/** Opens the APK download (native) or the release page (web). */
export async function openUpdateDownload(manifest: UpdateManifest): Promise<void> {
  const native = isNativePlatform()
  const url = native ? manifest.apkUrl ?? manifest.webUrl : manifest.webUrl ?? manifest.apkUrl
  if (!url) return
  await openExternal(url)
}
