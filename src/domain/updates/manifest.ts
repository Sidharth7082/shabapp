/**
 * The update manifest is untrusted input: it is fetched over the network and
 * decides which URL the app opens. Validate it strictly so a compromised or
 * spoofed manifest cannot send the employee to an attacker-controlled APK.
 */

export interface UpdateManifest {
  version: string
  channel?: string
  releasedAt?: string
  notes?: string[]
  apkUrl?: string
  webUrl?: string
}

const RELEASE_REPO_PATH = '/Sidharth7082/shabapp-releases/'
const MAX_NOTES = 20
const MAX_NOTE_LENGTH = 500
const MAX_URL_LENGTH = 2048

function parseUrl(value: unknown): URL | null {
  if (typeof value !== 'string' || value.length === 0 || value.length > MAX_URL_LENGTH) {
    return null
  }
  try {
    return new URL(value)
  } catch {
    return null
  }
}

/** Only HTTPS links inside the public, binary-only release repository. */
export function isTrustedReleaseUrl(value: unknown): value is string {
  const url = parseUrl(value)
  if (!url) return false
  if (url.protocol !== 'https:') return false
  if (url.hostname !== 'github.com') return false
  if (url.port && url.port !== '443') return false
  return url.pathname.startsWith(RELEASE_REPO_PATH)
}

/** APK links must be an actual release download, not just any repo page. */
export function isTrustedApkUrl(value: unknown): value is string {
  const url = parseUrl(value)
  return Boolean(url && isTrustedReleaseUrl(value) && url.pathname.startsWith(`${RELEASE_REPO_PATH}releases/download/`))
}

function cleanString(value: unknown, maxLength: number): string | undefined {
  if (typeof value !== 'string') return undefined
  const trimmed = value.trim()
  if (!trimmed) return undefined
  return trimmed.slice(0, maxLength)
}

/**
 * Returns a validated manifest, or `null` when the payload is unusable.
 * Individual unsafe URLs are dropped; an update with no trusted destination is
 * rejected entirely.
 */
export function sanitizeUpdateManifest(raw: unknown): UpdateManifest | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null
  const data = raw as Record<string, unknown>

  const version = cleanString(data.version, 32)?.replace(/^v/i, '')
  if (!version || !/^\d+\.\d+\.\d+$/.test(version)) return null

  const apkUrl = isTrustedApkUrl(data.apkUrl) ? data.apkUrl : undefined
  const webUrl = isTrustedReleaseUrl(data.webUrl) ? data.webUrl : undefined
  if (!apkUrl && !webUrl) return null

  const releasedAtValue = cleanString(data.releasedAt, 64)
  const releasedAt =
    releasedAtValue && Number.isFinite(new Date(releasedAtValue).getTime())
      ? releasedAtValue
      : undefined

  const notes = Array.isArray(data.notes)
    ? data.notes
        .filter((note): note is string => typeof note === 'string')
        .map((note) => note.trim())
        .filter(Boolean)
        .slice(0, MAX_NOTES)
        .map((note) => note.slice(0, MAX_NOTE_LENGTH))
    : undefined

  const channel = cleanString(data.channel, 16)

  return {
    version,
    ...(channel ? { channel } : {}),
    ...(releasedAt ? { releasedAt } : {}),
    ...(notes && notes.length > 0 ? { notes } : {}),
    ...(apkUrl ? { apkUrl } : {}),
    ...(webUrl ? { webUrl } : {})
  }
}
