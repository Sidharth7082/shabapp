export type LengthUnit = 'm' | 'ft' | 'mm'

export const FT_TO_M = 0.3048
export const MM_TO_M = 0.001
export const M3_TO_FT3 = 35.3147
export const LBS_PER_KG = 2.20462
export const M2_PER_FT2 = 0.092903

export function toMeters(value: number, unit: LengthUnit): number {
  if (unit === 'ft') return value * FT_TO_M
  if (unit === 'mm') return value * MM_TO_M
  return value
}

export function unitLabel(unit: LengthUnit): string {
  if (unit === 'ft') return 'ft'
  if (unit === 'mm') return 'mm'
  return 'm'
}

export function formatNumber(n: number, decimals = 2): string {
  return n.toLocaleString('en-IN', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  })
}
