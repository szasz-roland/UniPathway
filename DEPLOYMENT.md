# Deployment log

Live status of putting Órarend on `szaszroland.hu`, locked behind Cloudflare Access. This tracks progress across sessions/devices — the interactive checklist (link below) only saves to one browser's local storage.

**Where things stand (2026-09-09): the app is live at `https://orarend.szaszroland.hu`, served from Vercel through Cloudflare — but Cloudflare Access has NOT been set up yet.** That means the site is currently reachable by anyone with the URL, no login wall, which is the opposite of the original goal for this project (personal use only, not publicly accessible). **Setting up Access (Phase 4 below) is the one remaining step and should not be treated as optional or "later" — until it's done, treat the live URL as public.**

Everything up through Vercel is done: domain Active at Rackhost, GitHub repo pushed ([github.com/szasz-roland/UniPathway](https://github.com/szasz-roland/UniPathway)), nameservers switched to Cloudflare, Vercel connected and serving `orarend.szaszroland.hu` correctly (confirmed working by the user directly).

Full step-by-step with copy buttons: **[Órarend Launch checklist](https://claude.ai/code/artifact/abe2becf-0c3b-453e-aebf-eaa31cee53a5)**

## Architecture decided

```
Rackhost (registrar for szaszroland.hu)
      ↓ nameservers point to
Cloudflare (DNS + Access)
      ↓ proxied CNAME → cname.vercel-dns.com
Vercel (static hosting of this repo)
```

- Access control: Cloudflare Access (Zero Trust), self-hosted app on `orarend.szaszroland.hu`, policy = allow-list of a single email, login via One-Time PIN. No auth code in the app itself.
- License: GPL-3.0 (see [LICENSE](LICENSE)).
- Full reasoning in [README.md#deployment--access](README.md) and [CLAUDE.md](CLAUDE.md).

## Progress

- [x] Domain `szaszroland.hu` purchased at Rackhost
- [x] Domain added to Cloudflare (Websites → Add a domain) — zone created on Free plan
- [x] Cloudflare "Cloudflare" nameserver profile created at Rackhost with:
  - `beau.ns.cloudflare.com`
  - `braelyn.ns.cloudflare.com`
- [x] Domain `szaszroland.hu` is **Active** in Rackhost (was stuck on "Hibás/hiányos megrendelés," now resolved)
- [x] GitHub repo created and pushed: [github.com/szasz-roland/UniPathway](https://github.com/szasz-roland/UniPathway) (SSH remote, `main` tracking `origin/main`)
- [x] Switched `szaszroland.hu`'s nameserver profile from "Rackhost" to "Cloudflare"
- [x] Cloudflare zone active (propagated)
- [x] Imported `UniPathway` into Vercel and deployed (zero build config — static site)
- [x] Added `orarend.szaszroland.hu` as custom domain in Vercel, with matching proxied CNAME (`orarend` → `cname.vercel-dns.com`) in Cloudflare DNS — confirmed loading correctly end to end
- [ ] Cloudflare SSL/TLS mode is currently **Full** (confirmed), not yet upgraded to **Full (strict)** — safe to do now that Vercel has issued a real certificate for the domain
- [ ] Redirect Vercel's auto-assigned `*.vercel.app` alias to the custom domain (not yet confirmed done — check Vercel → Settings → Domains) — otherwise that raw URL bypasses Cloudflare (and Access, once set up) entirely
- [ ] **Cloudflare Zero Trust → Access: create application + allow-list policy for one email — NOT DONE YET, this is the actual security lock and the site is public without it**
- [ ] Test after Access is set up: private-window visit hits Access login, not the app; wrong email is refused; raw vercel.app URL redirects and is still gated

## Known issues / open problems

### Export (JPG/PDF) doesn't work in the Android APK wrapper
The settings-panel export feature (see [CLAUDE.md](CLAUDE.md)) works correctly in every real browser context it's been tested in (desktop Chrome, headless Chromium, both `http://` and `file://`) — but fails silently in the Web2APK-wrapped Android app installed on the phone.

Root cause found and fixed: `~/Downloads/del/Web2APK-main/android/AndroidManifest.xml` (outside this repo — it's the separate Web2APK build tool, not tracked in git here) was missing `<uses-permission android:name="android.permission.INTERNET"/>` entirely, so Android blocked every outbound request the WebView made, including the two CDN `<script>` tags the export feature depends on. That's been added and confirmed to persist across rebuilds (`wa.py` never touches the manifest).

After that fix and a full rebuild/reinstall, export **still** fails silently on-device. The most likely remaining cause: the wrapper's `MainActivity` (decompiled to `android/smali_classes3/com/axel/webview/MainActivity.smali`) is bare-bones — it only enables JavaScript and calls `loadUrl()`. It never calls `WebView.setDownloadListener(...)`, and modern WebView builds block top-level navigation to `data:` URLs as a security hardening measure. The export code triggers downloads via `<a href="data:...">.click()`, which relies on the *browser's* native download handling — a plain WebView activity with no download listener has no such handling to fall back on. This has not been confirmed with an on-device debugger, but it fits the exact symptom (silent, no error surfaced, works everywhere else) and is a known, common gap in minimal WebView wrappers.

**This is very likely an inherent limitation of the current Web2APK wrapper, not a bug in `index.html`.** Fixing it properly would mean patching the wrapper's native Java/Kotlin (add a `DownloadListener` that hands the data off to Android's `DownloadManager` or `MediaStore`), which is out of scope for this repo and would need to be redone on every Web2APK rebuild unless committed upstream in that separate project.

**Practical workaround today:** open the app in a real mobile browser (e.g. Chrome for Android) instead of the wrapped APK — either by serving this repo locally on the same network, or now that hosting is live, at `orarend.szaszroland.hu` directly (note: that URL is currently public, see the top of this file — fine for your own quick testing, just don't share the link until Access is set up). Export works fully there.

**Recommended path:** deprioritize patching the native wrapper further and instead finish Phase 1 (PWA + hosting, see [ROADMAP.md](ROADMAP.md)). An installed PWA runs through the phone's actual browser engine, which has full native download support — this whole class of problem goes away once the Web2APK wrapper is retired, which was already the plan (see CLAUDE.md's History section).

## Resuming

Pick up at the first unchecked box above: **set up Cloudflare Access.** The app is live and reachable, but not yet locked down — this is the priority, not a nice-to-have.
