create table if not exists public.b2b_activation_scores (
  id uuid primary key default gen_random_uuid(),
  opportunity_id uuid not null references public.b2b_opportunities(id) on delete cascade,
  baseline_id uuid not null references public.b2b_pilot_baselines(id) on delete cascade,
  created_by uuid not null,
  evaluated_at timestamptz not null default now(),
  owner_next_step_pct numeric not null check (owner_next_step_pct >= 0 and owner_next_step_pct <= 100),
  today_usage_days integer not null check (today_usage_days >= 0 and today_usage_days <= 5),
  overdue_reviewed boolean not null default false,
  matches_alerts_processed boolean not null default false,
  manager_weekly_review boolean not null default false,
  data_sources_complete boolean not null default false,
  score_total integer not null check (score_total >= 0 and score_total <= 100),
  band text not null check (band in ('ACTIVATED','RISK','CRITICAL')),
  owner_next_step_evidence text,
  today_usage_evidence text,
  overdue_evidence text,
  matches_evidence text,
  manager_review_evidence text,
  data_quality_evidence text,
  notes text,
  created_at timestamptz not null default now()
);

create index if not exists b2b_activation_scores_opportunity_idx
  on public.b2b_activation_scores(opportunity_id, evaluated_at desc);
create index if not exists b2b_activation_scores_band_idx
  on public.b2b_activation_scores(band, evaluated_at desc);

alter table public.b2b_activation_scores enable row level security;

drop policy if exists "platform admins can view b2b activation scores" on public.b2b_activation_scores;
create policy "platform admins can view b2b activation scores"
  on public.b2b_activation_scores for select
  using (exists (select 1 from public.platform_admins pa where pa.user_id = (select auth.uid())));

drop policy if exists "platform admins can insert b2b activation scores" on public.b2b_activation_scores;
create policy "platform admins can insert b2b activation scores"
  on public.b2b_activation_scores for insert
  with check (
    created_by = (select auth.uid())
    and exists (select 1 from public.platform_admins pa where pa.user_id = (select auth.uid()))
  );
