import { gstSplit, round2 } from '@/domain/shared/money'
import { LBS_PER_KG, M3_TO_FT3, toMeters, type LengthUnit } from '@/domain/shared/units'
import {
  AGENTS,
  BRAND_LABELS,
  COMMON_PRICES,
  CYLINDERS,
  CYLINDER_PRICES,
  DESIGN_TEMP_F,
  HAZARD_LABELS,
  MIN_FILL,
  NOZZLE_COVERAGE,
  PART_PRICES,
  maxFillDensity,
  type AgentKey,
  type GasBrand,
  type HazardClass,
  type NozzleKey,
  type Pressure
} from './config'

export interface Box {
  l: number
  w: number
  h: number
}

export interface GasZoneInput {
  id: string
  name: string
  main: Box
  ceiling: Box
  floor: Box
  hazard: HazardClass
  nozzle: NozzleKey
  pipeRunM: number
}

export interface GasOptions {
  agent: AgentKey
  pressure: Pressure
  brand: GasBrand
  unit: LengthUnit
}

export interface LayerResult {
  active: boolean
  volumeM3: number
  areaM2: number
  nozzles: number
  weightLbs: number
}

export interface ZoneResult {
  input: GasZoneInput
  main: LayerResult
  ceiling: LayerResult
  floor: LayerResult
  totalVolumeM3: number
  totalAreaM2: number
  concentration: number
  actualKg: number
  storedKg: number
  cylinderSizeL: number
  cylinderCount: number
  fillDensity: number
  totalNozzles: number
  detectors: number
  brackets: number
  priced: boolean
}

export interface BoqLine {
  id: string
  description: string
  qty: number
  unit: string
  rate: number
  amount: number
  priced: boolean
  group: 'agent' | 'hardware' | 'detection' | 'accessory'
}

export interface GasBoq {
  lines: BoqLine[]
  subtotal: number
  gst: number
  total: number
  unpricedCount: number
}

const inactive = (): LayerResult => ({
  active: false,
  volumeM3: 0,
  areaM2: 0,
  nozzles: 0,
  weightLbs: 0
})

function layer(box: Box, unit: LengthUnit, coverage: number, sFactor: number, concentration: number): LayerResult {
  const l = toMeters(box.l, unit)
  const w = toMeters(box.w, unit)
  const h = toMeters(box.h, unit)
  if (l <= 0 || w <= 0 || h <= 0) return inactive()

  const areaM2 = l * w
  const volumeM3 = areaM2 * h
  const volumeFt3 = volumeM3 * M3_TO_FT3
  const weightLbs = (volumeFt3 / sFactor) * (concentration / (100 - concentration))

  const maxSpacing = Math.sqrt(coverage)
  const gridNozzles =
    Math.ceil(l / maxSpacing) * Math.ceil(w / maxSpacing) * Math.ceil(h / 4.87)
  const areaNozzles = Math.ceil(areaM2 / coverage)
  const nozzles = Math.max(gridNozzles, areaNozzles)

  return { active: true, volumeM3, areaM2, nozzles, weightLbs }
}

function pickCylinder(
  storedKg: number,
  brand: GasBrand,
  pressure: Pressure
): { storedKg: number; size: number; count: number; fillDensity: number } {
  const sizes = [...CYLINDERS[brand]].sort((a, b) => a - b)
  const maxFill = maxFillDensity(pressure)
  let remaining = storedKg
  let chosen = sizes[sizes.length - 1]
  let count = 1
  let found = false

  for (const size of sizes) {
    if (remaining <= size * maxFill) {
      chosen = size
      const minRequired = Math.ceil(size * MIN_FILL)
      if (remaining < minRequired) remaining = minRequired
      found = true
      break
    }
  }

  if (!found) {
    chosen = sizes[sizes.length - 1]
    count = Math.ceil(remaining / (chosen * maxFill))
    const minPerCylinder = Math.ceil(chosen * MIN_FILL)
    if (remaining / count < minPerCylinder) remaining = minPerCylinder * count
  }

  return {
    storedKg: remaining,
    size: chosen,
    count,
    fillDensity: remaining / count / chosen
  }
}

export function computeZone(input: GasZoneInput, options: GasOptions): ZoneResult {
  const agent = AGENTS[options.agent]
  const concentration = agent.concentration[input.hazard]
  const sFactor = agent.sBase + agent.sMultiplier * DESIGN_TEMP_F
  const coverage = NOZZLE_COVERAGE[input.nozzle]

  const main = layer(input.main, options.unit, coverage, sFactor, concentration)
  const ceiling = layer(input.ceiling, options.unit, coverage, sFactor, concentration)
  const floor = layer(input.floor, options.unit, coverage, sFactor, concentration)

  const totalLbs = main.weightLbs + ceiling.weightLbs + floor.weightLbs
  const actualKg = totalLbs / LBS_PER_KG
  const allowance = 1.02 + Math.max(0, input.pipeRunM) * 0.005
  const requestedKg = Math.ceil(actualKg * allowance)

  const picked = pickCylinder(requestedKg, options.brand, options.pressure)

  const detectors =
    (main.active ? Math.max(2, Math.ceil(main.areaM2 / 25)) : 0) +
    (ceiling.active ? Math.max(2, Math.ceil(ceiling.areaM2 / 25)) : 0) +
    (floor.active ? Math.max(2, Math.ceil(floor.areaM2 / 25)) : 0)

  return {
    input,
    main,
    ceiling,
    floor,
    totalVolumeM3: main.volumeM3 + ceiling.volumeM3 + floor.volumeM3,
    totalAreaM2: main.areaM2 + ceiling.areaM2 + floor.areaM2,
    concentration,
    actualKg,
    storedKg: picked.storedKg,
    cylinderSizeL: picked.size,
    cylinderCount: picked.count,
    fillDensity: picked.fillDensity,
    totalNozzles: main.nozzles + ceiling.nozzles + floor.nozzles,
    detectors,
    brackets: picked.count * 2,
    priced: Boolean(PART_PRICES[options.brand]) && Boolean(CYLINDER_PRICES[options.brand]?.[picked.size])
  }
}

export function buildGasBoq(
  zones: ZoneResult[],
  options: GasOptions,
  rateOverrides: Record<string, number> = {}
): GasBoq {
  const agent = AGENTS[options.agent]
  const parts = PART_PRICES[options.brand]
  const lines: BoqLine[] = []

  const rateOf = (id: string, fallback: number) =>
    rateOverrides[id] !== undefined ? rateOverrides[id] : fallback

  const push = (
    id: string,
    description: string,
    qty: number,
    unit: string,
    fallbackRate: number,
    group: BoqLine['group']
  ) => {
    if (qty <= 0) return
    const rate = rateOf(id, fallbackRate)
    lines.push({
      id,
      description,
      qty,
      unit,
      rate,
      amount: round2(qty * rate),
      priced: rate > 0,
      group
    })
  }

  const totalStored = zones.reduce((sum, z) => sum + z.storedKg, 0)
  const totalCylinders = zones.reduce((sum, z) => sum + z.cylinderCount, 0)
  const totalNozzles = zones.reduce((sum, z) => sum + z.totalNozzles, 0)
  const totalDetectors = zones.reduce((sum, z) => sum + z.detectors, 0)
  const totalBrackets = zones.reduce((sum, z) => sum + z.brackets, 0)

  push(
    'gas',
    `${BRAND_LABELS[options.brand]} certified ${agent.name} agent (${options.pressure} bar)`,
    totalStored,
    'kg',
    parts?.gasPerKg ?? 0,
    'agent'
  )

  const cylinderGroups = new Map<string, { size: number; count: number }>()
  for (const zone of zones) {
    const key = String(zone.cylinderSizeL)
    const current = cylinderGroups.get(key) ?? { size: zone.cylinderSizeL, count: 0 }
    current.count += zone.cylinderCount
    cylinderGroups.set(key, current)
  }
  for (const { size, count } of [...cylinderGroups.values()].sort((a, b) => a.size - b.size)) {
    push(
      `cyl-${size}`,
      `${size} L cylinder assembly with valve (${options.pressure} bar, ${BRAND_LABELS[options.brand]})`,
      count,
      'Nos',
      CYLINDER_PRICES[options.brand]?.[size] ?? 0,
      'hardware'
    )
  }

  push('bracket', 'Cylinder mounting bracket assembly', totalBrackets, 'Nos', COMMON_PRICES.bracket, 'hardware')
  push('nozzle', 'Discharge nozzle (brass, 360/180 degree)', totalNozzles, 'Nos', COMMON_PRICES.nozzle, 'hardware')
  push('actuator-electric', 'Electrical actuator (master release)', zones.length, 'Nos', parts?.elecActuator ?? 0, 'hardware')
  push('actuator-manual', 'Local manual actuator', zones.length, 'Nos', parts?.manualActuator ?? 0, 'hardware')
  push(
    'actuator-pneumatic',
    'Pneumatic actuator (slave release)',
    Math.max(0, totalCylinders - zones.length),
    'Nos',
    parts?.pneumaticActuator ?? 0,
    'hardware'
  )
  push('detector', 'Photoelectric smoke detector (cross-zoned)', totalDetectors, 'Nos', COMMON_PRICES.smokeDetector, 'detection')
  push('supervisory-switch', 'Supervisory pressure switch', zones.length, 'Nos', parts?.supervisorySwitch ?? 0, 'accessory')
  push('warning-plate', 'Warning caution plate', zones.length * 2, 'Nos', parts?.warningPlate ?? 0, 'accessory')

  const subtotal = round2(lines.reduce((sum, line) => sum + line.amount, 0))
  const split = gstSplit(subtotal)

  return {
    lines,
    subtotal: split.subtotal,
    gst: split.gst,
    total: split.total,
    unpricedCount: lines.filter((line) => !line.priced).length
  }
}

export function describeZone(zone: ZoneResult, options: GasOptions): string {
  return `${zone.input.name} \u2014 ${HAZARD_LABELS[zone.input.hazard]} \u2014 ${AGENTS[options.agent].shortName}`
}
