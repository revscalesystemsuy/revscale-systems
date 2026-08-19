do $$
declare
  r record;
begin
  for r in
    select n.nspname as schema_name, c.relname as table_name
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relkind in ('r', 'p')
  loop
    execute format(
      'revoke truncate, references, trigger on table %I.%I from anon, authenticated',
      r.schema_name,
      r.table_name
    );
  end loop;
end
$$;

alter default privileges for role postgres in schema public
  revoke truncate, references, trigger on tables from anon, authenticated;