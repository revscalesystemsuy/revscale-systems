create table if not exists public.b2b_pilot_reports (
  id uuid primary key default gen_random_uuid(),
  opportunity_id uuid not null references public.b2b_opportunities(id) on delete cascade,
  baseline_id uuid not null references public.b2b_pilot_baselines(id) on delete cascade,
  measurement_id uuid not null references public.b2b_before_after_measurements(id) on delete cascade,
  activation_score_id uuid references public.b2b_activation_scores(id) on delete set null,
  created_by uuid not null,
  report_day integer not null check (report_day in (30,45)),
  status text not null default 'DRAFT' check (status in ('DRAFT','FINAL')),
  executive_summary text not null default '',
  intervention_summary text not null default '',
  observed_outcomes text not null default '',
  attribution_notes text not null default '',
  limitations text not null default '',
  recommendation text not null default '',
  core_metric_snapshot jsonb not null default '[]'::jsonb,
  decision_metric_snapshot jsonb not null default '[]'::jsonb,
  activation_snapshot jsonb not null default '{}'::jsonb,
  weekly_review_snapshot jsonb not null default '{}'::jsonb,
  guarantee_criteria jsonb not null default '[]'::jsonb,
  guarantee_result text not null default 'PENDING' check (guarantee_result in ('PENDING','MET','NOT_MET')),
  guarantee_notes text,
  finalized_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (jsonb_typeof(core_metric_snapshot) = 'array'),
  check (jsonb_typeof(decision_metric_snapshot) = 'array'),
  check (jsonb_typeof(activation_snapshot) = 'object'),
  check (jsonb_typeof(weekly_review_snapshot) = 'object'),
  check (jsonb_typeof(guarantee_criteria) = 'array')
);

create unique index if not exists b2b_pilot_reports_day_idx on public.b2b_pilot_reports(opportunity_id, report_day);
create index if not exists b2b_pilot_reports_status_idx on public.b2b_pilot_reports(status, report_day, updated_at desc);

alter table public.b2b_pilot_reports enable row level security;

drop policy if exists "platform admins can view b2b pilot reports" on public.b2b_pilot_reports;
create policy "platform admins can view b2b pilot reports" on public.b2b_pilot_reports for select using (exists (select 1 from public.platform_admins pa where pa.user_id = (select auth.uid())));

drop policy if exists "platform admins can insert b2b pilot reports" on public.b2b_pilot_reports;
create policy "platform admins can insert b2b pilot reports" on public.b2b_pilot_reports for insert with check (created_by = (select auth.uid()) and exists (select 1 from public.platform_admins pa where pa.user_id = (select auth.uid())));

drop policy if exists "platform admins can update b2b pilot reports" on public.b2b_pilot_reports;
create policy "platform admins can update b2b pilot reports" on public.b2b_pilot_reports for update using (exists (select 1 from public.platform_admins pa where pa.user_id = (select auth.uid()))) with check (exists (select 1 from public.platform_admins pa where pa.user_id = (select auth.uid())));
