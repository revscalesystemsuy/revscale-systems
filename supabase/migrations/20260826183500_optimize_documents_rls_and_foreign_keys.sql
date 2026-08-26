create index if not exists document_events_actor_user_idx on public.document_events (actor_user_id) where actor_user_id is not null;
create index if not exists document_templates_created_by_idx on public.document_templates (created_by) where created_by is not null;
create index if not exists documents_created_by_idx on public.documents (created_by) where created_by is not null;
create index if not exists documents_updated_by_idx on public.documents (updated_by) where updated_by is not null;
create index if not exists signature_provider_settings_created_by_idx on public.signature_provider_settings (created_by) where created_by is not null;
create index if not exists signature_provider_settings_updated_by_idx on public.signature_provider_settings (updated_by) where updated_by is not null;

drop policy if exists document_templates_insert_management on public.document_templates;
create policy document_templates_insert_management on public.document_templates
for insert to authenticated
with check (
  private.has_org_role(organization_id, array['OWNER','MANAGER'])
  and private.organization_has_document_access(organization_id)
  and created_by = (select auth.uid())
);

drop policy if exists documents_insert_org on public.documents;
create policy documents_insert_org on public.documents
for insert to authenticated
with check (
  private.is_org_member(organization_id)
  and private.organization_has_document_access(organization_id)
  and created_by = (select auth.uid())
);

drop policy if exists documents_update_creator_or_management on public.documents;
create policy documents_update_creator_or_management on public.documents
for update to authenticated
using (
  private.organization_has_document_access(organization_id)
  and (created_by = (select auth.uid()) or private.has_org_role(organization_id, array['OWNER','MANAGER']))
)
with check (
  private.organization_has_document_access(organization_id)
  and (created_by = (select auth.uid()) or private.has_org_role(organization_id, array['OWNER','MANAGER']))
);

drop policy if exists signature_provider_settings_insert_owner on public.signature_provider_settings;
create policy signature_provider_settings_insert_owner on public.signature_provider_settings
for insert to authenticated
with check (
  private.has_org_role(organization_id, array['OWNER'])
  and private.organization_has_esignature_access(organization_id)
  and created_by = (select auth.uid())
);
