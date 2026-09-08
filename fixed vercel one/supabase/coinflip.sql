-- BANKRO / Coinflip persistence for Supabase
-- Run this whole file once in Supabase SQL Editor.
--
-- This version is designed to work with BankRo's existing custom Roblox
-- verification login. It makes the PUBLIC coinflip feed persistent/realtime.
--
-- IMPORTANT:
-- The current frontend does not use Supabase Auth. Therefore these policies
-- are intentionally simple for a TEST/PROTOTYPE. Do NOT use this policy model
-- for real Robux/pet custody. Move balance/pet transfers + winner resolution
-- into a trusted server/Edge Function before going live.

create table if not exists public.coinflip_games (
  id text primary key,
  game jsonb not null,
  status text not null check (status in ('waiting', 'active', 'completed')),
  created_at timestamptz not null default now()
);

alter table public.coinflip_games enable row level security;

-- Include the old row in DELETE Realtime payloads so other browsers can remove it.
alter table public.coinflip_games replica identity full;

grant select, insert, update, delete on public.coinflip_games to anon, authenticated;

drop policy if exists "coinflips public read" on public.coinflip_games;
create policy "coinflips public read"
on public.coinflip_games
for select
to anon, authenticated
using (true);

drop policy if exists "coinflips public insert" on public.coinflip_games;
create policy "coinflips public insert"
on public.coinflip_games
for insert
to anon, authenticated
with check (true);

drop policy if exists "coinflips public update" on public.coinflip_games;
create policy "coinflips public update"
on public.coinflip_games
for update
to anon, authenticated
using (true)
with check (true);

drop policy if exists "coinflips public delete" on public.coinflip_games;
create policy "coinflips public delete"
on public.coinflip_games
for delete
to anon, authenticated
using (true);

-- Required for Postgres Changes / Realtime.
do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'coinflip_games'
  ) then
    alter publication supabase_realtime add table public.coinflip_games;
  end if;
end $$;
