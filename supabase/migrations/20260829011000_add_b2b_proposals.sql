create table if not exists public.b2b_proposals (
  id uuid primary key default gen_random_uuid(),
  opportunity_id uuid not null references public.b2b_opportunities(id) on delete cascade,
  discovery_session_id uuid references public.b2b_discovery_sessions(id) on delete set null,
  created_by uuid not null,
  status text not null default 'DRAFT' check (status in ('DRAFT','READY','SENT','ACCEPTED','DECLINED')),
  observed_facts text[] not null default '{}',
  process_change text,
  implementation_plan text,
  measurement_plan text,
  decision_metrics text[] not null default '{}',
  plan_name text not null default 'PROFESSIONAL' check (plan_name in ('STARTER','PROFESSIONAL','ENTERPRISE')),
  billing_cycle text not null default 'MONTHLY' check (billing_cycle in ('MONTHLY','ANNUAL')),
  quoted_price_usd integer not null default 249 check (quoted_price_usd >= 0),
  pilot_days integer not null default 45 check (pilot_days > 0),
  onboarding_days integer not null default 7 check (onboarding_days > 0),
  onboarding_waived boolean not null default true,
  activation_guarantee boolean not null default true,
  long_term_contract_required boolean not null default false,
  founding_price_used boolean not null default false,
  founding_price_usd integer check (founding_price_usd is null or founding_price_usd >= 0),
  commercial_notes text,
  sent_at timestamptz,
  accepted_at timestamptz,
  declined_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists b2b_proposals_opportunity_idx
  on public.b2b_proposals(opportunity_id, created_at desc);

create unique index if not exists b2b_proposals_one_active_idx
  on public.b2b_proposals(opportunity_id)
  where status in ('DRAFT','READY','SENT');

alter table public.b2b_proposals enable row level security;

drop policy if exists "platform admins can view b2b proposals" on public.b2b_proposals;
create policy "platform admins can view b2b proposals"
  on public.b2b_proposals for select
  using (exists (select 1 from public.platform_admins pa where pa.user_id = (select auth.uid())));

drop policy if exists "platform admins can insert b2b proposals" on public.b2b_proposals;
create policy "platform admins can insert b2b proposals"
  on public.b2b_proposals for insert
  with check (
    created_by = (select auth.uid())
    and exists (select 1 from public.platform_admins pa where pa.user_id = (select auth.uid()))
  );

drop policy if exists "platform admins can update b2b proposals" on public.b2b_proposals;
create policy "platform admins can update b2b proposals"
  on public.b2b_proposals for update
  using (exists (select 1 from public.platform_admins pa where pa.user_id = (select auth.uid())))
  with check (exists (select 1 from public.platform_admins pa where pa.user_id = (select auth.uid())));

drop policy if exists "platform admins can delete b2b proposals" on public.b2b_proposals;
create policy "platform admins can delete b2b proposals"
  on public.b2b_proposals for delete
  using (exists (select 1 from public.platform_admins pa where pa.user_id = (select auth.uid())));
