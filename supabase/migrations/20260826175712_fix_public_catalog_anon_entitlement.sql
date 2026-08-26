create or replace function private.public_site_is_entitled(target_organization_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.subscriptions s
    where s.organization_id = target_organization_id
      and s.status = 'ACTIVE'
      and upper(s.plan) in ('PRO','PROFESSIONAL','ENTERPRISE')
  );
$$;

revoke all on function private.public_site_is_entitled(uuid) from public;
grant execute on function private.public_site_is_entitled(uuid) to anon, authenticated;

drop policy if exists "public can read active brokerage sites" on public.brokerage_public_sites;
create policy "public can read active brokerage sites"
on public.brokerage_public_sites
for select
to anon
using (
  is_active and (select private.public_site_is_entitled(organization_id))
);

drop policy if exists "members can read brokerage sites" on public.brokerage_public_sites;
create policy "members can read brokerage sites"
on public.brokerage_public_sites
for select
to authenticated
using (
  (is_active and (select private.public_site_is_entitled(organization_id)))
  or exists (
    select 1 from public.organization_members om
    where om.organization_id = brokerage_public_sites.organization_id
      and om.user_id = (select auth.uid())
      and om.status = 'ACTIVE'
  )
);
