-- Órarend data-sync schema. Run this once in your Supabase project's SQL Editor
-- (Project → SQL Editor → New query → paste → Run). Not executed by anything in
-- this repo automatically — this file is the source of truth for the schema,
-- kept here so it's version-controlled alongside the code that depends on it.
--
-- See CLAUDE.md's "Account sync (Supabase)" section for the full picture: what
-- this is for (syncing your own data across devices), what it explicitly is
-- NOT for (site-wide access control — that's Cloudflare Access, unrelated to
-- this), and why the anon key js/sync.js uses is safe to commit.

-- One row per signed-in user, for a display username. auth.users (Supabase's
-- own built-in table) already has email/password — this just adds a friendly
-- display name, since "signed in as roland@example.com" is worse UI than a
-- chosen username.
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique,
  created_at timestamptz not null default now()
);

-- Generic per-user key/value store — one row per (user, feature). This is
-- deliberately generic rather than one table per feature: it mirrors the
-- app's existing "one JSON blob per feature" localStorage convention
-- (orarend-theme, orarend-checklists-v1, orarend-tanterv-v1) exactly, and a
-- new synced feature later just picks a new `key` string — no new table, no
-- migration, nothing else in this file to touch.
create table user_data (
  user_id uuid not null references auth.users(id) on delete cascade,
  key text not null,
  value jsonb not null,
  updated_at timestamptz not null default now(),
  primary key (user_id, key)
);

-- Row Level Security: this is the actual security boundary (not the anon key,
-- which is meant to be public). Without these policies enabled, any signed-in
-- user could read/write any other user's rows.
alter table profiles enable row level security;
alter table user_data enable row level security;

create policy "own profile" on profiles
  for all using (id = auth.uid()) with check (id = auth.uid());

create policy "own data" on user_data
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Phase 2 (not built yet — see docs/ROADMAP.md) will add a `timetables` table
-- the same way, once someone actually needs to upload one.
