import { baseFromInclusive, gstSplit, round2 } from '@/domain/shared/money'
import { CATALOG_BY_ID, type CatalogSku } from '@/data/catalog'
import { hsnFor } from './hsn'

export interface QuoteSelection {
  skuId: string
  qty: number
}

export interface QuoteLine {
  sku: CatalogSku
  qty: number
  baseRate: number
  hsn: string
  amount: number
  priced: boolean
}

export interface QuoteTotals {
  lines: QuoteLine[]
  subtotal: number
  gst: number
  total: number
  unpricedCount: number
}

export function maxQty(qty: number): number {
  return Math.min(9999, Math.max(1, Math.trunc(Number.isFinite(qty) ? qty : 1)))
}

/**
 * Recomputes a quotation from the catalog. Overrides are per-SKU *base* rates
 * (ex-GST), which is what the employee edits in the app.
 */
export function buildQuote(
  selections: QuoteSelection[],
  overrides: Record<string, number> = {}
): QuoteTotals {
  const lines: QuoteLine[] = []

  for (const selection of selections) {
    const sku = CATALOG_BY_ID.get(selection.skuId)
    if (!sku) continue
    const qty = maxQty(selection.qty)
    const baseRate =
      overrides[sku.id] !== undefined ? round2(overrides[sku.id]) : baseFromInclusive(sku.rateInclGst)
    lines.push({
      sku,
      qty,
      baseRate,
      hsn: hsnFor(sku.type),
      amount: round2(baseRate * qty),
      priced: baseRate > 0
    })
  }

  const subtotal = round2(lines.reduce((sum, line) => sum + line.amount, 0))
  const split = gstSplit(subtotal)

  return {
    lines,
    subtotal: split.subtotal,
    gst: split.gst,
    total: split.total,
    unpricedCount: lines.filter((line) => !line.priced).length
  }
}

export function searchCatalog(
  skus: CatalogSku[],
  term: string,
  category?: string | null,
  sub?: string | null
): CatalogSku[] {
  const q = term.trim().toLowerCase()
  return skus.filter((sku) => {
    if (category && sku.category !== category) return false
    if (sub && sku.sub !== sub) return false
    if (!q) return true
    return `${sku.category} ${sku.sub} ${sku.brand} ${sku.type} ${sku.model} ${sku.spec}`
      .toLowerCase()
      .includes(q)
  })
}
