create or replace function public.update_organization_member(
  p_member_id uuid,
  p_role text default null,
  p_status text default null,
  p_team_id uuid default null,
  p_set_team boolean default false
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor public.organization_members%rowtype;
  v_target public.organization_members%rowtype;
  v_subscription public.subscriptions%rowtype;
  v_new_role text;
  v_new_status text;
begin
  if auth.uid() is null then raise exception 'Sesión inválida'; end if;
  select * into v_actor from public.organization_members om where om.user_id = auth.uid() and om.status = 'ACTIVE' limit 1;
  if v_actor.id is null then raise exception 'Acceso no autorizado'; end if;
  select * into v_subscription from public.subscriptions s where s.organization_id = v_actor.organization_id and upper(coalesce(s.status,'')) = 'ACTIVE' order by s.created_at desc limit 1;
  if v_subscription.id is null then raise exception 'La organización no tiene una suscripción activa'; end if;
  select * into v_target from public.organization_members om where om.id = p_member_id and om.organization_id = v_actor.organization_id for update;
  if v_target.id is null then raise exception 'Miembro no encontrado'; end if;

  if v_actor.role = 'MANAGER' then
    if upper(coalesce(v_subscription.plan,'')) <> 'ENTERPRISE' or v_actor.team_id is null then raise exception 'Acceso no autorizado'; end if;
    if v_target.team_id is distinct from v_actor.team_id or v_target.role <> 'AGENT' then raise exception 'Solo podés administrar agentes de tu equipo'; end if;
    if p_role is not null or p_set_team then raise exception 'Un Gerente no puede cambiar rol ni equipo'; end if;
  elsif v_actor.role <> 'OWNER' then
    raise exception 'Acceso no autorizado';
  end if;

  if v_target.user_id = v_actor.user_id and (p_role is not null or p_status is not null) then raise exception 'No podés modificar tu propio rol o estado desde esta pantalla'; end if;
  v_new_role := coalesce(p_role, v_target.role);
  v_new_status := coalesce(p_status, v_target.status);
  if v_new_role not in ('OWNER','MANAGER','AGENT') then raise exception 'Rol inválido'; end if;
  if v_new_status not in ('ACTIVE','SUSPENDED') then raise exception 'Estado inválido'; end if;

  if v_actor.role = 'OWNER' and v_target.role = 'OWNER' and v_new_role <> 'OWNER' and not exists (
    select 1 from public.organization_members om where om.organization_id = v_actor.organization_id and om.role = 'OWNER' and om.status = 'ACTIVE' and om.id <> v_target.id
  ) then raise exception 'La organización debe conservar al menos un Director activo'; end if;

  if p_set_team and p_team_id is not null and not exists (
    select 1 from public.teams t where t.id = p_team_id and t.organization_id = v_actor.organization_id
  ) then raise exception 'Equipo inválido'; end if;

  update public.organization_members set role = v_new_role, status = v_new_status, team_id = case when p_set_team then p_team_id else team_id end where id = v_target.id;
end;
$$;
revoke all on function public.update_organization_member(uuid,text,text,uuid,boolean) from public, anon;
grant execute on function public.update_organization_member(uuid,text,text,uuid,boolean) to authenticated;

drop policy if exists "members can create organization onboarding" on public.organization_onboarding;
drop policy if exists "members can update organization onboarding" on public.organization_onboarding;
create policy "owners and managers can create organization onboarding" on public.organization_onboarding for insert to authenticated
with check (private.has_org_role(organization_id, array['OWNER','MANAGER']::text[]));
create policy "owners and managers can update organization onboarding" on public.organization_onboarding for update to authenticated
using (private.has_org_role(organization_id, array['OWNER','MANAGER']::text[]))
with check (private.has_org_role(organization_id, array['OWNER','MANAGER']::text[]));
