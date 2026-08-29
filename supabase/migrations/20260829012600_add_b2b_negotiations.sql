create table if not exists public.b2b_negotiations (
  id uuid primary key default gen_random_uuid(),
  opportunity_id uuid not null references public.b2b_opportunities(id) on delete cascade,
  proposal_id uuid references public.b2b_proposals(id) on delete set null,
  pilot_agreement_id uuid references public.b2b_pilot_agreements(id) on delete set null,
  created_by uuid not null,
  status text not null default 'OPEN' check (status in ('OPEN','AGREED','WALK_AWAY')),
  objection_type text,
  objection_detail text,
  concession_type text check (concession_type is null or concession_type in ('NONE','ONBOARDING_WAIVED','PILOT_EXTENSION','ANNUAL_TWO_MONTHS_FREE','FOUNDING_PRICE','REDUCED_SCOPE')),
  concession_detail text,
  give_get text,
  revised_price_usd integer check (revised_price_usd is null or revised_price_usd >= 0),
  revised_pilot_days integer check (revised_pilot_days is null or revised_pilot_days > 0),
  revised_scope text,
  next_step text,
  next_step_due_at timestamptz,
  agreed_at timestamptz,
  walk_away_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists b2b_negotiations_opportunity_idx on public.b2b_negotiations(opportunity_id, created_at desc);
alter table public.b2b_negotiations enable row level security;
drop policy if exists "platform admins can view b2b negotiations" on public.b2b_negotiations;
create policy "platform admins can view b2b negotiations" on public.b2b_negotiations for select using (exists (select 1 from public.platform_admins pa where pa.user_id = (select auth.uid())));
drop policy if exists "platform admins can insert b2b negotiations" on public.b2b_negotiations;
create policy "platform admins can insert b2b negotiations" on public.b2b_negotiations for insert with check (created_by = (select auth.uid()) and exists (select 1 from public.platform_admins pa where pa.user_id = (select auth.uid())));
drop policy if exists "platform admins can update b2b negotiations" on public.b2b_negotiations;
create policy "platform admins can update b2b negotiations" on public.b2b_negotiations for update using (exists (select 1 from public.platform_admins pa where pa.user_id = (select auth.uid()))) with check (exists (select 1 from public.platform_admins pa where pa.user_id = (select auth.uid())));