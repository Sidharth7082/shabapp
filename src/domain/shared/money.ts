/** Money helpers. All amounts are INR. */

export const GST_RATE = 0.18
export const QUOTE_VALIDITY_DAYS = 15

export function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100
}

/** Indian digit grouping, two decimals: 1,23,456.78 */
export function inr(n: number): string {
  return n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

export function rupees(n: number): string {
  return `\u20b9${inr(n)}`
}

export function gstSplit(subtotal: number, rate: number = GST_RATE) {
  const base = round2(subtotal)
  const gst = round2(base * rate)
  return { subtotal: base, gst, total: round2(base + gst) }
}

/**
 * The quotation catalog on shabhcreations.com stores GST-inclusive selling prices
 * and converts back to a pre-tax base rate with this exact rounding.
 */
export function baseFromInclusive(inclusive: number, rate: number = GST_RATE): number {
  return Math.round((inclusive / (1 + rate)) * 100) / 100
}
