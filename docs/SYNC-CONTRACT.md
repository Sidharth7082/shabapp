# Sync contract (v2)

The employee app is offline-first. Today it writes only to IndexedDB. This contract
describes how the same records move to Supabase without a rewrite.

## Outbox

Every local mutation appends to an outbox entry:

```
{ id, entity: 'job' | 'service' | 'check' | 'issue' | 'photo' | 'estimate',
  entityId, op: 'upsert' | 'delete', payload, baseRev, deviceId, createdAt }
```

Flush order: job → services → checks → issues → estimates → photos (binary last, because
uploads are the slowest and most retryable).

## Requests

```
POST /rest/v1/jobs            upsert with Prefer: resolution=merge-duplicates
PATCH /rest/v1/jobs?id=eq.{}  partial update for status transitions
POST /storage/v1/object/proof-photos/{jobId}/{serviceId}/{photoId}.jpg
```

All writes send `If-Match: rev=<baseRev>` semantics via the `baseRev` field so a stale
device cannot overwrite a newer server row.

## Conflicts

| Field group | Policy |
| --- | --- |
| Job status, timestamps, OTP verification | Server wins; client re-reads |
| Service status, checklist results | Last write wins per row, both versions kept in `job_events` |
| Photos | Append-only, never overwritten |
| Estimates | Last write wins, whole-document replace |
| Customer/site master data | Manager-only writes, server wins |

## Realtime

The employee board subscribes to `jobs` filtered by `assigned_to`, so a job assigned by
the control room appears without a manual refresh. The admin board subscribes to all
jobs and shows pending counts from the same rows.

## Failure handling

- Retry with exponential backoff (5 s → 5 min), capped at 24 h.
- Photos stay queued with their watermark text until upload succeeds.
- A 409 conflict triggers a pull-and-merge for that entity, then one retry.
- The UI always shows the local state plus a sync badge; it never blocks work on network.
