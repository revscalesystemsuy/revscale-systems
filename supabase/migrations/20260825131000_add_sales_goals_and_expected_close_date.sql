alter table public.leads add column if not exists expected_close_date date;

create table if not exists public.sales_goals (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  scope_type text not null check (scope_type in ('ORGANIZATION','TEAM','AGENT')),
  team_id uuid references public.teams(id) on delete cascade,
  agent_id uuid references auth.users(id) on delete cascade,
  period_month date not null,
  target_won_count integer not null default 0 check (target_won_count >= 0),
  target_value numeric,
  currency text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint sales_goals_scope_check check (
    (scope_type='ORGANIZATION' and team_id is null and agent_id is null)
    or (scope_type='TEAM' and team_id is not null and agent_id is null)
    or (scope_type='AGENT' and agent_id is not null and team_id is null)
  ),
  constraint sales_goals_value_currency_check check (
    (target_value is null and currency is null)
    or (target_value is not null and target_value >= 0 and currency in ('USD','UYU'))
  )
);

create unique index if not exists sales_goals_org_month_unique on public.sales_goals(organization_id, period_month) where scope_type='ORGANIZATION';
create unique index if not exists sales_goals_team_month_unique on public.sales_goals(organization_id, team_id, period_month) where scope_type='TEAM';
create unique index if not exists sales_goals_agent_month_unique on public.sales_goals(organization_id, agent_id, period_month) where scope_type='AGENT';
create index if not exists sales_goals_org_period_idx on public.sales_goals(organization_id, period_month desc);

alter table public.sales_goals enable row level security;
revoke all on public.sales_goals from public, anon;
grant select, insert, update, delete on public.sales_goals to authenticated;
grant all on public.sales_goals to service_role;

drop policy if exists sales_goals_select_accessible on public.sales_goals;
create policy sales_goals_select_accessible on public.sales_goals
for select to authenticated
using (
  exists (
    select 1
    from public.organization_members viewer
    where viewer.organization_id = sales_goals.organization_id
      and viewer.user_id = (select auth.uid())
      and viewer.status = 'ACTIVE'
      and (
        viewer.role = 'OWNER'
        or (
          viewer.role = 'MANAGER'
          and (
            (sales_goals.scope_type = 'TEAM' and sales_goals.team_id = viewer.team_id)
            or (
              sales_goals.scope_type = 'AGENT'
              and exists (
                select 1
                from public.organization_members target_member
                where target_member.organization_id = sales_goals.organization_id
                  and target_member.user_id = sales_goals.agent_id
                  and target_member.status = 'ACTIVE'
                  and target_member.team_id = viewer.team_id
              )
            )
          )
        )
        or (
          viewer.role = 'AGENT'
          and sales_goals.scope_type = 'AGENT'
          and sales_goals.agent_id = viewer.user_id
        )
      )
  )
);

drop policy if exists sales_goals_owner_write on public.sales_goals;
create policy sales_goals_owner_write on public.sales_goals
for all to authenticated
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