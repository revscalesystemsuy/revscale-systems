create extension if not exists pg_cron with schema pg_catalog;

create or replace function private.refresh_commercial_notifications()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  created_count integer := 0;
  inserted_count integer := 0;
begin
  insert into public.notifications(
    organization_id,user_id,team_id,lead_id,followup_id,type,priority,title,body,action_url,dedupe_key
  )
  select
    f.organization_id,
    om.user_id,
    l.team_id,
    l.id,
    f.id,
    'FOLLOWUP_OVERDUE',
    case when upper(coalesce(l.lead_temperature,'')) = 'HOT' then 'HIGH' else 'NORMAL' end,
    '⏰ Follow-up vencido',
    coalesce(l.full_name,'Lead') || ': ' || coalesce(f.title,'seguimiento pendiente'),
    '/protected/leads/' || l.id,
    'followup-overdue:' || f.id || ':' || om.user_id
  from public.followups f
  join public.leads l
    on l.id = f.lead_id
   and l.organization_id = f.organization_id
  join public.organization_members om
    on om.organization_id = l.organization_id
   and om.status = 'ACTIVE'
  join public.subscriptions s
    on s.organization_id = om.organization_id
   and upper(coalesce(s.status,'')) = 'ACTIVE'
  where f.status = 'PENDING'
    and f.due_at < now()
    and (
      upper(coalesce(s.plan,'TRIAL')) <> 'ENTERPRISE'
      or om.role = 'OWNER'
      or (om.role = 'MANAGER' and om.team_id is not null and om.team_id = l.team_id)
      or (om.role = 'AGENT' and l.assigned_to = om.user_id)
    )
    and (f.assigned_to is null or f.assigned_to = om.user_id or l.assigned_to = om.user_id)
  on conflict (dedupe_key) where dedupe_key is not null do nothing;

  get diagnostics inserted_count = row_count;
  created_count := created_count + inserted_count;

  insert into public.notifications(
    organization_id,user_id,team_id,lead_id,type,priority,title,body,action_url,dedupe_key
  )
  select
    l.organization_id,
    om.user_id,
    l.team_id,
    l.id,
    'STALE_LEAD',
    case when upper(coalesce(l.lead_temperature,'')) = 'HOT' then 'HIGH' else 'NORMAL' end,
    case when upper(coalesce(l.lead_temperature,'')) = 'HOT' then '🔥 Lead HOT sin actividad' else '⚠️ Lead sin actividad' end,
    coalesce(l.full_name,'Lead') || ' lleva más de 24 horas sin una interacción registrada.',
    '/protected/leads/' || l.id,
    'stale-24h:' || l.id || ':' || om.user_id || ':' || to_char(current_date, 'YYYY-MM-DD')
  from public.leads l
  join public.organization_members om
    on om.organization_id = l.organization_id
   and om.status = 'ACTIVE'
  join public.subscriptions s
    on s.organization_id = om.organization_id
   and upper(coalesce(s.status,'')) = 'ACTIVE'
  where l.created_at < now() - interval '24 hours'
    and not exists (
      select 1
      from public.interactions i
      where i.lead_id = l.id
        and i.organization_id = l.organization_id
        and i.created_at >= now() - interval '24 hours'
    )
    and (
      upper(coalesce(s.plan,'TRIAL')) <> 'ENTERPRISE'
      or om.role = 'OWNER'
      or (om.role = 'MANAGER' and om.team_id is not null and om.team_id = l.team_id)
      or (om.role = 'AGENT' and l.assigned_to = om.user_id)
    )
  on conflict (dedupe_key) where dedupe_key is not null do nothing;

  get diagnostics inserted_count = row_count;
  created_count := created_count + inserted_count;

  return created_count;
end;
$$;

revoke all on function private.refresh_commercial_notifications() from public, anon, authenticated;

create or replace function public.refresh_my_commercial_notifications()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  created_count integer := 0;
  inserted_count integer := 0;
begin
  if uid is null then
    return 0;
  end if;

  insert into public.notifications(
    organization_id,user_id,team_id,lead_id,followup_id,type,priority,title,body,action_url,dedupe_key
  )
  select
    f.organization_id,
    uid,
    l.team_id,
    l.id,
    f.id,
    'FOLLOWUP_OVERDUE',
    case when upper(coalesce(l.lead_temperature,'')) = 'HOT' then 'HIGH' else 'NORMAL' end,
    '⏰ Follow-up vencido',
    coalesce(l.full_name,'Lead') || ': ' || coalesce(f.title,'seguimiento pendiente'),
    '/protected/leads/' || l.id,
    'followup-overdue:' || f.id || ':' || uid
  from public.followups f
  join public.leads l
    on l.id = f.lead_id and l.organization_id = f.organization_id
  where f.status = 'PENDING'
    and f.due_at < now()
    and private.can_access_lead(l.organization_id,l.team_id,l.assigned_to)
    and (f.assigned_to is null or f.assigned_to = uid or l.assigned_to = uid)
  on conflict (dedupe_key) where dedupe_key is not null do nothing;

  get diagnostics inserted_count = row_count;
  created_count := created_count + inserted_count;

  insert into public.notifications(
    organization_id,user_id,team_id,lead_id,type,priority,title,body,action_url,dedupe_key
  )
  select
    l.organization_id,
    uid,
    l.team_id,
    l.id,
    'STALE_LEAD',
    case when upper(coalesce(l.lead_temperature,'')) = 'HOT' then 'HIGH' else 'NORMAL' end,
    case when upper(coalesce(l.lead_temperature,'')) = 'HOT' then '🔥 Lead HOT sin actividad' else '⚠️ Lead sin actividad' end,
    coalesce(l.full_name,'Lead') || ' lleva más de 24 horas sin una interacción registrada.',
    '/protected/leads/' || l.id,
    'stale-24h:' || l.id || ':' || uid || ':' || to_char(current_date, 'YYYY-MM-DD')
  from public.leads l
  where private.can_access_lead(l.organization_id,l.team_id,l.assigned_to)
    and l.created_at < now() - interval '24 hours'
    and not exists (
      select 1 from public.interactions i
      where i.lead_id = l.id
        and i.organization_id = l.organization_id
        and i.created_at >= now() - interval '24 hours'
    )
  on conflict (dedupe_key) where dedupe_key is not null do nothing;

  get diagnostics inserted_count = row_count;
  created_count := created_count + inserted_count;

  return created_count;
end;
$$;

revoke all on function public.refresh_my_commercial_notifications() from public;
grant execute on function public.refresh_my_commercial_notifications() to authenticated;

do $$
declare
  existing_job bigint;
begin
  select jobid into existing_job from cron.job where jobname = 'revscale-commercial-notifications' limit 1;
  if existing_job is not null then
    perform cron.unschedule(existing_job);
  end if;

  perform cron.schedule(
    'revscale-commercial-notifications',
    '*/15 * * * *',
    'select private.refresh_commercial_notifications();'
  );
end;
$$;

select private.refresh_commercial_notifications();
