create table if not exists public.b2b_weekly_reviews (
  id uuid primary key default gen_random_uuid(),
  opportunity_id uuid not null references public.b2b_opportunities(id) on delete cascade,
  activation_score_id uuid references public.b2b_activation_scores(id) on delete set null,
  created_by uuid not null,
  reviewed_at timestamptz not null default now(),
  review_week date not null,
  activation_score integer check (activation_score is null or (activation_score >= 0 and activation_score <= 100)),
  owner_next_step_pct numeric check (owner_next_step_pct is null or (owner_next_step_pct >= 0 and owner_next_step_pct <= 100)),
  today_usage_days integer check (today_usage_days is null or (today_usage_days >= 0 and today_usage_days <= 5)),
  overdue_followups_count integer check (overdue_followups_count is null or overdue_followups_count >= 0),
  blocked_items text,
  wins text,
  product_learning text,
  decision_next_week text not null,
  decision_owner text not null,
  decision_due_at timestamptz not null,
  sponsor_present boolean not null default false,
  evidence_notes text not null,
  created_at timestamptz not null default now()
);

create unique index if not exists b2b_weekly_reviews_one_per_week_idx
  on public.b2b_weekly_reviews(opportunity_id, review_week);
create index if not exists b2b_weekly_reviews_recent_idx
  on public.b2b_weekly_reviews(opportunity_id, reviewed_at desc);

alter table public.b2b_weekly_reviews enable row level security;

drop policy if exists "platform admins can view b2b weekly reviews" on public.b2b_weekly_reviews;
create policy "platform admins can view b2b weekly reviews"
  on public.b2b_weekly_reviews for select
  using (exists (select 1 from public.platform_admins pa where pa.user_id = (select auth.uid())));

drop policy if exists "platform admins can insert b2b weekly reviews" on public.b2b_weekly_reviews;
create policy "platform admins can insert b2b weekly reviews"
  on public.b2b_weekly_reviews for insert
  with check (
    created_by = (select auth.uid())
    and exists (select 1 from public.platform_admins pa where pa.user_id = (select auth.uid()))
  );
