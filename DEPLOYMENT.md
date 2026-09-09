# Deployment log

Live status of putting Órarend on `szaszroland.hu`, locked behind Cloudflare Access. This tracks progress across sessions/devices — the interactive checklist (link below) only saves to one browser's local storage.

**Where things stand (2026-09-09):** the `.hu` domain is now **Active** at Rackhost (was stuck on "Hibás/hiányos megrendelés," resolved by the user directly with Rackhost) — the earlier registry blocker is gone. The GitHub repo is also live: **[github.com/szasz-roland/UniPathway](https://github.com/szasz-roland/UniPathway)** (note: repo name is `UniPathway`, not `orarend` — just a naming choice, doesn't affect anything), pushed via SSH, `main` tracking `origin/main`. Next up: switch the domain's nameservers to Cloudflare.

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
- [ ] Switch `szaszroland.hu`'s nameserver profile from "Rackhost" to "Cloudflare" (Domainek → DNS profilok) — now unblocked, do this next
- [ ] Wait for Cloudflare zone to show "Active" (propagation)
- [ ] Cloudflare SSL/TLS → Full (strict) + Always Use HTTPS
- [ ] Import `UniPathway` into Vercel and deploy (zero build config — static site)
- [ ] Add `orarend.szaszroland.hu` as custom domain in Vercel; add matching proxied CNAME in Cloudflare DNS
- [ ] Redirect Vercel's `*.vercel.app` alias to the custom domain
- [ ] Cloudflare Zero Trust → Access: create application + allow-list policy for one email
- [ ] Test: private-window visit hits Access login, not the app; wrong email is refused; raw vercel.app URL redirects and is still gated

## Known issues / open problems

### Export (JPG/PDF) doesn't work in the Android APK wrapper
The settings-panel export feature (see [CLAUDE.md](CLAUDE.md)) works correctly in every real browser context it's been tested in (desktop Chrome, headless Chromium, both `http://` and `file://`) — but fails silently in the Web2APK-wrapped Android app installed on the phone.

Root cause found and fixed: `~/Downloads/del/Web2APK-main/android/AndroidManifest.xml` (outside this repo — it's the separate Web2APK build tool, not tracked in git here) was missing `<uses-permission android:name="android.permission.INTERNET"/>` entirely, so Android blocked every outbound request the WebView made, including the two CDN `<script>` tags the export feature depends on. That's been added and confirmed to persist across rebuilds (`wa.py` never touches the manifest).

After that fix and a full rebuild/reinstall, export **still** fails silently on-device. The most likely remaining cause: the wrapper's `MainActivity` (decompiled to `android/smali_classes3/com/axel/webview/MainActivity.smali`) is bare-bones — it only enables JavaScript and calls `loadUrl()`. It never calls `WebView.setDownloadListener(...)`, and modern WebView builds block top-level navigation to `data:` URLs as a security hardening measure. The export code triggers downloads via `<a href="data:...">.click()`, which relies on the *browser's* native download handling — a plain WebView activity with no download listener has no such handling to fall back on. This has not been confirmed with an on-device debugger, but it fits the exact symptom (silent, no error surfaced, works everywhere else) and is a known, common gap in minimal WebView wrappers.

**This is very likely an inherent limitation of the current Web2APK wrapper, not a bug in `index.html`.** Fixing it properly would mean patching the wrapper's native Java/Kotlin (add a `DownloadListener` that hands the data off to Android's `DownloadManager` or `MediaStore`), which is out of scope for this repo and would need to be redone on every Web2APK rebuild unless committed upstream in that separate project.

**Practical workaround today:** open the app in a real mobile browser (e.g. Chrome for Android) instead of the wrapped APK — either by serving this repo locally on the same network, or once hosting is live, at `orarend.szaszroland.hu` directly. Export works fully there.

**Recommended path:** deprioritize patching the native wrapper further and instead finish Phase 1 (PWA + hosting, see [ROADMAP.md](ROADMAP.md)). An installed PWA runs through the phone's actual browser engine, which has full native download support — this whole class of problem goes away once the Web2APK wrapper is retired, which was already the plan (see CLAUDE.md's History section).

## Resuming

Pick up at the first unchecked box above: switching `szaszroland.hu`'s nameservers to Cloudflare.
