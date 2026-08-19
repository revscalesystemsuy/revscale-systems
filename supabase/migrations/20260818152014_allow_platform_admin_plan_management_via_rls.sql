drop policy if exists "platform admins can view plan requests" on public.plan_requests;
create policy "platform admins can view plan requests"
on public.plan_requests
for select
to authenticated
using (exists (select 1 from public.platform_admins pa where pa.user_id = auth.uid()));

drop policy if exists "platform admins can update plan requests" on public.plan_requests;
create policy "platform admins can update plan requests"
on public.plan_requests
for update
to authenticated
using (exists (select 1 from public.platform_admins pa where pa.user_id = auth.uid()))
with check (exists (select 1 from public.platform_admins pa where pa.user_id = auth.uid()));

drop policy if exists "platform admins can view subscriptions" on public.subscriptions;
create policy "platform admins can view subscriptions"
on public.subscriptions
for select
to authenticated
using (exists (select 1 from public.platform_admins pa where pa.user_id = auth.uid()));

drop policy if exists "platform admins can update subscriptions" on public.subscriptions;
create policy "platform admins can update subscriptions"
on public.subscriptions
for update
to authenticated
using (exists (select 1 from public.platform_admins pa where pa.user_id = auth.uid()))
with check (exists (select 1 from public.platform_admins pa where pa.user_id = auth.uid()));
