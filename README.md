# Órarend

A mobile-first university schedule web app. Dark sidebar for day navigation, color-coded class cards, a "now" highlight for the current class, a week view for desktop, and a slide-out drawer navigation.

Hungarian UI (Órarend = "schedule" / "timetable").

## Current state

Vanilla static site, no build step: [index.html](index.html) (markup), [css/style.css](css/style.css), [js/script.js](js/script.js) — plain `<link>`/`<script src>`, no bundler. Two small pinned CDN dependencies (`html2canvas`, `jsPDF`) power schedule export — see [CLAUDE.md](CLAUDE.md) for why those are the one exception. Beyond the core schedule, it also has:

- Light/dark theme toggle, with system-preference detection on first load
- A checklist feature (shopping lists with running totals, task lists), saved to `localStorage`
- Schedule export to JPG/PDF from the settings panel
- A second person's timetable ("Zoli órarend") alongside your own, as its own nav entry
- "Teremkereső" — an own-design room search/finder covering the full university room database (~775 rooms), with an embedded-map toggle
- A course action sheet: tap a class to see what you can do with it (currently: jump to its room in Teremkereső)

Schedule data (`EV`, `ONLINE`, `CODES`, `ZOLI_EV`, `ROOMS`) lives in [schedule_data/](schedule_data) as plain JSON, fetched at startup — see "Updating the schedule" below. Per-course info/requirements live in [course_data/](course_data) (one JSON file per course), and `assets/`/`data/` hold the app icon and the raw Neptun `.xlsx` exports respectively.

The `android/` directory holds leftover assets from an earlier phase where this was wrapped into a native Android APK via [Web2APK](https://github.com/77AXEL/Web2APK). That approach is being retired in favor of a Progressive Web App — see [ROADMAP.md](docs/ROADMAP.md). The wrapped APK still exists and mostly works, but has a known limitation where schedule export silently fails (see [DEPLOYMENT.md](docs/DEPLOYMENT.md)).

## Running locally

No build step required — just serve the directory statically, e.g.:

```bash
npx serve .
# or
python3 -m http.server 8000
```

Then open the printed URL in a browser.

## Updating the schedule

Edit the JSON files in [schedule_data/](schedule_data): `ev.json` (your own timetable), `online.json` (async/no-fixed-time courses), `codes.json` (registration codes), `zoli.json` (a friend's timetable) — these are what actually change each semester. Each `ev.json`/`zoli.json` entry is `[dayIndex(0=Mon), startTime, endTime, name, room, instructor, colorType, isOnlinePreferred?]`. `rooms.json` (the room-search data) covers the whole university room database rather than just your current classes, so it shouldn't need touching semester to semester — see [CLAUDE.md](CLAUDE.md) for how it was built, its `aliases` field, and how to add another person's schedule.

## Deployment & access

**Live, but not yet locked down.** The app is up at `https://orarend.szaszroland.hu` (Rackhost → Cloudflare DNS → Vercel, all connected and working) — but the Cloudflare Access step described below has not been set up yet, so despite the intent described here, the site is currently reachable by anyone with the URL. See [DEPLOYMENT.md](docs/DEPLOYMENT.md) for the live status and what's left. The stack, once Access is actually in place:

```
Rackhost (registrar for szaszroland.hu)
      ↓ nameservers point to
Cloudflare (DNS + Access)
      ↓ proxied CNAME → cname.vercel-dns.com
Vercel (static hosting of this repo)
```

- **Vercel** hosts the site as-is (zero build config — it's a static site, `index.html` + `css/`/`js/`). `.vercelignore` keeps the legacy `android/` copy, the raw `.xlsx` exports, and the `docs/` planning docs out of the deployment. The project's auto-assigned `*.vercel.app` URL should be set to redirect to the custom domain so it can't be used to bypass the access gate below — **not yet confirmed done**, see [DEPLOYMENT.md](docs/DEPLOYMENT.md).
- **Cloudflare DNS** proxies (orange-cloud) `orarend.szaszroland.hu` to Vercel. SSL/TLS mode is currently "Full" — upgrading to "Full (strict)" is a pending step, safe to do now that Vercel has issued a certificate for the domain.
- **Cloudflare Access** (Zero Trust → Access → Applications) is meant to sit in front of the domain as a login wall — **this has not been set up yet**. Until it is, nothing stops any visitor from reaching the app directly.

Once Access is actually configured, all access control will live at the Cloudflare edge, not in this repo's code — there is intentionally no password/auth logic in the app itself. See [CLAUDE.md](CLAUDE.md) for the reasoning.

## Roadmap

See [ROADMAP.md](docs/ROADMAP.md) for the PWA conversion plan (offline support, installable app, push notifications, dynamic schedule data).

## License

GPL-3.0 — see [LICENSE](LICENSE).
