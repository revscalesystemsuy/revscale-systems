alter table public.organization_members
add column if not exists billing_status_backup text null;

create or replace function private.is_org_member(org_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.organization_members om
    where om.organization_id = org_id
      and om.user_id = (select auth.uid())
      and om.status = 'ACTIVE'
  );
$$;

create or replace function private.can_access_lead(target_org uuid, target_team uuid, target_assignee uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.organization_members om
    join public.subscriptions s on s.organization_id = om.organization_id
    where om.organization_id = target_org
      and om.user_id = (select auth.uid())
      and om.status = 'ACTIVE'
      and upper(coalesce(s.status, 'INACTIVE')) = 'ACTIVE'
      and (
        upper(coalesce(s.plan, 'TRIAL')) <> 'ENTERPRISE'
        or om.role = 'OWNER'
        or (om.role = 'MANAGER' and om.team_id is not null and om.team_id = target_team)
        or (om.role = 'AGENT' and target_assignee = om.user_id)
      )
  );
$$;

revoke all on function private.is_org_member(uuid) from public;
grant execute on function private.is_org_member(uuid) to authenticated;
revoke all on function private.can_access_lead(uuid,uuid,uuid) from public;
grant execute on function private.can_access_lead(uuid,uuid,uuid) to authenticated;

drop policy if exists "members can view organization subscription" on public.subscriptions;
create policy "members can view organization subscription"
on public.subscriptions
for select
to authenticated
using (
  exists (
    select 1
    from public.organization_members om
    where om.organization_id = subscriptions.organization_id
      and om.user_id = auth.uid()
  )
  or exists (
    select 1 from public.platform_admins pa where pa.user_id = auth.uid()
  )
);

create or replace function public.platform_admin_set_organization_suspension(
  p_organization_id uuid,
  p_suspend boolean
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null or not exists (
    select 1 from public.platform_admins pa where pa.user_id = auth.uid()
  ) then
    raise exception 'Acceso no autorizado';
  end if;

  if not exists (
    select 1 from public.organizations o where o.id = p_organization_id
  ) then
    raise exception 'Organización no encontrada';
  end if;

  if p_suspend and exists (
    select 1
    from public.organization_members om
    join public.platform_admins pa on pa.user_id = om.user_id
    where om.organization_id = p_organization_id
  ) then
    raise exception 'La organización contiene un administrador interno de RevScale y no puede suspenderse.';
  end if;

  if p_suspend then
    update public.subscriptions
    set status = 'SUSPENDED', updated_at = now()
    where organization_id = p_organization_id;

    if not found then
      raise exception 'La organización no tiene una suscripción para suspender.';
    end if;

    update public.organization_members
    set billing_status_backup = status,
        status = 'SUSPENDED_BILLING'
    where organization_id = p_organization_id
      and status <> 'SUSPENDED_BILLING';

    return 'SUSPENDED';
  else
    update public.subscriptions
    set status = 'ACTIVE', updated_at = now()
    where organization_id = p_organization_id;

    if not found then
      raise exception 'La organización no tiene una suscripción para reactivar.';
    end if;

    update public.organization_members
    set status = coalesce(billing_status_backup, 'ACTIVE'),
        billing_status_backup = null
    where organization_id = p_organization_id
      and status = 'SUSPENDED_BILLING';

    return 'ACTIVE';
  end if;
end;
$$;

revoke all on function public.platform_admin_set_organization_suspension(uuid,boolean) from public;
grant execute on function public.platform_admin_set_organization_suspension(uuid,boolean) to authenticated;
