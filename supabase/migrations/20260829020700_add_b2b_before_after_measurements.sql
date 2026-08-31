create table if not exists public.b2b_before_after_measurements (
  id uuid primary key default gen_random_uuid(),
  opportunity_id uuid not null references public.b2b_opportunities(id) on delete cascade,
  baseline_id uuid not null references public.b2b_pilot_baselines(id) on delete cascade,
  activation_score_id uuid references public.b2b_activation_scores(id) on delete set null,
  weekly_review_id uuid references public.b2b_weekly_reviews(id) on delete set null,
  created_by uuid not null,
  status text not null default 'DRAFT' check (status in ('DRAFT','LOCKED')),
  measurement_day integer not null check (measurement_day between 1 and 45),
  measured_at timestamptz not null,
  dataset_reference text not null,
  measurement_scope text not null,
  active_leads_count integer not null check (active_leads_count >= 0),
  source_count integer check (source_count is null or source_count >= 0),
  unowned_leads_count integer not null check (unowned_leads_count >= 0),
  no_next_step_count integer not null check (no_next_step_count >= 0),
  overdue_followups_count integer not null check (overdue_followups_count >= 0),
  high_intent_inactive_count integer check (high_intent_inactive_count is null or high_intent_inactive_count >= 0),
  median_first_response_minutes numeric check (median_first_response_minutes is null or median_first_response_minutes >= 0),
  reactivation_candidates_count integer check (reactivation_candidates_count is null or reactivation_candidates_count >= 0),
  reactivations_completed_count integer check (reactivations_completed_count is null or reactivations_completed_count >= 0),
  matches_processed_count integer check (matches_processed_count is null or matches_processed_count >= 0),
  opportunities_moved_count integer check (opportunities_moved_count is null or opportunities_moved_count >= 0),
  decision_metric_results jsonb not null default '[]'::jsonb,
  evidence_notes text not null,
  attribution_notes text not null,
  limitations text not null,
  locked_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (jsonb_typeof(decision_metric_results) = 'array')
);

create unique index if not exists b2b_before_after_measurements_day_idx on public.b2b_before_after_measurements(opportunity_id, measurement_day);
create index if not exists b2b_before_after_measurements_status_idx on public.b2b_before_after_measurements(status, measured_at desc);

alter table public.b2b_before_after_measurements enable row level security;

drop policy if exists "platform admins can view b2b before after measurements" on public.b2b_before_after_measurements;
create policy "platform admins can view b2b before after measurements" on public.b2b_before_after_measurements for select using (exists (select 1 from public.platform_admins pa where pa.user_id = (select auth.uid())));

drop policy if exists "platform admins can insert b2b before after measurements" on public.b2b_before_after_measurements;
create policy "platform admins can insert b2b before after measurements" on public.b2b_before_after_measurements for insert with check (created_by = (select auth.uid()) and exists (select 1 from public.platform_admins pa where pa.user_id = (select auth.uid())));

drop policy if exists "platform admins can update b2b before after measurements" on public.b2b_before_after_measurements;
create policy "platform admins can update b2b before after measurements" on public.b2b_before_after_measurements for update using (exists (select 1 from public.platform_admins pa where pa.user_id = (select auth.uid()))) with check (exists (select 1 from public.platform_admins pa where pa.user_id = (select auth.uid())));
