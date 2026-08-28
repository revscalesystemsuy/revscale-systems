alter table public.b2b_opportunities
  add column if not exists sales_owner_id uuid references auth.users(id),
  add column if not exists primary_channel text not null default 'WEB',
  add column if not exists plan_interest text not null default 'UNKNOWN',
  add column if not exists next_step text,
  add column if not exists next_step_due_at timestamptz,
  add column if not exists last_contact_at timestamptz,
  add column if not exists notes text;

alter table public.b2b_opportunities drop constraint if exists b2b_opportunities_primary_channel_check;
alter table public.b2b_opportunities add constraint b2b_opportunities_primary_channel_check check (primary_channel in ('WEB','WHATSAPP','EMAIL','LINKEDIN','PHONE','OTHER'));
alter table public.b2b_opportunities drop constraint if exists b2b_opportunities_plan_interest_check;
alter table public.b2b_opportunities add constraint b2b_opportunities_plan_interest_check check (plan_interest in ('STARTER','PROFESSIONAL','ENTERPRISE','UNKNOWN'));

update public.b2b_opportunities
set sales_owner_id = (select user_id from public.platform_admins order by created_at asc limit 1)
where sales_owner_id is null;

update public.b2b_opportunities
set next_step = case when stage = 'PAID' then 'Revisar activación y continuidad' else 'Revisar oportunidad y definir contacto' end,
    next_step_due_at = case when stage = 'PAID' then now() + interval '7 days' else now() + interval '1 day' end
where stage <> 'LOST' and (next_step is null or next_step_due_at is null);

update public.b2b_opportunities b
set plan_interest = case when upper(coalesce(p.plan,'')) in ('STARTER','PROFESSIONAL','ENTERPRISE') then upper(p.plan) else 'UNKNOWN' end
from public.plan_requests p
where b.source_type='PLAN_REQUEST' and b.source_id=p.id and b.plan_interest='UNKNOWN';

alter table public.b2b_opportunities alter column sales_owner_id set not null;
alter table public.b2b_opportunities drop constraint if exists b2b_opportunities_next_step_required_check;
alter table public.b2b_opportunities add constraint b2b_opportunities_next_step_required_check check (
  stage = 'LOST' or (nullif(trim(next_step),'') is not null and next_step_due_at is not null)
);

create index if not exists b2b_opportunities_owner_stage_idx on public.b2b_opportunities (sales_owner_id, stage, next_step_due_at);
create index if not exists b2b_opportunities_next_step_due_idx on public.b2b_opportunities (next_step_due_at) where stage <> 'LOST';

create or replace function private.sync_b2b_from_commercial_diagnostic()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare v_owner uuid;
begin
  select user_id into v_owner from public.platform_admins order by created_at asc limit 1;
  if v_owner is null then raise exception 'No platform admin available for B2B ownership'; end if;
  insert into public.b2b_opportunities (
    source_type, source_id, company, contact_name, email, phone, source_status, stage,
    sales_owner_id, primary_channel, plan_interest, next_step, next_step_due_at, created_at, updated_at
  ) values (
    'WEBSITE_DIAGNOSTIC', new.id, new.company, new.name, new.email, new.phone, new.status, 'NEW',
    v_owner, 'WEB', 'UNKNOWN',
    case when new.recommendation = 'PILOT' then 'Revisar diagnóstico y proponer pilot' else 'Revisar diagnóstico y contactar' end,
    now() + interval '1 day', new.created_at, now()
  )
  on conflict (source_type, source_id) do update
  set company=excluded.company, contact_name=excluded.contact_name, email=excluded.email, phone=excluded.phone,
      source_status=excluded.source_status, updated_at=now();
  return new;
end;
$$;

create or replace function private.sync_b2b_from_plan_request()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_owner uuid;
  v_paid boolean := (new.payment_status = 'PAID' or new.status = 'ACTIVE');
begin
  select user_id into v_owner from public.platform_admins order by created_at asc limit 1;
  if v_owner is null then raise exception 'No platform admin available for B2B ownership'; end if;
  insert into public.b2b_opportunities (
    source_type, source_id, company, contact_name, email, phone, source_status, stage,
    sales_owner_id, primary_channel, plan_interest, next_step, next_step_due_at, created_at, updated_at
  ) values (
    'PLAN_REQUEST', new.id, coalesce(nullif(trim(new.company),''),'Sin empresa'), new.name, new.email, new.phone,
    coalesce(new.status,'PENDING'), case when v_paid then 'PAID' else 'NEW' end,
    v_owner, 'WEB', case when upper(coalesce(new.plan,'')) in ('STARTER','PROFESSIONAL','ENTERPRISE') then upper(new.plan) else 'UNKNOWN' end,
    case when v_paid then 'Revisar activación y onboarding' else 'Contactar sobre solicitud de plan' end,
    case when v_paid then now() + interval '7 days' else now() + interval '1 day' end,
    coalesce(new.created_at, now()), now()
  )
  on conflict (source_type, source_id) do update
  set company=excluded.company, contact_name=excluded.contact_name, email=excluded.email, phone=excluded.phone,
      source_status=excluded.source_status, plan_interest=excluded.plan_interest,
      stage=case when public.b2b_opportunities.stage='NEW' and v_paid then 'PAID' else public.b2b_opportunities.stage end,
      updated_at=now();
  return new;
end;
$$;

revoke all on function private.sync_b2b_from_commercial_diagnostic() from public, anon, authenticated;
revoke all on function private.sync_b2b_from_plan_request() from public, anon, authenticated;
