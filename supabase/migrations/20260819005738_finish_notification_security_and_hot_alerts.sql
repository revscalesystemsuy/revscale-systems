-- Lock down notification data so clients can only read their own rows and update read_at.
revoke all privileges on table public.notifications from anon;
revoke insert, update, delete, truncate, references, trigger on table public.notifications from authenticated;
grant select on table public.notifications to authenticated;
grant update (read_at) on table public.notifications to authenticated;

-- Active organization membership is required to see or mark notifications.
drop policy if exists "users can view own notifications" on public.notifications;
create policy "users can view own notifications"
on public.notifications
for select
to authenticated
using (
  user_id = (select auth.uid())
  and private.is_org_member(organization_id)
);

drop policy if exists "users can update own notifications" on public.notifications;
create policy "users can update own notifications"
on public.notifications
for update
to authenticated
using (
  user_id = (select auth.uid())
  and private.is_org_member(organization_id)
)
with check (
  user_id = (select auth.uid())
  and private.is_org_member(organization_id)
);

-- Keep the trigger private to database execution and emit a distinct alert when
-- an already-assigned lead transitions to HOT.
create or replace function public.create_lead_notifications()
returns trigger
language plpgsql
security definer
set search_path to ''
as $function$
begin
  if new.assigned_to is null then
    return new;
  end if;

  if tg_op = 'INSERT' then
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

    return new;
  end if;

  if new.assigned_to is distinct from old.assigned_to then
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

    return new;
  end if;

  if upper(coalesce(new.lead_temperature,'')) = 'HOT'
     and upper(coalesce(old.lead_temperature,'')) <> 'HOT' then
    insert into public.notifications(
      organization_id,user_id,team_id,lead_id,type,priority,title,body,action_url,dedupe_key
    ) values (
      new.organization_id,
      new.assigned_to,
      new.team_id,
      new.id,
      'LEAD_HOT',
      'HIGH',
      '🔥 Lead pasó a HOT',
      coalesce(new.full_name,'Lead') || ' requiere atención prioritaria.',
      '/protected/leads/' || new.id,
      'lead-hot:' || new.id || ':' || new.assigned_to
    ) on conflict (dedupe_key) where dedupe_key is not null do nothing;
  end if;

  return new;
end;
$function$;

revoke all on function public.create_lead_notifications() from public;
revoke all on function public.create_lead_notifications() from anon;
revoke all on function public.create_lead_notifications() from authenticated;

-- This RPC is intentionally callable by signed-in users; it derives the caller
-- from auth.uid(). Anonymous callers do not need execution rights.
revoke all on function public.refresh_my_commercial_notifications() from public;
revoke all on function public.refresh_my_commercial_notifications() from anon;
grant execute on function public.refresh_my_commercial_notifications() to authenticated;
