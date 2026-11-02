# Data model

## Local (IndexedDB via Dexie)

Database `shabh-service`, schema version 1.

| Table | Key | Notes |
| --- | --- | --- |
| `jobs` | `id` | Full job document including `services` and `issues` arrays |
| `photos` | `id` | Stores the JPEG `Blob` plus watermark text and GPS |
| `estimates` | `id` | BOQ payload + totals, indexed by `kind` and `createdAt` |
| `settings` | `key` | Seed flag and small preferences |

Job document:

```
ServiceJob
  id, code, customerName, contactName, phone, address, area
  kind: amc | breakdown | survey | sitc
  priority: normal | urgent
  status: pending | assigned | en_route | started | completed | cancelled
  assignedTo, slotStart, slaDue, createdAt
  workLimitMinutes, workDueAt, completedLate
  otpVerifiedAt, startedAt, completedAt, checkOutAt
  checkIn { lat, lng, accuracy, at }
  signoffName, rating
  services: ServiceItem[]
  issues: JobIssue[]
```

`ServiceItem` holds one service inside a multi-service visit: name, system, checklist
template, status, `ChecklistEntry[]`, before/after photo ids, timestamps.

**Visit clock.** `workLimitMinutes` is set when the job is created. `startedAt` and
`workDueAt` are stamped by `appendServicePhoto` the first time any photo is stored for
the job — never by the OTP step. `completedLate` is derived at sign-off. A visit can own
any number of services (AC service, solar panel cleaning, fire checks) and all of them
must close before the job can be completed; going past `workDueAt` flags the visit
instead of trapping the technician.
(minor/major/critical), description and an evidence photo id.

## Server (Supabase)

`employees`, `customers`, `sites`, `jobs`, `job_services`, `service_checks`,
`job_issues`, `proof_photos`, `job_events`, `estimates`, `otp_challenges`.

Normalised rather than nested: services and checks are rows so a manager dashboard can
query across employees without loading whole job documents.

Every mutable table carries `updated_at` and `rev`. `touch_updated_at()` bumps both on
update, which is the basis of the sync contract.

`proof_photos.storage_path` points at the private `proof-photos` bucket; the blob itself
never travels through Postgres.

## Mapping

| Local | Server |
| --- | --- |
| `jobs.services[]` | `job_services` rows, `sequence` preserves order |
| `service.checklist[]` | `service_checks` rows (`unique(service_id, item_id)`) |
| `job.issues[]` | `job_issues` rows |
| `photos[]` | `proof_photos` + object storage |
| `estimates[]` | `estimates` with JSONB payload |
