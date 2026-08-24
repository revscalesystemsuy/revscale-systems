create or replace function private.activate_plan_request_core(p_request_id uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  req public.plan_requests%rowtype;
  target_user_id uuid;
  target_org_id uuid;
  target_team_id uuid;
  membership_count integer := 0;
  existing_role text;
  requested_plan text;
  current_plan text;
  requested_rank integer;
  current_rank integer;
  limits_agents integer;
  limits_leads integer;
  limits_properties integer;
  org_slug text;
begin
  select * into req from public.plan_requests where id = p_request_id for update;
  if req.id is null then raise exception 'Solicitud no encontrada'; end if;
  if coalesce(req.status,'') = 'ACTIVE' and req.organization_id is not null then return req.organization_id; end if;
  if coalesce(req.status,'') <> 'PENDING' then raise exception 'La solicitud ya fue procesada'; end if;

  requested_plan := upper(coalesce(req.plan,'STARTER'));
  if requested_plan='PRO' then requested_plan:='PROFESSIONAL'; end if;
  if requested_plan not in ('STARTER','PROFESSIONAL','ENTERPRISE') then raise exception 'Plan inválido'; end if;
  requested_rank := case requested_plan when 'STARTER' then 1 when 'PROFESSIONAL' then 2 when 'ENTERPRISE' then 3 end;

  select u.id into target_user_id from auth.users u where lower(u.email)=lower(req.email) order by u.created_at desc limit 1;
  if target_user_id is null then raise exception 'El cliente todavía no creó su cuenta. Pedile que se registre con el mismo email de la solicitud.'; end if;

  insert into public.profiles(id,full_name,phone)
  values(target_user_id,coalesce(nullif(trim(req.name),''),'Usuario'),nullif(trim(req.phone),''))
  on conflict(id) do nothing;

  if req.organization_id is not null then
    target_org_id := req.organization_id;
  else
    select count(*) into membership_count from public.organization_members om where om.user_id=target_user_id and om.status='ACTIVE';
    if membership_count > 1 then
      raise exception 'La cuenta pertenece a más de una organización. La vinculación debe revisarse manualmente.';
    elsif membership_count = 1 then
      select om.organization_id,om.role into target_org_id,existing_role
      from public.organization_members om where om.user_id=target_user_id and om.status='ACTIVE' limit 1;
      if existing_role <> 'OWNER' then raise exception 'La cuenta ya pertenece a una organización pero no tiene rol Director.'; end if;
    else
      insert into public.organizations(name,slug)
      values(coalesce(nullif(trim(req.company),''),'Nueva inmobiliaria'),'') returning id into target_org_id;
      org_slug := regexp_replace(lower(coalesce(nullif(trim(req.company),''),'inmobiliaria')),'[^a-z0-9]+','-','g');
      org_slug := trim(both '-' from org_slug) || '-' || substr(target_org_id::text,1,8);
      update public.organizations set slug=org_slug where id=target_org_id;
      insert into public.teams(organization_id,name,description,zones,auto_assign,is_active)
      values(target_org_id,'Equipo Principal','Equipo principal de la organización','{}'::text[],true,true)
      returning id into target_team_id;
      insert into public.organization_members(organization_id,user_id,role,status,team_id)
      values(target_org_id,target_user_id,'OWNER','ACTIVE',target_team_id);
      insert into public.organization_onboarding(organization_id,completed) values(target_org_id,false);
    end if;
  end if;

  select upper(s.plan) into current_plan from public.subscriptions s where s.organization_id=target_org_id order by s.created_at desc limit 1;
  current_rank := case current_plan when 'STARTER' then 1 when 'PRO' then 2 when 'PROFESSIONAL' then 2 when 'ENTERPRISE' then 3 else 0 end;
  if current_rank > requested_rank then raise exception 'La organización ya tiene un plan superior (%). No se realizó ninguna baja.', current_plan; end if;

  limits_agents := case requested_plan when 'STARTER' then 3 when 'PROFESSIONAL' then 15 else 30 end;
  limits_leads := case requested_plan when 'STARTER' then 500 else 1000000 end;
  limits_properties := case requested_plan when 'STARTER' then 100 else 1000000 end;

  insert into public.subscriptions(organization_id,plan,status,max_agents,max_leads,max_properties,updated_at)
  values(target_org_id,requested_plan,'ACTIVE',limits_agents,limits_leads,limits_properties,now())
  on conflict(organization_id) do update set
    plan=excluded.plan,status='ACTIVE',max_agents=excluded.max_agents,max_leads=excluded.max_leads,max_properties=excluded.max_properties,updated_at=now();

  if target_team_id is null then
    select t.id into target_team_id from public.teams t where t.organization_id=target_org_id and lower(t.name)=lower('Equipo Principal') order by t.created_at asc limit 1;
    if target_team_id is null then
      insert into public.teams(organization_id,name,description,zones,auto_assign,is_active)
      values(target_org_id,'Equipo Principal','Equipo principal de la organización','{}'::text[],true,true)
      returning id into target_team_id;
    end if;
  end if;

  update public.organization_members set team_id=coalesce(team_id,target_team_id),status='ACTIVE'
  where organization_id=target_org_id and user_id=target_user_id;
  if not exists(select 1 from public.organization_onboarding oo where oo.organization_id=target_org_id) then
    insert into public.organization_onboarding(organization_id,completed) values(target_org_id,false);
  end if;
  update public.plan_requests set organization_id=target_org_id,plan=requested_plan,status='ACTIVE' where id=p_request_id;
  return target_org_id;
end;
$$;
revoke all on function private.activate_plan_request_core(uuid) from public,anon,authenticated;

create or replace function public.platform_admin_activate_plan_request(p_request_id uuid)
returns uuid language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null or not exists(select 1 from public.platform_admins pa where pa.user_id=auth.uid()) then
    raise exception 'Acceso no autorizado';
  end if;
  update public.plan_requests set payment_status='MANUAL' where id=p_request_id and payment_status='UNPAID';
  return private.activate_plan_request_core(p_request_id);
end;
$$;
revoke all on function public.platform_admin_activate_plan_request(uuid) from public,anon;
grant execute on function public.platform_admin_activate_plan_request(uuid) to authenticated;
