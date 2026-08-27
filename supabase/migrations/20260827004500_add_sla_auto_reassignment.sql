-- SLA auto-reassignment v1.
-- Enterprise-only execution, configurable by organization, with one safe automatic rescue per lead.

alter table public.organization_sla_settings
  add column if not exists reassignment_minutes_after integer;

update public.organization_sla_settings
set reassignment_minutes_after = greatest(
  coalesce(reassignment_minutes_after, 20),
  escalation_minutes_after
)
where reassignment_minutes_after is null
   or reassignment_minutes_after < escalation_minutes_after;

alter table public.organization_sla_settings
  alter column reassignment_minutes_after set default 20,
  alter column reassignment_minutes_after set not null;

alter table public.organization_sla_settings
  drop constraint if exists organization_sla_settings_reassignment_minutes_check;
alter table public.organization_sla_settings
  add constraint organization_sla_settings_reassignment_minutes_check
  check (
    reassignment_minutes_after between 0 and 1440
    and reassignment_minutes_after >= escalation_minutes_after
  );

alter table public.leads
  add column if not exists sla_reassignment_count integer not null default 0,
  add column if not exists last_sla_reassigned_at timestamptz;

alter table public.leads
  drop constraint if exists leads_sla_reassignment_count_check;
alter table public.leads
  add constraint leads_sla_reassignment_count_check
  check (sla_reassignment_count between 0 and 10);

create index if not exists idx_leads_sla_auto_reassign_due
  on public.leads(organization_id, sla_deadline)
  where assigned_to is not null
    and first_human_response_at is null
    and sla_reassignment_count = 0;

-- Keep the assignment timestamp and SLA clock accurate for both first assignment and reassignment.
create or replace function private.set_lead_sla_clock()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  response_minutes integer := 15;
  sla_enabled boolean := false;
begin
  if new.received_at is null and tg_op = 'INSERT' then
    new.received_at := coalesce(new.created_at, now());
  end if;

  select s.is_enabled, s.first_human_response_minutes
    into sla_enabled, response_minutes
  from public.organization_sla_settings s
  where s.organization_id = new.organization_id;

  if tg_op = 'INSERT' then
    if new.assigned_to is not null then
      new.assigned_at := coalesce(new.assigned_at, now());
      if new.first_human_response_at is null and coalesce(sla_enabled, false) then
        new.sla_deadline := new.assigned_at + make_interval(mins => coalesce(response_minutes, 15));
      elsif not coalesce(sla_enabled, false) then
        new.sla_deadline := null;
      end if;
    end if;
    return new;
  end if;

  if old.assigned_to is distinct from new.assigned_to then
    if new.assigned_to is null then
      new.assigned_at := null;
      if new.first_human_response_at is null then
        new.sla_deadline := null;
        new.sla_breached_at := null;
      end if;
    else
      new.assigned_at := now();
      if new.first_human_response_at is null and coalesce(sla_enabled, false) then
        new.sla_deadline := new.assigned_at + make_interval(mins => coalesce(response_minutes, 15));
        new.sla_breached_at := null;
      elsif new.first_human_response_at is null then
        new.sla_deadline := null;
        new.sla_breached_at := null;
      end if;
    end if;
  elsif new.assigned_to is not null
    and new.first_human_response_at is null
    and new.sla_deadline is null
    and coalesce(sla_enabled, false) then
    new.assigned_at := coalesce(new.assigned_at, now());
    new.sla_deadline := new.assigned_at + make_interval(mins => coalesce(response_minutes, 15));
  end if;

  return new;
end;
$$;

revoke all on function private.set_lead_sla_clock() from public, anon, authenticated;

-- Make assignment notifications distinguish an initial assignment from a real reassignment.
create or replace function public.create_lead_notifications()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  is_reassignment boolean := false;
  assignment_key text;
begin
  if new.assigned_to is null then
    return new;
  end if;

  is_reassignment := tg_op = 'UPDATE'
    and old.assigned_to is not null
    and old.assigned_to is distinct from new.assigned_to;

  if is_reassignment then
    assignment_key := 'lead-reassigned:' || new.id || ':' || new.assigned_to || ':' ||
      floor(extract(epoch from coalesce(new.assigned_at, now())))::bigint;
  else
    assignment_key := 'lead-assigned:' || new.id || ':' || new.assigned_to;
  end if;

  insert into public.notifications(
    organization_id,user_id,team_id,lead_id,type,priority,title,body,action_url,dedupe_key
  ) values (
    new.organization_id,
    new.assigned_to,
    new.team_id,
    new.id,
    case when is_reassignment then 'LEAD_REASSIGNED' else 'LEAD_ASSIGNED' end,
    case when upper(coalesce(new.lead_temperature,'')) = 'HOT' then 'HIGH' else 'NORMAL' end,
    case when is_reassignment then 'Lead reasignado' else 'Nuevo lead asignado' end,
    case
      when is_reassignment then coalesce(new.full_name,'Lead') || ' fue reasignado a tu cartera.'
      else coalesce(new.full_name,'Nuevo lead') || ' fue asignado a tu cartera.'
    end,
    '/protected/leads/' || new.id,
    assignment_key
  ) on conflict (dedupe_key) where dedupe_key is not null do nothing;

  return new;
end;
$$;

revoke all on function public.create_lead_notifications() from public, anon;

create or replace function private.process_sla_auto_reassignments()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  target record;
  next_agent uuid;
  moved_count integer := 0;
  changed_count integer := 0;
begin
  -- Do not depend on cron ordering: mark overdue leads before evaluating reassignment.
  update public.leads l
  set sla_breached_at = l.sla_deadline,
      updated_at = now()
  where l.sla_deadline is not null
    and l.sla_breached_at is null
    and l.sla_deadline <= now()
    and (l.first_human_response_at is null or l.first_human_response_at > l.sla_deadline);

  for target in
    select
      l.id,
      l.organization_id,
      l.team_id,
      l.assigned_to,
      l.full_name,
      l.lead_temperature,
      l.sla_deadline,
      l.sla_reassignment_count,
      cfg.first_human_response_minutes,
      cfg.reassignment_minutes_after
    from public.leads l
    join public.organization_sla_settings cfg
      on cfg.organization_id = l.organization_id
     and cfg.is_enabled = true
     and cfg.auto_reassign_on_breach = true
    join public.teams t
      on t.id = l.team_id
     and t.organization_id = l.organization_id
     and t.is_active = true
     and t.auto_assign = true
    where l.assigned_to is not null
      and l.first_human_response_at is null
      and l.sla_breached_at is not null
      and l.sla_deadline is not null
      and l.sla_reassignment_count = 0
      and upper(coalesce(l.pipeline_stage, 'NEW')) not in ('WON','LOST')
      and now() >= l.sla_deadline + make_interval(mins => cfg.reassignment_minutes_after)
      and exists (
        select 1
        from public.subscriptions sub
        where sub.organization_id = l.organization_id
          and upper(coalesce(sub.status,'')) = 'ACTIVE'
          and upper(coalesce(sub.plan,'')) = 'ENTERPRISE'
      )
    order by l.sla_deadline asc
    for update of l skip locked
  loop
    next_agent := null;

    select om.user_id
      into next_agent
    from public.organization_members om
    left join lateral (
      select count(*)::bigint as open_load
      from public.leads active_lead
      where active_lead.organization_id = target.organization_id
        and active_lead.assigned_to = om.user_id
        and upper(coalesce(active_lead.pipeline_stage, 'NEW')) not in ('WON','LOST')
    ) load on true
    where om.organization_id = target.organization_id
      and om.team_id = target.team_id
      and om.status = 'ACTIVE'
      and om.role in ('AGENT','MANAGER')
      and om.user_id <> target.assigned_to
    order by coalesce(load.open_load, 0) asc, om.created_at asc
    limit 1;

    if next_agent is null then
      insert into public.notifications(
        organization_id,user_id,team_id,lead_id,type,priority,title,body,action_url,dedupe_key
      )
      select
        target.organization_id,
        om.user_id,
        target.team_id,
        target.id,
        'SLA_REASSIGNMENT_BLOCKED',
        'HIGH',
        'Reasignación SLA pendiente',
        coalesce(target.full_name,'Lead') || ' incumplió SLA, pero no hay otro agente activo disponible en el equipo.',
        '/protected/leads/' || target.id,
        'sla-reassignment-blocked:' || target.id || ':' || om.user_id
      from public.organization_members om
      where om.organization_id = target.organization_id
        and om.status = 'ACTIVE'
        and (
          om.role = 'OWNER'
          or (om.role = 'MANAGER' and om.team_id = target.team_id)
        )
      on conflict (dedupe_key) where dedupe_key is not null do nothing;
      continue;
    end if;

    update public.leads
    set assigned_to = next_agent,
        sla_reassignment_count = sla_reassignment_count + 1,
        last_sla_reassigned_at = now(),
        updated_at = now()
    where id = target.id
      and organization_id = target.organization_id
      and assigned_to = target.assigned_to
      and first_human_response_at is null;

    get diagnostics changed_count = row_count;
    if changed_count = 0 then
      continue;
    end if;

    insert into public.notifications(
      organization_id,user_id,team_id,lead_id,type,priority,title,body,action_url,dedupe_key
    ) values (
      target.organization_id,
      target.assigned_to,
      target.team_id,
      target.id,
      'SLA_REASSIGNED_AWAY',
      'HIGH',
      'Lead reasignado por SLA',
      coalesce(target.full_name,'Lead') || ' fue reasignado porque venció la primera respuesta humana.',
      '/protected/leads/' || target.id,
      'sla-reassigned-away:' || target.id || ':' || target.assigned_to
    ) on conflict (dedupe_key) where dedupe_key is not null do nothing;

    insert into public.notifications(
      organization_id,user_id,team_id,lead_id,type,priority,title,body,action_url,dedupe_key
    )
    select
      target.organization_id,
      om.user_id,
      target.team_id,
      target.id,
      'SLA_AUTO_REASSIGNED',
      'HIGH',
      'SLA rescatado automáticamente',
      coalesce(target.full_name,'Lead') || ' pasó a otro agente después de incumplir el SLA.',
      '/protected/leads/' || target.id,
      'sla-auto-reassigned:' || target.id || ':' || om.user_id
    from public.organization_members om
    where om.organization_id = target.organization_id
      and om.status = 'ACTIVE'
      and (
        om.role = 'OWNER'
        or (om.role = 'MANAGER' and om.team_id = target.team_id)
      )
    on conflict (dedupe_key) where dedupe_key is not null do nothing;

    insert into public.audit_events(
      organization_id, actor_user_id, event_type, entity_type, entity_id, metadata
    ) values (
      target.organization_id,
      null,
      'lead:auto_reassigned_sla',
      'leads',
      target.id,
      jsonb_build_object(
        'from_user_id', target.assigned_to,
        'to_user_id', next_agent,
        'team_id', target.team_id,
        'previous_sla_deadline', target.sla_deadline,
        'reassignment_number', target.sla_reassignment_count + 1
      )
    );

    moved_count := moved_count + 1;
  end loop;

  return moved_count;
end;
$$;

revoke all on function private.process_sla_auto_reassignments() from public, anon, authenticated;

select cron.schedule(
  'revscale-sla-auto-reassignment',
  '*/5 * * * *',
  'select private.process_sla_auto_reassignments();'
);
