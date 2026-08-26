-- Source attribution + speed-to-lead + SLA commercial foundation.
-- Applied to production Supabase as migration 20260826064355.

alter table public.leads
  add column if not exists source_channel text,
  add column if not exists source_provider text,
  add column if not exists source_campaign text,
  add column if not exists source_ad text,
  add column if not exists source_listing text,
  add column if not exists source_property_id uuid references public.properties(id) on delete set null,
  add column if not exists external_lead_id text,
  add column if not exists utm_source text,
  add column if not exists utm_medium text,
  add column if not exists utm_campaign text,
  add column if not exists utm_content text,
  add column if not exists received_at timestamptz default now(),
  add column if not exists first_response_at timestamptz,
  add column if not exists first_human_response_at timestamptz,
  add column if not exists sla_deadline timestamptz,
  add column if not exists sla_breached_at timestamptz;

update public.leads set received_at = created_at where received_at is null and created_at is not null;

create index if not exists idx_leads_org_source_channel on public.leads(organization_id, source_channel) where source_channel is not null;
create index if not exists idx_leads_org_source_provider on public.leads(organization_id, source_provider) where source_provider is not null;
create index if not exists idx_leads_org_source_campaign on public.leads(organization_id, source_campaign) where source_campaign is not null;
create index if not exists idx_leads_org_sla_deadline on public.leads(organization_id, sla_deadline) where sla_deadline is not null and first_human_response_at is null;
create index if not exists idx_leads_source_property on public.leads(source_property_id) where source_property_id is not null;
create unique index if not exists idx_leads_org_provider_external_unique on public.leads(organization_id, lower(source_provider), external_lead_id)
where source_provider is not null and btrim(source_provider) <> '' and external_lead_id is not null and btrim(external_lead_id) <> '';

create table if not exists public.organization_sla_settings (
  organization_id uuid primary key references public.organizations(id) on delete cascade,
  is_enabled boolean not null default true,
  first_human_response_minutes integer not null default 15 check (first_human_response_minutes between 1 and 1440),
  warning_minutes_before integer not null default 5 check (warning_minutes_before between 0 and 120),
  escalation_minutes_after integer not null default 15 check (escalation_minutes_after between 0 and 1440),
  auto_reassign_on_breach boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.organization_sla_settings enable row level security;
revoke all on table public.organization_sla_settings from public, anon;
grant select, insert, update on table public.organization_sla_settings to authenticated;

create policy "members can view organization sla settings" on public.organization_sla_settings for select to authenticated using (private.is_org_member(organization_id));
create policy "leaders can create organization sla settings" on public.organization_sla_settings for insert to authenticated with check (private.has_org_role(organization_id, array['OWNER'::text,'MANAGER'::text]));
create policy "leaders can update organization sla settings" on public.organization_sla_settings for update to authenticated using (private.has_org_role(organization_id, array['OWNER'::text,'MANAGER'::text])) with check (private.has_org_role(organization_id, array['OWNER'::text,'MANAGER'::text]));

insert into public.organization_sla_settings(organization_id) select id from public.organizations on conflict (organization_id) do nothing;

create or replace function private.ensure_organization_sla_settings() returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.organization_sla_settings(organization_id) values (new.id) on conflict (organization_id) do nothing;
  return new;
end; $$;
revoke all on function private.ensure_organization_sla_settings() from public, anon, authenticated;
drop trigger if exists trg_ensure_organization_sla_settings on public.organizations;
create trigger trg_ensure_organization_sla_settings after insert on public.organizations for each row execute function private.ensure_organization_sla_settings();

create or replace function private.set_lead_sla_clock() returns trigger language plpgsql security definer set search_path = '' as $$
declare response_minutes integer := 15;
begin
  if new.received_at is null and tg_op = 'INSERT' then new.received_at := coalesce(new.created_at, now()); end if;
  if tg_op = 'INSERT' and new.assigned_to is not null then
    new.assigned_at := coalesce(new.assigned_at, now());
  elsif tg_op = 'UPDATE' and old.assigned_to is null and new.assigned_to is not null then
    new.assigned_at := coalesce(new.assigned_at, now());
  end if;
  if new.assigned_to is not null and new.first_human_response_at is null and new.sla_deadline is null then
    select s.first_human_response_minutes into response_minutes from public.organization_sla_settings s where s.organization_id = new.organization_id and s.is_enabled = true;
    new.sla_deadline := new.assigned_at + make_interval(mins => coalesce(response_minutes,15));
  end if;
  return new;
end; $$;
revoke all on function private.set_lead_sla_clock() from public, anon, authenticated;
drop trigger if exists trg_zz_set_lead_sla_clock on public.leads;
create trigger trg_zz_set_lead_sla_clock before insert or update of assigned_to, assigned_at on public.leads for each row execute function private.set_lead_sla_clock();

create or replace function private.record_lead_response_sla() returns trigger language plpgsql security definer set search_path = '' as $$
declare actor_type text := upper(coalesce(new.actor,'')); direction_type text := upper(coalesce(new.direction,'')); is_human boolean;
begin
  if new.lead_id is null or direction_type <> 'OUTBOUND' then return new; end if;
  if actor_type not in ('AI','BOT','AUTOMATION','AGENT','MANAGER','OWNER','HUMAN','USER') then return new; end if;
  is_human := actor_type in ('AGENT','MANAGER','OWNER','HUMAN','USER');
  update public.leads l set
    first_response_at = case when l.first_response_at is null or new.created_at < l.first_response_at then new.created_at else l.first_response_at end,
    first_human_response_at = case when is_human and (l.first_human_response_at is null or new.created_at < l.first_human_response_at) then new.created_at else l.first_human_response_at end,
    sla_breached_at = case when is_human and l.sla_deadline is not null and new.created_at > l.sla_deadline and l.sla_breached_at is null then l.sla_deadline else l.sla_breached_at end,
    updated_at = now()
  where l.id = new.lead_id and l.organization_id = new.organization_id;
  return new;
end; $$;
revoke all on function private.record_lead_response_sla() from public, anon, authenticated;
drop trigger if exists trg_record_lead_response_sla on public.interactions;
create trigger trg_record_lead_response_sla after insert on public.interactions for each row execute function private.record_lead_response_sla();

create or replace function private.refresh_sla_notifications() returns integer language plpgsql security definer set search_path = '' as $$
declare created_count integer := 0; inserted_count integer := 0;
begin
  update public.leads l set sla_breached_at = l.sla_deadline, updated_at = now()
  where l.sla_deadline is not null and l.sla_breached_at is null and l.sla_deadline <= now() and (l.first_human_response_at is null or l.first_human_response_at > l.sla_deadline);

  insert into public.notifications(organization_id,user_id,team_id,lead_id,type,priority,title,body,action_url,dedupe_key)
  select l.organization_id,l.assigned_to,l.team_id,l.id,'SLA_WARNING',case when upper(coalesce(l.lead_temperature,''))='HOT' then 'HIGH' else 'NORMAL' end,'SLA por vencer',coalesce(l.full_name,'Lead') || ' todavía no tiene respuesta humana. Vence a las ' || to_char(l.sla_deadline at time zone 'America/Montevideo','HH24:MI') || '.','/protected/leads/' || l.id,'sla-warning:' || l.id || ':' || l.assigned_to
  from public.leads l join public.organization_sla_settings cfg on cfg.organization_id=l.organization_id and cfg.is_enabled=true
  where l.assigned_to is not null and l.sla_deadline is not null and l.sla_breached_at is null and l.first_human_response_at is null and l.sla_deadline > now() and now() >= l.sla_deadline - make_interval(mins => cfg.warning_minutes_before)
  on conflict (dedupe_key) where dedupe_key is not null do nothing;
  get diagnostics inserted_count = row_count; created_count := created_count + inserted_count;

  insert into public.notifications(organization_id,user_id,team_id,lead_id,type,priority,title,body,action_url,dedupe_key)
  select l.organization_id,l.assigned_to,l.team_id,l.id,'SLA_BREACHED','HIGH','SLA incumplido',coalesce(l.full_name,'Lead') || ' superó el tiempo objetivo de primera respuesta humana.','/protected/leads/' || l.id,'sla-breached:' || l.id || ':' || l.assigned_to
  from public.leads l where l.assigned_to is not null and l.sla_breached_at is not null
  on conflict (dedupe_key) where dedupe_key is not null do nothing;
  get diagnostics inserted_count = row_count; created_count := created_count + inserted_count;

  insert into public.notifications(organization_id,user_id,team_id,lead_id,type,priority,title,body,action_url,dedupe_key)
  select l.organization_id,om.user_id,l.team_id,l.id,'SLA_ESCALATED','HIGH','SLA escalado',coalesce(l.full_name,'Lead') || ' sigue sin respuesta humana después del incumplimiento de SLA.','/protected/leads/' || l.id,'sla-escalated:' || l.id || ':' || om.user_id
  from public.leads l join public.organization_sla_settings cfg on cfg.organization_id=l.organization_id and cfg.is_enabled=true join public.subscriptions sub on sub.organization_id=l.organization_id and upper(coalesce(sub.status,''))='ACTIVE' join public.organization_members om on om.organization_id=l.organization_id and om.status='ACTIVE'
  where l.sla_breached_at is not null and l.first_human_response_at is null and l.sla_deadline is not null and now() >= l.sla_deadline + make_interval(mins => cfg.escalation_minutes_after)
    and (om.role='OWNER' or (om.role='MANAGER' and (upper(coalesce(sub.plan,'TRIAL')) <> 'ENTERPRISE' or (om.team_id is not null and om.team_id=l.team_id))))
  on conflict (dedupe_key) where dedupe_key is not null do nothing;
  get diagnostics inserted_count = row_count; created_count := created_count + inserted_count;
  return created_count;
end; $$;
revoke all on function private.refresh_sla_notifications() from public, anon, authenticated;

select cron.schedule('revscale-sla-monitor','*/5 * * * *','select private.refresh_sla_notifications();');

-- The production migration also replaces private.ingest_web_lead so that source metadata,
-- UTMs, source property and provider/external ID de-duplication are handled atomically.
