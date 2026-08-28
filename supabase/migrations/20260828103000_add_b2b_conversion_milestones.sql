alter table public.b2b_opportunities
  add column if not exists demo_booked_at timestamptz,
  add column if not exists demo_scheduled_for timestamptz,
  add column if not exists demo_attendance text,
  add column if not exists demo_completed_at timestamptz,
  add column if not exists pilot_proposed_at timestamptz,
  add column if not exists pilot_started_at timestamptz,
  add column if not exists paid_at timestamptz;

alter table public.b2b_opportunities drop constraint if exists b2b_opportunities_demo_attendance_check;
alter table public.b2b_opportunities add constraint b2b_opportunities_demo_attendance_check check (
  demo_attendance is null or demo_attendance in ('SHOW','NO_SHOW','RESCHEDULED')
);

create index if not exists b2b_opportunities_demo_scheduled_idx on public.b2b_opportunities (demo_scheduled_for) where demo_scheduled_for is not null;
create index if not exists b2b_opportunities_pilot_started_idx on public.b2b_opportunities (pilot_started_at) where pilot_started_at is not null;
create index if not exists b2b_opportunities_paid_at_idx on public.b2b_opportunities (paid_at) where paid_at is not null;

create or replace function private.capture_b2b_conversion_milestones()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.stage = 'DEMO_BOOKED' and (tg_op = 'INSERT' or old.stage is distinct from new.stage) and new.demo_booked_at is null then
    new.demo_booked_at := now();
  end if;

  if new.stage = 'DEMO_COMPLETED' and (tg_op = 'INSERT' or old.stage is distinct from new.stage) then
    if new.demo_completed_at is null then new.demo_completed_at := now(); end if;
    if new.demo_attendance is null then new.demo_attendance := 'SHOW'; end if;
  end if;

  if new.stage = 'PILOT_PROPOSED' and (tg_op = 'INSERT' or old.stage is distinct from new.stage) and new.pilot_proposed_at is null then
    new.pilot_proposed_at := now();
  end if;

  if new.stage = 'PILOT_ACTIVE' and (tg_op = 'INSERT' or old.stage is distinct from new.stage) then
    if new.pilot_proposed_at is null then new.pilot_proposed_at := now(); end if;
    if new.pilot_started_at is null then new.pilot_started_at := now(); end if;
  end if;

  if new.stage = 'PAID' and (tg_op = 'INSERT' or old.stage is distinct from new.stage) and new.paid_at is null then
    new.paid_at := now();
  end if;

  return new;
end;
$$;

revoke all on function private.capture_b2b_conversion_milestones() from public, anon, authenticated;

drop trigger if exists capture_b2b_conversion_milestones on public.b2b_opportunities;
create trigger capture_b2b_conversion_milestones
before insert or update on public.b2b_opportunities
for each row execute function private.capture_b2b_conversion_milestones();

update public.b2b_opportunities b
set paid_at = p.paid_at
from public.plan_requests p
where b.source_type = 'PLAN_REQUEST'
  and b.source_id = p.id
  and b.stage = 'PAID'
  and b.paid_at is null
  and p.payment_status = 'PAID'
  and p.paid_at is not null;

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
    sales_owner_id, primary_channel, plan_interest, next_step, next_step_due_at,
    acquisition_source, paid_at, created_at, updated_at
  ) values (
    'PLAN_REQUEST', new.id, coalesce(nullif(trim(new.company),''),'Sin empresa'), new.name, new.email, new.phone,
    coalesce(new.status,'PENDING'), case when v_paid then 'PAID' else 'NEW' end,
    v_owner, 'WEB', case when upper(coalesce(new.plan,'')) in ('STARTER','PROFESSIONAL','ENTERPRISE') then upper(new.plan) else 'UNKNOWN' end,
    case when v_paid then 'Revisar activación y onboarding' else 'Contactar sobre solicitud de plan' end,
    case when v_paid then now() + interval '7 days' else now() + interval '1 day' end,
    'WEBSITE', case when new.payment_status = 'PAID' then new.paid_at else null end,
    coalesce(new.created_at, now()), now()
  )
  on conflict (source_type, source_id) do update
  set company = excluded.company,
      contact_name = excluded.contact_name,
      email = excluded.email,
      phone = excluded.phone,
      source_status = excluded.source_status,
      plan_interest = excluded.plan_interest,
      stage = case when public.b2b_opportunities.stage = 'NEW' and v_paid then 'PAID' else public.b2b_opportunities.stage end,
      paid_at = case when new.payment_status = 'PAID' and new.paid_at is not null then new.paid_at else public.b2b_opportunities.paid_at end,
      updated_at = now();
  return new;
end;
$$;
