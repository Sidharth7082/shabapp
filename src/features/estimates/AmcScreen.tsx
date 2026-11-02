import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { db } from '@/db/db'
import { settingGet, settingSet } from '@/db/db'
import { Button } from '@/components/ui/Button'
import { Badge, Card, SectionHeader } from '@/components/ui/display'
import { NumberInput, Select, TextInput } from '@/components/ui/fields'
import { RateInput } from '@/components/ui/RateInput'
import { toast } from '@/components/ui/toast'
import { newId } from '@/domain/shared/id'
import { rupees, inr } from '@/domain/shared/money'
import {
  AMC_BRANDS,
  EMPTY_RATE_CARD,
  FREQUENCY_LABEL,
  INTEGRATION_OPTIONS,
  SCOPE_TEXT,
  buildAmcQuote,
  type AmcFrequency,
  type AmcRateCard,
  type AmcTier
} from '@/domain/amc/engine'

const num = (value: string): number => {
  const parsed = Number.parseFloat(value)
  return Number.isFinite(parsed) ? parsed : 0
}

const RATE_FIELDS: Array<{ key: keyof AmcRateCard; label: string }> = [
  { key: 'panel', label: 'Panel / visit' },
  { key: 'smoke', label: 'Smoke detector' },
  { key: 'heat', label: 'Heat detector' },
  { key: 'multi', label: 'Multi detector' },
  { key: 'duct', label: 'Duct detector' },
  { key: 'mcp', label: 'MCP / hooter' },
  { key: 'visit', label: 'Visit charge' },
  { key: 'integration', label: 'Integration' }
]

export function AmcScreen() {
  const [facility, setFacility] = useState('')
  const [contact, setContact] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [brand, setBrand] = useState('Notifier')
  const [model, setModel] = useState('')
  const [tier, setTier] = useState<AmcTier>('CMC')
  const [frequency, setFrequency] = useState<AmcFrequency>('Quarterly')
  const [integrations, setIntegrations] = useState<string[]>([])
  const [specialRequest, setSpecialRequest] = useState('')
  const [qty, setQty] = useState({ panel: '1', smoke: '25', heat: '5', multi: '5', duct: '2', mcp: '6' })
  const [rateCard, setRateCard] = useState<AmcRateCard>(EMPTY_RATE_CARD)
  const [ratesLoaded, setRatesLoaded] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // The rate card is company-wide, so it survives reloads and new quotes.
  useEffect(() => {
    let cancelled = false
    void settingGet<AmcRateCard>('amcRateCard', EMPTY_RATE_CARD).then((saved) => {
      if (cancelled) return
      setRateCard({ ...EMPTY_RATE_CARD, ...saved })
      setRatesLoaded(true)
    })
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (!ratesLoaded) return
    void settingSet('amcRateCard', rateCard)
  }, [rateCard, ratesLoaded])

  const quote = useMemo(
    () =>
      buildAmcQuote(
        {
          facility,
          contact,
          phone,
          email,
          brand: brand === 'Other' ? 'Custom brand' : brand,
          model,
          quantities: {
            panel: num(qty.panel),
            smoke: num(qty.smoke),
            heat: num(qty.heat),
            multi: num(qty.multi),
            duct: num(qty.duct),
            mcp: num(qty.mcp)
          },
          integrations,
          tier,
          frequency,
          specialRequest
        },
        rateCard
      ),
    [facility, contact, phone, email, brand, model, qty, integrations, tier, frequency, specialRequest, rateCard]
  )

  const save = async () => {
    if (!facility.trim()) {
      setError('Enter the facility name first.')
      return
    }
    await db.estimates.add({
      id: newId('est'),
      kind: 'amc',
      title: `AMC · ${facility.trim()}`,
      createdAt: new Date().toISOString(),
      payload: { facility, contact, phone, email, brand, model, tier, frequency, integrations, qty, rateCard },
      subtotal: quote.subtotal,
      gst: quote.gst,
      total: quote.total
    })
    setError(null)
    toast('AMC quote saved on this device', 'ok')
  }

  return (
    <div className="space-y-4 px-4 pb-10 pt-3">
      <div className="no-print flex items-center justify-between">
        <Link to="/estimates" className="text-sm font-semibold text-brand-600">
          ← Estimates
        </Link>
        <Badge tone="warn">Rate card needed</Badge>
      </div>

      <header className="no-print">
        <h1 className="text-2xl font-extrabold tracking-tight text-ink">AMC / CMC quote</h1>
        <p className="mt-1 text-sm text-ink-mute">
          The scope is generated automatically. Enter your rate card once and hit totals every time.
        </p>
      </header>

      <Card className="no-print space-y-3 p-4">
        <TextInput label="Facility / project" value={facility} onChange={(e) => setFacility(e.target.value)} placeholder="e.g. Corporate Tower A" />
        <div className="grid grid-cols-2 gap-3">
          <TextInput label="Contact person" value={contact} onChange={(e) => setContact(e.target.value)} />
          <TextInput label="Phone" inputMode="numeric" value={phone} onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))} />
        </div>
        <TextInput label="Client email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        <div className="grid grid-cols-2 gap-3">
          <Select label="Brand" value={brand} onChange={(e) => setBrand(e.target.value)}>
            {AMC_BRANDS.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </Select>
          <TextInput label="Panel model" value={model} onChange={(e) => setModel(e.target.value)} placeholder="e.g. NFS-320" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Select label="Contract" value={tier} onChange={(e) => setTier(e.target.value as AmcTier)}>
            <option value="AMC">AMC (labour & testing)</option>
            <option value="CMC">CMC (includes spares)</option>
          </Select>
          <Select label="Frequency" value={frequency} onChange={(e) => setFrequency(e.target.value as AmcFrequency)}>
            {(Object.keys(FREQUENCY_LABEL) as AmcFrequency[]).map((key) => (
              <option key={key} value={key}>
                {FREQUENCY_LABEL[key]}
              </option>
            ))}
          </Select>
        </div>
        <p className="rounded-lg bg-brand-50 px-3 py-2 text-[11px] leading-5 text-brand-700">{SCOPE_TEXT[frequency]}</p>
      </Card>

      <Card className="no-print space-y-3 p-4">
        <SectionHeader title="Equipment inventory" subtitle="Quantities drive the scope lines" />
        <div className="grid grid-cols-3 gap-2">
          <NumberInput label="Panels" value={qty.panel} onChange={(e) => setQty({ ...qty, panel: e.target.value })} />
          <NumberInput label="Smoke" value={qty.smoke} onChange={(e) => setQty({ ...qty, smoke: e.target.value })} />
          <NumberInput label="Heat" value={qty.heat} onChange={(e) => setQty({ ...qty, heat: e.target.value })} />
          <NumberInput label="Multi" value={qty.multi} onChange={(e) => setQty({ ...qty, multi: e.target.value })} />
          <NumberInput label="Duct" value={qty.duct} onChange={(e) => setQty({ ...qty, duct: e.target.value })} />
          <NumberInput label="MCP/hooter" value={qty.mcp} onChange={(e) => setQty({ ...qty, mcp: e.target.value })} />
        </div>
        <div>
          <p className="mb-1.5 text-sm font-semibold text-ink">Integrations present</p>
          <div className="grid grid-cols-2 gap-1.5">
            {INTEGRATION_OPTIONS.map((option) => (
              <label key={option} className="flex items-center gap-2 rounded-lg border border-surface-line px-2.5 py-2 text-xs font-semibold">
                <input
                  type="checkbox"
                  checked={integrations.includes(option)}
                  onChange={(e) =>
                    setIntegrations((current) =>
                      e.target.checked ? [...current, option] : current.filter((item) => item !== option)
                    )
                  }
                />
                {option}
              </label>
            ))}
          </div>
        </div>
        <TextInput label="Special requirements" value={specialRequest} onChange={(e) => setSpecialRequest(e.target.value)} placeholder="Site constraints, statutory checks" />
      </Card>

      <Card className="no-print space-y-3 p-4">
        <SectionHeader
          title="Rate card"
          subtitle="The published site has no AMC rates — set them once here"
          action={<Badge tone={quote.unpricedCount > 0 ? 'warn' : 'ok'}>{quote.unpricedCount > 0 ? 'Incomplete' : 'Ready'}</Badge>}
        />
        <div className="grid grid-cols-2 gap-2">
          {RATE_FIELDS.map((field) => (
            <NumberInput
              key={field.key}
              label={field.label}
              suffix="₹"
              value={rateCard[field.key] ? String(rateCard[field.key]) : ''}
              onChange={(e) => setRateCard({ ...rateCard, [field.key]: num(e.target.value) })}
            />
          ))}
        </div>
      </Card>

      <section>
        <SectionHeader
          title="Maintenance proposal"
          subtitle={`${quote.visits} scheduled visit(s) per year · ${tier}`}
          action={<Badge tone="brand">{quote.lines.length} lines</Badge>}
        />
        <div className="overflow-x-auto rounded-xl border border-surface-line bg-white">
          <table className="w-full min-w-[560px] border-collapse text-xs">
            <thead className="bg-brand-700 text-left text-[10px] uppercase tracking-wide text-white">
              <tr>
                <th className="px-2.5 py-2">Equipment / component</th>
                <th className="px-2.5 py-2">Service scope</th>
                <th className="px-2.5 py-2">Qty</th>
                <th className="px-2.5 py-2">Rate ₹</th>
                <th className="px-2.5 py-2">Amount ₹</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-line">
              {quote.lines.map((line) => (
                <tr key={line.key}>
                  <td className="px-2.5 py-2 font-semibold text-ink">{line.description}</td>
                  <td className="px-2.5 py-2 text-ink-soft">{line.scope}</td>
                  <td className="px-2.5 py-2">
                    {line.qty} {line.unit}
                  </td>
                  <td className="px-2.5 py-2">
                    <RateInput
                      value={line.rate}
                      ariaLabel={`Rate for ${line.description}`}
                      onChange={(rate) =>
                        setRateCard({ ...rateCard, [line.key as keyof AmcRateCard]: rate })
                      }
                    />
                    <span className="print-only">{inr(line.rate)}</span>
                  </td>
                  <td className="px-2.5 py-2 font-bold text-brand-600">{line.amount > 0 ? inr(line.amount) : '—'}</td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-surface-sunken">
              <tr>
                <td colSpan={4} className="px-2.5 py-2 text-right font-semibold">Subtotal</td>
                <td className="px-2.5 py-2 font-bold">{rupees(quote.subtotal)}</td>
              </tr>
              <tr>
                <td colSpan={4} className="px-2.5 py-2 text-right font-semibold">GST 18%</td>
                <td className="px-2.5 py-2 font-bold text-danger">{rupees(quote.gst)}</td>
              </tr>
              <tr>
                <td colSpan={4} className="px-2.5 py-2 text-right text-sm font-bold">Total</td>
                <td className="px-2.5 py-2 text-sm font-extrabold text-brand-600">{rupees(quote.total)}</td>
              </tr>
            </tfoot>
          </table>
        </div>

        {quote.unpricedCount > 0 && (
          <p className="mt-2 rounded-lg bg-warn-soft px-3 py-2 text-xs font-semibold text-warn">
            {quote.unpricedCount} line(s) still have no rate. Totals exclude them.
          </p>
        )}

        <div className="no-print mt-3 flex gap-2">
          <Button variant="secondary" full onClick={save}>
            Save quote
          </Button>
          <Button full onClick={() => window.print()}>
            Print / PDF
          </Button>
        </div>
        {error && <p className="mt-2 text-xs font-semibold text-danger">{error}</p>}
      </section>
    </div>
  )
}
