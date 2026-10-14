-- REA webapp: cross-device research library.
-- One row per analyzed site per user, the full report as JSON, rendered images in Storage.
-- Apply with the Supabase SQL editor or `supabase db push`. Safe to re-run.

create table if not exists public.rea_sites (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  url text not null,
  host text not null,
  title text,
  site_type text,
  entry jsonb not null default '{}'::jsonb,        -- card data (thumb paths, palette, counts)
  report_version int,
  analyzed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, url)
);

create table if not exists public.rea_reports (
  site_id uuid primary key references public.rea_sites (id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  report jsonb not null,                            -- full report, images replaced by storage paths
  bytes int,
  updated_at timestamptz not null default now()
);

create index if not exists rea_sites_user_updated on public.rea_sites (user_id, updated_at desc);
create index if not exists rea_sites_user_host on public.rea_sites (user_id, host);

create or replace function public.rea_touch_updated_at() returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;
drop trigger if exists rea_sites_touch on public.rea_sites;
create trigger rea_sites_touch before update on public.rea_sites for each row execute function public.rea_touch_updated_at();
drop trigger if exists rea_reports_touch on public.rea_reports;
create trigger rea_reports_touch before update on public.rea_reports for each row execute function public.rea_touch_updated_at();

alter table public.rea_sites enable row level security;
alter table public.rea_reports enable row level security;

drop policy if exists "rea_sites: owner" on public.rea_sites;
create policy "rea_sites: owner" on public.rea_sites
  for all to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
drop policy if exists "rea_reports: owner" on public.rea_reports;
create policy "rea_reports: owner" on public.rea_reports
  for all to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

-- Private bucket for renders: <user_id>/<site hash>/<kind>.jpg
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('rea-renders', 'rea-renders', false, 8388608, array['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml', 'image/x-icon', 'image/gif'])
on conflict (id) do nothing;

drop policy if exists "rea-renders: owner read" on storage.objects;
create policy "rea-renders: owner read" on storage.objects for select to authenticated
  using (bucket_id = 'rea-renders' and (storage.foldername(name))[1] = (select auth.uid())::text);
drop policy if exists "rea-renders: owner write" on storage.objects;
create policy "rea-renders: owner write" on storage.objects for insert to authenticated
  with check (bucket_id = 'rea-renders' and (storage.foldername(name))[1] = (select auth.uid())::text);
drop policy if exists "rea-renders: owner update" on storage.objects;
create policy "rea-renders: owner update" on storage.objects for update to authenticated
  using (bucket_id = 'rea-renders' and (storage.foldername(name))[1] = (select auth.uid())::text);
drop policy if exists "rea-renders: owner delete" on storage.objects;
create policy "rea-renders: owner delete" on storage.objects for delete to authenticated
  using (bucket_id = 'rea-renders' and (storage.foldername(name))[1] = (select auth.uid())::text);

-- Portfolio: the user's own brands, offers and projects the agent compares every site against.
create table if not exists public.rea_portfolio (
  user_id uuid primary key default auth.uid() references auth.users (id) on delete cascade,
  items jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now()
);
alter table public.rea_portfolio enable row level security;
drop policy if exists "rea_portfolio: owner" on public.rea_portfolio;
create policy "rea_portfolio: owner" on public.rea_portfolio
  for all to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
drop trigger if exists rea_portfolio_touch on public.rea_portfolio;
create trigger rea_portfolio_touch before update on public.rea_portfolio for each row execute function public.rea_touch_updated_at();
