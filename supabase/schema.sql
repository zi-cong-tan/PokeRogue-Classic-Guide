-- Saved teams for the PokeRogue Field Guide. Paste into Supabase: SQL Editor > New query > Run. Safe to run twice.
-- Each row is one named team. Row level security means a signed-in person can only see and change their own rows,
-- so the public "anon" key in the website cannot read anyone else's teams.

create table if not exists public.teams (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 60),
  party jsonb not null default '[]',
  builds jsonb not null default '{}',
  updated_at timestamptz not null default now(),
  -- a team is a few KB; this stops anyone using the table as free storage
  check (pg_column_size(party) + pg_column_size(builds) < 64000)
);

create index if not exists teams_user_id on public.teams (user_id);

alter table public.teams enable row level security;

drop policy if exists "own teams: read" on public.teams;
drop policy if exists "own teams: add" on public.teams;
drop policy if exists "own teams: change" on public.teams;
drop policy if exists "own teams: delete" on public.teams;

create policy "own teams: read" on public.teams for select to authenticated using ((select auth.uid()) = user_id);
create policy "own teams: add" on public.teams for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "own teams: change" on public.teams for update to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "own teams: delete" on public.teams for delete to authenticated using ((select auth.uid()) = user_id);
