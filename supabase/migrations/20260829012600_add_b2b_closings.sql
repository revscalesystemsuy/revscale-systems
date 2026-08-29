create table if not exists public.b2b_closings (
  id uuid primary key default gen_random_uuid(),
  opportunity_id uuid not null unique references public.b2b_opportunities(id) on delete cascade,
  proposal_id uuid references public.b2b_proposals(id) on delete set null,
  pilot_agreement_id uuid references public.b2b_pilot_agreements(id) on delete set null,
  negotiation_id uuid references public.b2b_negotiations(id) on delete set null,
  created_by uuid not null,
  status text not null default 'PREPARED' check (status in ('PREPARED','COMMERCIAL_ACCEPTED','PAYMENT_CONFIRMED','CANCELLED')),
  final_plan_name text not null default 'PROFESSIONAL' check (final_plan_name in ('STARTER','PROFESSIONAL','ENTERPRISE')),
  final_billing_cycle text not null default 'MONTHLY' check (final_billing_cycle in ('MONTHLY','ANNUAL')),
  final_price_usd integer not null default 249 check (final_price_usd >= 0),
  final_pilot_days integer not null default 45 check (final_pilot_days > 0),
  accepted_by_name text,
  accepted_by_role text,
  acceptance_notes text,
  commercial_accepted_at timestamptz,
  payment_reference text,
  payment_notes text,
  payment_confirmed_at timestamptz,
  handoff_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists b2b_closings_status_idx
  on public.b2b_closings(status, updated_at desc);

alter table public.b2b_closings enable row level security;

drop policy if exists "platform admins can view b2b closings" on public.b2b_closings;
create policy "platform admins can view b2b closings"
  on public.b2b_closings for select
  using (exists (select 1 from public.platform_admins pa where pa.user_id = (select auth.uid())));

drop policy if exists "platform admins can insert b2b closings" on public.b2b_closings;
create policy "platform admins can insert b2b closings"
  on public.b2b_closings for insert
  with check (
    created_by = (select auth.uid())
    and exists (select 1 from public.platform_admins pa where pa.user_id = (select auth.uid()))
  );

drop policy if exists "platform admins can update b2b closings" on public.b2b_closings;
create policy "platform admins can update b2b closings"
  on public.b2b_closings for update
  using (exists (select 1 from public.platform_admins pa where pa.user_id = (select auth.uid())))
  with check (exists (select 1 from public.platform_admins pa where pa.user_id = (select auth.uid())));
