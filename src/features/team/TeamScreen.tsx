import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '@/db/db'
import { Badge, Card, EmptyState, SectionHeader, Stat } from '@/components/ui/display'
import { Sheet } from '@/components/ui/Sheet'
import {
  AlertIcon,
  ChevronRightIcon,
  ClockIcon,
  NavigationIcon,
  TrendUpIcon,
  UsersIcon
} from '@/components/ui/icons'
import { buildTeamStats, type TeamMemberStats } from '@/domain/jobs/teamStats'
import { JOB_STATUS_LABEL, servicesDone } from '@/domain/jobs/types'
import { can, ROLE_LABEL, isFieldRole } from '@/domain/auth/roles'
import { effectiveTeam } from '@/services/people'
import { useSession } from '@/services/session'
import { relativeTime } from '@/domain/shared/id'
import { JobTimer } from '@/features/jobs/JobTimer'

function initials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('')
}

function MemberDetails({
  member,
  onClose,
  analytics
}: {
  member: TeamMemberStats
  onClose: () => void
  analytics: boolean
}) {
  const jobs = useLiveQuery(() => db.jobs.toArray(), [])
  const own = (jobs ?? [])
    .filter((job) => job.assignedTo === member.name)
    .sort((a, b) => new Date(b.slotStart).getTime() - new Date(a.slotStart).getTime())

  return (
    <Sheet open onClose={onClose} title={member.name} subtitle={`${member.id} · ${ROLE_LABEL[member.role]}`}>
      <div className="space-y-3">
        {analytics && (
          <div className="grid grid-cols-3 gap-2">
            <Card className="p-2.5 text-center">
              <p className="tabular text-[20px] font-extrabold leading-none text-ink">
                {member.pointsToday}
              </p>
              <p className="mt-1 text-[9px] font-bold uppercase tracking-wider text-ink-mute">
                Points today
              </p>
            </Card>
            <Card className="p-2.5 text-center">
              <p className="tabular text-[20px] font-extrabold leading-none text-ink">
                {member.pointsWeek}
              </p>
              <p className="mt-1 text-[9px] font-bold uppercase tracking-wider text-ink-mute">
                This week
              </p>
            </Card>
            <Card className="p-2.5 text-center">
              <p className="tabular text-[20px] font-extrabold leading-none text-ink">
                {member.minutesOnSite}
                <span className="text-[10px] text-ink-mute">m</span>
              </p>
              <p className="mt-1 text-[9px] font-bold uppercase tracking-wider text-ink-mute">
                On site now
              </p>
            </Card>
          </div>
        )}

        {member.ping && (
          <Card className="p-3">
            <p className="text-[10px] font-bold uppercase tracking-widest text-ink-mute">
              Last location
            </p>
            <p className="mt-1 text-[12px] font-semibold text-ink">
              {member.ping.customerName} · {member.ping.jobCode}
            </p>
            <p className="text-[11px] text-ink-mute">
              {relativeTime(member.ping.at)} · ±{Math.round(member.ping.accuracy)} m
            </p>
            <a
              href={`https://www.google.com/maps?q=${member.ping.lat},${member.ping.lng}`}
              target="_blank"
              rel="noreferrer"
              className="mt-2 inline-flex items-center gap-1.5 rounded-lg bg-brand-600 px-2.5 py-1.5 text-[11px] font-bold text-white"
            >
              <NavigationIcon size={12} /> Open in Maps
            </a>
          </Card>
        )}

        <div>
          <SectionHeader title="Jobs" subtitle={`${own.length} assigned on this device`} />
          {own.length === 0 ? (
            <EmptyState title="No jobs assigned" body="Assign work in the control room." />
          ) : (
            <Card className="divide-y divide-surface-line">
              {own.map((job) => (
                <Link
                  key={job.id}
                  to={`/jobs/${job.id}`}
                  className="flex items-center gap-3 px-3.5 py-2.5 transition active:bg-surface-sunken"
                >
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[12.5px] font-bold text-ink">
                      {job.customerName}
                    </span>
                    <span className="block truncate text-[10.5px] text-ink-mute">
                      {job.code} · {new Date(job.slotStart).toLocaleString('en-IN', {
                        day: '2-digit',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </span>
                  </span>
                  <Badge
                    tone={
                      job.status === 'completed'
                        ? 'ok'
                        : job.status === 'started'
                          ? 'warn'
                          : 'neutral'
                    }
                  >
                    {JOB_STATUS_LABEL[job.status]}
                  </Badge>
                  <ChevronRightIcon size={13} className="text-ink-mute" />
                </Link>
              ))}
            </Card>
          )}
        </div>
      </div>
    </Sheet>
  )
}

export function TeamScreen() {
  const role = useSession((state) => state.role)
  const jobs = useLiveQuery(() => db.jobs.toArray(), [])
  const team = useLiveQuery(() => effectiveTeam(), [])
  const [selected, setSelected] = useState<string | null>(null)
  const analytics = can(role, 'team:analytics')

  const members = useMemo(
    () => (team ?? []).filter((employee) => isFieldRole(employee.role)),
    [team]
  )

  const { members: stats, totals } = useMemo(
    () => buildTeamStats(members, jobs ?? []),
    [members, jobs]
  )

  const selectedMember = stats.find((member) => member.id === selected)

  return (
    <div className="space-y-5 pb-8">
      <header className="px-4 pt-5">
        <p className="text-[10px] font-bold uppercase tracking-widest text-ink-mute">Operations</p>
        <h1 className="mt-1 text-[26px] font-extrabold leading-tight tracking-tight text-ink">
          Team
        </h1>
        <p className="mt-1 text-[13px] text-ink-mute">
          {analytics
            ? 'Live status, today’s points and who is working on what.'
            : 'Live status and today’s assignments. Performance is visible to managers.'}
        </p>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {can(role, 'jobs:create') && (
            <Link
              to="/control"
              className="rounded-lg bg-brand-600 px-2.5 py-1.5 text-[11px] font-bold text-white"
            >
              Assign work
            </Link>
          )}
          {analytics && (
            <Link
              to="/insights"
              className="rounded-lg border border-surface-line bg-white px-2.5 py-1.5 text-[11px] font-bold text-brand-700"
            >
              Full insights
            </Link>
          )}
          {can(role, 'admin:people') && (
            <Link
              to="/admin"
              className="rounded-lg border border-surface-line bg-white px-2.5 py-1.5 text-[11px] font-bold text-brand-700"
            >
              Admin console
            </Link>
          )}
        </div>
      </header>

      <section className="grid grid-cols-2 gap-2.5 px-4">
        {analytics ? (
          <Stat
            icon={<TrendUpIcon size={16} />}
            label="Points today"
            value={totals.pointsToday}
            tone="brand"
          />
        ) : (
          <Stat icon={<UsersIcon size={16} />} label="Team size" value={totals.members} tone="brand" />
        )}
        <Stat icon={<UsersIcon size={16} />} label="On site now" value={totals.onSite} tone={totals.onSite > 0 ? 'ok' : 'neutral'} />
        <Stat icon={<ClockIcon size={16} />} label="Open jobs" value={totals.openJobs} />
        <Stat
          icon={<AlertIcon size={16} />}
          label="Overdue"
          value={totals.overdue}
          tone={totals.overdue > 0 ? 'danger' : 'ok'}
          hint={totals.overdue > 0 ? 'SLA breached' : 'On track'}
        />
      </section>

      <section className="px-4">
        <SectionHeader
          title="Live team"
          subtitle={analytics ? 'On-site first, then points today' : 'On-site status first'}
          action={<Badge tone="neutral">{stats.length}</Badge>}
        />
        {team === undefined || jobs === undefined ? (
          <Card className="p-4 text-[12px] text-ink-mute">Loading team…</Card>
        ) : stats.length === 0 ? (
          <EmptyState
            icon={<UsersIcon size={20} />}
            title="No field staff yet"
            body="Add technicians to the demo directory to see the team board."
          />
        ) : (
          <div className="space-y-3">
            {stats.map((member) => {
              const pct =
                member.target > 0
                  ? Math.min(100, Math.round((member.pointsToday / member.target) * 100))
                  : 0
              return (
                <Card key={member.id} className="p-3.5">
                  <div className="flex items-start gap-3">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-[12px] font-black text-brand-700">
                      {initials(member.name)}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <p className="truncate text-[13.5px] font-bold text-ink">{member.name}</p>
                        <Badge tone={member.onSite ? 'warn' : 'neutral'}>
                          {member.onSite ? 'On site' : member.openJobs > 0 ? 'Available' : 'No work'}
                        </Badge>
                      </div>
                      <p className="mt-0.5 text-[10.5px] text-ink-mute">
                        {ROLE_LABEL[member.role]} · {member.id}
                        {analytics ? ` · target ${member.target} points` : ''}
                      </p>

                      {analytics && (
                        <>
                          <div className="mt-2 flex items-center justify-between text-[10.5px]">
                            <span className="font-semibold text-ink-soft">
                              <span className="tabular">{member.pointsToday}</span> / {member.target} today
                            </span>
                            <span className="tabular font-bold text-ink-mute">{pct}%</span>
                          </div>
                          <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-surface-line">
                            <div
                              className={pct >= 100 ? 'h-full rounded-full bg-ok' : 'h-full rounded-full bg-brand-500'}
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </>
                      )}

                      {member.activeJob && (
                        <Link
                          to={`/jobs/${member.activeJob.id}`}
                          className="mt-2 flex items-center gap-2 rounded-lg bg-warn-soft px-2 py-1.5 text-[11px] font-semibold text-warn"
                        >
                          <ClockIcon size={12} />
                          <span className="min-w-0 flex-1 truncate">
                            {member.activeJob.customerName} · {servicesDone(member.activeJob)}/
                            {member.activeJob.services.length}
                          </span>
                          <JobTimer job={member.activeJob} variant="chip" />
                        </Link>
                      )}

                      {!member.activeJob && member.nextJob && (
                        <p className="mt-2 truncate text-[10.5px] text-ink-mute">
                          Next: {member.nextJob.customerName} ·{' '}
                          {new Date(member.nextJob.slotStart).toLocaleTimeString('en-IN', {
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </p>
                      )}

                      {member.overdue > 0 && (
                        <p className="mt-1.5 inline-flex items-center gap-1 rounded-md bg-danger-soft px-2 py-0.5 text-[10px] font-bold text-danger">
                          <AlertIcon size={10} /> {member.overdue} overdue
                        </p>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => setSelected(member.id)}
                      aria-label={`Open ${member.name} details`}
                      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-surface-line text-ink-mute transition active:scale-95"
                    >
                      <ChevronRightIcon size={14} />
                    </button>
                  </div>

                  <div className="mt-2.5 flex items-center justify-between gap-2 border-t border-surface-line pt-2 text-[10px] text-ink-mute">
                    <span className="truncate">
                      {member.lastActivityAt
                        ? `Last activity ${relativeTime(member.lastActivityAt)}`
                        : 'No activity yet'}
                    </span>
                    {analytics && (
                      <span className="shrink-0 font-semibold text-ink-soft">
                        {member.pointsWeek} this week
                      </span>
                    )}
                  </div>
                </Card>
              )
            })}
          </div>
        )}
      </section>

      <p className="px-4 text-[10px] leading-4 text-ink-mute">
        Team data is read from this device only. Live sync, GPS tracking and server-enforced roles
        arrive with the Phase 2 backend.
      </p>

      {selectedMember && (
        <MemberDetails
          member={selectedMember}
          analytics={analytics}
          onClose={() => setSelected(null)}
        />
      )}
    </div>
  )
}
