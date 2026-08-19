create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  team_id uuid null references public.teams(id) on delete set null,
  lead_id uuid null references public.leads(id) on delete cascade,
  followup_id uuid null references public.followups(id) on delete cascade,
  property_id uuid null references public.properties(id) on delete cascade,
  type text not null,
  priority text not null default 'NORMAL',
  title text not null,
  body text not null,
  action_url text null,
  dedupe_key text null,
  read_at timestamptz null,
  created_at timestamptz not null default now()
);

create unique index if not exists notifications_dedupe_key_idx
  on public.notifications(dedupe_key)
  where dedupe_key is not null;
create index if not exists notifications_user_created_idx
  on public.notifications(user_id, created_at desc);
create index if not exists notifications_org_idx
  on public.notifications(organization_id);

alter table public.notifications enable row level security;

drop policy if exists "users can view own notifications" on public.notifications;
create policy "users can view own notifications"
on public.notifications
for select
to authenticated
using (user_id = auth.uid());

drop policy if exists "users can update own notifications" on public.notifications;
create policy "users can update own notifications"
on public.notifications
for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

create or replace function public.create_lead_notifications()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.assigned_to is not null then
    insert into public.notifications(
      organization_id,user_id,team_id,lead_id,type,priority,title,body,action_url,dedupe_key
    ) values (
      new.organization_id,
      new.assigned_to,
      new.team_id,
      new.id,
      'LEAD_ASSIGNED',
      case when upper(coalesce(new.lead_temperature,'')) = 'HOT' then 'HIGH' else 'NORMAL' end,
      case when upper(coalesce(new.lead_temperature,'')) = 'HOT' then '🔥 Nuevo lead HOT asignado' else '👤 Nuevo lead asignado' end,
      coalesce(new.full_name,'Nuevo lead') || ' fue asignado a tu cartera.',
      '/protected/leads/' || new.id,
      'lead-assigned:' || new.id || ':' || new.assigned_to
    ) on conflict (dedupe_key) where dedupe_key is not null do nothing;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_create_lead_notifications on public.leads;
create trigger trg_create_lead_notifications
after insert or update of assigned_to, lead_temperature on public.leads
for each row
when (new.assigned_to is not null)
execute function public.create_lead_notifications();

create or replace function public.refresh_my_commercial_notifications()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  created_count integer := 0;
  inserted integer := 0;
begin
  if uid is null then
    return 0;
  end if;

  insert into public.notifications(
    organization_id,user_id,team_id,lead_id,followup_id,type,priority,title,body,action_url,dedupe_key
  )
  select
    f.organization_id,
    uid,
    l.team_id,
    l.id,
    f.id,
    'FOLLOWUP_OVERDUE',
    case when upper(coalesce(l.lead_temperature,'')) = 'HOT' then 'HIGH' else 'NORMAL' end,
    '⏰ Follow-up vencido',
    coalesce(l.full_name,'Lead') || ': ' || coalesce(f.title,'seguimiento pendiente'),
    '/protected/leads/' || l.id,
    'followup-overdue:' || f.id || ':' || uid
  from public.followups f
  join public.leads l on l.id = f.lead_id and l.organization_id = f.organization_id
  where f.status = 'PENDING'
    and f.due_at < now()
    and private.can_access_lead(l.organization_id,l.team_id,l.assigned_to)
    and (f.assigned_to is null or f.assigned_to = uid or l.assigned_to = uid)
  on conflict (dedupe_key) where dedupe_key is not null do nothing;
  get diagnostics inserted = row_count;
  created_count := created_count + inserted;

  insert into public.notifications(
    organization_id,user_id,team_id,lead_id,type,priority,title,body,action_url,dedupe_key
  )
  select
    l.organization_id,
    uid,
    l.team_id,
    l.id,
    'STALE_LEAD',
    case when upper(coalesce(l.lead_temperature,'')) = 'HOT' then 'HIGH' else 'NORMAL' end,
    case when upper(coalesce(l.lead_temperature,'')) = 'HOT' then '🔥 Lead HOT sin actividad' else '⚠️ Lead sin actividad' end,
    coalesce(l.full_name,'Lead') || ' lleva más de 24 horas sin una interacción registrada.',
    '/protected/leads/' || l.id,
    'stale-24h:' || l.id || ':' || uid
  from public.leads l
  where private.can_access_lead(l.organization_id,l.team_id,l.assigned_to)
    and l.created_at < now() - interval '24 hours'
    and not exists (
      select 1 from public.interactions i
      where i.lead_id = l.id
        and i.organization_id = l.organization_id
        and i.created_at >= now() - interval '24 hours'
    )
  on conflict (dedupe_key) where dedupe_key is not null do nothing;
  get diagnostics inserted = row_count;
  created_count := created_count + inserted;

  return created_count;
end;
$$;

grant execute on function public.refresh_my_commercial_notifications() to authenticated;
