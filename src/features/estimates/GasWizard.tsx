import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { db } from '@/db/db'
import { Button } from '@/components/ui/Button'
import { Badge, Card, EmptyState, SectionHeader } from '@/components/ui/display'
import { NumberInput, Select, TextInput } from '@/components/ui/fields'
import { RateInput } from '@/components/ui/RateInput'
import { toast } from '@/components/ui/toast'
import { AGENTS, BRAND_LABELS, CYLINDERS, HAZARD_LABELS, NOZZLE_LABELS } from '@/domain/gas/config'
import type { AgentKey, GasBrand, HazardClass, NozzleKey, Pressure } from '@/domain/gas/config'
import { buildGasBoq, computeZone, type GasZoneInput } from '@/domain/gas/engine'
import { rupees, inr } from '@/domain/shared/money'
import { newId } from '@/domain/shared/id'
import type { LengthUnit } from '@/domain/shared/units'

const num = (value: string): number => {
  const parsed = Number.parseFloat(value)
  return Number.isFinite(parsed) ? parsed : 0
}

export function GasWizard() {
  const [project, setProject] = useState('')
  const [agent, setAgent] = useState<AgentKey>('NOVEC')
  const [pressure, setPressure] = useState<Pressure>('25')
  const [brand, setBrand] = useState<GasBrand>('ANSUL')
  const [unit, setUnit] = useState<LengthUnit>('m')

  const [zoneName, setZoneName] = useState('')
  const [main, setMain] = useState({ l: '', w: '', h: '' })
  const [ceiling, setCeiling] = useState({ l: '', w: '', h: '' })
  const [floor, setFloor] = useState({ l: '', w: '', h: '' })
  const [sameCeiling, setSameCeiling] = useState(false)
  const [sameFloor, setSameFloor] = useState(false)
  const [hazard, setHazard] = useState<HazardClass>('C')
  const [nozzle, setNozzle] = useState<NozzleKey>('95')
  const [pipeRun, setPipeRun] = useState('0')

  const [zones, setZones] = useState<GasZoneInput[]>([])
  const [overrides, setOverrides] = useState<Record<string, number>>({})
  const [error, setError] = useState<string | null>(null)

  const options = useMemo(() => ({ agent, pressure, brand, unit }), [agent, pressure, brand, unit])
  const results = useMemo(() => zones.map((zone) => computeZone(zone, options)), [zones, options])
  const boq = useMemo(() => buildGasBoq(results, options, overrides), [results, options, overrides])

  const totalStored = results.reduce((sum, zone) => sum + zone.storedKg, 0)

  const addZone = () => {
    if (num(main.l) <= 0 || num(main.w) <= 0 || num(main.h) <= 0) {
      setError('Enter the main room length, width and height.')
      return
    }
    const zone: GasZoneInput = {
      id: newId('zone'),
      name: zoneName.trim() || `Zone ${zones.length + 1}`,
      main: { l: num(main.l), w: num(main.w), h: num(main.h) },
      ceiling: {
        l: sameCeiling ? num(main.l) : num(ceiling.l),
        w: sameCeiling ? num(main.w) : num(ceiling.w),
        h: sameCeiling ? num(ceiling.h) : num(ceiling.h)
      },
      floor: {
        l: sameFloor ? num(main.l) : num(floor.l),
        w: sameFloor ? num(main.w) : num(floor.w),
        h: sameFloor ? num(floor.h) : num(floor.h)
      },
      hazard,
      nozzle,
      pipeRunM: num(pipeRun)
    }
    setZones((current) => [...current, zone])
    setZoneName('')
    setMain({ l: '', w: '', h: '' })
    setCeiling({ l: '', w: '', h: '' })
    setFloor({ l: '', w: '', h: '' })
    setSameCeiling(false)
    setSameFloor(false)
    setPipeRun('0')
    setError(null)
  }

  const save = async () => {
    if (zones.length === 0) return
    await db.estimates.add({
      id: newId('est'),
      kind: 'gas',
      title: project.trim() || `Gas BOQ ${new Date().toLocaleDateString('en-IN')}`,
      createdAt: new Date().toISOString(),
      payload: { options, zones, overrides },
      subtotal: boq.subtotal,
      gst: boq.gst,
      total: boq.total
    })
    toast('Estimate saved on this device', 'ok')
  }

  return (
    <div className="space-y-4 px-4 pb-10 pt-3">
      <div className="no-print flex items-center justify-between">
        <Link to="/estimates" className="text-sm font-semibold text-brand-600">
          ← Estimates
        </Link>
        <Badge tone="neutral">NFPA 2001 basis</Badge>
      </div>

      <header className="no-print">
        <h1 className="text-2xl font-extrabold tracking-tight text-ink">Gas suppression BOQ</h1>
        <p className="mt-1 text-sm text-ink-mute">
          Clean agent sizing, cylinders, nozzles and hardware for one or many zones.
        </p>
      </header>

      <Card className="no-print space-y-3 p-4">
        <TextInput label="Project name" value={project} onChange={(e) => setProject(e.target.value)} placeholder="e.g. Data Centre Alpha" />
        <div className="grid grid-cols-2 gap-3">
          <Select label="Agent" value={agent} onChange={(e) => setAgent(e.target.value as AgentKey)}>
            {Object.values(AGENTS).map((item) => (
              <option key={item.key} value={item.key}>
                {item.name}
              </option>
            ))}
          </Select>
          <Select label="Pressure" value={pressure} onChange={(e) => setPressure(e.target.value as Pressure)}>
            <option value="25">25 bar</option>
            <option value="42">42 bar</option>
          </Select>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Select label="Cylinder brand" value={brand} onChange={(e) => setBrand(e.target.value as GasBrand)}>
            {(Object.keys(CYLINDERS) as GasBrand[]).map((key) => (
              <option key={key} value={key}>
                {BRAND_LABELS[key]}
              </option>
            ))}
          </Select>
          <Select label="Units" value={unit} onChange={(e) => setUnit(e.target.value as LengthUnit)}>
            <option value="m">Metres</option>
            <option value="ft">Feet</option>
            <option value="mm">Millimetres</option>
          </Select>
        </div>
      </Card>

      <Card className="no-print space-y-3 p-4">
        <SectionHeader title="Add a protected zone" subtitle="Main room plus optional ceiling and floor voids" />
        <TextInput label="Zone / room name" value={zoneName} onChange={(e) => setZoneName(e.target.value)} placeholder="e.g. Server Room 1" />

        <div className="space-y-2">
          <p className="text-xs font-bold uppercase tracking-wide text-ink-mute">Main room</p>
          <div className="grid grid-cols-3 gap-2">
            <NumberInput label="Length" value={main.l} onChange={(e) => setMain({ ...main, l: e.target.value })} />
            <NumberInput label="Width" value={main.w} onChange={(e) => setMain({ ...main, w: e.target.value })} />
            <NumberInput label="Height" value={main.h} onChange={(e) => setMain({ ...main, h: e.target.value })} />
          </div>
        </div>

        <div className="space-y-2 rounded-xl bg-surface-sunken p-2.5">
          <label className="flex items-center gap-2 text-xs font-semibold text-ink">
            <input type="checkbox" checked={sameCeiling} onChange={(e) => setSameCeiling(e.target.checked)} />
            Ceiling void — same footprint as main room
          </label>
          <div className="grid grid-cols-3 gap-2">
            <NumberInput label="L" value={sameCeiling ? main.l : ceiling.l} disabled={sameCeiling} onChange={(e) => setCeiling({ ...ceiling, l: e.target.value })} />
            <NumberInput label="W" value={sameCeiling ? main.w : ceiling.w} disabled={sameCeiling} onChange={(e) => setCeiling({ ...ceiling, w: e.target.value })} />
            <NumberInput label="Void H" value={ceiling.h} onChange={(e) => setCeiling({ ...ceiling, h: e.target.value })} />
          </div>
        </div>

        <div className="space-y-2 rounded-xl bg-surface-sunken p-2.5">
          <label className="flex items-center gap-2 text-xs font-semibold text-ink">
            <input type="checkbox" checked={sameFloor} onChange={(e) => setSameFloor(e.target.checked)} />
            Floor void — same footprint as main room
          </label>
          <div className="grid grid-cols-3 gap-2">
            <NumberInput label="L" value={sameFloor ? main.l : floor.l} disabled={sameFloor} onChange={(e) => setFloor({ ...floor, l: e.target.value })} />
            <NumberInput label="W" value={sameFloor ? main.w : floor.w} disabled={sameFloor} onChange={(e) => setFloor({ ...floor, w: e.target.value })} />
            <NumberInput label="Void H" value={floor.h} onChange={(e) => setFloor({ ...floor, h: e.target.value })} />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Select label="Hazard class" value={hazard} onChange={(e) => setHazard(e.target.value as HazardClass)}>
            {(Object.keys(HAZARD_LABELS) as HazardClass[]).map((key) => (
              <option key={key} value={key}>
                {HAZARD_LABELS[key]}
              </option>
            ))}
          </Select>
          <Select label="Nozzle coverage" value={nozzle} onChange={(e) => setNozzle(e.target.value as NozzleKey)}>
            {(Object.keys(NOZZLE_LABELS) as NozzleKey[]).map((key) => (
              <option key={key} value={key}>
                {NOZZLE_LABELS[key]}
              </option>
            ))}
          </Select>
        </div>
        <NumberInput label="Pipe run to cylinder bank" suffix="m" value={pipeRun} onChange={(e) => setPipeRun(e.target.value)} hint="Adds a hydraulic allowance to the stored gas weight." />

        <Button full onClick={addZone}>
          + Add zone & calculate
        </Button>
        {error && <p className="text-xs font-semibold text-danger">{error}</p>}
      </Card>

      {results.length === 0 ? (
        <div className="no-print">
          <EmptyState title="No zones yet" body="Add the first room to see agent weight, cylinder selection and hardware." />
        </div>
      ) : (
        <>
          <section className="space-y-2">
            <SectionHeader
              title="Design schedule"
              subtitle={`${AGENTS[agent].shortName} · ${pressure} bar · design concentration per hazard`}
              action={<Badge tone="brand">{zones.length} zone(s)</Badge>}
            />
            <div className="overflow-x-auto rounded-xl border border-surface-line bg-white">
              <table className="w-full min-w-[640px] border-collapse text-xs">
                <thead className="bg-surface-sunken text-left text-[10px] uppercase tracking-wide text-ink-mute">
                  <tr>
                    <th className="px-2.5 py-2">Zone</th>
                    <th className="px-2.5 py-2">Volume m³</th>
                    <th className="px-2.5 py-2">Actual kg</th>
                    <th className="px-2.5 py-2">Stored kg</th>
                    <th className="px-2.5 py-2">Cylinder</th>
                    <th className="px-2.5 py-2">Fill kg/L</th>
                    <th className="px-2.5 py-2">Nozzles</th>
                    <th className="px-2.5 py-2">Detectors</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-line">
                  {results.map((zone) => (
                    <tr key={zone.input.id}>
                      <td className="px-2.5 py-2 font-semibold text-ink">{zone.input.name}</td>
                      <td className="px-2.5 py-2">{Math.ceil(zone.totalVolumeM3)}</td>
                      <td className="px-2.5 py-2">{zone.actualKg.toFixed(2)}</td>
                      <td className="px-2.5 py-2 font-bold">{zone.storedKg.toFixed(1)}</td>
                      <td className="px-2.5 py-2">{zone.cylinderCount} × {zone.cylinderSizeL} L</td>
                      <td className="px-2.5 py-2">{zone.fillDensity.toFixed(2)}</td>
                      <td className="px-2.5 py-2">{zone.totalNozzles}</td>
                      <td className="px-2.5 py-2">{zone.detectors}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {zones.map((zone) => (
                <button
                  key={zone.id}
                  type="button"
                  className="no-print rounded-lg border border-surface-line bg-white px-2.5 py-1.5 text-[11px] font-semibold text-danger"
                  onClick={() => setZones((current) => current.filter((item) => item.id !== zone.id))}
                >
                  Remove {zone.name}
                </button>
              ))}
            </div>
          </section>

          <section className="space-y-2">
            <SectionHeader title="Master bill of quantities" subtitle={`${totalStored.toFixed(1)} kg stored across ${results.reduce((sum, z) => sum + z.cylinderCount, 0)} cylinder(s)`} />
            <div className="overflow-x-auto rounded-xl border border-surface-line bg-white">
              <table className="w-full min-w-[560px] border-collapse text-xs">
                <thead className="bg-brand-700 text-left text-[10px] uppercase tracking-wide text-white">
                  <tr>
                    <th className="px-2.5 py-2">#</th>
                    <th className="px-2.5 py-2">Description</th>
                    <th className="px-2.5 py-2">Qty</th>
                    <th className="px-2.5 py-2">Unit</th>
                    <th className="px-2.5 py-2">Rate ₹</th>
                    <th className="px-2.5 py-2">Amount ₹</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-line">
                  {boq.lines.map((line, index) => (
                    <tr key={line.id}>
                      <td className="px-2.5 py-2">{index + 1}</td>
                      <td className="max-w-[240px] px-2.5 py-2">
                        <p className="font-semibold text-ink">{line.description}</p>
                        {!line.priced && (
                          <span className="text-[10px] font-bold uppercase text-warn">Rate required</span>
                        )}
                      </td>
                      <td className="px-2.5 py-2 font-semibold">{line.qty}</td>
                      <td className="px-2.5 py-2">{line.unit}</td>
                      <td className="px-2.5 py-2">
                        <RateInput
                          value={line.rate}
                          ariaLabel={`Rate for ${line.description}`}
                          onChange={(rate) =>
                            setOverrides((current) => ({ ...current, [line.id]: rate }))
                          }
                        />
                        <span className="print-only">{inr(line.rate)}</span>
                      </td>
                      <td className="px-2.5 py-2 font-bold text-brand-600">{line.amount > 0 ? inr(line.amount) : '—'}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-surface-sunken text-xs">
                  <tr>
                    <td colSpan={5} className="px-2.5 py-2 text-right font-semibold">Subtotal</td>
                    <td className="px-2.5 py-2 font-bold">{rupees(boq.subtotal)}</td>
                  </tr>
                  <tr>
                    <td colSpan={5} className="px-2.5 py-2 text-right font-semibold">GST 18%</td>
                    <td className="px-2.5 py-2 font-bold text-danger">{rupees(boq.gst)}</td>
                  </tr>
                  <tr>
                    <td colSpan={5} className="px-2.5 py-2 text-right text-sm font-bold">Total estimate</td>
                    <td className="px-2.5 py-2 text-sm font-extrabold text-brand-600">{rupees(boq.total)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {boq.unpricedCount > 0 && (
              <p className="rounded-lg bg-warn-soft px-3 py-2 text-xs font-semibold text-warn">
                {boq.unpricedCount} line(s) have no rate for {BRAND_LABELS[brand]}. Enter a rate above before
                sharing this BOQ.
              </p>
            )}

            <p className="rounded-lg bg-warn-soft px-3 py-2 text-[11px] leading-5 text-warn">
              Rough estimation only. Final hydraulic calculations, nozzle placement and compliance checks require a
              certified engineer and a site visit.
            </p>

            <div className="no-print flex gap-2">
              <Button variant="secondary" full onClick={save}>
                Save estimate
              </Button>
              <Button full onClick={() => window.print()}>
                Print / PDF
              </Button>
            </div>
          </section>
        </>
      )}
    </div>
  )
}
