drop function if exists public.is_org_member(uuid);

create table public.audit_events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid null,
  actor_user_id uuid null,
  event_type text not null,
  entity_type text not null,
  entity_id uuid null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index audit_events_org_created_idx
  on public.audit_events(organization_id, created_at desc);
create index audit_events_entity_idx
  on public.audit_events(entity_type, entity_id, created_at desc);
create index audit_events_actor_created_idx
  on public.audit_events(actor_user_id, created_at desc);

alter table public.audit_events enable row level security;
revoke all on table public.audit_events from public, anon, authenticated;
grant select on table public.audit_events to authenticated;

create policy "platform admins can view audit events"
on public.audit_events
for select
to authenticated
using (
  exists (
    select 1 from public.platform_admins pa
    where pa.user_id = (select auth.uid())
  )
);

create or replace function private.capture_operational_audit_event()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_org uuid;
  v_entity_id uuid;
  v_metadata jsonb := '{}'::jsonb;
  v_event_type text := lower(tg_table_name) || ':' || lower(tg_op);
begin
  if tg_table_schema = 'public' and tg_table_name = 'organization_members' then
    v_org := coalesce(new.organization_id, old.organization_id);
    v_entity_id := coalesce(new.id, old.id);
    v_metadata := jsonb_build_object(
      'user_id', coalesce(new.user_id, old.user_id),
      'old_role', case when tg_op <> 'INSERT' then old.role else null end,
      'new_role', case when tg_op <> 'DELETE' then new.role else null end,
      'old_status', case when tg_op <> 'INSERT' then old.status else null end,
      'new_status', case when tg_op <> 'DELETE' then new.status else null end,
      'old_team_id', case when tg_op <> 'INSERT' then old.team_id else null end,
      'new_team_id', case when tg_op <> 'DELETE' then new.team_id else null end
    );
  elsif tg_table_schema = 'public' and tg_table_name = 'subscriptions' then
    v_org := coalesce(new.organization_id, old.organization_id);
    v_entity_id := coalesce(new.id, old.id);
    v_metadata := jsonb_build_object(
      'old_plan', case when tg_op <> 'INSERT' then old.plan else null end,
      'new_plan', case when tg_op <> 'DELETE' then new.plan else null end,
      'old_status', case when tg_op <> 'INSERT' then old.status else null end,
      'new_status', case when tg_op <> 'DELETE' then new.status else null end,
      'old_max_agents', case when tg_op <> 'INSERT' then old.max_agents else null end,
      'new_max_agents', case when tg_op <> 'DELETE' then new.max_agents else null end,
      'old_max_leads', case when tg_op <> 'INSERT' then old.max_leads else null end,
      'new_max_leads', case when tg_op <> 'DELETE' then new.max_leads else null end,
      'old_max_properties', case when tg_op <> 'INSERT' then old.max_properties else null end,
      'new_max_properties', case when tg_op <> 'DELETE' then new.max_properties else null end
    );
  elsif tg_table_schema = 'public' and tg_table_name = 'teams' then
    v_org := coalesce(new.organization_id, old.organization_id);
    v_entity_id := coalesce(new.id, old.id);
    v_metadata := jsonb_build_object(
      'old_name', case when tg_op <> 'INSERT' then old.name else null end,
      'new_name', case when tg_op <> 'DELETE' then new.name else null end,
      'old_active', case when tg_op <> 'INSERT' then old.is_active else null end,
      'new_active', case when tg_op <> 'DELETE' then new.is_active else null end,
      'old_auto_assign', case when tg_op <> 'INSERT' then old.auto_assign else null end,
      'new_auto_assign', case when tg_op <> 'DELETE' then new.auto_assign else null end
    );
  elsif tg_table_schema = 'public' and tg_table_name = 'plan_requests' then
    v_org := coalesce(new.organization_id, old.organization_id);
    v_entity_id := coalesce(new.id, old.id);
    v_metadata := jsonb_build_object(
      'old_plan', old.plan,
      'new_plan', new.plan,
      'old_status', old.status,
      'new_status', new.status,
      'organization_changed', old.organization_id is distinct from new.organization_id
    );
  elsif tg_table_schema = 'public' and tg_table_name = 'organizations' then
    v_org := coalesce(new.id, old.id);
    v_entity_id := v_org;
    v_metadata := jsonb_build_object(
      'old_name', old.name,
      'new_name', new.name,
      'old_slug', old.slug,
      'new_slug', new.slug
    );
  elsif tg_table_schema = 'private' and tg_table_name = 'web_integration_tokens' then
    v_org := coalesce(new.organization_id, old.organization_id);
    v_entity_id := v_org;
    v_event_type := 'web_integration_token:rotated';
    v_metadata := jsonb_build_object('rotated', true);
  else
    raise exception 'Unsupported audit source %.%', tg_table_schema, tg_table_name;
  end if;

  insert into public.audit_events(
    organization_id, actor_user_id, event_type, entity_type, entity_id, metadata
  ) values (
    v_org,
    auth.uid(),
    v_event_type,
    tg_table_name,
    v_entity_id,
    jsonb_strip_nulls(v_metadata)
  );

  return coalesce(new, old);
end;
$$;

revoke all on function private.capture_operational_audit_event() from public, anon, authenticated;

create trigger trg_audit_organization_members
after insert or update or delete on public.organization_members
for each row execute function private.capture_operational_audit_event();

create trigger trg_audit_subscriptions
after insert or update or delete on public.subscriptions
for each row execute function private.capture_operational_audit_event();

create trigger trg_audit_teams
after insert or update or delete on public.teams
for each row execute function private.capture_operational_audit_event();

create trigger trg_audit_plan_requests
after update on public.plan_requests
for each row execute function private.capture_operational_audit_event();

create trigger trg_audit_organizations
after update on public.organizations
for each row execute function private.capture_operational_audit_event();

create trigger trg_audit_web_integration_tokens
after insert or update on private.web_integration_tokens
for each row execute function private.capture_operational_audit_event();
