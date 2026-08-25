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
    f.organization_id, om.user_id, l.team_id, l.id, f.id,
    'FOLLOWUP_OVERDUE',
    case when upper(coalesce(l.lead_temperature,'')) = 'HOT' then 'HIGH' else 'NORMAL' end,
    'Seguimiento vencido',
    coalesce(l.full_name,'Lead') || ': ' || coalesce(f.title,'seguimiento pendiente'),
    '/protected/leads/' || l.id,
    'followup-overdue:' || f.id || ':' || om.user_id
  from public.followups f
  join public.leads l on l.id = f.lead_id and l.organization_id = f.organization_id
  join public.organization_members om on om.organization_id = l.organization_id and om.status = 'ACTIVE'
  join public.subscriptions s on s.organization_id = om.organization_id and upper(coalesce(s.status,'')) = 'ACTIVE'
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
    l.organization_id, om.user_id, l.team_id, l.id,
    'STALLED_STAGE',
    case when l.pipeline_stage in ('VISIT','NEGOTIATION') or upper(coalesce(l.lead_temperature,'')) = 'HOT' then 'HIGH' else 'NORMAL' end,
    'Oportunidad estancada',
    coalesce(l.full_name,'Lead') || ' lleva demasiado tiempo en ' ||
      case l.pipeline_stage
        when 'NEW' then 'Nuevo lead'
        when 'CONTACTED' then 'Contactado'
        when 'QUALIFIED' then 'Calificado'
        when 'VISIT' then 'Visita'
        when 'NEGOTIATION' then 'Negociación'
        else coalesce(l.pipeline_stage,'pipeline')
      end || '.',
    '/protected/leads/' || l.id,
    'stalled-stage:' || l.id || ':' || om.user_id || ':' || to_char(current_date, 'YYYY-MM-DD')
  from public.leads l
  join public.organization_members om on om.organization_id = l.organization_id and om.status = 'ACTIVE'
  join public.subscriptions s on s.organization_id = om.organization_id and upper(coalesce(s.status,'')) = 'ACTIVE'
  where l.pipeline_stage in ('NEW','CONTACTED','QUALIFIED','VISIT','NEGOTIATION')
    and l.stage_entered_at <= now() - make_interval(days => case l.pipeline_stage
      when 'NEW' then 3 when 'CONTACTED' then 3 when 'QUALIFIED' then 7 when 'VISIT' then 7 when 'NEGOTIATION' then 10 else 7 end)
    and (
      upper(coalesce(s.plan,'TRIAL')) <> 'ENTERPRISE'
      or om.role = 'OWNER'
      or (om.role = 'MANAGER' and om.team_id is not null and om.team_id = l.team_id)
      or (om.role = 'AGENT' and l.assigned_to = om.user_id)
    )
  on conflict (dedupe_key) where dedupe_key is not null do nothing;
  get diagnostics inserted_count = row_count;
  created_count := created_count + inserted_count;

  insert into public.notifications(
    organization_id,user_id,team_id,lead_id,type,priority,title,body,action_url,dedupe_key
  )
  select
    l.organization_id, om.user_id, l.team_id, l.id,
    case when l.expected_close_date < current_date then 'EXPECTED_CLOSE_OVERDUE' else 'EXPECTED_CLOSE_TODAY' end,
    'HIGH',
    case when l.expected_close_date < current_date then 'Cierre previsto vencido' else 'Cierre previsto para hoy' end,
    coalesce(l.full_name,'Lead') || case when l.expected_close_date < current_date then ' tiene una fecha estimada de cierre vencida.' else ' tiene cierre estimado para hoy.' end,
    '/protected/leads/' || l.id,
    'expected-close:' || l.id || ':' || om.user_id || ':' || to_char(current_date, 'YYYY-MM-DD')
  from public.leads l
  join public.organization_members om on om.organization_id = l.organization_id and om.status = 'ACTIVE'
  join public.subscriptions s on s.organization_id = om.organization_id and upper(coalesce(s.status,'')) = 'ACTIVE'
  where l.pipeline_stage in ('NEW','CONTACTED','QUALIFIED','VISIT','NEGOTIATION')
    and l.expected_close_date is not null
    and l.expected_close_date <= current_date
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
  if uid is null then return 0; end if;

  insert into public.notifications(
    organization_id,user_id,team_id,lead_id,followup_id,type,priority,title,body,action_url,dedupe_key
  )
  select f.organization_id, uid, l.team_id, l.id, f.id, 'FOLLOWUP_OVERDUE',
    case when upper(coalesce(l.lead_temperature,''))='HOT' then 'HIGH' else 'NORMAL' end,
    'Seguimiento vencido',
    coalesce(l.full_name,'Lead') || ': ' || coalesce(f.title,'seguimiento pendiente'),
    '/protected/leads/' || l.id,
    'followup-overdue:' || f.id || ':' || uid
  from public.followups f
  join public.leads l on l.id=f.lead_id and l.organization_id=f.organization_id
  where f.status='PENDING' and f.due_at < now()
    and private.can_access_lead(l.organization_id,l.team_id,l.assigned_to)
    and (f.assigned_to is null or f.assigned_to=uid or l.assigned_to=uid)
  on conflict (dedupe_key) where dedupe_key is not null do nothing;
  get diagnostics inserted_count = row_count;
  created_count := created_count + inserted_count;

  insert into public.notifications(
    organization_id,user_id,team_id,lead_id,type,priority,title,body,action_url,dedupe_key
  )
  select l.organization_id, uid, l.team_id, l.id, 'STALLED_STAGE',
    case when l.pipeline_stage in ('VISIT','NEGOTIATION') or upper(coalesce(l.lead_temperature,''))='HOT' then 'HIGH' else 'NORMAL' end,
    'Oportunidad estancada',
    coalesce(l.full_name,'Lead') || ' lleva demasiado tiempo en ' || coalesce(l.pipeline_stage,'pipeline') || '.',
    '/protected/leads/' || l.id,
    'stalled-stage:' || l.id || ':' || uid || ':' || to_char(current_date,'YYYY-MM-DD')
  from public.leads l
  where private.can_access_lead(l.organization_id,l.team_id,l.assigned_to)
    and l.pipeline_stage in ('NEW','CONTACTED','QUALIFIED','VISIT','NEGOTIATION')
    and l.stage_entered_at <= now() - make_interval(days => case l.pipeline_stage
      when 'NEW' then 3 when 'CONTACTED' then 3 when 'QUALIFIED' then 7 when 'VISIT' then 7 when 'NEGOTIATION' then 10 else 7 end)
  on conflict (dedupe_key) where dedupe_key is not null do nothing;
  get diagnostics inserted_count = row_count;
  created_count := created_count + inserted_count;

  insert into public.notifications(
    organization_id,user_id,team_id,lead_id,type,priority,title,body,action_url,dedupe_key
  )
  select l.organization_id, uid, l.team_id, l.id,
    case when l.expected_close_date < current_date then 'EXPECTED_CLOSE_OVERDUE' else 'EXPECTED_CLOSE_TODAY' end,
    'HIGH',
    case when l.expected_close_date < current_date then 'Cierre previsto vencido' else 'Cierre previsto para hoy' end,
    coalesce(l.full_name,'Lead') || case when l.expected_close_date < current_date then ' tiene una fecha estimada de cierre vencida.' else ' tiene cierre estimado para hoy.' end,
    '/protected/leads/' || l.id,
    'expected-close:' || l.id || ':' || uid || ':' || to_char(current_date,'YYYY-MM-DD')
  from public.leads l
  where private.can_access_lead(l.organization_id,l.team_id,l.assigned_to)
    and l.pipeline_stage in ('NEW','CONTACTED','QUALIFIED','VISIT','NEGOTIATION')
    and l.expected_close_date is not null
    and l.expected_close_date <= current_date
  on conflict (dedupe_key) where dedupe_key is not null do nothing;
  get diagnostics inserted_count = row_count;
  created_count := created_count + inserted_count;

  return created_count;
end;
$$;

revoke all on function public.refresh_my_commercial_notifications() from public, anon;
grant execute on function public.refresh_my_commercial_notifications() to authenticated;
