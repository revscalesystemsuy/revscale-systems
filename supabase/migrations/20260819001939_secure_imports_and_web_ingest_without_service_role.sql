create table if not exists private.web_integration_tokens (
  organization_id uuid primary key references public.organizations(id) on delete cascade,
  token_hash text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

revoke all on private.web_integration_tokens from public, anon, authenticated;

create or replace function public.platform_admin_rotate_web_integration_token(p_organization_id uuid)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_token text;
begin
  if not exists (
    select 1 from public.platform_admins pa where pa.user_id = auth.uid()
  ) then
    raise exception 'Acceso no autorizado';
  end if;

  if not exists (
    select 1 from public.subscriptions s
    where s.organization_id = p_organization_id
      and upper(coalesce(s.plan, '')) = 'ENTERPRISE'
      and upper(coalesce(s.status, '')) = 'ACTIVE'
  ) then
    raise exception 'La organización debe tener Enterprise activo';
  end if;

  v_token := encode(extensions.gen_random_bytes(32), 'hex');

  insert into private.web_integration_tokens(organization_id, token_hash)
  values (
    p_organization_id,
    encode(extensions.digest(v_token, 'sha256'), 'hex')
  )
  on conflict (organization_id) do update
    set token_hash = excluded.token_hash,
        updated_at = now();

  return v_token;
end;
$$;

revoke all on function public.platform_admin_rotate_web_integration_token(uuid) from public;
grant execute on function public.platform_admin_rotate_web_integration_token(uuid) to authenticated;

create or replace function public.ingest_web_lead(
  p_organization_id uuid,
  p_token text,
  p_payload jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_subscription public.subscriptions%rowtype;
  v_existing_id uuid;
  v_existing_score integer;
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
  if p_token is null or length(p_token) < 20 then
    raise exception 'Credenciales de integración inválidas';
  end if;

  if not exists (
    select 1
    from private.web_integration_tokens wit
    where wit.organization_id = p_organization_id
      and wit.token_hash = encode(extensions.digest(p_token, 'sha256'), 'hex')
  ) then
    raise exception 'Credenciales de integración inválidas';
  end if;

  select * into v_subscription
  from public.subscriptions s
  where s.organization_id = p_organization_id
  limit 1;

  if v_subscription.id is null
     or upper(coalesce(v_subscription.status,'')) <> 'ACTIVE'
     or upper(coalesce(v_subscription.plan,'')) <> 'ENTERPRISE' then
    raise exception 'La integración web está disponible en Enterprise';
  end if;

  if v_full_name is null and v_phone is null and v_email is null then
    raise exception 'El lead debe incluir al menos nombre, teléfono o email';
  end if;

  if v_operation is not null and v_operation not in ('COMPRA','ALQUILER') then
    raise exception 'Operación inválida';
  end if;

  if v_currency not in ('USD','UYU') then
    raise exception 'Moneda inválida';
  end if;

  begin
    v_budget := nullif(p_payload->>'budget_max','')::numeric;
  exception when others then
    raise exception 'Presupuesto inválido';
  end;

  begin
    v_bedrooms := nullif(p_payload->>'bedrooms_min','')::integer;
  exception when others then
    raise exception 'Dormitorios inválidos';
  end;

  if v_budget is not null and v_budget < 0 then raise exception 'Presupuesto inválido'; end if;
  if v_bedrooms is not null and v_bedrooms < 0 then raise exception 'Dormitorios inválidos'; end if;

  if v_zone is not null then v_score := v_score + 20; end if;
  if v_budget is not null then v_score := v_score + 25; end if;
  if v_bedrooms is not null then v_score := v_score + 15; end if;
  v_temperature := case when v_score >= 80 then 'HOT' when v_score >= 50 then 'WARM' else 'COLD' end;

  if v_phone is not null then
    select l.id, coalesce(l.lead_score,0)
      into v_existing_id, v_existing_score
    from public.leads l
    where l.organization_id = p_organization_id
      and regexp_replace(coalesce(l.phone,''), '[^0-9]', '', 'g') = regexp_replace(v_phone, '[^0-9]', '', 'g')
    order by l.created_at desc
    limit 1;
  end if;

  if v_existing_id is null and v_email is not null then
    select l.id, coalesce(l.lead_score,0)
      into v_existing_id, v_existing_score
    from public.leads l
    where l.organization_id = p_organization_id
      and lower(trim(coalesce(l.email,''))) = v_email
    order by l.created_at desc
    limit 1;
  end if;

  if v_existing_id is not null then
    update public.leads
    set full_name = coalesce(v_full_name, full_name),
        phone = coalesce(v_phone, phone),
        email = coalesce(v_email, email),
        operation = coalesce(v_operation, operation),
        property_type = coalesce(v_property_type, property_type),
        primary_zone = coalesce(v_zone, primary_zone),
        budget_max = coalesce(v_budget, budget_max),
        currency = coalesce(v_currency, currency),
        bedrooms_min = coalesce(v_bedrooms, bedrooms_min),
        lead_score = greatest(coalesce(lead_score,0), v_score),
        lead_temperature = case
          when greatest(coalesce(lead_score,0), v_score) >= 80 then 'HOT'
          when greatest(coalesce(lead_score,0), v_score) >= 50 then 'WARM'
          else 'COLD'
        end,
        next_action = 'Contactar lead recibido desde la web',
        updated_at = now()
    where id = v_existing_id
    returning id into v_lead_id;

    return jsonb_build_object('ok', true, 'action', 'updated', 'lead_id', v_lead_id);
  end if;

  select count(*) into v_count from public.leads where organization_id = p_organization_id;
  if coalesce(v_subscription.max_leads,0) > 0
     and v_subscription.max_leads < 1000000
     and v_count >= v_subscription.max_leads then
    raise exception 'La organización alcanzó el límite de leads';
  end if;

  insert into public.leads(
    organization_id, full_name, phone, email, operation, property_type,
    primary_zone, budget_max, currency, bedrooms_min, lead_score,
    lead_temperature, next_action
  ) values (
    p_organization_id, v_full_name, v_phone, v_email, v_operation, v_property_type,
    v_zone, v_budget, v_currency, v_bedrooms, v_score,
    v_temperature, 'Contactar lead recibido desde la web'
  ) returning id into v_lead_id;

  return jsonb_build_object('ok', true, 'action', 'created', 'lead_id', v_lead_id);
end;
$$;

revoke all on function public.ingest_web_lead(uuid,text,jsonb) from public;
grant execute on function public.ingest_web_lead(uuid,text,jsonb) to anon, authenticated;

create or replace function public.import_leads_bulk(p_rows jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_member public.organization_members%rowtype;
  v_subscription public.subscriptions%rowtype;
  v_item jsonb;
  v_current integer;
  v_inserted integer := 0;
  v_duplicates integer := 0;
  v_phone text;
  v_email text;
  v_team uuid;
begin
  if v_user is null then raise exception 'Sesión inválida'; end if;
  if jsonb_typeof(p_rows) <> 'array' then raise exception 'Formato de importación inválido'; end if;
  if jsonb_array_length(p_rows) > 5000 then raise exception 'Máximo 5000 filas por importación'; end if;

  select * into v_member
  from public.organization_members om
  where om.user_id = v_user and om.status = 'ACTIVE'
  limit 1;

  if v_member.id is null then raise exception 'No se encontró tu organización'; end if;
  if v_member.role not in ('OWNER','MANAGER') then raise exception 'Solo Director o Gerente pueden importar'; end if;

  select * into v_subscription from public.subscriptions s
  where s.organization_id = v_member.organization_id and s.status = 'ACTIVE'
  limit 1;
  if v_subscription.id is null then raise exception 'La organización no tiene una suscripción activa'; end if;

  if upper(coalesce(v_subscription.plan,'')) = 'ENTERPRISE'
     and v_member.role = 'MANAGER'
     and v_member.team_id is null then
    raise exception 'El Gerente debe tener un equipo asignado antes de importar leads';
  end if;

  select count(*) into v_current from public.leads where organization_id = v_member.organization_id;
  if coalesce(v_subscription.max_leads,0) > 0 and v_subscription.max_leads < 1000000
     and v_current + jsonb_array_length(p_rows) > v_subscription.max_leads then
    raise exception 'La importación supera el límite de leads de tu plan';
  end if;

  for v_item in select value from jsonb_array_elements(p_rows)
  loop
    v_phone := nullif(regexp_replace(coalesce(v_item->>'phone',''), '[^0-9]', '', 'g'), '');
    v_email := nullif(lower(trim(coalesce(v_item->>'email',''))), '');

    if (v_phone is not null and exists (
          select 1 from public.leads l where l.organization_id = v_member.organization_id
          and regexp_replace(coalesce(l.phone,''), '[^0-9]', '', 'g') = v_phone
       ))
       or (v_email is not null and exists (
          select 1 from public.leads l where l.organization_id = v_member.organization_id
          and lower(trim(coalesce(l.email,''))) = v_email
       )) then
      v_duplicates := v_duplicates + 1;
      continue;
    end if;

    v_team := case when v_member.role = 'MANAGER' then v_member.team_id else null end;

    insert into public.leads(
      organization_id, full_name, phone, email, operation, property_type, primary_zone,
      budget_max, currency, bedrooms_min, lead_score, lead_temperature, next_action, team_id
    ) values (
      v_member.organization_id,
      nullif(v_item->>'full_name',''),
      nullif(v_item->>'phone',''),
      nullif(v_item->>'email',''),
      nullif(v_item->>'operation',''),
      nullif(v_item->>'property_type',''),
      nullif(v_item->>'primary_zone',''),
      nullif(v_item->>'budget_max','')::numeric,
      coalesce(nullif(v_item->>'currency',''),'USD'),
      nullif(v_item->>'bedrooms_min','')::integer,
      coalesce(nullif(v_item->>'lead_score','')::integer,30),
      coalesce(nullif(v_item->>'lead_temperature',''),'COLD'),
      coalesce(nullif(v_item->>'next_action',''),'Contactar cliente'),
      v_team
    );
    v_inserted := v_inserted + 1;
  end loop;

  if coalesce(v_subscription.max_leads,0) > 0 and v_subscription.max_leads < 1000000
     and v_current + v_inserted > v_subscription.max_leads then
    raise exception 'La importación supera el límite de leads de tu plan';
  end if;

  return jsonb_build_object('imported', v_inserted, 'duplicates', v_duplicates);
end;
$$;

revoke all on function public.import_leads_bulk(jsonb) from public;
grant execute on function public.import_leads_bulk(jsonb) to authenticated;

create or replace function public.import_properties_bulk(p_rows jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_member public.organization_members%rowtype;
  v_subscription public.subscriptions%rowtype;
  v_item jsonb;
  v_current integer;
  v_inserted integer := 0;
  v_duplicates integer := 0;
  v_title text;
  v_address text;
  v_zone text;
begin
  if v_user is null then raise exception 'Sesión inválida'; end if;
  if jsonb_typeof(p_rows) <> 'array' then raise exception 'Formato de importación inválido'; end if;
  if jsonb_array_length(p_rows) > 5000 then raise exception 'Máximo 5000 filas por importación'; end if;

  select * into v_member
  from public.organization_members om
  where om.user_id = v_user and om.status = 'ACTIVE'
  limit 1;
  if v_member.id is null then raise exception 'No se encontró tu organización'; end if;
  if v_member.role not in ('OWNER','MANAGER') then raise exception 'Solo Director o Gerente pueden importar'; end if;

  select * into v_subscription from public.subscriptions s
  where s.organization_id = v_member.organization_id and s.status = 'ACTIVE'
  limit 1;
  if v_subscription.id is null then raise exception 'La organización no tiene una suscripción activa'; end if;

  select count(*) into v_current from public.properties where organization_id = v_member.organization_id;
  if coalesce(v_subscription.max_properties,0) > 0 and v_subscription.max_properties < 1000000
     and v_current + jsonb_array_length(p_rows) > v_subscription.max_properties then
    raise exception 'La importación supera el límite de propiedades de tu plan';
  end if;

  for v_item in select value from jsonb_array_elements(p_rows)
  loop
    v_title := lower(trim(coalesce(v_item->>'title','')));
    v_address := lower(trim(coalesce(v_item->>'address','')));
    v_zone := lower(trim(coalesce(v_item->>'zone','')));

    if exists (
      select 1 from public.properties p
      where p.organization_id = v_member.organization_id
        and lower(trim(coalesce(p.title,''))) = v_title
        and lower(trim(coalesce(p.address,''))) = v_address
        and lower(trim(coalesce(p.zone,''))) = v_zone
    ) then
      v_duplicates := v_duplicates + 1;
      continue;
    end if;

    insert into public.properties(
      organization_id, title, property_type, operation, zone, address, price,
      currency, bedrooms, bathrooms, area_m2, status, description
    ) values (
      v_member.organization_id,
      v_item->>'title',
      nullif(v_item->>'property_type',''),
      nullif(v_item->>'operation',''),
      nullif(v_item->>'zone',''),
      nullif(v_item->>'address',''),
      nullif(v_item->>'price','')::numeric,
      coalesce(nullif(v_item->>'currency',''),'USD'),
      nullif(v_item->>'bedrooms','')::integer,
      nullif(v_item->>'bathrooms','')::integer,
      nullif(v_item->>'area_m2','')::numeric,
      coalesce(nullif(v_item->>'status',''),'AVAILABLE'),
      nullif(v_item->>'description','')
    );
    v_inserted := v_inserted + 1;
  end loop;

  if coalesce(v_subscription.max_properties,0) > 0 and v_subscription.max_properties < 1000000
     and v_current + v_inserted > v_subscription.max_properties then
    raise exception 'La importación supera el límite de propiedades de tu plan';
  end if;

  return jsonb_build_object('imported', v_inserted, 'duplicates', v_duplicates);
end;
$$;

revoke all on function public.import_properties_bulk(jsonb) from public;
grant execute on function public.import_properties_bulk(jsonb) to authenticated;
