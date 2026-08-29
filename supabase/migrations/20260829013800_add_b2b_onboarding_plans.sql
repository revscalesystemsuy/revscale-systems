create table if not exists public.b2b_onboarding_plans (
  id uuid primary key default gen_random_uuid(),
  opportunity_id uuid not null unique references public.b2b_opportunities(id) on delete cascade,
  pilot_agreement_id uuid references public.b2b_pilot_agreements(id) on delete set null,
  created_by uuid not null,
  status text not null default 'NOT_STARTED' check (status in ('NOT_STARTED','IN_PROGRESS','COMPLETED','BLOCKED')),
  sponsor_name text,
  sponsor_role text,
  champion_name text,
  champion_role text,
  kickoff_at timestamptz,
  target_complete_date date,
  baseline_notes text,
  integration_notes text,
  risks text,
  business_review_cadence text,
  day0_complete boolean not null default false,
  day1_complete boolean not null default false,
  day2_complete boolean not null default false,
  day3_complete boolean not null default false,
  day4_complete boolean not null default false,
  day5_complete boolean not null default false,
  day6_complete boolean not null default false,
  day7_complete boolean not null default false,
  aha_opportunities text[] not null default '{}',
  weekly_routine_committed boolean not null default false,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists b2b_onboarding_plans_status_idx
  on public.b2b_onboarding_plans(status, updated_at desc);

alter table public.b2b_onboarding_plans enable row level security;

drop policy if exists "platform admins can view b2b onboarding plans" on public.b2b_onboarding_plans;
create policy "platform admins can view b2b onboarding plans"
  on public.b2b_onboarding_plans for select
  using (exists (select 1 from public.platform_admins pa where pa.user_id = (select auth.uid())));

drop policy if exists "platform admins can insert b2b onboarding plans" on public.b2b_onboarding_plans;
create policy "platform admins can insert b2b onboarding plans"
  on public.b2b_onboarding_plans for insert
  with check (
    created_by = (select auth.uid())
    and exists (select 1 from public.platform_admins pa where pa.user_id = (select auth.uid()))
  );

drop policy if exists "platform admins can update b2b onboarding plans" on public.b2b_onboarding_plans;
create policy "platform admins can update b2b onboarding plans"
  on public.b2b_onboarding_plans for update
  using (exists (select 1 from public.platform_admins pa where pa.user_id = (select auth.uid())))
  with check (exists (select 1 from public.platform_admins pa where pa.user_id = (select auth.uid())));
