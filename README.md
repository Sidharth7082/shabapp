# Shabh Service

Field service app for Shabh Creations. One employee app with two modules:

1. **Services** — an employee signs in, sees today's visits and a shift target (default 12
   services), verifies the customer's start OTP (which starts the visit clock), captures live
   before/after proof for every service, then takes a separate **work-done OTP** to close the
   visit. Customers sit in credit tiers: tier 1 gets a 60-minute visit, tier 2 gets 90 minutes.
2. **Estimates** — the four BOQ calculators recovered from shabhcreations.com, with the
   real catalog, HSN codes and GST, plus an editable rate card for AMC.

Offline-first PWA. The Android wrapper is planned via Capacitor.

> **Working on this repo? Read [`PLAN.md`](PLAN.md) first.** It is the living plan: status
> board, phases, backlog, blockers and changelog. It must be updated in the same commit as any
> behaviour change. Agent rules live in [`AGENTS.md`](AGENTS.md).

## Quick start

```bash
npm install
npm run setup:hooks  # installs the pre-commit guard that keeps PLAN.md in sync
npm run dev          # http://localhost:5173
npm run build        # typecheck + production build
npm test             # engine golden tests
```

The app opens with seven demo jobs. Sign in with the technician demo (`EMP-1042` / PIN
`1234`) or the manager demo (`MGR-1001` / PIN `1234`). Settings → **Reset demo data**
restores the seeded board.

## What runs where

| Area | State |
| --- | --- |
| Employee sign-in with ID + PIN | **Demo** — local directory, pinned to Supabase Auth in Phase 2 |
| Job board, pending counts, today's visits, shift target (12/day) | Live, local-first |
| Multi-service visits (AC, solar, CCTV, chimney, RO, geyser, meter, fire systems) | Live, 13 checklist templates |
| Customer credit tiers: tier 1 = 60 min, tier 2 = 90 min | Live |
| Visit clock: starts when the start OTP is verified, hard deadline per visit | Live |
| Work-done OTP before the visit can be closed | **Demo** — same local state machine as the start OTP |
| Checklists, issues | Live |
| Live camera capture + burned watermark (before + after per service) | Live |
| BOQ engines (gas, fire alarm, quotation, AMC) | Live, unit-tested |
| Control room (create/assign jobs, pick tier) | Live for this device |
| Customer OTP | **Demo** — generated on-device and shown in a labelled banner |
| Supabase sync, SMS/WhatsApp delivery, multi-manager analytics | **Pending** — schema and functions included |

## Routes

```
/login               Employee sign-in (demo accounts)
/                    Jobs board + shift target (technician home)
/jobs/:id            Job detail, tier window, start OTP, service flow, work-done OTP
/estimates           Tool hub + saved estimates
/estimates/gas       Gas suppression BOQ
/estimates/fire-alarm Fire alarm quantity BOQ
/estimates/quotation Priced quotation builder
/estimates/amc       AMC / CMC quote with rate card
/insights            Time on site, issues, SLA, scorecard
/admin               Control room
/settings            Profile, storage, build status
```

## Design system

- **Tokens** (`tailwind.config.js`): brand green 50–900, ink/surface neutrals, paired
  ok/warn/danger/info status colours, `shadow-card` → `shadow-raised` → `shadow-elevated`.
- **Type**: 10 / 11 / 12 / 13 / 15 / 22 / 26 px scale with tight tracking on headings.
  Any number that ticks carries the `tabular` class.
- **Motion**: `animate-slide-up`, `animate-sheet-up`, `animate-pop-in`; all animations are
  neutralised under `prefers-reduced-motion`.
- **Icons**: `src/components/ui/icons.tsx` — one inline SVG set, 1.8 stroke, `currentColor`.
- **Shell**: gradient brand mark, glass header, icon bottom nav with an active pill.
- **Surface rules**: 16–24 px radii, 1 px `surface-line` hairline, no heavy borders.

## Verified behaviour

- Typecheck is `npx tsc --noEmit` (the project has no composite build graph, so `tsc -b` fails).
- 33 tests pass: the recovered engine arithmetic (gas stored weight, cylinder step-up, fill
  ceilings, detector rollups, GST totals, AMC visit counts), the visit-clock helpers, credit-tier
  windows and the shift-target counter.
- Gas wizard reproduces the site's numbers: a 5×4×3 m Novec Class C room with a 10 m pipe run
  gives 42.0 kg stored, one 80 L Ansul cylinder, and ₹3,02,596.84 including GST.
- Sign-in: wrong PIN is rejected; either demo account opens the board with its own role and
  shift target; sign-out returns to `/login`.
- OTP: demo code issued, verified, services unlock, `otpVerifiedAt` recorded.
- **Visit clock:** the timer starts when the start OTP is verified, using the customer's tier
  (`workDueAt = startedAt + tierLimit`). Verified on `SH-1048` (tier 2, 90 min): after OTP the
  job moved to **In progress** with `1h 30m left · limit 90 min` and the board chip read
  `1H 29M LEFT`.
- **Work-done OTP:** all services must be closed before the sheet unlocks; the visit is only
  completed after the customer's second code is verified (`workDoneOtpAt`).
- Camera: live capture advanced the flow and stored a watermarked before/after pair.
- Bundle contains zero `type="file"` and zero image-accept inputs.
- Job creation from the control room assigns the next `SH-` code, applies the chosen tier and
  updates pending counts.

## Performance & resilience

- **Route-level code splitting:** every screen is `lazy()` behind a `Suspense` skeleton.
  Measured build: entry `index` 29.7 kB (10.7 kB gzip), vendors split into `react` 206 kB
  (67.2 kB gzip) and `data`/Dexie 100.8 kB (33 kB gzip); `JobsScreen` loads at 9.9 kB and the
  estimate tools, control room and insights arrive as separate 6–35 kB chunks.
- **Idle prefetch:** after first paint the secondary chunks (estimate hub, insights, control
  room, settings) are warmed with `requestIdleCallback`, so the first tap shows the screen
  rather than a skeleton (measured 53 ms in dev). Skipped on `saveData` connections.
- **Typing stays responsive:** catalog search runs against a `useDeferredValue` term, and all
  engine results (gas, fire alarm, quotation, AMC, insights) are `useMemo`-derived.
- **Writes are atomic:** taking a photo and finishing a service run inside Dexie read-write
  transactions, so two quick captures cannot overwrite each other's photo lists.
- **Bad data cannot crash a screen:** invalid dates render nothing instead of `NaN`, a missing
  photo blob falls back to a placeholder, and the whole tree sits inside an `ErrorBoundary`
  with Reload / Try again / Settings actions.
- **PWA:** `navigator.storage.persist()` is requested so IndexedDB job and photo data is not
  evicted; the service worker precaches 29 assets (524 kB) for full offline use.
- **Modal a11y:** sheets trap Tab focus, focus the panel on open, close on `Escape`, lock body
  scroll, and restore focus to the trigger.
- PWA build precaches 29 assets; `npx tsc --noEmit` and all 33 tests pass after the pass.

## Backend setup (when credentials are available)

```bash
supabase db push                       # applies supabase/migrations/*
supabase functions deploy send-otp
supabase functions deploy verify-otp
supabase secrets set MSG91_AUTH_KEY=... MSG91_TEMPLATE_ID=... MSG91_SENDER_ID=...
```

Then set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in `.env`. The edge functions
generate, hash, deliver and verify the customer code; the client never sees it.

## Documentation

- `PLAN.md` — **living plan**: status, phases, backlog, blockers, changelog (read first)
- `AGENTS.md` — rules every AI agent follows, including keeping the plan current
- `CLAUDE.md` — Claude entrypoint that imports the same rules
- `docs/REA-spec.md` — constants and formulas recovered from the live site
- `docs/SECURITY-OTP-CAMERA.md` — OTP lifecycle and why gallery uploads are impossible
- `docs/DATA-MODEL.md` — IndexedDB and Postgres schemas
- `docs/SYNC-CONTRACT.md` — outbox, conflict policy, realtime plan

## Notes on rates

Catalog prices are the published Shabh selling rates (GST-inclusive) converted to base
rates at 18%. Gas pricing exists only for Ansul and Cryptzo in the source tool; Kidde,
Ceasefire and Generic are flagged **Rate required** rather than showing ₹0. AMC has no
published rates at all, so the app ships an empty editable rate card.

All estimation output is preliminary. Final BOQs require a site survey and a certified
engineer.
