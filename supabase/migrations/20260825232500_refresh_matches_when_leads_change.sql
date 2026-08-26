create or replace function private.refresh_matches_for_lead_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  property_row record;
begin
  for property_row in
    select distinct p.id
    from public.properties p
    where p.organization_id = new.organization_id
      and upper(coalesce(p.status, '')) = 'AVAILABLE'
      and (
        (
          upper(coalesce(p.property_type, '')) = upper(coalesce(new.property_type, ''))
          and upper(coalesce(p.operation, '')) = upper(coalesce(new.operation, ''))
        )
        or (
          tg_op = 'UPDATE'
          and upper(coalesce(p.property_type, '')) = upper(coalesce(old.property_type, ''))
          and upper(coalesce(p.operation, '')) = upper(coalesce(old.operation, ''))
        )
      )
  loop
    perform private.refresh_property_matches(property_row.id);
  end loop;

  return new;
end;
$$;

revoke all on function private.refresh_matches_for_lead_change() from public, anon, authenticated;

drop trigger if exists trg_refresh_matches_when_lead_changes on public.leads;
create trigger trg_refresh_matches_when_lead_changes
after insert or update of property_type, operation, primary_zone, budget_max, currency, bedrooms_min, assigned_to, pipeline_stage
on public.leads
for each row
execute function private.refresh_matches_for_lead_change();
