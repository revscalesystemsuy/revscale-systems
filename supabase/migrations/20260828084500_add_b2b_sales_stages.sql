alter table public.b2b_opportunities drop constraint if exists b2b_opportunities_stage_check;
alter table public.b2b_opportunities add constraint b2b_opportunities_stage_check check (stage in ('NEW','CONTACTED','QUALIFIED','DEMO_BOOKED','DEMO_COMPLETED','PILOT_PROPOSED','PILOT_ACTIVE','PAID','LOST'));

grant update on table public.b2b_opportunities to authenticated;

drop policy if exists "platform admins can update b2b opportunities" on public.b2b_opportunities;
create policy "platform admins can update b2b opportunities"
on public.b2b_opportunities
for update
to authenticated
using (exists (select 1 from public.platform_admins pa where pa.user_id = (select auth.uid())))
with check (exists (select 1 from public.platform_admins pa where pa.user_id = (select auth.uid())));

create table if not exists public.b2b_stage_history (
  id uuid primary key default gen_random_uuid(),
  opportunity_id uuid not null references public.b2b_opportunities(id) on delete cascade,
  from_stage text,
  to_stage text not null,
  changed_by uuid,
  changed_at timestamptz not null default now()
);

create index if not exists b2b_stage_history_opportunity_changed_idx on public.b2b_stage_history (opportunity_id, changed_at desc);

alter table public.b2b_stage_history enable row level security;
revoke all on table public.b2b_stage_history from anon, public;
grant select on table public.b2b_stage_history to authenticated;
grant select, insert, update, delete on table public.b2b_stage_history to service_role;

create policy "platform admins can view b2b stage history"
on public.b2b_stage_history
for select
to authenticated
using (exists (select 1 from public.platform_admins pa where pa.user_id = (select auth.uid())));

create or replace function private.log_b2b_stage_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.stage is distinct from old.stage then
    insert into public.b2b_stage_history (opportunity_id, from_stage, to_stage, changed_by)
    values (new.id, old.stage, new.stage, auth.uid());
  end if;
  new.updated_at := now();
  return new;
end;
$$;

revoke all on function private.log_b2b_stage_change() from public, anon, authenticated;

drop trigger if exists log_b2b_stage_change on public.b2b_opportunities;
create trigger log_b2b_stage_change
before update on public.b2b_opportunities
for each row execute function private.log_b2b_stage_change();
