create table if not exists public.b2b_conversion_events (
  id uuid primary key default gen_random_uuid(),
  opportunity_id uuid not null references public.b2b_opportunities(id) on delete cascade,
  event_type text not null check (event_type in ('DEMO_BOOKED','DEMO_SHOW','DEMO_NO_SHOW','DEMO_RESCHEDULED','PILOT_PROPOSED','PILOT_STARTED','PAID')),
  occurred_at timestamptz not null default now(),
  scheduled_for timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists b2b_conversion_events_opportunity_idx on public.b2b_conversion_events (opportunity_id, occurred_at desc);
create index if not exists b2b_conversion_events_type_idx on public.b2b_conversion_events (event_type, occurred_at desc);

alter table public.b2b_conversion_events enable row level security;
revoke all on table public.b2b_conversion_events from anon, public;
grant select, insert on table public.b2b_conversion_events to authenticated;
grant select, insert, update, delete on table public.b2b_conversion_events to service_role;

drop policy if exists "platform admins can view b2b conversion events" on public.b2b_conversion_events;
create policy "platform admins can view b2b conversion events"
on public.b2b_conversion_events
for select
to authenticated
using (exists (select 1 from public.platform_admins pa where pa.user_id = (select auth.uid())));

drop policy if exists "platform admins can insert b2b conversion events" on public.b2b_conversion_events;
create policy "platform admins can insert b2b conversion events"
on public.b2b_conversion_events
for insert
to authenticated
with check (exists (select 1 from public.platform_admins pa where pa.user_id = (select auth.uid())));

create or replace function private.log_b2b_conversion_event()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if old.stage is distinct from new.stage then
    if new.stage = 'DEMO_BOOKED' then
      insert into public.b2b_conversion_events(opportunity_id,event_type,occurred_at,scheduled_for)
      values(new.id,'DEMO_BOOKED',coalesce(new.demo_booked_at,now()),new.demo_scheduled_for);
    elsif new.stage = 'DEMO_COMPLETED' then
      insert into public.b2b_conversion_events(opportunity_id,event_type,occurred_at,scheduled_for)
      values(new.id,'DEMO_SHOW',coalesce(new.demo_completed_at,now()),new.demo_scheduled_for);
    elsif new.stage = 'PILOT_PROPOSED' then
      insert into public.b2b_conversion_events(opportunity_id,event_type,occurred_at)
      values(new.id,'PILOT_PROPOSED',coalesce(new.pilot_proposed_at,now()));
    elsif new.stage = 'PILOT_ACTIVE' then
      if new.pilot_proposed_at is not null and old.pilot_proposed_at is null then
        insert into public.b2b_conversion_events(opportunity_id,event_type,occurred_at)
        values(new.id,'PILOT_PROPOSED',new.pilot_proposed_at);
      end if;
      insert into public.b2b_conversion_events(opportunity_id,event_type,occurred_at)
      values(new.id,'PILOT_STARTED',coalesce(new.pilot_started_at,now()));
    elsif new.stage = 'PAID' then
      insert into public.b2b_conversion_events(opportunity_id,event_type,occurred_at)
      values(new.id,'PAID',coalesce(new.paid_at,now()));
    end if;
  end if;

  if old.demo_attendance is distinct from new.demo_attendance then
    if new.demo_attendance = 'NO_SHOW' then
      insert into public.b2b_conversion_events(opportunity_id,event_type,occurred_at,scheduled_for)
      values(new.id,'DEMO_NO_SHOW',now(),new.demo_scheduled_for);
    elsif new.demo_attendance = 'RESCHEDULED' then
      insert into public.b2b_conversion_events(opportunity_id,event_type,occurred_at,scheduled_for)
      values(new.id,'DEMO_RESCHEDULED',now(),new.demo_scheduled_for);
    end if;
  end if;

  return new;
end;
$$;

revoke all on function private.log_b2b_conversion_event() from public, anon, authenticated;

drop trigger if exists log_b2b_conversion_event on public.b2b_opportunities;
create trigger log_b2b_conversion_event
after update on public.b2b_opportunities
for each row execute function private.log_b2b_conversion_event();

insert into public.b2b_conversion_events(opportunity_id,event_type,occurred_at)
select b.id,'PAID',b.paid_at
from public.b2b_opportunities b
where b.paid_at is not null
  and not exists (
    select 1 from public.b2b_conversion_events e
    where e.opportunity_id=b.id and e.event_type='PAID'
  );
