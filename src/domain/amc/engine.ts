import { gstSplit, round2 } from '@/domain/shared/money'

export type AmcTier = 'AMC' | 'CMC'
export type AmcFrequency = 'Monthly' | 'Quarterly' | 'HalfYearly'

export const VISIT_COUNT: Record<AmcFrequency, number> = {
  Monthly: 12,
  Quarterly: 4,
  HalfYearly: 2
}

export const FREQUENCY_LABEL: Record<AmcFrequency, string> = {
  Monthly: 'Monthly (12 visits / year + priority support)',
  Quarterly: 'Quarterly (4 visits / year + emergency support)',
  HalfYearly: 'Half-yearly (2 visits / year)'
}

export const SCOPE_TEXT: Record<AmcFrequency, string> = {
  Monthly:
    '12 routine preventive maintenance visits (1 per month), continuous health check, immediate fault diagnostics, optical sensor cleaning, and priority emergency SLA response within 4 hours.',
  Quarterly:
    '4 routine preventive maintenance visits per year, complete loop/detector health testing, cleaning of smoke sensors, panel log verification, and 24/7 emergency breakdown support.',
  HalfYearly:
    '2 routine preventive maintenance visits per year (every 6 months), comprehensive system testing, battery health check, zoning checks, and standard breakdown support.'
}

export interface AmcQuantities {
  panel: number
  smoke: number
  heat: number
  multi: number
  duct: number
  mcp: number
}

export interface AmcInput {
  facility: string
  contact: string
  phone: string
  email: string
  brand: string
  model: string
  quantities: AmcQuantities
  integrations: string[]
  tier: AmcTier
  frequency: AmcFrequency
  specialRequest: string
}

export interface AmcLine {
  key: string
  description: string
  scope: string
  qty: number
  unit: string
  rate: number
  amount: number
  priced: boolean
}

export interface AmcQuote {
  lines: AmcLine[]
  visits: number
  subtotal: number
  gst: number
  total: number
  unpricedCount: number
}

/**
 * The live AMC/CMC builder on shabhcreations.com produces a scope table only —
 * no rates, no totals. Here the scope is identical and pricing comes from an
 * editable rate card. Lines with no rate stay visible and are flagged.
 */
export interface AmcRateCard {
  panel: number
  smoke: number
  heat: number
  multi: number
  duct: number
  mcp: number
  visit: number
  integration: number
}

export const EMPTY_RATE_CARD: AmcRateCard = {
  panel: 0,
  smoke: 0,
  heat: 0,
  multi: 0,
  duct: 0,
  mcp: 0,
  visit: 0,
  integration: 0
}

export function buildAmcQuote(input: AmcInput, rateCard: AmcRateCard): AmcQuote {
  const visits = VISIT_COUNT[input.frequency]
  const build = (
    key: keyof AmcRateCard,
    description: string,
    scope: string,
    qty: number,
    unit: string
  ): AmcLine | null => {
    if (qty <= 0) return null
    const rate = round2(rateCard[key] ?? 0)
    return {
      key,
      description,
      scope,
      qty,
      unit,
      rate,
      amount: round2(qty * rate),
      priced: rate > 0
    }
  }

  const candidate: Array<AmcLine | null> = [
    build('panel', `Fire alarm control panel (${input.brand} - ${input.model || 'standard'})`, 'Panel maintenance & diagnostics', input.quantities.panel, 'Nos.'),
    build('smoke', 'Optical smoke detectors', 'Testing & chamber cleaning', input.quantities.smoke, 'Nos.'),
    build('heat', 'Rate-of-rise / fixed temperature heat detectors', 'Heat sensitivity testing', input.quantities.heat, 'Nos.'),
    build('multi', 'Multi-criteria detectors', 'Optical & thermal verification', input.quantities.multi, 'Nos.'),
    build('duct', 'Duct smoke detectors', 'Sampling tube & sensor inspection', input.quantities.duct, 'Nos.'),
    build('mcp', 'Manual call points & sounders', 'Functional activation test', input.quantities.mcp, 'Nos.'),
    build('visit', `${input.tier} service schedule (${input.frequency})`, `Scheduled visits: ${visits} / year`, visits, 'Visits'),
    build(
      'integration',
      'System interfacing & integration verification',
      input.integrations.length > 0 ? input.integrations.join(', ') : 'No integrations declared',
      input.integrations.length,
      'Interfaces'
    )
  ]

  const lines = candidate.filter((line): line is AmcLine => line !== null)
  const subtotal = round2(lines.reduce((sum, line) => sum + line.amount, 0))
  const split = gstSplit(subtotal)

  return {
    lines,
    visits,
    subtotal: split.subtotal,
    gst: split.gst,
    total: split.total,
    unpricedCount: lines.filter((line) => !line.priced).length
  }
}

export const AMC_BRANDS = ['Notifier', 'EST', 'Ravel', 'Agni', 'Siemens', 'Other'] as const

export const INTEGRATION_OPTIONS = [
  'Access Control',
  'AHU / HVAC Trip',
  'Elevator Recall',
  'BMS Gateway'
] as const
