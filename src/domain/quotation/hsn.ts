/** HSN map recovered from the quotation builder. */

export type HsnType =
  | 'panel'
  | 'device'
  | 'module'
  | 'card'
  | 'cable'
  | 'batt'
  | 'psu'
  | 'sprinkler'
  | 'valve'
  | 'pump'
  | 'hose'
  | 'ext'
  | 'box'
  | 'switch'
  | 'fitting'
  | 'sign'
  | 'vessel'

export const HSN: Record<HsnType, string> = {
  panel: '8531 10 90',
  device: '8531 10 90',
  module: '8537 10 00',
  card: '8537 10 00',
  cable: '8544 49 90',
  batt: '8507 20 90',
  psu: '8504 40 90',
  sprinkler: '8424 90 00',
  valve: '8481 80 90',
  pump: '8413 70 10',
  hose: '5909 00 10',
  ext: '8424 10 00',
  box: '7326 90 99',
  switch: '9032 20 00',
  fitting: '7307 99 90',
  sign: '3926 90 99',
  vessel: '7311 00 90'
}

export const TYPE_TO_HSN: Record<string, HsnType> = {
  'Control Panel': 'panel',
  'Repeater Panel': 'panel',
  'Smoke Detector': 'device',
  'Heat Detector': 'device',
  'Multi-criteria Detector': 'device',
  'Beam Detector': 'device',
  'Manual Call Point (MCP)': 'device',
  'Hooter / Sounder': 'device',
  'Response Indicator': 'device',
  'Loop Module': 'module',
  'Loop Card': 'card',
  Cable: 'cable',
  'Power Supply & Battery': 'batt',
  'Sprinkler Head': 'sprinkler',
  'Flexible Dropper': 'hose',
  'Alarm Valve Station': 'valve',
  'Flow Switch & Sensor': 'switch',
  'Hydrant Valve (Landing Valve)': 'valve',
  'Delivery Hose': 'hose',
  'Branch Pipe & Nozzle': 'sprinkler',
  'Hose Reel Drum': 'sprinkler',
  'Fire Hose Box': 'box',
  'Fire Brigade Connection': 'valve',
  'Main Electric Pump': 'pump',
  'Diesel Standby Pump': 'pump',
  'Jockey Pump': 'pump',
  'Pump Controller Panel': 'module',
  'Pump Room Valves': 'valve',
  'Air Vessel & Automation': 'vessel',
  'Pressure Switch': 'switch',
  'Clean Agent System': 'ext',
  'Fire Extinguisher': 'ext',
  'Safety Signage': 'sign',
  'Pipe & Support Clamps': 'fitting'
}

export function hsnFor(type: string): string {
  const key = TYPE_TO_HSN[type]
  return key ? HSN[key] : '8424 90 00'
}
