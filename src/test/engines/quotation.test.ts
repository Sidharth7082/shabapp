import { describe, expect, it } from 'vitest'
import { buildQuote, searchCatalog } from '@/domain/quotation/engine'
import { CATALOG } from '@/data/catalog'

const idOf = (model: string) => {
  const sku = CATALOG.find((item) => item.model.includes(model))
  if (!sku) throw new Error(`missing catalog model ${model}`)
  return sku.id
}

describe('quotation engine', () => {
  it('converts GST-inclusive catalog prices to a pre-tax base rate', () => {
    const quote = buildQuote([{ skuId: idOf('FSP-851 Photoelectric'), qty: 10 }])

    expect(quote.lines[0].baseRate).toBe(3411.02)
    expect(quote.lines[0].hsn).toBe('8531 10 90')
    expect(quote.lines[0].amount).toBe(34110.2)
  })

  it('totals the three-line sample to the paisa', () => {
    const quote = buildQuote([
      { skuId: idOf('FSP-851 Photoelectric'), qty: 10 },
      { skuId: idOf('2 Core 1.5 sq mm Armoured FRLS Copper'), qty: 100 },
      { skuId: idOf('Exide 12V 12Ah SMF Battery'), qty: 2 }
    ])

    expect(quote.subtotal).toBe(68169.7)
    expect(quote.gst).toBe(12270.55)
    expect(quote.total).toBe(80440.25)
    expect(quote.unpricedCount).toBe(0)
  })

  it('honours a per-SKU base rate override', () => {
    const skuId = idOf('FSP-851 Photoelectric')
    const quote = buildQuote([{ skuId, qty: 2 }], { [skuId]: 3000 })

    expect(quote.lines[0].baseRate).toBe(3000)
    expect(quote.lines[0].amount).toBe(6000)
    expect(quote.subtotal).toBe(6000)
    expect(quote.total).toBe(7080)
  })

  it('clamps quantities to 1..9999', () => {
    const skuId = idOf('FSP-851 Photoelectric')
    expect(buildQuote([{ skuId, qty: 0 }]).lines[0].qty).toBe(1)
    expect(buildQuote([{ skuId, qty: 999999 }]).lines[0].qty).toBe(9999)
  })

  it('searches across brand, type and description', () => {
    expect(searchCatalog(CATALOG, 'notifier').length).toBeGreaterThan(5)
    const jockey = searchCatalog(CATALOG, 'jockey')
    expect(jockey.length).toBeGreaterThan(1)
    expect(
      jockey.every((sku) => `${sku.model} ${sku.sub}`.toLowerCase().includes('jockey'))
    ).toBe(true)
    expect(searchCatalog(CATALOG, '', 'Pump Room').every((sku) => sku.category === 'Pump Room')).toBe(true)
    expect(searchCatalog(CATALOG, 'zzzz-no-match')).toHaveLength(0)
  })

  it('ships the full recovered catalog with unique ids', () => {
    expect(CATALOG.length).toBeGreaterThanOrEqual(90)
    expect(new Set(CATALOG.map((sku) => sku.id)).size).toBe(CATALOG.length)
  })
})
