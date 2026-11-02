import { describe, expect, it } from 'vitest'
import { EMPTY_RATE_CARD, buildAmcQuote, type AmcInput, type AmcRateCard } from '@/domain/amc/engine'

const input: AmcInput = {
  facility: 'Corporate Tower A',
  contact: 'Facility Manager',
  phone: '9876543210',
  email: 'fm@example.com',
  brand: 'Notifier',
  model: 'NFS-320',
  quantities: { panel: 1, smoke: 25, heat: 5, multi: 5, duct: 2, mcp: 6 },
  integrations: ['Access Control'],
  tier: 'CMC',
  frequency: 'Quarterly',
  specialRequest: ''
}

const rates: AmcRateCard = {
  panel: 1500,
  smoke: 150,
  heat: 150,
  multi: 200,
  duct: 400,
  mcp: 120,
  visit: 2500,
  integration: 1000
}

describe('AMC engine', () => {
  it('derives the visit count from frequency', () => {
    expect(buildAmcQuote(input, rates).visits).toBe(4)
    expect(buildAmcQuote({ ...input, frequency: 'Monthly' }, rates).visits).toBe(12)
    expect(buildAmcQuote({ ...input, frequency: 'HalfYearly' }, rates).visits).toBe(2)
  })

  it('produces the eight scope lines with priced totals', () => {
    const quote = buildAmcQuote(input, rates)

    expect(quote.lines).toHaveLength(8)
    expect(quote.lines.map((line) => line.key)).toEqual([
      'panel',
      'smoke',
      'heat',
      'multi',
      'duct',
      'mcp',
      'visit',
      'integration'
    ])
    // 1500 + 3750 + 750 + 1000 + 800 + 720 + 10000 + 1000
    expect(quote.subtotal).toBe(19520)
    expect(quote.gst).toBe(3513.6)
    expect(quote.total).toBe(23033.6)
    expect(quote.unpricedCount).toBe(0)
  })

  it('keeps unpriced lines visible instead of hiding them', () => {
    const quote = buildAmcQuote(input, EMPTY_RATE_CARD)

    expect(quote.lines).toHaveLength(8)
    expect(quote.unpricedCount).toBe(8)
    expect(quote.subtotal).toBe(0)
    expect(quote.total).toBe(0)
  })

  it('omits zero-quantity equipment but keeps the visit line', () => {
    const quote = buildAmcQuote(
      { ...input, quantities: { panel: 1, smoke: 0, heat: 0, multi: 0, duct: 0, mcp: 0 }, integrations: [] },
      rates
    )

    expect(quote.lines.map((line) => line.key)).toEqual(['panel', 'visit'])
    expect(quote.subtotal).toBe(1500 + 4 * 2500)
  })
})
