# Shabh Service — Living Plan

> **Read this file first.** It is the single source of truth for what this app is, what is
> finished, what is next, and what must never break. Every AI agent and contributor updates
> this file in the same change as the code. A task is **not done** until this plan matches
> reality. Protocol: [Keeping this plan current](#9-keeping-this-plan-current).

- **Last updated:** 2026-11-03
- **Stage:** Phase 1 complete — production-ready offline PWA. Phase 2 (real OTP + multi-device
  sync) is next and is blocked on credentials.
- **Health:** `npx tsc --noEmit` clean · `npm test` 85/85 pass · `npm run build` ok
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
| Job board and dashboard | **Live** | Board with customer, location, services, priority and status; search by customer / job ID / location / status; Active / Today / Overdue / History / All filters; “Needs attention” alerts (overdue, urgent, new assignment); today’s overview with points % and overdue job; pending-services breakdown by job; quick actions; upcoming schedule; recent history. Verified in the browser on seeded and created jobs |
| Employee sign-in with employee ID + PIN | **Demo** | Verified: field validation (ID format, PIN length), PBKDF2 verification (wrong PIN shows attempts left), 5 failures lock for 30 s with a countdown, loading state, show/hide PIN, forgot-PIN help sheet, one-tap demo accounts, “keep me signed in” (localStorage vs sessionStorage) and a 12 h / 2 h idle session expiry. Still a demo — production is Supabase Auth |
| Shift points: 1 per completed house, target 12/day | **Live** | Verified: one 5-service house showed `1 / 12 points`; extra houses are shown as extra points |
| Customer credit tiers: only tier 1 (60 min) and tier 2 (90 min) | **Live** | Tier badge on job cards, job sheet and control-room rows; verified SH-1051 as tier 1 |
| Multi-service visit (AC, solar, CCTV, chimney, RO, geyser, meter, fire systems) | **Live** | 13 checklist templates; SH-1051 holds CCTV, chimney, RO, geyser and meter |
| Start OTP gate before work | **Demo** | Verified: code issued, services locked until verify, `otpVerifiedAt` recorded |
| Visit clock: starts when the start OTP is verified, per-visit deadline, late flag | **Live** | Verified on SH-1051: `startedAt`/`workDueAt` exactly 60 min apart, timer `59m 59s`, deadline `10:04 pm` |
| Work-done OTP required to close the visit | **Demo** | Verified: footer blocked until the second code; verify set `workDoneOtpAt`; visit closed with sign-off and `completedLate` flagged |
| Team locator (last known position) | **Live (last fix only)** | Control room shows on-site status, active visit, latest check-in/sign-off fix and a Maps link; live tracking needs Phase 2 |
| Android app (debug APK) | **Live for testing** | Capacitor 8, `com.shabh.service`; verified on Pixel 6 / API 36: sign-in, OTP clock `59m 59s`, live camera 720×1280, photo + watermark + GPS ±5 m |
| About screen | **Live** | Verified on device (v0.2.3): About shows `Stable v0.2.3`, the v0.2.3 security notes, Privacy, Third-party notices, website and the proprietary footer |
| Profile & settings | **Live** | Verified on device: Profile tab in the nav, header profile button, full name + `EMP-1042 · Technician`, target badge, sign-out, About & updates, admin control room. Security card lists the session deadline and device protections |
| Security hardening | **Live** | Demo PINs are PBKDF2-SHA256 hashes with per-employee salts and the demo PIN is not displayed in the app (only in repo docs), sessions expire after 12 h / 2 h idle, production CSP is same-origin scripts only, Android blocks cleartext + user CAs with backups off and WebView file access off, and the update manifest allows only HTTPS release-repo URLs. Verified in the production preview and on the APK (hashed login, Security card, live camera readyState 4). The demo one-tap accounts and on-device OTP remain demo-only |
| Low-end performance | **Live** | Entry JS 52.6 KB (17.9 KB gzip); dashboard lives in the 26.1 KB `JobsScreen` route chunk, help sheet is a 2 KB lazy chunk; cold start **1.09 s** on the Pixel 6 emulator; proof photo **720×1280 / 18.9 KB** vs old 1392×1856 / 53.4 KB; update check deferred to idle; prefetch skipped on ≤4 GB / ≤4-core / save-data devices |
| Phone layout | **Live** | Verified on device: login (quick accounts, show/hide PIN) and settings fit without cropping; 4-tab technician nav and 5-tab manager nav (73 px each on a 390 px viewport). Dashboard, login and help sheet re-checked at a 320 px-wide viewport in the browser with no horizontal overflow |
| In-app update check | **Live** | Verified on device: installed v0.2.0 showed the real “New version available · v0.2.1” with release notes, Download opened the APK in Chrome, Not now suppressed it on relaunch; installed v0.2.2 reports `Stable v0.2.2` on About |
| Live camera capture + burned watermark (before + after per service) | **Live** | Zero file inputs in the bundle (CI-checked) |
| Checklists with Pass / Fail / N/A, issue capture | **Live** | Re-opening a service restores 9/9 states |
| Completion sign-off + rating | **Live** | Blocked until every service is done |
| Gas suppression engine (NFPA 2001) | **Live** | 5×4×3 m Novec Class C + 10 m run = 42.0 kg, 80 L Ansul, ₹3,02,596.84 |
| Fire alarm engine (NFPA 72) | **Live** | Detector/MCP/hooter/module/cable rollups, brand panels |
| Quotation builder (92 SKUs, HSN, GST) | **Live** | 3-line sample: subtotal ₹68,169.70 → total ₹80,440.25 |
| AMC / CMC quote | **Live (scope) / Pending (rates)** | No published rates; editable rate card persisted locally |
| Insights (time on site, completion, SLA health) | **Live for this device** | Future-scheduled jobs excluded from "planned" |
| Control room (create / assign / delete) | **Live for this device** | Admin-only route, delete confirmations |
| Offline PWA, service-worker precache | **Live** | 35 assets / 568 kB precache (web build); native builds emit a self-destroying SW instead |
| Supabase schema, RLS, OTP edge functions | **Pending** | Migration + function code written, never deployed |
| Real OTP delivery (SMS/WhatsApp) | **Pending** | Blocked on Supabase project + MSG91 DLT template |
| Multi-device sync (outbox, conflict policy) | **Pending** | Contract in `docs/SYNC-CONTRACT.md` |
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
4. **Late is flagged, never blocked.** `completeJob` sets `completedLate`; technicians can
   always finish and report the truth.
5. **Unpriced items are flagged "Rate required"**, never shown as ₹0.
6. **Estimates are preliminary.** Every estimate screen keeps the "rough estimation, not a
   final engineered BOQ" disclaimer.
7. **OTP is demo-only until Phase 2 lands.** Never describe it as secure.
8. **Geolocation / address lookups are fire-and-forget.** A denied permission must never
   block OTP verification or job completion.
9. **All job mutations that touch services are transactional** (`db.transaction('rw', db.jobs…)`).
10. **Every build ships through `npm run release`.** Never hand-publish an APK: the release
    script bumps the version, builds, uploads the APK, updates the public manifest and the
    changelog. That manifest is what makes installed apps show **“New version available”** with
    notes and a Download button on their next launch. See §11.
11. **No plaintext credentials or secrets in the bundle.** Demo PINs are PBKDF2 hashes and only
    the demo directory may be local; real credentials belong in Supabase Auth. Never commit
    `.env`, keys, tokens or customer data. Validate anything fetched from the network (the
    update manifest is restricted to HTTPS links in the release repository).
12. **Stay light for low-end phones.** No new eager dependency; keep the entry bundle within
    budget, cap proof photos at 1280 px, and gate idle prefetch on device memory / save-data.

## 4. Phases

### Phase 0 — Research ✅
- [x] Recover the four calculators' formulas/constants from the live WordPress site
- [x] Recover the 92-SKU catalog, HSN mapping and GST treatment
- [x] Document payloads in `docs/REA-spec.md`

### Phase 1 — Offline employee app ✅
- [x] Vite + React + TS + Tailwind design system (brand green, ink/surface, 48 px taps)
- [x] Dexie data model for jobs, services, photos, estimates, settings
- [x] Employee sign-in (demo directory) with route guard and sign-out
- [x] One-tap demo sign-in, compact phone layout, show/hide PIN
- [x] Login hardening: field validation, attempt limit + lockout countdown, loading state, forgot-PIN help sheet, session remember toggle
- [x] Dashboard: needs-attention alerts, today’s overview with points percentage, pending breakdown by job, search + filters, quick actions, upcoming schedule, recent history
- [x] Profile tab in the bottom nav + header profile button; profile card with employee ID and target
- [x] Low-end pass: deferred update check, gated prefetch, 1280 px photos, unused dependencies removed
- [x] Security pass: PBKDF2 PIN hashes, 12 h / 2 h idle session expiry, production CSP, HTTPS-only Android policy, backups off, WebView hardening, update-manifest allowlist
- [x] Native builds use a self-destroying service worker so an APK update never serves stale JS
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
- [x] 85 engine/helper tests, PWA build, offline precache
- [x] Accessibility pass: focus-trapped sheets, labels, reduced motion, 48 px targets
- [x] Hardening: error boundary, lazy routes, transactions, invalid-date guards
- [x] Performance: route splitting (`react` 206 kB / `data` 101 kB vendors, entry 42.5 kB),
      deferred update prompt, gated idle prefetch, deferred catalog search

### Phase 2 — Production backend 🔜 (next)
- [ ] Create Supabase project and apply `supabase/migrations/0001..0003`
- [ ] Supabase Auth for employees; `profiles` row carries role + daily target
- [ ] Two OTP purposes server-side (`start`, `complete`), gated by job state
- [ ] Deploy `send-otp` / `verify-otp` edge functions
- [ ] Server-side PIN reset and session refresh tokens (replace the demo attempt counter)
- [ ] Configure MSG91 (or WhatsApp Cloud API) secrets + DLT template for India
- [ ] Remove `demoCode` from the client path; server-side attempts/rate limits/expiry audit
- [ ] Auth: technician + manager accounts, row-level security smoke test on real data
- [ ] Sync engine per `docs/SYNC-CONTRACT.md`: outbox table, retry/backoff, conflict policy
- [ ] Photo upload to Supabase Storage with local queue + resumable retry
- [ ] Realtime job assignment (manager creates → technician device updates)

### Phase 3 — Android + field readiness
- [x] Capacitor wrapper, app id `com.shabh.service`, camera + location permissions
- [x] Debug APK built and exercised on a Pixel 6 / API 36 emulator (login, OTP clock, live camera, capture)
- [x] About screen (version, release notes, privacy, third-party notices) and in-app update check
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
| 16 | Move the update manifest/APK to company-controlled storage (Supabase or shabhcreations.com) | P2 | User to provide storage | 0.5 day |
| 17 | Signed release APK + screen-capture protection (`FLAG_SECURE`) | P1 | Release keystore / Play Console account | 0.5 day |

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
7. **Update hosting** — the manifest and APK currently live in the public `shabapp-releases`
   repository (binaries only, source stays private). Confirm this is acceptable or provide
   company storage for Phase 3+.

## 7. Known limitations / risks

- OTP is client-generated today; anyone with the device can read the code. Documentation says
  so explicitly (`docs/SECURITY-OTP-CAMERA.md`).
- Live-camera enforcement covers the in-app path only; a rooted device could bypass it.
- IndexedDB can be evicted by the OS. The app requests `navigator.storage.persist()`, but a
  deleted "site data" wipes photos. Phase 3 adds cloud backup.
- Photos are large: a 100-visit month can approach typical browser quotas. Watch this when
  adding uploads.
- Geolocation needs HTTPS in production; localhost is exempt.
- **Employee location is last-known only.** A fix is stored at check-in (start OTP) and sign-off,
  and only when the device grants GPS. If the manager's device has not synced, it shows the last
  position stored locally. Live tracking is backlog item #15.\n- Gas pricing exists only for Ansul and Cryptzo in the source tool; other brands need rates.
- The app is single-device until sync lands; the control room shows only local jobs.
- **Client-side hardening has limits.** Hashed PINs, the attempt counter and session expiry stop
  casual access, but someone who controls the device or its storage can still tamper. Real
  guarantees need server-side auth and OTP (Phase 2) and a signed release build.
- **The demo paths are intentional.** One-tap demo accounts and the on-screen demo OTP bypass the
  PIN flow; remove them before production use.
- **CSP is delivered as a meta tag.** Hosts must send `frame-ancestors`/HSTS headers for those;
  the APK serves local content only. Release APKs are debug-signed until a production keystore is
  configured.

## 8. How we verify (definition of "working")

```bash
npx tsc --noEmit      # must be clean (tsc -b does not work here)
npm test              # 85 tests, engine golden values + tier/shift/team/version/capture/dashboard/login/session/credentials/update-manifest helpers
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

### 2026-11-03 — Release manifest guard
- Added a test that runs the shipped `public/update.json` through the manifest validator, so a
  release the app would reject now fails CI. 85 tests.

### 2026-11-03 — Release v0.2.3
- Security: demo PINs are now salted PBKDF2 hashes and the demo PIN is no longer shown in the app.
- Sessions expire after 12 hours, or 2 hours without interaction, with a clear sign-in notice.
- Production builds enforce a strict content security policy and HTTPS-only Android network policy.
- Android backups and WebView file access are disabled, tapjacking taps are filtered and remote debugging is off in release builds.
- Update downloads are validated against the official release repository before opening.
- Camera, dashboard and OTP flows are unchanged; 84 tests pass.

### 2026-11-02 — Release v0.2.2
- Operations dashboard: alerts, today's overview with points % of target, pending services by job, quick actions, seven-day points chart, upcoming schedule and job history.
- Search the service board by customer, job ID, location or status; filter Active / Today / Overdue / History / All.
- Login: field validation, loading state, 5-attempt/30-second lockout, forgot-PIN help with administrator contact and keep-me-signed-in.
- Brand mark on login, header and update sheet; the help sheet loads on demand.
- Dashboard stays in the JobsScreen route chunk; 68 tests pass.

### 2026-11-03 — Security hardening
- Demo PINs are PBKDF2-SHA256 hashes with a random salt per employee; no plaintext PIN ships in
  the bundle, verification is constant-time, and unknown IDs still pay the hashing cost.
- Sessions now expire after 12 hours and after 2 hours without interaction; the login screen
  explains an expired sign-out and Settings shows when the session ends.
- Production builds carry a strict CSP (same-origin scripts, allowlisted update endpoints, no
  objects/forms) and a no-referrer policy.
- Android: backups and data transfer disabled, cleartext traffic and user-installed CAs
  rejected, WebView file/content access off, tapjacking filter on, remote debugging off in
  release builds.
- The update manifest is validated (semver, note caps, HTTPS release-repo-only links) before the
  app shows or opens anything.
- Settings has a Security card with the protections and the demo limits; 84 tests pass.

### 2026-11-03 — Dashboard depth + login hardening
- Job board now carries the operational dashboard: needs-attention alerts (overdue, urgent,
  new assignment), today’s overview (completed / remaining / points with % of target / overdue
  job), pending services broken down per job, quick actions, points & performance with a
  seven-day chart, upcoming schedule with ETAs and recent job history.
- Search covers customer, job ID, location, contact, service and status (including “overdue”);
  filters are Active / Today / Overdue / History / All. Verified in the browser: “corporate”
  matched SH-1043, “overdue” matched SH-1042, an unknown term showed the empty state.
- Login: field-level validation, loading state, attempt limit with a 30 s lockout and countdown,
  forgot-PIN help sheet with administrator contact, demo vs production separation, a real brand
  mark, and a “keep me signed in” toggle (sessionStorage when off).
- New pure helpers `domain/jobs/dashboard.ts` and `domain/auth/login.ts` with 24 tests (68 total).

### 2026-11-02 — Release v0.2.1
- New Profile tab and header profile button: settings and profile are always reachable.
- Redesigned login with one-tap demo accounts, show/hide PIN and a compact phone layout.
- Performance: 1.09 s cold start, deferred update check, low-end prefetch gating and 1280 px proof photos.
- Fixed stale JavaScript after an APK update by removing the caching service worker from native builds.

### 2026-11-02 — Release asset fix (v0.2.1)
- The v0.2.1 manifest advertised `shabh-service-debug.apk` while the release script uploaded
  `shabh-service-0.2.1.apk`, so the download 404'd. Re-uploaded the APK under the stable name;
  the script now fails a release if the advertised URL is not reachable.
- Download URLs carry `?v=<version>` so a cached negative response cannot outlive an upload
  (observed on GitHub's CDN during this release).

### 2026-11-02 — About screen + in-app updates (v0.2.0)
- Added the About screen (version, build date, What’s new, Privacy policy, Third-party
  notices, website) and a Settings link; the app is labelled proprietary, not open source.
- Added the launch update check: a branded “New version available” sheet with release notes and
  Download update / Not now; Not now remembers that version; About → Check for updates rechecks
  on demand. The manifest is read through GitHub’s uncached contents API with a raw fallback.
- Created the public, source-free `shabapp-releases` repository for the APK and `update.json`.
- Added `scripts/release.mjs` (`npm run release -- --patch --notes "..."`), which bumps the
  version, builds, publishes the APK and manifest, and updates this changelog; CI now fails if
  `package.json` and `public/update.json` disagree.
- Phone layout fixes: OTP is the first card under the job header, the “finish more services”
  bar only appears when the visit can be closed, the login screen is compact, and the shell has
  extra bottom padding.
- Tests 37 → 41 (version comparison).
- Verified: desktop About shows v0.2.0/no prompt, manual check “latest”; Pixel 6 / API 36 showed
  the v0.2.2 QA prompt on an installed v0.2.0 build, Download opened Chrome with the APK URL,
  Not now suppressed the prompt after relaunch.

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

## 11. Release & update protocol (never skip)

- Ship every build with **`npm run release -- --patch --notes "..."`** (or `--minor` /
  `--version`). It bumps the version, builds the APK, publishes it to the public
  `Sidharth7082/shabapp-releases` repository, updates `update.json`, appends the changelog and
  commits/pushes.
- The installed app checks that manifest on **every launch** and shows **“New version
  available”** with the notes and **Download update / Not now**. **About → Check for updates**
  rechecks on demand.
- `package.json`, `public/update.json` and the published manifest must always carry the same
  version; CI fails otherwise.
- Never hand-publish an APK or hand-edit `update.json`. Full details:
  **`docs/RELEASE-UPDATES.md`**.

