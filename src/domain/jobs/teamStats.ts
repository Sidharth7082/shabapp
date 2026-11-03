import type { Role } from '@/domain/auth/roles'
import {
  completedVisitsOn,
  workSeconds,
  type ServiceJob
} from './types'
import { isOpenJob, jobOverdue, sameDay } from './dashboard'
import {
  employeeOnSite,
  latestEmployeePing,
  type EmployeePing
} from './team'

export interface TeamMember {
  id: string
  name: string
  role: Role
  dailyTarget: number
}

export interface TeamMemberStats {
  id: string
  name: string
  role: Role
  target: number
  pointsToday: number
  pointsWeek: number
  visitsToday: number
  openJobs: number
  pendingServices: number
  overdue: number
  onSite: boolean
  minutesOnSite: number
  activeJob?: ServiceJob
  nextJob?: ServiceJob
  lastActivityAt?: string
  ping: EmployeePing | null
}

export interface TeamSummary {
  pointsToday: number
  pointsWeek: number
  onSite: number
  openJobs: number
  pendingServices: number
  overdue: number
  members: number
}

const WEEK_MS = 7 * 24 * 60 * 60 * 1000

function latest(values: Array<string | undefined>): string | undefined {
  let best: string | undefined
  let bestTime = -Infinity
  for (const value of values) {
    if (!value) continue
    const time = new Date(value).getTime()
    if (Number.isFinite(time) && time > bestTime) {
      best = value
      bestTime = time
    }
  }
  return best
}

function activityTime(job: ServiceJob): string | undefined {
  return latest([
    job.checkIn?.at,
    job.checkOut?.at,
    job.startedAt,
    job.otpVerifiedAt,
    job.workDoneOtpAt,
    job.completedAt
  ])
}

/**
 * Builds the supervisor/manager team view from the local jobs. There is no
 * employee table beyond the demo directory and no server sync yet, so these
 * numbers describe this device only.
 */
export function buildTeamStats(
  team: TeamMember[],
  jobs: ServiceJob[],
  now = new Date()
): { members: TeamMemberStats[]; totals: TeamSummary } {
  const weekStart = now.getTime() - WEEK_MS

  const members = team.map((member) => {
    const own = jobs.filter((job) => job.assignedTo === member.name)
    const open = own.filter(isOpenJob)
    const activeJob = open.find((job) => job.status === 'started')
    const nextJob = [...open]
      .filter((job) => job.id !== activeJob?.id)
      .sort((a, b) => new Date(a.slotStart).getTime() - new Date(b.slotStart).getTime())[0]
    const pointsWeek = own.filter(
      (job) =>
        job.status === 'completed' &&
        job.completedAt &&
        new Date(job.completedAt).getTime() >= weekStart
    ).length

    return {
      id: member.id,
      name: member.name,
      role: member.role,
      target: member.dailyTarget,
      pointsToday: completedVisitsOn(own, now),
      pointsWeek,
      visitsToday: own.filter((job) => sameDay(new Date(job.slotStart), now)).length,
      openJobs: open.length,
      pendingServices: open.reduce(
        (sum, job) => sum + job.services.filter((service) => service.status !== 'done').length,
        0
      ),
      overdue: open.filter((job) => jobOverdue(job, now)).length,
      onSite: employeeOnSite(own, member.name),
      minutesOnSite: activeJob ? Math.round(workSeconds(activeJob, now.getTime()) / 60) : 0,
      activeJob,
      nextJob,
      lastActivityAt: latest(own.map(activityTime)),
      ping: latestEmployeePing(jobs, member.name)
    }
  })

  members.sort(
    (a, b) =>
      Number(b.onSite) - Number(a.onSite) ||
      b.pointsToday - a.pointsToday ||
      a.name.localeCompare(b.name)
  )

  const totals: TeamSummary = {
    pointsToday: members.reduce((sum, member) => sum + member.pointsToday, 0),
    pointsWeek: members.reduce((sum, member) => sum + member.pointsWeek, 0),
    onSite: members.filter((member) => member.onSite).length,
    openJobs: members.reduce((sum, member) => sum + member.openJobs, 0),
    pendingServices: members.reduce((sum, member) => sum + member.pendingServices, 0),
    overdue: members.reduce((sum, member) => sum + member.overdue, 0),
    members: members.length
  }

  return { members, totals }
}
