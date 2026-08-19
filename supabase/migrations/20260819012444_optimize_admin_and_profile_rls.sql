drop policy if exists "platform admins can view own access" on public.platform_admins;
create policy "platform admins can view own access" on public.platform_admins for select to authenticated
using (user_id = (select auth.uid()));

drop policy if exists "platform admins can view plan requests" on public.plan_requests;
create policy "platform admins can view plan requests" on public.plan_requests for select to authenticated
using (exists (select 1 from public.platform_admins pa where pa.user_id = (select auth.uid())));

drop policy if exists "platform admins can update plan requests" on public.plan_requests;
create policy "platform admins can update plan requests" on public.plan_requests for update to authenticated
using (exists (select 1 from public.platform_admins pa where pa.user_id = (select auth.uid())))
with check (exists (select 1 from public.platform_admins pa where pa.user_id = (select auth.uid())));

drop policy if exists "users can view own profile" on public.profiles;

drop policy if exists "members can view organization subscription" on public.subscriptions;
drop policy if exists "platform admins can view subscriptions" on public.subscriptions;
create policy "members or platform admins can view subscriptions" on public.subscriptions for select to authenticated
using (
  exists (select 1 from public.organization_members om where om.organization_id = subscriptions.organization_id and om.user_id = (select auth.uid()))
  or exists (select 1 from public.platform_admins pa where pa.user_id = (select auth.uid()))
);

drop policy if exists "platform admins can update subscriptions" on public.subscriptions;
create policy "platform admins can update subscriptions" on public.subscriptions for update to authenticated
using (exists (select 1 from public.platform_admins pa where pa.user_id = (select auth.uid())))
with check (exists (select 1 from public.platform_admins pa where pa.user_id = (select auth.uid())));
