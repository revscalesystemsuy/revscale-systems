create table if not exists public.b2b_revscale_content (
  id uuid primary key default gen_random_uuid(),
  created_by uuid not null,
  content_key text not null unique,
  title text not null,
  pillar text not null,
  channel text not null check (channel in ('LINKEDIN_PAGE','INSTAGRAM','WEBSITE_RESOURCE','SALES_REUSE','MULTI')),
  format text not null check (format in ('TEXT','CAROUSEL','GRAPHIC','DOCUMENT','RESOURCE')),
  purpose text not null check (purpose in ('CREDIBILITY','PRODUCT','EDUCATION','PROOF','RESOURCE')),
  status text not null default 'PLANNED' check (status in ('PLANNED','DRAFT','READY','BLOCKED','PUBLISHED','ARCHIVED')),
  post_copy text not null default '',
  asset_brief text not null default '',
  cta text not null default '',
  requires_evidence boolean not null default false,
  evidence_requirement text,
  evidence_reference text,
  source_strategy_ref text,
  published_at timestamptz,
  publication_url text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists b2b_revscale_content_status_idx on public.b2b_revscale_content(status, pillar);
create index if not exists b2b_revscale_content_channel_idx on public.b2b_revscale_content(channel, format);
alter table public.b2b_revscale_content enable row level security;
drop policy if exists "platform admins can view revscale content" on public.b2b_revscale_content;
create policy "platform admins can view revscale content" on public.b2b_revscale_content for select using (exists (select 1 from public.platform_admins pa where pa.user_id = (select auth.uid())));
drop policy if exists "platform admins can insert revscale content" on public.b2b_revscale_content;
create policy "platform admins can insert revscale content" on public.b2b_revscale_content for insert with check (created_by = (select auth.uid()) and exists (select 1 from public.platform_admins pa where pa.user_id = (select auth.uid())));
drop policy if exists "platform admins can update revscale content" on public.b2b_revscale_content;
create policy "platform admins can update revscale content" on public.b2b_revscale_content for update using (exists (select 1 from public.platform_admins pa where pa.user_id = (select auth.uid()))) with check (exists (select 1 from public.platform_admins pa where pa.user_id = (select auth.uid())));