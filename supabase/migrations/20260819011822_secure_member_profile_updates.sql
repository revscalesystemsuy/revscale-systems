create or replace function public.update_organization_member_profile(
  p_member_id uuid,
  p_full_name text,
  p_phone text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor public.organization_members%rowtype;
  v_target public.organization_members%rowtype;
begin
  if auth.uid() is null then raise exception 'Sesión inválida'; end if;
  select * into v_actor from public.organization_members om where om.user_id = auth.uid() and om.status = 'ACTIVE' limit 1;
  if v_actor.id is null or v_actor.role not in ('OWNER','MANAGER') then raise exception 'Acceso no autorizado'; end if;
  select * into v_target from public.organization_members om where om.id = p_member_id and om.organization_id = v_actor.organization_id;
  if v_target.id is null then raise exception 'Miembro no encontrado'; end if;
  if v_actor.role = 'MANAGER' and (v_actor.team_id is null or v_target.team_id is distinct from v_actor.team_id or v_target.role <> 'AGENT') then
    raise exception 'Solo podés editar agentes de tu equipo';
  end if;
  if nullif(trim(coalesce(p_full_name,'')), '') is null then raise exception 'El nombre es obligatorio'; end if;
  update public.profiles set full_name = left(trim(p_full_name),160), phone = nullif(left(trim(coalesce(p_phone,'')),60),'') where id = v_target.user_id;
end;
$$;
revoke all on function public.update_organization_member_profile(uuid,text,text) from public, anon;
grant execute on function public.update_organization_member_profile(uuid,text,text) to authenticated;
