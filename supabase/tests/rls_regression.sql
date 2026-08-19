\set ON_ERROR_STOP on

-- RevScale PropertyOS RLS regression harness.
-- Run with a privileged connection against an isolated/dev database whenever possible:
--   psql "$DATABASE_URL" -f supabase/tests/rls_regression.sql
--
-- The harness performs read-only authorization checks inside a transaction and rolls back.
-- It discovers one ACTIVE OWNER and one ACTIVE AGENT from the same organization.

begin;

select
  om.organization_id as test_org_id,
  om.user_id as owner_user_id
from public.organization_members om
join public.subscriptions s on s.organization_id = om.organization_id
where om.role = 'OWNER'
  and om.status = 'ACTIVE'
  and upper(coalesce(s.status, 'INACTIVE')) = 'ACTIVE'
order by om.organization_id
limit 1
\gset

select om.user_id as agent_user_id
from public.organization_members om
where om.organization_id = :'test_org_id'::uuid
  and om.role = 'AGENT'
  and om.status = 'ACTIVE'
order by om.user_id
limit 1
\gset

select count(*)::bigint as expected_org_leads
from public.leads
where organization_id = :'test_org_id'::uuid
\gset

select count(*)::bigint as expected_agent_leads
from public.leads
where organization_id = :'test_org_id'::uuid
  and assigned_to = :'agent_user_id'::uuid
\gset

set local role authenticated;

-- OWNER must see every lead in the organization.
select set_config('request.jwt.claim.sub', :'owner_user_id', true);
select (count(*) = :expected_org_leads::bigint) as owner_scope_ok
from public.leads
where organization_id = :'test_org_id'::uuid
\gset
\if :owner_scope_ok
  \echo 'PASS owner_scope_ok'
\else
  \echo 'FAIL owner_scope_ok'
  \quit 1
\endif

-- A normal organization owner is not a platform admin and must not see audit events.
select (count(*) = 0) as owner_audit_hidden_ok
from public.audit_events
\gset
\if :owner_audit_hidden_ok
  \echo 'PASS owner_audit_hidden_ok'
\else
  \echo 'FAIL owner_audit_hidden_ok'
  \quit 1
\endif

-- AGENT must see only leads assigned to that user in Enterprise scope.
select set_config('request.jwt.claim.sub', :'agent_user_id', true);
select (count(*) = :expected_agent_leads::bigint) as agent_scope_ok
from public.leads
where organization_id = :'test_org_id'::uuid
\gset
\if :agent_scope_ok
  \echo 'PASS agent_scope_ok'
\else
  \echo 'FAIL agent_scope_ok'
  \quit 1
\endif

-- AGENT must never see operational audit events.
select (count(*) = 0) as agent_audit_hidden_ok
from public.audit_events
\gset
\if :agent_audit_hidden_ok
  \echo 'PASS agent_audit_hidden_ok'
\else
  \echo 'FAIL agent_audit_hidden_ok'
  \quit 1
\endif

reset role;

-- Client roles must not be able to mutate the audit log directly.
select (
  not has_table_privilege('anon', 'public.audit_events', 'INSERT,UPDATE,DELETE')
  and not has_table_privilege('authenticated', 'public.audit_events', 'INSERT,UPDATE,DELETE')
) as audit_immutable_acl_ok
\gset
\if :audit_immutable_acl_ok
  \echo 'PASS audit_immutable_acl_ok'
\else
  \echo 'FAIL audit_immutable_acl_ok'
  \quit 1
\endif

-- Sensitive bulk/import/admin RPCs must not be executable by anon.
select (
  not has_function_privilege('anon', 'public.import_leads_bulk(jsonb)', 'EXECUTE')
  and not has_function_privilege('anon', 'public.import_properties_bulk(jsonb)', 'EXECUTE')
  and not has_function_privilege('anon', 'public.platform_admin_set_organization_suspension(uuid,boolean)', 'EXECUTE')
) as anon_sensitive_rpc_acl_ok
\gset
\if :anon_sensitive_rpc_acl_ok
  \echo 'PASS anon_sensitive_rpc_acl_ok'
\else
  \echo 'FAIL anon_sensitive_rpc_acl_ok'
  \quit 1
\endif

-- TRUNCATE/TRIGGER/REFERENCES must never be available to client roles on public tables.
select not exists (
  select 1
  from information_schema.role_table_grants
  where table_schema = 'public'
    and grantee in ('anon', 'authenticated')
    and privilege_type in ('TRUNCATE', 'TRIGGER', 'REFERENCES')
) as unsafe_table_privileges_revoked_ok
\gset
\if :unsafe_table_privileges_revoked_ok
  \echo 'PASS unsafe_table_privileges_revoked_ok'
\else
  \echo 'FAIL unsafe_table_privileges_revoked_ok'
  \quit 1
\endif

-- Public plan requests must go through the hardened RPC, never direct table INSERT.
select (
  not has_table_privilege('anon', 'public.plan_requests', 'INSERT')
  and not has_table_privilege('authenticated', 'public.plan_requests', 'INSERT')
  and has_function_privilege('anon', 'public.submit_plan_request(text,text,text,text,text)', 'EXECUTE')
) as plan_request_submission_acl_ok
\gset
\if :plan_request_submission_acl_ok
  \echo 'PASS plan_request_submission_acl_ok'
\else
  \echo 'FAIL plan_request_submission_acl_ok'
  \quit 1
\endif

rollback;

\echo 'RLS regression harness completed successfully.'
