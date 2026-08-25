revoke all on table public.latest_interaction_by_lead from public;
revoke all on table public.latest_interaction_by_lead from anon;
grant select on table public.latest_interaction_by_lead to authenticated;
grant select on table public.latest_interaction_by_lead to service_role;
