export type FaSystem = 'Addressable' | 'Conventional'
export type FaHazard = 'Office' | 'Server' | 'Battery' | 'Kitchen' | 'Spa' | 'Hall'
export type ExpansionBuffer = 1 | 1.2 | 1.3 | 1.5

export const ADDRESSABLE_BRANDS = [
  'Notifier by Honeywell',
  'EST (Edwards)',
  'Morley IAS',
  'Hochiki',
  'Siemens (Cerberus/Desigo)',
  'Simplex (4000/4100ES)'
] as const

export const CONVENTIONAL_BRANDS = ['Agni', 'Ravel', 'System Sensor'] as const

export type FaBrand = (typeof ADDRESSABLE_BRANDS)[number] | (typeof CONVENTIONAL_BRANDS)[number]

export interface FaIntegrations {
  ahu: number
  access: number
  flow: number
  pump: number
  elec: number
  bms: boolean
  repeater: number
}

export interface FaRoomInput {
  id: string
  name: string
  hazard: FaHazard
  l: number
  w: number
  h: number
  distanceToPanel: number
  ceilingVoid: number
  floorVoid: number
  hasMcp: boolean
}

export interface FaConfig {
  system: FaSystem
  brand: FaBrand
  unit: 'm' | 'ft' | 'mm'
  exits: number
  expansion: ExpansionBuffer
  audio: 'Hooter' | 'Hooter + Strobe'
  integrations: FaIntegrations
}

export interface FaRoomResult {
  room: FaRoomInput
  areaM2: number
  smoke: number
  heat: number
  multi: number
  gas: number
  beam: number
  voidDetectors: number
  mcp: number
  wireM: number
}

export interface FaBoqRow {
  key: string
  description: string
  part: string
  qty: number | string
  group: 'panel' | 'initiating' | 'notification' | 'modules' | 'cabling'
  priced: false
}

export interface FaRollup {
  smoke: number
  heat: number
  multi: number
  gas: number
  beam: number
  mcp: number
  voidDetectors: number
  hooters: number
  moduleMonitor: number
  moduleRelay: number
  moduleControl: number
  isolators: number
  wireM: number
  totalAreaM2: number
  baseDevices: number
  bufferedDevices: number
  totalNodes: number
}

export interface FaBoqResult {
  rooms: FaRoomResult[]
  rollup: FaRollup
  panelModel: string
  rows: FaBoqRow[]
  notes: string[]
}

export const HAZARD_LABELS: Record<FaHazard, string> = {
  Office: 'General office / corridor',
  Server: 'Server / IT room',
  Battery: 'Battery room (H2)',
  Kitchen: 'Kitchen / pantry',
  Spa: 'Spa / shower',
  Hall: 'Large hall / warehouse'
}
