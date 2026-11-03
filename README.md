# Shabh Service

Field service app for Shabh Creations. One employee app with two modules:

1. **Services** — an employee signs in, sees today's visits and a shift target (12 **points**;
   one completed house = 1 point, inner services do not add). The customer's start OTP starts
   the visit clock, live before/after proof is required for every service, then a separate
   **work-done OTP** closes the visit. Customers sit in exactly two credit tiers: tier 1 gets
   a 60-minute visit, tier 2 gets 90 minutes.
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
| Job board, pending counts, today's visits | Live, local-first |
| Multi-service visits (AC, solar, CCTV, chimney, RO, geyser, meter, fire systems) | Live, 13 checklist templates |
| Shift points: 1 per completed house, target 12/day | Live |
| Customer credit tiers: only tier 1 (60 min) and tier 2 (90 min) | Live, badge on every job |
| Visit clock: starts when the start OTP is verified, hard deadline per visit | Live |
| Work-done OTP before the visit can be closed | **Demo** — same local state machine as the start OTP |
| Checklists, issues | Live |
| Live camera capture + burned watermark (before + after per service) | Live |
| BOQ engines (gas, fire alarm, quotation, AMC) | Live, unit-tested |
| Control room (create/assign jobs, pick tier) | Live for this device |
| Team locator: on-site status, last check-in/sign-off fix, Maps link | Live for last-known position |
| About screen + in-app update check (release notes, privacy, notices) | Live |
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
/about               Version, check for updates, release notes, privacy
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
- 84 tests pass: the recovered engine arithmetic (gas stored weight, cylinder step-up, fill
  ceilings, detector rollups, GST totals, AMC visit counts), the visit-clock helpers, credit-tier
  windows, shift points per house, the employee-location helper, version comparison, the
  proof-photo size cap, dashboard search/filters/alerts/points helpers, login validation +
  attempt limiting, PBKDF2 credentials, session expiry and update-manifest validation.
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
- **Shift points:** one completed 5-service house shows `1 / 12 points` — inner services do not
  add points; houses beyond the target appear as extra points toward the incentive.
- **Team locator:** the control room lists each technician with on-site status, active visit and
  the latest check-in/sign-off position (`28.53550, 77.39100` ±18 m) plus a Google Maps link.
- **About & updates:** About shows `Stable v0.2.2`, release notes, privacy, notices and a manual
  update check. On a Pixel 6 the installed v0.2.0 build showed the real “New version available ·
  v0.2.1” on launch, Download opened the APK in Chrome, and Not now suppressed it on the next
  launch. The v0.2.2 APK was installed on the same emulator and reports `Stable v0.2.2`.
- **Profile & login:** the bottom nav has a Profile tab for both roles and the header avatar opens
  it; the profile card shows the full name, `EMP-1042 · Technician`, the shift-target badge and
  sign-out. The redesigned login offers one-tap demo accounts, show/hide PIN, field validation,
  a loading state, a 5-attempt / 30-second lockout with countdown, a forgot-PIN help sheet with
  administrator contact, and a “keep me signed in” toggle that stores the session in
  sessionStorage when unchecked. PINs are verified against a PBKDF2-SHA256 hash with a random
  salt per employee; no plaintext PIN ships in the bundle. A session ends after 12 hours or two
  hours without interaction, and the login screen explains an expired sign-out. Verified in the
  browser: errors render under each field, a wrong PIN reported 4 attempts left, 5 failures
  locked the form with a live countdown, and manual and one-tap sign-in both opened the correct
  role.
- **Operations dashboard:** the jobs screen shows derived alerts (overdue, urgent, new
  assignment), today’s overview (completed / remaining / points with % of target / overdue job),
  a per-job pending-services breakdown, quick actions, a seven-day points chart, the upcoming
  schedule with ETAs and recent job history. The board has search (customer, job ID, location,
  contact, service, status including “overdue”) and Active / Today / Overdue / History / All
  filters. Verified in the browser: “corporate” matched SH-1043, “overdue” matched SH-1042, and
  an unknown term showed the empty state.
- **Security:** verified in the production build that a wrong PIN reports attempts left and the
  correct PIN opens the dashboard through PBKDF2 verification, an expired session redirects to
  the login screen with a notice and clears the store, and the hardened APK loads with the
  security card, no CSP violations and live camera `readyState 4` at 720×1280. The merged
  manifest shows `allowBackup=false` and `usesCleartextTraffic=false`.
- **Low-end pass:** entry JS is 52.6 KB (17.9 KB gzip) including the login screen; the
  dashboard lives in the `JobsScreen` route chunk (26.1 KB / 7.1 KB gzip) and the help sheet is a
  2 KB lazily loaded chunk. Cold start on the Pixel 6 emulator measured **1.09 s**; a captured
  proof photo is now **720×1280 / 18.9 KB** (was 1392×1856 / 53.4 KB). Idle prefetch is skipped
  on devices with ≤4 GB RAM, ≤4 cores or save-data.
- Camera: live capture advanced the flow and stored a watermarked before/after pair.
- Bundle contains zero `type="file"` and zero image-accept inputs.
- Job creation from the control room assigns the next `SH-` code, applies the chosen tier and
  updates pending counts.

## Security

This build is hardened for a demo, not certified for production. The protections that are real:

- **Credentials** — the demo directory stores PBKDF2-SHA256 hashes with a random 16-byte salt
  per employee (`src/domain/auth/credentials.ts`); verification is constant-time and no plaintext
  PIN is shipped or displayed in the app. The demo PIN is documented only in this repository.
  Login is limited to 5 failed attempts per 30-second lockout.
- **Sessions** — a 12-hour hard limit and a 2-hour idle sign-out, a “keep me signed in” choice
  between localStorage and sessionStorage, and a clear reason on the login screen.
- **Content Security Policy** — production builds allow same-origin scripts only, inline styles,
  `data:`/`blob:` images, and the two update-manifest endpoints; objects, base-URI changes and
  form submissions are blocked. The policy is injected only into `dist`, so Vite dev is untouched.
- **Android** — `allowBackup=false`, data-transfer rules exclude app data, cleartext traffic and
  user-installed CAs are rejected, WebView file/content access is off, tapjacking taps are
  filtered, and remote WebView debugging is disabled for release builds.
- **Update channel** — the manifest is validated before use: semver shape, capped notes, and only
  HTTPS links inside `Sidharth7082/shabapp-releases` are accepted. The release script also
  HEAD-probes the advertised APK URL.
- **Camera** — still no file inputs; proof photos come only from `getUserMedia` and are
  watermarked in canvas.

Honest limits: one-tap demo accounts and the on-screen OTP are demo paths; a determined attacker
with control of the device can bypass client-side controls. Production requires Supabase Auth,
server-side OTP, a signed release APK and an HTTPS host with security headers. See
`docs/SECURITY-OTP-CAMERA.md`.

## Performance & resilience

- **Route-level code splitting:** every screen is `lazy()` behind a `Suspense` skeleton.
  Measured build: entry `index` 52.6 kB (17.9 kB gzip), vendors split into `react` 206 kB
  (67.5 kB gzip) and `data`/Dexie 100.8 kB (33 kB gzip); jobs/dashboard 26.1 kB, job detail
  38.2 kB, estimate tools 10–28 kB, and the login help sheet is a 2 kB lazy chunk.
- **Idle prefetch:** after first paint the secondary chunks (estimate hub, insights, control
  room, settings, About) are warmed with `requestIdleCallback` on capable devices, so the first
  tap shows the screen rather than a skeleton (measured 53 ms in dev). Skipped on `saveData`,
  ≤4 GB memory or ≤4-core devices.
- **Typing stays responsive:** catalog search runs against a `useDeferredValue` term, and all
  engine results (gas, fire alarm, quotation, AMC, insights) are `useMemo`-derived.
- **Writes are atomic:** taking a photo and finishing a service run inside Dexie read-write
  transactions, so two quick captures cannot overwrite each other's photo lists.
- **Bad data cannot crash a screen:** invalid dates render nothing instead of `NaN`, a missing
  photo blob falls back to a placeholder, and the whole tree sits inside an `ErrorBoundary`
  with Reload / Try again / Settings actions.
- **PWA:** `navigator.storage.persist()` is requested so IndexedDB job and photo data is not
  evicted; the service worker precaches 35 assets (600 kB) for full offline use (the APK ships a
  self-destroying service worker instead, so app updates never serve stale JS).
- **Modal a11y:** sheets trap Tab focus, focus the panel on open, close on `Escape`, lock body
  scroll, and restore focus to the trigger.
- PWA build precaches 35 assets; `npx tsc --noEmit` and all 84 tests pass after the pass.

## Android app (test build)

```bash
npm run android:apk    # web build + cap sync + debug APK
# android/app/build/outputs/apk/debug/app-debug.apk
$ANDROID_HOME/platform-tools/adb install -r android/app/build/outputs/apk/debug/app-debug.apk
```

- Capacitor 8 wrapper, package `com.shabh.service`, served from `https://localhost`.
- Declares `CAMERA`, `ACCESS_FINE_LOCATION` and `ACCESS_COARSE_LOCATION`; the WebView is the
  same camera-only bundle as the PWA (no file pickers).
- **Verified on a Pixel 6 / API 36 emulator:** sign-in, board with shift points, job sheet,
  start OTP (`59m 59s` left, deadline set from tier 1), services unlocked, live camera
  (`readyState 4`, 720×1280), before photo captured with watermark and `GPS ±5 m`; About screen
  and the launch update prompt (Download / Not now) were exercised on the same device. The
  redesigned login and Profile tab, a 1.09 s cold start and a 720×1280 proof photo were verified
  on the same emulator.
- `node scripts/device-test.mjs` replays the flow over the WebView CDP socket:
  `adb forward tcp:9222 localabstract:webview_devtools_remote_<pid>`.
- Latest APK: https://github.com/Sidharth7082/shabapp-releases/releases/latest (binaries are not
  committed to this repository).

## Releases & updates

- Installed apps check
  `https://raw.githubusercontent.com/Sidharth7082/shabapp-releases/main/update.json` on every
  launch (override with `VITE_UPDATE_URL`). A newer `version` opens **“New version available”**
  with the release notes and **Download update / Not now**; **About → Check for updates**
  rechecks on demand.
- Ship a build only through the release command:

  ```bash
  npm run release -- --patch --notes "Fixed: ..." --notes "New: ..."
  ```

  It bumps `package.json`, writes `public/update.json`, builds the APK, publishes the APK and
  manifest to the public `shabapp-releases` repository (binaries only, source stays private),
  appends the changelog and commits/pushes. CI fails if the version and manifest disagree.
- Full protocol: `docs/RELEASE-UPDATES.md` and `PLAN.md` §11.

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
