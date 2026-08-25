create index if not exists interactions_org_lead_created_idx
  on public.interactions (organization_id, lead_id, created_at desc);

create or replace view public.latest_interaction_by_lead
with (security_invoker = true)
as
select distinct on (organization_id, lead_id)
  organization_id,
  lead_id,
  created_at as last_interaction_at
from public.interactions
order by organization_id, lead_id, created_at desc;

revoke all on table public.latest_interaction_by_lead from public;
revoke all on table public.latest_interaction_by_lead from anon;
grant select on table public.latest_interaction_by_lead to authenticated;
grant select on table public.latest_interaction_by_lead to service_role;

comment on view public.latest_interaction_by_lead is
  'Latest interaction timestamp per lead. security_invoker preserves underlying interactions RLS.';
