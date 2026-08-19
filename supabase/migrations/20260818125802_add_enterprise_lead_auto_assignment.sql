create or replace function public.assign_enterprise_lead()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  selected_team uuid;
  selected_agent uuid;
begin
  if new.team_id is null then
    if coalesce(trim(new.primary_zone), '') <> '' then
      select t.id
      into selected_team
      from public.teams t
      where t.organization_id = new.organization_id
        and t.is_active = true
        and t.auto_assign = true
        and exists (
          select 1
          from unnest(t.zones) z
          where lower(trim(z)) = lower(trim(new.primary_zone))
        )
      order by t.created_at asc
      limit 1;
    end if;

    if selected_team is null then
      select t.id
      into selected_team
      from public.teams t
      where t.organization_id = new.organization_id
        and t.is_active = true
        and t.auto_assign = true
      order by case when t.name = 'Equipo Principal' then 0 else 1 end, t.created_at asc
      limit 1;
    end if;

    new.team_id := selected_team;
  else
    selected_team := new.team_id;
  end if;

  if new.assigned_to is null and selected_team is not null then
    select om.user_id
    into selected_agent
    from public.organization_members om
    left join lateral (
      select count(*)::bigint as assigned_count
      from public.leads l
      where l.organization_id = new.organization_id
        and l.assigned_to = om.user_id
    ) load on true
    where om.organization_id = new.organization_id
      and om.team_id = selected_team
      and om.status = 'ACTIVE'
      and om.role in ('AGENT','MANAGER')
    order by coalesce(load.assigned_count, 0) asc, om.created_at asc
    limit 1;

    if selected_agent is not null then
      new.assigned_to := selected_agent;
      new.assigned_at := coalesce(new.assigned_at, now());
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_assign_enterprise_lead on public.leads;
create trigger trg_assign_enterprise_lead
before insert on public.leads
for each row
execute function public.assign_enterprise_lead();
