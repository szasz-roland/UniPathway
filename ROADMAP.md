# Roadmap

## Phase 1 — PWA conversion & hosting

- [ ] Split [index.html](index.html) into `index.html`, `style.css`, `script.js`
- [ ] Add `manifest.json` (name, icons, theme color `#20242e`, background `#ffffff`, `display: standalone`)
- [ ] Add `service-worker.js` caching the app shell for full offline support
- [ ] Generate PWA icon sizes (192x192, 512x512, maskable) from `icon.png`
- [ ] Deploy to Vercel; point custom domain `orarend.szaszroland.hu` at it
- [ ] Retire the `android/` Web2APK output once the installable PWA replaces it

## Phase 2 — Data management & dynamic updates

- [ ] Move the hardcoded `EV`/`ONLINE`/`CODES` arrays out of the script into a JSON file (or a lightweight backend — Supabase/Firebase) so the schedule can change without a code deploy
- [ ] Optional: a small password-protected admin page for editing the schedule JSON directly

## Phase 3 — Advanced PWA features

- [ ] Push notifications (Web Push API) for cancellations, room changes, daily reminders
- [ ] "Add to calendar" (Google/Apple) button per class
- [ ] System-preference dark mode (currently hardcoded light main area + dark sidebar)

## Status

Phase 1 code work not started. Deployment/hosting setup (domain, DNS, Access lock) is in progress — see [DEPLOYMENT.md](DEPLOYMENT.md) for live status. App is currently a single static `index.html` with hardcoded schedule data.
