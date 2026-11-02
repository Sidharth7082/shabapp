# Shabh Service — Living Plan

> **Read this file first.** It is the single source of truth for what this app is, what is
> finished, what is next, and what must never break. Every AI agent and contributor updates
> this file in the same change as the code. A task is **not done** until this plan matches
> reality. Protocol: [Keeping this plan current](#9-keeping-this-plan-current).

- **Last updated:** 2026-11-02
- **Stage:** Phase 1 complete — production-ready offline PWA. Phase 2 (real OTP + multi-device
  sync) is next and is blocked on credentials.
- **Health:** `npx tsc --noEmit` clean · `npm test` 33/33 pass · `npm run build` ok
- **Repo:** private GitHub repo `shabapp` (see README for how to clone)

## 1. What we are building

One app for a Shabh Creations field employee, combining two jobs that today live in different
places:

1. **Service operations (Blinkit-style)** — the employee signs in with an employee ID and PIN,
   sees today's visits and a shift target (12 **points**; one completed house = 1 point, the
   inner services in a visit do not add points), opens a visit and checks what is already done.
   Customers sit in exactly **two credit tiers**: tier 1 gets a 60-minute visit, tier 2 gets 90
   minutes. The customer's **start OTP** must be verified before any work; verifying it starts
   the visit clock. After the OTP the technician captures **live** before/after photos for every
   service (gallery uploads are impossible by design). A second **work-done OTP** from the
   customer is required before the visit can be closed. A house visit can contain many services
   (AC service, solar-panel cleaning, CCTV, chimney, RO, geyser, meter, fire systems).
2. **Estimates** — the four BOQ calculators recovered from `shabhcreations.com` (gas
   suppression, fire alarm, quotation builder, AMC) running offline with the real catalog,
   HSN codes and 18% GST.

Managers get a control room to create/assign work and an insights screen. Everything is
offline-first on IndexedDB and installs as a PWA; an Android wrapper via Capacitor is planned.

## 2. Status board

`Live` = shipped and exercised on this device. `Demo` = works locally but not production-ready.
`Pending` = designed/written but not deployed. `Idea` = not started.

| Area | State | Notes / evidence |
| --- | --- | --- |
| Job board, pending-service counts, today's visits, SLA chips | **Live** | Seeded + created jobs, role-aware nav |
| Employee sign-in with employee ID + PIN | **Demo** | Verified: wrong PIN rejected, technician and manager open different roles, sign-out returns to `/login` |
| Shift points: 1 per completed house, target 12/day | **Live** | Verified: one 5-service house showed `1 / 12 points`; extra houses are shown as extra points |
| Customer credit tiers: only tier 1 (60 min) and tier 2 (90 min) | **Live** | Tier badge on job cards, job sheet and control-room rows; verified SH-1051 as tier 1 |
| Multi-service visit (AC, solar, CCTV, chimney, RO, geyser, meter, fire systems) | **Live** | 13 checklist templates; SH-1051 holds CCTV, chimney, RO, geyser and meter |
| Start OTP gate before work | **Demo** | Verified: code issued, services locked until verify, `otpVerifiedAt` recorded |
| Visit clock: starts when the start OTP is verified, per-visit deadline, late flag | **Live** | Verified on SH-1051: `startedAt`/`workDueAt` exactly 60 min apart, timer `59m 59s`, deadline `10:04 pm` |
| Work-done OTP required to close the visit | **Demo** | Verified: footer blocked until the second code; verify set `workDoneOtpAt`; visit closed with sign-off and `completedLate` flagged |
| Team locator (last known position) | **Live (last fix only)** | Control room shows on-site status, active visit, latest check-in/sign-off fix and a Maps link; live tracking needs Phase 2 |
| Android app (debug APK) | **Live for testing** | Capacitor 8, `com.shabh.service`; verified on Pixel 6 / API 36: sign-in, OTP clock `59m 59s`, live camera 1392×1856, photo + watermark + GPS ±5 m |
| Live camera capture + burned watermark (before + after per service) | **Live** | Zero file inputs in the bundle (CI-checked) |
| Checklists with Pass / Fail / N/A, issue capture | **Live** | Re-opening a service restores 9/9 states |
| Completion sign-off + rating | **Live** | Blocked until every service is done |
| Gas suppression engine (NFPA 2001) | **Live** | 5×4×3 m Novec Class C + 10 m run = 42.0 kg, 80 L Ansul, ₹3,02,596.84 |
| Fire alarm engine (NFPA 72) | **Live** | Detector/MCP/hooter/module/cable rollups, brand panels |
| Quotation builder (92 SKUs, HSN, GST) | **Live** | 3-line sample: subtotal ₹68,169.70 → total ₹80,440.25 |
| AMC / CMC quote | **Live (scope) / Pending (rates)** | No published rates; editable rate card persisted locally |
| Insights (time on site, completion, SLA health) | **Live for this device** | Future-scheduled jobs excluded from "planned" |
| Control room (create / assign / delete) | **Live for this device** | Admin-only route, delete confirmations |
| Offline PWA, service-worker precache | **Live** | 29 assets / 524 kB precache |
| Supabase schema, RLS, OTP edge functions | **Pending** | Migration + function code written, never deployed |
| Real OTP delivery (SMS/WhatsApp) | **Pending** | Blocked on Supabase project + MSG91 DLT template |
| Multi-device sync (outbox, conflict policy) | **Pending** | Contract in `docs/SYNC-CONTRACT.md` |
| Capacitor Android wrapper | **Pending** | Not started |
| Real brand icon / logo | **Pending** | Placeholder PNG generated by script |
| PDF export of quote / BOQ | **Idea** | Not started |

## 3. Golden rules (never break these)

1. **No file inputs anywhere.** Photos only from `getUserMedia` → canvas → burned watermark.
   CI fails if `type:"file"` appears in `dist/assets/*.js`.
2. **The visit clock starts when the customer's start OTP is verified**, never on the first
   photo. `startVisitClock` stamps `startedAt` and `workDueAt = startedAt + tierLimit`, where
   tier 1 = 60 minutes and tier 2 = 90 minutes.
3. **A visit needs two customer OTPs:** the start code unlocks every service and starts the
   clock; the work-done code must be verified before the visit can be closed.
3. **Late is flagged, never blocked.** `completeJob` sets `completedLate`; technicians can
   always finish and report the truth.
4. **Unpriced items are flagged "Rate required"**, never shown as ₹0.
5. **Estimates are preliminary.** Every estimate screen keeps the "rough estimation, not a
   final engineered BOQ" disclaimer.
6. **OTP is demo-only until Phase 2 lands.** Never describe it as secure.
7. **Geolocation / address lookups are fire-and-forget.** A denied permission must never
   block OTP verification or job completion.
8. **All job mutations that touch services are transactional** (`db.transaction('rw', db.jobs…)`).

## 4. Phases

### Phase 0 — Research ✅
- [x] Recover the four calculators' formulas/constants from the live WordPress site
- [x] Recover the 92-SKU catalog, HSN mapping and GST treatment
- [x] Document payloads in `docs/REA-spec.md`

### Phase 1 — Offline employee app ✅
- [x] Vite + React + TS + Tailwind design system (brand green, ink/surface, 48 px taps)
- [x] Dexie data model for jobs, services, photos, estimates, settings
- [x] Employee sign-in (demo directory) with route guard and sign-out
- [x] Job board with today's visits, shift points (1 per completed house) and progress card
- [x] Team locator in the control room (last check-in/sign-off fix + Maps link)
- [x] Job detail, timeline, call/navigate actions
- [x] Credit tiers (60/90 min) that set the visit window
- [x] Start OTP gate that starts the visit clock, and live-camera proof
- [x] Work-done OTP before a visit can be closed
- [x] Multi-service visit flow with before/after proof per service
- [x] CCTV, chimney, RO, geyser and meter checklist templates
- [x] Deadline, late flag, dashboard chips
- [x] Control room (create/assign/delete), role gating, reset demo data
- [x] Insights dashboard
- [x] Four estimate tools + saved estimates
- [x] 27 engine/helper tests, PWA build, offline precache
- [x] Accessibility pass: focus-trapped sheets, labels, reduced motion, 48 px targets
- [x] Hardening: error boundary, lazy routes, transactions, invalid-date guards
- [x] Performance: route splitting (`react` 206 kB / `data` 101 kB vendors, entry ~30 kB),
      idle prefetch, deferred catalog search

### Phase 2 — Production backend 🔜 (next)
- [ ] Create Supabase project and apply `supabase/migrations/0001..0003`
- [ ] Supabase Auth for employees; `profiles` row carries role + daily target
- [ ] Two OTP purposes server-side (`start`, `complete`), gated by job state
- [ ] Deploy `send-otp` / `verify-otp` edge functions
- [ ] Configure MSG91 (or WhatsApp Cloud API) secrets + DLT template for India
- [ ] Remove `demoCode` from the client path; server-side attempts/rate limits/expiry audit
- [ ] Auth: technician + manager accounts, row-level security smoke test on real data
- [ ] Sync engine per `docs/SYNC-CONTRACT.md`: outbox table, retry/backoff, conflict policy
- [ ] Photo upload to Supabase Storage with local queue + resumable retry
- [ ] Realtime job assignment (manager creates → technician device updates)

### Phase 3 — Android + field readiness
- [x] Capacitor wrapper, app id `com.shabh.service`, camera + location permissions
- [x] Debug APK built and exercised on a Pixel 6 / API 36 emulator (login, OTP clock, live camera, capture)
- [ ] App icon + splash from the real brand asset
- [ ] HTTPS production deployment for the PWA (geolocation needs a secure context)
- [ ] Background sync + "pending uploads" indicator
- [ ] Play Store internal testing track / release signing
- [ ] Storage-quota guard: warn before photo storage pressure, bulk export of closed jobs

### Phase 4 — Manager depth
- [ ] Per-technician analytics (time on site, SLA breaches, photo audit trail)
- [ ] Reassignment + route planning (map of today's visits)
- [ ] PDF share for quotation / BOQ (letterhead, signature block)
- [ ] Customer sign-off signature and NPS after close
- [ ] Live employee tracking on a map (realtime positions, geofence alerts)
- [ ] Push notifications for new assignments (FCM)

### Phase 5 — Polish / reach
- [ ] Hindi UI strings (i18n), dark mode
- [ ] Geofence check-in validation (radius check at OTP time)
- [ ] Scheduled AMC visit generation from contracts
- [ ] Web dashboard for office staff (same Supabase backend)

## 5. Backlog (ordered, with blockers)

| # | Item | Priority | Blocked on | Est. |
| --- | --- | --- | --- | --- |
| 1 | Supabase project + migrations + edge functions | P0 | User's Supabase account/keys | 0.5 day |
| 2 | Supabase Auth replacing the demo employee login (role + shift target) | P0 | #1 | 0.5 day |
| 3 | MSG91 SMS delivery + DLT template | P0 | User's MSG91 account, DLT registration | 0.5 day |
| 4 | Server-side start/work-done OTP state machine, remove demo codes | P0 | #1, #3 | 1 day |
| 5 | Sync engine (jobs + estimates) | P1 | #1 | 2–3 days |
| 6 | Photo upload queue → Supabase Storage | P1 | #1, #5 | 1–2 days |
| 7 | AMC rate-card values | P1 | **User to supply rates** | 0.5 day |
| 8 | Android release build + Play Store internal testing (debug APK done 2026-11-02) | P1 | Play Console account | 1 day |
| 9 | Real brand icon + splash | P2 | User to supply logo | 0.5 day |
| 10 | PDF quotation export | P2 | Company letterhead + GST details | 1 day |
| 11 | Manager analytics v2, reassignment | P2 | #5 | 3 days |
| 12 | Customer e-signature + NPS | P3 | — | 1 day |
| 13 | Hindi strings, dark mode | P3 | — | 2 days |
| 14 | Incentive rate card (₹ per point above target) | P2 | **User to supply incentive policy** | 0.5 day |
| 15 | Live employee tracking (realtime map) | P2 | Sync (#5) + GPS reliability | 2 days |

## 6. Open questions for the user

1. **Incentive policy** — how much is paid per point above the target, and is there a cap? The
   app shows points today; money needs a rate from you.
2. **AMC rates** — the site publishes none. Need a rate card (per visit / per device / per
   system) or we keep it manual.
3. **OTP channel** — SMS via MSG91, WhatsApp Cloud API, or both? India requires a DLT-approved
   template for transactional SMS.
4. **Company details for PDFs** — GSTIN, address, logo file, authorised-signatory block.
5. **Android** — Play Store release or direct APK distribution? Minimum Android version?
6. **Photo retention** — how long should before/after photos be kept on device / in cloud?

## 7. Known limitations / risks

- OTP is client-generated today; anyone with the device can read the code. Documentation says
  so explicitly (`docs/SECURITY-OTP-CAMERA.md`).
- Live-camera enforcement covers the in-app path only; a rooted device could bypass it.
- IndexedDB can be evicted by the OS. The app requests `navigator.storage.persist()`, but a
  deleted "site data" wipes photos. Phase 3 adds cloud backup.
- Photos are large: a 100-visit month can approach typical browser quotas. Watch this when
  adding uploads.
- Geolocation needs HTTPS in production; localhost is exempt.
- **Employee location is last-known only.** A fix is stored at check-in (start OTP) and sign-off,\n  and only when the device grants GPS. If the manager's device has not synced, it shows the\n  last position stored locally. Live tracking is backlog item #15.\n- Gas pricing exists only for Ansul and Cryptzo in the source tool; other brands need rates.
- The app is single-device until sync lands; the control room shows only local jobs.

## 8. How we verify (definition of "working")

```bash
npx tsc --noEmit      # must be clean (tsc -b does not work here)
npm test              # 37 tests, engine golden values + tier/shift/team helpers
npm run build         # production build + PWA precache
grep -o 'type:"file"' dist/assets/*.js | wc -l   # must print 0
```

Browser smoke test (`npm run dev`): `/`, `/jobs/job_seed_1`, `/estimates/gas`,
`/estimates/quotation`, `/insights`, `/admin`, `/settings` load with no page errors; the OTP
flow unlocks services; the ServiceFlow sheet opens and closes with `Esc`.

Only claim a behaviour is verified if it was exercised in the browser or covered by a test.
Otherwise write "implemented, not yet verified" in the status board.

## 9. Keeping this plan current

This file is maintained by **rules, not by memory**:

1. `AGENTS.md` (root) and `.github/copilot-instructions.md` instruct every AI agent — Copilot,
   Claude, Codex, Cursor, Aider — to read this file before work and update it after.
2. The rule is: **any commit that changes behaviour must change `PLAN.md` in the same commit**
   (status board row, backlog, changelog, and the `Last updated` date).
3. A **pre-commit hook** (`.githooks/pre-commit`, installed with `npm run setup:hooks`) blocks
   any commit that touches `src/` or `supabase/` without staging `PLAN.md`. This is the
   enforcement that works without anyone remembering the rule. Bypass with `--no-verify` only
   for genuinely plan-neutral work.
4. CI (`.github/workflows/ci.yml`) runs typecheck, tests and build on every push, re-checks the
   camera-only invariant, and emits a warning annotation when code changed without `PLAN.md`.
5. When a phase item ships, tick it in §4, move the status row in §2 from `Pending` → `Live`,
   add the evidence, and append a changelog line.
6. When a new idea appears, put it in §5 with a priority and blocker instead of leaving it in
   chat history.
7. Never delete old changelog entries; append.

## 10. Changelog

### 2026-11-02 — Android test build
- Added the Capacitor 8 wrapper (`com.shabh.service`) with camera and location permissions,
  plus `npm run android:sync` / `npm run android:apk`.
- Built a debug APK and exercised it on a Pixel 6 / API 36 emulator: demo sign-in, board with
  shift points, job sheet, start OTP → `59m 59s` left and the 60-minute deadline, services
  unlocked, live camera `readyState 4` at 1392×1856, before photo captured with watermark and
  `GPS ±5 m`.
- Added `scripts/device-test.mjs`, which replays the flow through the WebView CDP socket.
- APK attached to the GitHub release; build outputs stay out of git.

### 2026-11-02 — Shift points + team locator
- Shift target now counts **completed houses**: 1 house = 1 point, inner services do not add.
  Extra houses beyond the target are shown as extra points toward the incentive.
- Confirmed only tier 1 (60 min) and tier 2 (90 min) exist; the tier badge now appears on job
  cards and control-room rows as well as the job sheet.
- Control room gained a **Team** card: on-site status, active visit link, last check-in/sign-off
  position, accuracy and a Google Maps “Locate” link (last fix from this device only).
- Tests 33 → 37 (shift points per house, latest employee ping).
- Verified: `1 / 12 points` after one 5-service house, tier badges on cards, technician still
  blocked from `/admin`, team card resolves the last stored fix and maps link.

### 2026-11-02 — Field operations model v2
- Added employee sign-in (demo directory, route guard, sign-out) and a shift target card
  (services closed today vs 12).
- Customer credit tiers: tier 1 = 60 min, tier 2 = 90 min, set in the control room.
- **Rule change:** the visit clock now starts when the customer's start OTP is verified, not on
  the first photo (`startVisitClock`); `appendServicePhoto` no longer touches the clock.
- Added a second **work-done OTP** that must be verified before a visit can close
  (`workDoneOtpAt`, `CompleteJobSheet`, timeline step).
- Added CCTV, chimney, RO, geyser and meter checklist templates and systems (13 templates).
- Seed board now has seven visits incl. a 5-service CCTV/chimney/RO/geyser/meter house visit.
- Tests 27 → 33 (tier windows, shift counter).
- Fixed the missing-photo placeholder (shows “Photo” instead of an endless “Loading”).
- Verified in the browser: demo sign-in (wrong PIN rejected, two roles), shift card `5 / 12`,
  SH-1051 tier badge `Tier 1 · 60 min`, start OTP → `59m 59s` left with a 60-minute deadline,
  work-done OTP gate → completed visit with `workDoneOtpAt` and late flag, control-room job
  creation `SH-1052` at tier 1 (60 min). `npx tsc --noEmit` clean, 33/33 tests, build ok,
  0 file inputs.

### 2026-11-02 — Repository + plan governance
- Published the app as the private GitHub repo `shabapp` (`main` only).
- Added this `PLAN.md`, `AGENTS.md` (agent rules), `CLAUDE.md` (Claude entrypoint),
  `.github/copilot-instructions.md`, `.github/workflows/ci.yml` (typecheck, tests, build,
  camera-only check, plan-freshness warning) and the `.githooks/pre-commit` plan guard
  (`npm run setup:hooks`).

### 2026-11-02 — Phase 1 complete
- Recovered all four calculators from the live site; 92 SKUs with HSN + GST.
- Built the offline PWA: job board, multi-service visit, OTP gate, live camera proof,
  watermarks, visit clock, checklists, control room, insights, settings.
- Design overhaul: brand tokens, icon set, glass shell, sheets, toasts, skeletons.
- 16-bug audit fixed (completion without template, checklist hydration, duplicate issues,
  geolocation blocking, PWA denylist, nested anchors, numeric input rewrite, rate-card loss,
  code collisions, camera leak, insights window, stale timer row, role gating, confirmations).
- Hardening/perf: error boundary, lazy routes + vendor splitting, idle prefetch, Dexie
  read-write transactions, invalid-date guards, focus-trapped sheets, `useDeferredValue`
  search, SLA/work-limit clamping.
- Verified: gas ₹3,02,596.84; OTP → unlock → ServiceFlow; timer `1h 30m left`; 27/27 tests;
  0 file inputs in the bundle.
