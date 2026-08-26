create or replace function private.set_lead_sla_clock()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  response_minutes integer := 15;
  sla_enabled boolean := false;
begin
  if new.received_at is null and tg_op = 'INSERT' then
    new.received_at := coalesce(new.created_at, now());
  end if;

  if tg_op = 'INSERT' and new.assigned_to is not null then
    new.assigned_at := coalesce(new.assigned_at, now());
  elsif tg_op = 'UPDATE' and old.assigned_to is null and new.assigned_to is not null then
    new.assigned_at := coalesce(new.assigned_at, now());
  end if;

  if new.assigned_to is not null and new.first_human_response_at is null and new.sla_deadline is null then
    select s.is_enabled, s.first_human_response_minutes
      into sla_enabled, response_minutes
    from public.organization_sla_settings s
    where s.organization_id = new.organization_id;

    if coalesce(sla_enabled, false) then
      new.sla_deadline := coalesce(new.assigned_at, now()) + make_interval(mins => coalesce(response_minutes, 15));
    end if;
  end if;

  return new;
end;
$$;

revoke all on function private.set_lead_sla_clock() from public, anon, authenticated;

create or replace function private.handle_sla_settings_toggle()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if old.is_enabled = true and new.is_enabled = false then
    update public.leads
    set sla_deadline = null,
        updated_at = now()
    where organization_id = new.organization_id
      and first_human_response_at is null
      and sla_breached_at is null
      and sla_deadline is not null;
  end if;

  return new;
end;
$$;

revoke all on function private.handle_sla_settings_toggle() from public, anon, authenticated;

drop trigger if exists trg_handle_sla_settings_toggle on public.organization_sla_settings;
create trigger trg_handle_sla_settings_toggle
after update of is_enabled on public.organization_sla_settings
for each row
when (old.is_enabled is distinct from new.is_enabled)
execute function private.handle_sla_settings_toggle();