drop policy if exists "platform admins can view organizations" on public.organizations;
create policy "platform admins can view organizations"
on public.organizations
for select
to authenticated
using (
  exists (
    select 1 from public.platform_admins pa
    where pa.user_id = (select auth.uid())
  )
);

drop policy if exists "platform admins can view organization members" on public.organization_members;
create policy "platform admins can view organization members"
on public.organization_members
for select
to authenticated
using (
  exists (
    select 1 from public.platform_admins pa
    where pa.user_id = (select auth.uid())
  )
);

drop policy if exists "platform admins can view properties" on public.properties;
create policy "platform admins can view properties"
on public.properties
for select
to authenticated
using (
  exists (
    select 1 from public.platform_admins pa
    where pa.user_id = (select auth.uid())
  )
);

drop policy if exists "platform admins can view brokerage public sites" on public.brokerage_public_sites;
create policy "platform admins can view brokerage public sites"
on public.brokerage_public_sites
for select
to authenticated
using (
  exists (
    select 1 from public.platform_admins pa
    where pa.user_id = (select auth.uid())
  )
);
