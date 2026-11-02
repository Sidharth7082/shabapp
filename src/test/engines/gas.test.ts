import { describe, expect, it } from 'vitest'
import { buildGasBoq, computeZone, type GasZoneInput } from '@/domain/gas/engine'
import type { GasOptions } from '@/domain/gas/engine'

const zone = (overrides: Partial<GasZoneInput> = {}): GasZoneInput => ({
  id: 'z1',
  name: 'Server Room 1',
  main: { l: 5, w: 4, h: 3 },
  ceiling: { l: 0, w: 0, h: 0 },
  floor: { l: 0, w: 0, h: 0 },
  hazard: 'C',
  nozzle: '95',
  pipeRunM: 0,
  ...overrides
})

const options = (overrides: Partial<GasOptions> = {}): GasOptions => ({
  agent: 'NOVEC',
  pressure: '25',
  brand: 'GENERIC',
  unit: 'm',
  ...overrides
})

describe('gas suppression engine', () => {
  it('reproduces the shipped Novec 1230 single-zone result', () => {
    const result = computeZone(zone({ pipeRunM: 10 }), options())

    // 60 m3 -> 2118.882 cuft / 1.156554 s-factor * 4.5/95.5
    expect(result.actualKg).toBeCloseTo(39.16, 1)
    // 39.16 * (1.02 + 10 * 0.005) = 41.90 -> ceil 42 kg
    expect(result.storedKg).toBe(42)
    expect(result.cylinderSizeL).toBe(40)
    expect(result.cylinderCount).toBe(1)
    expect(result.fillDensity).toBeCloseTo(1.05, 2)
    expect(result.totalNozzles).toBe(1)
    expect(result.detectors).toBe(2)
    expect(result.brackets).toBe(2)
    expect(result.concentration).toBe(4.5)
  })

  it('applies the FM-200 Class C concentration and 42 bar fill ceiling', () => {
    const result = computeZone(
      zone({ main: { l: 10, w: 8, h: 4 } }),
      options({ agent: 'FM200', pressure: '42', brand: 'ANSUL' })
    )

    expect(result.concentration).toBe(8.64)
    expect(result.cylinderSizeL).toBe(180)
    expect(result.cylinderCount).toBe(1)
    expect(result.fillDensity).toBeLessThanOrEqual(1.4)
    expect(result.fillDensity).toBeCloseTo(1.25, 2)
    expect(result.detectors).toBe(4)
    expect(result.totalNozzles).toBe(2)
  })

  it('splits into multiple cylinders when one is not enough', () => {
    const result = computeZone(
      zone({ main: { l: 30, w: 20, h: 10 } }),
      options({ brand: 'GENERIC', pressure: '25' })
    )

    expect(result.cylinderSizeL).toBe(150)
    expect(result.cylinderCount).toBe(24)
    expect(result.fillDensity).toBeLessThanOrEqual(1.12)
  })

  it('counts ceiling and floor voids as separate protected volumes', () => {
    const withVoids = computeZone(
      zone({
        ceiling: { l: 5, w: 4, h: 1 },
        floor: { l: 5, w: 4, h: 0.5 }
      }),
      options()
    )
    const withoutVoids = computeZone(zone(), options())

    expect(withVoids.totalVolumeM3).toBeCloseTo(90, 5)
    expect(withVoids.detectors).toBe(6)
    expect(withVoids.totalNozzles).toBe(3)
    expect(withVoids.storedKg).toBeGreaterThan(withoutVoids.storedKg)
  })

  it('memoises the BOQ line ids, quantities and 18% GST', () => {
    const result = computeZone(zone({ pipeRunM: 10 }), options({ brand: 'ANSUL' }))
    const boq = buildGasBoq([result], options({ brand: 'ANSUL' }))

    const byId = Object.fromEntries(boq.lines.map((line) => [line.id, line]))
    expect(byId.gas.qty).toBe(42)
    expect(byId.gas.rate).toBe(1885)
    // 42 kg exceeds 34 L x 1.12 kg/L, so Ansul steps up to the 80 L assembly
    expect(byId['cyl-80'].qty).toBe(1)
    expect(byId.bracket.qty).toBe(2)
    expect(byId.nozzle.qty).toBe(1)
    expect(byId.detector.qty).toBe(2)
    expect(byId['actuator-pneumatic']).toBeUndefined()
    expect(boq.gst).toBeCloseTo(boq.subtotal * 0.18, 2)
    expect(boq.total).toBeCloseTo(boq.subtotal * 1.18, 2)
    expect(boq.unpricedCount).toBe(0)
  })

  it('flags unpriced brands instead of silently charging zero', () => {
    const result = computeZone(zone(), options({ brand: 'KIDDE' }))
    const boq = buildGasBoq([result], options({ brand: 'KIDDE' }))

    expect(result.priced).toBe(false)
    // Agent, cylinder, both actuators, supervisory switch and plates have no
    // Kidde rate; shared hardware (brackets, nozzle, detectors) still prices.
    expect(boq.unpricedCount).toBe(6)
    expect(boq.lines.find((line) => line.id === 'gas')?.priced).toBe(false)
    expect(boq.lines.find((line) => line.id.startsWith('cyl-'))?.priced).toBe(false)
    expect(boq.subtotal).toBe(16250)
  })

  it('converts feet to metres before sizing', () => {
    const inMetres = computeZone(zone(), options())
    const inFeet = computeZone(
      zone({ main: { l: 5 / 0.3048, w: 4 / 0.3048, h: 3 / 0.3048 } }),
      options({ unit: 'ft' })
    )

    expect(inFeet.totalVolumeM3).toBeCloseTo(inMetres.totalVolumeM3, 4)
    expect(inFeet.storedKg).toBe(inMetres.storedKg)
  })
})
