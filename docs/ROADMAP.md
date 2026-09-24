# Roadmap

## Shipped (not originally planned as phases, built ad hoc)

- [x] Light/dark theme toggle (settings panel), with system-preference auto-detect on first load and `localStorage` persistence
- [x] Checklist feature: shopping lists (auto-priced items, running sum) and task lists (checkboxes with animation), both persisted to `localStorage`
- [x] Schedule export as JPG/PDF from the settings panel (`html2canvas` + `jsPDF`) — works in real browsers; **does not work in the Web2APK Android wrapper**, see [DEPLOYMENT.md](DEPLOYMENT.md) for why. One more reason to prioritize the PWA/hosting work below over patching the native wrapper.
- [x] Redesigned sidebar/drawer navigation (rotating hamburger, expanding colored panel, submenus for Órarend/Kötelező tárgyak/Rögzített időpont nélkül/Kritérium)
- [x] A friend's schedule ("Zoli órarend") as a second timetable alongside your own, sharing the same day/week rendering
- [x] "Teremkereső" room search — a from-scratch, own-design reimplementation of `u-szeged.hu/teremkereso`'s room lookup, with an embedded-map toggle. Originally scoped to just the rooms your own classes use, later expanded to the full university database (~775 rooms) once the user wanted coverage across their whole degree, not just the current semester (see `CLAUDE.md`)
- [x] Course action sheet: tap a class card → "Terem keresése" jumps straight to that room in Teremkereső, pre-filtered
- [x] Workspace cleanup: `ROADMAP.md`/`DEPLOYMENT.md`/`TODO.md` moved into `docs/` (root now holds only what GitHub/Claude Code expect there); schedule data extracted out of `js/script.js` into `schedule_data/*.json` (see Phase 2 below)
- [x] Modular architecture (`modules/<name>/`, `registerModule()`) and a first module: `modules/tanterv-module/`, a curriculum planner (credit tracking, specialization picker, prerequisites, plus a testnevelés/szabadon-választható/kötelezően-választható requirements panel) — see `CLAUDE.md`'s module-convention notes
- [x] Account sync, Phase 1 (`js/sync.js`, `window.Sync`, Supabase): real sign-in (email+password, one pre-provisioned account, no public sign-up yet) and cross-device sync for theme, checklists, and Tanterv progress — reuses the exact `{load,save,refresh}` contract `Tanterv.hybridStore()` already defined. Works fully offline/unauthenticated exactly as before; sync is additive. See `CLAUDE.md`'s "Account sync" note and `supabase/schema.sql`.

## Phase 1 — PWA conversion & hosting

- [x] Split `index.html` into `index.html`, `css/style.css`, `js/script.js` — also moved `icon.png` → `assets/icon.png` and the raw Neptun exports → `data/` while at it
- [x] Add `manifest.json` (name, icons, theme color `#20242e`, background `#ffffff`, `display: standalone`) — this is what makes "Add to Home screen" on Android launch the app chromeless (no address bar/browser UI) instead of a bookmark shortcut
- [ ] Add `service-worker.js` caching the app shell for full offline support
- [x] Generate PWA icon sizes (192x192, 512x512, maskable) from `assets/icon.png` — upscaled from the 100x100 source since that's all that exists; fine for a flat vector-style icon, but a genuinely higher-res source would sharpen these if one ever turns up
- [x] Deploy to Vercel; point custom domain `orarend.szaszroland.hu` at it — **live and working**, but **not yet locked down** (Cloudflare Access still needs setting up — see [DEPLOYMENT.md](DEPLOYMENT.md), this is the actual priority right now, not a documentation afterthought)
- [ ] Retire the `android/` Web2APK output once the installable PWA replaces it — also resolves the export/download limitation noted above, since an installed PWA runs through a real browser engine

## Phase 2 — Data management & dynamic updates

- [x] Move the hardcoded `EV`/`ONLINE`/`CODES`/`ZOLI_EV`/`ROOMS` arrays out of the script into JSON files (`schedule_data/*.json`, fetched via `fetchLocal()`) — done directly as static JSON, no backend needed for a single-user app. Updating each semester now means editing those files, not `js/script.js`.
- [x] **Real login gate + schedule/course data moved into Supabase, RLS-protected** (supersedes the old "password-protected admin page" idea below — real per-user auth already existed from Phase 1, see "Shipped" above). `EV`/`ONLINE`/`ZOLI_EV`/`CODES` and every `course_data/<slug>.json` doc now live in the `user_data` table (reusing Phase 1's schema, no new table) instead of static files; `schedule_data/rooms.json` stays static/public (not personal). The app shows nothing — no login-screen flash, no data fetch — until `Sync.ready` resolves; signed out shows only `#loginScreen`. Old files kept in git as reference, excluded from deployment via `.vercelignore`. Editing going forward is Supabase's own Table Editor, not the old files (see `CLAUDE.md`'s schedule-data note) — a from-scratch in-app admin/upload editor was considered and explicitly not built, in favor of the simpler existing-dashboard workflow.
- [ ] ~~Optional: a small password-protected admin page for editing the schedule JSON directly~~ — superseded by the item above (real accounts + RLS, not a shared password)
- [ ] The login screen is intentionally unstyled/minimal (functional sample only) — a real design pass is still open
- [ ] "Zoli órarend" is still a global `NAV_LINKS` entry, not yet conditional on the signed-in account specifically — fine for the current one-account reality, would matter if a second account ever existed
- [ ] No in-app editor for the now-Supabase-hosted schedule/course data (by choice, see above) — revisit if hand-editing via Supabase's Table Editor turns out to be painful

## Phase 3 — Advanced PWA features

- [ ] Push notifications (Web Push API) for cancellations, room changes, daily reminders
- [ ] "Add to calendar" (Google/Apple) button per class

## Status

_Last updated 2026-09-09._ **The app is live at `orarend.szaszroland.hu`** (Rackhost → Cloudflare → Vercel, all connected) — but **Cloudflare Access is not set up yet, so the site is currently public**, not restricted to personal use like the project intends. That's the actual next priority, ahead of manifest/service-worker/PWA work. Repo is public on GitHub: [github.com/szasz-roland/UniPathway](https://github.com/szasz-roland/UniPathway). Schedule data now lives in `schedule_data/*.json`, not hardcoded in `js/script.js` (see Phase 2 above). See [DEPLOYMENT.md](DEPLOYMENT.md) for exact live status.
