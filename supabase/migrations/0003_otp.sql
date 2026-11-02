-- OTP challenges are server-only. No anon or authenticated policy is created,
-- so RLS denies every client read/write; edge functions use the service role.

create table otp_challenges (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references jobs (id) on delete cascade,
  phone text not null,
  code_hash text not null,
  salt text not null,
  attempts smallint not null default 0,
  max_attempts smallint not null default 3,
  expires_at timestamptz not null,
  verified_at timestamptz,
  consumed_at timestamptz,
  requested_ip inet,
  created_at timestamptz not null default now()
);

create index otp_job_active_idx on otp_challenges (job_id, expires_at desc);

alter table otp_challenges enable row level security;
revoke all on table otp_challenges from anon, authenticated;

-- Single active challenge per job: invalidate older rows when a new one is issued.
create or replace function expire_previous_otp() returns trigger as $$
begin
  update otp_challenges
     set expires_at = now()
   where job_id = new.job_id
     and consumed_at is null
     and expires_at > now();
  return new;
end;
$$ language plpgsql security definer;

create trigger otp_expire_previous before insert on otp_challenges
for each row execute function expire_previous_otp();

-- Rate limit helper: at most 5 requests per job per hour.
create or replace function otp_request_allowed(target_job uuid) returns boolean as $$
  select count(*) < 5
  from otp_challenges
  where job_id = target_job
    and created_at > now() - interval '1 hour';
$$ language sql stable security definer;

-- Audit trail for every OTP transition.
create or replace function log_otp_event(target_job uuid, event_name text, detail jsonb default '{}'::jsonb)
returns void as $$
begin
  insert into job_events (job_id, employee_id, event, payload)
  values (target_job, current_employee_id(), event_name, detail);
end;
$$ language plpgsql security definer;
