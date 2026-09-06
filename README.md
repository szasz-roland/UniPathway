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

## Roadmap

See [ROADMAP.md](ROADMAP.md) for the PWA conversion plan (offline support, installable app, push notifications, dynamic schedule data).

## License

GPL-3.0 — see [LICENSE](LICENSE).
