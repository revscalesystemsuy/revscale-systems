create or replace function private.has_org_role(org_id uuid, allowed_roles text[])
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
    where om.organization_id = org_id
      and om.user_id = (select auth.uid())
      and om.status = 'ACTIVE'
      and upper(coalesce(s.status, 'INACTIVE')) = 'ACTIVE'
      and om.role = any(allowed_roles)
  );
$$;

drop policy if exists "Organization members can view profiles" on public.profiles;

create policy "active organization members can view profiles"
on public.profiles
for select
to authenticated
using (
  id in (
    select om.user_id
    from public.organization_members om
    where om.status = 'ACTIVE'
      and om.organization_id in (
        select my.organization_id
        from public.organization_members my
        join public.subscriptions s on s.organization_id = my.organization_id
        where my.user_id = (select auth.uid())
          and my.status = 'ACTIVE'
          and upper(coalesce(s.status, 'INACTIVE')) = 'ACTIVE'
      )
  )
  or id = (select auth.uid())
);
