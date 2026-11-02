import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { db } from '@/db/db'
import { Button } from '@/components/ui/Button'
import { Badge, Card, EmptyState, SectionHeader } from '@/components/ui/display'
import { NumberInput, Select, TextInput } from '@/components/ui/fields'
import { toast } from '@/components/ui/toast'
import { newId } from '@/domain/shared/id'
import { ADDRESSABLE_BRANDS, CONVENTIONAL_BRANDS, HAZARD_LABELS } from '@/domain/fireAlarmBoq/types'
import type {
  ExpansionBuffer,
  FaBrand,
  FaConfig,
  FaHazard,
  FaRoomInput,
  FaSystem
} from '@/domain/fireAlarmBoq/types'
import { computeFaBoq } from '@/domain/fireAlarmBoq/engine'

const num = (value: string): number => {
  const parsed = Number.parseFloat(value)
  return Number.isFinite(parsed) ? parsed : 0
}

export function FireAlarmBoqScreen() {
  const [system, setSystem] = useState<FaSystem>('Addressable')
  const [brand, setBrand] = useState<FaBrand>('Notifier by Honeywell')
  const [unit, setUnit] = useState<'m' | 'ft' | 'mm'>('m')
  const [exits, setExits] = useState('2')
  const [expansion, setExpansion] = useState<ExpansionBuffer>(1.3)
  const [audio, setAudio] = useState<'Hooter' | 'Hooter + Strobe'>('Hooter')
  const [integrations, setIntegrations] = useState({
    ahu: '0',
    access: '0',
    flow: '0',
    pump: '0',
    elec: '0',
    repeater: '0',
    bms: false
  })
  const [rooms, setRooms] = useState<FaRoomInput[]>([])
  const [name, setName] = useState('')
  const [hazard, setHazard] = useState<FaHazard>('Office')
  const [dims, setDims] = useState({ l: '', w: '', h: '' })
  const [distance, setDistance] = useState('10')
  const [voids, setVoids] = useState({ ceiling: '0', floor: '0' })
  const [hasMcp, setHasMcp] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const brands = system === 'Addressable' ? ADDRESSABLE_BRANDS : CONVENTIONAL_BRANDS

  const config: FaConfig = useMemo(
    () => ({
      system,
      brand,
      unit,
      exits: num(exits),
      expansion,
      audio,
      integrations: {
        ahu: num(integrations.ahu),
        access: num(integrations.access),
        flow: num(integrations.flow),
        pump: num(integrations.pump),
        elec: num(integrations.elec),
        repeater: num(integrations.repeater),
        bms: integrations.bms
      }
    }),
    [system, brand, unit, exits, expansion, audio, integrations]
  )

  const result = useMemo(() => computeFaBoq(config, rooms), [config, rooms])

  const changeSystem = (next: FaSystem) => {
    setSystem(next)
    const nextBrands = next === 'Addressable' ? ADDRESSABLE_BRANDS : CONVENTIONAL_BRANDS
    if (!nextBrands.includes(brand as never)) setBrand(nextBrands[0])
  }

  const addRoom = () => {
    if (num(dims.l) <= 0 || num(dims.w) <= 0 || num(dims.h) <= 0) {
      setError('Enter room length, width and height.')
      return
    }
    setRooms((current) => [
      ...current,
      {
        id: newId('room'),
        name: name.trim() || `Room ${current.length + 1}`,
        hazard,
        l: num(dims.l),
        w: num(dims.w),
        h: num(dims.h),
        distanceToPanel: num(distance),
        ceilingVoid: num(voids.ceiling),
        floorVoid: num(voids.floor),
        hasMcp
      }
    ])
    setName('')
    setDims({ l: '', w: '', h: '' })
    setHasMcp(false)
    setError(null)
  }

  const save = async () => {
    if (rooms.length === 0) return
    await db.estimates.add({
      id: newId('est'),
      kind: 'fire-alarm-boq',
      title: `Fire alarm BOQ · ${rooms.length} room(s)`,
      createdAt: new Date().toISOString(),
      payload: { config, rooms, rollup: result.rollup },
      subtotal: 0,
      gst: 0,
      total: 0
    })
    toast('BOQ saved (quantities only)', 'ok')
  }

  return (
    <div className="space-y-4 px-4 pb-10 pt-3">
      <div className="no-print flex items-center justify-between">
        <Link to="/estimates" className="text-sm font-semibold text-brand-600">
          ← Estimates
        </Link>
        <Badge tone="neutral">NFPA 72 basis</Badge>
      </div>

      <header className="no-print">
        <h1 className="text-2xl font-extrabold tracking-tight text-ink">Fire alarm BOQ</h1>
        <p className="mt-1 text-sm text-ink-mute">
          Device, module and cable quantities from room geometry. Prices stay in the quotation builder.
        </p>
      </header>

      <Card className="no-print space-y-3 p-4">
        <div className="grid grid-cols-2 gap-3">
          <Select label="System" value={system} onChange={(e) => changeSystem(e.target.value as FaSystem)}>
            <option value="Addressable">Addressable</option>
            <option value="Conventional">Conventional</option>
          </Select>
          <Select label="Brand" value={brand} onChange={(e) => setBrand(e.target.value as FaBrand)}>
            {brands.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </Select>
        </div>
        <div className="grid grid-cols-3 gap-2">
          <Select label="Units" value={unit} onChange={(e) => setUnit(e.target.value as 'm' | 'ft' | 'mm')}>
            <option value="m">m</option>
            <option value="ft">ft</option>
            <option value="mm">mm</option>
          </Select>
          <NumberInput label="Exits / stairs" value={exits} onChange={(e) => setExits(e.target.value)} />
          <Select
            label="Buffer"
            value={String(expansion)}
            onChange={(e) => setExpansion(Number(e.target.value) as ExpansionBuffer)}
          >
            <option value="1">No buffer</option>
            <option value="1.2">+20%</option>
            <option value="1.3">+30%</option>
            <option value="1.5">+50%</option>
          </Select>
        </div>
        <Select label="Notification" value={audio} onChange={(e) => setAudio(e.target.value as 'Hooter' | 'Hooter + Strobe')}>
          <option value="Hooter">Standard hooters</option>
          <option value="Hooter + Strobe">Hooter cum strobe</option>
        </Select>

        {system === 'Addressable' && (
          <div className="rounded-xl bg-surface-sunken p-2.5">
            <p className="text-xs font-bold uppercase tracking-wide text-ink-mute">Integrations</p>
            <div className="mt-2 grid grid-cols-2 gap-2">
              <NumberInput label="AHU trips" value={integrations.ahu} onChange={(e) => setIntegrations({ ...integrations, ahu: e.target.value })} />
              <NumberInput label="Access doors" value={integrations.access} onChange={(e) => setIntegrations({ ...integrations, access: e.target.value })} />
              <NumberInput label="Flow switches" value={integrations.flow} onChange={(e) => setIntegrations({ ...integrations, flow: e.target.value })} />
              <NumberInput label="Pump status" value={integrations.pump} onChange={(e) => setIntegrations({ ...integrations, pump: e.target.value })} />
              <NumberInput label="Shunt trips" value={integrations.elec} onChange={(e) => setIntegrations({ ...integrations, elec: e.target.value })} />
              <NumberInput label="Repeaters" value={integrations.repeater} onChange={(e) => setIntegrations({ ...integrations, repeater: e.target.value })} />
            </div>
            <label className="mt-2 flex items-center gap-2 text-xs font-semibold text-ink">
              <input
                type="checkbox"
                checked={integrations.bms}
                onChange={(e) => setIntegrations({ ...integrations, bms: e.target.checked })}
              />
              BMS high-level gateway
            </label>
          </div>
        )}
      </Card>

      <Card className="no-print space-y-3 p-4">
        <SectionHeader title="Add a room" subtitle="Hazard drives the detector type and spacing" />
        <TextInput label="Room name" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Server Room 1" />
        <Select label="Hazard" value={hazard} onChange={(e) => setHazard(e.target.value as FaHazard)}>
          {(Object.keys(HAZARD_LABELS) as FaHazard[]).map((key) => (
            <option key={key} value={key}>
              {HAZARD_LABELS[key]}
            </option>
          ))}
        </Select>
        <div className="grid grid-cols-3 gap-2">
          <NumberInput label="Length" value={dims.l} onChange={(e) => setDims({ ...dims, l: e.target.value })} />
          <NumberInput label="Width" value={dims.w} onChange={(e) => setDims({ ...dims, w: e.target.value })} />
          <NumberInput label="Height" value={dims.h} onChange={(e) => setDims({ ...dims, h: e.target.value })} />
        </div>
        <div className="grid grid-cols-3 gap-2">
          <NumberInput label="To panel" value={distance} onChange={(e) => setDistance(e.target.value)} suffix="m" />
          <NumberInput label="Ceiling void" value={voids.ceiling} onChange={(e) => setVoids({ ...voids, ceiling: e.target.value })} suffix="m" />
          <NumberInput label="Floor void" value={voids.floor} onChange={(e) => setVoids({ ...voids, floor: e.target.value })} suffix="m" />
        </div>
        <label className="flex items-center gap-2 text-xs font-semibold text-ink">
          <input type="checkbox" checked={hasMcp} onChange={(e) => setHasMcp(e.target.checked)} />
          Add a manual call point in this room
        </label>
        <Button full onClick={addRoom}>
          + Add room
        </Button>
        {error && <p className="text-xs font-semibold text-danger">{error}</p>}
      </Card>

      {rooms.length === 0 ? (
        <div className="no-print">
          <EmptyState title="No rooms yet" body="Add at least one room to generate the equipment schedule." />
        </div>
      ) : (
        <>
          <section>
            <SectionHeader
              title="Panel & schedule"
              subtitle={`${result.panelModel} · ${result.rollup.totalNodes} nodes`}
              action={<Badge tone="brand">{result.rows.length} lines</Badge>}
            />
            <div className="overflow-x-auto rounded-xl border border-surface-line bg-white">
              <table className="w-full min-w-[520px] border-collapse text-xs">
                <thead className="bg-brand-700 text-left text-[10px] uppercase tracking-wide text-white">
                  <tr>
                    <th className="px-2.5 py-2">Description</th>
                    <th className="px-2.5 py-2">Part</th>
                    <th className="px-2.5 py-2">Qty</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-line">
                  {result.rows.map((row) => (
                    <tr key={row.key}>
                      <td className="px-2.5 py-2 font-semibold text-ink">{row.description}</td>
                      <td className="px-2.5 py-2 text-ink-soft">{row.part}</td>
                      <td className="px-2.5 py-2 font-bold">{row.qty}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section>
            <SectionHeader title="Room breakdown" subtitle="Coverage per hazard and void layer" />
            <div className="overflow-x-auto rounded-xl border border-surface-line bg-white">
              <table className="w-full min-w-[560px] border-collapse text-xs">
                <thead className="bg-surface-sunken text-left text-[10px] uppercase tracking-wide text-ink-mute">
                  <tr>
                    <th className="px-2.5 py-2">Room</th>
                    <th className="px-2.5 py-2">Area m²</th>
                    <th className="px-2.5 py-2">Smoke</th>
                    <th className="px-2.5 py-2">Heat</th>
                    <th className="px-2.5 py-2">Multi</th>
                    <th className="px-2.5 py-2">Gas</th>
                    <th className="px-2.5 py-2">Beam</th>
                    <th className="px-2.5 py-2">Void det.</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-line">
                  {result.rooms.map((room) => (
                    <tr key={room.room.id}>
                      <td className="px-2.5 py-2 font-semibold text-ink">{room.room.name}</td>
                      <td className="px-2.5 py-2">{room.areaM2.toFixed(1)}</td>
                      <td className="px-2.5 py-2">{room.smoke}</td>
                      <td className="px-2.5 py-2">{room.heat}</td>
                      <td className="px-2.5 py-2">{room.multi}</td>
                      <td className="px-2.5 py-2">{room.gas}</td>
                      <td className="px-2.5 py-2">{room.beam}</td>
                      <td className="px-2.5 py-2">{room.voidDetectors}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {rooms.map((room) => (
                <button
                  key={room.id}
                  type="button"
                  className="no-print rounded-lg border border-surface-line bg-white px-2.5 py-1.5 text-[11px] font-semibold text-danger"
                  onClick={() => setRooms((current) => current.filter((item) => item.id !== room.id))}
                >
                  Remove {room.name}
                </button>
              ))}
            </div>
          </section>

          <ul className="space-y-1 rounded-xl bg-white p-3 text-[11px] leading-5 text-ink-mute shadow-card">
            {result.notes.map((note) => (
              <li key={note}>• {note}</li>
            ))}
          </ul>

          <div className="no-print flex gap-2">
            <Button variant="secondary" full onClick={save}>
              Save BOQ
            </Button>
            <Button full onClick={() => window.print()}>
              Print / PDF
            </Button>
          </div>
        </>
      )}
    </div>
  )
}
