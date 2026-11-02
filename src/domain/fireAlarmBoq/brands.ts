import type { FaBrand } from './types'

export interface BrandParts {
  smoke: string
  heat: string
  multi: string
  mcp: string
  monitor: string
  relay: string
  control: string
  isolator: string
}

export const BRAND_PARTS: Record<FaBrand, BrandParts> = {
  'Notifier by Honeywell': {
    smoke: 'FSP-951 Optical',
    heat: 'FST-951 Heat',
    multi: 'FAPT-851 Acclimate Plus',
    mcp: 'NBG-12LX Addressable MCP',
    monitor: 'FMM-1 Monitor',
    relay: 'FRM-1 Relay',
    control: 'FCM-1 Control',
    isolator: 'ISO-6 Isolator Module'
  },
  'EST (Edwards)': {
    smoke: 'SIGA-OSD Optical',
    heat: 'SIGA-HFD Heat',
    multi: 'SIGA2-PT Multi',
    mcp: 'SIGA-278 MCP',
    monitor: 'SIGA-CT1 Monitor',
    relay: 'SIGA-CR Relay',
    control: 'SIGA-CC1 Control',
    isolator: 'SIGA-IM Isolator'
  },
  'Morley IAS': {
    smoke: 'HM-PSE-SMK',
    heat: 'HM-RHSE',
    multi: 'HM-PSE-SMK Multi',
    mcp: 'MI-MCP',
    monitor: 'MI-MM3E',
    relay: 'MI-D2ICMO',
    control: 'MI-DCMO',
    isolator: 'MI-ISO'
  },
  Hochiki: {
    smoke: 'ALN-V',
    heat: 'ATJ-EA',
    multi: 'ACC-EN Multi',
    mcp: 'DCP-AMS',
    monitor: 'FRCME',
    relay: 'R2ML',
    control: 'SOM',
    isolator: 'DCP-CZM Isolator'
  },
  'Siemens (Cerberus/Desigo)': {
    smoke: 'OP921 / OOH941',
    heat: 'HI921',
    multi: 'OOH941 Multi',
    mcp: 'HMS-S',
    monitor: 'HTRI-S',
    relay: 'HTRI-R',
    control: 'HCP',
    isolator: 'FLI-B Isolator'
  },
  'Simplex (4000/4100ES)': {
    smoke: '4098-9714 TrueAlarm',
    heat: '4098-9733',
    multi: '4098-9754 Multi',
    mcp: '4099-9001',
    monitor: '4090-9001 IAM',
    relay: '4090-9002 Relay IAM',
    control: '4090-9007 Signal IAM',
    isolator: '4090-9051 Isolator'
  },
  Agni: {
    smoke: 'Agni Conventional Smoke',
    heat: 'Agni Conventional Heat',
    multi: 'Agni Multi Detector',
    mcp: 'Agni Resettable MCP',
    monitor: 'Conventional interface',
    relay: 'Conventional relay',
    control: 'Conventional control',
    isolator: 'Not required (conventional)'
  },
  Ravel: {
    smoke: 'RE-316S Optical',
    heat: 'Ravel Conventional Heat',
    multi: 'Ravel Multi Detector',
    mcp: 'Ravel MCP',
    monitor: 'Conventional interface',
    relay: 'Conventional relay',
    control: 'Conventional control',
    isolator: 'Not required (conventional)'
  },
  'System Sensor': {
    smoke: 'System Sensor Conventional Smoke',
    heat: 'System Sensor Conventional Heat',
    multi: 'System Sensor Multi Detector',
    mcp: 'System Sensor MCP',
    monitor: 'Conventional interface',
    relay: 'Conventional relay',
    control: 'Conventional control',
    isolator: 'Not required (conventional)'
  }
}

/** Node thresholds recovered from the site's panel sizing logic. */
export function panelModelFor(brand: FaBrand, totalNodes: number): string {
  switch (brand) {
    case 'Notifier by Honeywell':
      return totalNodes > 318 ? 'NFS2-640 (expanded loop / networked)' : 'NFS-320 (single loop)'
    case 'EST (Edwards)':
      return totalNodes > 250 ? 'EST3X networked panel' : 'iO1000 intelligent panel'
    case 'Morley IAS':
      return totalNodes > 198 ? 'DXc2 (two loop)' : 'DXc1 (single loop)'
    case 'Hochiki':
      return 'FireNET L@titude panel'
    case 'Siemens (Cerberus/Desigo)':
      return 'Cerberus PRO / Desigo fire safety'
    case 'Simplex (4000/4100ES)':
      return totalNodes > 250 ? '4100ES network panel' : '4007ES hybrid panel'
    case 'Agni':
      return 'Agni conventional panel (zone count per layout)'
    case 'Ravel':
      return 'Ravel conventional panel (zone count per layout)'
    case 'System Sensor':
      return 'System Sensor conventional panel (zone count per layout)'
  }
}
