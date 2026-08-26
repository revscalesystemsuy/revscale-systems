drop policy if exists "leaders can create organization sla settings" on public.organization_sla_settings;
drop policy if exists "leaders can update organization sla settings" on public.organization_sla_settings;

create policy "owner can create organization sla settings"
on public.organization_sla_settings for insert to authenticated
with check (private.has_org_role(organization_id, array['OWNER'::text]));

create policy "owner can update organization sla settings"
on public.organization_sla_settings for update to authenticated
using (private.has_org_role(organization_id, array['OWNER'::text]))
with check (private.has_org_role(organization_id, array['OWNER'::text]));