import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import {
  isTrustedApkUrl,
  isTrustedReleaseUrl,
  sanitizeUpdateManifest
} from '@/domain/updates/manifest'

const APK = 'https://github.com/Sidharth7082/shabapp-releases/releases/download/v0.2.3/shabh-service-debug.apk?v=0.2.3'
const WEB = 'https://github.com/Sidharth7082/shabapp-releases/releases/tag/v0.2.3'

describe('update manifest validation', () => {
  it('accepts a well-formed manifest and keeps the safe fields', () => {
    const manifest = sanitizeUpdateManifest({
      version: 'v0.2.3',
      channel: 'stable',
      releasedAt: '2026-11-03T00:00:00.000Z',
      notes: [' Fixed login ', '', 'Faster board'],
      apkUrl: APK,
      webUrl: WEB
    })
    expect(manifest).toMatchObject({
      version: '0.2.3',
      channel: 'stable',
      notes: ['Fixed login', 'Faster board'],
      apkUrl: APK,
      webUrl: WEB
    })
  })

  it('rejects invalid versions, missing destinations and non-objects', () => {
    expect(sanitizeUpdateManifest(null)).toBeNull()
    expect(sanitizeUpdateManifest([])).toBeNull()
    expect(sanitizeUpdateManifest({ version: 'latest', webUrl: WEB })).toBeNull()
    expect(sanitizeUpdateManifest({ version: '0.2.3' })).toBeNull()
    expect(sanitizeUpdateManifest({ version: '0.2.3', apkUrl: 'http://github.com/x' })).toBeNull()
  })

  it('drops untrusted URLs but keeps a trusted fallback', () => {
    const manifest = sanitizeUpdateManifest({
      version: '0.2.3',
      apkUrl: 'https://evil.example.com/app.apk',
      webUrl: WEB
    })
    expect(manifest?.apkUrl).toBeUndefined()
    expect(manifest?.webUrl).toBe(WEB)
  })

  it('rejects lookalike hosts and other repositories', () => {
    expect(isTrustedReleaseUrl('https://github.com.evil.com/Sidharth7082/shabapp-releases/')).toBe(false)
    expect(isTrustedReleaseUrl('https://github.com/other/repo/releases/tag/v1')).toBe(false)
    expect(isTrustedReleaseUrl('http://github.com/Sidharth7082/shabapp-releases/releases/tag/v1')).toBe(false)
    expect(isTrustedApkUrl('https://github.com/Sidharth7082/shabapp-releases/releases/tag/v0.2.3')).toBe(false)
    expect(isTrustedApkUrl(APK)).toBe(true)
  })

  it('caps untrusted note volume and length', () => {
    const manifest = sanitizeUpdateManifest({
      version: '0.2.3',
      webUrl: WEB,
      notes: Array.from({ length: 40 }, (_, index) => `${index}-${'x'.repeat(900)}`)
    })
    expect(manifest?.notes).toHaveLength(20)
    expect(manifest?.notes?.[0].length).toBe(500)
  })

  it('accepts the update.json that ships with this repository', () => {
    const shipped = JSON.parse(
      readFileSync(`${process.cwd()}/public/update.json`, 'utf8')
    )
    expect(sanitizeUpdateManifest(shipped)).not.toBeNull()
  })
})
