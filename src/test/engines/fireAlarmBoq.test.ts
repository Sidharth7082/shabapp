import { describe, expect, it } from 'vitest'
import { computeFaBoq } from '@/domain/fireAlarmBoq/engine'
import type { FaConfig, FaRoomInput } from '@/domain/fireAlarmBoq/types'

const room = (overrides: Partial<FaRoomInput>): FaRoomInput => ({
  id: overrides.id ?? 'r1',
  name: overrides.name ?? 'Room',
  hazard: overrides.hazard ?? 'Office',
  l: overrides.l ?? 10,
  w: overrides.w ?? 10,
  h: overrides.h ?? 3,
  distanceToPanel: overrides.distanceToPanel ?? 0,
  ceilingVoid: overrides.ceilingVoid ?? 0,
  floorVoid: overrides.floorVoid ?? 0,
  hasMcp: overrides.hasMcp ?? false
})

const config: FaConfig = {
  system: 'Addressable',
  brand: 'Notifier by Honeywell',
  unit: 'm',
  exits: 2,
  expansion: 1,
  audio: 'Hooter',
  integrations: { ahu: 0, access: 0, flow: 0, pump: 0, elec: 0, bms: false, repeater: 0 }
}

describe('fire alarm BOQ engine', () => {
  it('rolls up a mixed-hazard layout', () => {
    const rooms: FaRoomInput[] = [
      room({ id: 'office', name: 'Office', hazard: 'Office', l: 10, w: 10 }),
      room({ id: 'server', name: 'Server', hazard: 'Server', l: 10, w: 6 }),
      room({ id: 'battery', name: 'Battery', hazard: 'Battery', l: 5, w: 6 }),
      room({ id: 'hall', name: 'Hall', hazard: 'Hall', l: 20, w: 10, h: 10 }),
      room({ id: 'kitchen', name: 'Kitchen', hazard: 'Kitchen', l: 6, w: 6 })
    ]

    const result = computeFaBoq(config, rooms)

    expect(result.rollup.totalAreaM2).toBeCloseTo(426, 5)
    expect(result.rollup.smoke).toBe(3) // office 2 + battery 1
    expect(result.rollup.heat).toBe(1)
    expect(result.rollup.multi).toBe(1)
    expect(result.rollup.gas).toBe(1)
    expect(result.rollup.beam).toBe(1)
    expect(result.rollup.mcp).toBe(2) // two exits, no room MCP
    expect(result.rollup.hooters).toBe(4) // 2 exits + ceil(426/400)
    expect(result.rollup.moduleMonitor).toBe(2) // H2 detector + beam
    expect(result.rollup.moduleControl).toBe(1)
    expect(result.rollup.baseDevices).toBe(8)
    expect(result.rollup.isolators).toBe(1)
    expect(result.rollup.totalNodes).toBe(12)
    expect(result.panelModel).toContain('NFS-320')

    const row = (key: string) => result.rows.find((item) => item.key === key)
    expect(row('panel')?.qty).toBe(1)
    expect(row('smoke')?.qty).toBe(3)
    expect(row('notification')?.qty).toBe(4)
    expect(row('monitor')?.qty).toBe(2)
    expect(row('control')?.qty).toBe(1)
    expect(row('repeater')).toBeUndefined()
    expect(row('cable')?.qty).toBe('~222 m')
  })

  it('duplicates detector sets for ceiling and floor voids', () => {
    const base = computeFaBoq(config, [room({ l: 10, w: 10 })])
    const withVoids = computeFaBoq(config, [
      room({ l: 10, w: 10, ceilingVoid: 0.6, floorVoid: 0.3 })
    ])

    expect(base.rollup.voidDetectors).toBe(0)
    expect(withVoids.rollup.voidDetectors).toBe(4) // 2 detectors x 2 void layers
    expect(withVoids.rollup.bufferedDevices).toBeGreaterThan(base.rollup.bufferedDevices)
  })

  it('applies the expansion buffer to device counts only', () => {
    const plain = computeFaBoq(config, [room({ l: 10, w: 10 })])
    const buffered = computeFaBoq({ ...config, expansion: 1.3 }, [room({ l: 10, w: 10 })])

    expect(buffered.rollup.smoke).toBe(2)
    expect(buffered.rollup.bufferedDevices).toBe(Math.ceil(plain.rollup.baseDevices * 1.3))
    expect(buffered.rows.find((r) => r.key === 'smoke')?.qty).toBe(
      Math.ceil(plain.rollup.smoke * 1.3)
    )
  })

  it('omits modules and isolators for conventional systems', () => {
    const result = computeFaBoq(
      { ...config, system: 'Conventional', brand: 'Agni' },
      [room({ l: 10, w: 10 })]
    )

    expect(result.rollup.isolators).toBe(0)
    expect(result.rows.find((r) => r.key === 'monitor')).toBeUndefined()
    expect(result.rows.find((r) => r.key === 'isolator')).toBeUndefined()
    expect(result.notes.some((note) => note.includes('Conventional mode'))).toBe(true)
  })

  it('converts feet before applying coverage rules', () => {
    const metric = computeFaBoq(config, [room({ l: 10, w: 10 })])
    const imperial = computeFaBoq(
      { ...config, unit: 'ft' },
      [room({ l: 10 / 0.3048, w: 10 / 0.3048 })]
    )

    expect(imperial.rollup.smoke).toBe(metric.rollup.smoke)
    expect(imperial.rollup.totalAreaM2).toBeCloseTo(metric.rollup.totalAreaM2, 5)
  })
})
