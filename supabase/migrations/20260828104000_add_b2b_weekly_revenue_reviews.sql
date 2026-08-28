create table if not exists public.b2b_revenue_reviews (
  id uuid primary key default gen_random_uuid(),
  week_start date not null unique,
  metrics_snapshot jsonb not null default '{}'::jsonb,
  hypotheses text,
  results text,
  decisions text,
  next_focus text,
  reviewed_at timestamptz not null default now(),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists b2b_revenue_reviews_week_idx on public.b2b_revenue_reviews (week_start desc);

alter table public.b2b_revenue_reviews enable row level security;
revoke all on table public.b2b_revenue_reviews from anon, public;
grant select, insert, update on table public.b2b_revenue_reviews to authenticated;
grant select, insert, update, delete on table public.b2b_revenue_reviews to service_role;

drop policy if exists "platform admins can view b2b revenue reviews" on public.b2b_revenue_reviews;
create policy "platform admins can view b2b revenue reviews"
on public.b2b_revenue_reviews
for select
to authenticated
using (exists (select 1 from public.platform_admins pa where pa.user_id = (select auth.uid())));

drop policy if exists "platform admins can insert b2b revenue reviews" on public.b2b_revenue_reviews;
create policy "platform admins can insert b2b revenue reviews"
on public.b2b_revenue_reviews
for insert
to authenticated
with check (
  created_by = (select auth.uid())
  and exists (select 1 from public.platform_admins pa where pa.user_id = (select auth.uid()))
);

drop policy if exists "platform admins can update b2b revenue reviews" on public.b2b_revenue_reviews;
create policy "platform admins can update b2b revenue reviews"
on public.b2b_revenue_reviews
for update
to authenticated
using (exists (select 1 from public.platform_admins pa where pa.user_id = (select auth.uid())))
with check (exists (select 1 from public.platform_admins pa where pa.user_id = (select auth.uid())));
