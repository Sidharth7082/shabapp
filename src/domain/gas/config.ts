/**
 * Clean-agent constants recovered from the Shabh Creations gas suppression
 * calculator (NFPA 2001). Values are kept identical to the shipped tool so
 * our recomputation matches its output.
 */

export type AgentKey = 'NOVEC' | 'FM200'
export type HazardClass = 'A' | 'B' | 'C'
export type Pressure = '25' | '42'
export type GasBrand = 'ANSUL' | 'KIDDE' | 'CEASEFIRE' | 'CRYPTZO' | 'GENERIC'
export type NozzleKey = '95' | '190'

export interface AgentSpec {
  key: AgentKey
  name: string
  shortName: string
  sBase: number
  sMultiplier: number
  concentration: Record<HazardClass, number>
}

export const AGENTS: Record<AgentKey, AgentSpec> = {
  NOVEC: {
    key: 'NOVEC',
    name: 'FK-5-1-12 (Novec 1230)',
    shortName: 'Novec 1230',
    sBase: 0.9856,
    sMultiplier: 0.0024422,
    concentration: { A: 4.5, B: 5.9, C: 4.5 }
  },
  FM200: {
    key: 'FM200',
    name: 'HFC-227ea (FM-200)',
    shortName: 'FM-200',
    sBase: 1.885,
    sMultiplier: 0.0046,
    concentration: { A: 8.04, B: 11.66, C: 8.64 }
  }
}

export const DESIGN_TEMP_F = 70

export const CYLINDERS: Record<GasBrand, readonly number[]> = {
  ANSUL: [34, 80, 120, 140, 180],
  KIDDE: [16, 27, 44, 61, 80, 106, 147, 189],
  CEASEFIRE: [16, 22, 34, 50, 55, 80, 100, 120, 140, 150, 180],
  CRYPTZO: [34, 80, 120, 140, 180],
  GENERIC: [15, 22, 34, 40, 49, 80, 104, 120, 140, 148, 150]
}

export const BRAND_LABELS: Record<GasBrand, string> = {
  ANSUL: 'Ansul',
  KIDDE: 'Kidde',
  CEASEFIRE: 'Ceasefire',
  CRYPTZO: 'Cryptzo',
  GENERIC: 'Standard UL/FM'
}

export const MIN_FILL = 0.48

export function maxFillDensity(pressure: Pressure): number {
  return pressure === '42' ? 1.4 : 1.12
}

export const NOZZLE_COVERAGE: Record<NozzleKey, number> = {
  '95': 95,
  '190': 190
}

export const NOZZLE_LABELS: Record<NozzleKey, string> = {
  '95': '360\u00b0 radial (95 m\u00b2)',
  '190': '180\u00b0 sidewall (190 m\u00b2)'
}

/** Cylinder assembly prices, INR ex-GST. Missing brand+size means "rate required". */
export const CYLINDER_PRICES: Partial<Record<GasBrand, Record<number, number>>> = {
  ANSUL: { 34: 71500, 80: 117000, 120: 130650, 140: 143000, 180: 156000 },
  CRYPTZO: { 34: 83850, 80: 101400, 120: 115050, 140: 123500, 180: 136500 }
}

export interface PartPrices {
  gasPerKg: number
  elecActuator: number
  manualActuator: number
  pneumaticActuator: number
  supervisorySwitch: number
  warningPlate: number
}

/**
 * The live site only prices ANSUL and CRYPTZO. Kidde / Ceasefire / Generic
 * therefore resolve to 0 and print as "-" there; our UI flags them instead.
 */
export const PART_PRICES: Partial<Record<GasBrand, PartPrices>> = {
  ANSUL: {
    gasPerKg: 1885,
    elecActuator: 27300,
    manualActuator: 9360,
    pneumaticActuator: 8060,
    supervisorySwitch: 4550,
    warningPlate: 1404
  },
  CRYPTZO: {
    gasPerKg: 2438,
    elecActuator: 42250,
    manualActuator: 0,
    pneumaticActuator: 7540,
    supervisorySwitch: 4550,
    warningPlate: 1235
  }
}

export const COMMON_PRICES = {
  bracket: 3250,
  nozzle: 4550,
  smokeDetector: 2600
} as const

export const HAZARD_LABELS: Record<HazardClass, string> = {
  A: 'Class A (wood, paper, cloth)',
  B: 'Class B (flammable liquids/gases)',
  C: 'Class C (energised electrical / IT)'
}
