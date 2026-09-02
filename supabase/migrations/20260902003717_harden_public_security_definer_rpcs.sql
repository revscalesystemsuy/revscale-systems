-- Fail closed for future functions created in the exposed public schema.
alter default privileges for role postgres in schema public revoke execute on functions from public;
alter default privileges for role postgres in schema public revoke execute on functions from anon, authenticated;

-- Move privileged implementations out of the exposed API schema.
alter function public.approve_customer_referral_reward(uuid, boolean, text) set schema private;
alter function public.create_customer_referral_code(uuid, text, text) set schema private;
alter function public.get_paid_optimization_snapshot(text, text, date, date) set schema private;
alter function public.mark_customer_referral_credit_applied(uuid, text) set schema private;
alter function public.mark_referral_new_customer_benefit_fulfilled(uuid) set schema private;
alter function public.refresh_customer_referral_eligibility(uuid) set schema private;
alter function public.submit_customer_referral(text, text, text, text, text) set schema private;
alter function public.submit_leak_audit(text, text, text, text, integer, integer, integer, integer, integer, integer, integer, numeric, numeric, jsonb, jsonb) set schema private;
alter function public.submit_leak_audit_attributed(text, text, text, text, integer, integer, integer, integer, integer, integer, integer, numeric, numeric, jsonb, jsonb, text, text, text, text, text, text, text, text) set schema private;

-- Privileged implementations use a fixed search path and explicit grants only.
alter function private.approve_customer_referral_reward(uuid, boolean, text) set search_path = '';
alter function private.create_customer_referral_code(uuid, text, text) set search_path = '';
alter function private.get_paid_optimization_snapshot(text, text, date, date) set search_path = '';
alter function private.mark_customer_referral_credit_applied(uuid, text) set search_path = '';
alter function private.mark_referral_new_customer_benefit_fulfilled(uuid) set search_path = '';
alter function private.refresh_customer_referral_eligibility(uuid) set search_path = '';
alter function private.submit_customer_referral(text, text, text, text, text) set search_path = '';
alter function private.submit_leak_audit(text, text, text, text, integer, integer, integer, integer, integer, integer, integer, numeric, numeric, jsonb, jsonb) set search_path = '';
alter function private.submit_leak_audit_attributed(text, text, text, text, integer, integer, integer, integer, integer, integer, integer, numeric, numeric, jsonb, jsonb, text, text, text, text, text, text, text, text) set search_path = '';

revoke execute on function private.approve_customer_referral_reward(uuid, boolean, text) from public, anon, authenticated;
revoke execute on function private.create_customer_referral_code(uuid, text, text) from public, anon, authenticated;
revoke execute on function private.get_paid_optimization_snapshot(text, text, date, date) from public, anon, authenticated;
revoke execute on function private.mark_customer_referral_credit_applied(uuid, text) from public, anon, authenticated;
revoke execute on function private.mark_referral_new_customer_benefit_fulfilled(uuid) from public, anon, authenticated;
revoke execute on function private.refresh_customer_referral_eligibility(uuid) from public, anon, authenticated;
revoke execute on function private.submit_customer_referral(text, text, text, text, text) from public, anon, authenticated;
revoke execute on function private.submit_leak_audit(text, text, text, text, integer, integer, integer, integer, integer, integer, integer, numeric, numeric, jsonb, jsonb) from public, anon, authenticated;
revoke execute on function private.submit_leak_audit_attributed(text, text, text, text, integer, integer, integer, integer, integer, integer, integer, numeric, numeric, jsonb, jsonb, text, text, text, text, text, text, text, text) from public, anon, authenticated;

grant execute on function private.approve_customer_referral_reward(uuid, boolean, text) to authenticated, service_role;
grant execute on function private.create_customer_referral_code(uuid, text, text) to authenticated, service_role;
grant execute on function private.get_paid_optimization_snapshot(text, text, date, date) to authenticated, service_role;
grant execute on function private.mark_customer_referral_credit_applied(uuid, text) to authenticated, service_role;
grant execute on function private.mark_referral_new_customer_benefit_fulfilled(uuid) to authenticated, service_role;
grant execute on function private.refresh_customer_referral_eligibility(uuid) to authenticated, service_role;
grant execute on function private.submit_customer_referral(text, text, text, text, text) to anon, authenticated, service_role;
grant execute on function private.submit_leak_audit(text, text, text, text, integer, integer, integer, integer, integer, integer, integer, numeric, numeric, jsonb, jsonb) to anon, authenticated, service_role;
grant execute on function private.submit_leak_audit_attributed(text, text, text, text, integer, integer, integer, integer, integer, integer, integer, numeric, numeric, jsonb, jsonb, text, text, text, text, text, text, text, text) to anon, authenticated, service_role;

-- Exposed API wrappers remain SECURITY INVOKER and delegate to the private implementations.
create function public.approve_customer_referral_reward(p_referral_id uuid, p_discount_conflict_cleared boolean, p_notes text default null) returns jsonb language sql security invoker set search_path = '' as $$ select private.approve_customer_referral_reward(p_referral_id, p_discount_conflict_cleared, p_notes) $$;
create function public.create_customer_referral_code(p_referrer_organization_id uuid, p_eligibility_basis text, p_eligibility_evidence text) returns text language sql security invoker set search_path = '' as $$ select private.create_customer_referral_code(p_referrer_organization_id, p_eligibility_basis, p_eligibility_evidence) $$;
create function public.get_paid_optimization_snapshot(p_channel text, p_campaign_key text, p_period_start date, p_period_end date) returns jsonb language sql security invoker set search_path = '' as $$ select private.get_paid_optimization_snapshot(p_channel, p_campaign_key, p_period_start, p_period_end) $$;
create function public.mark_customer_referral_credit_applied(p_referral_id uuid, p_reference text) returns void language sql security invoker set search_path = '' as $$ select private.mark_customer_referral_credit_applied(p_referral_id, p_reference) $$;
create function public.mark_referral_new_customer_benefit_fulfilled(p_referral_id uuid) returns void language sql security invoker set search_path = '' as $$ select private.mark_referral_new_customer_benefit_fulfilled(p_referral_id) $$;
create function public.refresh_customer_referral_eligibility(p_referral_id uuid) returns jsonb language sql security invoker set search_path = '' as $$ select private.refresh_customer_referral_eligibility(p_referral_id) $$;
create function public.submit_customer_referral(p_code text, p_name text, p_company text, p_email text, p_phone text default null) returns jsonb language sql security invoker set search_path = '' as $$ select private.submit_customer_referral(p_code, p_name, p_company, p_email, p_phone) $$;
create function public.submit_leak_audit(p_company text, p_contact_name text, p_contact_email text, p_source_filename text, p_row_count integer, p_score integer, p_unowned_count integer, p_no_next_step_count integer, p_overdue_followup_count integer, p_high_intent_inactive_count integer, p_reactivation_candidate_count integer, p_median_age_days numeric, p_median_first_response_minutes numeric, p_stage_distribution jsonb, p_metric_snapshot jsonb) returns uuid language sql security invoker set search_path = '' as $$ select private.submit_leak_audit(p_company, p_contact_name, p_contact_email, p_source_filename, p_row_count, p_score, p_unowned_count, p_no_next_step_count, p_overdue_followup_count, p_high_intent_inactive_count, p_reactivation_candidate_count, p_median_age_days, p_median_first_response_minutes, p_stage_distribution, p_metric_snapshot) $$;
create function public.submit_leak_audit_attributed(p_company text, p_contact_name text, p_contact_email text, p_source_filename text, p_row_count integer, p_score integer, p_unowned_count integer, p_no_next_step_count integer, p_overdue_followup_count integer, p_high_intent_inactive_count integer, p_reactivation_candidate_count integer, p_median_age_days numeric, p_median_first_response_minutes numeric, p_stage_distribution jsonb, p_metric_snapshot jsonb, p_attribution_source text default null, p_attribution_medium text default null, p_attribution_campaign text default null, p_attribution_term text default null, p_attribution_content text default null, p_attribution_gclid text default null, p_attribution_fbclid text default null, p_attribution_landing_path text default null) returns uuid language sql security invoker set search_path = '' as $$ select private.submit_leak_audit_attributed(p_company, p_contact_name, p_contact_email, p_source_filename, p_row_count, p_score, p_unowned_count, p_no_next_step_count, p_overdue_followup_count, p_high_intent_inactive_count, p_reactivation_candidate_count, p_median_age_days, p_median_first_response_minutes, p_stage_distribution, p_metric_snapshot, p_attribution_source, p_attribution_medium, p_attribution_campaign, p_attribution_term, p_attribution_content, p_attribution_gclid, p_attribution_fbclid, p_attribution_landing_path) $$;

-- Explicit API grants on the invoker wrappers.
revoke execute on function public.approve_customer_referral_reward(uuid, boolean, text) from public, anon;
revoke execute on function public.create_customer_referral_code(uuid, text, text) from public, anon;
revoke execute on function public.get_paid_optimization_snapshot(text, text, date, date) from public, anon;
revoke execute on function public.mark_customer_referral_credit_applied(uuid, text) from public, anon;
revoke execute on function public.mark_referral_new_customer_benefit_fulfilled(uuid) from public, anon;
revoke execute on function public.refresh_customer_referral_eligibility(uuid) from public, anon;
revoke execute on function public.submit_customer_referral(text, text, text, text, text) from public;
revoke execute on function public.submit_leak_audit(text, text, text, text, integer, integer, integer, integer, integer, integer, integer, numeric, numeric, jsonb, jsonb) from public;
revoke execute on function public.submit_leak_audit_attributed(text, text, text, text, integer, integer, integer, integer, integer, integer, integer, numeric, numeric, jsonb, jsonb, text, text, text, text, text, text, text, text) from public;

grant execute on function public.approve_customer_referral_reward(uuid, boolean, text) to authenticated, service_role;
grant execute on function public.create_customer_referral_code(uuid, text, text) to authenticated, service_role;
grant execute on function public.get_paid_optimization_snapshot(text, text, date, date) to authenticated, service_role;
grant execute on function public.mark_customer_referral_credit_applied(uuid, text) to authenticated, service_role;
grant execute on function public.mark_referral_new_customer_benefit_fulfilled(uuid) to authenticated, service_role;
grant execute on function public.refresh_customer_referral_eligibility(uuid) to authenticated, service_role;
grant execute on function public.submit_customer_referral(text, text, text, text, text) to anon, authenticated, service_role;
grant execute on function public.submit_leak_audit(text, text, text, text, integer, integer, integer, integer, integer, integer, integer, numeric, numeric, jsonb, jsonb) to anon, authenticated, service_role;
grant execute on function public.submit_leak_audit_attributed(text, text, text, text, integer, integer, integer, integer, integer, integer, integer, numeric, numeric, jsonb, jsonb, text, text, text, text, text, text, text, text) to anon, authenticated, service_role;
