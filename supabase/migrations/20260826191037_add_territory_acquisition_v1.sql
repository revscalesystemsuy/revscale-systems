create table if not exists public.territories (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  department text,
  city text,
  zones text[] not null default '{}'::text[],
  team_id uuid references public.teams(id) on delete set null,
  description text,
  priority text not null default 'STANDARD' check (priority in ('STANDARD','HIGH','STRATEGIC')),
  status text not null default 'ACTIVE' check (status in ('ACTIVE','PAUSED','ARCHIVED')),
  monthly_prospect_target integer not null default 20 check (monthly_prospect_target >= 0),
  monthly_contact_target integer not null default 40 check (monthly_contact_target >= 0),
  monthly_listing_target integer not null default 4 check (monthly_listing_target >= 0),
  inactivity_days integer not null default 7 check (inactivity_days between 1 and 60),
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, name)
);

create table if not exists public.territory_assignments (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  territory_id uuid not null references public.territories(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  assignment_role text not null default 'PRIMARY' check (assignment_role in ('PRIMARY','SUPPORT')),
  is_active boolean not null default true,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (territory_id, user_id)
);

create table if not exists public.acquisition_prospects (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  territory_id uuid not null references public.territories(id) on delete restrict,
  assigned_to uuid references public.profiles(id) on delete set null,
  owner_name text not null,
  owner_phone text,
  owner_email text,
  address text not null,
  zone text,
  property_type text,
  intended_operation text not null default 'SALE' check (intended_operation in ('SALE','RENT','BOTH')),
  estimated_value numeric check (estimated_value is null or estimated_value >= 0),
  currency text check (currency is null or currency in ('USD','UYU')),
  source text not null default 'OTHER' check (source in ('DOOR_KNOCKING','REFERRAL','PORTAL','SOCIAL','DATABASE','SIGN','OWNER_INBOUND','OTHER')),
  status text not null default 'IDENTIFIED' check (status in ('IDENTIFIED','CONTACTED','QUALIFIED','VALUATION','PROPOSAL','WON','LOST')),
  temperature text not null default 'WARM' check (temperature in ('COLD','WARM','HOT')),
  exclusive_listing_goal boolean not null default true,
  notes text,
  loss_reason text,
  next_action_at timestamptz,
  last_contact_at timestamptz,
  last_activity_at timestamptz,
  won_at timestamptz,
  lost_at timestamptz,
  converted_property_id uuid references public.properties(id) on delete set null,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (converted_property_id is null or status = 'WON')
);

create table if not exists public.acquisition_activities (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  prospect_id uuid not null references public.acquisition_prospects(id) on delete cascade,
  activity_type text not null check (activity_type in ('CALL','WHATSAPP','EMAIL','VISIT','VALUATION','PROPOSAL','NOTE','STATUS_CHANGE')),
  note text not null,
  outcome text,
  next_action_at timestamptz,
  created_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now()
);

create index if not exists territories_org_status_idx on public.territories(organization_id, status);
create index if not exists territories_team_idx on public.territories(team_id) where team_id is not null;
create index if not exists territory_assignments_user_idx on public.territory_assignments(user_id, is_active);
create index if not exists territory_assignments_org_idx on public.territory_assignments(organization_id, territory_id);
create index if not exists acquisition_prospects_org_status_idx on public.acquisition_prospects(organization_id, status, created_at desc);
create index if not exists acquisition_prospects_territory_idx on public.acquisition_prospects(territory_id, status, updated_at desc);
create index if not exists acquisition_prospects_assignee_idx on public.acquisition_prospects(assigned_to, status) where assigned_to is not null;
create index if not exists acquisition_prospects_next_action_idx on public.acquisition_prospects(next_action_at) where next_action_at is not null and status not in ('WON','LOST');
create index if not exists acquisition_prospects_converted_property_idx on public.acquisition_prospects(converted_property_id) where converted_property_id is not null;
create index if not exists acquisition_activities_prospect_created_idx on public.acquisition_activities(prospect_id, created_at desc);
create index if not exists acquisition_activities_org_created_idx on public.acquisition_activities(organization_id, created_at desc);

create or replace function private.organization_has_territory_access(org_id uuid)
returns boolean language sql stable security definer set search_path=''
as $$
  select exists (
    select 1 from public.subscriptions s
    where s.organization_id = org_id
      and upper(coalesce(s.status,'')) = 'ACTIVE'
      and upper(coalesce(s.plan,'')) = 'ENTERPRISE'
  );
$$;
revoke all on function private.organization_has_territory_access(uuid) from public, anon;
grant execute on function private.organization_has_territory_access(uuid) to authenticated;

create or replace function private.can_manage_territory_scope(org_id uuid, target_team uuid)
returns boolean language sql stable security definer set search_path=''
as $$
  select exists (
    select 1
    from public.organization_members om
    join public.subscriptions s on s.organization_id = om.organization_id
    where om.organization_id = org_id
      and om.user_id = (select auth.uid())
      and om.status = 'ACTIVE'
      and upper(coalesce(s.status,'')) = 'ACTIVE'
      and upper(coalesce(s.plan,'')) = 'ENTERPRISE'
      and (
        om.role = 'OWNER'
        or (om.role = 'MANAGER' and (target_team is null or om.team_id = target_team))
      )
  );
$$;
revoke all on function private.can_manage_territory_scope(uuid,uuid) from public, anon;
grant execute on function private.can_manage_territory_scope(uuid,uuid) to authenticated;

create or replace function private.can_view_territory(org_id uuid, target_territory uuid)
returns boolean language sql stable security definer set search_path=''
as $$
  select exists (
    select 1
    from public.organization_members om
    join public.subscriptions s on s.organization_id = om.organization_id
    join public.territories t on t.id = target_territory and t.organization_id = org_id
    where om.organization_id = org_id
      and om.user_id = (select auth.uid())
      and om.status = 'ACTIVE'
      and upper(coalesce(s.status,'')) = 'ACTIVE'
      and upper(coalesce(s.plan,'')) = 'ENTERPRISE'
      and (
        om.role = 'OWNER'
        or (om.role = 'MANAGER' and (t.team_id is null or om.team_id = t.team_id))
        or (om.role = 'AGENT' and exists (
          select 1 from public.territory_assignments ta
          where ta.territory_id = t.id and ta.organization_id = org_id
            and ta.user_id = om.user_id and ta.is_active
        ))
      )
  );
$$;
revoke all on function private.can_view_territory(uuid,uuid) from public, anon;
grant execute on function private.can_view_territory(uuid,uuid) to authenticated;

create or replace function private.can_work_acquisition_prospect(org_id uuid, target_territory uuid, target_assignee uuid)
returns boolean language sql stable security definer set search_path=''
as $$
  select exists (
    select 1
    from public.organization_members om
    join public.subscriptions s on s.organization_id = om.organization_id
    join public.territories t on t.id = target_territory and t.organization_id = org_id
    where om.organization_id = org_id
      and om.user_id = (select auth.uid())
      and om.status = 'ACTIVE'
      and upper(coalesce(s.status,'')) = 'ACTIVE'
      and upper(coalesce(s.plan,'')) = 'ENTERPRISE'
      and (
        om.role = 'OWNER'
        or (om.role = 'MANAGER' and (t.team_id is null or om.team_id = t.team_id))
        or (
          om.role = 'AGENT'
          and target_assignee = om.user_id
          and exists (
            select 1 from public.territory_assignments ta
            where ta.territory_id = t.id and ta.organization_id = org_id
              and ta.user_id = om.user_id and ta.is_active
          )
        )
      )
  );
$$;
revoke all on function private.can_work_acquisition_prospect(uuid,uuid,uuid) from public, anon;
grant execute on function private.can_work_acquisition_prospect(uuid,uuid,uuid) to authenticated;

create or replace function private.validate_territory_write()
returns trigger language plpgsql security definer set search_path=''
as $$
declare team_org uuid;
begin
  if new.team_id is not null then
    select organization_id into team_org from public.teams where id = new.team_id;
    if team_org is distinct from new.organization_id then
      raise exception 'territory team must belong to the same organization';
    end if;
  end if;
  new.updated_at := now();
  return new;
end;$$;
revoke all on function private.validate_territory_write() from public, anon, authenticated;
drop trigger if exists territories_validate_write on public.territories;
create trigger territories_validate_write before insert or update on public.territories for each row execute function private.validate_territory_write();

create or replace function private.validate_territory_assignment_write()
returns trigger language plpgsql security definer set search_path=''
as $$
declare t_org uuid; t_team uuid; member_team uuid; member_status text;
begin
  select organization_id, team_id into t_org, t_team from public.territories where id = new.territory_id;
  if t_org is distinct from new.organization_id then raise exception 'assignment territory organization mismatch'; end if;
  select team_id, status into member_team, member_status from public.organization_members where organization_id = new.organization_id and user_id = new.user_id limit 1;
  if member_status is distinct from 'ACTIVE' then raise exception 'assigned user must be an active organization member'; end if;
  if t_team is not null and member_team is distinct from t_team then raise exception 'assigned user must belong to the territory team'; end if;
  new.updated_at := now();
  return new;
end;$$;
revoke all on function private.validate_territory_assignment_write() from public, anon, authenticated;
drop trigger if exists territory_assignments_validate_write on public.territory_assignments;
create trigger territory_assignments_validate_write before insert or update on public.territory_assignments for each row execute function private.validate_territory_assignment_write();

create or replace function private.prepare_acquisition_prospect_write()
returns trigger language plpgsql security definer set search_path=''
as $$
declare t_org uuid; member_status text; property_org uuid;
begin
  select organization_id into t_org from public.territories where id = new.territory_id;
  if t_org is distinct from new.organization_id then raise exception 'prospect territory organization mismatch'; end if;
  if new.assigned_to is not null then
    select status into member_status from public.organization_members where organization_id = new.organization_id and user_id = new.assigned_to limit 1;
    if member_status is distinct from 'ACTIVE' then raise exception 'prospect assignee must be an active organization member'; end if;
  end if;
  if new.converted_property_id is not null then
    select organization_id into property_org from public.properties where id = new.converted_property_id;
    if property_org is distinct from new.organization_id then raise exception 'converted property organization mismatch'; end if;
  end if;
  if tg_op = 'INSERT' then new.last_activity_at := coalesce(new.last_activity_at, now()); end if;
  if new.status = 'WON' and (tg_op = 'INSERT' or old.status is distinct from 'WON') then new.won_at := coalesce(new.won_at, now()); end if;
  if new.status = 'LOST' and (tg_op = 'INSERT' or old.status is distinct from 'LOST') then new.lost_at := coalesce(new.lost_at, now()); end if;
  if new.status <> 'WON' then new.won_at := null; end if;
  if new.status <> 'LOST' then new.lost_at := null; end if;
  new.updated_at := now();
  return new;
end;$$;
revoke all on function private.prepare_acquisition_prospect_write() from public, anon, authenticated;
drop trigger if exists acquisition_prospects_prepare_write on public.acquisition_prospects;
create trigger acquisition_prospects_prepare_write before insert or update on public.acquisition_prospects for each row execute function private.prepare_acquisition_prospect_write();

create or replace function private.apply_acquisition_activity()
returns trigger language plpgsql security definer set search_path=''
as $$
declare p_org uuid; p_territory uuid; p_assignee uuid;
begin
  select organization_id, territory_id, assigned_to into p_org, p_territory, p_assignee from public.acquisition_prospects where id = new.prospect_id;
  if p_org is distinct from new.organization_id then raise exception 'activity prospect organization mismatch'; end if;
  if not private.can_work_acquisition_prospect(p_org, p_territory, p_assignee) then raise exception 'not allowed to add acquisition activity'; end if;
  update public.acquisition_prospects
     set last_activity_at = now(),
         last_contact_at = case when new.activity_type in ('CALL','WHATSAPP','EMAIL','VISIT','VALUATION','PROPOSAL') then now() else last_contact_at end,
         next_action_at = coalesce(new.next_action_at, next_action_at),
         updated_at = now()
   where id = new.prospect_id;
  return new;
end;$$;
revoke all on function private.apply_acquisition_activity() from public, anon, authenticated;
drop trigger if exists acquisition_activities_apply on public.acquisition_activities;
create trigger acquisition_activities_apply after insert on public.acquisition_activities for each row execute function private.apply_acquisition_activity();

alter table public.territories enable row level security;
alter table public.territory_assignments enable row level security;
alter table public.acquisition_prospects enable row level security;
alter table public.acquisition_activities enable row level security;

grant select,insert,update,delete on public.territories to authenticated;
grant select,insert,update,delete on public.territory_assignments to authenticated;
grant select,insert,update on public.acquisition_prospects to authenticated;
grant select,insert on public.acquisition_activities to authenticated;
revoke all on public.territories, public.territory_assignments, public.acquisition_prospects, public.acquisition_activities from anon;

create policy "enterprise members view accessible territories" on public.territories for select to authenticated using (private.can_view_territory(organization_id,id));
create policy "management creates territories" on public.territories for insert to authenticated with check (private.can_manage_territory_scope(organization_id,team_id) and created_by = (select auth.uid()));
create policy "management updates territories" on public.territories for update to authenticated using (private.can_manage_territory_scope(organization_id,team_id)) with check (private.can_manage_territory_scope(organization_id,team_id));
create policy "management deletes territories" on public.territories for delete to authenticated using (private.can_manage_territory_scope(organization_id,team_id));

create policy "members view territory assignments" on public.territory_assignments for select to authenticated using (private.can_view_territory(organization_id,territory_id));
create policy "management creates territory assignments" on public.territory_assignments for insert to authenticated with check (private.can_view_territory(organization_id,territory_id) and created_by=(select auth.uid()) and exists (select 1 from public.territories t where t.id=territory_id and private.can_manage_territory_scope(organization_id,t.team_id)));
create policy "management updates territory assignments" on public.territory_assignments for update to authenticated using (exists (select 1 from public.territories t where t.id=territory_id and private.can_manage_territory_scope(organization_id,t.team_id))) with check (exists (select 1 from public.territories t where t.id=territory_id and private.can_manage_territory_scope(organization_id,t.team_id)));
create policy "management deletes territory assignments" on public.territory_assignments for delete to authenticated using (exists (select 1 from public.territories t where t.id=territory_id and private.can_manage_territory_scope(organization_id,t.team_id)));

create policy "members view acquisition prospects" on public.acquisition_prospects for select to authenticated using (private.can_view_territory(organization_id,territory_id) and (private.can_manage_territory_scope(organization_id,(select t.team_id from public.territories t where t.id=territory_id)) or assigned_to=(select auth.uid()) or exists(select 1 from public.territory_assignments ta where ta.territory_id=territory_id and ta.user_id=(select auth.uid()) and ta.is_active)));
create policy "members create acquisition prospects" on public.acquisition_prospects for insert to authenticated with check (created_by=(select auth.uid()) and private.can_work_acquisition_prospect(organization_id,territory_id,assigned_to));
create policy "members update acquisition prospects" on public.acquisition_prospects for update to authenticated using (private.can_work_acquisition_prospect(organization_id,territory_id,assigned_to)) with check (private.can_work_acquisition_prospect(organization_id,territory_id,assigned_to));

create policy "members view acquisition activities" on public.acquisition_activities for select to authenticated using (exists (select 1 from public.acquisition_prospects p where p.id=prospect_id and p.organization_id=organization_id and private.can_view_territory(p.organization_id,p.territory_id)));
create policy "members create acquisition activities" on public.acquisition_activities for insert to authenticated with check (created_by=(select auth.uid()) and exists (select 1 from public.acquisition_prospects p where p.id=prospect_id and p.organization_id=organization_id and private.can_work_acquisition_prospect(p.organization_id,p.territory_id,p.assigned_to)));

create or replace function private.refresh_acquisition_notifications()
returns integer language plpgsql security definer set search_path=''
as $$
declare p record; t record; u record; v_count integer:=0; v_dedupe text; v_date date:=(now() at time zone 'America/Montevideo')::date; v_last timestamptz;
begin
  for p in
    select ap.*, tr.team_id from public.acquisition_prospects ap join public.territories tr on tr.id=ap.territory_id
    where ap.status not in ('WON','LOST') and ap.next_action_at is not null and ap.next_action_at < now() and private.organization_has_territory_access(ap.organization_id)
  loop
    for u in
      select distinct om.user_id from public.organization_members om
      where om.organization_id=p.organization_id and om.status='ACTIVE'
        and (om.user_id=p.assigned_to or (p.assigned_to is null and om.role='OWNER') or (p.assigned_to is null and om.role='MANAGER' and (p.team_id is null or om.team_id=p.team_id)))
    loop
      v_dedupe := 'acquisition:due:'||p.id||':'||u.user_id||':'||to_char(v_date,'YYYYMMDD');
      insert into public.notifications(organization_id,user_id,team_id,type,priority,title,body,action_url,dedupe_key)
      values(p.organization_id,u.user_id,p.team_id,'ACQUISITION_DUE',case when p.temperature='HOT' then 'HIGH' else 'MEDIUM' end,'Seguimiento de captación vencido',p.owner_name||' · '||p.address||' tiene una acción pendiente.','/protected/territories/prospects/'||p.id,v_dedupe)
      on conflict do nothing;
      if found then v_count:=v_count+1; end if;
    end loop;
  end loop;

  for t in select * from public.territories where status='ACTIVE' and private.organization_has_territory_access(organization_id)
  loop
    select max(greatest(coalesce(ap.last_activity_at,ap.created_at),ap.updated_at)) into v_last from public.acquisition_prospects ap where ap.territory_id=t.id;
    v_last := coalesce(v_last,t.updated_at,t.created_at);
    if v_last <= now()-make_interval(days=>t.inactivity_days) then
      for u in
        select om.user_id from public.organization_members om
        where om.organization_id=t.organization_id and om.status='ACTIVE' and (om.role='OWNER' or (om.role='MANAGER' and (t.team_id is null or om.team_id=t.team_id)))
      loop
        v_dedupe := 'territory:idle:'||t.id||':'||u.user_id||':'||to_char(v_date,'YYYYMMDD');
        insert into public.notifications(organization_id,user_id,team_id,type,priority,title,body,action_url,dedupe_key)
        values(t.organization_id,u.user_id,t.team_id,'TERRITORY_IDLE','MEDIUM','Territorio sin actividad',t.name||' lleva '||t.inactivity_days||' días sin actividad de captación.','/protected/territories?territory='||t.id,v_dedupe)
        on conflict do nothing;
        if found then v_count:=v_count+1; end if;
      end loop;
    end if;
  end loop;
  return v_count;
end;$$;
revoke all on function private.refresh_acquisition_notifications() from public, anon, authenticated;

do $$ declare j record; begin
  for j in select jobid from cron.job where jobname='revscale-territory-acquisition-watch' loop perform cron.unschedule(j.jobid); end loop;
  perform cron.schedule('revscale-territory-acquisition-watch','17 * * * *','select private.refresh_acquisition_notifications();');
end $$;
