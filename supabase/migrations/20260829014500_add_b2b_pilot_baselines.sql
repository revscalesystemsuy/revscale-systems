create table if not exists public.b2b_pilot_baselines (
  id uuid primary key default gen_random_uuid(),
  opportunity_id uuid not null unique references public.b2b_opportunities(id) on delete cascade,
  onboarding_plan_id uuid references public.b2b_onboarding_plans(id) on delete set null,
  pilot_agreement_id uuid references public.b2b_pilot_agreements(id) on delete set null,
  created_by uuid not null,
  status text not null default 'DRAFT' check (status in ('DRAFT','LOCKED')),
  dataset_reference text,
  captured_at timestamptz,
  active_leads_count integer check (active_leads_count is null or active_leads_count >= 0),
  source_count integer check (source_count is null or source_count >= 0),
  unowned_leads_count integer check (unowned_leads_count is null or unowned_leads_count >= 0),
  no_next_step_count integer check (no_next_step_count is null or no_next_step_count >= 0),
  overdue_followups_count integer check (overdue_followups_count is null or overdue_followups_count >= 0),
  high_intent_inactive_count integer check (high_intent_inactive_count is null or high_intent_inactive_count >= 0),
  median_first_response_minutes numeric check (median_first_response_minutes is null or median_first_response_minutes >= 0),
  reactivation_candidates_count integer check (reactivation_candidates_count is null or reactivation_candidates_count >= 0),
  stage_distribution jsonb not null default '{}'::jsonb,
  source_distribution jsonb not null default '{}'::jsonb,
  decision_metric_baselines jsonb not null default '[]'::jsonb,
  process_notes text,
  evidence_notes text,
  locked_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (jsonb_typeof(stage_distribution) = 'object'),
  check (jsonb_typeof(source_distribution) = 'object'),
  check (jsonb_typeof(decision_metric_baselines) = 'array')
);

create index if not exists b2b_pilot_baselines_status_idx
  on public.b2b_pilot_baselines(status, updated_at desc);

alter table public.b2b_pilot_baselines enable row level security;

drop policy if exists "platform admins can view b2b pilot baselines" on public.b2b_pilot_baselines;
create policy "platform admins can view b2b pilot baselines"
  on public.b2b_pilot_baselines for select
  using (exists (select 1 from public.platform_admins pa where pa.user_id = (select auth.uid())));

drop policy if exists "platform admins can insert b2b pilot baselines" on public.b2b_pilot_baselines;
create policy "platform admins can insert b2b pilot baselines"
  on public.b2b_pilot_baselines for insert
  with check (
    created_by = (select auth.uid())
    and exists (select 1 from public.platform_admins pa where pa.user_id = (select auth.uid()))
  );

drop policy if exists "platform admins can update b2b pilot baselines" on public.b2b_pilot_baselines;
create policy "platform admins can update b2b pilot baselines"
  on public.b2b_pilot_baselines for update
  using (exists (select 1 from public.platform_admins pa where pa.user_id = (select auth.uid())))
  with check (exists (select 1 from public.platform_admins pa where pa.user_id = (select auth.uid())));
