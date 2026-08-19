alter default privileges for role postgres in schema public
  revoke all privileges on tables from authenticated;

alter default privileges for role postgres in schema public
  revoke all privileges on sequences from authenticated;

alter default privileges for role postgres in schema public
  revoke execute on functions from anon, authenticated;