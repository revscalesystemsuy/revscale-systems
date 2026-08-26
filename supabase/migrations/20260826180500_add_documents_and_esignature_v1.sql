create or replace function private.organization_has_document_access(org_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.subscriptions s
    where s.organization_id = org_id
      and upper(coalesce(s.status, 'INACTIVE')) = 'ACTIVE'
      and upper(coalesce(s.plan, 'TRIAL')) in ('PRO', 'PROFESSIONAL', 'ENTERPRISE')
  );
$$;

create or replace function private.organization_has_esignature_access(org_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.subscriptions s
    where s.organization_id = org_id
      and upper(coalesce(s.status, 'INACTIVE')) = 'ACTIVE'
      and upper(coalesce(s.plan, 'TRIAL')) = 'ENTERPRISE'
  );
$$;

revoke all on function private.organization_has_document_access(uuid) from public, anon;
revoke all on function private.organization_has_esignature_access(uuid) from public, anon;
grant execute on function private.organization_has_document_access(uuid) to authenticated;
grant execute on function private.organization_has_esignature_access(uuid) to authenticated;

create table public.document_templates (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  document_type text not null,
  body text not null,
  version integer not null default 1 check (version > 0),
  is_active boolean not null default true,
  requires_legal_review boolean not null default true,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint document_templates_type_check check (document_type in ('RESERVATION','PURCHASE_OFFER','RENTAL_APPLICATION','LEASE','SALE_AGREEMENT','CUSTOM')),
  constraint document_templates_name_length check (char_length(name) between 2 and 120),
  constraint document_templates_body_length check (char_length(body) between 1 and 50000),
  unique (organization_id, name)
);

create index document_templates_org_active_idx on public.document_templates (organization_id, is_active, updated_at desc);

create table public.documents (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  reference_code text not null default ('DOC-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 10))) unique,
  template_id uuid references public.document_templates(id) on delete set null,
  lead_id uuid references public.leads(id) on delete set null,
  property_id uuid references public.properties(id) on delete set null,
  development_unit_id uuid references public.development_units(id) on delete set null,
  title text not null,
  document_type text not null,
  status text not null default 'DRAFT',
  revision integer not null default 1 check (revision > 0),
  content_snapshot text not null,
  variables jsonb not null default '{}'::jsonb,
  content_sha256 text,
  storage_path text,
  signed_storage_path text,
  recipient_name text,
  recipient_email text,
  recipient_phone text,
  notes text,
  legal_review_required boolean not null default true,
  legal_review_status text not null default 'PENDING',
  signature_provider text not null default 'NONE',
  provider_envelope_id text,
  provider_url text,
  provider_status text,
  expires_at timestamptz,
  generated_at timestamptz,
  sent_at timestamptz,
  viewed_at timestamptz,
  signed_at timestamptz,
  declined_at timestamptz,
  voided_at timestamptz,
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint documents_type_check check (document_type in ('RESERVATION','PURCHASE_OFFER','RENTAL_APPLICATION','LEASE','SALE_AGREEMENT','CUSTOM')),
  constraint documents_status_check check (status in ('DRAFT','GENERATED','SENT','VIEWED','SIGNED','DECLINED','VOIDED','EXPIRED')),
  constraint documents_review_status_check check (legal_review_status in ('PENDING','APPROVED','NOT_REQUIRED')),
  constraint documents_signature_provider_check check (signature_provider in ('NONE','EXTERNAL','TUID','ABITAB')),
  constraint documents_title_length check (char_length(title) between 2 and 180),
  constraint documents_content_length check (char_length(content_snapshot) between 1 and 100000),
  constraint documents_storage_paths_check check ((storage_path is null or storage_path like organization_id::text || '/%') and (signed_storage_path is null or signed_storage_path like organization_id::text || '/%'))
);

create index documents_org_created_idx on public.documents (organization_id, created_at desc);
create index documents_org_status_idx on public.documents (organization_id, status, updated_at desc);
create index documents_lead_idx on public.documents (lead_id) where lead_id is not null;
create index documents_property_idx on public.documents (property_id) where property_id is not null;
create index documents_development_unit_idx on public.documents (development_unit_id) where development_unit_id is not null;
create index documents_template_idx on public.documents (template_id) where template_id is not null;

create table public.document_events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  document_id uuid not null references public.documents(id) on delete cascade,
  event_type text not null,
  actor_user_id uuid references auth.users(id) on delete set null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint document_events_type_check check (event_type in ('CREATED','GENERATED','SENT','VIEWED','SIGNED','DECLINED','VOIDED','EXPIRED','FILE_UPLOADED','SIGNED_FILE_UPLOADED','LEGAL_REVIEWED','PROVIDER_UPDATED'))
);
create index document_events_document_created_idx on public.document_events (document_id, created_at desc);
create index document_events_org_created_idx on public.document_events (organization_id, created_at desc);

create table public.signature_provider_settings (
  organization_id uuid primary key references public.organizations(id) on delete cascade,
  provider text not null,
  integration_status text not null default 'NOT_CONFIGURED',
  account_label text,
  external_account_id text,
  configured_at timestamptz,
  last_health_check_at timestamptz,
  last_error text,
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint signature_provider_settings_provider_check check (provider in ('TUID','ABITAB')),
  constraint signature_provider_settings_status_check check (integration_status in ('NOT_CONFIGURED','PENDING','ACTIVE','ERROR'))
);

create or replace function private.touch_document_updated_at() returns trigger language plpgsql set search_path = '' as $$ begin new.updated_at := now(); return new; end; $$;
create trigger document_templates_touch_updated_at before update on public.document_templates for each row execute function private.touch_document_updated_at();
create trigger documents_touch_updated_at before update on public.documents for each row execute function private.touch_document_updated_at();
create trigger signature_provider_settings_touch_updated_at before update on public.signature_provider_settings for each row execute function private.touch_document_updated_at();

create or replace function private.enforce_document_plan() returns trigger language plpgsql set search_path = '' as $$ begin if not private.organization_has_document_access(new.organization_id) then raise exception 'Documents require an active Professional or Enterprise subscription'; end if; return new; end; $$;
create trigger document_templates_enforce_plan before insert or update on public.document_templates for each row execute function private.enforce_document_plan();
create trigger documents_enforce_plan before insert or update on public.documents for each row execute function private.enforce_document_plan();

create or replace function private.enforce_esignature_plan() returns trigger language plpgsql set search_path = '' as $$ begin if not private.organization_has_esignature_access(new.organization_id) then raise exception 'Electronic signature provider integration requires Enterprise'; end if; return new; end; $$;
create trigger signature_provider_settings_enforce_plan before insert or update on public.signature_provider_settings for each row execute function private.enforce_esignature_plan();

create or replace function private.prepare_document_write()
returns trigger language plpgsql set search_path = '' as $$
begin
  if tg_op = 'UPDATE' then
    if old.status in ('SENT','VIEWED','SIGNED','DECLINED','VOIDED','EXPIRED') and (
      new.title is distinct from old.title or new.document_type is distinct from old.document_type or new.template_id is distinct from old.template_id or new.lead_id is distinct from old.lead_id or new.property_id is distinct from old.property_id or new.development_unit_id is distinct from old.development_unit_id or new.content_snapshot is distinct from old.content_snapshot or new.variables is distinct from old.variables or new.recipient_name is distinct from old.recipient_name or new.recipient_email is distinct from old.recipient_email or new.recipient_phone is distinct from old.recipient_phone
    ) then raise exception 'Sent or finalized document content is immutable'; end if;
    if old.status = 'SIGNED' and new.status <> 'SIGNED' then raise exception 'Signed documents are immutable'; end if;
    if old.status in ('DECLINED','VOIDED','EXPIRED') and new.status <> old.status then raise exception 'Finalized documents cannot change status'; end if;
    if new.status is distinct from old.status then
      if old.status = 'DRAFT' and new.status not in ('GENERATED','VOIDED') then raise exception 'Invalid document status transition';
      elsif old.status = 'GENERATED' and new.status not in ('SENT','SIGNED','VOIDED') then raise exception 'Invalid document status transition';
      elsif old.status = 'SENT' and new.status not in ('VIEWED','SIGNED','DECLINED','VOIDED','EXPIRED') then raise exception 'Invalid document status transition';
      elsif old.status = 'VIEWED' and new.status not in ('SIGNED','DECLINED','VOIDED','EXPIRED') then raise exception 'Invalid document status transition'; end if;
    end if;
  end if;
  new.content_sha256 := encode(extensions.digest(convert_to(new.content_snapshot, 'UTF8'), 'sha256'), 'hex');
  if new.legal_review_required = false then new.legal_review_status := 'NOT_REQUIRED'; elsif new.legal_review_status = 'NOT_REQUIRED' then new.legal_review_status := 'PENDING'; end if;
  if new.status = 'GENERATED' and new.generated_at is null then new.generated_at := now(); end if;
  if new.status = 'SENT' and new.sent_at is null then new.sent_at := now(); end if;
  if new.status = 'VIEWED' and new.viewed_at is null then new.viewed_at := now(); end if;
  if new.status = 'SIGNED' and new.signed_at is null then new.signed_at := now(); end if;
  if new.status = 'DECLINED' and new.declined_at is null then new.declined_at := now(); end if;
  if new.status = 'VOIDED' and new.voided_at is null then new.voided_at := now(); end if;
  return new;
end;
$$;
create trigger documents_prepare_write before insert or update on public.documents for each row execute function private.prepare_document_write();

create or replace function private.audit_document_change()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'INSERT' then
    insert into public.document_events (organization_id, document_id, event_type, actor_user_id, metadata) values (new.organization_id, new.id, 'CREATED', auth.uid(), jsonb_build_object('status', new.status, 'reference_code', new.reference_code));
    if new.status = 'GENERATED' then insert into public.document_events (organization_id, document_id, event_type, actor_user_id) values (new.organization_id, new.id, 'GENERATED', auth.uid()); end if;
    return new;
  end if;
  if new.status is distinct from old.status then insert into public.document_events (organization_id, document_id, event_type, actor_user_id, metadata) values (new.organization_id, new.id, new.status, auth.uid(), jsonb_build_object('previous_status', old.status)); end if;
  if new.storage_path is distinct from old.storage_path and new.storage_path is not null then insert into public.document_events (organization_id, document_id, event_type, actor_user_id, metadata) values (new.organization_id, new.id, 'FILE_UPLOADED', auth.uid(), jsonb_build_object('path', new.storage_path)); end if;
  if new.signed_storage_path is distinct from old.signed_storage_path and new.signed_storage_path is not null then insert into public.document_events (organization_id, document_id, event_type, actor_user_id, metadata) values (new.organization_id, new.id, 'SIGNED_FILE_UPLOADED', auth.uid(), jsonb_build_object('path', new.signed_storage_path)); end if;
  if new.legal_review_status is distinct from old.legal_review_status then insert into public.document_events (organization_id, document_id, event_type, actor_user_id, metadata) values (new.organization_id, new.id, 'LEGAL_REVIEWED', auth.uid(), jsonb_build_object('status', new.legal_review_status)); end if;
  if new.provider_status is distinct from old.provider_status then insert into public.document_events (organization_id, document_id, event_type, actor_user_id, metadata) values (new.organization_id, new.id, 'PROVIDER_UPDATED', auth.uid(), jsonb_build_object('provider', new.signature_provider, 'status', new.provider_status)); end if;
  return new;
end;
$$;
revoke all on function private.audit_document_change() from public, anon, authenticated;
create trigger documents_audit_change after insert or update on public.documents for each row execute function private.audit_document_change();

create or replace function private.can_access_document_storage(object_name text)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.organization_members om join public.subscriptions s on s.organization_id=om.organization_id where om.user_id=auth.uid() and om.status='ACTIVE' and upper(coalesce(s.status,'INACTIVE'))='ACTIVE' and upper(coalesce(s.plan,'TRIAL')) in ('PRO','PROFESSIONAL','ENTERPRISE') and object_name like om.organization_id::text || '/%');
$$;
create or replace function private.can_manage_document_storage(object_name text)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.organization_members om join public.subscriptions s on s.organization_id=om.organization_id where om.user_id=auth.uid() and om.status='ACTIVE' and om.role in ('OWNER','MANAGER') and upper(coalesce(s.status,'INACTIVE'))='ACTIVE' and upper(coalesce(s.plan,'TRIAL')) in ('PRO','PROFESSIONAL','ENTERPRISE') and object_name like om.organization_id::text || '/%');
$$;
revoke all on function private.can_access_document_storage(text) from public, anon;
revoke all on function private.can_manage_document_storage(text) from public, anon;
grant execute on function private.can_access_document_storage(text) to authenticated;
grant execute on function private.can_manage_document_storage(text) to authenticated;

alter table public.document_templates enable row level security;
alter table public.documents enable row level security;
alter table public.document_events enable row level security;
alter table public.signature_provider_settings enable row level security;

create policy document_templates_select_org on public.document_templates for select to authenticated using (private.is_org_member(organization_id) and private.organization_has_document_access(organization_id));
create policy document_templates_insert_management on public.document_templates for insert to authenticated with check (private.has_org_role(organization_id,array['OWNER','MANAGER']) and private.organization_has_document_access(organization_id) and created_by=auth.uid());
create policy document_templates_update_management on public.document_templates for update to authenticated using (private.has_org_role(organization_id,array['OWNER','MANAGER']) and private.organization_has_document_access(organization_id)) with check (private.has_org_role(organization_id,array['OWNER','MANAGER']) and private.organization_has_document_access(organization_id));
create policy document_templates_delete_management on public.document_templates for delete to authenticated using (private.has_org_role(organization_id,array['OWNER','MANAGER']) and private.organization_has_document_access(organization_id));
create policy documents_select_org on public.documents for select to authenticated using (private.is_org_member(organization_id) and private.organization_has_document_access(organization_id));
create policy documents_insert_org on public.documents for insert to authenticated with check (private.is_org_member(organization_id) and private.organization_has_document_access(organization_id) and created_by=auth.uid());
create policy documents_update_creator_or_management on public.documents for update to authenticated using (private.organization_has_document_access(organization_id) and (created_by=auth.uid() or private.has_org_role(organization_id,array['OWNER','MANAGER']))) with check (private.organization_has_document_access(organization_id) and (created_by=auth.uid() or private.has_org_role(organization_id,array['OWNER','MANAGER'])));
create policy document_events_select_org on public.document_events for select to authenticated using (private.is_org_member(organization_id) and private.organization_has_document_access(organization_id));
create policy signature_provider_settings_select_owner on public.signature_provider_settings for select to authenticated using (private.has_org_role(organization_id,array['OWNER']) and private.organization_has_esignature_access(organization_id));
create policy signature_provider_settings_insert_owner on public.signature_provider_settings for insert to authenticated with check (private.has_org_role(organization_id,array['OWNER']) and private.organization_has_esignature_access(organization_id) and created_by=auth.uid());
create policy signature_provider_settings_update_owner on public.signature_provider_settings for update to authenticated using (private.has_org_role(organization_id,array['OWNER']) and private.organization_has_esignature_access(organization_id)) with check (private.has_org_role(organization_id,array['OWNER']) and private.organization_has_esignature_access(organization_id));

grant select,insert,update,delete on public.document_templates to authenticated;
grant select,insert,update on public.documents to authenticated;
grant select on public.document_events to authenticated;
grant select,insert,update on public.signature_provider_settings to authenticated;
revoke all on public.document_templates,public.documents,public.document_events,public.signature_provider_settings from anon;

insert into storage.buckets (id,name,public,file_size_limit,allowed_mime_types) values ('documents','documents',false,26214400,array['application/pdf','application/vnd.openxmlformats-officedocument.wordprocessingml.document']::text[]) on conflict(id) do update set public=false,file_size_limit=excluded.file_size_limit,allowed_mime_types=excluded.allowed_mime_types;
create policy documents_storage_select on storage.objects for select to authenticated using (bucket_id='documents' and private.can_access_document_storage(name));
create policy documents_storage_insert on storage.objects for insert to authenticated with check (bucket_id='documents' and private.can_access_document_storage(name));
create policy documents_storage_delete_management on storage.objects for delete to authenticated using (bucket_id='documents' and private.can_manage_document_storage(name));

create or replace function private.seed_default_document_templates(p_org_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not private.organization_has_document_access(p_org_id) then return; end if;
  insert into public.document_templates (organization_id,name,document_type,body,requires_legal_review,created_by) values
  (p_org_id,'Reserva / intención de operación','RESERVATION','RESERVA / INTENCIÓN DE OPERACIÓN\n\nFecha: {{today}}\nInmobiliaria: {{organization.name}}\nCliente: {{lead.full_name}}\nTeléfono: {{lead.phone}}\nEmail: {{lead.email}}\n\nPropiedad: {{property.title}}\nDirección: {{property.address}}\nZona: {{property.zone}}\nPrecio de referencia: {{property.currency}} {{property.price}}\n\nObservaciones:\n{{document.notes}}\n\nDocumento generado por RevScale para gestión operativa. Su contenido debe ser revisado por la inmobiliaria y, cuando corresponda, por un profesional jurídico o escribano antes de su firma.',true,null),
  (p_org_id,'Oferta de compra','PURCHASE_OFFER','OFERTA DE COMPRA\n\nFecha: {{today}}\nInmobiliaria: {{organization.name}}\nOferente: {{lead.full_name}}\nDocumento/contacto: {{lead.phone}} · {{lead.email}}\n\nPropiedad: {{property.title}}\nDirección: {{property.address}}\nPrecio publicado de referencia: {{property.currency}} {{property.price}}\n\nCondiciones y observaciones de la oferta:\n{{document.notes}}\n\nPlantilla operativa sujeta a revisión jurídica/notarial antes de su utilización contractual.',true,null),
  (p_org_id,'Solicitud de alquiler','RENTAL_APPLICATION','SOLICITUD DE ALQUILER\n\nFecha: {{today}}\nInmobiliaria: {{organization.name}}\nSolicitante: {{lead.full_name}}\nTeléfono: {{lead.phone}}\nEmail: {{lead.email}}\n\nPropiedad: {{property.title}}\nDirección: {{property.address}}\n\nInformación u observaciones aportadas:\n{{document.notes}}\n\nLa recepción de esta solicitud no implica aceptación ni reserva de la propiedad.',false,null),
  (p_org_id,'Arrendamiento — base para revisión','LEASE','CONTRATO DE ARRENDAMIENTO — BASE PARA REVISIÓN\n\nFecha: {{today}}\nInmobiliaria: {{organization.name}}\nInteresado: {{lead.full_name}}\nPropiedad: {{property.title}}\nDirección: {{property.address}}\n\nDatos y condiciones de trabajo:\n{{document.notes}}\n\nEsta plantilla es una base operativa y no sustituye la redacción o revisión profesional que pueda corresponder según el negocio, las partes y la normativa aplicable.',true,null)
  on conflict (organization_id,name) do nothing;
end;
$$;
revoke all on function private.seed_default_document_templates(uuid) from public,anon,authenticated;

create or replace function private.seed_document_templates_after_subscription() returns trigger language plpgsql security definer set search_path = '' as $$ begin if upper(coalesce(new.status,'INACTIVE'))='ACTIVE' and upper(coalesce(new.plan,'TRIAL')) in ('PRO','PROFESSIONAL','ENTERPRISE') then perform private.seed_default_document_templates(new.organization_id); end if; return new; end; $$;
revoke all on function private.seed_document_templates_after_subscription() from public,anon,authenticated;
create trigger subscriptions_seed_document_templates after insert or update of plan,status on public.subscriptions for each row execute function private.seed_document_templates_after_subscription();

do $$ declare r record; begin for r in select s.organization_id from public.subscriptions s where upper(coalesce(s.status,'INACTIVE'))='ACTIVE' and upper(coalesce(s.plan,'TRIAL')) in ('PRO','PROFESSIONAL','ENTERPRISE') loop perform private.seed_default_document_templates(r.organization_id); end loop; end $$;