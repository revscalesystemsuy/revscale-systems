-- Explicit deny policies for internal tables that intentionally have no client access.
drop policy if exists "deny direct client access" on private.plan_request_rate_limits;
create policy "deny direct client access"
on private.plan_request_rate_limits
for all
to anon, authenticated
using (false)
with check (false);

drop policy if exists "deny direct client access" on public.billing_events;
create policy "deny direct client access"
on public.billing_events
for all
to anon, authenticated
using (false)
with check (false);

drop policy if exists "deny direct client access" on public.billing_price_catalog;
create policy "deny direct client access"
on public.billing_price_catalog
for all
to anon, authenticated
using (false)
with check (false);

-- SECURITY DEFINER routines must not live in the exposed public API schema.
-- Preserve their public RPC signatures with SECURITY INVOKER wrappers.
alter function public.ingest_web_lead(uuid, text, jsonb) set schema private;
alter function public.submit_billing_plan_request(text, text, text, text, text, text) set schema private;
alter function public.submit_plan_request(text, text, text, text, text) set schema private;
alter function public.cancel_pending_subscription_change(uuid) set schema private;
alter function public.import_leads_bulk(jsonb) set schema private;
alter function public.import_properties_bulk(jsonb) set schema private;
alter function public.platform_admin_activate_plan_request(uuid) set schema private;
alter function public.platform_admin_rotate_web_integration_token(uuid) set schema private;
alter function public.platform_admin_set_organization_suspension(uuid, boolean) set schema private;
alter function public.refresh_my_commercial_notifications() set schema private;
alter function public.request_subscription_change(text, text) set schema private;
alter function public.update_organization_member(uuid, text, text, uuid, boolean) set schema private;
alter function public.update_organization_member_profile(uuid, text, text) set schema private;

-- Keep private routines callable only by the roles that need them. The private
-- schema is not part of the exposed Data API, so callers still enter through
-- the public SECURITY INVOKER wrappers below.
grant usage on schema private to anon, authenticated, service_role;
revoke execute on all functions in schema private from public, anon, authenticated, service_role;

grant execute on function private.can_access_lead(uuid, uuid, uuid) to authenticated;
grant execute on function private.is_org_member(uuid) to authenticated;
grant execute on function private.has_org_role(uuid, text[]) to authenticated;
grant execute on function private.consume_web_ingest_quota(uuid, integer) to service_role;

grant execute on function private.ingest_web_lead(uuid, text, jsonb) to anon, service_role;
grant execute on function private.submit_billing_plan_request(text, text, text, text, text, text) to anon, authenticated, service_role;
grant execute on function private.submit_plan_request(text, text, text, text, text) to anon, authenticated, service_role;
grant execute on function private.cancel_pending_subscription_change(uuid) to authenticated, service_role;
grant execute on function private.import_leads_bulk(jsonb) to authenticated, service_role;
grant execute on function private.import_properties_bulk(jsonb) to authenticated, service_role;
grant execute on function private.platform_admin_activate_plan_request(uuid) to authenticated, service_role;
grant execute on function private.platform_admin_rotate_web_integration_token(uuid) to authenticated, service_role;
grant execute on function private.platform_admin_set_organization_suspension(uuid, boolean) to authenticated, service_role;
grant execute on function private.refresh_my_commercial_notifications() to authenticated, service_role;
grant execute on function private.request_subscription_change(text, text) to authenticated, service_role;
grant execute on function private.update_organization_member(uuid, text, text, uuid, boolean) to authenticated, service_role;
grant execute on function private.update_organization_member_profile(uuid, text, text) to authenticated, service_role;

create function public.ingest_web_lead(p_organization_id uuid, p_token text, p_payload jsonb)
returns jsonb
language sql
security invoker
set search_path = ''
as $$ select private.ingest_web_lead(p_organization_id, p_token, p_payload) $$;

create function public.submit_billing_plan_request(
  p_name text,
  p_company text,
  p_email text,
  p_phone text,
  p_plan text,
  p_billing_cycle text default 'MONTHLY'
)
returns uuid
language sql
security invoker
set search_path = ''
as $$ select private.submit_billing_plan_request(p_name, p_company, p_email, p_phone, p_plan, p_billing_cycle) $$;

create function public.submit_plan_request(p_name text, p_company text, p_email text, p_phone text, p_plan text)
returns boolean
language sql
security invoker
set search_path = ''
as $$ select private.submit_plan_request(p_name, p_company, p_email, p_phone, p_plan) $$;

create function public.cancel_pending_subscription_change(p_request_id uuid)
returns boolean
language sql
security invoker
set search_path = ''
as $$ select private.cancel_pending_subscription_change(p_request_id) $$;

create function public.import_leads_bulk(p_rows jsonb)
returns jsonb
language sql
security invoker
set search_path = ''
as $$ select private.import_leads_bulk(p_rows) $$;

create function public.import_properties_bulk(p_rows jsonb)
returns jsonb
language sql
security invoker
set search_path = ''
as $$ select private.import_properties_bulk(p_rows) $$;

create function public.platform_admin_activate_plan_request(p_request_id uuid)
returns uuid
language sql
security invoker
set search_path = ''
as $$ select private.platform_admin_activate_plan_request(p_request_id) $$;

create function public.platform_admin_rotate_web_integration_token(p_organization_id uuid)
returns text
language sql
security invoker
set search_path = ''
as $$ select private.platform_admin_rotate_web_integration_token(p_organization_id) $$;

create function public.platform_admin_set_organization_suspension(p_organization_id uuid, p_suspend boolean)
returns text
language sql
security invoker
set search_path = ''
as $$ select private.platform_admin_set_organization_suspension(p_organization_id, p_suspend) $$;

create function public.refresh_my_commercial_notifications()
returns integer
language sql
security invoker
set search_path = ''
as $$ select private.refresh_my_commercial_notifications() $$;

create function public.request_subscription_change(p_plan text, p_billing_cycle text)
returns uuid
language sql
security invoker
set search_path = ''
as $$ select private.request_subscription_change(p_plan, p_billing_cycle) $$;

create function public.update_organization_member(
  p_member_id uuid,
  p_role text default null,
  p_status text default null,
  p_team_id uuid default null,
  p_set_team boolean default false
)
returns void
language sql
security invoker
set search_path = ''
as $$ select private.update_organization_member(p_member_id, p_role, p_status, p_team_id, p_set_team) $$;

create function public.update_organization_member_profile(
  p_member_id uuid,
  p_full_name text,
  p_phone text default null
)
returns void
language sql
security invoker
set search_path = ''
as $$ select private.update_organization_member_profile(p_member_id, p_full_name, p_phone) $$;

-- Public wrappers are opt-in RPCs; remove default EXECUTE and regrant minimally.
revoke execute on function public.ingest_web_lead(uuid, text, jsonb) from public, anon, authenticated, service_role;
revoke execute on function public.submit_billing_plan_request(text, text, text, text, text, text) from public, anon, authenticated, service_role;
revoke execute on function public.submit_plan_request(text, text, text, text, text) from public, anon, authenticated, service_role;
revoke execute on function public.cancel_pending_subscription_change(uuid) from public, anon, authenticated, service_role;
revoke execute on function public.import_leads_bulk(jsonb) from public, anon, authenticated, service_role;
revoke execute on function public.import_properties_bulk(jsonb) from public, anon, authenticated, service_role;
revoke execute on function public.platform_admin_activate_plan_request(uuid) from public, anon, authenticated, service_role;
revoke execute on function public.platform_admin_rotate_web_integration_token(uuid) from public, anon, authenticated, service_role;
revoke execute on function public.platform_admin_set_organization_suspension(uuid, boolean) from public, anon, authenticated, service_role;
revoke execute on function public.refresh_my_commercial_notifications() from public, anon, authenticated, service_role;
revoke execute on function public.request_subscription_change(text, text) from public, anon, authenticated, service_role;
revoke execute on function public.update_organization_member(uuid, text, text, uuid, boolean) from public, anon, authenticated, service_role;
revoke execute on function public.update_organization_member_profile(uuid, text, text) from public, anon, authenticated, service_role;

grant execute on function public.ingest_web_lead(uuid, text, jsonb) to anon, service_role;
grant execute on function public.submit_billing_plan_request(text, text, text, text, text, text) to anon, authenticated, service_role;
grant execute on function public.submit_plan_request(text, text, text, text, text) to anon, authenticated, service_role;
grant execute on function public.cancel_pending_subscription_change(uuid) to authenticated, service_role;
grant execute on function public.import_leads_bulk(jsonb) to authenticated, service_role;
grant execute on function public.import_properties_bulk(jsonb) to authenticated, service_role;
grant execute on function public.platform_admin_activate_plan_request(uuid) to authenticated, service_role;
grant execute on function public.platform_admin_rotate_web_integration_token(uuid) to authenticated, service_role;
grant execute on function public.platform_admin_set_organization_suspension(uuid, boolean) to authenticated, service_role;
grant execute on function public.refresh_my_commercial_notifications() to authenticated, service_role;
grant execute on function public.request_subscription_change(text, text) to authenticated, service_role;
grant execute on function public.update_organization_member(uuid, text, text, uuid, boolean) to authenticated, service_role;
grant execute on function public.update_organization_member_profile(uuid, text, text) to authenticated, service_role;
