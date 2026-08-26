create table if not exists public.development_projects (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  developer_name text null,
  zone text null,
  address text null,
  status text not null default 'PRESALE' check (status in ('PLANNING','PRESALE','UNDER_CONSTRUCTION','DELIVERED','PAUSED')),
  estimated_delivery date null,
  description text null,
  amenities text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.development_blocks (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  project_id uuid not null references public.development_projects(id) on delete cascade,
  name text not null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.development_typologies (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  project_id uuid not null references public.development_projects(id) on delete cascade,
  name text not null,
  property_type text not null default 'APARTAMENTO',
  bedrooms integer null check (bedrooms is null or bedrooms >= 0),
  bathrooms integer null check (bathrooms is null or bathrooms >= 0),
  area_m2 numeric null check (area_m2 is null or area_m2 >= 0),
  created_at timestamptz not null default now()
);

create table if not exists public.development_units (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  project_id uuid not null references public.development_projects(id) on delete cascade,
  block_id uuid null references public.development_blocks(id) on delete set null,
  typology_id uuid not null references public.development_typologies(id) on delete restrict,
  code text not null,
  floor text null,
  orientation text null,
  price numeric null check (price is null or price >= 0),
  currency text not null default 'USD' check (currency in ('USD','UYU')),
  status text not null default 'AVAILABLE' check (status in ('AVAILABLE','RESERVED','SOLD','BLOCKED')),
  property_id uuid null unique references public.properties(id) on delete set null,
  notes text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(project_id, code)
);

create index if not exists development_projects_org_idx on public.development_projects(organization_id, created_at desc);
create index if not exists development_blocks_project_idx on public.development_blocks(project_id, sort_order);
create index if not exists development_blocks_org_idx on public.development_blocks(organization_id);
create index if not exists development_typologies_project_idx on public.development_typologies(project_id);
create index if not exists development_typologies_org_idx on public.development_typologies(organization_id);
create index if not exists development_units_project_status_idx on public.development_units(project_id, status);
create index if not exists development_units_typology_idx on public.development_units(typology_id);
create index if not exists development_units_block_idx on public.development_units(block_id);
create index if not exists development_units_org_idx on public.development_units(organization_id);

alter table public.development_projects enable row level security;
alter table public.development_blocks enable row level security;
alter table public.development_typologies enable row level security;
alter table public.development_units enable row level security;

grant select, insert, update, delete on public.development_projects to authenticated;
grant select, insert, update, delete on public.development_blocks to authenticated;
grant select, insert, update, delete on public.development_typologies to authenticated;
grant select, insert, update, delete on public.development_units to authenticated;

create or replace function private.can_access_development_projects(target_org uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.organization_members om
    join public.subscriptions s on s.organization_id = om.organization_id
    where om.organization_id = target_org
      and om.user_id = (select auth.uid())
      and om.status = 'ACTIVE'
      and upper(coalesce(s.status, 'INACTIVE')) = 'ACTIVE'
      and upper(coalesce(s.plan, 'TRIAL')) = 'ENTERPRISE'
  );
$$;

revoke all on function private.can_access_development_projects(uuid) from public, anon;
grant execute on function private.can_access_development_projects(uuid) to authenticated;

create policy "enterprise members can view projects" on public.development_projects for select to authenticated using ((select private.can_access_development_projects(organization_id)));
create policy "enterprise members can insert projects" on public.development_projects for insert to authenticated with check ((select private.can_access_development_projects(organization_id)));
create policy "enterprise members can update projects" on public.development_projects for update to authenticated using ((select private.can_access_development_projects(organization_id))) with check ((select private.can_access_development_projects(organization_id)));
create policy "enterprise members can delete projects" on public.development_projects for delete to authenticated using ((select private.can_access_development_projects(organization_id)));

create policy "enterprise members can view blocks" on public.development_blocks for select to authenticated using ((select private.can_access_development_projects(organization_id)));
create policy "enterprise members can insert blocks" on public.development_blocks for insert to authenticated with check ((select private.can_access_development_projects(organization_id)));
create policy "enterprise members can update blocks" on public.development_blocks for update to authenticated using ((select private.can_access_development_projects(organization_id))) with check ((select private.can_access_development_projects(organization_id)));
create policy "enterprise members can delete blocks" on public.development_blocks for delete to authenticated using ((select private.can_access_development_projects(organization_id)));

create policy "enterprise members can view typologies" on public.development_typologies for select to authenticated using ((select private.can_access_development_projects(organization_id)));
create policy "enterprise members can insert typologies" on public.development_typologies for insert to authenticated with check ((select private.can_access_development_projects(organization_id)));
create policy "enterprise members can update typologies" on public.development_typologies for update to authenticated using ((select private.can_access_development_projects(organization_id))) with check ((select private.can_access_development_projects(organization_id)));
create policy "enterprise members can delete typologies" on public.development_typologies for delete to authenticated using ((select private.can_access_development_projects(organization_id)));

create policy "enterprise members can view units" on public.development_units for select to authenticated using ((select private.can_access_development_projects(organization_id)));
create policy "enterprise members can insert units" on public.development_units for insert to authenticated with check ((select private.can_access_development_projects(organization_id)));
create policy "enterprise members can update units" on public.development_units for update to authenticated using ((select private.can_access_development_projects(organization_id))) with check ((select private.can_access_development_projects(organization_id)));
create policy "enterprise members can delete units" on public.development_units for delete to authenticated using ((select private.can_access_development_projects(organization_id)));

create or replace function private.sync_development_unit_to_property()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  project_row public.development_projects%rowtype;
  typology_row public.development_typologies%rowtype;
  block_name text;
  target_status text;
  generated_title text;
  generated_description text;
  synced_property_id uuid;
begin
  select * into project_row from public.development_projects where id = new.project_id and organization_id = new.organization_id;
  select * into typology_row from public.development_typologies where id = new.typology_id and project_id = new.project_id and organization_id = new.organization_id;
  if project_row.id is null or typology_row.id is null then
    raise exception 'Proyecto o tipología inválidos';
  end if;

  if new.block_id is not null then
    select name into block_name from public.development_blocks where id = new.block_id and project_id = new.project_id and organization_id = new.organization_id;
  end if;

  target_status := case new.status when 'AVAILABLE' then 'AVAILABLE' when 'RESERVED' then 'RESERVED' else 'SOLD' end;
  generated_title := project_row.name || ' · ' || coalesce(block_name || ' · ', '') || 'Unidad ' || new.code;
  generated_description := 'Proyecto en pozo: ' || project_row.name || '. Tipología: ' || typology_row.name || case when new.floor is not null then '. Piso: ' || new.floor else '' end || case when new.orientation is not null then '. Orientación: ' || new.orientation else '' end;

  if new.property_id is null then
    insert into public.properties(
      organization_id,title,property_type,operation,zone,address,price,currency,bedrooms,bathrooms,area_m2,status,description
    ) values (
      new.organization_id, generated_title, upper(typology_row.property_type), 'COMPRA', project_row.zone, project_row.address,
      new.price, new.currency, typology_row.bedrooms, typology_row.bathrooms, typology_row.area_m2, target_status, generated_description
    ) returning id into synced_property_id;
    new.property_id := synced_property_id;
  else
    update public.properties set
      title = generated_title,
      property_type = upper(typology_row.property_type),
      operation = 'COMPRA',
      zone = project_row.zone,
      address = project_row.address,
      price = new.price,
      currency = new.currency,
      bedrooms = typology_row.bedrooms,
      bathrooms = typology_row.bathrooms,
      area_m2 = typology_row.area_m2,
      status = target_status,
      description = generated_description,
      updated_at = now()
    where id = new.property_id and organization_id = new.organization_id;
  end if;

  new.updated_at := now();
  return new;
end;
$$;

revoke all on function private.sync_development_unit_to_property() from public, anon, authenticated;

drop trigger if exists trg_sync_development_unit_to_property on public.development_units;
create trigger trg_sync_development_unit_to_property
before insert or update of block_id, typology_id, code, floor, orientation, price, currency, status
on public.development_units
for each row execute function private.sync_development_unit_to_property();

create or replace function private.touch_development_project()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  new.updated_at := now();
  return new;
end;
$$;
revoke all on function private.touch_development_project() from public, anon, authenticated;

drop trigger if exists trg_touch_development_project on public.development_projects;
create trigger trg_touch_development_project before update on public.development_projects for each row execute function private.touch_development_project();
