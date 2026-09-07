# Órarend

A mobile-first university schedule web app. Dark sidebar for day navigation, color-coded class cards, a "now" highlight for the current class, a week view for desktop, and a slide-out drawer navigation.

Hungarian UI (Órarend = "schedule" / "timetable").

## Current state

Single-file vanilla app: [index.html](index.html) (HTML + CSS + JS, no build step). Two small pinned CDN dependencies (`html2canvas`, `jsPDF`) power schedule export — see [CLAUDE.md](CLAUDE.md) for why those are the one exception. Beyond the core schedule, it also has:

- Light/dark theme toggle, with system-preference detection on first load
- A checklist feature (shopping lists with running totals, task lists), saved to `localStorage`
- Schedule export to JPG/PDF from the settings panel
- A second person's timetable ("Zoli órarend") alongside your own, as its own nav entry
- "Teremkereső" — an own-design room search/finder covering the rooms your own classes are in, with an embedded-map toggle
- A course action sheet: tap a class to see what you can do with it (currently: jump to its room in Teremkereső)

Schedule data (`EV`, `ONLINE`, `CODES`, `ZOLI_EV`, `ROOMS`) is hardcoded near the top of the `<script>` block — see "Updating the schedule" below.

The `android/` directory holds leftover assets from an earlier phase where this was wrapped into a native Android APK via [Web2APK](https://github.com/77AXEL/Web2APK). That approach is being retired in favor of a Progressive Web App — see [ROADMAP.md](ROADMAP.md). The wrapped APK still exists and mostly works, but has a known limitation where schedule export silently fails (see [DEPLOYMENT.md](DEPLOYMENT.md)).

## Running locally

No build step required — just serve the directory statically, e.g.:

```bash
npx serve .
# or
python3 -m http.server 8000
```

Then open the printed URL in a browser.

## Updating the schedule

Edit the `EV`, `ONLINE`, `CODES`, `ZOLI_EV`, and `ROOMS` arrays in [index.html](index.html). Each `EV`/`ZOLI_EV` entry is `[dayIndex(0=Mon), startTime, endTime, name, room, instructor, colorType, isOnlinePreferred?]`. See [CLAUDE.md](CLAUDE.md) for the shape of `ROOMS` (including how room-name aliases work) and how to add another person's schedule.

## Deployment & access

**Not live yet** — this is the planned architecture, not the current state. See [DEPLOYMENT.md](DEPLOYMENT.md) for real-time progress (currently paused on a `.hu` domain registration blocker, and this repo doesn't even have a GitHub remote configured yet). Once it is live: the public GitHub repo will not mean the live site is public. The stack:

```
Rackhost (registrar for szaszroland.hu)
      ↓ nameservers point to
Cloudflare (DNS + Access)
      ↓ proxied CNAME → cname.vercel-dns.com
Vercel (static hosting of this repo)
```

- **Vercel** hosts the site as-is (zero build config — it's a static `index.html`). The project's auto-assigned `*.vercel.app` URL is set to redirect to the custom domain so it can't be used to bypass the access gate below.
- **Cloudflare DNS** proxies (orange-cloud) `orarend.szaszroland.hu` to Vercel, with SSL/TLS mode "Full (strict)" and "Always Use HTTPS" on.
- **Cloudflare Access** (Zero Trust → Access → Applications) sits in front of the domain as a login wall: nothing reaches the app until the visitor authenticates via a One-Time email PIN (or Google login, if added later) *and* matches an explicit email allow-list policy.

All access control lives at the Cloudflare edge, not in this repo's code — there is intentionally no password/auth logic in the app itself. See [CLAUDE.md](CLAUDE.md) for the reasoning.

## Roadmap

See [ROADMAP.md](ROADMAP.md) for the PWA conversion plan (offline support, installable app, push notifications, dynamic schedule data).

## License

GPL-3.0 — see [LICENSE](LICENSE).
