create table if not exists public.b2b_partners (
  id uuid primary key default gen_random_uuid(),
  created_by uuid,
  partner_name text not null,
  category text not null check (category in ('CHAMBER','ASSOCIATION','AGENCY','CONSULTANT','WHATSAPP_META','PORTAL_INTEGRATOR','DEVELOPER','EVENT_EDUCATION','OTHER')),
  priority text not null default 'P2' check (priority in ('P1','P2','P3')),
  status text not null default 'RESEARCH' check (status in ('RESEARCH','QUALIFIED','READY','CONTACTED','MEETING','PROPOSAL','ACTIVE','PAUSED','NOT_FIT')),
  website text,
  source_url text,
  contact_name text,
  contact_role text,
  contact_email text,
  contact_phone text,
  linkedin_url text,
  why_fit text not null default '',
  audience_reach text not null default '',
  offer_angle text not null default 'Operación Comercial 360',
  workshop_offered boolean not null default true,
  leak_audit_offered boolean not null default true,
  cobranded_material_offered boolean not null default true,
  aggregate_report_offered boolean not null default true,
  priority_implementation_offered boolean not null default true,
  incentive_model text not null default 'NONE' check (incentive_model in ('NONE','PERCENT_FIRST_YEAR','FIXED_BOUNTY')),
  incentive_value numeric,
  qualified_referral_required boolean not null default true,
  payout_after_activation_second_month boolean not null default true,
  next_step text,
  next_step_due_at timestamptz,
  last_contacted_at timestamptz,
  meeting_at timestamptz,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(partner_name, category),
  check (incentive_value is null or incentive_value >= 0),
  check (incentive_model <> 'PERCENT_FIRST_YEAR' or incentive_value between 15 and 20)
);
create table if not exists public.b2b_partner_activities (
  id uuid primary key default gen_random_uuid(),
  partner_id uuid not null references public.b2b_partners(id) on delete cascade,
  created_by uuid,
  activity_type text not null check (activity_type in ('RESEARCH','EMAIL','LINKEDIN','WHATSAPP','CALL','MEETING','WORKSHOP','PROPOSAL','NOTE','STATUS_CHANGE')),
  summary text not null,
  occurred_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);
create index if not exists b2b_partners_status_idx on public.b2b_partners(status, priority, updated_at desc);
create index if not exists b2b_partners_category_idx on public.b2b_partners(category, priority);
create index if not exists b2b_partner_activities_partner_idx on public.b2b_partner_activities(partner_id, occurred_at desc);
alter table public.b2b_partners enable row level security;
alter table public.b2b_partner_activities enable row level security;
drop policy if exists "platform admins can view b2b partners" on public.b2b_partners;
create policy "platform admins can view b2b partners" on public.b2b_partners for select using (exists (select 1 from public.platform_admins pa where pa.user_id = (select auth.uid())));
drop policy if exists "platform admins can insert b2b partners" on public.b2b_partners;
create policy "platform admins can insert b2b partners" on public.b2b_partners for insert with check ((created_by = (select auth.uid()) or created_by is null) and exists (select 1 from public.platform_admins pa where pa.user_id = (select auth.uid())));
drop policy if exists "platform admins can update b2b partners" on public.b2b_partners;
create policy "platform admins can update b2b partners" on public.b2b_partners for update using (exists (select 1 from public.platform_admins pa where pa.user_id = (select auth.uid()))) with check (exists (select 1 from public.platform_admins pa where pa.user_id = (select auth.uid())));
drop policy if exists "platform admins can view partner activities" on public.b2b_partner_activities;
create policy "platform admins can view partner activities" on public.b2b_partner_activities for select using (exists (select 1 from public.platform_admins pa where pa.user_id = (select auth.uid())));
drop policy if exists "platform admins can insert partner activities" on public.b2b_partner_activities;
create policy "platform admins can insert partner activities" on public.b2b_partner_activities for insert with check ((created_by = (select auth.uid()) or created_by is null) and exists (select 1 from public.platform_admins pa where pa.user_id = (select auth.uid())));