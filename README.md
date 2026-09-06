# Órarend

A mobile-first university schedule web app. Dark sidebar for day navigation, color-coded class cards, a "now" highlight for the current class, a week view for desktop, and a slide-out drawer for copying course registration codes.

Hungarian UI (Órarend = "schedule" / "timetable").

## Current state

Single-file vanilla app: [index.html](index.html) (HTML + CSS + JS, no build step, no dependencies). Schedule data is hardcoded in the `EV` array near the top of the `<script>` block.

The `android/` directory holds leftover assets from an earlier phase where this was wrapped into a native Android APK via [Web2APK](https://github.com/77AXEL/Web2APK). That approach is being retired in favor of a Progressive Web App — see [ROADMAP.md](ROADMAP.md).

## Running locally

No build step required — just serve the directory statically, e.g.:

```bash
npx serve .
# or
python3 -m http.server 8000
```

Then open the printed URL in a browser.

## Updating the schedule

Edit the `EV`, `ONLINE`, and `CODES` arrays in [index.html](index.html). Each `EV` entry is `[dayIndex(0=Mon), startTime, endTime, name, room, instructor, colorType, isOnlinePreferred?]`.

## Deployment & access

This is a personal app — the public GitHub repo does not mean the live site is public. The stack:

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
