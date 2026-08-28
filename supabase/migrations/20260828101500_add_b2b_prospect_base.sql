create table if not exists public.b2b_prospects (
  id uuid primary key default gen_random_uuid(),
  company_name text not null,
  website_url text,
  city text not null,
  department text not null,
  country text not null default 'Uruguay',
  discovery_source text not null check (discovery_source in ('GOOGLE_MAPS','DIRECTORY','WEB_SEARCH','REFERRAL','MANUAL')),
  discovery_url text,
  external_ref text,
  listing_count_hint integer check (listing_count_hint is null or listing_count_hint >= 0),
  discovery_note text,
  status text not null default 'RESEARCH' check (status in ('RESEARCH','ENRICHING','READY','DISQUALIFIED','PROMOTED')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists b2b_prospects_company_city_unique
  on public.b2b_prospects (lower(company_name), lower(city));
create unique index if not exists b2b_prospects_external_ref_unique
  on public.b2b_prospects (external_ref) where external_ref is not null;
create index if not exists b2b_prospects_status_location_idx
  on public.b2b_prospects (status, department, city, created_at desc);

alter table public.b2b_prospects enable row level security;
revoke all on table public.b2b_prospects from anon, public;
grant select, insert, update, delete on table public.b2b_prospects to authenticated;
grant select, insert, update, delete on table public.b2b_prospects to service_role;

drop policy if exists "platform admins can view b2b prospects" on public.b2b_prospects;
create policy "platform admins can view b2b prospects"
on public.b2b_prospects for select to authenticated
using (exists (select 1 from public.platform_admins pa where pa.user_id = (select auth.uid())));

drop policy if exists "platform admins can insert b2b prospects" on public.b2b_prospects;
create policy "platform admins can insert b2b prospects"
on public.b2b_prospects for insert to authenticated
with check (exists (select 1 from public.platform_admins pa where pa.user_id = (select auth.uid())));

drop policy if exists "platform admins can update b2b prospects" on public.b2b_prospects;
create policy "platform admins can update b2b prospects"
on public.b2b_prospects for update to authenticated
using (exists (select 1 from public.platform_admins pa where pa.user_id = (select auth.uid())))
with check (exists (select 1 from public.platform_admins pa where pa.user_id = (select auth.uid())));

drop policy if exists "platform admins can delete b2b prospects" on public.b2b_prospects;
create policy "platform admins can delete b2b prospects"
on public.b2b_prospects for delete to authenticated
using (exists (select 1 from public.platform_admins pa where pa.user_id = (select auth.uid())));