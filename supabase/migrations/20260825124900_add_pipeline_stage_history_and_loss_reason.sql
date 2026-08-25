alter table public.leads
  add column if not exists lost_reason text,
  add column if not exists stage_entered_at timestamptz not null default now(),
  add column if not exists closed_at timestamptz;

do $$ begin
  alter table public.leads add constraint leads_lost_reason_check
    check (lost_reason is null or lost_reason in ('NO_RESPONSE','BUDGET','NO_MATCH','COMPETITOR','POSTPONED','FINANCING','INVALID_CONTACT','OTHER'));
exception when duplicate_object then null; end $$;

update public.leads
set closed_at = coalesce(closed_at, now())
where pipeline_stage in ('WON','LOST') and closed_at is null;

create table if not exists public.lead_stage_events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  lead_id uuid not null references public.leads(id) on delete cascade,
  team_id uuid references public.teams(id) on delete set null,
  assigned_to uuid references auth.users(id) on delete set null,
  from_stage text,
  to_stage text not null,
  changed_by uuid references auth.users(id) on delete set null,
  lost_reason text,
  previous_stage_duration_seconds bigint,
  event_source text not null default 'PIPELINE',
  changed_at timestamptz not null default now(),
  constraint lead_stage_events_stage_check check (
    (from_stage is null or from_stage in ('NEW','CONTACTED','QUALIFIED','VISIT','NEGOTIATION','WON','LOST'))
    and to_stage in ('NEW','CONTACTED','QUALIFIED','VISIT','NEGOTIATION','WON','LOST')
  ),
  constraint lead_stage_events_lost_reason_check check (lost_reason is null or lost_reason in ('NO_RESPONSE','BUDGET','NO_MATCH','COMPETITOR','POSTPONED','FINANCING','INVALID_CONTACT','OTHER')),
  constraint lead_stage_events_source_check check (event_source in ('BASELINE','MANUAL','AUTOMATION')),
  constraint lead_stage_events_duration_check check (previous_stage_duration_seconds is null or previous_stage_duration_seconds >= 0)
);

create index if not exists lead_stage_events_org_changed_idx on public.lead_stage_events (organization_id, changed_at desc);
create index if not exists lead_stage_events_lead_changed_idx on public.lead_stage_events (lead_id, changed_at desc);
create index if not exists lead_stage_events_team_changed_idx on public.lead_stage_events (team_id, changed_at desc) where team_id is not null;
create index if not exists lead_stage_events_assignee_changed_idx on public.lead_stage_events (assigned_to, changed_at desc) where assigned_to is not null;
create index if not exists lead_stage_events_changed_by_idx on public.lead_stage_events (changed_by, changed_at desc) where changed_by is not null;

alter table public.lead_stage_events enable row level security;
revoke all on public.lead_stage_events from public, anon, authenticated;
grant select on public.lead_stage_events to authenticated;
grant all on public.lead_stage_events to service_role;

drop policy if exists lead_stage_events_select_accessible on public.lead_stage_events;
create policy lead_stage_events_select_accessible on public.lead_stage_events
for select to authenticated
using (private.can_access_lead(organization_id, team_id, assigned_to));

create or replace function private.track_lead_pipeline_transition()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_now timestamptz := now();
  v_duration bigint;
begin
  if new.pipeline_stage is distinct from old.pipeline_stage then
    v_duration := greatest(
      0,
      floor(extract(epoch from (v_now - coalesce(old.stage_entered_at, v_now))))
    )::bigint;

    if new.pipeline_stage <> 'LOST' then
      new.lost_reason := null;
    end if;

    new.stage_entered_at := v_now;
    new.closed_at := case when new.pipeline_stage in ('WON','LOST') then v_now else null end;

    insert into public.lead_stage_events(
      organization_id, lead_id, team_id, assigned_to, from_stage, to_stage,
      changed_by, lost_reason, previous_stage_duration_seconds, event_source, changed_at
    ) values (
      new.organization_id, new.id, new.team_id, new.assigned_to, old.pipeline_stage, new.pipeline_stage,
      auth.uid(), case when new.pipeline_stage='LOST' then new.lost_reason else null end,
      v_duration, case when auth.uid() is null then 'AUTOMATION' else 'MANUAL' end, v_now
    );
  elsif new.pipeline_stage <> 'LOST' then
    new.lost_reason := null;
  end if;

  return new;
end;
$$;

revoke all on function private.track_lead_pipeline_transition() from public, anon, authenticated;

drop trigger if exists trg_track_lead_pipeline_transition on public.leads;
create trigger trg_track_lead_pipeline_transition
before update of pipeline_stage, lost_reason on public.leads
for each row
execute function private.track_lead_pipeline_transition();

insert into public.lead_stage_events(
  organization_id, lead_id, team_id, assigned_to, from_stage, to_stage,
  changed_by, lost_reason, previous_stage_duration_seconds, event_source, changed_at
)
select l.organization_id, l.id, l.team_id, l.assigned_to, null, l.pipeline_stage,
       null, l.lost_reason, null, 'BASELINE', l.stage_entered_at
from public.leads l
where not exists (
  select 1 from public.lead_stage_events e where e.lead_id=l.id
);