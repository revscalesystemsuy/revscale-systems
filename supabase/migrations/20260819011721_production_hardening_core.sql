create unique index if not exists organization_members_user_id_unique on public.organization_members(user_id);

create index if not exists followups_assigned_to_idx on public.followups(assigned_to);
create index if not exists followups_lead_id_idx on public.followups(lead_id);
create index if not exists followups_organization_id_idx on public.followups(organization_id);
create index if not exists interactions_lead_id_idx on public.interactions(lead_id);
create index if not exists interactions_organization_id_idx on public.interactions(organization_id);
create index if not exists interactions_property_id_idx on public.interactions(property_id);
create index if not exists leads_organization_id_idx on public.leads(organization_id);
create index if not exists notifications_followup_id_idx on public.notifications(followup_id);
create index if not exists notifications_lead_id_idx on public.notifications(lead_id);
create index if not exists notifications_property_id_idx on public.notifications(property_id);
create index if not exists notifications_team_id_idx on public.notifications(team_id);
create index if not exists organization_onboarding_organization_id_idx on public.organization_onboarding(organization_id);
create index if not exists plan_requests_organization_id_idx on public.plan_requests(organization_id);
create index if not exists properties_organization_id_idx on public.properties(organization_id);
create index if not exists subscriptions_organization_id_idx on public.subscriptions(organization_id);

drop policy if exists "members can view organization teams" on public.teams;
drop policy if exists "owners and managers can create organization teams" on public.teams;
drop policy if exists "owners and managers can update organization teams" on public.teams;
drop policy if exists "owners can delete organization teams" on public.teams;

create policy "active members can view organization teams" on public.teams for select to authenticated
using (exists (
  select 1 from public.organization_members om join public.subscriptions s on s.organization_id = om.organization_id
  where om.organization_id = teams.organization_id and om.user_id = (select auth.uid()) and om.status = 'ACTIVE'
    and upper(coalesce(s.status,'INACTIVE')) = 'ACTIVE'
));

create policy "owners can create organization teams" on public.teams for insert to authenticated
with check (exists (
  select 1 from public.organization_members om join public.subscriptions s on s.organization_id = om.organization_id
  where om.organization_id = teams.organization_id and om.user_id = (select auth.uid()) and om.status = 'ACTIVE'
    and om.role = 'OWNER' and upper(coalesce(s.status,'INACTIVE')) = 'ACTIVE' and upper(coalesce(s.plan,'')) = 'ENTERPRISE'
));

create policy "owners or own manager can update teams" on public.teams for update to authenticated
using (exists (
  select 1 from public.organization_members om join public.subscriptions s on s.organization_id = om.organization_id
  where om.organization_id = teams.organization_id and om.user_id = (select auth.uid()) and om.status = 'ACTIVE'
    and upper(coalesce(s.status,'INACTIVE')) = 'ACTIVE' and upper(coalesce(s.plan,'')) = 'ENTERPRISE'
    and (om.role = 'OWNER' or (om.role = 'MANAGER' and om.team_id = teams.id))
))
with check (exists (
  select 1 from public.organization_members om join public.subscriptions s on s.organization_id = om.organization_id
  where om.organization_id = teams.organization_id and om.user_id = (select auth.uid()) and om.status = 'ACTIVE'
    and upper(coalesce(s.status,'INACTIVE')) = 'ACTIVE' and upper(coalesce(s.plan,'')) = 'ENTERPRISE'
    and (om.role = 'OWNER' or (om.role = 'MANAGER' and om.team_id = teams.id))
));

create policy "owners can delete organization teams" on public.teams for delete to authenticated
using (exists (
  select 1 from public.organization_members om join public.subscriptions s on s.organization_id = om.organization_id
  where om.organization_id = teams.organization_id and om.user_id = (select auth.uid()) and om.status = 'ACTIVE'
    and om.role = 'OWNER' and upper(coalesce(s.status,'INACTIVE')) = 'ACTIVE' and upper(coalesce(s.plan,'')) = 'ENTERPRISE'
));

revoke all on function public.assign_enterprise_lead() from public, anon, authenticated;
revoke all on function public.import_leads_bulk(jsonb) from public, anon;
grant execute on function public.import_leads_bulk(jsonb) to authenticated;
revoke all on function public.import_properties_bulk(jsonb) from public, anon;
grant execute on function public.import_properties_bulk(jsonb) to authenticated;
revoke all on function public.ingest_web_lead(uuid,text,jsonb) from public, authenticated;
grant execute on function public.ingest_web_lead(uuid,text,jsonb) to anon;
revoke all on function public.is_org_member(uuid) from public, anon, authenticated;
revoke all on function public.platform_admin_activate_plan_request(uuid) from public, anon;
grant execute on function public.platform_admin_activate_plan_request(uuid) to authenticated;
revoke all on function public.platform_admin_rotate_web_integration_token(uuid) from public, anon;
grant execute on function public.platform_admin_rotate_web_integration_token(uuid) to authenticated;
revoke all on function public.platform_admin_set_organization_suspension(uuid,boolean) from public, anon;
grant execute on function public.platform_admin_set_organization_suspension(uuid,boolean) to authenticated;
revoke all on function public.refresh_my_commercial_notifications() from public, anon;
grant execute on function public.refresh_my_commercial_notifications() to authenticated;

create table if not exists private.web_ingest_rate_limits (
  organization_id uuid not null,
  bucket timestamptz not null,
  request_count integer not null default 0,
  primary key (organization_id, bucket)
);
revoke all on private.web_ingest_rate_limits from public, anon, authenticated;

create or replace function private.consume_web_ingest_quota(p_organization_id uuid, p_limit integer default 120)
returns boolean language plpgsql security definer set search_path = '' as $$
declare
  v_bucket timestamptz := date_trunc('minute', now());
  v_count integer;
begin
  insert into private.web_ingest_rate_limits(organization_id,bucket,request_count)
  values (p_organization_id,v_bucket,1)
  on conflict (organization_id,bucket) do update set request_count = private.web_ingest_rate_limits.request_count + 1
  returning request_count into v_count;
  delete from private.web_ingest_rate_limits where bucket < now() - interval '2 hours';
  return v_count <= p_limit;
end;
$$;
revoke all on function private.consume_web_ingest_quota(uuid,integer) from public, anon, authenticated;
grant execute on function private.consume_web_ingest_quota(uuid,integer) to postgres, service_role;

create or replace function public.ingest_web_lead(p_organization_id uuid, p_token text, p_payload jsonb)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_subscription public.subscriptions%rowtype;
  v_existing_id uuid;
  v_count integer;
  v_score integer := 30;
  v_temperature text;
  v_full_name text := nullif(trim(coalesce(p_payload->>'full_name','')), '');
  v_phone text := nullif(trim(coalesce(p_payload->>'phone','')), '');
  v_email text := nullif(lower(trim(coalesce(p_payload->>'email',''))), '');
  v_zone text := nullif(trim(coalesce(p_payload->>'primary_zone','')), '');
  v_operation text := nullif(upper(trim(coalesce(p_payload->>'operation',''))), '');
  v_property_type text := nullif(upper(trim(coalesce(p_payload->>'property_type',''))), '');
  v_currency text := coalesce(nullif(upper(trim(coalesce(p_payload->>'currency',''))), ''), 'USD');
  v_budget numeric;
  v_bedrooms integer;
  v_lead_id uuid;
begin
  if p_token is null or length(p_token) < 20 then raise exception 'Credenciales de integración inválidas'; end if;
  if not exists (
    select 1 from private.web_integration_tokens wit
    where wit.organization_id = p_organization_id and wit.token_hash = encode(extensions.digest(p_token, 'sha256'), 'hex')
  ) then raise exception 'Credenciales de integración inválidas'; end if;
  if not private.consume_web_ingest_quota(p_organization_id,120) then raise exception 'Demasiadas solicitudes. Intentá nuevamente en un minuto.'; end if;

  select * into v_subscription from public.subscriptions s where s.organization_id = p_organization_id limit 1;
  if v_subscription.id is null or upper(coalesce(v_subscription.status,'')) <> 'ACTIVE' or upper(coalesce(v_subscription.plan,'')) <> 'ENTERPRISE' then
    raise exception 'La integración web está disponible en Enterprise';
  end if;
  if v_full_name is null and v_phone is null and v_email is null then raise exception 'El lead debe incluir al menos nombre, teléfono o email'; end if;
  if v_operation is not null and v_operation not in ('COMPRA','ALQUILER') then raise exception 'Operación inválida'; end if;
  if v_currency not in ('USD','UYU') then raise exception 'Moneda inválida'; end if;
  begin v_budget := nullif(p_payload->>'budget_max','')::numeric; exception when others then raise exception 'Presupuesto inválido'; end;
  begin v_bedrooms := nullif(p_payload->>'bedrooms_min','')::integer; exception when others then raise exception 'Dormitorios inválidos'; end;
  if v_budget is not null and v_budget < 0 then raise exception 'Presupuesto inválido'; end if;
  if v_bedrooms is not null and v_bedrooms < 0 then raise exception 'Dormitorios inválidos'; end if;

  if v_zone is not null then v_score := v_score + 20; end if;
  if v_budget is not null then v_score := v_score + 25; end if;
  if v_bedrooms is not null then v_score := v_score + 15; end if;
  v_temperature := case when v_score >= 80 then 'HOT' when v_score >= 50 then 'WARM' else 'COLD' end;

  if v_phone is not null then
    select l.id into v_existing_id from public.leads l
    where l.organization_id = p_organization_id and regexp_replace(coalesce(l.phone,''), '[^0-9]', '', 'g') = regexp_replace(v_phone, '[^0-9]', '', 'g')
    order by l.created_at desc limit 1;
  end if;
  if v_existing_id is null and v_email is not null then
    select l.id into v_existing_id from public.leads l where l.organization_id = p_organization_id and lower(trim(coalesce(l.email,''))) = v_email
    order by l.created_at desc limit 1;
  end if;

  if v_existing_id is not null then
    update public.leads set
      full_name=coalesce(v_full_name,full_name), phone=coalesce(v_phone,phone), email=coalesce(v_email,email), operation=coalesce(v_operation,operation),
      property_type=coalesce(v_property_type,property_type), primary_zone=coalesce(v_zone,primary_zone), budget_max=coalesce(v_budget,budget_max),
      currency=coalesce(v_currency,currency), bedrooms_min=coalesce(v_bedrooms,bedrooms_min), lead_score=greatest(coalesce(lead_score,0),v_score),
      lead_temperature=case when greatest(coalesce(lead_score,0),v_score)>=80 then 'HOT' when greatest(coalesce(lead_score,0),v_score)>=50 then 'WARM' else 'COLD' end,
      next_action='Contactar lead recibido desde la web', updated_at=now()
    where id=v_existing_id returning id into v_lead_id;
    return jsonb_build_object('ok',true,'action','updated','lead_id',v_lead_id);
  end if;

  select count(*) into v_count from public.leads where organization_id=p_organization_id;
  if coalesce(v_subscription.max_leads,0)>0 and v_subscription.max_leads<1000000 and v_count>=v_subscription.max_leads then raise exception 'La organización alcanzó el límite de leads'; end if;

  insert into public.leads(organization_id,full_name,phone,email,operation,property_type,primary_zone,budget_max,currency,bedrooms_min,lead_score,lead_temperature,next_action)
  values (p_organization_id,v_full_name,v_phone,v_email,v_operation,v_property_type,v_zone,v_budget,v_currency,v_bedrooms,v_score,v_temperature,'Contactar lead recibido desde la web')
  returning id into v_lead_id;
  return jsonb_build_object('ok',true,'action','created','lead_id',v_lead_id);
end;
$$;
revoke all on function public.ingest_web_lead(uuid,text,jsonb) from public, authenticated;
grant execute on function public.ingest_web_lead(uuid,text,jsonb) to anon;
