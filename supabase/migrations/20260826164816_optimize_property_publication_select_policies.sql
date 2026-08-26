drop policy if exists "public can view published revscale listings" on public.property_publications;
drop policy if exists "members can view organization publications" on public.property_publications;

create policy "anonymous can view published revscale listings"
on public.property_publications
for select
to anon
using (channel = 'REVSCALE_WEB' and status = 'PUBLISHED');

create policy "authenticated can view public or organization publications"
on public.property_publications
for select
to authenticated
using (
  (channel = 'REVSCALE_WEB' and status = 'PUBLISHED')
  or (select private.is_org_member(organization_id))
);
