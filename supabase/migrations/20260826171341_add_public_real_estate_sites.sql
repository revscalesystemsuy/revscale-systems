create table if not exists public.brokerage_public_sites (
  organization_id uuid primary key references public.organizations(id) on delete cascade,
  site_slug text not null unique,
  is_active boolean not null default false,
  tagline text,
  about text,
  logo_url text,
  hero_image_url text,
  accent_color text not null default '#302d28',
  public_phone text,
  public_email text,
  public_whatsapp text,
  public_address text,
  instagram_url text,
  facebook_url text,
  seo_title text,
  seo_description text,
  lead_capture_enabled boolean not null default true,
  custom_domain text unique,
  custom_domain_status text not null default 'NOT_CONFIGURED',
  hide_revscale_branding boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint brokerage_public_sites_slug_check check (site_slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$' and char_length(site_slug) between 2 and 80),
  constraint brokerage_public_sites_accent_color_check check (accent_color ~ '^#[0-9A-Fa-f]{6}$'),
  constraint brokerage_public_sites_domain_status_check check (custom_domain_status in ('NOT_CONFIGURED','PENDING','VERIFYING','ACTIVE','ERROR')),
  constraint brokerage_public_sites_custom_domain_check check (custom_domain is null or (char_length(custom_domain) between 4 and 253 and custom_domain = lower(custom_domain) and custom_domain !~ '^[a-z]+://'))
);

create table if not exists public.public_site_inquiries (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  property_id uuid references public.properties(id) on delete set null,
  publication_id uuid references public.property_publications(id) on delete set null,
  lead_id uuid references public.leads(id) on delete set null,
  full_name text not null,
  phone text,
  email text,
  message text,
  site_slug text not null,
  property_slug text,
  utm_source text,
  utm_medium text,
  utm_campaign text,
  utm_content text,
  referrer text,
  page_path text,
  created_at timestamptz not null default now(),
  constraint public_site_inquiries_contact_check check (coalesce(nullif(trim(phone), ''), nullif(trim(email), '')) is not null)
);

create index if not exists public_site_inquiries_org_created_idx on public.public_site_inquiries (organization_id, created_at desc);
create index if not exists public_site_inquiries_lead_idx on public.public_site_inquiries (lead_id) where lead_id is not null;

create table if not exists private.public_site_rate_limits (
  ip_hash text not null,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  requested_at timestamptz not null default now()
);
create index if not exists public_site_rate_limits_lookup_idx on private.public_site_rate_limits (organization_id, ip_hash, requested_at desc);

create or replace function private.can_manage_public_site(target_organization_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.organization_members om
    join public.subscriptions s on s.organization_id = om.organization_id
    where om.organization_id = target_organization_id
      and om.user_id = (select auth.uid())
      and om.status = 'ACTIVE'
      and om.role in ('OWNER','MANAGER')
      and s.status = 'ACTIVE'
      and upper(s.plan) in ('PRO','PROFESSIONAL','ENTERPRISE')
  );
$$;
revoke all on function private.can_manage_public_site(uuid) from public, anon;
grant execute on function private.can_manage_public_site(uuid) to authenticated;

create or replace function private.enforce_public_site_plan()
returns trigger language plpgsql security definer set search_path = '' as $$
declare current_plan text;
begin
  select upper(s.plan) into current_plan from public.subscriptions s
  where s.organization_id = new.organization_id and s.status = 'ACTIVE' limit 1;
  if current_plan not in ('PRO','PROFESSIONAL','ENTERPRISE') then raise exception 'Public real-estate sites require Professional or Enterprise'; end if;
  if (new.custom_domain is not null or new.hide_revscale_branding) and current_plan <> 'ENTERPRISE' then raise exception 'Custom domains and white-label require Enterprise'; end if;
  new.updated_at := now();
  return new;
end;
$$;
revoke all on function private.enforce_public_site_plan() from public, anon, authenticated;
drop trigger if exists trg_enforce_public_site_plan on public.brokerage_public_sites;
create trigger trg_enforce_public_site_plan before insert or update on public.brokerage_public_sites for each row execute function private.enforce_public_site_plan();

alter table public.brokerage_public_sites enable row level security;
alter table public.public_site_inquiries enable row level security;
revoke all on public.brokerage_public_sites from anon, authenticated;
revoke all on public.public_site_inquiries from anon, authenticated;
grant select on public.brokerage_public_sites to anon;
grant select, insert, update, delete on public.brokerage_public_sites to authenticated;
grant select on public.public_site_inquiries to authenticated;

create policy "public can read active brokerage sites" on public.brokerage_public_sites for select to anon using (
  is_active and exists (select 1 from public.subscriptions s where s.organization_id = brokerage_public_sites.organization_id and s.status = 'ACTIVE' and upper(s.plan) in ('PRO','PROFESSIONAL','ENTERPRISE'))
);
create policy "members can read brokerage sites" on public.brokerage_public_sites for select to authenticated using (
  (is_active and exists (select 1 from public.subscriptions s where s.organization_id = brokerage_public_sites.organization_id and s.status = 'ACTIVE' and upper(s.plan) in ('PRO','PROFESSIONAL','ENTERPRISE')))
  or exists (select 1 from public.organization_members om where om.organization_id = brokerage_public_sites.organization_id and om.user_id = (select auth.uid()) and om.status = 'ACTIVE')
);
create policy "management can insert brokerage sites" on public.brokerage_public_sites for insert to authenticated with check ((select private.can_manage_public_site(organization_id)));
create policy "management can update brokerage sites" on public.brokerage_public_sites for update to authenticated using ((select private.can_manage_public_site(organization_id))) with check ((select private.can_manage_public_site(organization_id)));
create policy "owner can delete brokerage sites" on public.brokerage_public_sites for delete to authenticated using (
  exists (select 1 from public.organization_members om where om.organization_id = brokerage_public_sites.organization_id and om.user_id = (select auth.uid()) and om.status = 'ACTIVE' and om.role = 'OWNER')
);
create policy "management can read site inquiries" on public.public_site_inquiries for select to authenticated using (
  exists (select 1 from public.organization_members om where om.organization_id = public_site_inquiries.organization_id and om.user_id = (select auth.uid()) and om.status = 'ACTIVE' and om.role in ('OWNER','MANAGER'))
);

create or replace function public.submit_public_site_inquiry(
  p_site_slug text, p_property_slug text default null, p_full_name text default null, p_phone text default null,
  p_email text default null, p_message text default null, p_utm_source text default null, p_utm_medium text default null,
  p_utm_campaign text default null, p_utm_content text default null, p_referrer text default null, p_page_path text default null,
  p_honeypot text default null
) returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  site_row public.brokerage_public_sites%rowtype;
  publication_row public.property_publications%rowtype;
  normalized_phone text; normalized_email text; lead_uuid uuid; request_headers jsonb; client_ip text; request_hash text;
  recent_count integer; lead_operation text;
begin
  if coalesce(trim(p_honeypot), '') <> '' then return jsonb_build_object('ok', true); end if;
  if p_site_slug is null or char_length(trim(p_site_slug)) < 2 or char_length(trim(p_site_slug)) > 80 then raise exception 'Invalid site'; end if;
  if p_full_name is null or char_length(trim(p_full_name)) < 2 or char_length(trim(p_full_name)) > 120 then raise exception 'Name is required'; end if;
  if coalesce(char_length(trim(p_phone)), 0) > 40 or coalesce(char_length(trim(p_email)), 0) > 180 then raise exception 'Invalid contact'; end if;
  if coalesce(nullif(trim(p_phone), ''), nullif(trim(p_email), '')) is null then raise exception 'Phone or email is required'; end if;
  if coalesce(char_length(p_message), 0) > 2000 then raise exception 'Message is too long'; end if;

  select bps.* into site_row from public.brokerage_public_sites bps
  where bps.site_slug = lower(trim(p_site_slug)) and bps.is_active = true and bps.lead_capture_enabled = true
    and exists (select 1 from public.subscriptions s where s.organization_id = bps.organization_id and s.status = 'ACTIVE' and upper(s.plan) in ('PRO','PROFESSIONAL','ENTERPRISE')) limit 1;
  if site_row.organization_id is null then raise exception 'Site unavailable'; end if;

  if nullif(trim(p_property_slug), '') is not null then
    select pp.* into publication_row from public.property_publications pp
    where pp.organization_id = site_row.organization_id and pp.public_slug = trim(p_property_slug) and pp.channel = 'REVSCALE_WEB' and pp.status = 'PUBLISHED' limit 1;
    if publication_row.id is null then raise exception 'Property unavailable'; end if;
  end if;

  request_headers := coalesce(current_setting('request.headers', true), '{}')::jsonb;
  client_ip := split_part(coalesce(request_headers->>'x-forwarded-for', request_headers->>'cf-connecting-ip', 'unknown'), ',', 1);
  request_hash := encode(extensions.digest(client_ip || ':' || site_row.organization_id::text, 'sha256'), 'hex');
  select count(*) into recent_count from private.public_site_rate_limits r
    where r.organization_id = site_row.organization_id and r.ip_hash = request_hash and r.requested_at >= now() - interval '10 minutes';
  if recent_count >= 15 then raise exception 'Too many requests. Try again later.'; end if;
  insert into private.public_site_rate_limits (ip_hash, organization_id) values (request_hash, site_row.organization_id);

  normalized_phone := nullif(regexp_replace(coalesce(p_phone, ''), '[^0-9]+', '', 'g'), '');
  normalized_email := nullif(lower(trim(coalesce(p_email, ''))), '');
  if normalized_phone is not null then
    select l.id into lead_uuid from public.leads l where l.organization_id = site_row.organization_id and l.phone_normalized = normalized_phone order by l.created_at desc limit 1;
  elsif normalized_email is not null then
    select l.id into lead_uuid from public.leads l where l.organization_id = site_row.organization_id and lower(coalesce(l.email, '')) = normalized_email order by l.created_at desc limit 1;
  end if;
  lead_operation := case upper(coalesce(publication_row.operation, '')) when 'VENTA' then 'COMPRA' when 'COMPRA' then 'COMPRA' when 'ALQUILER' then 'ALQUILER' else null end;

  if lead_uuid is null then
    insert into public.leads (organization_id, full_name, phone, email, operation, property_type, primary_zone, source_channel, source_provider, source_listing, source_property_id, utm_source, utm_medium, utm_campaign, utm_content, received_at, requires_human, next_action)
    values (site_row.organization_id, trim(p_full_name), nullif(trim(p_phone), ''), normalized_email, lead_operation, publication_row.property_type, publication_row.zone, 'WEB', 'REVSCALE_SITE', publication_row.public_slug, publication_row.property_id,
      nullif(left(trim(coalesce(p_utm_source, '')), 120), ''), nullif(left(trim(coalesce(p_utm_medium, '')), 120), ''), nullif(left(trim(coalesce(p_utm_campaign, '')), 160), ''), nullif(left(trim(coalesce(p_utm_content, '')), 160), ''), now(), true,
      case when publication_row.id is not null then 'Responder consulta web sobre propiedad' else 'Responder consulta desde el sitio web' end)
    returning id into lead_uuid;
  else
    update public.leads l set full_name = coalesce(nullif(l.full_name, ''), trim(p_full_name)), phone = coalesce(nullif(l.phone, ''), nullif(trim(p_phone), '')), email = coalesce(nullif(l.email, ''), normalized_email),
      source_property_id = coalesce(l.source_property_id, publication_row.property_id), source_listing = coalesce(l.source_listing, publication_row.public_slug), updated_at = now(), requires_human = true,
      next_action = case when publication_row.id is not null then 'Responder nueva consulta web sobre propiedad' else 'Responder nueva consulta desde el sitio web' end
    where l.id = lead_uuid;
  end if;

  insert into public.public_site_inquiries (organization_id, property_id, publication_id, lead_id, full_name, phone, email, message, site_slug, property_slug, utm_source, utm_medium, utm_campaign, utm_content, referrer, page_path)
  values (site_row.organization_id, publication_row.property_id, publication_row.id, lead_uuid, trim(p_full_name), nullif(trim(p_phone), ''), normalized_email, nullif(trim(p_message), ''), site_row.site_slug, publication_row.public_slug,
    nullif(left(trim(coalesce(p_utm_source, '')), 120), ''), nullif(left(trim(coalesce(p_utm_medium, '')), 120), ''), nullif(left(trim(coalesce(p_utm_campaign, '')), 160), ''), nullif(left(trim(coalesce(p_utm_content, '')), 160), ''),
    nullif(left(trim(coalesce(p_referrer, '')), 500), ''), nullif(left(trim(coalesce(p_page_path, '')), 500), ''));
  return jsonb_build_object('ok', true);
end;
$$;
revoke all on function public.submit_public_site_inquiry(text,text,text,text,text,text,text,text,text,text,text,text,text) from public, authenticated;
grant execute on function public.submit_public_site_inquiry(text,text,text,text,text,text,text,text,text,text,text,text,text) to anon;

insert into public.brokerage_public_sites (organization_id, site_slug, is_active, tagline, public_whatsapp, seo_title, seo_description)
select distinct o.id, coalesce(nullif(o.slug, ''), 'inmobiliaria-' || left(o.id::text, 8)), true, 'Propiedades seleccionadas y atención personalizada.', null,
  coalesce(o.name, 'Inmobiliaria') || ' | Propiedades', 'Propiedades disponibles de ' || coalesce(o.name, 'esta inmobiliaria') || '.'
from public.organizations o join public.property_publications pp on pp.organization_id = o.id join public.subscriptions s on s.organization_id = o.id
where pp.channel = 'REVSCALE_WEB' and pp.status = 'PUBLISHED' and s.status = 'ACTIVE' and upper(s.plan) in ('PRO','PROFESSIONAL','ENTERPRISE')
on conflict (organization_id) do nothing;