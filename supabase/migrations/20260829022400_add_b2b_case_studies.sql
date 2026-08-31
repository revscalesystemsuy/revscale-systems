create table if not exists public.b2b_case_studies (
  id uuid primary key default gen_random_uuid(),
  opportunity_id uuid not null unique references public.b2b_opportunities(id) on delete cascade,
  pilot_report_id uuid not null references public.b2b_pilot_reports(id) on delete restrict,
  testimonial_id uuid not null references public.b2b_testimonials(id) on delete restrict,
  created_by uuid not null,
  status text not null default 'DRAFT' check (status in ('DRAFT','READY','REVOKED')),
  visibility_mode text not null default 'ANONYMIZED' check (visibility_mode in ('IDENTIFIED','ANONYMIZED')),
  title text not null default '',
  situation text not null default '',
  finding text not null default '',
  intervention text not null default '',
  result_summary text not null default '',
  commercial_result text,
  attribution_notes text not null default '',
  limitations text not null default '',
  approved_quote text not null default '',
  company_display text,
  respondent_display text,
  metric_snapshot jsonb not null default '[]'::jsonb,
  consent_snapshot jsonb not null default '{}'::jsonb,
  screenshot_references text[] not null default '{}',
  evidence_references text[] not null default '{}',
  ready_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (jsonb_typeof(metric_snapshot) = 'array'),
  check (jsonb_typeof(consent_snapshot) = 'object')
);
create index if not exists b2b_case_studies_status_idx on public.b2b_case_studies(status, updated_at desc);
alter table public.b2b_case_studies enable row level security;
drop policy if exists "platform admins can view b2b case studies" on public.b2b_case_studies;
create policy "platform admins can view b2b case studies" on public.b2b_case_studies for select using (exists (select 1 from public.platform_admins pa where pa.user_id = (select auth.uid())));
drop policy if exists "platform admins can insert b2b case studies" on public.b2b_case_studies;
create policy "platform admins can insert b2b case studies" on public.b2b_case_studies for insert with check (created_by = (select auth.uid()) and exists (select 1 from public.platform_admins pa where pa.user_id = (select auth.uid())));
drop policy if exists "platform admins can update b2b case studies" on public.b2b_case_studies;
create policy "platform admins can update b2b case studies" on public.b2b_case_studies for update using (exists (select 1 from public.platform_admins pa where pa.user_id = (select auth.uid()))) with check (exists (select 1 from public.platform_admins pa where pa.user_id = (select auth.uid())));