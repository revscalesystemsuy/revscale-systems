do $$
declare
  r record;
begin
  for r in
    select n.nspname as schema_name, c.relname as object_name, c.relkind
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relkind in ('r','p','S')
  loop
    if r.relkind = 'S' then
      execute format('revoke all privileges on sequence %I.%I from anon', r.schema_name, r.object_name);
    else
      execute format('revoke all privileges on table %I.%I from anon', r.schema_name, r.object_name);
    end if;
  end loop;
end
$$;

alter default privileges for role postgres in schema public revoke all privileges on tables from anon;
alter default privileges for role postgres in schema public revoke all privileges on sequences from anon;