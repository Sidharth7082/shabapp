import { useDeferredValue, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { db } from '@/db/db'
import { Button } from '@/components/ui/Button'
import { Badge, Card, EmptyState, SectionHeader } from '@/components/ui/display'
import { Select, TextInput } from '@/components/ui/fields'
import { RateInput } from '@/components/ui/RateInput'
import { toast } from '@/components/ui/toast'
import { CATALOG, CATEGORY_LIST } from '@/data/catalog'
import type { CatalogCategory } from '@/data/catalog'
import { buildQuote, searchCatalog, type QuoteSelection } from '@/domain/quotation/engine'
import { inr, rupees } from '@/domain/shared/money'
import { newId } from '@/domain/shared/id'

export function QuotationBuilder() {
  const [term, setTerm] = useState('')
  const deferredTerm = useDeferredValue(term)
  const [category, setCategory] = useState<CatalogCategory | ''>('')
  const [selections, setSelections] = useState<QuoteSelection[]>([])
  const [overrides, setOverrides] = useState<Record<string, number>>({})
  const [client, setClient] = useState('')
  const [project, setProject] = useState('')

  const matches = useMemo(
    () => searchCatalog(CATALOG, deferredTerm, category || null).slice(0, 24),
    [deferredTerm, category]
  )
  const quote = useMemo(() => buildQuote(selections, overrides), [selections, overrides])

  const add = (skuId: string) => {
    setSelections((current) => {
      const existing = current.find((row) => row.skuId === skuId)
      if (existing) {
        return current.map((row) => (row.skuId === skuId ? { ...row, qty: row.qty + 1 } : row))
      }
      return [...current, { skuId, qty: 1 }]
    })
  }

  const setQty = (skuId: string, qty: number) => {
    setSelections((current) =>
      current.map((row) =>
        row.skuId === skuId ? { ...row, qty: Math.min(9999, Math.max(1, qty || 1)) } : row
      )
    )
  }

  const save = async () => {
    if (quote.lines.length === 0) return
    await db.estimates.add({
      id: newId('est'),
      kind: 'quotation',
      title: project.trim() || client.trim() || 'Quotation',
      createdAt: new Date().toISOString(),
      payload: { selections, overrides, client, project },
      subtotal: quote.subtotal,
      gst: quote.gst,
      total: quote.total
    })
    toast('Quotation saved on this device', 'ok')
  }

  return (
    <div className="space-y-4 px-4 pb-10 pt-3">
      <div className="no-print flex items-center justify-between">
        <Link to="/estimates" className="text-sm font-semibold text-brand-600">
          ← Estimates
        </Link>
        <Badge tone="brand">GST 18%</Badge>
      </div>

      <header className="no-print">
        <h1 className="text-2xl font-extrabold tracking-tight text-ink">Quotation builder</h1>
        <p className="mt-1 text-sm text-ink-mute">
          Search the priced catalog, set quantities, and print a client-ready estimate.
        </p>
      </header>

      <Card className="no-print space-y-3 p-4">
        <TextInput label="Search equipment" value={term} onChange={(e) => setTerm(e.target.value)} placeholder="e.g. smoke detector, notifier, jockey" />
        <Select label="System section" value={category} onChange={(e) => setCategory(e.target.value as CatalogCategory | '')}>
          <option value="">All sections</option>
          {CATEGORY_LIST.map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </Select>
      </Card>

      <section className="no-print space-y-2">
        <SectionHeader title="Catalog" subtitle={`${matches.length} match(es) shown`} />
        <div className="space-y-2">
          {matches.map((sku) => (
            <Card key={sku.id} className="flex items-center justify-between gap-3 p-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-ink">{sku.model}</p>
                <p className="truncate text-[11px] text-ink-mute">
                  {sku.brand} · {sku.type} · {sku.unit}
                </p>
                <p className="mt-0.5 text-[11px] font-semibold text-brand-600">
                  {rupees(sku.rateInclGst)} incl. GST
                </p>
              </div>
              <Button size="sm" onClick={() => add(sku.id)}>
                Add
              </Button>
            </Card>
          ))}
          {matches.length === 0 && <EmptyState title="No match" body="Try a brand, model or system name." />}
        </div>
      </section>

      <section className="space-y-2">
        <SectionHeader
          title="Quotation schedule"
          subtitle={`${quote.lines.length} line(s)`}
          action={<Badge tone={quote.unpricedCount > 0 ? 'warn' : 'ok'}>{quote.unpricedCount > 0 ? 'Rates missing' : 'Priced'}</Badge>}
        />
        {quote.lines.length === 0 ? (
          <EmptyState title="Nothing added yet" body="Add equipment from the catalog to build the schedule." />
        ) : (
          <div className="overflow-x-auto rounded-xl border border-surface-line bg-white">
            <table className="w-full min-w-[620px] border-collapse text-xs">
              <thead className="bg-surface-sunken text-left text-[10px] uppercase tracking-wide text-ink-mute">
                <tr>
                  <th className="px-2.5 py-2">Item</th>
                  <th className="px-2.5 py-2">HSN</th>
                  <th className="px-2.5 py-2">Rate ₹</th>
                  <th className="px-2.5 py-2">Qty</th>
                  <th className="px-2.5 py-2">Amount ₹</th>
                  <th className="px-2.5 py-2" />
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-line">
                {quote.lines.map((line) => (
                  <tr key={line.sku.id}>
                    <td className="max-w-[220px] px-2.5 py-2">
                      <p className="font-semibold text-ink">{line.sku.model}</p>
                      <p className="text-[10px] text-ink-mute">
                        {line.sku.brand} · {line.sku.type}
                      </p>
                    </td>
                    <td className="px-2.5 py-2">{line.hsn}</td>
                    <td className="px-2.5 py-2">
                      <RateInput
                        value={line.baseRate}
                        ariaLabel={`Base rate for ${line.sku.model}`}
                        onChange={(rate) =>
                          setOverrides((current) => ({ ...current, [line.sku.id]: rate }))
                        }
                      />
                      <span className="print-only">{inr(line.baseRate)}</span>
                    </td>
                    <td className="px-2.5 py-2">
                      <RateInput
                        integer
                        className="no-print w-16 rounded border border-surface-line px-1.5 py-1 text-center"
                        ariaLabel={`Quantity for ${line.sku.model}`}
                        value={line.qty}
                        onChange={(qty) => setQty(line.sku.id, qty)}
                      />
                      <span className="print-only">
                        {line.qty} {line.sku.unit}
                      </span>
                    </td>
                    <td className="px-2.5 py-2 font-bold">{inr(line.amount)}</td>
                    <td className="no-print px-2.5 py-2">
                      <button
                        type="button"
                        aria-label="Remove line"
                        onClick={() => setSelections((current) => current.filter((row) => row.skuId !== line.sku.id))}
                        className="text-danger"
                      >
                        ×
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-surface-sunken">
                <tr>
                  <td colSpan={4} className="px-2.5 py-2 text-right font-semibold">Subtotal (ex-GST)</td>
                  <td className="px-2.5 py-2 font-bold">{inr(quote.subtotal)}</td>
                  <td />
                </tr>
                <tr>
                  <td colSpan={4} className="px-2.5 py-2 text-right font-semibold">GST 18%</td>
                  <td className="px-2.5 py-2 font-bold text-danger">{inr(quote.gst)}</td>
                  <td />
                </tr>
                <tr>
                  <td colSpan={4} className="px-2.5 py-2 text-right text-sm font-bold">Total</td>
                  <td className="px-2.5 py-2 text-sm font-extrabold text-brand-600">{rupees(quote.total)}</td>
                  <td />
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </section>

      <Card className="no-print space-y-3 p-4">
        <TextInput label="Client / enterprise" value={client} onChange={(e) => setClient(e.target.value)} />
        <TextInput label="Project / site" value={project} onChange={(e) => setProject(e.target.value)} />
        <p className="text-[11px] leading-5 text-ink-mute">
          Prices are ex-works, exclude installation and cabling, and are valid for 15 days.
        </p>
        <div className="flex gap-2">
          <Button variant="secondary" full onClick={save} disabled={quote.lines.length === 0}>
            Save
          </Button>
          <Button full onClick={() => window.print()} disabled={quote.lines.length === 0}>
            Print / PDF
          </Button>
        </div>
      </Card>

      <div className="print-only">
        <h2 className="text-lg font-bold">Shabh Creations Pvt. Ltd.</h2>
        <p className="text-xs">Fire Safety Engineering · Protection Systems · Project Supplies</p>
        <p className="mt-2 text-sm">
          Client: {client || '—'} {project ? `· Site: ${project}` : ''}
        </p>
      </div>
    </div>
  )
}
