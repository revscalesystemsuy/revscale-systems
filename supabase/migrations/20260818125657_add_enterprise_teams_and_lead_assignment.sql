create table public.teams (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  description text,
  zones text[] not null default '{}',
  auto_assign boolean not null default true,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index teams_organization_name_idx
  on public.teams (organization_id, lower(name));

alter table public.organization_members
  add column team_id uuid references public.teams(id) on delete set null;

alter table public.leads
  add column team_id uuid references public.teams(id) on delete set null,
  add column assigned_to uuid references public.profiles(id) on delete set null,
  add column assigned_at timestamptz;

create index organization_members_team_id_idx
  on public.organization_members(team_id);

create index leads_team_id_idx
  on public.leads(team_id);

create index leads_assigned_to_idx
  on public.leads(assigned_to);

insert into public.teams (organization_id, name, description)
select o.id, 'Equipo Principal', 'Equipo creado automáticamente para la operación actual.'
from public.organizations o
where not exists (
  select 1 from public.teams t where t.organization_id = o.id
);

update public.organization_members om
set team_id = t.id
from public.teams t
where om.organization_id = t.organization_id
  and om.team_id is null
  and t.name = 'Equipo Principal';

update public.leads l
set team_id = t.id
from public.teams t
where l.organization_id = t.organization_id
  and l.team_id is null
  and t.name = 'Equipo Principal';

alter table public.teams enable row level security;

create policy "members can view organization teams"
on public.teams
for select
to authenticated
using (
  exists (
    select 1
    from public.organization_members om
    where om.organization_id = teams.organization_id
      and om.user_id = auth.uid()
      and om.status = 'ACTIVE'
  )
);

create policy "owners and managers can create organization teams"
on public.teams
for insert
to authenticated
with check (
  exists (
    select 1
    from public.organization_members om
    where om.organization_id = teams.organization_id
      and om.user_id = auth.uid()
      and om.status = 'ACTIVE'
      and om.role in ('OWNER','MANAGER')
  )
);

create policy "owners and managers can update organization teams"
on public.teams
for update
to authenticated
using (
  exists (
    select 1
    from public.organization_members om
    where om.organization_id = teams.organization_id
      and om.user_id = auth.uid()
      and om.status = 'ACTIVE'
      and om.role in ('OWNER','MANAGER')
  )
)
with check (
  exists (
    select 1
    from public.organization_members om
    where om.organization_id = teams.organization_id
      and om.user_id = auth.uid()
      and om.status = 'ACTIVE'
      and om.role in ('OWNER','MANAGER')
  )
);

create policy "owners can delete organization teams"
on public.teams
for delete
to authenticated
using (
  exists (
    select 1
    from public.organization_members om
    where om.organization_id = teams.organization_id
      and om.user_id = auth.uid()
      and om.status = 'ACTIVE'
      and om.role = 'OWNER'
  )
);
