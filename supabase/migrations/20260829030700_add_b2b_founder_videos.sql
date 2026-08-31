create table if not exists public.b2b_founder_videos (
  id uuid primary key default gen_random_uuid(),
  video_key text not null unique,
  created_by uuid,
  origin text not null default 'SYSTEM_TEMPLATE' check (origin in ('SYSTEM_TEMPLATE','ADMIN')),
  title text not null,
  angle text not null,
  duration_seconds integer not null check (duration_seconds between 20 and 90),
  format text not null default '9:16' check (format in ('9:16','1:1','16:9')),
  delivery_style text not null check (delivery_style in ('TALKING_HEAD','TALKING_HEAD_SCREEN','WALK_AND_TALK')),
  hook text not null,
  script text not null,
  shot_list jsonb not null default '[]'::jsonb,
  on_screen_text jsonb not null default '[]'::jsonb,
  caption_copy text not null default '',
  cta text not null,
  status text not null default 'SCRIPT_READY' check (status in ('PLANNED','SCRIPT_READY','RECORDED','EDIT_READY','PUBLISHED','BLOCKED','ARCHIVED')),
  claim_mode text not null default 'NO_CLIENT_CLAIMS' check (claim_mode in ('NO_CLIENT_CLAIMS','DEMO_LABELED','REAL_AUTHORIZED')),
  evidence_requirement text,
  evidence_reference text,
  raw_video_reference text,
  edit_reference text,
  publication_url text,
  published_at timestamptz,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (jsonb_typeof(shot_list) = 'array'),
  check (jsonb_typeof(on_screen_text) = 'array'),
  check (claim_mode <> 'REAL_AUTHORIZED' or nullif(trim(coalesce(evidence_reference,'')), '') is not null),
  check (status <> 'PUBLISHED' or nullif(trim(coalesce(publication_url,'')), '') is not null)
);
create index if not exists b2b_founder_videos_status_idx on public.b2b_founder_videos(status, video_key);
alter table public.b2b_founder_videos enable row level security;
drop policy if exists "platform admins can view founder videos" on public.b2b_founder_videos;
create policy "platform admins can view founder videos" on public.b2b_founder_videos for select using (exists (select 1 from public.platform_admins pa where pa.user_id = (select auth.uid())));
drop policy if exists "platform admins can insert founder videos" on public.b2b_founder_videos;
create policy "platform admins can insert founder videos" on public.b2b_founder_videos for insert with check (created_by = (select auth.uid()) and exists (select 1 from public.platform_admins pa where pa.user_id = (select auth.uid())));
drop policy if exists "platform admins can update founder videos" on public.b2b_founder_videos;
create policy "platform admins can update founder videos" on public.b2b_founder_videos for update using (exists (select 1 from public.platform_admins pa where pa.user_id = (select auth.uid()))) with check (exists (select 1 from public.platform_admins pa where pa.user_id = (select auth.uid())));