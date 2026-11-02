import { describe, expect, it } from 'vitest'
import { MAX_CAPTURE_WIDTH, captureSize } from '@/features/camera/watermark'

describe('proof photo size', () => {
  it('caps a tall phone frame at 1280 px wide', () => {
    expect(captureSize(1392, 1856)).toEqual({ width: 1280, height: 1707 })
    expect(MAX_CAPTURE_WIDTH).toBe(1280)
  })

  it('never upscales a small frame', () => {
    expect(captureSize(640, 480)).toEqual({ width: 640, height: 480 })
  })

  it('handles a frame that is not ready', () => {
    expect(captureSize(0, 0)).toEqual({ width: 0, height: 0 })
    expect(captureSize(0, 720)).toEqual({ width: 0, height: 0 })
  })
})
