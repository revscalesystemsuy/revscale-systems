create table public.legal_acceptances (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  document_type text not null check (document_type in ('TERMS','PRIVACY')),
  document_version text not null check (char_length(document_version) between 1 and 40),
  source text not null default 'SIGN_UP' check (source in ('SIGN_UP','ONBOARDING','UPDATE_PROMPT','ADMIN')),
  accepted_at timestamptz not null default now(),
  evidence jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (user_id, document_type, document_version)
);

alter table public.legal_acceptances enable row level security;
revoke all on table public.legal_acceptances from anon;
revoke insert, update, delete on table public.legal_acceptances from authenticated;
grant select on table public.legal_acceptances to authenticated;

create policy "users can view own legal acceptances"
on public.legal_acceptances
for select
to authenticated
using (user_id = (select auth.uid()));

create or replace function private.capture_revscale_legal_acceptance()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  terms_version text;
  privacy_version text;
begin
  if coalesce(new.raw_user_meta_data->>'revscale_legal_acceptance','') <> 'true' then
    return new;
  end if;

  terms_version := nullif(left(trim(coalesce(new.raw_user_meta_data->>'revscale_terms_version','')), 40), '');
  privacy_version := nullif(left(trim(coalesce(new.raw_user_meta_data->>'revscale_privacy_version','')), 40), '');

  if terms_version is not null then
    insert into public.legal_acceptances (user_id, document_type, document_version, source, accepted_at, evidence)
    values (new.id, 'TERMS', terms_version, 'SIGN_UP', now(), jsonb_build_object('method','signup_checkbox'))
    on conflict (user_id, document_type, document_version) do nothing;
  end if;

  if privacy_version is not null then
    insert into public.legal_acceptances (user_id, document_type, document_version, source, accepted_at, evidence)
    values (new.id, 'PRIVACY', privacy_version, 'SIGN_UP', now(), jsonb_build_object('method','signup_checkbox'))
    on conflict (user_id, document_type, document_version) do nothing;
  end if;

  return new;
end;
$$;

revoke all on function private.capture_revscale_legal_acceptance() from public, anon, authenticated;

drop trigger if exists capture_revscale_legal_acceptance on auth.users;
create trigger capture_revscale_legal_acceptance
after insert on auth.users
for each row execute function private.capture_revscale_legal_acceptance();

create table public.contact_consents (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  lead_id uuid references public.leads(id) on delete set null,
  inquiry_id uuid references public.public_site_inquiries(id) on delete set null,
  scope text not null check (scope in ('DATA_PROCESSING','WHATSAPP_SERVICE','WHATSAPP_MARKETING')),
  status text not null default 'GRANTED' check (status in ('GRANTED','REVOKED')),
  contact_phone text,
  contact_email text,
  source text not null check (source in ('PUBLIC_SITE','WHATSAPP_INBOUND','MANUAL','IMPORT','OTHER')),
  notice_version text not null check (char_length(notice_version) between 1 and 40),
  notice_text text not null check (char_length(notice_text) between 1 and 1500),
  evidence jsonb not null default '{}'::jsonb,
  granted_at timestamptz not null default now(),
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  constraint contact_consents_revocation_time check (status <> 'REVOKED' or revoked_at is not null)
);

create index contact_consents_org_lead_scope_idx
  on public.contact_consents (organization_id, lead_id, scope, granted_at desc);
create index contact_consents_contact_phone_idx
  on public.contact_consents (organization_id, contact_phone, scope, granted_at desc)
  where contact_phone is not null;

alter table public.contact_consents enable row level security;
revoke all on table public.contact_consents from anon;
revoke insert, update, delete on table public.contact_consents from authenticated;
grant select on table public.contact_consents to authenticated;

create policy "organization members can view consent evidence"
on public.contact_consents
for select
to authenticated
using (private.is_org_member(organization_id));

create or replace function private.submit_public_site_inquiry_v2(
  p_site_slug text,
  p_property_slug text default null,
  p_full_name text default null,
  p_phone text default null,
  p_email text default null,
  p_message text default null,
  p_utm_source text default null,
  p_utm_medium text default null,
  p_utm_campaign text default null,
  p_utm_content text default null,
  p_referrer text default null,
  p_page_path text default null,
  p_honeypot text default null,
  p_privacy_accepted boolean default false,
  p_whatsapp_opt_in boolean default false
) returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  result jsonb;
  org_id uuid;
  org_name text;
  normalized_phone text;
  normalized_email text;
  lead_uuid uuid;
  inquiry_uuid uuid;
  privacy_notice text;
  whatsapp_notice text;
begin
  if coalesce(p_privacy_accepted, false) is not true then
    raise exception 'Privacy consent is required';
  end if;

  normalized_phone := nullif(regexp_replace(coalesce(p_phone, ''), '[^0-9]+', '', 'g'), '');
  normalized_email := nullif(lower(trim(coalesce(p_email, ''))), '');

  if coalesce(p_whatsapp_opt_in, false) and normalized_phone is null then
    raise exception 'WhatsApp consent requires a phone number';
  end if;

  result := private.submit_public_site_inquiry(
    p_site_slug, p_property_slug, p_full_name, p_phone, p_email, p_message,
    p_utm_source, p_utm_medium, p_utm_campaign, p_utm_content, p_referrer, p_page_path, p_honeypot
  );

  if coalesce(trim(p_honeypot), '') <> '' then
    return result;
  end if;

  select bps.organization_id, o.name
    into org_id, org_name
  from public.brokerage_public_sites bps
  join public.organizations o on o.id = bps.organization_id
  where bps.site_slug = lower(trim(p_site_slug))
    and bps.is_active = true
  limit 1;

  if org_id is null then
    return result;
  end if;

  if normalized_phone is not null then
    select l.id into lead_uuid
    from public.leads l
    where l.organization_id = org_id and l.phone_normalized = normalized_phone
    order by l.created_at desc
    limit 1;
  elsif normalized_email is not null then
    select l.id into lead_uuid
    from public.leads l
    where l.organization_id = org_id and lower(coalesce(l.email, '')) = normalized_email
    order by l.created_at desc
    limit 1;
  end if;

  if lead_uuid is not null then
    select psi.id into inquiry_uuid
    from public.public_site_inquiries psi
    where psi.organization_id = org_id and psi.lead_id = lead_uuid
    order by psi.created_at desc
    limit 1;
  end if;

  privacy_notice := 'Acepto que ' || coalesce(nullif(trim(org_name), ''), 'la inmobiliaria') || ' trate mis datos para responder esta consulta y que RevScale Systems los procese como proveedor tecnológico conforme a la Política de privacidad.';

  insert into public.contact_consents (
    organization_id, lead_id, inquiry_id, scope, status, contact_phone, contact_email,
    source, notice_version, notice_text, evidence, granted_at
  ) values (
    org_id, lead_uuid, inquiry_uuid, 'DATA_PROCESSING', 'GRANTED', normalized_phone, normalized_email,
    'PUBLIC_SITE', '2026-09-01', privacy_notice,
    jsonb_build_object('site_slug', lower(trim(p_site_slug)), 'page_path', nullif(left(trim(coalesce(p_page_path,'')),500),''), 'referrer', nullif(left(trim(coalesce(p_referrer,'')),500),'')),
    now()
  );

  if coalesce(p_whatsapp_opt_in, false) then
    whatsapp_notice := 'Acepto recibir mensajes por WhatsApp de ' || coalesce(nullif(trim(org_name), ''), 'la inmobiliaria') || ' relacionados con esta consulta y propiedades relacionadas. Puedo retirar este consentimiento en cualquier momento.';
    insert into public.contact_consents (
      organization_id, lead_id, inquiry_id, scope, status, contact_phone, contact_email,
      source, notice_version, notice_text, evidence, granted_at
    ) values (
      org_id, lead_uuid, inquiry_uuid, 'WHATSAPP_SERVICE', 'GRANTED', normalized_phone, normalized_email,
      'PUBLIC_SITE', '2026-09-01', whatsapp_notice,
      jsonb_build_object('site_slug', lower(trim(p_site_slug)), 'explicit_opt_in', true),
      now()
    );
  end if;

  return result;
end;
$$;

revoke all on function private.submit_public_site_inquiry_v2(text,text,text,text,text,text,text,text,text,text,text,text,text,boolean,boolean) from public, anon, authenticated;
grant execute on function private.submit_public_site_inquiry_v2(text,text,text,text,text,text,text,text,text,text,text,text,text,boolean,boolean) to anon, authenticated, service_role;

create function public.submit_public_site_inquiry_v2(
  p_site_slug text,
  p_property_slug text default null,
  p_full_name text default null,
  p_phone text default null,
  p_email text default null,
  p_message text default null,
  p_utm_source text default null,
  p_utm_medium text default null,
  p_utm_campaign text default null,
  p_utm_content text default null,
  p_referrer text default null,
  p_page_path text default null,
  p_honeypot text default null,
  p_privacy_accepted boolean default false,
  p_whatsapp_opt_in boolean default false
) returns jsonb
language sql
security invoker
set search_path = ''
as $$
  select private.submit_public_site_inquiry_v2(
    p_site_slug, p_property_slug, p_full_name, p_phone, p_email, p_message,
    p_utm_source, p_utm_medium, p_utm_campaign, p_utm_content, p_referrer, p_page_path, p_honeypot,
    p_privacy_accepted, p_whatsapp_opt_in
  )
$$;

revoke execute on function public.submit_public_site_inquiry_v2(text,text,text,text,text,text,text,text,text,text,text,text,text,boolean,boolean) from public;
grant execute on function public.submit_public_site_inquiry_v2(text,text,text,text,text,text,text,text,text,text,text,text,text,boolean,boolean) to anon, authenticated, service_role;
