/* Tanterv – curriculum planner module.
   Mount into any element:  Tanterv.mount(el, { dataUrl, storage })
   Styling lives in css/tanterv.css (scoped to .tt) and follows the host page's theme variables. */
(function (global) {
  'use strict';

  const DEFAULT_DATA_URL = 'curriculum_data/umi_bprof.json';
  const DEFAULT_KEY = 'orarend-tanterv-v1';
  const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  /* XHR instead of fetch() so it also works from file:// (same reason as fetchLocal() in script.js). */
  const dataCache = {};
  function loadData(url) {
    if (!dataCache[url]) dataCache[url] = new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open('GET', url, true);
      xhr.onload = () => (xhr.status === 200 || xhr.status === 0) ? resolve(JSON.parse(xhr.responseText)) : reject(new Error('status ' + xhr.status));
      xhr.onerror = () => reject(new Error('network error'));
      xhr.send();
    }).catch(e => { delete dataCache[url]; throw e; });
    return dataCache[url];
  }

  /* ---------- storage adapters ----------
     An adapter is { load(): Promise<state|null>, save(state): Promise, refresh?(): Promise<state|null> }. */
  function localStore(key) {
    key = key || DEFAULT_KEY;
    return {
      load: async () => { try { return JSON.parse(localStorage.getItem(key)); } catch (e) { return null; } },
      save: async s => { try { localStorage.setItem(key, JSON.stringify(s)); } catch (e) {} },
    };
  }

  /* localStorage first (instant, works offline), backend in the background.
     load/save are your API calls; the newer state (by updatedAt) wins. */
  function hybridStore(opts) {
    const local = localStore(opts.key);
    const delay = opts.delay == null ? 800 : opts.delay;
    let timer = null, pending = null;
    const ts = s => (s && s.updatedAt) || 0;
    async function flush() {
      if (!pending) return;
      const s = pending;
      try { await opts.save(s); if (pending === s) pending = null; if (opts.onSync) opts.onSync(null); }
      catch (e) { if (opts.onSync) opts.onSync(e); } // stays pending; retried on the next change or when back online
    }
    if (typeof window !== 'undefined') window.addEventListener('online', flush);
    return {
      load: () => local.load(),
      save: async s => { await local.save(s); pending = s; clearTimeout(timer); timer = setTimeout(flush, delay); },
      refresh: async () => {
        let remote;
        try { remote = await opts.load(); } catch (e) { return null; }
        const mine = await local.load();
        if (remote && ts(remote) > ts(mine)) { await local.save(remote); return remote; }
        if (mine && ts(mine) > ts(remote)) { pending = mine; flush(); }
        return null;
      },
      flush,
    };
  }

  function normalize(s) {
    s = s || {};
    const e = s.extra || {};
    return {
      version: 1,
      spec: s.spec || 'Tanterv',
      status: Object.assign({}, s.status || s.st),
      added: Object.assign({}, s.added || s.add),
      /* Requirements the curriculum data can't express: testnevelés/szabadon választható/kötelezően
         választható aren't part of this program's own course list (PE and "any course, any program"
         electives come from university-wide catalogs, not this xlsx), so they're logged by hand
         rather than picked from D.courses. Credit targets for free/elective start unset (null, not a
         guessed number) until the person using this actually knows their program's real requirement. */
      extra: {
        pe: { log: Array.isArray(e.pe && e.pe.log) ? e.pe.log : [] },
        free: { target: (e.free && e.free.target) || null, log: Array.isArray(e.free && e.free.log) ? e.free.log : [] },
        elective: { target: (e.elective && e.elective.target) || null },
      },
      updatedAt: s.updatedAt || 0,
    };
  }

  /* ---------- component ---------- */
  function mount(el, options) {
    const opts = Object.assign({ dataUrl: DEFAULT_DATA_URL, showTitle: false }, options);
    const store = opts.storage || localStore(opts.storageKey);
    const root = document.createElement('div');
    root.className = 'tt';
    root.innerHTML = '<p class="tt-loading">Tanterv betöltése…</p>';
    el.innerHTML = '';
    el.appendChild(root);

    let D = null, S = normalize(null), selected = null, panel = null, poolTerm = 'mind', query = '';
    let destroyed = false;

    const kr = n => { const c = D.courses[n]; return c ? (c.ea || 0) + (c.gy || 0) : 0; };
    const plan = () => D.plans.find(p => p.id === S.spec) || D.plans[0];
    const q = sel => root.querySelector(sel);

    function semRows(s) {
      const base = plan().sems[s] || [], added = S.added[s] || [];
      const rows = base.map(r => Object.assign({}, r, { inPlan: r.k !== 'opt' || added.includes(r.n) }));
      added.forEach(n => { if (D.courses[n] && !base.some(r => r.n === n)) rows.push({ n, k: 'opt', inPlan: true, extra: true }); });
      return rows;
    }
    function planned() { const out = []; for (let s = 1; s <= D.program.semesters; s++) semRows(s).forEach(r => { if (r.inPlan) out.push(Object.assign({ s }, r)); }); return out; }
    const missing = n => (D.courses[n].pre || []).filter(p => S.status[p] !== 'done');
    const dependents = n => Object.values(D.courses).filter(c => (c.pre || []).includes(n)).map(c => c.n);
    const semOf = n => { const r = planned().find(x => x.n === n); return r ? r.s : null; };
    /* Kötelezően választható progress is computed from courses already tracked as k:'opt' in the
       plan — no manual logging needed there, unlike free/pe which aren't in this data at all. */
    const electiveCredits = () => planned().filter(r => r.k === 'opt').reduce((a, r) => a + kr(r.n), 0);
    const freeCredits = () => S.extra.free.log.reduce((a, it) => a + (Number(it.credits) || 0), 0);

    function commit(persist) {
      if (persist !== false) {
        S.updatedAt = Date.now();
        Promise.resolve(store.save(JSON.parse(JSON.stringify(S)))).catch(() => {});
        if (opts.onChange) opts.onChange(JSON.parse(JSON.stringify(S)));
      }
      render();
    }
    function toast(msg) {
      const t = q('.tt-toast'); if (!t) return;
      t.textContent = msg; t.classList.add('is-on');
      clearTimeout(t._h); t._h = setTimeout(() => t.classList.remove('is-on'), 1800);
    }

    /* ---------- rendering ---------- */
    function shell() {
      const p = D.program;
      root.innerHTML = `
        ${opts.showTitle ? `<h1 class="tt-title">${esc(p.name)}</h1>` : ''}
        <p class="tt-meta">${p.semesters} félév, ${p.credits} kredit${p.lead ? `, szakfelelős: ${esc(p.lead)}` : ''}</p>
        <div class="tt-specs" role="radiogroup" aria-label="Specializáció"></div>
        <div class="tt-tools">
          <input type="search" class="tt-search" placeholder="Keresés: tárgy, kód vagy oktató" aria-label="Keresés">
          <button type="button" class="tt-btn tt-btn-main" data-act="pool">Választható tárgyak</button>
          <button type="button" class="tt-btn" data-act="extra">Egyéb követelmények</button>
          <button type="button" class="tt-btn" data-act="backup">Mentés</button>
        </div>
        <section class="tt-trackwrap" aria-label="Kredit-sáv">
          <div class="tt-track"></div>
          <div class="tt-scale"><span>0</span><span>60</span><span>120</span><span>${p.credits} kredit</span></div>
          <div class="tt-tally"></div>
          <button type="button" class="tt-reqsum" data-act="extra"></button>
        </section>
        <p class="tt-hint">Koppints a körre az állapot váltásához: felvéve, majd teljesítve. A tárgy nevére koppintva látod a részleteit.
          <span><i class="tt-flag tt-flag-crit"></i>az adott félévben teljesíteni kritikus</span>
          <span><i class="tt-flag tt-flag-miss"></i>hiányzó előfeltétel</span>
          <span class="tt-hint-spec">lila név: a specializációd kötelező tárgya</span></p>
        <div class="tt-board"></div>
        <div class="tt-scrim"></div>
        <aside class="tt-panel" aria-live="polite"></aside>
        <div class="tt-toast" role="status"></div>
        <input type="file" class="tt-file" accept="application/json" hidden>`;
    }

    function render() {
      if (destroyed || !D) return;
      renderSpecs(); renderTrack(); renderBoard(); renderPanel();
    }

    function renderSpecs() {
      q('.tt-specs').innerHTML = D.plans.map(p =>
        `<button type="button" role="radio" class="tt-chip" aria-checked="${p.id === S.spec}" data-spec="${esc(p.id)}">${esc(p.label)}</button>`).join('');
    }

    function renderTrack() {
      const rows = planned(), target = D.program.credits;
      let html = '', total = 0, done = 0, now = 0;
      for (let s = 1; s <= D.program.semesters; s++) {
        const segs = rows.filter(r => r.s === s && kr(r.n) > 0);
        if (!segs.length) continue;
        html += `<div class="tt-semseg" style="flex:${segs.reduce((a, r) => a + kr(r.n), 0)} 1 0">` + segs.map(r => {
          const st = S.status[r.n] || '', k = kr(r.n);
          total += k; if (st === 'done') done += k; if (st === 'now') now += k;
          return `<button type="button" class="tt-seg ${st ? 'is-' + st : ''}" style="flex:${k} 1 0" data-open="${esc(r.n)}" title="${esc(r.n)}: ${k} kredit, ${s}. félév" aria-label="${esc(r.n)}, ${k} kredit"></button>`;
        }).join('') + '</div>';
      }
      const rest = Math.max(0, target - total);
      if (rest) html += `<div class="tt-seg tt-seg-rest" style="flex:${rest} 1 0" title="Még ${rest} kreditet kell betervezned"></div>`;
      q('.tt-track').innerHTML = html;
      q('.tt-tally').innerHTML =
        `<div><i class="tt-key tt-key-done"></i><b>${done}</b> kredit teljesítve</div>` +
        `<div><i class="tt-key tt-key-now"></i><b>${now}</b> kredit most felvéve</div>` +
        `<div><i class="tt-key tt-key-plan"></i><b>${total}</b> / ${target} kredit betervezve</div>` +
        (rest ? `<div><i class="tt-key tt-key-rest"></i><b>${rest}</b> kredit hiányzik a tervből</div>` : '');
      const peN = S.extra.pe.log.length, freeT = S.extra.free.target, elT = S.extra.elective.target;
      q('.tt-reqsum').innerHTML = `Testnevelés ${peN}/2` +
        ` · Szabadon választható ${freeCredits()}${freeT ? '/' + freeT : ''} kredit` +
        ` · Kötelezően választható ${electiveCredits()}${elT ? '/' + elT : ''} kredit`;
    }

    function renderBoard() {
      const pre = selected ? (D.courses[selected].pre || []) : [], dep = selected ? dependents(selected) : [];
      let html = '';
      for (let s = 1; s <= D.program.semesters; s++) {
        const rows = semRows(s);
        const sum = rows.filter(r => r.inPlan).reduce((a, r) => a + kr(r.n), 0);
        const groups = [
          ['', rows.filter(r => r.inPlan && !r.extra && r.k !== 'opt')],
          ['Hozzáadott választható', rows.filter(r => r.inPlan && (r.extra || r.k === 'opt'))],
          ['Ajánlott választható', rows.filter(r => !r.inPlan)],
        ];
        html += `<section class="tt-sem" aria-label="${s}. félév"><div class="tt-semhead"><span class="tt-semno">${s}</span><span class="tt-semsum">félév<strong>${sum} kredit</strong></span></div>`;
        groups.forEach(([label, list]) => {
          if (!list.length) return;
          if (label) html += `<div class="tt-subh">${label}</div>`;
          list.forEach(r => {
            const c = D.courses[r.n], st = S.status[r.n] || '';
            const hay = [c.n].concat(c.codes || [], c.teachers || []).join(' ').toLowerCase();
            const cls = ['tt-row', r.k === 'spec' ? 'is-spec' : '', !r.inPlan ? 'is-sugg' : '', selected === r.n ? 'is-sel' : '',
              pre.includes(r.n) ? 'is-pre' : '', dep.includes(r.n) ? 'is-dep' : '', query && !hay.includes(query) ? 'is-dim' : ''].join(' ');
            const flags = (c.crit ? '<i class="tt-flag tt-flag-crit" title="Ebben a félévben teljesíteni kritikus"></i>' : '') +
              (r.inPlan && st && missing(r.n).length ? '<i class="tt-flag tt-flag-miss" title="Hiányzó előfeltétel"></i>' : '');
            const stLabel = st === 'done' ? 'teljesítve' : st === 'now' ? 'felvéve' : 'nincs elkezdve';
            const lead = r.inPlan
              ? `<button type="button" class="tt-dot ${st ? 'is-' + st : ''}" data-cycle="${esc(r.n)}" aria-label="${esc(c.n)}: ${stLabel}. Koppints a váltáshoz."></button>`
              : `<button type="button" class="tt-add" data-add="${esc(r.n)}" data-sem="${s}" aria-label="${esc(c.n)} hozzáadása a ${s}. félévhez">+</button>`;
            const words = c.n.split(' '), last = words.pop();
            const label = flags ? `${esc(words.join(' '))} <span class="tt-last">${esc(last)}<span class="tt-flags">${flags}</span></span>` : esc(c.n);
            html += `<div class="${cls}">${lead}<button type="button" class="tt-name" data-open="${esc(r.n)}">${label}</button><span class="tt-kr">${kr(r.n) || '–'}</span></div>`;
          });
        });
        html += '</section>';
      }
      q('.tt-board').innerHTML = html;
    }

    function renderPanel() {
      root.classList.toggle('is-open', !!panel);
      if (!panel) return;
      const box = q('.tt-panel');
      if (panel === 'pool') box.innerHTML = poolHTML();
      else if (panel === 'backup') box.innerHTML = backupHTML();
      else if (panel === 'extra') box.innerHTML = extraHTML();
      else box.innerHTML = courseHTML(panel);
    }

    function courseHTML(n) {
      const c = D.courses[n], st = S.status[n] || '', s = semOf(n), miss = missing(n), dep = dependents(n);
      const row = s ? semRows(s).find(r => r.n === n) : null;
      const kind = row ? (row.k === 'spec' ? 'Specializáció kötelező tárgya' : row.k === 'opt' ? 'Választható tárgy' : 'Kötelező tárgy') : 'Nincs a tervedben';
      const part = (k, h) => (k || h) ? `${k || 0} kredit${h ? `, heti ${h} óra` : ''}` : '';
      const note = (c.note || '').split(' / ').filter(x => !/kritikus/i.test(x)).join(' / ');
      const evalName = e => e.replace('Koll.', 'kollokvium (vizsga)').replace('Gy. jegy', 'gyakorlati jegy');
      const target = s || defaultSem(n);
      return `
        <button type="button" class="tt-btn tt-close" data-act="close">Bezárás</button>
        <h2 class="tt-ptitle">${esc(c.n)}</h2>
        <p class="tt-pkind">${kind}${s ? `, ${s}. félév` : ''}</p>
        ${s ? `<div class="tt-segctl" role="group" aria-label="Állapot">${[['', 'Nincs elkezdve'], ['now', 'Felvéve'], ['done', 'Teljesítve']].map(([v, l]) =>
          `<button type="button" data-set="${v}" data-v="${v || 'none'}" aria-pressed="${st === v}">${l}</button>`).join('')}</div>` : ''}
        ${c.crit ? '<p class="tt-warn">Ezt a tárgyat az adott félévben kell teljesíteni, mert erre épül a következő félév.</p>' : ''}
        ${st && miss.length ? `<p class="tt-warn">Még nem teljesített előfeltétel: ${miss.map(esc).join(', ')}.</p>` : ''}
        <dl class="tt-dl">
          <dt>Összesen</dt><dd><strong>${kr(n) ? kr(n) + ' kredit' : 'nincs megadva'}</strong></dd>
          ${part(c.ea, c.eao) ? `<dt>Előadás</dt><dd>${part(c.ea, c.eao)}</dd>` : ''}
          ${part(c.gy, c.gyo) ? `<dt>Gyakorlat</dt><dd>${part(c.gy, c.gyo)}</dd>` : ''}
          ${(c.evals || []).length ? `<dt>Értékelés</dt><dd>${c.evals.map(e => esc(evalName(e))).join(', ')}</dd>` : ''}
          ${(c.codes || []).length ? `<dt>Neptun-kód</dt><dd>${c.codes.map(esc).join(', ')}</dd>` : ''}
          ${(c.teachers || []).length ? `<dt>Tárgyfelelős</dt><dd>${c.teachers.map(esc).join(', ')}</dd>` : ''}
          <dt>Előfeltétel</dt><dd>${(c.pre || []).length ? `<div class="tt-links">${c.pre.map(p => `<button type="button" class="tt-link ${S.status[p] === 'done' ? 'is-ok' : 'is-bad'}" data-open="${esc(p)}">${esc(p)}</button>`).join('')}</div>` : 'nincs'}</dd>
          <dt>Erre épül</dt><dd>${dep.length ? `<div class="tt-links">${dep.map(p => `<button type="button" class="tt-link" data-open="${esc(p)}">${esc(p)}</button>`).join('')}</div>` : 'semmi'}</dd>
          ${note ? `<dt>Megjegyzés</dt><dd class="tt-note">${esc(note)}</dd>` : ''}
        </dl>
        ${row && row.inPlan && (row.extra || row.k === 'opt') ? `<button type="button" class="tt-btn" data-remove="${esc(n)}">Eltávolítás a tervből</button>` : ''}
        ${!row || !row.inPlan ? `<button type="button" class="tt-btn tt-btn-main" data-add="${esc(n)}" data-sem="${target}">Hozzáadás a ${target}. félévhez</button>` : ''}`;
    }

    function poolMap() {
      const out = {};
      [D.plans[0], plan()].forEach(p => (p.pools || []).forEach(pool => pool.items.forEach(n => { out[n] = pool.term; })));
      return out;
    }
    function defaultSem(n) {
      const t = poolMap()[n] || 'bármikor';
      for (let s = 3; s <= D.program.semesters; s++) if (t === 'ősz' ? s % 2 === 1 : t === 'tavasz' ? s % 2 === 0 : true) return s;
      return 3;
    }
    function poolHTML() {
      const pools = poolMap(), inPlan = new Set(planned().map(r => r.n));
      const missingKr = Math.max(0, D.program.credits - planned().reduce((a, r) => a + kr(r.n), 0));
      const terms = [['mind', 'Mind'], ['ősz', 'Ősszel'], ['tavasz', 'Tavasszal'], ['mindkettő', 'Mindkét félévben'], ['bármikor', 'Nincs megadva']];
      const termText = { 'ősz': 'őszi félév', 'tavasz': 'tavaszi félév', 'mindkettő': 'ősszel és tavasszal is', 'bármikor': 'félév nincs megadva' };
      const sems = t => Array.from({ length: D.program.semesters }, (_, i) => i + 1).filter(s => t === 'ősz' ? s % 2 : t === 'tavasz' ? !(s % 2) : true);
      const items = Object.keys(pools).filter(n => poolTerm === 'mind' || pools[n] === poolTerm).sort((a, b) => a.localeCompare(b, 'hu'));
      return `
        <button type="button" class="tt-btn tt-close" data-act="close">Bezárás</button>
        <h2 class="tt-ptitle">Választható tárgyak</h2>
        <p class="tt-pkind">${missingKr ? `A ${D.program.credits} kredithez még ${missingKr} kredit hiányzik a tervedből.` : 'A terved eléri a szükséges kreditet.'} Válassz, és add hozzá egy félévhez.</p>
        <div class="tt-filter" role="group" aria-label="Mikor indul">${terms.map(([v, l]) => `<button type="button" class="tt-chip" data-term="${v}" aria-pressed="${poolTerm === v}">${l}</button>`).join('')}</div>
        ${items.map(n => { const c = D.courses[n], t = pools[n]; return `<div class="tt-pool">
          <button type="button" class="tt-poolname" data-open="${esc(n)}">${esc(n)}</button>
          <div class="tt-poolact">${inPlan.has(n) ? `<span class="tt-in">${semOf(n)}. félévben</span>` :
            `<select aria-label="Félév">${sems(t).map(s => `<option value="${s}"${s === defaultSem(n) ? ' selected' : ''}>${s}. félév</option>`).join('')}</select><button type="button" class="tt-btn" data-addsel="${esc(n)}">Hozzáadás</button>`}</div>
          <div class="tt-poolmeta">${kr(n) || '?'} kredit, ${termText[t]}${(c.pre || []).length ? `. Előfeltétel: ${c.pre.map(esc).join(', ')}` : ''}</div></div>`; }).join('')}`;
    }
    function backupHTML() {
      return `
        <button type="button" class="tt-btn tt-close" data-act="close">Bezárás</button>
        <h2 class="tt-ptitle">Mentés</h2>
        <p class="tt-pkind">A haladásod automatikusan mentődik. Biztonsági másolatot fájlba is készíthetsz, és később visszatöltheted.</p>
        <div class="tt-actions">
          <button type="button" class="tt-btn tt-btn-main" data-act="export">Mentés fájlba</button>
          <button type="button" class="tt-btn" data-act="import">Betöltés fájlból</button>
          <button type="button" class="tt-btn tt-btn-danger" data-act="reset">Minden jelölés törlése</button>
        </div>`;
    }
    /* Testnevelés/szabadon választható/kötelezően választható: not in the curriculum data at all
       (PE and "any course, any program" electives aren't part of this program's own course list),
       so these are logged by hand here rather than picked from D.courses like everything else. */
    function extraHTML() {
      const pe = S.extra.pe, free = S.extra.free, el = S.extra.elective;
      const delRow = (label, extra, act, i) => `<div class="tt-reqrow"><span class="tt-name">${esc(label)}</span>${extra}<button type="button" class="tt-del" data-${act}="${i}" aria-label="Törlés">✕</button></div>`;
      return `
        <button type="button" class="tt-btn tt-close" data-act="close">Bezárás</button>
        <h2 class="tt-ptitle">Egyéb követelmények</h2>
        <p class="tt-pkind">Ezeket a tantervi háló nem tartalmazza (nem ennek a szaknak a tárgyai), kézzel vezetheted itt.</p>

        <h3 class="tt-subh">Testnevelés — ${pe.log.length}/2 teljesítve</h3>
        ${pe.log.map((it, i) => delRow(it.name, '', 'pedel', i)).join('')}
        <div class="tt-reqadd">
          <input type="text" class="tt-in-text tt-pename" placeholder="pl. Testnevelés ${pe.log.length + 1}">
          <button type="button" class="tt-btn" data-peadd="1">Hozzáadás</button>
        </div>

        <h3 class="tt-subh">Szabadon választható — ${freeCredits()}${free.target ? ' / ' + free.target : ''} kredit</h3>
        <p class="tt-pkind">Cél kredit: <input type="number" class="tt-target-input" data-target="free" value="${free.target || ''}" placeholder="?" min="0"></p>
        ${free.log.map((it, i) => delRow(it.name, `<span class="tt-kr">${it.credits} kredit</span>`, 'freedel', i)).join('')}
        <div class="tt-reqadd">
          <input type="text" class="tt-in-text tt-freename" placeholder="Tárgy neve">
          <input type="number" class="tt-in-num tt-freekr" placeholder="kredit" min="0">
          <button type="button" class="tt-btn" data-freeadd="1">Hozzáadás</button>
        </div>

        <h3 class="tt-subh">Kötelezően választható — ${electiveCredits()}${el.target ? ' / ' + el.target : ''} kredit</h3>
        <p class="tt-pkind">Cél kredit: <input type="number" class="tt-target-input" data-target="elective" value="${el.target || ''}" placeholder="?" min="0"><br>
          A „Választható tárgyak” közül eddig felvett/hozzáadott tárgyaid alapján automatikusan számolva, nem kell külön naplózni.</p>`;
    }

    /* ---------- actions ---------- */
    function addTo(n, s) {
      s = +s;
      Object.keys(S.added).forEach(k => { S.added[k] = S.added[k].filter(x => x !== n); });
      (S.added[s] = S.added[s] || []).push(n);
      commit(); toast(`Hozzáadva: ${n}, ${s}. félév`);
    }
    function removeFrom(n) {
      Object.keys(S.added).forEach(k => { S.added[k] = S.added[k].filter(x => x !== n); });
      delete S.status[n];
      commit(); toast(`Eltávolítva: ${n}`);
    }
    function close() { panel = null; selected = null; render(); }

    function onClick(e) {
      const t = e.target.closest('button, .tt-scrim');
      if (!t || !root.contains(t)) return;
      const d = t.dataset;
      if (t.classList.contains('tt-scrim') || d.act === 'close') return close();
      if (d.spec) { S.spec = d.spec; commit(); return toast(`Specializáció: ${plan().label}`); }
      if (d.cycle) { const cur = S.status[d.cycle] || ''; const next = cur === '' ? 'now' : cur === 'now' ? 'done' : ''; if (next) S.status[d.cycle] = next; else delete S.status[d.cycle]; return commit(); }
      if (d.set !== undefined) { if (d.set) S.status[panel] = d.set; else delete S.status[panel]; return commit(); }
      if (d.open) { selected = d.open; panel = d.open; return render(); }
      if (d.add) return addTo(d.add, d.sem);
      if (d.addsel) return addTo(d.addsel, t.parentElement.querySelector('select').value);
      if (d.remove) return removeFrom(d.remove);
      if (d.term) { poolTerm = d.term; return renderPanel(); }
      if (d.peadd) {
        const inp = q('.tt-pename'), name = (inp.value || '').trim() || `Testnevelés ${S.extra.pe.log.length + 1}`;
        S.extra.pe.log.push({ name }); return commit();
      }
      if (d.pedel !== undefined) { S.extra.pe.log.splice(+d.pedel, 1); return commit(); }
      if (d.freeadd) {
        const nameInp = q('.tt-freename'), krInp = q('.tt-freekr');
        const name = (nameInp.value || '').trim(), credits = Number(krInp.value) || 0;
        if (!name) return toast('Add meg a tárgy nevét');
        S.extra.free.log.push({ name, credits }); return commit();
      }
      if (d.freedel !== undefined) { S.extra.free.log.splice(+d.freedel, 1); return commit(); }
      if (d.act === 'pool') { selected = null; panel = 'pool'; return render(); }
      if (d.act === 'extra') { selected = null; panel = 'extra'; return render(); }
      if (d.act === 'backup') { selected = null; panel = 'backup'; return render(); }
      if (d.act === 'export') {
        const a = document.createElement('a');
        a.href = URL.createObjectURL(new Blob([JSON.stringify(S, null, 2)], { type: 'application/json' }));
        a.download = 'tanterv-haladas.json'; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 1000);
        return toast('Mentve: tanterv-haladas.json');
      }
      if (d.act === 'import') return q('.tt-file').click();
      if (d.act === 'reset') {
        if (confirm('Biztosan törlöd az összes jelölést és hozzáadott tárgyat?')) { S = normalize({ spec: S.spec }); commit(); toast('Minden jelölés törölve'); }
      }
    }
    function onInput(e) {
      if (!e.target.classList.contains('tt-search')) return;
      query = e.target.value.trim().toLowerCase(); renderBoard();
    }
    async function onChange(e) {
      if (e.target.classList.contains('tt-target-input')) {
        const key = e.target.dataset.target, v = e.target.value === '' ? null : Math.max(0, Number(e.target.value) || 0);
        S.extra[key].target = v; return commit();
      }
      if (!e.target.classList.contains('tt-file')) return;
      const f = e.target.files[0]; e.target.value = '';
      if (!f) return;
      try {
        const x = JSON.parse(await f.text());
        if (!(x.status || x.st) || !(x.added || x.add)) throw new Error('shape');
        S = normalize(x); commit(); toast('Betöltve: ' + f.name);
      } catch (err) { toast('Ez a fájl nem tanterv-mentés. A „Mentés fájlba” gombbal készült .json fájlt válaszd.'); }
    }
    function onKey(e) {
      if (!root.isConnected) return destroy();
      if (e.key === 'Escape' && panel) close();
    }
    function destroy() {
      destroyed = true;
      document.removeEventListener('keydown', onKey);
      root.removeEventListener('click', onClick);
      root.removeEventListener('input', onInput);
      root.removeEventListener('change', onChange);
    }

    const ready = (async () => {
      try {
        D = opts.data || await loadData(opts.dataUrl);
        S = normalize(await store.load());
      } catch (e) {
        root.innerHTML = `<p class="tt-error">A tanterv nem töltődött be (${esc(opts.dataUrl)}). Ellenőrizd, hogy a fájl elérhető-e.</p>`;
        throw e;
      }
      if (destroyed || !root.isConnected) return;
      shell();
      root.addEventListener('click', onClick);
      root.addEventListener('input', onInput);
      root.addEventListener('change', onChange);
      document.addEventListener('keydown', onKey);
      render();
      if (store.refresh) {
        const newer = await store.refresh();
        if (newer && !destroyed && root.isConnected) { S = normalize(newer); render(); }
      }
    })();

    return {
      ready,
      getState: () => JSON.parse(JSON.stringify(S)),
      setState: s => { S = normalize(s); commit(); },
      destroy,
    };
  }

  global.Tanterv = { mount, localStore, hybridStore };
})(window);
