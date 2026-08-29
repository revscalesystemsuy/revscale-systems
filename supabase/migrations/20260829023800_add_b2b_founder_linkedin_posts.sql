create table if not exists public.b2b_founder_linkedin_posts (
  id uuid primary key default gen_random_uuid(),
  created_by uuid not null,
  day_number integer not null unique check (day_number between 1 and 30),
  theme text not null,
  format text not null check (format in ('TEXT','CAROUSEL','VIDEO','POLL','DOCUMENT','GRAPHIC','NETWORKING','PARTNERSHIPS','DATA')),
  pillar text not null,
  status text not null default 'PLANNED' check (status in ('PLANNED','DRAFT','READY','BLOCKED','PUBLISHED','COMPLETED','SKIPPED')),
  post_copy text not null default '',
  asset_brief text not null default '',
  cta text not null default '',
  requires_evidence boolean not null default false,
  evidence_requirement text,
  evidence_reference text,
  scheduled_for date,
  published_at timestamptz,
  linkedin_url text,
  icp_conversations integer not null default 0 check (icp_conversations >= 0),
  owner_manager_interactions integer not null default 0 check (owner_manager_interactions >= 0),
  demos_influenced integer not null default 0 check (demos_influenced >= 0),
  referrals integer not null default 0 check (referrals >= 0),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists b2b_founder_linkedin_status_idx on public.b2b_founder_linkedin_posts(status, day_number);
alter table public.b2b_founder_linkedin_posts enable row level security;
drop policy if exists "platform admins can view founder linkedin posts" on public.b2b_founder_linkedin_posts;
create policy "platform admins can view founder linkedin posts" on public.b2b_founder_linkedin_posts for select using (exists (select 1 from public.platform_admins pa where pa.user_id = (select auth.uid())));
drop policy if exists "platform admins can insert founder linkedin posts" on public.b2b_founder_linkedin_posts;
create policy "platform admins can insert founder linkedin posts" on public.b2b_founder_linkedin_posts for insert with check (created_by = (select auth.uid()) and exists (select 1 from public.platform_admins pa where pa.user_id = (select auth.uid())));
drop policy if exists "platform admins can update founder linkedin posts" on public.b2b_founder_linkedin_posts;
create policy "platform admins can update founder linkedin posts" on public.b2b_founder_linkedin_posts for update using (exists (select 1 from public.platform_admins pa where pa.user_id = (select auth.uid()))) with check (exists (select 1 from public.platform_admins pa where pa.user_id = (select auth.uid())));