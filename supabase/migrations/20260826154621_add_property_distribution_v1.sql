create table public.property_publications (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  property_id uuid not null references public.properties(id) on delete cascade,
  channel text not null default 'REVSCALE_WEB' check (channel in ('REVSCALE_WEB','MERCADOLIBRE','GALLITO','INFOCASAS')),
  status text not null default 'DRAFT' check (status in ('DRAFT','READY','PUBLISHED','PAUSED','ERROR')),
  organization_name text not null,
  organization_slug text not null,
  public_slug text,
  title text not null,
  description text,
  property_type text,
  operation text,
  zone text,
  address_label text,
  price numeric(18,2) check (price is null or price >= 0),
  currency text,
  bedrooms integer check (bedrooms is null or bedrooms >= 0),
  bathrooms integer check (bathrooms is null or bathrooms >= 0),
  area_m2 numeric(12,2) check (area_m2 is null or area_m2 >= 0),
  cover_image_url text,
  gallery_urls text[] not null default '{}',
  features text[] not null default '{}',
  contact_name text,
  contact_phone text,
  external_id text,
  external_url text,
  sync_error text,
  published_at timestamptz,
  last_synced_at timestamptz,
  created_by uuid,
  updated_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint property_publications_property_channel_uidx unique (property_id, channel),
  constraint property_publications_public_slug_required check (
    channel <> 'REVSCALE_WEB' or status <> 'PUBLISHED' or nullif(trim(public_slug), '') is not null
  )
);

create unique index property_publications_public_slug_uidx
  on public.property_publications (public_slug)
  where public_slug is not null;

create index property_publications_org_channel_status_idx
  on public.property_publications (organization_id, channel, status);

create index property_publications_public_catalog_idx
  on public.property_publications (organization_slug, published_at desc)
  where channel = 'REVSCALE_WEB' and status = 'PUBLISHED';

create or replace function private.can_manage_property_distribution(org_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.organization_members om
    join public.subscriptions s on s.organization_id = om.organization_id
    where om.organization_id = org_id
      and om.user_id = (select auth.uid())
      and om.status = 'ACTIVE'
      and om.role in ('OWNER','MANAGER')
      and upper(coalesce(s.status, 'INACTIVE')) = 'ACTIVE'
      and upper(coalesce(s.plan, 'TRIAL')) in ('PRO','PROFESSIONAL','ENTERPRISE')
  );
$$;

revoke all on function private.can_manage_property_distribution(uuid) from public, anon;
grant execute on function private.can_manage_property_distribution(uuid) to authenticated;

alter table public.property_publications enable row level security;

revoke all on table public.property_publications from anon, authenticated;
grant select on table public.property_publications to anon;
grant select, insert, update, delete on table public.property_publications to authenticated;

create policy "public can view published revscale listings"
on public.property_publications
for select
to anon, authenticated
using (channel = 'REVSCALE_WEB' and status = 'PUBLISHED');

create policy "members can view organization publications"
on public.property_publications
for select
to authenticated
using ((select private.is_org_member(organization_id)));

create policy "management can create property publications"
on public.property_publications
for insert
to authenticated
with check ((select private.can_manage_property_distribution(organization_id)));

create policy "management can update property publications"
on public.property_publications
for update
to authenticated
using ((select private.can_manage_property_distribution(organization_id)))
with check ((select private.can_manage_property_distribution(organization_id)));

create policy "management can delete property publications"
on public.property_publications
for delete
to authenticated
using ((select private.can_manage_property_distribution(organization_id)));
