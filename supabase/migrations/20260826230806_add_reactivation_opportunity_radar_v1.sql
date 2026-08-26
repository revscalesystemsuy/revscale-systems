create table public.property_change_events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  property_id uuid not null references public.properties(id) on delete cascade,
  event_type text not null check (event_type in ('PRICE_DROP','BACK_AVAILABLE')),
  old_price numeric,
  new_price numeric,
  old_status text,
  new_status text,
  created_at timestamptz not null default now()
);

create table public.reactivation_opportunities (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  lead_id uuid not null references public.leads(id) on delete cascade,
  property_id uuid references public.properties(id) on delete cascade,
  match_id uuid references public.property_lead_matches(id) on delete set null,
  opportunity_type text not null check (opportunity_type in ('NEW_MATCH','PRICE_DROP','BACK_AVAILABLE','NEW_UNIT','DORMANT_STRONG_MATCH')),
  opportunity_key text not null,
  score smallint not null check (score between 0 and 100),
  compatibility smallint check (compatibility between 0 and 100),
  reason text not null,
  context jsonb not null default '{}'::jsonb,
  status text not null default 'OPEN' check (status in ('OPEN','CONTACTED','DISMISSED','CONVERTED')),
  detected_at timestamptz not null default now(),
  contacted_at timestamptz,
  resolved_at timestamptz,
  updated_at timestamptz not null default now(),
  unique (organization_id, opportunity_key)
);

create index property_change_events_property_created_idx on public.property_change_events(property_id, created_at desc);
create index property_change_events_org_created_idx on public.property_change_events(organization_id, created_at desc);
create index reactivation_opportunities_org_status_score_idx on public.reactivation_opportunities(organization_id, status, score desc, detected_at desc);
create index reactivation_opportunities_lead_idx on public.reactivation_opportunities(lead_id, status, score desc);
create index reactivation_opportunities_property_idx on public.reactivation_opportunities(property_id, status);
create index reactivation_opportunities_match_idx on public.reactivation_opportunities(match_id) where match_id is not null;

alter table public.property_change_events enable row level security;
alter table public.reactivation_opportunities enable row level security;

grant select on public.property_change_events to authenticated;
grant select, update on public.reactivation_opportunities to authenticated;

create policy property_change_events_select on public.property_change_events for select to authenticated using (
  exists (select 1 from public.organization_members om where om.organization_id=property_change_events.organization_id and om.user_id=(select auth.uid()) and om.status='ACTIVE')
);
create policy reactivation_opportunities_select on public.reactivation_opportunities for select to authenticated using (
  exists (select 1 from public.leads l where l.id=reactivation_opportunities.lead_id and l.organization_id=reactivation_opportunities.organization_id and private.can_access_lead(l.organization_id,l.team_id,l.assigned_to))
);
create policy reactivation_opportunities_update on public.reactivation_opportunities for update to authenticated using (
  exists (select 1 from public.leads l where l.id=reactivation_opportunities.lead_id and l.organization_id=reactivation_opportunities.organization_id and private.can_access_lead(l.organization_id,l.team_id,l.assigned_to))
) with check (
  exists (select 1 from public.leads l where l.id=reactivation_opportunities.lead_id and l.organization_id=reactivation_opportunities.organization_id and private.can_access_lead(l.organization_id,l.team_id,l.assigned_to))
);

create or replace function private.record_property_reactivation_event()
returns trigger
language plpgsql
security definer
set search_path = public, private
as $$
begin
  if old.price is not null and new.price is not null and new.price < old.price then
    insert into public.property_change_events(organization_id,property_id,event_type,old_price,new_price,old_status,new_status)
    values(new.organization_id,new.id,'PRICE_DROP',old.price,new.price,old.status,new.status);
  end if;
  if coalesce(old.status,'') <> 'AVAILABLE' and new.status = 'AVAILABLE' then
    insert into public.property_change_events(organization_id,property_id,event_type,old_price,new_price,old_status,new_status)
    values(new.organization_id,new.id,'BACK_AVAILABLE',old.price,new.price,old.status,new.status);
  end if;
  return new;
end;
$$;
revoke all on function private.record_property_reactivation_event() from public,anon,authenticated;

drop trigger if exists properties_reactivation_event_trigger on public.properties;
create trigger properties_reactivation_event_trigger
after update of price,status on public.properties
for each row execute function private.record_property_reactivation_event();

create or replace function private.refresh_reactivation_opportunities()
returns jsonb
language plpgsql
security definer
set search_path = public, private
as $$
declare
  v_new_match integer := 0;
  v_changes integer := 0;
  v_dormant integer := 0;
  v_units integer := 0;
begin
  with ins as (
    insert into public.reactivation_opportunities(organization_id,lead_id,property_id,match_id,opportunity_type,opportunity_key,score,compatibility,reason,context,detected_at)
    select m.organization_id,m.lead_id,m.property_id,m.id,'NEW_MATCH','new-match:'||m.id::text,
      least(100,greatest(0,m.compatibility + 5))::smallint,m.compatibility,
      'Apareció una propiedad con '||m.compatibility||'% de compatibilidad con la búsqueda.',
      jsonb_build_object('matched_at',m.matched_at,'property_title',p.title,'price',p.price,'currency',p.currency),m.matched_at
    from public.property_lead_matches m
    join public.leads l on l.id=m.lead_id and l.organization_id=m.organization_id
    join public.properties p on p.id=m.property_id and p.organization_id=m.organization_id
    join public.subscriptions s on s.organization_id=m.organization_id and upper(s.status)='ACTIVE' and upper(s.plan) in ('PRO','PROFESSIONAL','ENTERPRISE')
    where m.compatibility>=85 and p.status='AVAILABLE' and l.pipeline_stage in ('NEW','CONTACTED','QUALIFIED')
      and coalesce(l.requires_human,false)=false and m.matched_at>=now()-interval '7 days'
    on conflict(organization_id,opportunity_key) do nothing returning 1
  ) select count(*) into v_new_match from ins;

  with candidates as (
    select e.id event_id,e.organization_id,e.property_id,e.event_type,e.old_price,e.new_price,e.old_status,e.new_status,e.created_at,
           m.id match_id,m.lead_id,m.compatibility,p.title,p.currency,
           case when e.event_type='PRICE_DROP' then 12 else 10 end as boost
    from public.property_change_events e
    join public.properties p on p.id=e.property_id and p.organization_id=e.organization_id
    join public.property_lead_matches m on m.property_id=e.property_id and m.organization_id=e.organization_id and m.compatibility>=75
    join public.leads l on l.id=m.lead_id and l.organization_id=e.organization_id
    join public.subscriptions s on s.organization_id=e.organization_id and upper(s.status)='ACTIVE' and upper(s.plan) in ('PRO','PROFESSIONAL','ENTERPRISE')
    where e.created_at>=now()-interval '30 days' and l.pipeline_stage in ('NEW','CONTACTED','QUALIFIED') and coalesce(l.requires_human,false)=false
  ), ins as (
    insert into public.reactivation_opportunities(organization_id,lead_id,property_id,match_id,opportunity_type,opportunity_key,score,compatibility,reason,context,detected_at)
    select c.organization_id,c.lead_id,c.property_id,c.match_id,c.event_type,lower(c.event_type)||':'||c.event_id::text||':'||c.lead_id::text,
      least(100,c.compatibility+c.boost)::smallint,c.compatibility,
      case when c.event_type='PRICE_DROP' then 'Una propiedad compatible bajó de precio de '||coalesce(c.old_price::text,'-')||' a '||coalesce(c.new_price::text,'-')||' '||coalesce(c.currency,'')||'.' else 'Una propiedad compatible volvió a estar disponible.' end,
      jsonb_build_object('event_id',c.event_id,'property_title',c.title,'old_price',c.old_price,'new_price',c.new_price,'old_status',c.old_status,'new_status',c.new_status),c.created_at
    from candidates c
    on conflict(organization_id,opportunity_key) do nothing returning 1
  ) select count(*) into v_changes from ins;

  with last_touch as (
    select l.id lead_id,l.organization_id,coalesce(max(i.created_at),l.created_at) last_contact
    from public.leads l left join public.interactions i on i.lead_id=l.id and i.organization_id=l.organization_id
    group by l.id,l.organization_id,l.created_at
  ), ranked as (
    select m.*,p.title,p.price,p.currency,lt.last_contact,row_number() over(partition by m.lead_id order by m.compatibility desc,m.matched_at desc) rn
    from public.property_lead_matches m
    join last_touch lt on lt.lead_id=m.lead_id and lt.organization_id=m.organization_id
    join public.leads l on l.id=m.lead_id and l.organization_id=m.organization_id
    join public.properties p on p.id=m.property_id and p.organization_id=m.organization_id and p.status='AVAILABLE'
    join public.subscriptions s on s.organization_id=m.organization_id and upper(s.status)='ACTIVE' and upper(s.plan) in ('PRO','PROFESSIONAL','ENTERPRISE')
    where m.compatibility>=85 and lt.last_contact<=now()-interval '30 days' and l.pipeline_stage in ('NEW','CONTACTED','QUALIFIED') and coalesce(l.requires_human,false)=false
  ), ins as (
    insert into public.reactivation_opportunities(organization_id,lead_id,property_id,match_id,opportunity_type,opportunity_key,score,compatibility,reason,context,detected_at)
    select r.organization_id,r.lead_id,r.property_id,r.id,'DORMANT_STRONG_MATCH','dormant:'||r.lead_id::text||':'||to_char(date_trunc('month',now()),'YYYYMM'),
      least(100,r.compatibility+8)::smallint,r.compatibility,
      'Lead inactivo hace más de 30 días con una propiedad de '||r.compatibility||'% de compatibilidad disponible.',
      jsonb_build_object('last_contact',r.last_contact,'property_title',r.title,'price',r.price,'currency',r.currency),now()
    from ranked r where r.rn=1
    on conflict(organization_id,opportunity_key) do nothing returning 1
  ) select count(*) into v_dormant from ins;

  with candidates as (
    select u.id unit_id,u.organization_id,u.property_id,u.code,u.price,u.currency,u.created_at,m.id match_id,m.lead_id,m.compatibility,p.title
    from public.development_units u
    join public.properties p on p.id=u.property_id and p.organization_id=u.organization_id and p.status='AVAILABLE'
    join public.property_lead_matches m on m.property_id=u.property_id and m.organization_id=u.organization_id and m.compatibility>=80
    join public.leads l on l.id=m.lead_id and l.organization_id=u.organization_id
    join public.subscriptions s on s.organization_id=u.organization_id and upper(s.status)='ACTIVE' and upper(s.plan)='ENTERPRISE'
    where u.status='AVAILABLE' and u.created_at>=now()-interval '30 days' and l.pipeline_stage in ('NEW','CONTACTED','QUALIFIED') and coalesce(l.requires_human,false)=false
  ), ins as (
    insert into public.reactivation_opportunities(organization_id,lead_id,property_id,match_id,opportunity_type,opportunity_key,score,compatibility,reason,context,detected_at)
    select c.organization_id,c.lead_id,c.property_id,c.match_id,'NEW_UNIT','new-unit:'||c.unit_id::text||':'||c.lead_id::text,
      least(100,c.compatibility+10)::smallint,c.compatibility,
      'Hay una nueva unidad disponible en un proyecto compatible con la búsqueda.',
      jsonb_build_object('unit_id',c.unit_id,'unit_code',c.code,'property_title',c.title,'price',c.price,'currency',c.currency),c.created_at
    from candidates c
    on conflict(organization_id,opportunity_key) do nothing returning 1
  ) select count(*) into v_units from ins;

  return jsonb_build_object('new_matches',v_new_match,'property_changes',v_changes,'dormant',v_dormant,'new_units',v_units,'ran_at',now());
end;
$$;
revoke all on function private.refresh_reactivation_opportunities() from public,anon,authenticated;
grant execute on function private.refresh_reactivation_opportunities() to postgres,service_role;

select cron.unschedule(jobid) from cron.job where jobname='revscale-reactivation-radar';
select cron.schedule('revscale-reactivation-radar','*/15 * * * *',$$select private.refresh_reactivation_opportunities();$$);
select private.refresh_reactivation_opportunities();
