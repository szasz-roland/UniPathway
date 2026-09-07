# Roadmap

## Shipped (not originally planned as phases, built ad hoc)

- [x] Light/dark theme toggle (settings panel), with system-preference auto-detect on first load and `localStorage` persistence
- [x] Checklist feature: shopping lists (auto-priced items, running sum) and task lists (checkboxes with animation), both persisted to `localStorage`
- [x] Schedule export as JPG/PDF from the settings panel (`html2canvas` + `jsPDF`) — works in real browsers; **does not work in the Web2APK Android wrapper**, see [DEPLOYMENT.md](DEPLOYMENT.md) for why. One more reason to prioritize the PWA/hosting work below over patching the native wrapper.
- [x] Redesigned sidebar/drawer navigation (rotating hamburger, expanding colored panel, submenus for Órarend/Kötelező tárgyak/Rögzített időpont nélkül/Kritérium)
- [x] A friend's schedule ("Zoli órarend") as a second timetable alongside your own, sharing the same day/week rendering
- [x] "Teremkereső" room search — a from-scratch, own-design reimplementation of `u-szeged.hu/teremkereso`'s room lookup, scoped to just the rooms your own classes use (not the full university database), with an embedded-map toggle
- [x] Course action sheet: tap a class card → "Terem keresése" jumps straight to that room in Teremkereső, pre-filtered

## Phase 1 — PWA conversion & hosting

- [ ] Split [index.html](index.html) into `index.html`, `style.css`, `script.js`
- [ ] Add `manifest.json` (name, icons, theme color `#20242e`, background `#ffffff`, `display: standalone`)
- [ ] Add `service-worker.js` caching the app shell for full offline support
- [ ] Generate PWA icon sizes (192x192, 512x512, maskable) from `icon.png`
- [ ] Deploy to Vercel; point custom domain `orarend.szaszroland.hu` at it — see [DEPLOYMENT.md](DEPLOYMENT.md) for live progress (currently blocked on `.hu` registry status)
- [ ] Retire the `android/` Web2APK output once the installable PWA replaces it — also resolves the export/download limitation noted above, since an installed PWA runs through a real browser engine

## Phase 2 — Data management & dynamic updates

- [ ] Move the hardcoded `EV`/`ONLINE`/`CODES`/`ZOLI_EV`/`ROOMS` arrays out of the script into a JSON file (or a lightweight backend — Supabase/Firebase) so the schedule can change without a code deploy
- [ ] Optional: a small password-protected admin page for editing the schedule JSON directly

## Phase 3 — Advanced PWA features

- [ ] Push notifications (Web Push API) for cancellations, room changes, daily reminders
- [ ] "Add to calendar" (Google/Apple) button per class

## Status

_Last updated 2026-09-07._ Phase 1 code work not started — feature work (dark mode, checklists, export, nav redesign, a second schedule, room search, the course action sheet) took priority instead, see "Shipped" above. Deployment/hosting setup (domain, DNS, Access lock) is paused mid-way — see [DEPLOYMENT.md](DEPLOYMENT.md) for live status and current blockers. App is currently a single static `index.html` with hardcoded schedule data. Git-wise: everything is committed locally on `main`, but **this repo has no GitHub remote yet** — nothing has been pushed anywhere.
