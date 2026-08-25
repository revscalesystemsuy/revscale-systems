create table if not exists public.subscription_change_requests (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  requested_by uuid not null references auth.users(id) on delete restrict,
  from_plan text not null,
  to_plan text not null,
  from_billing_cycle text,
  to_billing_cycle text not null,
  provider_subscription_id text,
  status text not null default 'PENDING',
  error_text text,
  created_at timestamptz not null default now(),
  processed_at timestamptz,
  constraint subscription_change_plan_check check (from_plan in ('STARTER','PROFESSIONAL','ENTERPRISE') and to_plan in ('STARTER','PROFESSIONAL','ENTERPRISE')),
  constraint subscription_change_cycle_check check (from_billing_cycle is null or from_billing_cycle in ('MONTHLY','ANNUAL')),
  constraint subscription_change_target_cycle_check check (to_billing_cycle in ('MONTHLY','ANNUAL')),
  constraint subscription_change_status_check check (status in ('PENDING','PROCESSING','COMPLETED','FAILED','CANCELED'))
);

create index if not exists subscription_change_requests_org_created_idx
  on public.subscription_change_requests (organization_id, created_at desc);

create unique index if not exists subscription_change_requests_one_pending_idx
  on public.subscription_change_requests (organization_id)
  where status in ('PENDING','PROCESSING');

alter table public.subscription_change_requests enable row level security;
revoke all on public.subscription_change_requests from public, anon;
grant select on public.subscription_change_requests to authenticated;
grant all on public.subscription_change_requests to service_role;

drop policy if exists subscription_change_requests_select on public.subscription_change_requests;
create policy subscription_change_requests_select on public.subscription_change_requests
for select to authenticated
using (
  exists (
    select 1
    from public.organization_members om
    where om.organization_id = subscription_change_requests.organization_id
      and om.user_id = (select auth.uid())
      and om.status = 'ACTIVE'
      and om.role = 'OWNER'
  )
);

create or replace function public.request_subscription_change(p_plan text, p_billing_cycle text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_org_id uuid;
  v_current public.subscriptions%rowtype;
  v_plan text := upper(trim(coalesce(p_plan,'')));
  v_cycle text := upper(trim(coalesce(p_billing_cycle,'')));
  v_agents integer;
  v_leads integer;
  v_properties integer;
  v_request_id uuid;
  v_target_agents integer;
  v_target_leads integer;
  v_target_properties integer;
begin
  if v_user_id is null then raise exception 'Usuario no autenticado'; end if;
  if v_plan = 'PRO' then v_plan := 'PROFESSIONAL'; end if;
  if v_plan not in ('STARTER','PROFESSIONAL','ENTERPRISE') then raise exception 'Plan invalido' using errcode='22023'; end if;
  if v_cycle not in ('MONTHLY','ANNUAL') then raise exception 'Ciclo invalido' using errcode='22023'; end if;

  select om.organization_id into v_org_id
  from public.organization_members om
  where om.user_id=v_user_id and om.status='ACTIVE' and om.role='OWNER'
  order by om.created_at asc limit 1;
  if v_org_id is null then raise exception 'Solo el Director puede cambiar la suscripcion'; end if;

  select * into v_current from public.subscriptions s
  where s.organization_id=v_org_id
  order by s.updated_at desc nulls last, s.created_at desc
  limit 1
  for update;
  if v_current.id is null or v_current.status <> 'ACTIVE' then raise exception 'No hay una suscripcion activa'; end if;
  if coalesce(v_current.billing_provider,'') <> 'PADDLE' or v_current.provider_subscription_id is null then
    raise exception 'La suscripcion actual no esta administrada por Paddle';
  end if;
  if upper(v_current.plan)=v_plan and coalesce(v_current.billing_cycle,'MONTHLY')=v_cycle then
    raise exception 'Ese ya es tu plan y ciclo actuales';
  end if;

  v_target_agents := case v_plan when 'STARTER' then 3 when 'PROFESSIONAL' then 15 else 30 end;
  v_target_leads := case v_plan when 'STARTER' then 500 else 1000000 end;
  v_target_properties := case v_plan when 'STARTER' then 100 else 1000000 end;

  select count(*) into v_agents from public.organization_members where organization_id=v_org_id and status='ACTIVE';
  select count(*) into v_leads from public.leads where organization_id=v_org_id;
  select count(*) into v_properties from public.properties where organization_id=v_org_id;

  if v_agents > v_target_agents then raise exception 'El plan elegido admite hasta % agentes activos y actualmente hay %', v_target_agents, v_agents; end if;
  if v_leads > v_target_leads then raise exception 'El plan elegido admite hasta % leads y actualmente hay %', v_target_leads, v_leads; end if;
  if v_properties > v_target_properties then raise exception 'El plan elegido admite hasta % propiedades y actualmente hay %', v_target_properties, v_properties; end if;

  insert into public.subscription_change_requests(
    organization_id,requested_by,from_plan,to_plan,from_billing_cycle,to_billing_cycle,provider_subscription_id
  ) values (
    v_org_id,v_user_id,
    case when upper(v_current.plan)='PRO' then 'PROFESSIONAL' else upper(v_current.plan) end,
    v_plan,v_current.billing_cycle,v_cycle,v_current.provider_subscription_id
  ) returning id into v_request_id;

  return v_request_id;
end;
$$;

revoke all on function public.request_subscription_change(text,text) from public, anon;
grant execute on function public.request_subscription_change(text,text) to authenticated;
