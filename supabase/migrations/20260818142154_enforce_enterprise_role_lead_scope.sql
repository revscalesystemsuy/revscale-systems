create or replace function private.can_access_lead(target_org uuid, target_team uuid, target_assignee uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.organization_members om
    left join public.subscriptions s on s.organization_id = om.organization_id
    where om.organization_id = target_org
      and om.user_id = (select auth.uid())
      and om.status = 'ACTIVE'
      and (
        coalesce(upper(s.plan), 'TRIAL') <> 'ENTERPRISE'
        or om.role = 'OWNER'
        or (om.role = 'MANAGER' and om.team_id is not null and om.team_id = target_team)
        or (om.role = 'AGENT' and target_assignee = om.user_id)
      )
  );
$$;

revoke all on function private.can_access_lead(uuid,uuid,uuid) from public;
grant execute on function private.can_access_lead(uuid,uuid,uuid) to authenticated;

drop policy if exists "members can view organization leads" on public.leads;
create policy "members can view accessible leads"
on public.leads
for select
to authenticated
using (private.can_access_lead(organization_id, team_id, assigned_to));

drop policy if exists "members can update organization leads" on public.leads;
create policy "members can update accessible leads"
on public.leads
for update
to authenticated
using (private.can_access_lead(organization_id, team_id, assigned_to))
with check (private.can_access_lead(organization_id, team_id, assigned_to));

drop policy if exists "members can view organization interactions" on public.interactions;
create policy "members can view accessible interactions"
on public.interactions
for select
to authenticated
using (
  exists (
    select 1 from public.leads l
    where l.id = interactions.lead_id
      and l.organization_id = interactions.organization_id
      and private.can_access_lead(l.organization_id, l.team_id, l.assigned_to)
  )
);

drop policy if exists "members can update organization interactions" on public.interactions;
create policy "members can update accessible interactions"
on public.interactions
for update
to authenticated
using (
  exists (
    select 1 from public.leads l
    where l.id = interactions.lead_id
      and l.organization_id = interactions.organization_id
      and private.can_access_lead(l.organization_id, l.team_id, l.assigned_to)
  )
)
with check (
  exists (
    select 1 from public.leads l
    where l.id = interactions.lead_id
      and l.organization_id = interactions.organization_id
      and private.can_access_lead(l.organization_id, l.team_id, l.assigned_to)
  )
);

drop policy if exists "members can create organization interactions" on public.interactions;
create policy "members can create accessible interactions"
on public.interactions
for insert
to authenticated
with check (
  exists (
    select 1 from public.leads l
    where l.id = interactions.lead_id
      and l.organization_id = interactions.organization_id
      and private.can_access_lead(l.organization_id, l.team_id, l.assigned_to)
  )
);

drop policy if exists "members can view organization followups" on public.followups;
create policy "members can view accessible followups"
on public.followups
for select
to authenticated
using (
  exists (
    select 1 from public.leads l
    where l.id = followups.lead_id
      and l.organization_id = followups.organization_id
      and private.can_access_lead(l.organization_id, l.team_id, l.assigned_to)
  )
);

drop policy if exists "members can update organization followups" on public.followups;
create policy "members can update accessible followups"
on public.followups
for update
to authenticated
using (
  exists (
    select 1 from public.leads l
    where l.id = followups.lead_id
      and l.organization_id = followups.organization_id
      and private.can_access_lead(l.organization_id, l.team_id, l.assigned_to)
  )
)
with check (
  exists (
    select 1 from public.leads l
    where l.id = followups.lead_id
      and l.organization_id = followups.organization_id
      and private.can_access_lead(l.organization_id, l.team_id, l.assigned_to)
  )
);

drop policy if exists "members can create organization followups" on public.followups;
create policy "members can create accessible followups"
on public.followups
for insert
to authenticated
with check (
  exists (
    select 1 from public.leads l
    where l.id = followups.lead_id
      and l.organization_id = followups.organization_id
      and private.can_access_lead(l.organization_id, l.team_id, l.assigned_to)
  )
);

drop policy if exists "members can delete organization followups" on public.followups;
create policy "members can delete accessible followups"
on public.followups
for delete
to authenticated
using (
  exists (
    select 1 from public.leads l
    where l.id = followups.lead_id
      and l.organization_id = followups.organization_id
      and private.can_access_lead(l.organization_id, l.team_id, l.assigned_to)
  )
);
