import { describe, expect, it } from 'vitest'
import { compareVersions, isNewerVersion } from '@/services/updates'

describe('app version comparison', () => {
  it('orders patch, minor and major versions', () => {
    expect(compareVersions('0.2.0', '0.2.0')).toBe(0)
    expect(compareVersions('0.2.1', '0.2.0')).toBe(1)
    expect(compareVersions('0.3.0', '0.2.9')).toBe(1)
    expect(compareVersions('1.0.0', '0.99.99')).toBe(1)
    expect(compareVersions('0.2.0', '0.3.0')).toBe(-1)
  })

  it('ignores a leading v and build suffixes', () => {
    expect(compareVersions('v0.2.1', '0.2.0')).toBe(1)
    expect(compareVersions('0.2.1-beta.1', '0.2.1')).toBe(0)
    expect(compareVersions('v1.2', '1.2.0')).toBe(0)
  })

  it('treats missing segments as zero', () => {
    expect(compareVersions('1', '1.0.0')).toBe(0)
    expect(compareVersions('1.0.1', '1')).toBe(1)
  })

  it('reports updates only for a newer manifest', () => {
    expect(isNewerVersion('0.2.1', '0.2.0')).toBe(true)
    expect(isNewerVersion('0.2.0', '0.2.0')).toBe(false)
    expect(isNewerVersion('0.1.9', '0.2.0')).toBe(false)
  })
})
