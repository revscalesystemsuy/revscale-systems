create table if not exists public.b2b_product_clips (
  id uuid primary key default gen_random_uuid(),
  created_by uuid not null,
  clip_key text not null unique,
  title text not null,
  product_surface text not null,
  duration_seconds integer not null check (duration_seconds between 15 and 120),
  aspect_ratio text not null default '9:16' check (aspect_ratio in ('9:16','1:1','16:9')),
  status text not null default 'PLANNED' check (status in ('PLANNED','SCRIPT_READY','FOOTAGE_READY','EDIT_READY','PUBLISHED','BLOCKED','ARCHIVED')),
  hook text not null,
  voiceover text not null,
  shot_list jsonb not null default '[]'::jsonb,
  on_screen_text jsonb not null default '[]'::jsonb,
  cta text not null,
  data_mode text not null default 'DEMO_SIMULATED' check (data_mode in ('DEMO_SIMULATED','REAL_ANONYMIZED')),
  evidence_note text not null default '',
  footage_reference text,
  edit_reference text,
  publication_url text,
  published_at timestamptz,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (jsonb_typeof(shot_list) = 'array'),
  check (jsonb_typeof(on_screen_text) = 'array')
);
create index if not exists b2b_product_clips_status_idx on public.b2b_product_clips(status, product_surface);
alter table public.b2b_product_clips enable row level security;
drop policy if exists "platform admins can view product clips" on public.b2b_product_clips;
create policy "platform admins can view product clips" on public.b2b_product_clips for select using (exists (select 1 from public.platform_admins pa where pa.user_id = (select auth.uid())));
drop policy if exists "platform admins can insert product clips" on public.b2b_product_clips;
create policy "platform admins can insert product clips" on public.b2b_product_clips for insert with check (created_by = (select auth.uid()) and exists (select 1 from public.platform_admins pa where pa.user_id = (select auth.uid())));
drop policy if exists "platform admins can update product clips" on public.b2b_product_clips;
create policy "platform admins can update product clips" on public.b2b_product_clips for update using (exists (select 1 from public.platform_admins pa where pa.user_id = (select auth.uid()))) with check (exists (select 1 from public.platform_admins pa where pa.user_id = (select auth.uid())));