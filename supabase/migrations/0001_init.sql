-- Shabh Service: core schema.
-- Jobs are the server of record in production; the PWA keeps an offline cache.

create extension if not exists pgcrypto;

create type app_role as enum ('technician', 'manager');
create type job_kind as enum ('amc', 'breakdown', 'survey', 'sitc');
create type job_status as enum ('pending', 'assigned', 'en_route', 'started', 'completed', 'cancelled');
create type service_status as enum ('pending', 'in_progress', 'done');
create type issue_severity as enum ('minor', 'major', 'critical');
create type check_result as enum ('pass', 'fail', 'na');

create table employees (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid unique references auth.users (id) on delete cascade,
  name text not null,
  phone text,
  role app_role not null default 'technician',
  created_at timestamptz not null default now()
);

create table customers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  contact_name text,
  phone text,
  email text,
  created_at timestamptz not null default now()
);

create table sites (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references customers (id) on delete cascade,
  name text not null,
  address text not null,
  area text,
  lat double precision,
  lng double precision,
  created_at timestamptz not null default now()
);

create table jobs (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  customer_id uuid references customers (id),
  site_id uuid references sites (id),
  kind job_kind not null default 'amc',
  priority text not null default 'normal' check (priority in ('normal', 'urgent')),
  status job_status not null default 'assigned',
  assigned_to uuid references employees (id),
  slot_start timestamptz not null,
  sla_due timestamptz not null,
  otp_verified_at timestamptz,
  check_in_lat double precision,
  check_in_lng double precision,
  check_in_accuracy double precision,
  check_in_at timestamptz,
  started_at timestamptz,
  completed_at timestamptz,
  check_out_at timestamptz,
  signoff_name text,
  rating smallint check (rating between 1 and 5),
  created_by uuid references employees (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  rev bigint not null default 1
);

create index jobs_status_due_idx on jobs (status, sla_due);
create index jobs_assigned_idx on jobs (assigned_to, status);

create table job_services (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references jobs (id) on delete cascade,
  name text not null,
  system text not null,
  template_id text,
  sequence integer not null default 1,
  status service_status not null default 'pending',
  started_at timestamptz,
  completed_at timestamptz,
  notes text,
  created_at timestamptz not null default now()
);

create index job_services_job_idx on job_services (job_id, sequence);

create table service_checks (
  id uuid primary key default gen_random_uuid(),
  service_id uuid not null references job_services (id) on delete cascade,
  item_id text not null,
  result check_result not null,
  note text,
  created_at timestamptz not null default now(),
  unique (service_id, item_id)
);

create table job_issues (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references jobs (id) on delete cascade,
  service_id uuid references job_services (id) on delete set null,
  severity issue_severity not null default 'major',
  description text not null,
  photo_id uuid,
  raised_at timestamptz not null default now(),
  resolved_at timestamptz
);

create table proof_photos (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references jobs (id) on delete cascade,
  service_id uuid not null references job_services (id) on delete cascade,
  kind text not null check (kind in ('before', 'after')),
  storage_path text not null,
  captured_at timestamptz not null default now(),
  lat double precision,
  lng double precision,
  accuracy double precision,
  watermark text not null,
  device_id text,
  sha256 text
);

create table job_events (
  id bigint generated always as identity primary key,
  job_id uuid not null references jobs (id) on delete cascade,
  employee_id uuid references employees (id),
  event text not null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table estimates (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('gas', 'fire-alarm-boq', 'quotation', 'amc')),
  title text not null,
  payload jsonb not null,
  subtotal numeric(14, 2) not null default 0,
  gst numeric(14, 2) not null default 0,
  total numeric(14, 2) not null default 0,
  created_by uuid references employees (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  rev bigint not null default 1
);

create or replace function touch_updated_at() returns trigger as $$
begin
  new.updated_at = now();
  new.rev = old.rev + 1;
  return new;
end;
$$ language plpgsql;

create trigger jobs_touch before update on jobs
for each row execute function touch_updated_at();

create trigger estimates_touch before update on estimates
for each row execute function touch_updated_at();
