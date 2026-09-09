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

## Phase 1 — PWA conversion & hosting

- [x] Split `index.html` into `index.html`, `css/style.css`, `js/script.js` — also moved `icon.png` → `assets/icon.png` and the raw Neptun exports → `data/` while at it
- [ ] Add `manifest.json` (name, icons, theme color `#20242e`, background `#ffffff`, `display: standalone`)
- [ ] Add `service-worker.js` caching the app shell for full offline support
- [ ] Generate PWA icon sizes (192x192, 512x512, maskable) from `assets/icon.png`
- [x] Deploy to Vercel; point custom domain `orarend.szaszroland.hu` at it — **live and working**, but **not yet locked down** (Cloudflare Access still needs setting up — see [DEPLOYMENT.md](DEPLOYMENT.md), this is the actual priority right now, not a documentation afterthought)
- [ ] Retire the `android/` Web2APK output once the installable PWA replaces it — also resolves the export/download limitation noted above, since an installed PWA runs through a real browser engine

## Phase 2 — Data management & dynamic updates

- [x] Move the hardcoded `EV`/`ONLINE`/`CODES`/`ZOLI_EV`/`ROOMS` arrays out of the script into JSON files (`schedule_data/*.json`, fetched via `fetchLocal()`) — done directly as static JSON, no backend needed for a single-user app. Updating each semester now means editing those files, not `js/script.js`.
- [ ] Optional: a small password-protected admin page for editing the schedule JSON directly

## Phase 3 — Advanced PWA features

- [ ] Push notifications (Web Push API) for cancellations, room changes, daily reminders
- [ ] "Add to calendar" (Google/Apple) button per class

## Status

_Last updated 2026-09-09._ **The app is live at `orarend.szaszroland.hu`** (Rackhost → Cloudflare → Vercel, all connected) — but **Cloudflare Access is not set up yet, so the site is currently public**, not restricted to personal use like the project intends. That's the actual next priority, ahead of manifest/service-worker/PWA work. Repo is public on GitHub: [github.com/szasz-roland/UniPathway](https://github.com/szasz-roland/UniPathway). Schedule data now lives in `schedule_data/*.json`, not hardcoded in `js/script.js` (see Phase 2 above). See [DEPLOYMENT.md](DEPLOYMENT.md) for exact live status.
