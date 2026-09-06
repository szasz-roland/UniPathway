# CLAUDE.md

Context for Claude Code (or any AI assistant) working in this repo.

## What this is

Órarend is a personal university schedule web app, currently a single static file: [index.html](index.html) (inline CSS + vanilla JS, zero dependencies, zero build step). It's being converted into an installable, offline-capable PWA hosted on Vercel — see [ROADMAP.md](ROADMAP.md) for the phased plan and current priorities.

## History (for context, not action items)

The app started as a single HTML file wrapped into a native Android APK via [Web2APK](https://github.com/77AXEL/Web2APK). That involved fixing `INSTALL_FAILED_INVALID_APK` (zipalign / resources.arsc compression), `INSTALL_PARSE_FAILED_NO_CERTIFICATES` (switching from `jarsigner` v1 to `apksigner` v2/v3), and a status-bar rendering bug (edge-to-edge drawing over a transparent status bar — fixed via `styles.xml` + `fitsSystemWindows`). The `android/` directory is a leftover from that phase; it's not part of the active build and can be deleted once the PWA fully replaces it.

Rebuilding/reinstalling an APK on every schedule change was the reason for pivoting to a PWA.

## Code conventions

- No frameworks, no build tooling. Keep it vanilla HTML/CSS/JS unless a roadmap phase explicitly calls for a dependency (e.g. a data backend in Phase 2).
- CSS custom properties in `:root` drive theming — `--rail` (dark sidebar), `--bg` (light main area), and per-subject color pairs (`--ea-*`, `--gy-*`, `--pr-*`, `--mt-*`). Reuse these rather than hardcoding colors.
- Schedule data lives in three arrays at the top of the script: `EV` (timed classes), `ONLINE` (async/no-fixed-time courses), `CODES` (registration codes shown in the drawer). Phase 2 moves this out of the source file.
- Font: "Plus Jakarta Sans" via Google Fonts.
- UI language is Hungarian; keep new user-facing strings in Hungarian unless told otherwise.

## Security / repo hygiene

- This repo is public. Never commit signing keys, `.env` files, API tokens, or Vercel/Firebase/Supabase credentials — see [.gitignore](.gitignore). If Phase 2/3 introduces a backend or push notifications, secrets belong in Vercel environment variables, not in the repo.
- The schedule data (professor names, room numbers, course codes) is ordinary public university catalog information, not sensitive — no need to redact it.
- The `android/` build output contains no signing material currently, but double-check before adding gradle/keystore files later.
- **Access control lives entirely outside this repo.** The live site (`orarend.szaszroland.hu`) is gated by Cloudflare Access at the DNS edge (email allow-list + one-time PIN / Google login) — see [README.md](README.md#deployment--access). Do not add in-app passwords, login forms, or auth middleware to "secure" the app; that would duplicate/weaken a control that's already handled correctly upstream. If that architecture ever changes, update this note and the README section together.

## Working style notes

- This is a personal, low-stakes project — prefer small, direct changes over heavy abstraction. It's currently a single file by design; only split it into `index.html` / `style.css` / `script.js` as part of the deliberate Phase 1 restructuring (see ROADMAP.md), not incidentally.
