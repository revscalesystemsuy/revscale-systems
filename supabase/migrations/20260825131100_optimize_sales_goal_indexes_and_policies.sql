create index if not exists sales_goals_team_id_idx on public.sales_goals(team_id) where team_id is not null;
create index if not exists sales_goals_agent_id_idx on public.sales_goals(agent_id) where agent_id is not null;
create index if not exists sales_goals_created_by_idx on public.sales_goals(created_by) where created_by is not null;

drop policy if exists sales_goals_owner_write on public.sales_goals;
drop policy if exists sales_goals_owner_insert on public.sales_goals;
drop policy if exists sales_goals_owner_update on public.sales_goals;
drop policy if exists sales_goals_owner_delete on public.sales_goals;

create policy sales_goals_owner_insert on public.sales_goals
for insert to authenticated
with check (
  exists (
    select 1 from public.organization_members om
    where om.organization_id = sales_goals.organization_id
      and om.user_id = (select auth.uid())
      and om.status = 'ACTIVE'
      and om.role = 'OWNER'
  )
);

create policy sales_goals_owner_update on public.sales_goals
for update to authenticated
using (
  exists (
    select 1 from public.organization_members om
    where om.organization_id = sales_goals.organization_id
      and om.user_id = (select auth.uid())
      and om.status = 'ACTIVE'
      and om.role = 'OWNER'
  )
)
with check (
  exists (
    select 1 from public.organization_members om
    where om.organization_id = sales_goals.organization_id
      and om.user_id = (select auth.uid())
      and om.status = 'ACTIVE'
      and om.role = 'OWNER'
  )
);

create policy sales_goals_owner_delete on public.sales_goals
for delete to authenticated
using (
  exists (
    select 1 from public.organization_members om
    where om.organization_id = sales_goals.organization_id
      and om.user_id = (select auth.uid())
      and om.status = 'ACTIVE'
      and om.role = 'OWNER'
  )
);