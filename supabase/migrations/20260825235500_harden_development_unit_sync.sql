create or replace function private.delete_development_unit_property()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if old.property_id is not null then
    delete from public.properties
    where id = old.property_id
      and organization_id = old.organization_id;
  end if;
  return old;
end;
$$;

revoke all on function private.delete_development_unit_property() from public, anon, authenticated;

drop trigger if exists trg_delete_development_unit_property on public.development_units;
create trigger trg_delete_development_unit_property
after delete on public.development_units
for each row execute function private.delete_development_unit_property();

create or replace function private.refresh_units_for_project_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  unit_row public.development_units%rowtype;
begin
  if new.name is distinct from old.name
    or new.zone is distinct from old.zone
    or new.address is distinct from old.address then
    for unit_row in
      select * from public.development_units
      where project_id = new.id and organization_id = new.organization_id
    loop
      update public.development_units
      set code = unit_row.code
      where id = unit_row.id;
    end loop;
  end if;
  return new;
end;
$$;

revoke all on function private.refresh_units_for_project_change() from public, anon, authenticated;

drop trigger if exists trg_refresh_units_for_project_change on public.development_projects;
create trigger trg_refresh_units_for_project_change
after update of name, zone, address on public.development_projects
for each row execute function private.refresh_units_for_project_change();

create or replace function private.refresh_units_for_typology_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  unit_row public.development_units%rowtype;
begin
  if new.name is distinct from old.name
    or new.property_type is distinct from old.property_type
    or new.bedrooms is distinct from old.bedrooms
    or new.bathrooms is distinct from old.bathrooms
    or new.area_m2 is distinct from old.area_m2 then
    for unit_row in
      select * from public.development_units
      where typology_id = new.id and organization_id = new.organization_id
    loop
      update public.development_units
      set typology_id = new.id
      where id = unit_row.id;
    end loop;
  end if;
  return new;
end;
$$;

revoke all on function private.refresh_units_for_typology_change() from public, anon, authenticated;

drop trigger if exists trg_refresh_units_for_typology_change on public.development_typologies;
create trigger trg_refresh_units_for_typology_change
after update of name, property_type, bedrooms, bathrooms, area_m2 on public.development_typologies
for each row execute function private.refresh_units_for_typology_change();
