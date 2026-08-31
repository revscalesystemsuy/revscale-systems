create table if not exists public.b2b_testimonials (
  id uuid primary key default gen_random_uuid(),
  opportunity_id uuid not null unique references public.b2b_opportunities(id) on delete cascade,
  pilot_report_id uuid not null references public.b2b_pilot_reports(id) on delete restrict,
  created_by uuid not null,
  status text not null default 'ELIGIBLE' check (status in ('ELIGIBLE','REQUESTED','RECEIVED','APPROVED','DECLINED','REVOKED')),
  requested_at timestamptz,
  request_channel text,
  request_copy text,
  respondent_name text,
  respondent_role text,
  testimonial_text text,
  specific_outcome_reference text,
  company_name_consent boolean not null default false,
  person_name_consent boolean not null default false,
  role_consent boolean not null default false,
  logo_consent boolean not null default false,
  metrics_consent boolean not null default false,
  quote_consent boolean not null default false,
  anonymized_metrics_consent boolean not null default false,
  consent_evidence text,
  consent_recorded_at timestamptz,
  approved_copy text,
  approved_at timestamptz,
  declined_at timestamptz,
  revoked_at timestamptz,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists b2b_testimonials_status_idx on public.b2b_testimonials(status, updated_at desc);

alter table public.b2b_testimonials enable row level security;

drop policy if exists "platform admins can view b2b testimonials" on public.b2b_testimonials;
create policy "platform admins can view b2b testimonials" on public.b2b_testimonials for select using (exists (select 1 from public.platform_admins pa where pa.user_id = (select auth.uid())));

drop policy if exists "platform admins can insert b2b testimonials" on public.b2b_testimonials;
create policy "platform admins can insert b2b testimonials" on public.b2b_testimonials for insert with check (created_by = (select auth.uid()) and exists (select 1 from public.platform_admins pa where pa.user_id = (select auth.uid())));

drop policy if exists "platform admins can update b2b testimonials" on public.b2b_testimonials;
create policy "platform admins can update b2b testimonials" on public.b2b_testimonials for update using (exists (select 1 from public.platform_admins pa where pa.user_id = (select auth.uid()))) with check (exists (select 1 from public.platform_admins pa where pa.user_id = (select auth.uid())));
