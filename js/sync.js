/* Sync – account + cross-device data sync via Supabase.
   Loaded via the Supabase UMD CDN build (index.html), before js/script.js and before
   tanterv-module's own registerModule() call. Exposes window.Sync. Classic script, not an
   ES module — same file:// reasoning js/script.js itself already documents (see CLAUDE.md).

   SUPABASE_URL/SUPABASE_ANON_KEY below are real project credentials. If they're ever reset back to
   the 'YOUR-PROJECT'/'YOUR-ANON-KEY' placeholders, every Sync call becomes a safe no-op and the app
   behaves exactly as it did before this existed (localStorage-only, no sign-in) — see CLAUDE.md's
   "Account sync (Supabase)" section.

   The anon key below is meant to be public — every Supabase client ships it, and Row Level
   Security (supabase/schema.sql) is the actual boundary, not secrecy. Never put a service-role
   key here or anywhere else client-side; that one actually is a secret. */
(function(global){
  'use strict';

  const SUPABASE_URL = 'zkdwrmvwrgvvinqxomqw.supabase.co';
  const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InprZHdybXZ3cmd2dmlucXhvbXF3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTAyNzMyODMsImV4cCI6MjEwNTg0OTI4M30.fXByj58AkMzEtDb6eUjTKFOsZ7I2wWo8W6ObUlgh4q4';
  const configured = SUPABASE_URL.indexOf('YOUR-PROJECT') === -1 && SUPABASE_ANON_KEY.indexOf('YOUR-ANON-KEY') === -1;
  const client = (configured && global.supabase) ? global.supabase.createClient('https://' + SUPABASE_URL, SUPABASE_ANON_KEY) : null;

  let user = null; // {id, email, username} | null
  const listeners = [];
  function setUser(u){ user = u; listeners.forEach(fn => fn(user)); }

  async function loadProfile(id){
    if(!client) return null;
    try{
      const { data } = await client.from('profiles').select('username').eq('id', id).maybeSingle();
      return data;
    }catch(e){ return null; }
  }
  async function toUser(session){
    if(!session) return null;
    const profile = await loadProfile(session.user.id);
    return { id: session.user.id, email: session.user.email, username: (profile && profile.username) || session.user.email };
  }

  /* Resolves once with the definitive initial auth state (not the placeholder null
     onAuthChange's listeners see immediately, before this check completes) — what the login-gate
     boot sequence in js/script.js awaits so it shows either the login screen or the app exactly
     once, with no flash of the wrong one. */
  const ready = client
    ? client.auth.getSession().then(({ data }) => toUser(data.session)).then(u => { setUser(u); return u; })
    : Promise.resolve(null);

  if(client){
    client.auth.onAuthStateChange((_event, session) => { toUser(session).then(setUser); });
  }

  async function signIn(email, password){
    if(!client) throw new Error('A szinkronizálás nincs beállítva.');
    const { error } = await client.auth.signInWithPassword({ email, password });
    if(error) throw new Error('Sikertelen bejelentkezés: hibás e-mail vagy jelszó.');
  }
  async function signOut(){ if(client) await client.auth.signOut(); }
  function currentUser(){ return user; }
  /* Called immediately with the current (possibly still-unknown) state, then again on every
     sign-in/out — mirrors the DOM-event-listener convention the rest of the app already uses
     (registerModule()'s mount(), Tanterv's own onChange option), not a new pattern. */
  function onAuthChange(fn){ listeners.push(fn); fn(user); }

  /* {load, save, refresh} — the exact shape Tanterv.hybridStore() already defines, so this is a
     drop-in `storage` option anywhere one's expected (see index.html's registerModule() call).
     `key` is used as-is for both the localStorage key and the remote user_data.key column — no
     prefixing — so passing an existing key (orarend-theme, orarend-checklists-v1,
     orarend-tanterv-v1) picks up whatever's already saved there rather than starting fresh.

     Callers pass/receive the plain value (a checklists array, a "dark"/"light" string, Tanterv's
     own state object — anything JSON-able), not a wrapper. Internally that value is wrapped as
     {value, updatedAt} so conflict resolution (newest updatedAt wins, same rule as
     Tanterv.hybridStore's own) works uniformly even for plain arrays/strings that don't carry
     their own updatedAt field the way Tanterv's state object happens to. Data already on disk
     from before Sync existed (a bare array/string, not our wrapper shape) is treated as
     updatedAt:0 — used as-is locally, and only ever loses to an actual newer remote copy once
     one exists, never silently discarded.

     Always returns a fully-working adapter, signed in or not: local persistence never depends on
     being signed in, remote sync is simply skipped (not an error) when there's no user. */
  function store(key){
    const raw = {
      load: async () => { try { return JSON.parse(localStorage.getItem(key)); } catch(e){ return null; } },
      save: async wrapped => { try { localStorage.setItem(key, JSON.stringify(wrapped)); } catch(e){} },
    };
    const unwrap = parsed => (parsed && typeof parsed === 'object' && 'value' in parsed && 'updatedAt' in parsed)
      ? parsed : { value: parsed, updatedAt: 0 };
    return {
      load: async () => (unwrap(await raw.load())).value,
      save: async value => {
        const wrapped = { value, updatedAt: Date.now() };
        await raw.save(wrapped);
        if(!client || !user) return;
        try{
          await client.from('user_data').upsert({
            user_id: user.id, key, value, updated_at: new Date(wrapped.updatedAt).toISOString(),
          });
        }catch(e){ /* stays local-only; the next save() or refresh() retries */ }
      },
      refresh: async () => {
        if(!client || !user) return null;
        let row;
        try{
          const { data } = await client.from('user_data').select('value,updated_at').eq('user_id', user.id).eq('key', key).maybeSingle();
          row = data;
        }catch(e){ return null; }
        if(!row) return null;
        const mine = unwrap(await raw.load());
        const remoteTs = new Date(row.updated_at).getTime();
        if(remoteTs > mine.updatedAt){ await raw.save({ value: row.value, updatedAt: remoteTs }); return row.value; }
        return null;
      },
    };
  }

  global.Sync = { signIn, signOut, currentUser, onAuthChange, store, ready };
})(window);
