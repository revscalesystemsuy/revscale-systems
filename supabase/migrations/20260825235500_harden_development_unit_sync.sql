create or replace function private.validate_development_parentage()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not exists (
    select 1
    from public.development_projects p
    where p.id = new.project_id
      and p.organization_id = new.organization_id
  ) then
    raise exception 'El proyecto no pertenece a esta organización';
  end if;

  if tg_table_name = 'development_units' then
    if not exists (
      select 1
      from public.development_typologies t
      where t.id = new.typology_id
        and t.project_id = new.project_id
        and t.organization_id = new.organization_id
    ) then
      raise exception 'La tipología no pertenece a este proyecto';
    end if;

    if new.block_id is not null and not exists (
      select 1
      from public.development_blocks b
      where b.id = new.block_id
        and b.project_id = new.project_id
        and b.organization_id = new.organization_id
    ) then
      raise exception 'El bloque no pertenece a este proyecto';
    end if;
  end if;

  return new;
end;
$$;

revoke all on function private.validate_development_parentage() from public, anon, authenticated;

drop trigger if exists trg_00_validate_development_block_parentage on public.development_blocks;
create trigger trg_00_validate_development_block_parentage
before insert or update of organization_id, project_id
on public.development_blocks
for each row execute function private.validate_development_parentage();

drop trigger if exists trg_00_validate_development_typology_parentage on public.development_typologies;
create trigger trg_00_validate_development_typology_parentage
before insert or update of organization_id, project_id
on public.development_typologies
for each row execute function private.validate_development_parentage();

drop trigger if exists trg_00_validate_development_unit_parentage on public.development_units;
create trigger trg_00_validate_development_unit_parentage
before insert or update of organization_id, project_id, block_id, typology_id
on public.development_units
for each row execute function private.validate_development_parentage();

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
