export interface ChecklistItemDef {
  id: string
  label: string
  critical?: boolean
}

export interface ChecklistTemplate {
  id: string
  name: string
  system: string
  items: ChecklistItemDef[]
}

/**
 * Practical AMC checklist templates. Kept generic and editable; the visit UI
 * lets the technician mark Pass / Fail / N-A per line and raise an issue on Fail.
 */
export const CHECKLIST_TEMPLATES: ChecklistTemplate[] = [
  {
    id: 'ac-service',
    name: 'AC service',
    system: 'AC Service',
    items: [
      { id: 'ac-power', label: 'Unit powers on and switches modes (cool, fan, dry)', critical: true },
      { id: 'ac-filter', label: 'Filter removed, cleaned or replaced' },
      { id: 'ac-coil', label: 'Indoor and outdoor coils cleaned' },
      { id: 'ac-drain', label: 'Drain pan and drain line clear, water flows freely', critical: true },
      { id: 'ac-gas', label: 'Refrigerant pressure checked to spec', critical: true },
      { id: 'ac-elec', label: 'Electrical terminals tight, earthing intact' },
      { id: 'ac-fins', label: 'Outdoor fins straightened and free of debris' },
      { id: 'ac-cooling', label: 'Cooling delta-T measured and recorded' },
      { id: 'ac-remote', label: 'Remote / thermostat and display functioning' }
    ]
  },
  {
    id: 'solar-cleaning',
    name: 'Solar panel cleaning',
    system: 'Solar Panels',
    items: [
      { id: 'sol-safety', label: 'Roof access safe, harness anchored, no live work', critical: true },
      { id: 'sol-inspect', label: 'Panels inspected for cracks, hotspots and delamination' },
      { id: 'sol-clean', label: 'Surface cleaned with soft brush and clean water, no abrasives', critical: true },
      { id: 'sol-residue', label: 'No water spots or chemical residue left on glass' },
      { id: 'sol-inverter', label: 'Inverter status read and fault log checked' },
      { id: 'sol-isolator', label: 'DC/AC isolators and connectors secure' },
      { id: 'sol-cable', label: 'Cabling, trays and earthing intact' },
      { id: 'sol-output', label: 'Generation reading before vs after recorded' }
    ]
  },
  {
    id: 'fire-alarm',
    name: 'Fire alarm system',
    system: 'Fire Alarm',
    items: [
      { id: 'fa-panel', label: 'Panel healthy: no trouble / supervisory / disabled points', critical: true },
      { id: 'fa-battery', label: 'Battery voltage and charger output within range', critical: true },
      { id: 'fa-log', label: 'Event log reviewed and cleared of unresolved faults' },
      { id: 'fa-loop', label: 'Loop / zone continuity and device count matches as-built' },
      { id: 'fa-smoke', label: 'Smoke detectors cleaned and response tested (sample per zone)' },
      { id: 'fa-heat', label: 'Heat detectors tested with heat source' },
      { id: 'fa-mcp', label: 'Manual call points operated and panel annunciation verified' },
      { id: 'fa-nac', label: 'Hooters / strobes sound across all floors' },
      { id: 'fa-cause', label: 'Cause-and-effect matrix verified (AHU trip, door release, lift recall)' },
      { id: 'fa-bms', label: 'BMS / remote monitoring reporting correctly' }
    ]
  },
  {
    id: 'sprinkler',
    name: 'Sprinkler system',
    system: 'Sprinkler',
    items: [
      { id: 'sp-valve', label: 'Alarm valve open, trim and gauges intact', critical: true },
      { id: 'sp-pressure', label: 'System and suction pressure within design range', critical: true },
      { id: 'sp-gong', label: 'Water motor gong operates on test drain' },
      { id: 'sp-flow', label: 'Flow switch annunciates at panel' },
      { id: 'sp-heads', label: 'Heads clean, unpainted, correct temperature rating' },
      { id: 'sp-spare', label: 'Spare head cabinet stocked and correct type' },
      { id: 'sp-paint', label: 'No corrosion, leakage or mechanical damage on pipework' }
    ]
  },
  {
    id: 'hydrant',
    name: 'Hydrant / riser system',
    system: 'Hydrant',
    items: [
      { id: 'hy-valve', label: 'Landing valves operate freely, caps and gaskets present', critical: true },
      { id: 'hy-hose', label: 'Hoses inspected, dried, re-rolled and correctly coupled' },
      { id: 'hy-nozzle', label: 'Branch pipes and nozzles present and serviceable' },
      { id: 'hy-reel', label: 'Hose reels swing freely and hose pressurises' },
      { id: 'hy-box', label: 'Hose boxes clean, glass intact, signage legible' },
      { id: 'hy-inlet', label: 'Fire brigade inlet accessible with clear approach' },
      { id: 'hy-pressure', label: 'Riser pressure at topmost outlet verified' }
    ]
  },
  {
    id: 'pump-room',
    name: 'Pump room',
    system: 'Pump Room',
    items: [
      { id: 'pr-main', label: 'Main electric pump auto-starts on pressure drop', critical: true },
      { id: 'pr-diesel', label: 'Diesel pump cranks, runs and reaches rated pressure', critical: true },
      { id: 'pr-jockey', label: 'Jockey pump holds header pressure without cycling excessively' },
      { id: 'pr-controller', label: 'Controller in auto, indicators and alarms functional' },
      { id: 'pr-fuel', label: 'Diesel fuel level, battery charge and coolant checked' },
      { id: 'pr-valves', label: 'Suction / delivery valves correctly set and locked' },
      { id: 'pr-air', label: 'Air vessel pre-charge pressure correct' },
      { id: 'pr-housekeeping', label: 'Pump room clear, dry, lit and ventilated' }
    ]
  },
  {
    id: 'extinguishers',
    name: 'Portable extinguishers',
    system: 'Extinguishers',
    items: [
      { id: 'ex-pin', label: 'Safety pin and tamper seal intact', critical: true },
      { id: 'ex-gauge', label: 'Pressure gauge in green zone' },
      { id: 'ex-weight', label: 'Weight / CO2 charge within tolerance' },
      { id: 'ex-hose', label: 'Hose, horn and nozzle free of blockage or cracks' },
      { id: 'ex-mount', label: 'Correctly mounted, signed and accessible' },
      { id: 'ex-service', label: 'Service tag and refill due date valid' }
    ]
  },
  {
    id: 'gas-suppression',
    name: 'Clean agent suppression',
    system: 'Gas Suppression',
    items: [
      { id: 'gs-weight', label: 'Cylinder weight and pressure within tolerance', critical: true },
      { id: 'gs-actuation', label: 'Actuation circuit and solenoids supervised' },
      { id: 'gs-nozzles', label: 'Nozzles clear, caps removed, orientation correct' },
      { id: 'gs-room', label: 'Room integrity: seals, dampers, door closer functional' },
      { id: 'gs-abort', label: 'Abort switch and manual release labelled and tested' },
      { id: 'gs-warning', label: 'Warning plates, sounders and discharge indicators present' },
      { id: 'gs-signage', label: 'Cylinder bank secured, labelled and accessible' }
    ]
  }
]

export const DEFAULT_TEMPLATE_IDS = CHECKLIST_TEMPLATES.map((template) => template.id)

export function templateById(id: string): ChecklistTemplate | undefined {
  return CHECKLIST_TEMPLATES.find((template) => template.id === id)
}
