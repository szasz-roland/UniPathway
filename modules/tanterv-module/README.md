# Tanterv module for orarend.szaszroland.hu

A curriculum planner view: credit track, 6 semester columns, specialization picker, status per course
(felvéve / teljesítve), electives, prerequisites. Plain JS, no dependencies. It follows the site's theme
variables and `[data-theme="dark"]`, so light/dark mode and the font carry over automatically.

```
css/tanterv.css                   styles, all scoped under .tt
js/tanterv.js                     exposes window.Tanterv
curriculum_data/umi_bprof.json    curriculum data (generated from the xlsx)
tools/tanterv_xlsx_to_json.py     regenerates the JSON when a new xlsx comes out
demo.html                         standalone preview with the site's tokens
```

## Preview

JSON can't be loaded over `file://` in a desktop browser, so serve the folder:

```sh
python3 -m http.server 8000     # then open http://localhost:8000/demo.html
```

(or VS Code's Live Server). Inside the Android wrapper it loads fine, because the loader uses XHR just like `fetchLocal()`.

## Adding it to the site

This module stays where it is — `modules/tanterv-module/` — rather than being copied into the repo's
`css/`/`js/`/`schedule_data/`. It's wired in via the site's `registerModule()` convention (see the
project's `CLAUDE.md`), entirely from `index.html`:

```html
<!-- <head>, after css/style.css -->
<link rel="stylesheet" href="modules/tanterv-module/css/tanterv.css">

<!-- before <script src="js/script.js"> -->
<script src="modules/tanterv-module/js/tanterv.js"></script>
<script>
  registerModule({
    id:"tanterv",
    label:"Tanterv",
    icon:'<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 10L12 5 2 10l10 5 10-5z"/><path d="M6 12v5c3 2 9 2 12 0v-5"/></svg>',
    mount:function(el){
      return Tanterv.mount(el,{
        storage:Tanterv.localStore("orarend-tanterv-v1"),
        dataUrl:"modules/tanterv-module/curriculum_data/umi_bprof.json"
      });
    }
  });
</script>
```

That's the entire integration — `js/script.js` itself is never edited. `window.registerModule()` (defined
by a tiny inline bootstrap script in `index.html`'s `<head>`, which is why it must exist before this
module's own `<script>` tag runs) adds the page to the nav drawer, the desktop rail icon, and the page
title automatically; `renderMain()`'s generic module dispatch calls `mount()` when this page is selected.
The curriculum JSON is loaded once and cached (`js/tanterv.js`'s own `dataCache`), so switching pages
back and forth is instant.

## Saving progress: localStorage now, backend later

Today it's `Tanterv.localStore(key)`: per browser, no server.

When you add accounts, switch to `Tanterv.hybridStore`. It writes to localStorage immediately (instant,
works offline, survives a flaky connection) and syncs to your API in the background. On load it shows
the local copy first, then asks the server; whichever state has the newer `updatedAt` wins, so a change
made on the phone shows up on the laptop. Failed saves stay queued and retry on the next change or when
the device comes back online.

```js
const TANTERV_STORE = Tanterv.hybridStore({
  key: "orarend-tanterv-v1:" + currentUser.id,   // per-user local cache, so accounts on one device don't mix
  load: async () => {
    const r = await fetch("/api/tanterv", { credentials: "include" });
    if (r.status === 404) return null;
    if (!r.ok) throw new Error(r.status);
    return r.json();
  },
  save: async state => {
    const r = await fetch("/api/tanterv", {
      method: "PUT", credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(state),
    });
    if (!r.ok) throw new Error(r.status);
  },
  onSync: err => { /* optional: show "offline, will sync later" when err is set */ },
});
```

Backend contract: `GET /api/tanterv` returns the signed-in user's state (or 404), and `PUT /api/tanterv` stores it.
The server must decide *whose* data it is from the session or token, never from a user id sent by the
browser. That's what keeps other people from reading your data. On logout, clear that user's local key.

Any object with `load()` and `save(state)` (both may return promises), plus an optional `refresh()`, works as a store.

## API

```js
const planner = Tanterv.mount(element, {
  dataUrl: "curriculum_data/umi_bprof.json", // default
  data: null,          // or pass the curriculum object directly
  storage: store,      // default: Tanterv.localStore("orarend-tanterv-v1")
  showTitle: false,    // true renders the programme name as an <h1> (the site's own header already shows "Tanterv")
  onChange: state => {},
});
planner.ready;         // Promise, resolves when rendered
planner.getState();    // current state (copy)
planner.setState(s);   // replace state, re-render, save
planner.destroy();     // remove listeners (also happens automatically when the element leaves the page)
```

State, which is what your backend stores:

```json
{
  "version": 1,
  "spec": "Test-Umi",
  "status": { "Programozás alapjai": "done", "Adatbázisok": "now" },
  "added":  { "4": ["Adózás"] },
  "updatedAt": 1790239858767
}
```

`spec` is one of `Tanterv`, `Back-Umi`, `Front-Umi`, `Test-Umi`, `IoT-Umi`, `DevOps-Umi`, `AI-Umi`, `Automotive-Umi`
(the spreadsheet's sheet names). Courses are keyed by their official name.

## New curriculum version

```sh
python3 tools/tanterv_xlsx_to_json.py umi_bprof_YYYYMMDD.xlsx curriculum_data/umi_bprof.json
```

Prerequisites are read from the spreadsheet's notes column (course names mentioned there), so Neptun stays the official source.
