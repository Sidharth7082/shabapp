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
- **Visit clock starts on the first photo**, not OTP (`appendServicePhoto` in
  `src/services/jobs.ts`). Late visits are flagged, never blocked.
- **Unpriced SKUs say "Rate required"**, never ₹0. Estimates keep the preliminary disclaimer.
- **OTP here is a demo** — never present it as secure. Production = Supabase + MSG91.
- **Geolocation is fire-and-forget**; never await it when verifying OTP or completing a job.
- Job/service writes go through `db.transaction('rw', db.jobs, …)`.
- Keep the technician role out of `/admin`; keep screens lazy-loaded in `src/router.tsx`.

## Commands

`npx tsc --noEmit` (never `tsc -b`) · `npm test` · `npm run build`

Full details and the file map: `AGENTS.md` and `PLAN.md`.
