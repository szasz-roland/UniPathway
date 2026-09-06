# Deployment log

Live status of putting Órarend on `szaszroland.hu`, locked behind Cloudflare Access. This tracks progress across sessions/devices — the interactive checklist (link below) only saves to one browser's local storage.

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
- [ ] **Blocked:** domain shows status **Pending** in Rackhost, not **Active** yet — this is a normal `.hu`-registry verification/delegation delay (same-day to a couple of business days), not an error. Nameserver profile can't be switched from "Rackhost" to "Cloudflare" until it clears. Check Rackhost's "Tennivalók" (To-dos) for anything blocking it.
- [ ] Once Active: switch `szaszroland.hu`'s nameserver profile from "Rackhost" to "Cloudflare" (Domainek → DNS profilok)
- [ ] Wait for Cloudflare zone to show "Active" (propagation)
- [ ] Cloudflare SSL/TLS → Full (strict) + Always Use HTTPS
- [ ] Push repo to GitHub, import into Vercel, deploy
- [ ] Add `orarend.szaszroland.hu` as custom domain in Vercel; add matching proxied CNAME in Cloudflare DNS
- [ ] Redirect Vercel's `*.vercel.app` alias to the custom domain
- [ ] Cloudflare Zero Trust → Access: create application + allow-list policy for one email
- [ ] Test: private-window visit hits Access login, not the app; wrong email is refused; raw vercel.app URL redirects and is still gated

## Resuming

Pick up at the first unchecked box above, or open the checklist link and continue from wherever its progress bar shows.
