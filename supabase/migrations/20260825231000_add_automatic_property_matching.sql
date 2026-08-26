create table if not exists public.property_lead_matches (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  property_id uuid not null references public.properties(id) on delete cascade,
  lead_id uuid not null references public.leads(id) on delete cascade,
  assigned_to uuid null references public.profiles(id) on delete set null,
  compatibility smallint not null check (compatibility between 0 and 100),
  reasons jsonb not null default '[]'::jsonb,
  matched_at timestamptz not null default now(),
  unique (property_id, lead_id)
);

create index if not exists property_lead_matches_property_score_idx
  on public.property_lead_matches(property_id, compatibility desc);
create index if not exists property_lead_matches_lead_idx
  on public.property_lead_matches(lead_id);
create index if not exists property_lead_matches_assigned_idx
  on public.property_lead_matches(assigned_to, matched_at desc)
  where assigned_to is not null;

alter table public.property_lead_matches enable row level security;

revoke all on table public.property_lead_matches from anon, authenticated;
grant select on table public.property_lead_matches to authenticated;
grant select, insert, update, delete on table public.property_lead_matches to service_role;

drop policy if exists "members can view accessible property matches" on public.property_lead_matches;
create policy "members can view accessible property matches"
on public.property_lead_matches
for select
to authenticated
using (
  exists (
    select 1
    from public.leads l
    where l.id = property_lead_matches.lead_id
      and l.organization_id = property_lead_matches.organization_id
      and private.can_access_lead(l.organization_id, l.team_id, l.assigned_to)
  )
);

create or replace function private.property_match_score(
  property_currency text,
  property_zone text,
  property_price numeric,
  property_bedrooms integer,
  lead_currency text,
  lead_zone text,
  lead_budget numeric,
  lead_bedrooms integer
)
returns integer
language sql
immutable
set search_path = ''
as $$
  select least(
    100,
    35
    + case
        when property_currency is not null
          and lead_currency is not null
          and upper(property_currency) = upper(lead_currency)
        then 10 else 0
      end
    + case
        when property_zone is not null
          and lead_zone is not null
          and lower(trim(property_zone)) = lower(trim(lead_zone))
        then 25 else 0
      end
    + case
        when property_price is not null and lead_budget is not null and lead_budget > 0
          and property_price / lead_budget between 0.75 and 1
        then 20
        when property_price is not null and lead_budget is not null and lead_budget > 0
          and property_price <= lead_budget
        then 12
        when property_price is not null and lead_budget is not null and lead_budget > 0
          and property_price <= lead_budget * 1.1
        then 4
        else 0
      end
    + case
        when property_bedrooms is not null
          and lead_bedrooms is not null
          and property_bedrooms >= lead_bedrooms
        then 10 else 0
      end
  )::integer;
$$;

create or replace function private.property_match_reasons(
  property_currency text,
  property_zone text,
  property_price numeric,
  property_bedrooms integer,
  lead_currency text,
  lead_zone text,
  lead_budget numeric,
  lead_bedrooms integer
)
returns jsonb
language sql
immutable
set search_path = ''
as $$
  select to_jsonb(array_remove(array[
    'Tipo y operación compatibles'::text,
    case
      when property_currency is not null and lead_currency is not null and upper(property_currency) = upper(lead_currency)
      then 'Misma moneda'
    end,
    case
      when property_zone is not null and lead_zone is not null and lower(trim(property_zone)) = lower(trim(lead_zone))
      then 'Zona coincide exactamente'
    end,
    case
      when property_price is not null and lead_budget is not null and lead_budget > 0
        and property_price / lead_budget between 0.75 and 1
      then 'Precio ideal para el presupuesto'
      when property_price is not null and lead_budget is not null and lead_budget > 0
        and property_price <= lead_budget
      then 'Precio dentro del presupuesto'
      when property_price is not null and lead_budget is not null and lead_budget > 0
        and property_price <= lead_budget * 1.1
      then 'Precio apenas por encima del presupuesto'
    end,
    case
      when property_bedrooms is not null and lead_bedrooms is not null and property_bedrooms >= lead_bedrooms
      then 'Dormitorios compatibles'
    end
  ], null));
$$;

create or replace function private.refresh_property_matches(target_property_id uuid)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  inserted_count integer := 0;
begin
  delete from public.property_lead_matches
  where property_id = target_property_id;

  insert into public.property_lead_matches(
    organization_id,
    property_id,
    lead_id,
    assigned_to,
    compatibility,
    reasons,
    matched_at
  )
  select
    p.organization_id,
    p.id,
    l.id,
    l.assigned_to,
    private.property_match_score(
      p.currency, p.zone, p.price, p.bedrooms,
      l.currency, l.primary_zone, l.budget_max, l.bedrooms_min
    ),
    private.property_match_reasons(
      p.currency, p.zone, p.price, p.bedrooms,
      l.currency, l.primary_zone, l.budget_max, l.bedrooms_min
    ),
    now()
  from public.properties p
  join public.subscriptions s
    on s.organization_id = p.organization_id
  join public.leads l
    on l.organization_id = p.organization_id
   and upper(coalesce(l.property_type, '')) = upper(coalesce(p.property_type, ''))
   and upper(coalesce(l.operation, '')) = upper(coalesce(p.operation, ''))
  where p.id = target_property_id
    and upper(coalesce(s.status, 'INACTIVE')) = 'ACTIVE'
    and upper(coalesce(s.plan, 'TRIAL')) in ('PRO', 'PROFESSIONAL', 'ENTERPRISE')
    and upper(coalesce(p.status, '')) = 'AVAILABLE'
    and upper(coalesce(l.pipeline_stage, 'NEW')) not in ('WON', 'LOST')
    and (l.currency is null or p.currency is null or upper(l.currency) = upper(p.currency))
    and (l.budget_max is null or p.price is null or p.price <= l.budget_max * 1.1)
    and (l.bedrooms_min is null or p.bedrooms is null or p.bedrooms >= l.bedrooms_min)
    and private.property_match_score(
      p.currency, p.zone, p.price, p.bedrooms,
      l.currency, l.primary_zone, l.budget_max, l.bedrooms_min
    ) >= 50;

  get diagnostics inserted_count = row_count;

  insert into public.notifications(
    organization_id,
    user_id,
    property_id,
    type,
    priority,
    title,
    body,
    action_url,
    dedupe_key
  )
  select
    m.organization_id,
    m.assigned_to,
    m.property_id,
    'PROPERTY_MATCH',
    case
      when max(m.compatibility) >= 85 or bool_or(upper(coalesce(l.lead_temperature, '')) = 'HOT') then 'HIGH'
      else 'NORMAL'
    end,
    'Clientes compatibles detectados',
    count(*)::text || case when count(*) = 1 then ' cliente de tu cartera coincide con ' else ' clientes de tu cartera coinciden con ' end
      || coalesce(p.title, 'esta propiedad') || '. Mejor afinidad: ' || max(m.compatibility)::text || '%.',
    '/protected/properties/' || m.property_id,
    'property-match:' || m.property_id || ':' || m.assigned_to
  from public.property_lead_matches m
  join public.properties p on p.id = m.property_id
  join public.leads l on l.id = m.lead_id
  where m.property_id = target_property_id
    and m.assigned_to is not null
  group by m.organization_id, m.assigned_to, m.property_id, p.title
  on conflict (dedupe_key) where dedupe_key is not null
  do update set
    priority = excluded.priority,
    title = excluded.title,
    body = excluded.body,
    action_url = excluded.action_url,
    read_at = case
      when public.notifications.body is distinct from excluded.body then null
      else public.notifications.read_at
    end,
    created_at = case
      when public.notifications.body is distinct from excluded.body then now()
      else public.notifications.created_at
    end;

  return inserted_count;
end;
$$;

create or replace function private.refresh_property_matches_trigger()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform private.refresh_property_matches(new.id);
  return new;
end;
$$;

revoke all on function private.refresh_property_matches(uuid) from public, anon, authenticated;
revoke all on function private.refresh_property_matches_trigger() from public, anon, authenticated;

drop trigger if exists trg_refresh_property_matches on public.properties;
create trigger trg_refresh_property_matches
after insert or update of property_type, operation, zone, price, currency, bedrooms, status
on public.properties
for each row
execute function private.refresh_property_matches_trigger();

do $$
declare
  property_row record;
begin
  for property_row in
    select p.id
    from public.properties p
    join public.subscriptions s on s.organization_id = p.organization_id
    where upper(coalesce(s.status, 'INACTIVE')) = 'ACTIVE'
      and upper(coalesce(s.plan, 'TRIAL')) in ('PRO', 'PROFESSIONAL', 'ENTERPRISE')
  loop
    perform private.refresh_property_matches(property_row.id);
  end loop;
end;
$$;
