# AGENTS.md — read this before touching the code

This repository is worked on by humans and by different AI agents. **`PLAN.md` is the shared
memory.** Follow the protocol below so any agent can pick up exactly where the last one stopped.

## 1. Start here (mandatory)

1. Read **`PLAN.md`** — product goal, status board, phases, backlog, blockers, open questions,
   golden rules, changelog.
2. Skim **`docs/`** for recovered formulas and the OTP/camera security model.
3. Then read the specific files you intend to change.

Do not re-derive the architecture from scratch and do not guess at recovered constants.

## 2. Keep the plan current (mandatory, not optional)

Any change in behaviour must update `PLAN.md` **in the same commit**:

- Flip the matching row in **§2 Status board** (`Pending` → `Live`, or `Live` → `Broken`),
  with evidence ("verified on SH-1042", "106/106 tests", screenshot/route).
- Tick or add items in **§4 Phases** and **§5 Backlog** (priority + blocker).
- Append a dated line to **§10 Changelog** (never edit old lines).
- Update the **`Last updated`** date at the top.

A **pre-commit hook** enforces this: `npm run setup:hooks` sets `core.hooksPath` to
`.githooks`, and any commit touching `src/` or `supabase/` without staging `PLAN.md` is
blocked with an explanatory message. Do not bypass it with `--no-verify` unless the change is
plan-neutral (docs, config, formatting).

If something is implemented but not exercised in a browser or covered by a test, write
"implemented, not yet verified" — do not claim it works.

If you finish a session mid-task, leave the plan describing the exact next step, including
file paths, so the next agent does not have to search.

## 3. Definition of done

A task is done only when all of these are true:

- [ ] `npx tsc --noEmit` is clean
- [ ] `npm test` passes (add a test for any new engine/helper logic)
- [ ] `npm run build` succeeds and the PWA precache is generated
- [ ] `grep -o 'type:"file"' dist/assets/*.js | wc -l` prints `0`
- [ ] The affected screen was opened in a browser with no page errors
- [ ] `PLAN.md` matches what you just did (status row + changelog + date)
- [ ] If you changed the Android app, it was tested on a device/emulator and shipped through
      `npm run release` (see §9)

## 4. Golden rules

1. **Camera only.** Never add `<input type="file">`, gallery pickers or drag-drop uploads for
   proof photos. Capture path: `src/features/camera/CameraCapture.tsx` (getUserMedia → canvas →
   `watermark.ts`).
2. **The visit clock starts when the customer's start OTP is verified**, not on the first photo.
   See `startVisitClock` in `src/services/jobs.ts`; the window comes from the customer's credit
   tier (tier 1 = 60 min, tier 2 = 90 min).
3. **A visit needs two OTPs:** the start code unlocks the services and starts the clock; the
   work-done code is required before `CompleteJobSheet` can close the job.
4. **Late is flagged, never blocked.** Technicians can always finish a visit.
5. **Never show ₹0 for an unpriced SKU** — show "Rate required".
6. **Every estimate keeps the preliminary disclaimer.**
7. **OTP and login in this repo are demos.** Never describe them as secure; production path is
   Supabase Auth + edge functions + MSG91/WhatsApp.
8. **Geolocation is fire-and-forget.** Never await it in a completion or OTP path.
9. **Job/service mutations are transactional** (`db.transaction('rw', db.jobs, …)`).
10. **Stay light for low-end phones.** No new eager dependency; keep the entry bundle within
    budget, cap proof photos at 1280 px, and gate idle prefetch on device memory / save-data.

## 5. Commands

```bash
npm install
npm run setup:hooks   # installs the PLAN.md pre-commit guard (run once per clone)
npm run dev            # http://127.0.0.1:5173
npx tsc --noEmit       # typecheck (tsc -b fails: no composite project)
npm test               # 106 engine/helper tests
npm run build          # tsc --noEmit && vite build (PWA precache)
npm run android:apk    # build + cap sync + Android debug APK
npm run release        # ship a build: version + APK + update manifest + changelog
node scripts/device-test.mjs   # replay the visit flow inside the installed app (needs adb + CDP)
node scripts/make-icons.mjs   # regenerate placeholder icons
```

## 6. Where things live

| Path | Purpose |
| --- | --- |
| `src/domain/{gas,fireAlarmBoq,quotation,amc,jobs,shared}` | Pure logic, no React. Do not import UI here. |
| `src/data/catalog.ts` | 92 SKUs recovered from the live quotation builder |
| `src/db/{db,seed}.ts` | Dexie schema + six demo jobs, `resetDemoData` |
| `src/services/{jobs,otp,session}.ts` | Mutations, OTP state machine, profile store |
| `src/features/{jobs,admin,estimates,insights,camera,settings}` | Screens |
| `src/components/{ui,layout}` | Design-system primitives and app shell |
| `supabase/migrations`, `supabase/functions/{send-otp,verify-otp}` | Phase 2 backend, not deployed |
| `docs/` | REA spec, security model, data model, sync contract |
| `PLAN.md` | **Source of truth** |

## 7. Conventions and gotchas

- TypeScript strict, path alias `@/` → `src/`. Tailwind tokens live in `tailwind.config.js`;
  use existing tokens (`brand-*`, `ink*`, `surface*`, `ok/warn/danger/info`) instead of new hex
  values. Ticking numbers get the `tabular` class.
- JSX text does **not** process `\uXXXX` escapes — use real characters or `{'…'}`.
- `tsc -b` fails in this project; always use `tsc --noEmit`.
- Role gating: technicians must not see `/admin`.
- Keep bundles small: screens are lazy-loaded in `src/router.tsx`; heavy logic stays in
  `src/domain` and is unit tested.

## 8. Git

- `main` is the only branch. Commit messages: `feat:`, `fix:`, `perf:`, `docs:`, `chore:`.
- Never commit `.env`, `node_modules`, `dist`, keys or customer data.
- A commit that changes behaviour without updating `PLAN.md` is incomplete.

## 9. Releases & updates (never skip)

- Ship every build with **`npm run release -- --patch --notes "..."`** (or `--minor` /
  `--version`). It bumps the version, builds the APK, publishes it to the public
  `Sidharth7082/shabapp-releases` repository, updates `update.json`, appends the changelog and
  commits/pushes. Never hand-publish an APK or hand-edit `public/update.json`.
- The installed app checks the public manifest on **every launch** and shows **“New version
  available”** with the release notes and **Download update / Not now**; About → Check for
  updates rechecks on demand. This is a product requirement.
- `package.json` and `public/update.json` must always carry the same version — CI enforces it.
- Full protocol: `docs/RELEASE-UPDATES.md` and `PLAN.md` §11.
