-- Row level security: technicians see their own work, managers see everything.
-- OTP rows are never exposed to clients.

alter table employees enable row level security;
alter table customers enable row level security;
alter table sites enable row level security;
alter table jobs enable row level security;
alter table job_services enable row level security;
alter table service_checks enable row level security;
alter table job_issues enable row level security;
alter table proof_photos enable row level security;
alter table job_events enable row level security;
alter table estimates enable row level security;

create or replace function current_employee_id() returns uuid as $$
  select id from employees where auth_user_id = auth.uid() limit 1;
$$ language sql stable security definer;

create or replace function is_manager() returns boolean as $$
  select coalesce((select role = 'manager' from employees where auth_user_id = auth.uid() limit 1), false);
$$ language sql stable security definer;

-- Employees: self read, manager manage.
create policy employees_self_read on employees
  for select using (auth_user_id = auth.uid() or is_manager());

create policy employees_manager_write on employees
  for all using (is_manager()) with check (is_manager());

-- Customers and sites: any signed-in employee can read; managers write.
create policy customers_read on customers
  for select using (current_employee_id() is not null);

create policy customers_write on customers
  for all using (is_manager()) with check (is_manager());

create policy sites_read on sites
  for select using (current_employee_id() is not null);

create policy sites_write on sites
  for all using (is_manager()) with check (is_manager());

-- Jobs: assigned technician or any manager.
create policy jobs_read on jobs
  for select using (assigned_to = current_employee_id() or is_manager());

create policy jobs_manager_insert on jobs
  for insert with check (is_manager());

create policy jobs_update on jobs
  for update using (assigned_to = current_employee_id() or is_manager())
  with check (assigned_to = current_employee_id() or is_manager());

-- Child tables follow the parent job's visibility.
create policy services_read on job_services
  for select using (
    exists (
      select 1 from jobs j
      where j.id = job_services.job_id
        and (j.assigned_to = current_employee_id() or is_manager())
    )
  );

create policy services_write on job_services
  for all using (
    exists (
      select 1 from jobs j
      where j.id = job_services.job_id
        and (j.assigned_to = current_employee_id() or is_manager())
    )
  ) with check (
    exists (
      select 1 from jobs j
      where j.id = job_services.job_id
        and (j.assigned_to = current_employee_id() or is_manager())
    )
  );

create policy checks_access on service_checks
  for all using (
    exists (
      select 1
      from job_services s
      join jobs j on j.id = s.job_id
      where s.id = service_checks.service_id
        and (j.assigned_to = current_employee_id() or is_manager())
    )
  ) with check (
    exists (
      select 1
      from job_services s
      join jobs j on j.id = s.job_id
      where s.id = service_checks.service_id
        and (j.assigned_to = current_employee_id() or is_manager())
    )
  );

create policy issues_access on job_issues
  for all using (
    exists (
      select 1 from jobs j
      where j.id = job_issues.job_id
        and (j.assigned_to = current_employee_id() or is_manager())
    )
  ) with check (
    exists (
      select 1 from jobs j
      where j.id = job_issues.job_id
        and (j.assigned_to = current_employee_id() or is_manager())
    )
  );

create policy photos_read on proof_photos
  for select using (
    exists (
      select 1 from jobs j
      where j.id = proof_photos.job_id
        and (j.assigned_to = current_employee_id() or is_manager())
    )
  );

create policy photos_insert on proof_photos
  for insert with check (
    exists (
      select 1 from jobs j
      where j.id = proof_photos.job_id
        and (j.assigned_to = current_employee_id() or is_manager())
    )
  );

create policy events_read on job_events
  for select using (is_manager());

create policy events_insert on job_events
  for insert with check (current_employee_id() is not null);

create policy estimates_access on estimates
  for all using (created_by = current_employee_id() or is_manager())
  with check (created_by = current_employee_id() or is_manager());

-- Storage bucket for proof photos.
insert into storage.buckets (id, name, public)
values ('proof-photos', 'proof-photos', false)
on conflict (id) do nothing;

create policy proof_photos_storage_read on storage.objects
  for select using (bucket_id = 'proof-photos' and current_employee_id() is not null);

create policy proof_photos_storage_write on storage.objects
  for insert with check (bucket_id = 'proof-photos' and current_employee_id() is not null);
