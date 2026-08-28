alter table public.b2b_opportunities
  add column if not exists last_contact_outcome text;

alter table public.b2b_opportunities drop constraint if exists b2b_opportunities_last_contact_outcome_check;
alter table public.b2b_opportunities add constraint b2b_opportunities_last_contact_outcome_check
  check (last_contact_outcome is null or last_contact_outcome in ('CONTACTED','NO_RESPONSE','RESCHEDULED','OTHER'));

create table if not exists public.b2b_followup_events (
  id uuid primary key default gen_random_uuid(),
  opportunity_id uuid not null references public.b2b_opportunities(id) on delete cascade,
  completed_step text not null,
  scheduled_for timestamptz,
  outcome text not null check (outcome in ('CONTACTED','NO_RESPONSE','RESCHEDULED','OTHER')),
  completed_at timestamptz not null,
  completed_by uuid,
  next_step text not null,
  next_step_due_at timestamptz not null,
  created_at timestamptz not null default now()
);

create index if not exists b2b_followup_events_opportunity_completed_idx on public.b2b_followup_events (opportunity_id, completed_at desc);
create index if not exists b2b_followup_events_completed_at_idx on public.b2b_followup_events (completed_at desc);

alter table public.b2b_followup_events enable row level security;
revoke all on table public.b2b_followup_events from anon, public;
grant select on table public.b2b_followup_events to authenticated;
grant select, insert, update, delete on table public.b2b_followup_events to service_role;

create policy "platform admins can view b2b followup events"
on public.b2b_followup_events
for select
to authenticated
using (exists (select 1 from public.platform_admins pa where pa.user_id = (select auth.uid())));

create or replace function private.log_b2b_followup_completion()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.last_contact_at is distinct from old.last_contact_at
     and new.last_contact_at is not null
     and new.last_contact_outcome is not null
     and nullif(trim(old.next_step),'') is not null
     and nullif(trim(new.next_step),'') is not null
     and new.next_step_due_at is not null then
    insert into public.b2b_followup_events (
      opportunity_id, completed_step, scheduled_for, outcome, completed_at, completed_by, next_step, next_step_due_at
    ) values (
      new.id, old.next_step, old.next_step_due_at, new.last_contact_outcome, new.last_contact_at, auth.uid(), new.next_step, new.next_step_due_at
    );
  end if;
  return new;
end;
$$;

revoke all on function private.log_b2b_followup_completion() from public, anon, authenticated;

drop trigger if exists log_b2b_followup_completion on public.b2b_opportunities;
create trigger log_b2b_followup_completion
before update of last_contact_at, last_contact_outcome, next_step, next_step_due_at
on public.b2b_opportunities
for each row execute function private.log_b2b_followup_completion();
