import { db, settingGet, settingSet } from './db'
import { tierLimitMinutes } from '@/domain/jobs/types'
import type { CreditTier, ServiceItem, ServiceJob } from '@/domain/jobs/types'

const MIN = 60_000
const HOUR = 60 * MIN
const DAY = 24 * HOUR

function iso(offsetMs: number): string {
  return new Date(Date.now() + offsetMs).toISOString()
}

function service(
  id: string,
  name: string,
  system: string,
  templateId: string,
  status: ServiceItem['status'] = 'pending'
): ServiceItem {
  return {
    id,
    name,
    system,
    templateId,
    status,
    checklist: [],
    beforePhotoIds: [],
    afterPhotoIds: []
  }
}

const EMPLOYEE = 'Aarav Sharma'

function seed(): ServiceJob[] {
  const base: ServiceJob[] = [
    {
      id: 'job_seed_1',
      code: 'SH-1042',
      customerName: 'Sunrise Apartments',
      contactName: 'Meera Nair',
      phone: '9810012345',
      address: 'Tower B, Sector 62, Noida',
      area: 'Sector 62',
      kind: 'amc',
      priority: 'urgent',
      status: 'assigned',
      assignedTo: EMPLOYEE,
      services: [
        service('svc_1_1', 'Fire alarm health check', 'Fire Alarm', 'fire-alarm'),
        service('svc_1_2', 'Extinguisher inspection (12 units)', 'Extinguishers', 'extinguishers'),
        service('svc_1_3', 'Sprinkler valve & flow test', 'Sprinkler', 'sprinkler')
      ],
      slotStart: iso(-20 * MIN),
      slaDue: iso(75 * MIN),
      createdAt: iso(-3 * HOUR),
      issues: []
    },
    {
      id: 'job_seed_2',
      code: 'SH-1043',
      customerName: 'Corporate Tower A',
      contactName: 'Rohit Verma',
      phone: '9820098200',
      address: 'Plot 18, Sector 142, Noida',
      area: 'Sector 142',
      kind: 'amc',
      priority: 'normal',
      status: 'assigned',
      assignedTo: EMPLOYEE,
      services: [
        service('svc_2_1', 'Quarterly AMC — panel & detectors', 'Fire Alarm', 'fire-alarm'),
        service('svc_2_2', 'Pump room inspection', 'Pump Room', 'pump-room'),
        service('svc_2_3', 'Hydrant landing valves', 'Hydrant', 'hydrant'),
        service('svc_2_4', 'Clean agent cylinder weight check', 'Gas Suppression', 'gas-suppression')
      ],
      slotStart: iso(2 * HOUR),
      slaDue: iso(5 * HOUR),
      createdAt: iso(-DAY),
      issues: []
    },
    {
      id: 'job_seed_3',
      code: 'SH-1039',
      customerName: 'Metro Retail Store',
      contactName: 'Kavita Rao',
      phone: '9871112233',
      address: 'Ground floor, Sector 18, Noida',
      area: 'Sector 18',
      kind: 'breakdown',
      priority: 'urgent',
      status: 'assigned',
      assignedTo: EMPLOYEE,
      services: [
        service('svc_3_1', 'Panel showing loop fault', 'Fire Alarm', 'fire-alarm'),
        service('svc_3_2', 'Replace faulty hooter', 'Fire Alarm', 'fire-alarm')
      ],
      slotStart: iso(-4 * HOUR),
      slaDue: iso(-45 * MIN),
      createdAt: iso(-6 * HOUR),
      issues: []
    },
    {
      id: 'job_seed_4',
      code: 'SH-1035',
      customerName: 'Gainwell Warehouse',
      contactName: 'Sandeep Yadav',
      phone: '9990011122',
      address: 'Logistics Park, Greater Noida West',
      area: 'Greater Noida West',
      kind: 'amc',
      priority: 'normal',
      status: 'completed',
      assignedTo: EMPLOYEE,
      services: [
        service('svc_4_1', 'Hydrant riser pressure test', 'Hydrant', 'hydrant', 'done'),
        service('svc_4_2', 'Extinguisher refill (8 units)', 'Extinguishers', 'extinguishers', 'done')
      ],
      slotStart: iso(-DAY - 2 * HOUR),
      slaDue: iso(-DAY),
      createdAt: iso(-2 * DAY),
      otpVerifiedAt: iso(-DAY - 100 * MIN),
      startedAt: iso(-DAY - 95 * MIN),
      checkIn: { lat: 28.5355, lng: 77.391, accuracy: 18, at: iso(-DAY - 100 * MIN) },
      workDoneOtpAt: iso(-DAY - 22 * MIN),
      completedAt: iso(-DAY - 20 * MIN),
      checkOutAt: iso(-DAY - 18 * MIN),
      signoffName: 'Sandeep Yadav',
      rating: 5,
      issues: [
        {
          id: 'issue_seed_1',
          serviceItemId: 'svc_4_1',
          severity: 'minor',
          description: 'Corroded cap on landing valve 2; replacement advised.',
          raisedAt: iso(-DAY - 60 * MIN),
          resolvedAt: iso(-DAY - 30 * MIN)
        }
      ]
    },
    {
      id: 'job_seed_5',
      code: 'SH-1046',
      customerName: 'Honda Cars Service Centre',
      contactName: 'Imran Khan',
      phone: '9953344556',
      address: 'Sector 63, Noida',
      area: 'Sector 63',
      kind: 'survey',
      priority: 'normal',
      status: 'pending',
      assignedTo: EMPLOYEE,
      services: [service('svc_5_1', 'Site survey for BOQ (kitchen hood)', 'Kitchen Hood', 'gas-suppression')],
      slotStart: iso(DAY),
      slaDue: iso(DAY + 6 * HOUR),
      createdAt: iso(-2 * HOUR),
      issues: []
    },
    {
      id: 'job_seed_6',
      code: 'SH-1048',
      customerName: 'Palm Grove Residency',
      contactName: 'Anita Deshmukh',
      phone: '9845566778',
      address: 'Flat 1204, Tower 3, Sector 76, Noida',
      area: 'Sector 76',
      kind: 'amc',
      priority: 'normal',
      status: 'assigned',
      assignedTo: EMPLOYEE,
      services: [
        service('svc_6_1', 'AC service - 2 split units', 'AC Service', 'ac-service'),
        service('svc_6_2', 'Solar panel cleaning - rooftop array', 'Solar Panels', 'solar-cleaning'),
        service('svc_6_3', 'Extinguisher check', 'Extinguishers', 'extinguishers')
      ],
      slotStart: iso(3 * HOUR),
      slaDue: iso(7 * HOUR),
      createdAt: iso(-HOUR),
      issues: []
    },
    {
      id: 'job_seed_7',
      code: 'SH-1051',
      customerName: 'Green Park Villas',
      contactName: 'Rakesh Gupta',
      phone: '9836677889',
      address: 'Villa 24, Sector 50, Noida',
      area: 'Sector 50',
      kind: 'amc',
      priority: 'normal',
      status: 'assigned',
      assignedTo: EMPLOYEE,
      services: [
        service('svc_7_1', 'CCTV checkup - 8 cameras', 'CCTV', 'cctv'),
        service('svc_7_2', 'Chimney deep clean', 'Chimney', 'chimney'),
        service('svc_7_3', 'RO filter service', 'RO', 'ro'),
        service('svc_7_4', 'Geyser checkup', 'Geyser', 'geyser'),
        service('svc_7_5', 'Meter check', 'Meter', 'meter')
      ],
      slotStart: iso(5 * HOUR),
      slaDue: iso(8 * HOUR),
      createdAt: iso(-30 * MIN),
      issues: []
    }
  ]

  const tiers: CreditTier[] = [2, 2, 1, 2, 2, 2, 1]
  return base.map((job, index) => {
    const tier = tiers[index] ?? 2
    return { ...job, tier, workLimitMinutes: tierLimitMinutes(tier) }
  })
}

let seeding: Promise<void> | null = null

/** Seeds a realistic demo board once per install. */
export async function ensureSeed(): Promise<void> {
  if (seeding) return seeding
  seeding = (async () => {
    const seeded = await settingGet<boolean>('seeded', false)
    if (seeded) return
    const count = await db.jobs.count()
    if (count === 0) {
      await db.jobs.bulkAdd(seed())
    }
    await settingSet('seeded', true)
  })()
  return seeding
}

export async function resetDemoData(): Promise<void> {
  await db.jobs.clear()
  await db.photos.clear()
  await db.estimates.clear()
  await settingSet('seeded', false)
  seeding = null
  await ensureSeed()
}
