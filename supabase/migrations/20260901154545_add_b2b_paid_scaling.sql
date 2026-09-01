create table if not exists public.b2b_paid_scaling_decisions (
  id uuid primary key default gen_random_uuid(),
  channel text not null check (channel in ('GOOGLE_SEARCH','META_RETARGETING')),
  campaign_key text not null,
  review_id uuid references public.b2b_paid_optimization_reviews(id) on delete set null,
  review_period_start date,
  review_period_end date,
  current_daily_budget_usd numeric check (current_daily_budget_usd is null or current_daily_budget_usd >= 0),
  proposed_daily_budget_usd numeric check (proposed_daily_budget_usd is null or proposed_daily_budget_usd >= 0),
  verified_paid_customers integer not null default 0 check (verified_paid_customers >= 0),
  ready_case_studies integer not null default 0 check (ready_case_studies >= 0),
  qualified_demo_count integer not null default 0 check (qualified_demo_count >= 0),
  cost_per_qualified_demo_usd numeric check (cost_per_qualified_demo_usd is null or cost_per_qualified_demo_usd >= 0),
  expected_first_year_gross_profit_usd numeric check (expected_first_year_gross_profit_usd is null or expected_first_year_gross_profit_usd > 0),
  cpqd_to_gross_profit_ratio numeric check (cpqd_to_gross_profit_ratio is null or cpqd_to_gross_profit_ratio >= 0),
  traffic_quality text check (traffic_quality is null or traffic_quality in ('UNKNOWN','CLEAN','MIXED','NON_ICP')),
  over_cap_streak_reviews integer not null default 0 check (over_cap_streak_reviews >= 0),
  volume_sufficiency_confirmed boolean not null default false,
  volume_evidence text,
  verdict text not null check (verdict in ('BLOCKED_FOUNDATION','BLOCKED_PROOF','BLOCKED_SIGNAL','BLOCKED_ECONOMICS','HOLD','READY_TO_SCALE')),
  reason text not null,
  evidence_snapshot jsonb not null default '{}'::jsonb check (jsonb_typeof(evidence_snapshot) = 'object'),
  manual_ads_change_required boolean not null default true check (manual_ads_change_required is true),
  created_by uuid not null,
  created_at timestamptz not null default now(),
  check (review_period_start is null or review_period_end is null or review_period_end >= review_period_start),
  check (proposed_daily_budget_usd is null or current_daily_budget_usd is null or proposed_daily_budget_usd > current_daily_budget_usd)
);

comment on table public.b2b_paid_scaling_decisions is 'Paso 81 audit trail. Records readiness decisions only; it never changes Google or Meta budgets automatically.';

create index if not exists b2b_paid_scaling_decisions_campaign_idx
  on public.b2b_paid_scaling_decisions(channel, campaign_key, created_at desc);

alter table public.b2b_paid_scaling_decisions enable row level security;
revoke all on table public.b2b_paid_scaling_decisions from anon, authenticated;
grant select, insert on table public.b2b_paid_scaling_decisions to authenticated;

drop policy if exists "platform admins can view paid scaling decisions" on public.b2b_paid_scaling_decisions;
create policy "platform admins can view paid scaling decisions"
  on public.b2b_paid_scaling_decisions
  for select
  to authenticated
  using (exists (
    select 1 from public.platform_admins pa
    where pa.user_id = (select auth.uid())
  ));

drop policy if exists "platform admins can insert paid scaling decisions" on public.b2b_paid_scaling_decisions;
create policy "platform admins can insert paid scaling decisions"
  on public.b2b_paid_scaling_decisions
  for insert
  to authenticated
  with check (
    created_by = (select auth.uid())
    and exists (
      select 1 from public.platform_admins pa
      where pa.user_id = (select auth.uid())
    )
  );
