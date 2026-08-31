create table if not exists public.b2b_social_proof_publications (
  id uuid primary key default gen_random_uuid(),
  opportunity_id uuid not null references public.b2b_opportunities(id) on delete cascade,
  case_study_id uuid not null references public.b2b_case_studies(id) on delete restrict,
  testimonial_id uuid not null references public.b2b_testimonials(id) on delete restrict,
  created_by uuid not null,
  status text not null default 'DRAFT' check (status in ('DRAFT','APPROVED','PUBLISHED','WITHDRAWN')),
  channel text not null check (channel in ('WEBSITE','SALES_DECK','LINKEDIN','EMAIL','PROPOSAL','OTHER')),
  asset_type text not null check (asset_type in ('CASE_STUDY','QUOTE','METRIC_CARD','MINI_CASE','SCREENSHOT')),
  placement text not null,
  publication_copy text not null default '',
  uses_company_name boolean not null default false,
  uses_person_name boolean not null default false,
  uses_role boolean not null default false,
  uses_logo boolean not null default false,
  uses_metrics boolean not null default false,
  uses_quote boolean not null default false,
  asset_references text[] not null default '{}',
  evidence_references text[] not null default '{}',
  consent_snapshot jsonb not null default '{}'::jsonb,
  approval_notes text not null default '',
  external_reference text,
  approved_at timestamptz,
  published_at timestamptz,
  withdrawn_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (jsonb_typeof(consent_snapshot) = 'object')
);
create index if not exists b2b_social_proof_status_idx on public.b2b_social_proof_publications(status, updated_at desc);
create index if not exists b2b_social_proof_case_idx on public.b2b_social_proof_publications(case_study_id, channel);
alter table public.b2b_social_proof_publications enable row level security;
drop policy if exists "platform admins can view b2b social proof" on public.b2b_social_proof_publications;
create policy "platform admins can view b2b social proof" on public.b2b_social_proof_publications for select using (exists (select 1 from public.platform_admins pa where pa.user_id = (select auth.uid())));
drop policy if exists "platform admins can insert b2b social proof" on public.b2b_social_proof_publications;
create policy "platform admins can insert b2b social proof" on public.b2b_social_proof_publications for insert with check (created_by = (select auth.uid()) and exists (select 1 from public.platform_admins pa where pa.user_id = (select auth.uid())));
drop policy if exists "platform admins can update b2b social proof" on public.b2b_social_proof_publications;
create policy "platform admins can update b2b social proof" on public.b2b_social_proof_publications for update using (exists (select 1 from public.platform_admins pa where pa.user_id = (select auth.uid()))) with check (exists (select 1 from public.platform_admins pa where pa.user_id = (select auth.uid())));