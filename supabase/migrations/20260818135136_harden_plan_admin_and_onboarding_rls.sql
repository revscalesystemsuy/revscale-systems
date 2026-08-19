create table if not exists public.platform_admins (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.platform_admins enable row level security;

drop policy if exists "platform admins can view own access" on public.platform_admins;
create policy "platform admins can view own access"
on public.platform_admins
for select
to authenticated
using (user_id = auth.uid());

alter table public.subscriptions enable row level security;

drop policy if exists "members can view organization subscription" on public.subscriptions;
create policy "members can view organization subscription"
on public.subscriptions
for select
to authenticated
using (private.is_org_member(organization_id));

alter table public.plan_requests enable row level security;

drop policy if exists "visitors can create pending plan requests" on public.plan_requests;
create policy "visitors can create pending plan requests"
on public.plan_requests
for insert
to anon, authenticated
with check (
  upper(plan) in ('STARTER','PRO','PROFESSIONAL','ENTERPRISE')
  and coalesce(status, 'PENDING') = 'PENDING'
  and (organization_id is null or private.is_org_member(organization_id))
);

alter table public.organization_onboarding enable row level security;

drop policy if exists "members can view organization onboarding" on public.organization_onboarding;
create policy "members can view organization onboarding"
on public.organization_onboarding
for select
to authenticated
using (private.is_org_member(organization_id));

drop policy if exists "members can create organization onboarding" on public.organization_onboarding;
create policy "members can create organization onboarding"
on public.organization_onboarding
for insert
to authenticated
with check (private.is_org_member(organization_id));

drop policy if exists "members can update organization onboarding" on public.organization_onboarding;
create policy "members can update organization onboarding"
on public.organization_onboarding
for update
to authenticated
using (private.is_org_member(organization_id))
with check (private.is_org_member(organization_id));

drop policy if exists "members can create organization properties" on public.properties;
create policy "members can create organization properties"
on public.properties
for insert
to authenticated
with check (private.is_org_member(organization_id));
