import { toMeters } from '@/domain/shared/units'
import { panelModelFor, BRAND_PARTS } from './brands'
import type {
  FaBoqResult,
  FaBoqRow,
  FaConfig,
  FaRollup,
  FaRoomInput,
  FaRoomResult
} from './types'

/**
 * Quantity takeoff recovered from the Shabh free fire alarm BOQ generator.
 * Area coverage: smoke 81 m2, heat 36 m2, H2 detector 50 m2, beam grid 15 m x 100 m.
 */
export function computeFaBoq(config: FaConfig, rooms: FaRoomInput[]): FaBoqResult {
  const rollup: FaRollup = {
    smoke: 0,
    heat: 0,
    multi: 0,
    gas: 0,
    beam: 0,
    mcp: Math.max(0, config.exits),
    voidDetectors: 0,
    hooters: Math.max(0, config.exits),
    moduleMonitor: 0,
    moduleRelay: 0,
    moduleControl: 0,
    isolators: 0,
    wireM: 0,
    totalAreaM2: 0,
    baseDevices: 0,
    bufferedDevices: 0,
    totalNodes: 0
  }

  const results: FaRoomResult[] = []

  for (const room of rooms) {
    const l = toMeters(room.l, config.unit)
    const w = toMeters(room.w, config.unit)
    const h = toMeters(room.h, config.unit)
    const area = l * w

    let smoke = 0
    let heat = 0
    let multi = 0
    let gas = 0
    let beam = 0

    if (room.hazard === 'Kitchen' || room.hazard === 'Spa') {
      heat = Math.ceil(area / 36)
    } else if (room.hazard === 'Battery') {
      smoke = Math.ceil(area / 81)
      gas = Math.max(1, Math.ceil(area / 50))
      if (config.system === 'Addressable') rollup.moduleMonitor += gas
    } else if (room.hazard === 'Server') {
      multi = Math.ceil(area / 81)
    } else if (room.hazard === 'Hall' && h > 8) {
      const beamWidth = Math.ceil(w / 15)
      const beamLength = Math.ceil(l / 100)
      beam = Math.max(1, beamWidth * beamLength)
      if (config.system === 'Addressable') rollup.moduleMonitor += beam
    } else {
      smoke = Math.ceil(area / 81)
    }

    const perLayer = smoke + heat + multi
    let voidDetectors = 0
    if (room.ceilingVoid > 0) voidDetectors += perLayer
    if (room.floorVoid > 0) voidDetectors += perLayer

    const mcpForRoom = room.hasMcp ? 1 : 0
    const perimeter = (l + w) * 2
    const wireM = room.distanceToPanel * 2 + perimeter + perLayer * 3

    rollup.smoke += smoke
    rollup.heat += heat
    rollup.multi += multi
    rollup.gas += gas
    rollup.beam += beam
    rollup.voidDetectors += voidDetectors
    rollup.mcp += mcpForRoom
    rollup.wireM += wireM
    rollup.totalAreaM2 += area

    results.push({
      room,
      areaM2: area,
      smoke,
      heat,
      multi,
      gas,
      beam,
      voidDetectors,
      mcp: mcpForRoom,
      wireM
    })
  }

  rollup.hooters += Math.ceil(rollup.totalAreaM2 / 400)

  // Integration interface counts (addressable only, as in the shipped tool).
  let bms = false
  let repeaterQty = 0
  if (config.system === 'Addressable') {
    const { ahu, access, flow, pump, elec, bms: wantsBms, repeater } = config.integrations
    rollup.moduleRelay += Math.max(0, ahu) + Math.max(0, access) + Math.max(0, elec)
    rollup.moduleMonitor += Math.max(0, flow) + Math.max(0, pump) * 3
    if (wantsBms) {
      bms = true
      rollup.moduleMonitor += 1
    }
    repeaterQty = Math.max(0, repeater)
    rollup.moduleControl += Math.ceil(rollup.hooters / 10)
  }

  const baseDevices =
    rollup.smoke + rollup.heat + rollup.multi + rollup.voidDetectors + rollup.mcp + rollup.beam
  rollup.baseDevices = baseDevices
  rollup.bufferedDevices = Math.ceil(baseDevices * config.expansion)

  if (config.system === 'Addressable') {
    rollup.isolators = Math.max(1, Math.ceil(rollup.bufferedDevices / 20))
  }

  rollup.totalNodes =
    rollup.bufferedDevices +
    rollup.moduleMonitor +
    rollup.moduleRelay +
    rollup.moduleControl +
    rollup.isolators

  const parts = BRAND_PARTS[config.brand]
  const panelModel = panelModelFor(config.brand, rollup.totalNodes)
  const exp = config.expansion

  const rows: FaBoqRow[] = []
  const add = (
    key: string,
    description: string,
    part: string,
    qty: number | string,
    group: FaBoqRow['group']
  ) => {
    if (typeof qty === 'number' && qty <= 0) return
    rows.push({ key, description, part, qty, group, priced: false })
  }

  add('panel', 'Main fire alarm panel (sized for load + expansion)', `${config.brand} - ${panelModel}`, 1, 'panel')
  add('smoke', 'Optical smoke detectors', parts.smoke, Math.ceil(rollup.smoke * exp), 'initiating')
  add('heat', 'Heat detectors', parts.heat, Math.ceil(rollup.heat * exp), 'initiating')
  add('multi', 'Multi-criteria detectors', parts.multi, Math.ceil(rollup.multi * exp), 'initiating')
  add('void', 'Detectors for ceiling/floor voids', parts.smoke, Math.ceil(rollup.voidDetectors * exp), 'initiating')
  add('gas', 'H2 gas detectors (battery room)', 'Honeywell / Draeger 4-20 mA', rollup.gas, 'initiating')
  add('beam', 'Beam smoke detectors (high hall)', 'FireRay / System Sensor', rollup.beam, 'initiating')
  add('mcp', 'Manual call points', parts.mcp, Math.ceil(rollup.mcp * exp), 'initiating')
  add('notification', 'Notification appliances', config.audio, Math.ceil(rollup.hooters * exp), 'notification')

  if (config.system === 'Addressable') {
    add('monitor', 'Addressable monitor modules', parts.monitor, Math.ceil(rollup.moduleMonitor * exp), 'modules')
    add('relay', 'Addressable relay modules', parts.relay, Math.ceil(rollup.moduleRelay * exp), 'modules')
    add('control', 'Addressable control modules', parts.control, Math.ceil(rollup.moduleControl * exp), 'modules')
    add('isolator', 'Fault isolator modules (Class A protection)', parts.isolator, rollup.isolators, 'modules')
    if (bms) add('bms', 'BMS integration gateway card', 'Addressable gateway card', 1, 'modules')
    add('repeater', 'Repeater annunciator panel', 'Network LCD annunciator', repeaterQty, 'modules')
  }

  add(
    'cable',
    'Fire alarm cable (Class A loop / zone)',
    config.system === 'Addressable' ? '2C x 1.5 sqmm armoured' : '2C x 1.5 sqmm FRLS',
    `~${Math.ceil(rollup.wireM * 1.15)} m`,
    'cabling'
  )

  const notes: string[] = []
  if (config.system === 'Conventional') {
    notes.push('Conventional mode: modules and fault isolators are not part of the schedule.')
  }
  if (config.expansion > 1) {
    notes.push(`Device counts include a ${Math.round((config.expansion - 1) * 100)}% future capacity buffer.`)
  }
  notes.push('Quantities only. Prices are not part of this BOQ — use the Quotation Builder for rates.')

  return { rooms: results, rollup, panelModel, rows, notes }
}
