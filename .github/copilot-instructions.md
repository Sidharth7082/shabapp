# Copilot instructions — Shabh Service

**Before doing anything, read `PLAN.md`.** It is the project's shared memory: status board,
phases, backlog, blockers, golden rules and changelog. Work from it instead of guessing.

## Mandatory after every behaviour change

Update `PLAN.md` in the same change:

1. Status board row (`Planning` → `Live`, etc.) with evidence.
2. Tick/add phase or backlog items with priority and blocker.
3. Append a dated changelog line and bump `Last updated`.

A task is not complete until `PLAN.md` matches the code. If something is implemented but not
verified in a browser or by a test, label it "implemented, not yet verified".

## Hard rules

- **Camera only** for proof photos: never add `<input type="file">`, gallery pickers or
  drag-drop uploads. Capture path: `src/features/camera/`.
- **Two OTPs per visit.** The customer's start OTP starts the visit clock (`startVisitClock` in
  `src/services/jobs.ts`) and unlocks services; the work-done OTP is required before the job can
  be closed. Windows come from the customer tier: tier 1 = 60 min, tier 2 = 90 min.
- **Unpriced SKUs say "Rate required"**, never ₹0. Estimates keep the preliminary disclaimer.
- **OTP and employee login here are demos** — never present them as secure. Production =
  Supabase Auth + edge functions + MSG91.
- **Never ship plaintext credentials or secrets.** Demo PINs are PBKDF2 hashes; sessions expire
  after 12 h / 2 h idle; anything fetched from the network (update manifest) must be validated.
  Never add a `.env`, key, token or customer data to the repo or the JS bundle.
- **Geolocation is fire-and-forget**; never await it when verifying OTP or completing a job.
- Job/service writes go through `db.transaction('rw', db.jobs, …)`.
- **Respect the role matrix.** Technician = own jobs only; supervisor = live team + create/
  assign; manager = team points/analytics + delete; admin = people/roles/audit/security. Use
  `src/domain/auth/roles.ts` for every nav, route, screen and action check. These client gates
  are not a server boundary — mirror them with Supabase RLS in production.
- **Keep screens lazy-loaded** in `src/router.tsx`; the Control room is `/control` and the
  admin console is `/admin`. Never expose either in technician navigation.
- **Stay light for low-end phones:** no new eager dependency, proof photos capped at 1280 px,
  idle prefetch gated on `deviceMemory` / `hardwareConcurrency` / save-data.
- **Releases:** never hand-publish an APK or edit `public/update.json`. Ship with
  `npm run release -- --patch --notes "..."`; the manifest it publishes is what makes installed
  apps show “New version available” on launch. See `docs/RELEASE-UPDATES.md`.

## Commands

`npx tsc --noEmit` (never `tsc -b`) · `npm test` · `npm run build`

Full details and the file map: `AGENTS.md` and `PLAN.md`.
